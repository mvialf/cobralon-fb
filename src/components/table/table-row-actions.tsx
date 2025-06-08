import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface ActionItem {
  /**
   * Etiqueta para mostrar en el menú
   */
  label: string;
  
  /**
   * Función a ejecutar cuando se selecciona esta acción
   */
  onClick: () => void;
  
  /**
   * Componente de ícono opcional (Lucide icon)
   */
  icon?: React.ElementType;
  
  /**
   * Si es true, la acción aparece en rojo como destructiva
   */
  isDestructive?: boolean;
  
  /**
   * Si es true, la acción estará deshabilitada
   */
  disabled?: boolean;
}

interface ActionGroup {
  /**
   * Acciones a mostrar antes del separador
   */
  primary?: ActionItem[];
  
  /**
   * Acciones a mostrar después del separador (normalmente destructivas)
   */
  destructive?: ActionItem[];
}

interface TableRowActionsProps {
  /**
   * Acciones a mostrar en el menú desplegable
   */
  actions: ActionGroup;
  
  /**
   * Muestra el botón en estado de carga
   */
  isLoading?: boolean;
  
  /**
   * Texto para el botón en estado de carga
   */
  loadingText?: string;
  
  /**
   * Clases CSS adicionales para el botón de acciones
   */
  className?: string;
}

/**
 * Componente para mostrar un menú de acciones en filas de tabla
 * Agrupa las acciones en primarias y destructivas con un separador entre ellas
 */
const TableRowActions: React.FC<TableRowActionsProps> = ({
  actions,
  isLoading = false,
  loadingText = "Procesando...",
  className,
}) => {
  const hasPrimaryActions = actions.primary && actions.primary.length > 0;
  const hasDestructiveActions = actions.destructive && actions.destructive.length > 0;
  
  // Si no hay acciones, no renderizar el componente
  if (!hasPrimaryActions && !hasDestructiveActions) {
    return null;
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={className}
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú de acciones</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        {isLoading ? (
          <DropdownMenuItem disabled>{loadingText}</DropdownMenuItem>
        ) : (
          <>
            {/* Acciones primarias */}
            {hasPrimaryActions && actions.primary!.map((action, index) => (
              <DropdownMenuItem
                key={`primary-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  action.onClick();
                }}
                disabled={action.disabled}
                className="flex items-center"
              >
                {action.icon && (
                  <action.icon className="mr-2 h-4 w-4" />
                )}
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
            
            {/* Separador si hay ambos tipos de acciones */}
            {hasPrimaryActions && hasDestructiveActions && (
              <DropdownMenuSeparator />
            )}
            
            {/* Acciones destructivas */}
            {hasDestructiveActions && actions.destructive!.map((action, index) => (
              <DropdownMenuItem
                key={`destructive-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  action.onClick();
                }}
                disabled={action.disabled}
                className="flex items-center text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                {action.icon && (
                  <action.icon className="mr-2 h-4 w-4" />
                )}
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TableRowActions;
