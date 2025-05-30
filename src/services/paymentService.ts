
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
import type { Payment, PaymentDocument, PaymentImportData } from '@/types/payment';

const PAYMENTS_COLLECTION = 'payments';

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
  const q = query(paymentsCollectionRef, where('projectId', '==', projectId), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(paymentFromDoc);
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
    console.error("Payment date is missing, which is required.");
    throw new Error("Payment date is required.");
  }

  // Base object with required fields
  const dataToSave: Partial<Omit<PaymentDocument, 'id'>> & { projectId: string; date: Timestamp; createdAt: Timestamp; isAdjustment: boolean; updatedAt: Timestamp } = {
    projectId: paymentData.projectId,
    date: paymentDateTimestamp,
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
    isAdjustment: paymentData.isAdjustment, // isAdjustment is required
  };

  // Add optional fields only if they are not undefined
  if (paymentData.amount !== undefined) {
    dataToSave.amount = paymentData.amount;
  }
  if (paymentData.paymentMethod !== undefined) {
    dataToSave.paymentMethod = paymentData.paymentMethod;
  }
  if (paymentData.paymentType !== undefined) {
    dataToSave.paymentType = paymentData.paymentType;
  }
  if (paymentData.installments !== undefined) {
    dataToSave.installments = paymentData.installments;
  }
  if (paymentData.notes !== undefined) {
    dataToSave.notes = paymentData.notes;
  }


  let docRef;
  if ('id' in paymentData && paymentData.id) {
    docRef = doc(db, PAYMENTS_COLLECTION, paymentData.id);
    await setDoc(docRef, dataToSave as Omit<PaymentDocument, 'id'>); // Cast to ensure type compatibility
  } else {
    const collectionRef = collection(db, PAYMENTS_COLLECTION);
    docRef = await addDoc(collectionRef, dataToSave as Omit<PaymentDocument, 'id'>);
  }
  
  const newDocSnap = await getDoc(docRef);
  return paymentFromDoc(newDocSnap);
};

export const updatePayment = async (paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  
  // Prepare the data, ensuring optional fields are handled correctly
  const dataToUpdate: { [key: string]: any } = { // Use a more flexible type for construction
    updatedAt: serverTimestamp() as Timestamp,
  };

  // Iterate over paymentData and add fields if they are not undefined
  (Object.keys(paymentData) as Array<keyof typeof paymentData>).forEach(key => {
    if (paymentData[key] !== undefined) {
      if (key === 'date' && paymentData.date) {
        dataToUpdate.date = Timestamp.fromDate(new Date(paymentData.date));
      } else {
        dataToUpdate[key] = paymentData[key];
      }
    }
  });

  // Only update if there's something to update besides updatedAt
  if (Object.keys(dataToUpdate).length > 1) {
    await updateDoc(paymentDocRef, dataToUpdate);
  }
};


export const deletePayment = async (paymentId: string): Promise<void> => {
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
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
  await batch.commit();
};

