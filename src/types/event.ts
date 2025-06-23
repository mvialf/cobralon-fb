export interface EventType {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  color?: string; // e.g., '#FF0000' or 'blue' or a Tailwind color class
  displayOrder?: number; // Orden visual para eventos dentro del mismo día
  type: 'Proyecto' | 'Postventa' | 'Visita'; // Tipo de evento obligatorio
  referenceId: string; // ID del proyecto, postventa o visita relacionada
  status?: string; // Estado actual del evento (obtenido del registro referenciado)
}

export type ViewOption = 'month' | 'week' | 'day';
