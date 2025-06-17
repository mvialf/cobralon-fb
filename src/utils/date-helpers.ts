// src/utils/date-helpers.ts
// Funciones de utilidad para el manejo y formateo de fechas

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
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Función de formateo de fechas que utiliza por defecto el locale español
 * @param date Fecha a formatear
 * @param formatString Cadena de formato
 * @param options Opciones adicionales de formateo
 * @returns Cadena formateada
 */
export const format = (
  date: Date | number | string,
  formatString: string,
  options?: Omit<Parameters<typeof fnsFormat>[2], 'locale'>
): string => {
  return fnsFormat(date, formatString, { ...options, locale: es });
};

/**
 * Formatea una fecha para uso en campos de tipo input[date]
 * @param date Fecha a formatear
 * @returns Cadena en formato YYYY-MM-DD
 */
export const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

// Re-exportación de funciones de date-fns con alias más descriptivos
export {
  fnsAddDays as addDays,
  fnsAddHours as addHours,
  fnsAddMonths as addMonths,
  fnsAddWeeks as addWeeks,
  fnsEachDayOfInterval as eachDayOfInterval,
  fnsEndOfDay as endOfDay,
  fnsEndOfMonth as endOfMonth,
  fnsEndOfWeek as endOfWeek,
  fnsGetDay as getDay,
  fnsIsSameDay as isSameDay,
  fnsIsSameMonth as isSameMonth,
  fnsIsToday as isToday,
  fnsStartOfDay as startOfDay,
  fnsStartOfMonth as startOfMonth,
  fnsStartOfWeek as startOfWeek,
  fnsSubMonths as subMonths,
  fnsSubWeeks as subWeeks,
  parseISO,
};
