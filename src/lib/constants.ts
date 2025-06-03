
// src/lib/constants.ts

export const UNINSTALL_TYPE_OPTIONS = ["Aluminio", "Madera", "Fierro", "PVC", "Americano"];

export const PROJECT_STATUS_OPTIONS = [
  'ingresado',
  'en progreso',
  'completado',
  'cancelado',
  'pendiente aprobación',
  // Los siguientes estados se manejan en getStatusBadgeVariant y podrían añadirse aquí si son seleccionables en formularios.
  // 'Complicación', 'Sello', 'Continuación', 'Montaje', 'Programar', 'Fabricación'
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
  if (percentage >= 60 && percentage < 61) return 'primary'; // Note: 'primary' not 'prymary'
  if (percentage >= 50 && percentage < 60) return 'brown';
  if (percentage >= 1 && percentage < 50) return 'orange';
  return 'destructive';
};

export const getStatusBadgeVariant = (status: string | undefined): 'sky' | 'complete' | 'orange' | 'brown' | 'primary' | 'yellow' | 'default' | 'secondary' | 'destructive' | 'outline' => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case 'completado': return 'complete';
      case 'complicación': return 'destructive';
      case 'sello': return 'sky';
      case 'continuación': return 'brown';
      case 'montaje': return 'orange';
      case 'programar': return 'primary'; // Corrected from 'Prymary'
      case 'fabricación': return 'yellow';
      // From existing PROJECT_STATUS_OPTIONS
      case 'ingresado': return 'secondary';
      case 'en progreso': return 'outline';
      case 'cancelado': return 'destructive';
      case 'pendiente aprobación': return 'primary'; // Consider if a different color is needed than 'programar'
      default:
        return 'outline'; // Fallback for any other status not explicitly handled
    }
};
