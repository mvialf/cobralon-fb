import { Payment } from '@/types/payment';

/**
 * Hook personalizado para manejar los cálculos relacionados con pagos de proyectos
 * @param payments - Array de pagos del proyecto
 * @param projectTotal - Monto total del proyecto
 * @returns Objeto con total pagado, saldo pendiente y porcentaje de pago
 */
export const useProjectPayments = (payments: Payment[] = [], projectTotal: number = 0) => {
  // Calcular el total pagado
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  // Calcular el saldo pendiente (no puede ser negativo)
  const pendingBalance = Math.max(0, projectTotal - totalPaid);

  // Calcular el porcentaje de pago (máximo 100%)
  const paymentPercentage = projectTotal > 0 
    ? Math.min(100, Math.round((totalPaid / projectTotal) * 100))
    : 0;

  return {
    totalPaid,
    pendingBalance,
    paymentPercentage
  };
};
