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
    // classification is removed from ProjectType, so no mapping needed here
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

  // Remove classification if it exists in projectData, as it's no longer part of the schema
  const { classification, ...restOfProjectData } = projectData as any;


  const dataToSave: Omit<ProjectDocument, 'id'> = {
    projectNumber: restOfProjectData.projectNumber,
    clientId: restOfProjectData.clientId,
    description: restOfProjectData.description || '',
    date: restOfProjectData.date instanceof Date ? Timestamp.fromDate(restOfProjectData.date) : Timestamp.fromDate(new Date(restOfProjectData.date as string)),
    subtotal: subtotal,
    taxRate: taxRate,
    total: total,
    balance: balance,
    status: restOfProjectData.status,
    // classification: restOfProjectData.classification, // Removed classification
    collect: restOfProjectData.collect, // 'collect' is now non-optional
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
    endDate: restOfProjectData.endDate ? (restOfProjectData.endDate instanceof Date ? Timestamp.fromDate(restOfProjectData.endDate) : Timestamp.fromDate(new Date(restOfProjectData.endDate as string))) : undefined,
    phone: restOfProjectData.phone || '',
    address: restOfProjectData.address || '',
    commune: restOfProjectData.commune || '',
    region: restOfProjectData.region || 'RM',
    windowsCount: Number(restOfProjectData.windowsCount) || 0,
    squareMeters: Number(restOfProjectData.squareMeters) || 0,
    uninstall: restOfProjectData.uninstall || false,
    uninstallTypes: Array.isArray(restOfProjectData.uninstallTypes) ? restOfProjectData.uninstallTypes : [],
    uninstallOther: restOfProjectData.uninstallOther || '',
    glosa: restOfProjectData.glosa || '',
    isHidden: restOfProjectData.isHidden || false,
  };

  let docRef;
  if ('id' in restOfProjectData && restOfProjectData.id) {
    docRef = doc(db, PROJECTS_COLLECTION, restOfProjectData.id);
    await setDoc(docRef, dataToSave);
  } else {
    docRef = await addDoc(projectsCollectionRef, dataToSave);
  }
  const newDocSnap = await getDoc(docRef);
  return projectFromDoc(newDocSnap);
};


export const updateProject = async (projectId: string, projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  
  const { classification, ...restOfProjectData } = projectData as any;
  const dataToUpdate: { [key: string]: any } = { ...restOfProjectData };
  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  if (restOfProjectData.date) {
    dataToUpdate.date = Timestamp.fromDate(restOfProjectData.date);
  }
  if (restOfProjectData.hasOwnProperty('endDate')) { 
    dataToUpdate.endDate = restOfProjectData.endDate ? Timestamp.fromDate(restOfProjectData.endDate) : undefined;
  }
  
  if (restOfProjectData.hasOwnProperty('subtotal') || restOfProjectData.hasOwnProperty('taxRate')) {
    const currentSnap = await getDoc(projectDocRef);
    const currentData = currentSnap.data() as ProjectDocument | undefined;

    const subtotal = restOfProjectData.subtotal !== undefined ? Number(restOfProjectData.subtotal) : Number(currentData?.subtotal || 0);
    const taxRate = restOfProjectData.taxRate !== undefined ? Number(restOfProjectData.taxRate) : Number(currentData?.taxRate || 0);
    
    dataToUpdate.subtotal = subtotal;
    dataToUpdate.taxRate = taxRate;
    dataToUpdate.total = subtotal * (1 + taxRate / 100);
    
    if (currentData && currentData.balance === currentData.total) {
      dataToUpdate.balance = dataToUpdate.total;
    } else if (currentData) {
       const paymentsMade = (currentData.total || 0) - (currentData.balance || 0);
       dataToUpdate.balance = dataToUpdate.total - paymentsMade;
    } else {
       dataToUpdate.balance = dataToUpdate.total;
    }
  }

  await updateDoc(projectDocRef, dataToUpdate);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deletePaymentsForProject(projectId);
  await deleteAfterSalesForProject(projectId);

  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(projectDocRef);
};
