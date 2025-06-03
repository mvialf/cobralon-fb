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

export const getPaymentPercentageBadgeVariant = (percentage: number): "complete" | "orange" | "brown" | "primary" | "destructive" => {
  if (percentage >= 100) return 'complete';
  if (percentage >= 61 && percentage < 100) return 'orange';
  if (percentage >= 60 && percentage < 61) return 'primary';
  if (percentage >= 50 && percentage < 60) return 'brown';
  if (percentage >= 1 && percentage < 50) return 'orange';
  return 'destructive'; // For 0% or less than 1%
};
