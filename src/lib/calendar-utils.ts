/**
 * ARCHIVO OBSOLETO
 * Las funciones de este archivo han sido migradas a módulos especializados en la carpeta src/utils/
 * - Las funciones de fecha han sido migradas a src/utils/date-helpers.ts
 * - Las funciones de calendario han sido migradas a src/utils/calendar-helpers.ts
 */

import type { EventType, ViewOption } from '@/types/event';

// Re-exportación de las funciones migradas para mantener compatibilidad con código existente
export * from '@/utils/date-helpers';


// Re-exportación de las funciones de calendario migradas para mantener compatibilidad
export * from '@/utils/calendar-helpers';
