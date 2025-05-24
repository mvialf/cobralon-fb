import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { EventType, ViewOption } from '@/types/event';

export const getDaysInMonth = (date: Date, weekStartsOn: 0 | 1 = 0): Date[][] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
};

export const getDaysInWeek = (date: Date, weekStartsOn: 0 | 1 = 0): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn });
  return eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn }) });
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
  return events.filter(event => isSameDay(event.startDate, date) || (event.startDate < date && event.endDate > date));
};

export const getEventsForSlot = (events: EventType[], date: Date, timeSlot: string, view: ViewOption): EventType[] => {
  const [hour, minute] = timeSlot.split(':').map(Number);
  const slotStartDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  const slotEndDateTime = addHours(slotStartDateTime, view === 'day' || view === 'week' ? 1 : 24) // Assume 1 hour slots for week/day

  return events.filter(event => {
    const eventStart = event.startDate;
    const eventEnd = event.endDate;
    // Check if event overlaps with the slot
    return (eventStart < slotEndDateTime && eventEnd > slotStartDateTime);
  });
};


export {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  eachDayOfInterval,
  addHours,
};
