export type VisitStatus = 'Ingresada' | 'Agendada' | 'Reagendada' | 'Completada' | 'Cancelada';

export const DEFAULT_VISIT_STATUS: VisitStatus = 'Ingresada';

export const VISIT_STATUS_OPTIONS: VisitStatus[] = [
  'Ingresada',
  'Agendada',
  'Reagendada',
  'Completada',
  'Cancelada',
];

export interface Visit {
  id: string;
  name: string;
  phone: string;
  status: VisitStatus;
  address: string;
  municipality: string;
  observations?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
