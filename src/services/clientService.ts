
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Client } from '@/types/client';

const CLIENTS_COLLECTION = 'clients';

// Helper to convert Firestore Timestamps to Dates in client objects
const clientFromDoc = (docSnapshot: any): Client => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    // Example if you had date fields:
    // createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    // updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
  } as Client;
};


export const getClients = async (): Promise<Client[]> => {
  const clientsCollection = collection(db, CLIENTS_COLLECTION);
  const q = query(clientsCollection, orderBy('name', 'asc')); // Sort by name
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(clientFromDoc);
};

export const addClient = async (clientData: Omit<Client, 'id'>): Promise<Client> => {
  const clientsCollection = collection(db, CLIENTS_COLLECTION);
  // Add server-side timestamp if you have createdAt/updatedAt fields
  // const dataToSave = { ...clientData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  const docRef = await addDoc(clientsCollection, clientData);
  return { id: docRef.id, ...clientData };
};

export const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>): Promise<void> => {
  const clientDoc = doc(db, CLIENTS_COLLECTION, clientId);
  // const dataToUpdate = { ...clientData, updatedAt: Timestamp.now() };
  await updateDoc(clientDoc, clientData);
};

export const deleteClient = async (clientId: string): Promise<void> => {
  const clientDoc = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(clientDoc);
};
