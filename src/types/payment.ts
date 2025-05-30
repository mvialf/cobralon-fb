// src/types/payment.ts
import type { Timestamp } from 'firebase/firestore';

export const POSSIBLE_PAYMENT_METHODS = ['transferencia', 'tarjeta de crédito', 'cheque', 'tarjeta de débito', 'efectivo', 'otro'] as const;
// La definición de tipo PaymentMethod puede seguir siendo amplia si se usa en otros lugares,
// pero la validación de importación usará POSSIBLE_PAYMENT_METHODS.
export type PaymentMethod = typeof POSSIBLE_PAYMENT_METHODS[number] | string;

export const POSSIBLE_PAYMENT_TYPES = ['proyecto', 'cliente', 'otro'] as const;
// Similar para PaymentTypeOption. Nota: el tipo original incluía ' '. Si ya no es válido, se puede quitar.
// Por ahora, mantendré el tipo original amplio y la validación usará la constante.
export type PaymentTypeOption = ' ' | typeof POSSIBLE_PAYMENT_TYPES[number] | string;

export interface Payment {
  id: string;
  projectId: string; // ID of the related project document in the 'projects' collection
  amount?: number;
  date: Date; // Changed from optional to required as per schema
  paymentMethod?: PaymentMethod;
  createdAt: Date; // Changed from optional to required as per schema
  updatedAt?: Date;
  paymentType?: PaymentTypeOption;
  installments?: number; // For credit card payments
  isAdjustment: boolean; // Changed from optional to required as per schema
  notes?: string; // Optional field for notes
}

// Helper type for Firestore document structure
export interface PaymentDocument extends Omit<Payment, 'id' | 'date' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Interface for data used when importing payments
export interface PaymentImportData {
  id: string; // Required for import to use setDoc
  projectId: string;
  amount?: number;
  date: string | Date; // Can be string from JSON or Date object
  paymentMethod?: string; // Acepta string, la validación se hará contra POSSIBLE_PAYMENT_METHODS
  createdAt: string | Date; // Can be string from JSON or Date object
  paymentType?: string; // Acepta string, la validación se hará contra POSSIBLE_PAYMENT_TYPES
  installments?: number;
  isAdjustment: boolean;
  notes?: string;
}
