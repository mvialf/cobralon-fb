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
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Client, ClientDocument } from '@/types/client';
import { getProjects, deleteProject } from './projectService';

const CLIENTS_COLLECTION = 'clients';

// Interface for data used when importing or programmatically adding clients
export interface ClientImportData {
  id?: string; // If provided, this ID will be used for the document.
  name: string; // Name is required.
  phone?: string | null;
  email?: string | null;
  createdAt?: string | Date; // Can be a date string (from JSON) or a Date object.
}

const clientFromDoc = (docSnapshot: any): Client => {
  const data = docSnapshot.data() as ClientDocument;
  return {
    id: docSnapshot.id,
    name: data.name,
    phone: data.phone === null ? null : (data.phone || undefined), // Explicitly handle null
    email: data.email === null ? null : (data.email || undefined), // Explicitly handle null
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

export const addClient = async (clientData: ClientImportData): Promise<Client> => {
  let createdAtTimestamp: Timestamp;
  if (clientData.createdAt) {
    try {
      const date = typeof clientData.createdAt === 'string' ? new Date(clientData.createdAt) : clientData.createdAt;
      if (isNaN(date.getTime())) {
        console.warn(`Invalid createdAt date provided for client ${clientData.name || clientData.id}. Using server timestamp. Value: ${clientData.createdAt}`);
        createdAtTimestamp = serverTimestamp() as Timestamp;
      } else {
        createdAtTimestamp = Timestamp.fromDate(date);
      }
    } catch (e) {
      console.warn(`Error parsing createdAt date for client ${clientData.name || clientData.id}. Using server timestamp. Value: ${clientData.createdAt}`, e);
      createdAtTimestamp = serverTimestamp() as Timestamp;
    }
  } else {
    createdAtTimestamp = serverTimestamp() as Timestamp;
  }

  const dataToSave: Omit<ClientDocument, 'id'> = {
    name: clientData.name,
    // Firestore stores null as null, undefined means field is omitted
    phone: clientData.hasOwnProperty('phone') ? clientData.phone : undefined,
    email: clientData.hasOwnProperty('email') ? clientData.email : undefined,
    createdAt: createdAtTimestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  let docRef;
  if (clientData.id) {
    // Use the provided ID
    docRef = doc(db, CLIENTS_COLLECTION, clientData.id);
    await setDoc(docRef, dataToSave);
  } else {
    // Let Firestore auto-generate an ID
    docRef = await addDoc(collection(db, CLIENTS_COLLECTION), dataToSave);
  }
  const newDocSnap = await getDoc(docRef);
  return clientFromDoc(newDocSnap);
};

export const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  
  const dataToUpdate: Partial<ClientDocument> = {};

  if (clientData.hasOwnProperty('name')) {
    dataToUpdate.name = clientData.name;
  }
  // For phone and email, allow setting to null or a new string value
  if (clientData.hasOwnProperty('phone')) {
    dataToUpdate.phone = clientData.phone;
  }
  if (clientData.hasOwnProperty('email')) {
    dataToUpdate.email = clientData.email;
  }

  dataToUpdate.updatedAt = serverTimestamp() as Timestamp;

  await updateDoc(clientDocRef, dataToUpdate);
};

export const deleteClient = async (clientId: string): Promise<void> => {
  const projectsToDelete = await getProjects(clientId);
  const deletePromises = projectsToDelete.map(project => deleteProject(project.id));
  await Promise.all(deletePromises);

  const clientDocRef = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(clientDocRef);
};
