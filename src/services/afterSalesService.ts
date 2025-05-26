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
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { AfterSales, AfterSalesDocument, TaskItem } from '@/types/afterSales';

const AFTERSALES_COLLECTION = 'afterSales';

const taskItemFromDoc = (taskDoc: any): TaskItem => ({
  ...taskDoc,
  id: taskDoc.id || crypto.randomUUID(), // Ensure ID exists, useful if tasks are added/modified
  createdAt: taskDoc.createdAt instanceof Timestamp ? taskDoc.createdAt.toDate() : new Date(), // Default to now if not set
  completedAt: taskDoc.completedAt instanceof Timestamp ? taskDoc.completedAt.toDate() : undefined,
});

const taskItemToDoc = (task: TaskItem): any => ({
  ...task,
  id: task.id || crypto.randomUUID(),
  createdAt: task.createdAt ? Timestamp.fromDate(task.createdAt) : serverTimestamp(),
  completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : undefined,
});

const afterSalesFromDoc = (docSnapshot: any): AfterSales => {
  const data = docSnapshot.data() as AfterSalesDocument;
  return {
    id: docSnapshot.id,
    ...data,
    entryDate: data.entryDate instanceof Timestamp ? data.entryDate.toDate() : new Date(), // Default if not present
    resolutionDate: data.resolutionDate instanceof Timestamp ? data.resolutionDate.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(), // Default if not present
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(), // Default if not present
    tasks: data.tasks?.map(taskItemFromDoc) || [], // Default to empty array
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
    tasks: (afterSalesData.tasks || []).map(taskItemToDoc),
  };
  const docRef = await addDoc(afterSalesCollectionRef, dataToSave);
  const newDocSnap = await getDoc(docRef);
  return afterSalesFromDoc(newDocSnap);
};

export const updateAfterSales = async (afterSalesId: string, afterSalesData: Partial<Omit<AfterSales, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const afterSalesDocRef = doc(db, AFTERSALES_COLLECTION, afterSalesId);
  
  const dataToUpdate: Partial<AfterSalesDocument> = { ...afterSalesData } as Partial<AfterSalesDocument>;
  delete (dataToUpdate as any).id; 

  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  if (afterSalesData.hasOwnProperty('entryDate')) {
    dataToUpdate.entryDate = afterSalesData.entryDate ? Timestamp.fromDate(afterSalesData.entryDate) : undefined;
  }
  if (afterSalesData.hasOwnProperty('resolutionDate')) {
    dataToUpdate.resolutionDate = afterSalesData.resolutionDate ? Timestamp.fromDate(afterSalesData.resolutionDate) : undefined;
  }
  if (afterSalesData.tasks) {
    dataToUpdate.tasks = afterSalesData.tasks.map(taskItemToDoc);
  } else if (afterSalesData.hasOwnProperty('tasks') && afterSalesData.tasks === null) {
    // Allow explicitly setting tasks to null or empty array if needed
    dataToUpdate.tasks = [];
  }


  await updateDoc(afterSalesDocRef, dataToUpdate);
};

export const deleteAfterSales = async (afterSalesId: string): Promise<void> => {
  const afterSalesDocRef = doc(db, AFTERSALES_COLLECTION, afterSalesId);
  await deleteDoc(afterSalesDocRef);
};

export const deleteAfterSalesForProject = async (projectId: string): Promise<void> => {
  const afterSalesCollectionRef = collection(db, AFTERSALES_COLLECTION);
  const q = query(afterSalesCollectionRef, where('projectId', '==', projectId));
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
