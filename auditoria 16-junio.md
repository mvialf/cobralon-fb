# Auditoría de Estructura de Proyecto - 16 de Junio, 2025

## Introducción

Este documento presenta los resultados de una auditoría completa de la base de código con respecto a la estructura arquitectónica establecida para funciones y constantes en el proyecto. El objetivo es identificar elementos que no cumplen con la regla de arquitectura y proponer una reestructuración adecuada.

## 1. Funciones a Reestructurar

### Funciones de Utilidad en Componentes

| Nombre de la Función | Ubicación Actual | Ubicación Sugerida | Justificación Breve |
|----------------------|------------------|-------------------|---------------------|
| `formatDateForInput` | `src/components/payment-modal.tsx` (Línea: 31) | `src/utils/date-helpers.ts` | Función de utilidad para formateo de fechas reutilizable |
| `getPaymentPercentageBadgeVariant` | `src/lib/constants.ts` (Línea: 25) | `src/utils/badge-helpers.ts` | Función de utilidad para estilos de badges, no es constante |
| `getStatusBadgeVariant` | `src/lib/constants.ts` (Línea: 34) | `src/utils/badge-helpers.ts` | Función de utilidad para estilos de badges, no es constante |
| `cn` | `src/lib/utils.ts` (Línea: 4) | `src/utils/tailwind-helpers.ts` | Función de utilidad para manejo de clases CSS |
| `format` | `src/lib/calendar-utils.ts` (Línea: 24) | `src/utils/date-helpers.ts` | Función de utilidad para formateo de fechas con localización |

### Funciones de Calendario

Las siguientes funciones relacionadas con el calendario deberían moverse a una ubicación dedicada para utilidades de calendario:

| Nombre de la Función | Ubicación Actual | Ubicación Sugerida | Justificación Breve |
|----------------------|------------------|-------------------|---------------------|
| `getDaysInMonth` | `src/lib/calendar-utils.ts` (Línea: 56) | `src/utils/calendar-helpers.ts` | Lógica de ayuda para calendario |
| `getDaysInWeek` | `src/lib/calendar-utils.ts` (Línea: 70) | `src/utils/calendar-helpers.ts` | Lógica de ayuda para calendario |
| `getTimeSlots` | `src/lib/calendar-utils.ts` (Línea: 75) | `src/utils/calendar-helpers.ts` | Lógica de ayuda para calendario |
| `getEventsForDate` | `src/lib/calendar-utils.ts` (Línea: 87) | `src/utils/calendar-helpers.ts` | Lógica de ayuda para filtrado de eventos |
| `getEventsForSlot` | `src/lib/calendar-utils.ts` (Línea: 91) | `src/utils/calendar-helpers.ts` | Lógica de ayuda para filtrado de eventos |

## 2. Constantes a Reestructurar

### Constantes Duplicadas y Mal Ubicadas

| Nombre/Valor de la Constante | Ubicación Actual | Fichero de Destino Sugerido | Justificación Breve |
|------------------------------|------------------|----------------------------|---------------------|
| `POSSIBLE_PAYMENT_METHODS` | `src/types/payment.ts` (Línea: 4) | `src/constants/payment.ts` | Constante de dominio para métodos de pago |
| `POSSIBLE_PAYMENT_TYPES` | `src/types/payment.ts` (Línea: 9) | `src/constants/payment.ts` | Constante de dominio para tipos de pago |
| `PAYMENT_METHODS` | `src/lib/constants.ts` (Línea: 18) | `src/constants/payment.ts` | Constante duplicada con POSSIBLE_PAYMENT_METHODS |
| `PAYMENT_TYPES` | `src/lib/constants.ts` (Línea: 19) | `src/constants/payment.ts` | Constante duplicada con POSSIBLE_PAYMENT_TYPES |
| `PROJECT_STATUS_OPTIONS` | `src/lib/constants.ts` (Línea: 6) | `src/constants/project.ts` | Constante de dominio para estados de proyecto |
| `UNINSTALL_TYPE_OPTIONS` | `src/lib/constants.ts` (Línea: 4) | `src/constants/project.ts` | Constante de dominio para tipos de desinstalación |

## 3. Exportaciones y Re-exportaciones

En varios archivos se han detectado exportaciones que podrían organizarse mejor:

| Problema | Ubicación Actual | Recomendación |
|----------|------------------|--------------|
| Re-exportación de funciones de date-fns | `src/lib/calendar-utils.ts` (Línea: 32) | Mover a `src/utils/date-helpers.ts` y exportar desde allí |

## 4. Resumen y Plan de Acción

### Resumen Cuantitativo
- **Total de Funciones a Reubicar:** 10
- **Total de Constantes a Reubicar:** 6

### Prioridades de Refactorización

1. **Alta Prioridad:**
   - Unificar las constantes duplicadas de pagos (`PAYMENT_METHODS`/`POSSIBLE_PAYMENT_METHODS` y `PAYMENT_TYPES`/`POSSIBLE_PAYMENT_TYPES`) en `src/constants/payment.ts`
   - Crear directorios básicos de utilidades: `src/utils/` y `src/constants/`

2. **Media Prioridad:**
   - Mover funciones de utilidad genéricas (`cn`, `formatDateForInput`) a `src/utils/`
   - Mover constantes relacionadas con proyectos a `src/constants/project.ts`

3. **Baja Prioridad:**
   - Refactorizar las utilidades de calendario para usar las nuevas ubicaciones
   - Actualizar referencias e importaciones en todo el proyecto

### Plan de Implementación

1. **Fase 1: Establecimiento de Estructura**
   - Crear directorios para constantes y utilidades
   - Establecer archivos base para constantes comunes

2. **Fase 2: Migración de Constantes**
   - Consolidar constantes duplicadas
   - Mover constantes a sus archivos apropiados

3. **Fase 3: Migración de Funciones**
   - Mover funciones de utilidad a archivos dedicados
   - Actualizar importaciones

4. **Fase 4: Pruebas y Validación**
   - Validar que la aplicación sigue funcionando correctamente
   - Revisar y corregir posibles problemas tras la refactorización

Este plan de refactorización ayudará a mejorar la organización del código, reducir duplicación y facilitar el mantenimiento a largo plazo.
