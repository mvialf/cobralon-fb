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
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Payment, PaymentDocument } from '@/types/payment';

const PAYMENTS_COLLECTION = 'payments';

const paymentFromDoc = (docSnapshot: any): Payment => {
  const data = docSnapshot.data() as PaymentDocument;
  return {
    id: docSnapshot.id,
    ...data,
    date: data.date instanceof Timestamp ? data.date.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
  } as Payment;
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

export const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> => {
  const paymentsCollectionRef = collection(db, PAYMENTS_COLLECTION);
  const dataToSave: Omit<PaymentDocument, 'id'> = {
    ...paymentData,
    date: paymentData.date ? Timestamp.fromDate(paymentData.date) : undefined,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(paymentsCollectionRef, dataToSave);
  return { 
    id: docRef.id, 
    ...paymentData,
    createdAt: new Date(), // Approximate client-side
    updatedAt: new Date()  // Approximate client-side
   };
};

export const updatePayment = async (paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  const dataToUpdate: Partial<PaymentDocument> = {
    ...paymentData,
    updatedAt: serverTimestamp() as Timestamp,
  };
  if (paymentData.hasOwnProperty('date')) {
     dataToUpdate.date = paymentData.date ? Timestamp.fromDate(paymentData.date) : undefined;
  }
  await updateDoc(paymentDocRef, dataToUpdate);
};

export const deletePayment = async (paymentId: string): Promise<void> => {
  const paymentDocRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  await deleteDoc(paymentDocRef);
};
