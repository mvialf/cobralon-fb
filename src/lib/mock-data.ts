
import type { EventType } from '@/types/event';
import { startOfDay, endOfDay, addDays } from './calendar-utils';

const today = new Date();
const tomorrow = addDays(today, 1);
const yesterday = addDays(today, -1);
const nextWeekDate = addDays(today, 7);

export const mockEvents: EventType[] = [
  {
    id: crypto.randomUUID(),
    name: 'Sincronización de Equipo',
    startDate: startOfDay(today), // Task for today
    endDate: endOfDay(today),     // Ends end of today
    description: 'Reunión semanal de sincronización del equipo para discutir progresos y bloqueos.',
    color: 'hsl(var(--primary))', 
  },
  {
    id: crypto.randomUUID(),
    name: 'Llamada Cliente: Proyecto Alfa',
    // This event still has specific times, showing the system can handle mixed types if needed,
    // but new events via UI will be day-based.
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30, 0),
    description: 'Discusión con Cliente X sobre hitos del Proyecto Alfa.',
    color: 'hsl(var(--accent))', 
  },
  {
    id: crypto.randomUUID(),
    name: 'Revisión de Diseño',
    startDate: startOfDay(tomorrow),
    endDate: endOfDay(tomorrow),
    description: 'Revisión interna de los nuevos diseños de UI.',
    color: 'hsl(var(--chart-4))', 
  },
  {
    id: crypto.randomUUID(),
    name: 'Taller: Metodologías Ágiles',
    startDate: startOfDay(yesterday),
    endDate: endOfDay(yesterday), // If it's a full day workshop
    description: 'Taller de día completo sobre prácticas de desarrollo ágil.',
    color: 'hsl(var(--chart-2))',
  },
  {
    id: crypto.randomUUID(),
    name: 'Planificación Lanzamiento Producto',
    startDate: startOfDay(nextWeekDate),
    endDate: endOfDay(addDays(nextWeekDate, 2)), // Multi-day task
    description: 'Sesión intensiva de planificación para el próximo lanzamiento del producto.',
    color: 'hsl(var(--destructive))',
  },
  {
    id: crypto.randomUUID(),
    name: 'Tarea Genérica',
    startDate: startOfDay(today),
    endDate: endOfDay(today),
    description: 'Una tarea estándar para este día.',
    color: 'hsl(var(--secondary))',
  }
];
