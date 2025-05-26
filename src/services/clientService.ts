// src/services/clientService.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Client, ClientDocument } from '@/types/client';
import { getProjects, deleteProject } from './projectService'; // Import deleteProject

const CLIENTS_COLLECTION = 'clients';

const clientFromDoc = (docSnapshot: any): Client => {
  const data = docSnapshot.data() as ClientDocument;
  return {
    id: docSnapshot.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    // address: data.address, // Removed address
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
};


export const getClients = async (): Promise<Client[]> => {
  const clientsCollectionRef = collection(db, CLIENTS_COLLECTION);
  const q = query(clientsCollectionRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(clientFromDoc);
};

export const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
  const clientsCollectionRef = collection(db, CLIENTS_COLLECTION);
  const dataToSave: Omit<ClientDocument, 'id'> = {
    name: clientData.name,
    phone: clientData.phone || undefined, // Ensure optional fields are handled
    email: clientData.email || undefined,
    // address: clientData.address || undefined, // Removed address
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(clientsCollectionRef, dataToSave);
  const newDocSnap = await getDoc(docRef);
  return clientFromDoc(newDocSnap);
};

export const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  
  // Create a new object for dataToUpdate to avoid modifying clientData directly
  const dataToUpdate: Partial<ClientDocument> = {};

  // Only include fields that are part of ClientDocument
  if (clientData.hasOwnProperty('name')) {
    dataToUpdate.name = clientData.name;
  }
  if (clientData.hasOwnProperty('phone')) {
    dataToUpdate.phone = clientData.phone || undefined;
  }
  if (clientData.hasOwnProperty('email')) {
    dataToUpdate.email = clientData.email || undefined;
  }
  // if (clientData.hasOwnProperty('address')) { // Removed address
  //   dataToUpdate.address = clientData.address || undefined;
  // }

  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  await updateDoc(clientDocRef, dataToUpdate);
};

export const deleteClient = async (clientId: string): Promise<void> => {
  // 1. Get all projects for this client
  const projectsToDelete = await getProjects(clientId);

  // 2. Delete each project (which will in turn delete its payments and afterSales)
  const deletePromises = projectsToDelete.map(project => deleteProject(project.id));
  await Promise.all(deletePromises);

  // 3. Delete the client itself
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(clientDocRef);
};
