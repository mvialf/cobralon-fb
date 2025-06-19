import React from 'react';
import { cn } from '@/lib/utils';

export interface TaxRateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | string;
  onChange?: (value: number | '') => void;
  suffix?: string;
}

const TaxRateInput = React.forwardRef<HTMLInputElement, TaxRateInputProps>(
  ({ className, value, onChange, suffix, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(
      value !== undefined && value !== '' ? String(value).replace('.', ',') : ''
    );

    React.useEffect(() => {
      // Actualizar el valor mostrado cuando cambia el valor desde fuera
      if (value === '' || value === undefined) {
        setDisplayValue('');
      } else if (value !== parseFloat(displayValue.replace(',', '.'))) {
        setDisplayValue(String(value).replace('.', ','));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Permitir borrar completamente el valor
      if (rawValue === '') {
        setDisplayValue('');
        onChange?.('');
        return;
      }

      // Validar el formato del número (solo un separador decimal, máximo 2 decimales)
      const isValid = /^\d*[,.]?\d{0,2}$/.test(rawValue);
      if (!isValid) return;

      // Actualizar el valor mostrado
      setDisplayValue(rawValue);

      // Convertir a número y notificar el cambio
      const normalizedValue = rawValue.replace(',', '.');
      const numValue = parseFloat(normalizedValue);
      
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        onChange?.(numValue);
      } else if (rawValue === '') {
        onChange?.('');
      }
    };

    const handleBlur = () => {
      // Formatear el valor al salir del campo
      if (displayValue && displayValue.includes(',')) {
        const [integer, decimal] = displayValue.split(',');
        const formattedValue = `${integer},${(decimal || '').padEnd(2, '0').substring(0, 2)}`;
        setDisplayValue(formattedValue);
      } else if (displayValue) {
        setDisplayValue(displayValue);
      }
    };

    return (
      <div className={cn(
        "flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        props.disabled && "opacity-50"
      )}>
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "h-10 w-full bg-transparent py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            suffix ? 'pl-3 pr-1' : 'px-3',
            className
          )}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          ref={ref}
          {...props}
        />
        {suffix && (
          <span className="px-3 py-2 text-muted-foreground">{suffix}</span>
        )}
      </div>
    );
  }
);

TaxRateInput.displayName = 'TaxRateInput';

export { TaxRateInput };
