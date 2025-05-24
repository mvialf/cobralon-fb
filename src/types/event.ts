export interface EventType {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  color?: string; // e.g., '#FF0000' or 'blue' or a Tailwind color class
}

export type ViewOption = 'month' | 'week' | 'day';
