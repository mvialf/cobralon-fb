
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
  collectionGroup
} from 'firebase/firestore';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { db } from '@/lib/firebase/client';
import type { Payment, PaymentDocument, PaymentImportData, PaymentMethod, PaymentTypeOption } from '@/types/payment';
import type { ProjectDocument } from '@/types/project'; // Import ProjectDocument for typing

const PAYMENTS_COLLECTION = 'payments';
const PROJECTS_COLLECTION = 'projects'; // Define projects collection name

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

export const addPayment = async (paymentData: PaymentImportData | Omit<Payment, 'id' | 'updatedAt'>): Promise<Payment> => {
  
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
    date: paymentDateTimestamp,
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
    isAdjustment: paymentData.isAdjustment, 
  };

  const optionalFields: Array<keyof Omit<PaymentImportData, 'id' | 'projectId' | 'date' | 'createdAt' | 'isAdjustment'>> = [
    'amount', 
    'paymentMethod', 
    'paymentType', 
    'notes'
  ];
  
  // Manejar específicamente el campo installments sólo para tarjeta de crédito
  if ('paymentMethod' in paymentData && paymentData.paymentMethod === 'tarjeta de crédito' && 
      'installments' in paymentData && paymentData.installments !== undefined) {
    dataToSave.installments = Number(paymentData.installments);
  }

  optionalFields.forEach(field => {
    const key = field as keyof typeof paymentData; 
    if (paymentData[key] !== undefined) {
      dataToSave[field] = paymentData[key];
    }
  });

  let docRef;
  if ('id' in paymentData && paymentData.id) {
    docRef = doc(db, PAYMENTS_COLLECTION, paymentData.id);
    await setDoc(docRef, dataToSave as Omit<PaymentDocument, 'id'>); 
  } else {
    const collectionRef = collection(db, PAYMENTS_COLLECTION);
    docRef = await addDoc(collectionRef, dataToSave as Omit<PaymentDocument, 'id'>);
  }
  
  const newDocSnap = await getDoc(docRef);
  const newPayment = paymentFromDoc(newDocSnap);

  // Update project balance
  if (newPayment.projectId && newPayment.amount && newPayment.amount > 0 && !newPayment.isAdjustment) {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, newPayment.projectId);
    try {
        const projectSnap = await getDoc(projectDocRef);
        if (projectSnap.exists()) {
            const projectData = projectSnap.data() as ProjectDocument;
            const currentBalance = projectData.balance ?? (projectData.total ?? 0); // Use total if balance is undefined
            const newBalance = currentBalance - newPayment.amount;
            
            const projectUpdateData: { balance: number, updatedAt: Timestamp, isPaid?: boolean } = { 
              balance: newBalance, 
              updatedAt: serverTimestamp() as Timestamp 
            };

            // Check if project is now fully paid
            if (newBalance <= 0) {
              projectUpdateData.isPaid = true;
            } else if (projectData.isPaid && newBalance > 0) { 
              // If it was marked as paid, but new balance is > 0 (e.g. adjustment or error correction), mark as not paid
              projectUpdateData.isPaid = false;
            }
            
            await updateDoc(projectDocRef, projectUpdateData);
            console.log(`Project ${newPayment.projectId} balance updated to ${newBalance}. isPaid: ${projectUpdateData.isPaid}`);
        } else {
            console.warn(`Project with ID ${newPayment.projectId} not found for balance update.`);
        }
    } catch (error) {
        console.error(`Error updating project balance for project ${newPayment.projectId}:`, error);
        // Consider how to handle this error, e.g., log, notify user, or attempt retry.
    }
  }

  return newPayment;
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

interface Installment {
  date: Date;
  amount: number;
  isPaid: boolean;
  paymentId: string;
  installmentNumber: number;
  totalInstallments: number;
}

/**
 * Genera todas las cuotas para un pago a plazos
 */
const generateInstallments = (payment: Payment): Installment[] => {
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
    totalInstallments: payment.installments
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
      totalInstallments: payment.installments
    });
  }

  return installments;
};

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

