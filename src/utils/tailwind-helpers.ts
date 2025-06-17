// src/utils/tailwind-helpers.ts
// Funciones de utilidad para la gestión de clases CSS con Tailwind

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Función de utilidad para combinar clases CSS de Tailwind
 * Evita conflictos y mantiene la especificidad correcta
 * @param inputs Array de clases CSS o expresiones condicionales
 * @returns String con todas las clases combinadas y optimizadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
