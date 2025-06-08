
// src/lib/constants.ts

export const UNINSTALL_TYPE_OPTIONS = ["Aluminio", "Madera", "Fierro", "PVC", "Americano"];

export const PROJECT_STATUS_OPTIONS = [
  'ingresado',
  'programar',
  'fabricación',
  'montaje',
  'sello',
  'continuación',
  'complicación',
  'completado',
] as const;

export type ProjectStatusConstant = typeof PROJECT_STATUS_OPTIONS[number];

export const PAYMENT_METHODS = ['transferencia', 'tarjeta de crédito', 'cheque', 'tarjeta de débito', 'efectivo'] as const;
export const PAYMENT_TYPES = [
  'proyecto',
  'cliente',
] as const;

export const getPaymentPercentageBadgeVariant = (percentage: number): "complete" | "orange" | "brown" | "primary" | "destructive" => {
  if (percentage >= 100) return 'complete';
  if (percentage >= 61 && percentage < 100) return 'orange';
  if (percentage >= 60 && percentage < 61) return 'primary';
  if (percentage >= 50 && percentage < 60) return 'brown';
  if (percentage >= 1 && percentage < 50) return 'orange';
  return 'destructive';
};

export const getStatusBadgeVariant = (status: string | undefined): 'sky' | 'complete' | 'orange' | 'brown' | 'primary' | 'yellow' | 'default' | 'accent' | 'destructive' | 'outline' => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case 'completado': return 'complete';
      case 'complicación': return 'destructive';
      case 'sello': return 'sky';
      case 'continuación': return 'brown';
      case 'montaje': return 'orange';
      case 'programar': return 'primary';
      case 'fabricación': return 'yellow';
      case 'ingresado': return 'accent';
      default:
        return 'accent'; 
    }
};

