import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { NumericFormat, NumericFormatProps } from "react-number-format";

type InputProps = React.ComponentProps<typeof Input>;

export interface MoneyInputProps
  extends Omit<InputProps, 'onChange' | 'value' | 'defaultValue' | 'type'> {
  /**
   * Prefijo que se muestra antes del valor (por defecto: "$ ")
   */
  prefix?: string;
  /**
   * Separador de miles (por defecto: ".")
   */
  groupSeparator?: string;
  /**
   * Separador decimal (por defecto: ",")
   */
  decimalSeparator?: string;
  /**
   * Cantidad de decimales a mostrar (por defecto: 2)
   */
  decimalScale?: number;
  /**
   * Valor actual del input (opcional, para controlar el componente)
   */
  value?: number | null;
  /**
   * Valor por defecto (para componentes no controlados)
   */
  defaultValue?: number | null;
  /**
   * Callback que se ejecuta cuando el valor cambia
   * @param value - Valor numérico (o undefined si está vacío)
   */
  onValueChange?: (value: number | undefined) => void;
  /**
   * Si es true, permite valores negativos (por defecto: false)
   */
  allowNegative?: boolean;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      className,
      prefix = "$ ",
      groupSeparator = ".",
      decimalSeparator = ",",
      decimalScale =0,
      onValueChange,
      value,
      defaultValue,
      allowNegative = false,
      ...props
    },
    ref
  ) => {
    const handleValueChange: NumericFormatProps["onValueChange"] = (values) => {
      const { floatValue } = values;
      onValueChange?.(floatValue);
    };

    // Extraemos type de las props para evitar conflictos de manera segura
    const { type: _, ...restProps } = props as { type?: string };
    return (
      <NumericFormat
        customInput={Input}
        getInputRef={ref}
        className={cn("pl-8 text-right", className)}
        thousandSeparator={groupSeparator}
        decimalSeparator={decimalSeparator}
        decimalScale={decimalScale}
        fixedDecimalScale={true}
        allowNegative={allowNegative}
        prefix={prefix}
        onValueChange={handleValueChange}
        value={value ?? undefined}
        defaultValue={defaultValue ?? undefined}
        type="text" // Forzamos el tipo a "text" para evitar conflictos
        {...restProps}
      />
    );
  }
);

MoneyInput.displayName = "MoneyInput";

export { MoneyInput };

// Ejemplo de uso:
// <MoneyInput 
//   value={amount} 
//   onValueChange={(value) => setAmount(value)} 
//   placeholder="Ingrese el monto"
//   className="w-full"
// />
