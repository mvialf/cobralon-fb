'use client';

import { Badge } from '@/components/ui/badge';
import { getPaymentPercentageBadgeVariant } from '@/utils/badge-helpers';
import { formatCurrency } from '@/utils/format-helpers';
import { cn } from '@/lib/utils';
import type { ProjectType } from '@/types/project';

interface ProjectBalanceDisplayProps {
  project: Pick<ProjectType, 'total' | 'balance'> & {
    totalPaymentPercentage?: number;
  };
  className?: string;
}

/**
 * Muestra el balance, monto total y porcentaje de pago de un proyecto
 * con un indicador visual del porcentaje completado
 */
export function ProjectBalanceDisplay({ project, className = '' }: ProjectBalanceDisplayProps) {
  const { total = 0, balance = 0, totalPaymentPercentage = 0 } = project;

  // Calcular el monto pagado
  const paidAmount = total - Math.max(0, balance);

  return (
    <div className={cn('flex flex-row justify-end items-center gap-1', className)}>
      <div className='flex flex-col justify-end text-right items-center space-y-1'>
        <div className='text-sm justify-end text-right font-medium'>
          {formatCurrency(paidAmount)}
        </div>
        <div className='text-xs justify-end text-right text-muted-foreground'>
          {formatCurrency(Math.max(0, balance))}
        </div>
      </div>
      <Badge variant={getPaymentPercentageBadgeVariant(totalPaymentPercentage)}>
        {Math.round(totalPaymentPercentage)}%
      </Badge>
    </div>
  );
}
