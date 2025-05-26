// src/services/projectService.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ProjectType, ProjectDocument, ProjectImportData } from '@/types/project';
import { deletePaymentsForProject } from './paymentService';
import { deleteAfterSalesForProject } from './afterSalesService';

const PROJECTS_COLLECTION = 'projects';

const projectFromDoc = (docSnapshot: any): ProjectType => {
  const data = docSnapshot.data() as ProjectDocument;
  return {
    id: docSnapshot.id,
    ...data,
    date: data.date.toDate(), // Should always exist
    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  } as ProjectType;
};

export const getProjects = async (clientId?: string): Promise<ProjectType[]> => {
  const projectsCollectionRef = collection(db, PROJECTS_COLLECTION);
  let q;
  if (clientId) {
    q = query(projectsCollectionRef, where('clientId', '==', clientId), orderBy('date', 'desc'));
  } else {
    q = query(projectsCollectionRef, orderBy('date', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(projectFromDoc);
};

export const getProjectById = async (projectId: string): Promise<ProjectType | null> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(projectDocRef);
  if (docSnap.exists()) {
    return projectFromDoc(docSnap);
  }
  return null;
};

// Adjusted to handle optional id and createdAt for imports
export const addProject = async (projectData: ProjectImportData | Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'>): Promise<ProjectType> => {
  const projectsCollectionRef = collection(db, PROJECTS_COLLECTION);

  let createdAtTimestamp: Timestamp;
  if (projectData.createdAt) {
    try {
      const date = typeof projectData.createdAt === 'string' ? new Date(projectData.createdAt) : projectData.createdAt;
      if (isNaN(date.getTime())) {
        console.warn(`Invalid createdAt date provided for project ${projectData.projectNumber}. Using server timestamp. Value: ${projectData.createdAt}`);
        createdAtTimestamp = serverTimestamp() as Timestamp;
      } else {
        createdAtTimestamp = Timestamp.fromDate(date);
      }
    } catch (e) {
      console.warn(`Error parsing createdAt date for project ${projectData.projectNumber}. Using server timestamp. Value: ${projectData.createdAt}`, e);
      createdAtTimestamp = serverTimestamp() as Timestamp;
    }
  } else {
    createdAtTimestamp = serverTimestamp() as Timestamp;
  }

  const subtotal = Number(projectData.subtotal) || 0;
  const taxRate = Number(projectData.taxRate) || 0;
  const total = subtotal * (1 + taxRate / 100);
  const balance = total; // For new projects, balance starts as total

  const dataToSave: Omit<ProjectDocument, 'id'> = {
    projectNumber: projectData.projectNumber,
    clientId: projectData.clientId,
    description: projectData.description || '',
    // Ensure 'date' is a Timestamp for Firestore
    date: projectData.date instanceof Date ? Timestamp.fromDate(projectData.date) : Timestamp.fromDate(new Date(projectData.date as string)),
    subtotal: subtotal,
    taxRate: taxRate,
    total: total,
    balance: balance,
    status: projectData.status,
    classification: projectData.classification,
    collect: projectData.collect,
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
    endDate: projectData.endDate ? (projectData.endDate instanceof Date ? Timestamp.fromDate(projectData.endDate) : Timestamp.fromDate(new Date(projectData.endDate as string))) : undefined,
    phone: projectData.phone || '',
    address: projectData.address || '',
    commune: projectData.commune || '',
    region: projectData.region || 'RM',
    windowsCount: Number(projectData.windowsCount) || 0,
    squareMeters: Number(projectData.squareMeters) || 0,
    uninstall: projectData.uninstall || false,
    uninstallTypes: Array.isArray(projectData.uninstallTypes) ? projectData.uninstallTypes : [],
    uninstallOther: projectData.uninstallOther || '',
    glosa: projectData.glosa || '',
    isHidden: projectData.isHidden || false,
  };

  let docRef;
  if ('id' in projectData && projectData.id) {
    docRef = doc(db, PROJECTS_COLLECTION, projectData.id);
    await setDoc(docRef, dataToSave);
  } else {
    docRef = await addDoc(projectsCollectionRef, dataToSave);
  }
  const newDocSnap = await getDoc(docRef);
  return projectFromDoc(newDocSnap);
};


export const updateProject = async (projectId: string, projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  
  // Create a new object for dataToUpdate to avoid mutating projectData
  const dataToUpdate: { [key: string]: any } = { ...projectData };
  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  if (projectData.date) {
    dataToUpdate.date = Timestamp.fromDate(projectData.date);
  }
  if (projectData.hasOwnProperty('endDate')) { 
    dataToUpdate.endDate = projectData.endDate ? Timestamp.fromDate(projectData.endDate) : undefined;
  }
  
  // Recalculate total and balance if subtotal or taxRate changes
  if (projectData.hasOwnProperty('subtotal') || projectData.hasOwnProperty('taxRate')) {
    const currentSnap = await getDoc(projectDocRef);
    const currentData = currentSnap.data() as ProjectDocument | undefined;

    const subtotal = projectData.subtotal !== undefined ? Number(projectData.subtotal) : Number(currentData?.subtotal || 0);
    const taxRate = projectData.taxRate !== undefined ? Number(projectData.taxRate) : Number(currentData?.taxRate || 0);
    
    dataToUpdate.subtotal = subtotal;
    dataToUpdate.taxRate = taxRate;
    dataToUpdate.total = subtotal * (1 + taxRate / 100);
    
    // Adjust balance carefully. If total changes, balance might need adjustment
    // This logic assumes balance is amount owed. If total decreases, balance might decrease.
    // A more robust system would track payments to adjust balance.
    // For now, if total changes, let's assume new total becomes new balance if balance was same as old total.
    // This is a simplification.
    if (currentData && currentData.balance === currentData.total) {
      dataToUpdate.balance = dataToUpdate.total;
    } else if (currentData) {
       // If payments have been made, the balance adjustment is more complex.
       // Let's preserve the difference (payments made) relative to the new total.
       const paymentsMade = (currentData.total || 0) - (currentData.balance || 0);
       dataToUpdate.balance = dataToUpdate.total - paymentsMade;
    } else {
       dataToUpdate.balance = dataToUpdate.total;
    }

  }


  await updateDoc(projectDocRef, dataToUpdate);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  // Cascade delete payments and afterSales for this project
  await deletePaymentsForProject(projectId);
  await deleteAfterSalesForProject(projectId);

  // Delete the project itself
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(projectDocRef);
};
