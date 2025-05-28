// src/types/payment.ts
import type { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta de débito' | 'tarjeta de crédito' | 'cheque' | 'otro' | string;
export type PaymentTypeOption = 'abono inicial' | 'abono parcial' | 'pago final' | 'ajuste positivo' | 'ajuste negativo' | string;

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
  paymentMethod?: PaymentMethod;
  createdAt: string | Date; // Can be string from JSON or Date object
  paymentType?: PaymentTypeOption;
  installments?: number;
  isAdjustment: boolean;
  notes?: string;
}
