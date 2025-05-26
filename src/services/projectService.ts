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
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ProjectType, ProjectDocument } from '@/types/project';

const PROJECTS_COLLECTION = 'projects';

const projectFromDoc = (docSnapshot: any): ProjectType => {
  const data = docSnapshot.data() as ProjectDocument;
  return {
    id: docSnapshot.id,
    ...data,
    date: data.date.toDate(),
    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
  } as ProjectType; // Cast because Omit makes some fields incompatible otherwise
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

export const addProject = async (projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectType> => {
  const projectsCollectionRef = collection(db, PROJECTS_COLLECTION);
  const dataToSave: Omit<ProjectDocument, 'id'> = {
    ...projectData,
    date: Timestamp.fromDate(projectData.date),
    endDate: projectData.endDate ? Timestamp.fromDate(projectData.endDate) : undefined,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(projectsCollectionRef, dataToSave);
  return { 
    id: docRef.id, 
    ...projectData,
    createdAt: new Date(), // Approximate client-side
    updatedAt: new Date()  // Approximate client-side
  };
};

export const updateProject = async (projectId: string, projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  const dataToUpdate: Partial<ProjectDocument> = {
    ...projectData,
    updatedAt: serverTimestamp() as Timestamp,
  };
  if (projectData.date) {
    dataToUpdate.date = Timestamp.fromDate(projectData.date);
  }
  if (projectData.hasOwnProperty('endDate')) { // Check if endDate is explicitly being set (even to null/undefined)
    dataToUpdate.endDate = projectData.endDate ? Timestamp.fromDate(projectData.endDate) : undefined;
  }
  await updateDoc(projectDocRef, dataToUpdate);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(projectDocRef);
};
