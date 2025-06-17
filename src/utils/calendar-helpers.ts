// src/utils/calendar-helpers.ts
// Funciones de utilidad para el manejo de calendarios y eventos

import type { EventType, ViewOption } from '@/types/event';
import { 
  eachDayOfInterval, 
  endOfMonth, 
  endOfWeek, 
  startOfMonth, 
  startOfWeek, 
  addHours, 
  isSameDay
} from '@/utils/date-helpers';

/**
 * Obtiene los días organizados en semanas para un mes dado
 * @param date Fecha dentro del mes a consultar
 * @param weekStartsOnValue Indica si la semana comienza el domingo (0) o lunes (1)
 * @returns Matriz bidimensional de fechas, donde cada fila representa una semana
 */
export const getDaysInMonth = (date: Date, weekStartsOnValue: 0 | 1 = 0): Date[][] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartsOnValue });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartsOnValue });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
};

/**
 * Obtiene los días de una semana completa
 * @param date Fecha dentro de la semana a consultar
 * @param weekStartsOnValue Indica si la semana comienza el domingo (0) o lunes (1)
 * @returns Array con los 7 días de la semana
 */
export const getDaysInWeek = (date: Date, weekStartsOnValue: 0 | 1 = 0): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn: weekStartsOnValue });
  return eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: weekStartsOnValue }) });
};

/**
 * Genera slots de tiempo para un horario
 * @param startHour Hora de inicio (0-23)
 * @param endHour Hora de fin (1-24)
 * @param intervalMinutes Intervalo en minutos entre slots
 * @returns Array de strings con formato HH:MM
 */
export const getTimeSlots = (startHour: number = 0, endHour: number = 24, intervalMinutes: number = 60): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

/**
 * Filtra eventos para una fecha específica
 * @param events Lista de eventos a filtrar
 * @param date Fecha para la que se quieren los eventos
 * @returns Lista de eventos que ocurren en la fecha especificada
 */
export const getEventsForDate = (events: EventType[], date: Date): EventType[] => {
  return events.filter(event => isSameDay(event.startDate, date) || (event.startDate < date && event.endDate > date));
};

/**
 * Filtra eventos para un slot de tiempo específico
 * @param events Lista de eventos a filtrar
 * @param date Fecha base
 * @param timeSlot Slot de tiempo en formato "HH:MM"
 * @param view Vista actual (day, week, month)
 * @returns Lista de eventos que ocurren en el slot de tiempo especificado
 */
export const getEventsForSlot = (events: EventType[], date: Date, timeSlot: string, view: ViewOption): EventType[] => {
  const [hour, minute] = timeSlot.split(':').map(Number);
  const slotStartDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  const slotEndDateTime = addHours(slotStartDateTime, view === 'day' || view === 'week' ? 1 : 24) // Asumimos slots de 1 hora para vista diaria/semanal

  return events.filter(event => {
    const eventStart = event.startDate;
    const eventEnd = event.endDate;
    // Verificar si el evento se solapa con el slot
    return (eventStart < slotEndDateTime && eventEnd > slotStartDateTime);
  });
};
