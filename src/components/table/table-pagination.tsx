import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  /**
   * Número total de elementos
   */
  totalItems: number;
  
  /**
   * Número actual de elementos por página
   */
  pageSize: number;
  
  /**
   * Opciones disponibles para el número de elementos por página
   */
  pageSizeOptions?: number[];
  
  /**
   * Página actual (comenzando desde 1)
   */
  currentPage: number;
  
  /**
   * Función a llamar cuando cambia la página
   */
  onPageChange: (page: number) => void;
  
  /**
   * Función a llamar cuando cambia el tamaño de página
   */
  onPageSizeChange?: (pageSize: number) => void;
  
  /**
   * Clases CSS adicionales
   */
  className?: string;
}

/**
 * Componente de paginación para tablas
 * Muestra controles para navegar entre páginas y cambiar el número de elementos por página
 */
const TablePagination: React.FC<TablePaginationProps> = ({
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50],
  currentPage,
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  // Calcular número total de páginas
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Calcular rango de elementos mostrados
  const rangeStart = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
  const rangeEnd = Math.min(totalItems, currentPage * pageSize);
  
  // Determinar si hay páginas anterior o siguiente
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  
  // Ir a la página anterior
  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      onPageChange(currentPage - 1);
    }
  };
  
  // Ir a la página siguiente
  const goToNextPage = () => {
    if (hasNextPage) {
      onPageChange(currentPage + 1);
    }
  };
  
  // Función para mostrar un rango de páginas alrededor de la página actual
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };
  
  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 py-4", className)}>
      <div className="text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <>Mostrando <span className="font-medium">{rangeStart}</span> - <span className="font-medium">{rangeEnd}</span> de <span className="font-medium">{totalItems}</span> elementos</>
        ) : (
          <>No hay elementos para mostrar</>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Selector de tamaño de página */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue>{pageSize}</SelectValue>
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Controles de paginación */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousPage}
            disabled={!hasPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Página anterior</span>
          </Button>
          
          {getPageNumbers().map(page => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="hidden sm:inline-flex h-8 w-8"
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextPage}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Página siguiente</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
