// src/types/afterSales.ts
import type { Timestamp } from 'firebase/firestore';

export interface TaskItem {
  id: string; // Unique ID for the task, e.g., crypto.randomUUID()
  description: string;
  isCompleted: boolean;
  createdAt?: Date;
  completedAt?: Date;
}

export type AfterSalesStatus = 'Ingresada' | 'Agendada' | 'Reagendar' | 'Completada';

export interface AfterSales {
  id: string;
  projectId: string; // ID of the related project document in the 'projects' collection
  description?: string; // General description of the post-sales issue
  tasks?: TaskItem[]; // List of tasks to address the issue
  entryDate?: Date; // Date the post-sales request was made
  resolutionDate?: Date; // Date the issue was resolved or closed
  createdAt?: Date;
  updatedAt?: Date;
  afterSalesStatus?: AfterSalesStatus;
  assignedTo?: string; // User/technician assigned
  notes?: string; // Internal notes
}

// Helper type for Firestore document structure
export interface AfterSalesDocument extends Omit<AfterSales, 'id' | 'entryDate' | 'resolutionDate' | 'createdAt' | 'updatedAt' | 'tasks'> {
  entryDate: Timestamp;
  resolutionDate?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tasks?: Array<{
    id: string;
    description: string;
    isCompleted: boolean;
    createdAt?: Timestamp;
    completedAt?: Timestamp;
  }>;
}
