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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Client, ClientDocument } from '@/types/client';

const CLIENTS_COLLECTION = 'clients';

// Helper to convert Firestore Timestamps to Dates in client objects
const clientFromDoc = (docSnapshot: any): Client => {
  const data = docSnapshot.data() as ClientDocument;
  return {
    id: docSnapshot.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
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
  const dataToSave: Partial<ClientDocument> = {
    ...clientData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(clientsCollectionRef, dataToSave);
  // For returning the client, we'd ideally fetch it again or construct carefully
  // For simplicity, we'll construct it, but createdAt/updatedAt will be null from serverTimestamp initially client-side
  return { 
    id: docRef.id, 
    ...clientData, 
    createdAt: new Date(), // Approximate client-side
    updatedAt: new Date()  // Approximate client-side
  };
};

export const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  const dataToUpdate: Partial<ClientDocument> = {
    ...clientData,
    updatedAt: serverTimestamp() as Timestamp,
  };
  await updateDoc(clientDocRef, dataToUpdate);
};

export const deleteClient = async (clientId: string): Promise<void> => {
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(clientDocRef);
};
