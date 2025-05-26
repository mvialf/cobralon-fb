// src/types/payment.ts
import type { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta de débito' | 'tarjeta de crédito' | 'cheque' | 'otro' | string;
export type PaymentTypeOption = 'abono inicial' | 'abono parcial' | 'pago final' | 'ajuste positivo' | 'ajuste negativo' | string;

export interface Payment {
  id: string;
  projectId: string; // ID of the related project document in the 'projects' collection
  amount?: number;
  date?: Date;
  paymentMethod?: PaymentMethod;
  createdAt?: Date;
  updatedAt?: Date;
  paymentType?: PaymentTypeOption;
  installments?: number; // For credit card payments
  isAdjustment: boolean;
  notes?: string; // Optional field for notes
}

// Helper type for Firestore document structure
export interface PaymentDocument extends Omit<Payment, 'id' | 'date' | 'createdAt' | 'updatedAt'> {
  date?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
