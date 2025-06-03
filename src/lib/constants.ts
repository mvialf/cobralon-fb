// src/lib/constants.ts

export const UNINSTALL_TYPE_OPTIONS = ["Aluminio", "Madera", "Fierro", "PVC", "Americano"];

export const PROJECT_STATUS_OPTIONS = [
  'ingresado',
  'en progreso',
  'completado',
  'cancelado',
  'pendiente aprobación',
] as const;
export const PAYMENT_METHODS = ['transferencia', 'tarjeta de crédito', 'cheque', 'tarjeta de débito', 'efectivo', 'otro'] as const;
export const PAYMENT_TYPES = [
  'proyecto',
  'cliente',
  'otro'
] as const;
