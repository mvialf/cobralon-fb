// src/services/afterSalesService.ts
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
import type { AfterSales, AfterSalesDocument, TaskItem } from '@/types/afterSales';

const AFTERSALES_COLLECTION = 'afterSales';

const taskItemFromDoc = (taskDoc: any): TaskItem => ({
  ...taskDoc,
  createdAt: taskDoc.createdAt instanceof Timestamp ? taskDoc.createdAt.toDate() : undefined,
  completedAt: taskDoc.completedAt instanceof Timestamp ? taskDoc.completedAt.toDate() : undefined,
});

const taskItemToDoc = (task: TaskItem): any => ({
  ...task,
  createdAt: task.createdAt ? Timestamp.fromDate(task.createdAt) : serverTimestamp(),
  completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : undefined,
});

const afterSalesFromDoc = (docSnapshot: any): AfterSales => {
  const data = docSnapshot.data() as AfterSalesDocument;
  return {
    id: docSnapshot.id,
    ...data,
    entryDate: data.entryDate instanceof Timestamp ? data.entryDate.toDate() : undefined,
    resolutionDate: data.resolutionDate instanceof Timestamp ? data.resolutionDate.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
    tasks: data.tasks?.map(taskItemFromDoc),
  } as AfterSales;
};

export const getAfterSalesForProject = async (projectId: string): Promise<AfterSales[]> => {
  const afterSalesCollectionRef = collection(db, AFTERSALES_COLLECTION);
  const q = query(afterSalesCollectionRef, where('projectId', '==', projectId), orderBy('entryDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(afterSalesFromDoc);
};

export const getAfterSalesById = async (afterSalesId: string): Promise<AfterSales | null> => {
  const afterSalesDocRef = doc(db, AFTERSALES_COLLECTION, afterSalesId);
  const docSnap = await getDoc(afterSalesDocRef);
  if (docSnap.exists()) {
    return afterSalesFromDoc(docSnap);
  }
  return null;
};

export const addAfterSales = async (afterSalesData: Omit<AfterSales, 'id' | 'createdAt' | 'updatedAt'>): Promise<AfterSales> => {
  const afterSalesCollectionRef = collection(db, AFTERSALES_COLLECTION);
  const dataToSave: Omit<AfterSalesDocument, 'id'> = {
    ...afterSalesData,
    entryDate: afterSalesData.entryDate ? Timestamp.fromDate(afterSalesData.entryDate) : serverTimestamp() as Timestamp,
    resolutionDate: afterSalesData.resolutionDate ? Timestamp.fromDate(afterSalesData.resolutionDate) : undefined,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    tasks: afterSalesData.tasks?.map(taskItemToDoc),
  };
  const docRef = await addDoc(afterSalesCollectionRef, dataToSave);
  return { 
    id: docRef.id, 
    ...afterSalesData,
    createdAt: new Date(), // Approximate client-side
    updatedAt: new Date()  // Approximate client-side
  };
};

export const updateAfterSales = async (afterSalesId: string, afterSalesData: Partial<Omit<AfterSales, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const afterSalesDocRef = doc(db, AFTERSALES_COLLECTION, afterSalesId);
  
  // Create a mutable copy for dataToUpdate
  const dataToUpdate: Partial<AfterSalesDocument> = { ...afterSalesData } as Partial<AfterSalesDocument>;
  delete (dataToUpdate as any).id; // Ensure id is not part of the update payload

  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  if (afterSalesData.hasOwnProperty('entryDate')) {
    dataToUpdate.entryDate = afterSalesData.entryDate ? Timestamp.fromDate(afterSalesData.entryDate) : undefined;
  }
  if (afterSalesData.hasOwnProperty('resolutionDate')) {
    dataToUpdate.resolutionDate = afterSalesData.resolutionDate ? Timestamp.fromDate(afterSalesData.resolutionDate) : undefined;
  }
  if (afterSalesData.tasks) {
    dataToUpdate.tasks = afterSalesData.tasks.map(taskItemToDoc);
  }

  await updateDoc(afterSalesDocRef, dataToUpdate);
};

export const deleteAfterSales = async (afterSalesId: string): Promise<void> => {
  const afterSalesDocRef = doc(db, AFTERSALES_COLLECTION, afterSalesId);
  await deleteDoc(afterSalesDocRef);
};
