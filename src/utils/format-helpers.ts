/**
 * Funciones de ayuda para formatear diferentes tipos de datos
 */

import type { ProjectType } from '@/types/project';

/**
 * Formatea un número como moneda
 * @param amount - Cantidad a formatear
 * @param currency - Código de moneda (ej: 'CLP', 'USD')
 * @returns String formateado como moneda
 */
export function formatCurrency(amount: number | string | undefined | null, currency: string = 'CLP'): string {
  if (amount === undefined || amount === null) return 'N/A';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return 'N/A';
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericAmount);
}

/**
 * Formatea un número con separadores de miles y decimales personalizables
 * @param value - Valor numérico a formatear
 * @param decimalPlaces - Número de decimales a mostrar (por defecto: 0)
 * @param decimalSeparator - Separador decimal (por defecto: ',')
 * @param thousandSeparator - Separador de miles (por defecto: '.')
 * @returns String con el número formateado
 */
export function formatNumber(
  value: number | string,
  decimalPlaces: number = 0,
  decimalSeparator: string = ',',
  thousandSeparator: string = '.'
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return '';
  
  const parts = numericValue.toFixed(decimalPlaces).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
  return parts.join(decimalSeparator);
}

/**
 * Formatea una fecha en formato legible
 * @param date - Fecha a formatear (puede ser string, Date o timestamp)
 * @param locale - Configuración regional (por defecto: 'es-CL')
 * @returns String con la fecha formateada
 */
export function formatDate(
  date: string | Date | number,
  locale: string = 'es-CL'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Formatea un número como porcentaje
 * @param value - Valor a formatear (ej: 0.5 para 50%)
 * @param decimalPlaces - Número de decimales a mostrar (por defecto: 0)
 * @returns String con el porcentaje formateado
 */
export function formatPercentage(
  value: number | string,
  decimalPlaces: number = 0
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${(numericValue * 100).toFixed(decimalPlaces)}%`;
}

/**
 * Recorta un texto si excede una longitud máxima
 * @param text - Texto a recortar
 * @param maxLength - Longitud máxima permitida
 * @param ellipsis - Texto a agregar al final si se recorta (por defecto: '...')
 * @returns Texto recortado si es necesario
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + ellipsis;
}

/**
 * Formatea la visualización del nombre del cliente junto con información adicional
 * @param project - Objeto del proyecto que contiene la información del cliente
 * @returns String con el nombre del cliente y glosa si está disponible
 */
export function formatClientDisplay(project: Pick<ProjectType, 'clientName' | 'glosa'>): string {
  let display = project.clientName || 'Cliente no encontrado';
  if (project.glosa) {
    display += ` - ${project.glosa}`;
  }
  return display;
}