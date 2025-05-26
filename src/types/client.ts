// src/types/client.ts
import type { Timestamp } from 'firebase/firestore';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  // address?: string; // Address was already part of the UI, keeping it. // Removed address
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper type for Firestore document structure
export interface ClientDocument extends Omit<Client, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
