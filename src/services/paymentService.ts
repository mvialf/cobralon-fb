
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
  setDoc
} from 'firebase/firestore';
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
    'installments', 
    'notes'
  ];

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

