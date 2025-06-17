// src/constants/payment.ts
// Constantes relacionadas con pagos y métodos de pago
import type { Timestamp } from 'firebase/firestore';

// Unificación de PAYMENT_METHODS (de lib/constants.ts) y POSSIBLE_PAYMENT_METHODS (de types/payment.ts)
export const PAYMENT_METHODS = ['transferencia', 'tarjeta de crédito', 'cheque', 'tarjeta de débito', 'efectivo', 'otro'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number] | string;

// Unificación de PAYMENT_TYPES (de lib/constants.ts) y POSSIBLE_PAYMENT_TYPES (de types/payment.ts)
export const PAYMENT_TYPES = ['proyecto', 'cliente', 'otro'] as const;
export type PaymentTypeOption = ' ' | typeof PAYMENT_TYPES[number] | string;

// Tipos exportados originalmente desde types/payment.ts
export interface Payment {
  id: string;
  projectId: string; 
  amount?: number;
  date: Date;
  paymentMethod?: PaymentMethod;
  createdAt: Date;
  updatedAt?: Date;
  paymentType?: PaymentTypeOption;
  installments?: number;
  isAdjustment: boolean;
  notes?: string;
}

// Helper type for Firestore document structure
export interface PaymentDocument extends Omit<Payment, 'id' | 'date' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Interface for data used when importing payments
export interface PaymentImportData {
  id: string;
  projectId: string;
  amount?: number;
  date: string | Date;
  paymentMethod?: string;
  createdAt: string | Date;
  paymentType?: string;
  installments?: number;
  isAdjustment: boolean;
  notes?: string;
}
