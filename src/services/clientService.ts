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
    address: data.address, // Added address to match UI
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(), // Default if not present
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(), // Default if not present
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
  // Ensure address is included if it's part of clientData, default to undefined if not
  const dataToSave: Partial<ClientDocument> = {
    name: clientData.name,
    phone: clientData.phone || undefined,
    email: clientData.email || undefined,
    address: clientData.address || undefined, // Ensure address is handled
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(clientsCollectionRef, dataToSave);
  const newDocSnap = await getDoc(docRef);
  return clientFromDoc(newDocSnap);
};

export const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  const dataToUpdate: Partial<ClientDocument> = {
    ...clientData, // Spread all provided clientData
    updatedAt: serverTimestamp() as Timestamp,
  };
  // Remove id if it accidentally got in clientData
  delete (dataToUpdate as any).id; 
  delete (dataToUpdate as any).createdAt;

  await updateDoc(clientDocRef, dataToUpdate);
};

export const deleteClient = async (clientId: string): Promise<void> => {
  // 1. Get all projects for this client
  const projectsToDelete = await getProjects(clientId);

  // 2. Delete each project (which will in turn delete its payments and afterSales)
  // Use Promise.all to run deletions in parallel for better performance,
  // but be aware that if one fails, others might have completed.
  // For true atomicity, Cloud Functions are better.
  const deletePromises = projectsToDelete.map(project => deleteProject(project.id));
  await Promise.all(deletePromises);

  // 3. Delete the client itself
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(clientDocRef);
};
