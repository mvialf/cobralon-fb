
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
    // This case should ideally be caught by validation in settings/page.tsx for imports
    console.error("Payment date is missing, which is required for addPayment service.");
    throw new Error("Payment date is required for addPayment service.");
  }

  // Start with a base object containing only fields that are guaranteed to be present or have defaults handled
  const dataToSave: { [key: string]: any } = { // Use a more generic type for dynamic construction
    projectId: paymentData.projectId,
    date: paymentDateTimestamp,
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
    isAdjustment: paymentData.isAdjustment, // isAdjustment is required by PaymentImportData and Payment
  };

  // Define optional fields and add them to dataToSave only if they are not undefined
  const optionalFields: Array<keyof Omit<PaymentImportData, 'id' | 'projectId' | 'date' | 'createdAt' | 'isAdjustment'>> = [
    'amount', 
    'paymentMethod', 
    'paymentType', 
    'installments', 
    'notes'
  ];

  optionalFields.forEach(field => {
    const key = field as keyof typeof paymentData; // Ensure 'field' is a valid key
    if (paymentData[key] !== undefined) {
      dataToSave[field] = paymentData[key];
    }
  });


  let docRef;
  // When importing, 'id' will be present in paymentData (as PaymentImportData has 'id')
  if ('id' in paymentData && paymentData.id) {
    docRef = doc(db, PAYMENTS_COLLECTION, paymentData.id);
    // Firestore allows saving an empty object, but we ensure required fields are there
    await setDoc(docRef, dataToSave as Omit<PaymentDocument, 'id'>); 
  } else {
    // This branch is more for UI-driven additions where ID is auto-generated
    const collectionRef = collection(db, PAYMENTS_COLLECTION);
    docRef = await addDoc(collectionRef, dataToSave as Omit<PaymentDocument, 'id'>);
  }
  
  const newDocSnap = await getDoc(docRef);
  return paymentFromDoc(newDocSnap);
};

export const updatePayment = async (paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
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

