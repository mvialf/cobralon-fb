import React, { useState } from 'react';
import { 
  FilterX, 
  ChevronDown, 
  Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { commandFilter } from '@/utils/search-utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  id: string;
  name: string;
  options: FilterOption[];
}

interface TableFiltersProps {
  /**
   * Grupos de filtros disponibles
   */
  filterGroups: FilterGroup[];
  
  /**
   * Valores seleccionados actualmente para cada grupo de filtros
   * La clave es el ID del grupo y el valor es un array de valores seleccionados
   */
  selectedFilters: Record<string, string[]>;
  
  /**
   * Función que se llama cuando cambia un filtro
   * @param groupId - ID del grupo de filtros
   * @param selectedValues - Nuevos valores seleccionados para ese grupo
   */
  onFilterChange: (groupId: string, selectedValues: string[]) => void;
  
  /**
   * Función para limpiar todos los filtros
   */
  onClearFilters: () => void;
  
  /**
   * Clases CSS adicionales
   */
  className?: string;
}

/**
 * Componente de filtros avanzados para tablas
 * Permite seleccionar múltiples opciones por categoría de filtro
 */
const TableFilters: React.FC<TableFiltersProps> = ({
  filterGroups,
  selectedFilters,
  onFilterChange,
  onClearFilters,
  className,
}) => {
  // Estados para controlar qué popover está abierto
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // Contar el número total de filtros aplicados
  const totalAppliedFilters = Object.values(selectedFilters).reduce(
    (total, values) => total + values.length,
    0
  );
  
  // Verificar si hay algún filtro activo
  const hasActiveFilters = totalAppliedFilters > 0;
  
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filterGroups.map((group) => (
        <Popover 
          key={group.id} 
          open={openPopover === group.id}
          onOpenChange={(open) => setOpenPopover(open ? group.id : null)}
        >
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "border-dashed",
                selectedFilters[group.id]?.length ? "border-primary text-primary" : ""
              )}
            >
              {group.name}
              {selectedFilters[group.id]?.length > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1 text-xs">
                  {selectedFilters[group.id].length}
                </span>
              )}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command filter={commandFilter}>
              <CommandInput placeholder={`Buscar ${group.name}...`} />
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
              <CommandGroup>
                {group.options.map((option) => {
                  const isSelected = selectedFilters[group.id]?.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        const currentValues = selectedFilters[group.id] || [];
                        const newValues = isSelected
                          ? currentValues.filter(value => value !== option.value)
                          : [...currentValues, option.value];
                        
                        onFilterChange(group.id, newValues);
                      }}
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      ))}
      
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearFilters}
          className="h-8 px-2 lg:px-3"
        >
          <FilterX className="mr-2 h-4 w-4" />
          Limpiar filtros ({totalAppliedFilters})
        </Button>
      )}
    </div>
  );
};

export default TableFilters;
