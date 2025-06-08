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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    isPaid: data.isPaid === undefined ? false : data.isPaid, // Default to false if not set
  } as ProjectType;
};

export const getProjects = async (clientId?: string): Promise<ProjectType[]> => {
  const projectsCollectionRef = collection(db, PROJECTS_COLLECTION);
  let q;
  if (clientId) {
    // Eliminar orderBy para evitar necesitar índice compuesto
    q = query(projectsCollectionRef, where('clientId', '==', clientId));
  } else {
    q = query(projectsCollectionRef);
  }
  const querySnapshot = await getDocs(q);
  const projects = querySnapshot.docs.map(projectFromDoc);
  
  // Ordenar los proyectos en memoria
  return projects.sort((a, b) => {
    // Ordenamiento descendente por fecha
    return b.date.getTime() - a.date.getTime();
  });
};

export const getProjectById = async (projectId: string): Promise<ProjectType | null> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(projectDocRef);
  if (docSnap.exists()) {
    return projectFromDoc(docSnap);
  }
  return null;
};

export const addProject = async (projectData: ProjectImportData | Omit<ProjectType, 'id' | 'updatedAt' | 'total' | 'balance'>): Promise<ProjectType> => {
  const projectsCollectionRef = collection(db, PROJECTS_COLLECTION);

  let createdAtTimestamp: Timestamp;
  // Verificar si createdAt existe en los datos antes de intentar acceder
  if ('createdAt' in projectData && projectData.createdAt) {
    try {
      const date = typeof projectData.createdAt === 'string' ? new Date(projectData.createdAt) : projectData.createdAt;
      if (date instanceof Date && isNaN(date.getTime())) {
        console.warn(`Invalid createdAt date provided for project ${projectData.projectNumber}. Using server timestamp.`);
        createdAtTimestamp = serverTimestamp() as Timestamp;
      } else if (date instanceof Date) {
        createdAtTimestamp = Timestamp.fromDate(date);
      } else {
        createdAtTimestamp = serverTimestamp() as Timestamp;
      }
    } catch (e) {
      console.warn(`Error parsing createdAt date for project ${projectData.projectNumber}. Using server timestamp.`, e);
      createdAtTimestamp = serverTimestamp() as Timestamp;
    }
  } else {
    createdAtTimestamp = serverTimestamp() as Timestamp;
  }

  const subtotal = Number(projectData.subtotal) || 0;
  const taxRate = Number(projectData.taxRate) || 0;
  const total = subtotal * (1 + taxRate / 100);
  const balance = total; 

  const { ...restOfProjectData } = projectData as any;


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
    collect: restOfProjectData.collect === undefined ? false : restOfProjectData.collect, // Default to false
    isPaid: restOfProjectData.isPaid === undefined ? false : restOfProjectData.isPaid, // Default to false
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
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


export const updateProject = async (projectId: string, projectData: Partial<Omit<ProjectType, 'id' | 'updatedAt'>>): Promise<void> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  
  const dataToUpdate: Partial<ProjectDocument> = {};

  // Explicitly map fields to ensure correct types and only update what's provided
  if (projectData.hasOwnProperty('projectNumber')) dataToUpdate.projectNumber = projectData.projectNumber;
  if (projectData.hasOwnProperty('clientId')) dataToUpdate.clientId = projectData.clientId;
  if (projectData.hasOwnProperty('description')) dataToUpdate.description = projectData.description;
  
  if (projectData.date) {
     try {
        // Ensure date is converted to Timestamp if it's not already one
        if (
          typeof projectData.date === 'object' && projectData.date instanceof Date || 
          typeof projectData.date === 'string' || 
          typeof projectData.date === 'number'
        ) {
            dataToUpdate.date = Timestamp.fromDate(new Date(projectData.date));
        } else if (
          typeof projectData.date === 'object' && 
          'seconds' in projectData.date && 
          'nanoseconds' in projectData.date
        ) {
            dataToUpdate.date = projectData.date as Timestamp; // It's likely a Timestamp
        }
    } catch (e) {
        console.error("Invalid date format for project update:", projectData.date, e);
        // Decide how to handle: skip date update, or throw error
    }
  }
  
  if (projectData.hasOwnProperty('subtotal')) dataToUpdate.subtotal = Number(projectData.subtotal);
  if (projectData.hasOwnProperty('taxRate')) dataToUpdate.taxRate = Number(projectData.taxRate);
  
  // Recalculate total and balance if subtotal or taxRate changes
  if (projectData.hasOwnProperty('subtotal') || projectData.hasOwnProperty('taxRate')) {
    const currentSnap = await getDoc(projectDocRef);
    const currentData = currentSnap.data() as ProjectDocument | undefined;

    const subtotal = dataToUpdate.subtotal !== undefined ? dataToUpdate.subtotal : Number(currentData?.subtotal || 0);
    const taxRate = dataToUpdate.taxRate !== undefined ? dataToUpdate.taxRate : Number(currentData?.taxRate || 0);
    
    dataToUpdate.total = subtotal * (1 + taxRate / 100);
    // Adjust balance based on the new total and existing payments
    if (currentData) {
       const paymentsMade = (currentData.total || 0) - (currentData.balance || 0);
       dataToUpdate.balance = dataToUpdate.total - paymentsMade;
    } else {
       dataToUpdate.balance = dataToUpdate.total; // Fallback if currentData is somehow not available
    }
  }

  if (projectData.hasOwnProperty('status')) dataToUpdate.status = projectData.status;
  if (projectData.hasOwnProperty('phone')) dataToUpdate.phone = projectData.phone;
  if (projectData.hasOwnProperty('address')) dataToUpdate.address = projectData.address;
  if (projectData.hasOwnProperty('commune')) dataToUpdate.commune = projectData.commune;
  if (projectData.hasOwnProperty('region')) dataToUpdate.region = projectData.region;
  if (projectData.hasOwnProperty('windowsCount')) dataToUpdate.windowsCount = Number(projectData.windowsCount);
  if (projectData.hasOwnProperty('squareMeters')) dataToUpdate.squareMeters = Number(projectData.squareMeters);
  if (projectData.hasOwnProperty('uninstall')) dataToUpdate.uninstall = projectData.uninstall;
  if (projectData.hasOwnProperty('uninstallTypes')) dataToUpdate.uninstallTypes = projectData.uninstallTypes;
  if (projectData.hasOwnProperty('uninstallOther')) dataToUpdate.uninstallOther = projectData.uninstallOther;
  if (projectData.hasOwnProperty('glosa')) dataToUpdate.glosa = projectData.glosa;
  if (projectData.hasOwnProperty('collect')) dataToUpdate.collect = projectData.collect;
  if (projectData.hasOwnProperty('isHidden')) dataToUpdate.isHidden = projectData.isHidden;
  
  // This is the key part for the switch functionality
  if (projectData.hasOwnProperty('isPaid')) {
    dataToUpdate.isPaid = projectData.isPaid;
  }

  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  // Only perform update if there are actual changes besides updatedAt
  const fieldCountToUpdate = Object.keys(dataToUpdate).filter(k => k !== 'updatedAt').length;
  if (fieldCountToUpdate > 0) {
    await updateDoc(projectDocRef, dataToUpdate);
  } else if (projectData.hasOwnProperty('updatedAt') && Object.keys(projectData).length === 1) {
    // If only updatedAt was passed (e.g. to touch the doc), allow it.
    // This case is unlikely for user-driven updates.
    await updateDoc(projectDocRef, { updatedAt: serverTimestamp() as Timestamp });
  }
  // If no fields were provided in projectData (empty object), this will essentially just update 'updatedAt'.
  // If projectData only contained 'isPaid', fieldCountToUpdate would be 1, and the update would proceed.
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deletePaymentsForProject(projectId);
  await deleteAfterSalesForProject(projectId);

  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(projectDocRef);
};
