import {
  addDays as fnsAddDays,
  addHours as fnsAddHours,
  addMonths as fnsAddMonths,
  addWeeks as fnsAddWeeks,
  eachDayOfInterval as fnsEachDayOfInterval,
  endOfDay as fnsEndOfDay,
  endOfMonth as fnsEndOfMonth,
  endOfWeek as fnsEndOfWeek,
  format as fnsFormat,
  getDay as fnsGetDay,
  isSameDay as fnsIsSameDay,
  isSameMonth as fnsIsSameMonth,
  isToday as fnsIsToday,
  startOfDay as fnsStartOfDay,
  startOfMonth as fnsStartOfMonth,
  startOfWeek as fnsStartOfWeek,
  subMonths as fnsSubMonths,
  subWeeks as fnsSubWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale
import type { EventType, ViewOption } from '@/types/event';

// Custom format function that defaults to Spanish locale
const format = (
  date: Date | number | string,
  formatString: string,
  options?: Omit<Parameters<typeof fnsFormat>[2], 'locale'>
): string => {
  return fnsFormat(date, formatString, { ...options, locale: es });
};

// Export the custom format function and other date-fns functions
export {
  fnsAddDays as addDays,
  fnsAddHours as addHours,
  fnsAddMonths as addMonths,
  fnsAddWeeks as addWeeks,
  fnsEachDayOfInterval as eachDayOfInterval,
  fnsEndOfDay as endOfDay,
  fnsEndOfMonth as endOfMonth,
  fnsEndOfWeek as endOfWeek,
  format, // Export our localized version
  fnsGetDay as getDay,
  fnsIsSameDay as isSameDay,
  fnsIsSameMonth as isSameMonth,
  fnsIsToday as isToday,
  fnsStartOfDay as startOfDay,
  fnsStartOfMonth as startOfMonth,
  fnsStartOfWeek as startOfWeek,
  fnsSubMonths as subMonths,
  fnsSubWeeks as subWeeks,
};


export const getDaysInMonth = (date: Date, weekStartsOnValue: 0 | 1 = 0): Date[][] => {
  const monthStart = fnsStartOfMonth(date);
  const monthEnd = fnsEndOfMonth(monthStart);
  const startDate = fnsStartOfWeek(monthStart, { weekStartsOn: weekStartsOnValue });
  const endDate = fnsEndOfWeek(monthEnd, { weekStartsOn: weekStartsOnValue });

  const days = fnsEachDayOfInterval({ start: startDate, end: endDate });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
};

export const getDaysInWeek = (date: Date, weekStartsOnValue: 0 | 1 = 0): Date[] => {
  const weekStart = fnsStartOfWeek(date, { weekStartsOn: weekStartsOnValue });
  return fnsEachDayOfInterval({ start: weekStart, end: fnsEndOfWeek(weekStart, { weekStartsOn: weekStartsOnValue }) });
};

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

export const getEventsForDate = (events: EventType[], date: Date): EventType[] => {
  return events.filter(event => fnsIsSameDay(event.startDate, date) || (event.startDate < date && event.endDate > date));
};

export const getEventsForSlot = (events: EventType[], date: Date, timeSlot: string, view: ViewOption): EventType[] => {
  const [hour, minute] = timeSlot.split(':').map(Number);
  const slotStartDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  const slotEndDateTime = fnsAddHours(slotStartDateTime, view === 'day' || view === 'week' ? 1 : 24) // Assume 1 hour slots for week/day

  return events.filter(event => {
    const eventStart = event.startDate;
    const eventEnd = event.endDate;
    // Check if event overlaps with the slot
    return (eventStart < slotEndDateTime && eventEnd > slotStartDateTime);
  });
};
