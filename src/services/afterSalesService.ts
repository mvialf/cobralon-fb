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

const taskItemToDoc = (task: TaskItem): Omit<TaskItem, 'createdAt' | 'completedAt'> & { 
  id: string;
  description: string;
  isCompleted: boolean;
  createdAt?: Timestamp; 
  completedAt?: Timestamp;
} => {
  const doc: any = {
    id: task.id || crypto.randomUUID(),
    description: task.description,
    isCompleted: task.isCompleted || false
  };
  
  if (task.createdAt) {
    doc.createdAt = Timestamp.fromDate(task.createdAt);
  }
  
  if (task.completedAt) {
    doc.completedAt = Timestamp.fromDate(task.completedAt);
  }
  
  return doc;
};

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
  try {
    const afterSalesCollectionRef = collection(db, AFTERSALES_COLLECTION);
    
    // Crear el objeto de datos asegurando que los campos requeridos estén presentes
    const now = Timestamp.now();
    const entryDate = afterSalesData.entryDate ? Timestamp.fromDate(
      afterSalesData.entryDate instanceof Date ? afterSalesData.entryDate : new Date(afterSalesData.entryDate)
    ) : now;
    
    // Construir el objeto de datos para Firestore
    const dataToSave: Partial<AfterSalesDocument> = {
      projectId: afterSalesData.projectId,
      description: afterSalesData.description || '',
      afterSalesStatus: afterSalesData.afterSalesStatus || 'Ingresada',
      entryDate,
      createdAt: now,
      updatedAt: now,
    };

    // Agregar campos opcionales solo si están definidos
    if (afterSalesData.resolutionDate) {
      dataToSave.resolutionDate = Timestamp.fromDate(
        afterSalesData.resolutionDate instanceof Date ? afterSalesData.resolutionDate : new Date(afterSalesData.resolutionDate)
      );
    }

    if (afterSalesData.assignedTo) {
      dataToSave.assignedTo = afterSalesData.assignedTo;
    }

    if (afterSalesData.notes) {
      dataToSave.notes = afterSalesData.notes;
    }

    // Mapear tareas si existen
    if (afterSalesData.tasks && afterSalesData.tasks.length > 0) {
      dataToSave.tasks = afterSalesData.tasks.map(task => ({
        id: task.id || crypto.randomUUID(),
        description: task.description,
        isCompleted: task.isCompleted || false,
        ...(task.createdAt && { 
          createdAt: task.createdAt instanceof Date ? Timestamp.fromDate(task.createdAt) : Timestamp.now() 
        }),
        ...(task.completedAt && {
          completedAt: task.completedAt instanceof Date ? Timestamp.fromDate(task.completedAt) : undefined
        })
      }));
    } else {
      dataToSave.tasks = [];
    }

    // Agregar el documento a Firestore
    const docRef = await addDoc(afterSalesCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    
    if (!newDocSnap.exists()) {
      throw new Error('No se pudo crear el documento de postventa');
    }
    
    return afterSalesFromDoc(newDocSnap);
  } catch (error) {
    console.error('Error al guardar la postventa:', error);
    throw new Error(`Error al guardar la postventa: ${error.message}`);
  }
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
