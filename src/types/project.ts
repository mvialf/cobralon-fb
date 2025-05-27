// src/types/project.ts
import type { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'ingresado' | 'en progreso' | 'completado' | 'cancelado' | 'pendiente aprobación' | string;

export interface ProjectType {
  id: string;
  projectNumber: string;
  clientId: string; // ID of the related client document in the 'clients' collection
  description?: string;
  date: Date; // Start date of the project
  subtotal: number;
  taxRate: number;
  total?: number; // Calculated: subtotal * (1 + taxRate / 100)
  balance?: number; // Initially same as total, decreases with payments
  createdAt?: Date;
  updatedAt?: Date;
  status: ProjectStatus;
  phone?: string; // Contact phone for the project, might differ from client
  address?: string; // Project site address
  commune?: string;
  region?: string;
  windowsCount?: number;
  squareMeters?: number;
  uninstall?: boolean;
  uninstallTypes?: string[];
  uninstallOther?: string;
  glosa?: string; // Short note or summary, similar to description but often more technical or brief
  collect: boolean; // Indicates if materials need to be collected
  isHidden?: boolean; // For soft deletes or hiding projects from lists
  isPaid?: boolean; // New field for the interactive paid switch
}

// Helper type for Firestore document structure
export interface ProjectDocument extends Omit<ProjectType, 'id' | 'date' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Interface for data used when importing projects
export interface ProjectImportData extends Partial<Omit<ProjectType, 'total' | 'balance' | 'updatedAt' | 'date' | 'createdAt' >> {
  id?: string; // If provided, this ID will be used for the document.
  projectNumber: string;
  clientId: string;
  date: string | Date; // Can be string from JSON or Date object
  subtotal: number;
  taxRate: number;
  status: ProjectStatus;
  collect: boolean;
  isPaid?: boolean; // Added for import
  createdAt?: string | Date; // Can be string from JSON or Date object
}
