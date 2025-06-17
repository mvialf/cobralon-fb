// src/utils/badge-helpers.ts
// Funciones de utilidad para generar variantes de estilos de badges

/**
 * Determina la variante visual de un badge basado en el porcentaje de pago
 * @param percentage Porcentaje completado del pago
 * @returns Variante de estilo del badge
 */
export const getPaymentPercentageBadgeVariant = (percentage: number): "complete" | "orange" | "brown" | "primary" | "destructive" => {
  if (percentage >= 100) return 'complete';
  if (percentage >= 61 && percentage < 100) return 'orange';
  if (percentage >= 60 && percentage < 61) return 'primary';
  if (percentage >= 50 && percentage < 60) return 'brown';
  if (percentage >= 1 && percentage < 50) return 'orange';
  return 'destructive';
};

/**
 * Determina la variante visual de un badge basado en el estado del proyecto
 * @param status Estado del proyecto
 * @returns Variante de estilo del badge
 */
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
