// src/components/account-statement-dialog.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from 'lucide-react';
import { getPaymentsForProject } from '@/services/paymentService';
import type { Payment } from '@/types/payment';
import type { ProjectType } from '@/types/project';
import { format as formatDate } from '@/lib/calendar-utils';
import { es } from 'date-fns/locale';
import { snapdom } from '@zumer/snapdom';

// Helper para formatear moneda (Pesos chilenos)
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

interface AccountStatementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectType | null;
  clientName?: string;
}

export default function AccountStatementDialog({
  isOpen,
  onClose,
  project,
  clientName = 'Cliente no disponible',
}: AccountStatementDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Cargar los pagos cuando se abre el modal y hay un proyecto seleccionado
  useEffect(() => {
    const fetchPayments = async () => {
      if (isOpen && project) {
        setIsLoading(true);
        try {
          const projectPayments = await getPaymentsForProject(project.id);
          setPayments(projectPayments);
        } catch (error) {
          console.error("Error al cargar los pagos:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchPayments();
  }, [isOpen, project]);

  // Calcular el total pagado
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  // Calcular el saldo pendiente
  const pendingBalance = project ? (project.total || 0) - totalPaid : 0;
  
  // Calcular el porcentaje de pago
  const paymentPercentage = project && (project.total || 0) > 0 
    ? Math.min(100, Math.round((totalPaid / (project.total || 0)) * 100))
    : 0;
  
  // Función para copiar la imagen al portapapeles
  const handleCopy = async () => {
    if (!contentRef.current || !project) return;
    
    try {
      // Generar imagen del contenido usando snapdom.toCanvas y luego canvas.toBlob para asegurar PNG
      const canvas = await snapdom.toCanvas(contentRef.current, {
        scale: 2, // Mayor escala para mejor calidad (2x)
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0); // 1.0 es la calidad para PNG
      });

      if (!blob) {
        throw new Error('No se pudo convertir el canvas a Blob PNG.');
      }
      
      // Crear un objeto ClipboardItem con la imagen PNG
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      
      // Copiar al portapapeles
      await navigator.clipboard.write([clipboardItem]);
      
      alert("Imagen copiada al portapapeles con éxito");
    } catch (error) {
      console.error('Error al copiar la imagen:', error);
      
      // Plan B: copiar como texto si falla la imagen
      const textToCopy = `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${clientName}
Fecha: ${project.date ? formatDate(project.date, 'P', { locale: es }) : 'N/A'}
Valor Total: ${formatCurrency(project.total)}
Abonos: ${formatCurrency(totalPaid)}
Saldo Pendiente: ${formatCurrency(pendingBalance)}
`;
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        alert("No se pudo copiar la imagen. Se ha copiado la información como texto.");
      } catch (textError) {
        alert("No se pudo copiar al portapapeles. Por favor, inténtalo de nuevo.");
      }
    }
  };

  // Calcular el circunferencia del círculo
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (paymentPercentage / 100) * circumference;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-max [400px] bg-background overflow-hidden p-0"
        aria-describedby="dialog-description"
      >
        <div className="flex justify-between items-center px-4 py-2 bg-card">
          <Button variant="ghost" size="icon" onClick={handleCopy} className="text-foreground hover:bg-accent" title="Copiar al portapapeles">
            <Copy className="h-5 w-5" />
          </Button>
        </div>  

        {/* desde este div se copia todo el contenido */}  
        <div ref={contentRef} className="flex flex-col h-full">
          <DialogHeader className="w-full flex flex-row bg-background px-6 py-4 border-b border-border items-center justify-between">
            <DialogTitle className="text-xl font-bold">ESTADO DE CUENTA</DialogTitle>
            <div className="text-md text-muted-foreground font-medium text-right">
                {project?.date ? formatDate(project.date, 'dd/MM/yyyy', { locale: es }) : 'N/A'}
            </div>
          </DialogHeader>
        
        {project ? (
          <div className="p-3">
            {/* Cabecera del proyecto */}
            <div className="flex justify-between gap-2 mb-6 mx-2">
              <div className="text-lg font-medium">
               <p>P - {project.projectNumber}</p> 
               <p className="text-md text-muted-foreground">{clientName}</p>
              </div>
            </div>
                        
            <div className="flex gap-4">
              {/* Saldo grande */}
              <div className="w-2/3 bg-card p-4 rounded-md flex flex-col">
                <div className="text-lg font-medium mb-2">Saldo</div>
                <div className="mt-auto">
                  <div className="text-2xl font-bold text-right">{formatCurrency(pendingBalance)}</div>
                </div>
              </div>
              
              {/* Gráfico circular */}
              <div className="w-1/3 bg-card p-2 rounded-md flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Círculo de fondo */}
                    <circle  
                      cx="60" 
                      cy="60" 
                      r="50" 
                      fill="none" 
                      stroke="currentColor" 
                      className="text-muted" 
                      strokeWidth="10"
                    />
                    {/* Círculo de progreso */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      className="text-primary"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary">
                    {paymentPercentage}%
                  </span>
                </div>
              </div>
            </div>
            
            
            <div className="flex gap-4 py-4">
                         
              <div className="w-1/2 bg-card p-4 rounded-md">
                <div className="text-sm text-left mb-1">Abonos</div>
                <div className="text-xl text-right font-semibold pt-4">{formatCurrency(totalPaid)}</div>
              </div>
              
              <div className="w-1/2 bg-card p-4 rounded-md">
                <div className="text-sm text-left mb-1">Proyecto</div>
                <div className="text-xl text-right font-semibold pt-4">{formatCurrency(project.total || 0)}</div>
              </div>
            </div>
            
            {/* Detalle de abonos */}
            <h3 className="text-lg font-bold pb-2">Detalle de Abonos</h3>
            <div className="bg-card p-0 rounded-md">
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 px-4">Abono</th>
                      <th className="py-2 px-4">Valor</th>
                      <th className="py-2 px-4 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length > 0 ? (
                      payments.map((payment) => (
                        <tr key={payment.id} className="border-t border-border bg-secondary gap-2">
                          <td className="text-sm py-2 px-4">{payment.paymentMethod || 'transferencia'}</td>
                          <td className="text-sm py-2 px-4">{formatCurrency(payment.amount)}</td>
                          <td className="text-sm py-2 px-4 text-right">
                            {payment.date ? formatDate(payment.date, 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">
                          No hay pagos registrados para este proyecto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Cargando información del proyecto...</p>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
  );
}
