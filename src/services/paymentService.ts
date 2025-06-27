
// src/services/paymentService.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  getDoc,
  writeBatch,
  setDoc,
  collectionGroup,
  Firestore
} from 'firebase/firestore';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { db } from '@/lib/firebase/client';
import type { Payment, PaymentDocument, PaymentImportData, PaymentMethod, PaymentTypeOption } from '@/types/payment';
import type { ProjectDocument } from '@/types/project'; // Import ProjectDocument for typing

const PAYMENTS_COLLECTION = 'payments';
const INSTALLMENTS_COLLECTION = 'installments'; // Colección para almacenar cuotas
const PROJECTS_COLLECTION = 'projects'; // Define projects collection name

// Interfaz para las cuotas
export interface Installment {
  date: Date;
  amount: number;
  isPaid: boolean;
  paymentId: string;
  installmentNumber: number;
  totalInstallments: number;
  projectId?: string;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentFromDoc = (docSnapshot: any): Payment => {
  const data = docSnapshot.data() as PaymentDocument;
  return {
    id: docSnapshot.id,
    ...data,
    date: data.date.toDate(), // date is now always a Timestamp
    createdAt: data.createdAt.toDate(), // createdAt is now always a Timestamp
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  } as Payment;
};

export const getAllPayments = async (): Promise<Payment[]> => {
  const paymentsCollectionRef = collection(db, PAYMENTS_COLLECTION);
  const q = query(paymentsCollectionRef, orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(paymentFromDoc);
};

export const getPaymentsForProject = async (projectId: string): Promise<Payment[]> => {
  const paymentsCollectionRef = collection(db, PAYMENTS_COLLECTION);
  // Eliminamos el orderBy para evitar necesitar un índice compuesto
  const q = query(paymentsCollectionRef, where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  // Ordenamos en memoria después de obtener los resultados
  return querySnapshot.docs
    .map(paymentFromDoc)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Orden descendente por fecha
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  const docSnap = await getDoc(paymentDocRef);
  if (docSnap.exists()) {
    return paymentFromDoc(docSnap);
  }
  return null;
};

export const addPayment = async (paymentData: PaymentImportData | Omit<Payment, 'id' | 'updatedAt'>, firestore = db): Promise<Payment> => {
  
  let createdAtTimestamp: Timestamp;
  if (paymentData.createdAt) {
    try {
      const date = typeof paymentData.createdAt === 'string' ? new Date(paymentData.createdAt) : paymentData.createdAt;
      if (isNaN(date.getTime())) {
        console.warn(`Invalid createdAt date provided for payment. Using server timestamp. Value: ${paymentData.createdAt}`);
        createdAtTimestamp = serverTimestamp() as Timestamp;
      } else {
        createdAtTimestamp = Timestamp.fromDate(date);
      }
    } catch (e) {
      console.warn(`Error parsing createdAt date for payment. Using server timestamp. Value: ${paymentData.createdAt}`, e);
      createdAtTimestamp = serverTimestamp() as Timestamp;
    }
  } else {
    createdAtTimestamp = serverTimestamp() as Timestamp;
  }

  let paymentDateTimestamp: Timestamp;
  if (paymentData.date) {
    try {
      const date = typeof paymentData.date === 'string' ? new Date(paymentData.date) : paymentData.date;
      if (isNaN(date.getTime())) {
        console.warn(`Invalid payment date provided. Using server timestamp for date. Value: ${paymentData.date}`);
        paymentDateTimestamp = serverTimestamp() as Timestamp; 
      } else {
        paymentDateTimestamp = Timestamp.fromDate(date);
      }
    } catch (e) {
      console.warn(`Error parsing payment date. Using server timestamp for date. Value: ${paymentData.date}`, e);
      paymentDateTimestamp = serverTimestamp() as Timestamp; 
    }
  } else {
    console.error("Payment date is missing, which is required for addPayment service.");
    throw new Error("Payment date is required for addPayment service.");
  }

  const dataToSave: { [key: string]: any } = { 
    projectId: paymentData.projectId,
    amount: paymentData.amount,
    date: paymentDateTimestamp,
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp(),
    isAdjustment: paymentData.isAdjustment || false,
  };

  // Añadir campos opcionales
  if (paymentData.paymentMethod) {
    dataToSave.paymentMethod = paymentData.paymentMethod;
  }
  if (paymentData.paymentType) {
    dataToSave.paymentType = paymentData.paymentType;
  }
  if (paymentData.notes) {
    dataToSave.notes = paymentData.notes;
  }
  // Guardar el número de cuotas si existe
  if (paymentData.installments && paymentData.installments > 0) {
    dataToSave.installments = paymentData.installments;
  }

  try {
    // Validar que exista el projectId
    if (!paymentData.projectId) {
      throw new Error("Project ID is required for addPayment service.");
    }

    // Obtener referencia al proyecto y actualizar saldo
    const projectRef = doc(firestore, PROJECTS_COLLECTION, paymentData.projectId);
    const projectSnapshot = await getDoc(projectRef);

    if (!projectSnapshot.exists()) {
      throw new Error(`Project with ID ${paymentData.projectId} does not exist.`);
    }

    const projectData = projectSnapshot.data() as ProjectDocument;
    const currentBalance = projectData.balance || 0;

    // Calcular nuevo saldo
    let newBalance = currentBalance;
    const paymentAmount = paymentData.amount || 0;

    if (paymentData.isAdjustment) {
      // Para ajustes, restar el monto
      newBalance -= paymentAmount;
    } else {
      // Para pagos normales, sumar el monto
      newBalance += paymentAmount;
    }

    // Usar batch para actualizar proyecto y añadir pago
    const batch = writeBatch(firestore);

    // Actualizar saldo del proyecto
    batch.update(projectRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });

    // Añadir nuevo pago
    const paymentCollectionRef = collection(firestore, PAYMENTS_COLLECTION);
    const newPaymentRef = doc(paymentCollectionRef);
    batch.set(newPaymentRef, dataToSave);

    // Ejecutar batch
    await batch.commit();

    // Obtener datos del nuevo pago
    const paymentDoc = await getDoc(newPaymentRef);
    const savedPayment = paymentFromDoc(paymentDoc);

    console.log(`Pago añadido exitosamente. Nuevo saldo del proyecto ${paymentData.projectId}: ${newBalance}`);

    // Si el pago tiene cuotas, guardarlas en Firestore como documentos separados
    if (savedPayment.installments && savedPayment.installments > 1) {
      console.log(`Pago con ${savedPayment.installments} cuotas detectado. Guardando cuotas en Firestore...`);
      
      // Generar cuotas para este pago
      const installments = generateInstallments(savedPayment);
      
      // Crear batch para guardar cuotas
      const installmentsBatch = writeBatch(firestore);
      
      // Para cada cuota, crear un documento en Firestore
      installments.forEach(installment => {
        const installmentId = `${savedPayment.id}_cuota_${installment.installmentNumber}`;
        const installmentRef = doc(firestore, INSTALLMENTS_COLLECTION, installmentId);
        
        installmentsBatch.set(installmentRef, {
          ...installment,
          date: Timestamp.fromDate(new Date(installment.date)),
          projectId: savedPayment.projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Guardar todas las cuotas
      await installmentsBatch.commit();
      console.log(`Se guardaron ${installments.length} cuotas en Firestore para el pago ${savedPayment.id}`);
    }

    return savedPayment;
  } catch (error) {
    console.error("Error adding payment:", error);
    throw error;
  }
};

export const updatePayment = async (paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  // Note: This function does not currently recalculate project balance if payment amount changes.
  // That would require fetching the old payment amount, the project, calculating the difference, and then updating.
  // For simplicity, this is left out, but it's a consideration for full financial accuracy.
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  
  const dataToUpdate: { [key: string]: any } = { 
    updatedAt: serverTimestamp() as Timestamp,
  };

  (Object.keys(paymentData) as Array<keyof typeof paymentData>).forEach(key => {
    if (paymentData[key] !== undefined) { 
      if (key === 'date' && paymentData.date) {
        dataToUpdate.date = Timestamp.fromDate(new Date(paymentData.date));
      } else {
        dataToUpdate[key] = paymentData[key];
      }
    }
  });

  if (Object.keys(dataToUpdate).length > 1) { // Only update if there's more than just updatedAt
    await updateDoc(paymentDocRef, dataToUpdate);
  }
};


export const deletePayment = async (paymentId: string): Promise<void> => {
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  const paymentSnap = await getDoc(paymentDocRef);

  if (paymentSnap.exists()) {
    const paymentToDelete = paymentFromDoc(paymentSnap);

    // Restore balance to project if payment is deleted
    if (paymentToDelete.projectId && paymentToDelete.amount && paymentToDelete.amount > 0 && !paymentToDelete.isAdjustment) {
      const projectDocRef = doc(db, PROJECTS_COLLECTION, paymentToDelete.projectId);
      try {
        const projectSnap = await getDoc(projectDocRef);
        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as ProjectDocument;
          const currentBalance = projectData.balance ?? (projectData.total ?? 0);
          const newBalance = currentBalance + paymentToDelete.amount;
          
          const projectUpdateData: { balance: number, updatedAt: Timestamp, isPaid?: boolean } = { 
            balance: newBalance, 
            updatedAt: serverTimestamp() as Timestamp 
          };
          // If balance becomes > 0, it's definitely not fully paid
          if (newBalance > 0 && projectData.isPaid) {
            projectUpdateData.isPaid = false;
          }

          await updateDoc(projectDocRef, projectUpdateData);
          console.log(`Project ${paymentToDelete.projectId} balance restored to ${newBalance} after payment deletion.`);
        }
      } catch (error) {
        console.error(`Error restoring project balance for ${paymentToDelete.projectId} after payment deletion:`, error);
      }
    }
  }

  await deleteDoc(paymentDocRef);
};

export const deletePaymentsForProject = async (projectId: string): Promise<void> => {
  const paymentsCollectionRef = collection(db, PAYMENTS_COLLECTION);
  const q = query(paymentsCollectionRef, where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  querySnapshot.docs.forEach(docSnapshot => {
    batch.delete(docSnapshot.ref);
  });
  // Note: This function does not adjust project balance when deleting all payments for a project.
  // If a project is deleted, its balance effectively becomes irrelevant, or should be reset/archived.
  await batch.commit();
};

// La interfaz Installment ya está definida al inicio del archivo

/**
 * Genera todas las cuotas para un pago a plazos
 */
export const generateInstallments = (payment: Payment): Installment[] => {
  if (!payment.amount || !payment.installments || !payment.date) {
    return [];
  }

  const installments: Installment[] = [];
  const amountPerInstallment = payment.amount / payment.installments;
  const startDate = new Date(payment.date);
  
  // Si es el primer pago, se toma la fecha original
  installments.push({
    date: startDate,
    amount: amountPerInstallment,
    isPaid: true, // El primer pago se considera pagado
    paymentId: payment.id,
    installmentNumber: 1,
    totalInstallments: payment.installments,
    projectId: payment.projectId
  });

  // Generar las cuotas restantes
  for (let i = 1; i < payment.installments; i++) {
    const installmentDate = new Date(startDate);
    installmentDate.setMonth(startDate.getMonth() + i);
    
    installments.push({
      date: installmentDate,
      amount: amountPerInstallment,
      isPaid: false, // Las cuotas futuras no están pagadas
      paymentId: payment.id,
      installmentNumber: i + 1,
      totalInstallments: payment.installments,
      projectId: payment.projectId
    });
  }

  return installments;
};

/**
 * Guarda las cuotas en Firestore como documentos independientes
 * @param payment El pago del que se generarán las cuotas
 * @param firestore Instancia de Firestore
 * @returns Promesa que se resuelve con las cuotas guardadas
 */
export const saveInstallmentsToFirestore = async (payment: Payment, firestore = db): Promise<Installment[]> => {
  try {
    console.log(`Guardando cuotas para pago ${payment.id}...`);
    
    // 1. Generar las cuotas
    const installments = generateInstallments(payment);
    if (installments.length === 0) {
      console.log('No hay cuotas para guardar');
      return [];
    }
    
    // 2. Crear lote de escritura para operaciones en batch
    const batch = writeBatch(firestore);
    
    // 3. Para cada cuota, crear un documento en la colección de cuotas
    installments.forEach(installment => {
      const installmentId = `${payment.id}_cuota_${installment.installmentNumber}`;
      const installmentRef = doc(firestore, INSTALLMENTS_COLLECTION, installmentId);
      
      // Datos a guardar para la cuota
      const installmentData = {
        ...installment,
        date: Timestamp.fromDate(new Date(installment.date)),
        projectId: payment.projectId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      batch.set(installmentRef, installmentData);
    });
    
    // 4. Ejecutar el batch
    await batch.commit();
    console.log(`Se guardaron ${installments.length} cuotas en Firestore`);
    
    return installments;
  } catch (error) {
    console.error('Error guardando cuotas en Firestore:', error);
    throw error;
  }
};

/**
 * Actualiza el estado de una cuota específica
 * @param installmentId ID de la cuota
 * @param isPaid Estado de pago (true = pagado, false = pendiente)
 * @param firestore Instancia de Firestore
 * @returns Promesa que se resuelve cuando se actualiza el estado
 */
export const updateInstallmentStatus = async (
  installmentId: string, 
  isPaid: boolean, 
  firestore = db
): Promise<boolean> => {
  try {
    const installmentRef = doc(firestore, INSTALLMENTS_COLLECTION, installmentId);
    await updateDoc(installmentRef, {
      isPaid,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error(`Error actualizando estado de cuota ${installmentId}:`, error);
    throw error;
  }
};

/**
 * Obtiene todas las cuotas almacenadas en Firestore
 * @param firestore Instancia de Firestore
 * @returns Promesa que se resuelve con un array de cuotas
 */
export const getAllInstallments = async (firestore = db): Promise<Installment[]> => {
  try {
    const installmentsRef = collection(firestore, INSTALLMENTS_COLLECTION);
    const q = query(installmentsRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date?.toDate() || new Date(),
        amount: data.amount || 0,
        isPaid: data.isPaid || false,
        paymentId: data.paymentId || '',
        installmentNumber: data.installmentNumber || 0,
        totalInstallments: data.totalInstallments || 0,
        projectId: data.projectId,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Installment;
    });
  } catch (error) {
    console.error('Error obteniendo cuotas:', error);
    throw error;
  }
};

/**
 * Obtiene las cuotas asociadas a un pago específico
 * @param paymentId ID del pago
 * @param firestore Instancia de Firestore
 * @returns Promesa que se resuelve con un array de cuotas del pago
 */
export const getInstallmentsByPayment = async (
  paymentId: string, 
  firestore = db
): Promise<Installment[]> => {
  try {
    const installmentsRef = collection(firestore, INSTALLMENTS_COLLECTION);
    const q = query(
      installmentsRef, 
      where('paymentId', '==', paymentId),
      orderBy('installmentNumber', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date?.toDate() || new Date(),
        amount: data.amount || 0,
        isPaid: data.isPaid || false,
        paymentId: data.paymentId || '',
        installmentNumber: data.installmentNumber || 0,
        totalInstallments: data.totalInstallments || 0,
        projectId: data.projectId,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Installment;
    });
  } catch (error) {
    console.error(`Error obteniendo cuotas para pago ${paymentId}:`, error);
    throw error;
  }
};

/**

/**
 * Obtiene el total de cuotas pendientes para el mes actual
 * que cumplan con:
 * 1. Pertenecen al mes y año actual
 * 2. Están marcadas como pendientes (no pagadas)
 * 3. Su fecha de vencimiento es igual o posterior a hoy
 */
export const getCurrentMonthInstallmentSum = async (): Promise<number> => {
  try {
    console.log('Iniciando cálculo de total del mes actual...');
    
    // Fechas importantes
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    // Obtener primer y último día del mes actual
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999); // Fin del día
    
    console.log('Rango de fechas para el cálculo:');
    console.log(`- Desde: ${now.toISOString()} (hoy)`);
    console.log(`- Hasta: ${lastDayOfMonth.toISOString()} (fin de mes)`);
    
    // Obtenemos todos los pagos a cuotas
    const paymentsCollectionRef = collection(db, PAYMENTS_COLLECTION);
    const q = query(
      paymentsCollectionRef,
      where('installments', '>', 1) // Solo pagos a cuotas
    );

    console.log('Ejecutando consulta de pagos a cuotas...');
    const querySnapshot = await getDocs(q);
    console.log(`Se encontraron ${querySnapshot.size} pagos a cuotas`);
    
    let total = 0;
    
    // Procesar cada pago y generar sus cuotas
    for (const doc of querySnapshot.docs) {
      try {
        const payment = paymentFromDoc(doc);
        const installments = generateInstallments(payment);
        
        console.log(`\nProcesando pago ${payment.id} con ${installments.length} cuotas`);
        
        // Filtrar cuotas según los criterios:
        // 1. Del mes actual
        // 2. No pagadas
        // 3. Con fecha de vencimiento >= hoy
        const validInstallments = installments.filter(installment => {
          const installmentDate = new Date(installment.date);
          installmentDate.setHours(0, 0, 0, 0); // Normalizar fecha
          
          const isCurrentMonth = 
            installmentDate.getMonth() === now.getMonth() &&
            installmentDate.getFullYear() === now.getFullYear();
            
          const isPending = !installment.isPaid;
          const isDueTodayOrFuture = installmentDate >= now;
          
          return isCurrentMonth && isPending && isDueTodayOrFuture;
        });
        
        if (validInstallments.length > 0) {
          console.log(`- Encontradas ${validInstallments.length} cuotas válidas:`);
          
          validInstallments.forEach((inst, idx) => {
            const formattedDate = new Date(inst.date).toLocaleDateString();
            console.log(`  ${idx + 1}. ${formattedDate} - $${inst.amount.toFixed(2)}`);
          });
          
          const monthlyTotal = validInstallments.reduce((sum, inst) => sum + inst.amount, 0);
          console.log(`- Monto total para este pago: $${monthlyTotal.toFixed(2)}`);
          total += monthlyTotal;
        } else {
          console.log('- No hay cuotas que cumplan los criterios');
        }
      } catch (error) {
        console.error('Error procesando documento:', doc.id, error);
      }
    }

    console.log('\nTotal calculado para el mes actual: $' + total.toFixed(2));
    return total;
  } catch (error) {
    console.error('Error calculando total de cuotas del mes actual:', error);
    throw error;
  }
};

/**
 * Obtiene el total de cuotas pendientes de pago
 */
export const getTotalPendingInstallmentSum = async (): Promise<number> => {
  try {
    console.log('Iniciando cálculo de total pendiente...');
    // Obtenemos todos los pagos a cuotas
    const paymentsCollectionRef = collection(db, PAYMENTS_COLLECTION);
    const q = query(
      paymentsCollectionRef,
      where('installments', '>', 1) // Solo pagos a cuotas
    );

    console.log('Ejecutando consulta de pagos a cuotas para total pendiente...');
    const querySnapshot = await getDocs(q);
    console.log(`Se encontraron ${querySnapshot.size} pagos a cuotas`);
    
    let total = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar la fecha actual
    console.log('Fecha actual normalizada:', now.toISOString());
    
    // Procesar cada pago y generar sus cuotas
    querySnapshot.forEach((doc) => {
      try {
        const payment = paymentFromDoc(doc);
        const installments = generateInstallments(payment);
        
        console.log(`Procesando pago ${payment.id} con ${installments.length} cuotas`);
        
        // Filtrar cuotas pendientes (no pagadas y con fecha futura o hoy)
        const pendingInstallments = installments.filter(installment => {
          const installmentDate = new Date(installment.date);
          installmentDate.setHours(0, 0, 0, 0);
          return !installment.isPaid && installmentDate >= now;
        });
        
        if (pendingInstallments.length > 0) {
          console.log(`- ${pendingInstallments.length} cuotas pendientes`);
          const pendingTotal = pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0);
          console.log(`- Monto total pendiente para este pago: ${pendingTotal}`);
          total += pendingTotal;
        }
      } catch (error) {
        console.error('Error procesando documento para total pendiente:', doc.id, error);
      }
    });

    console.log('Total pendiente calculado:', total);
    return total;
  } catch (error) {
    console.error('Error calculando total de cuotas pendientes:', error);
    throw error;
  }
};

