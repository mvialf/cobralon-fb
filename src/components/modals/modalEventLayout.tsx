"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ModalEventLayoutProps {
  /**
   * Indica si la modal está abierta o cerrada
   */
  isOpen: boolean;
  /**
   * Título que se mostrará en la cabecera de la modal
   */
  title: string;
  /**
   * Contenido que se renderizará en el cuerpo de la modal
   */
  children: React.ReactNode;
  /**
   * Función que se ejecutará al cerrar la modal
   */
  onClose: () => void;
  /**
   * Función que se ejecutará al hacer clic en el botón 'Crear'
   */
  onSubmit: () => void;
  /**
   * Indica si la acción de guardar está en curso
   */
  isSubmitting?: boolean;
  /**
   * Texto personalizado para el botón de acción principal (por defecto: 'Crear')
   */
  submitButtonText?: string;
  /**
   * Clase CSS adicional para el contenedor principal
   */
  className?: string;
  /**
   * Deshabilitar el botón de guardar
   */
  disabled?: boolean;
}

/**
 * Componente de ventana modal base para todos los eventos.
 * Proporciona una estructura consistente con cabecera, cuerpo scrollable y pie con botones de acción.
 * Implementa Dialog de shadcn/ui para el comportamiento modal completo.
 */
export function ModalEventLayout({
  isOpen,
  title,
  children,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Crear",
  className,
  disabled = false,
}: ModalEventLayoutProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("p-0 gap-0 sm:max-w-md md:max-w-lg lg:max-w-xl", className)}>
        <DialogHeader className="bg-background p-6 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {/* Contenido con scroll */}
        <div className="bg-card max-h-[60vh] overflow-y-auto px-6 py-4">
          {children}
        </div>
        
        <DialogFooter className="flex justify-end space-x-2 pt-4 border-t p-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={disabled || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}