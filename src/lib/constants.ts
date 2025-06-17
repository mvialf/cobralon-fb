
/**
 * ARCHIVO OBSOLETO
 * Las constantes y funciones de este archivo han sido migradas a módulos especializados
 * - Las constantes PROJECT_STATUS_OPTIONS y UNINSTALL_TYPE_OPTIONS se han migrado a src/constants/project.ts
 * - Las constantes PAYMENT_METHODS y PAYMENT_TYPES se han migrado a src/constants/payment.ts
 * - Las funciones getPaymentPercentageBadgeVariant y getStatusBadgeVariant se han migrado a src/utils/badge-helpers.ts
 */

// Re-exportaciones para mantener compatibilidad con código existente
export { PROJECT_STATUS_OPTIONS, UNINSTALL_TYPE_OPTIONS, type ProjectStatusConstant } from '@/constants/project';
export { PAYMENT_METHODS, PAYMENT_TYPES } from '@/constants/payment';

// Función migrada a utils/badge-helpers.ts
export { getPaymentPercentageBadgeVariant } from '@/utils/badge-helpers';

// Función migrada a utils/badge-helpers.ts
export { getStatusBadgeVariant } from '@/utils/badge-helpers';

