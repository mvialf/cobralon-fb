// src/types/project.ts
import type { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'ingresado' | 'en progreso' | 'completado' | 'cancelado' | 'pendiente aprobación' | string;
export type ProjectClassification = 'bajo' | 'medio' | 'alto' | string;

export interface ProjectType {
  id: string;
  projectNumber: string;
  clientId: string; // ID of the client document
  description?: string;
  date: Date; // Start date of the project
  subtotal: number;
  taxRate: number;
  total?: number;
  balance?: number;
  createdAt?: Date;
  updatedAt?: Date;
  status: ProjectStatus;
  endDate?: Date; // Completion or projected end date
  classification: ProjectClassification;
  phone?: string; // Contact phone for the project, might differ from client
  address?: string; // Project site address
  commune?: string;
  region?: string;
  windowsCount?: number;
  squareMeters?: number;
  uninstall?: boolean;
  uninstallTypes?: string[]; // Array of strings for uninstall types
  uninstallOther?: string;
  glosa?: string;
  collect?: boolean; // Indicates if materials need to be collected
  isHidden?: boolean; // For soft deletes or hiding projects from lists
}

// Helper type for Firestore document structure
export interface ProjectDocument extends Omit<ProjectType, 'id' | 'date' | 'endDate' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  endDate?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
