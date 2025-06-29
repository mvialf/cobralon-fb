// src/components/account-statement-dialog.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useProjectPayments } from '@/hooks/useProjectPayments';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CircleDollarSign, Wallet, FileText } from 'lucide-react';
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
  const contentRef = useRef<HTMLDivElement>(null);

  // Cargar los pagos cuando se abre el modal y hay un proyecto seleccionado
  useEffect(() => {
    const fetchPayments = async () => {
      if (isOpen && project) {
        try {
          const projectPayments = await getPaymentsForProject(project.id);
          setPayments(projectPayments);
        } catch (error) {
          console.error('Error al cargar los pagos:', error);
        }
      }
    };

    fetchPayments();
  }, [isOpen, project]);

  // Usar el hook personalizado para cálculos de pagos
  const { totalPaid, pendingBalance, paymentPercentage } = useProjectPayments(
    payments,
    project?.total || 0
  );

  // Función para copiar la imagen al portapapeles
  const handleCopy = async () => {
    if (!contentRef.current || !project) return;

    try {
      // Asegurarse de que las fuentes estén cargadas
      await document.fonts.ready;

      // Generar imagen del contenido con configuración mejorada
      const canvas = await snapdom.toCanvas(contentRef.current, {
        scale: 2, // Mayor escala para mejor calidad (2x)
        width: 450, // Ancho fijo para la captura
        background: '#ffffff', // Fondo blanco
        style: {
          width: '450px',
          margin: '0 auto',
        },
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

      alert('Imagen copiada al portapapeles con éxito');
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
        alert('No se pudo copiar la imagen. Se ha copiado la información como texto.');
      } catch (textError) {
        alert('No se pudo copiar al portapapeles. Por favor, inténtalo de nuevo.');
      }
    }
  };

  const circumference = 2 * Math.PI * 50; // Radio fijo de 50 para el círculo
  const strokeDashoffset = circumference - (paymentPercentage / 100) * circumference;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className='w-[450px] max-w-full bg-gray-200 overflow-hidden p-0'
        aria-describedby='dialog-description'
      >
        <div className='flex justify-between items-center px-4 py-2 bg-card'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleCopy}
            className='text-foreground hover:bg-accent'
            title='Copiar al portapapeles'
          >
            <Copy className='h-5 w-5' />
          </Button>
        </div>

        {/* desde este div se copia todo el contenido */}
        <div ref={contentRef} className='m-0 flex flex-col h-full bg-gray-200 text-gray-800'>
          <DialogHeader className='w-full flex flex-row px-6 py-4 border-b border-gray-300 items-center justify-between'>
            <DialogTitle className='text-xl font-bold whitespace-nowrap'>
              ESTADO DE CUENTA
            </DialogTitle>
            <div className='text-sm text-gray-700 font-medium text-right'>
              {formatDate(new Date(), 'dd/MM/yyyy', { locale: es })}
            </div>
          </DialogHeader>

          {project ? (
            <div className='p-4'>
              {/* Cabecera del proyecto */}
              <div className='w-full flex justify-between border-b border-gray-300 mb-4 px-2 pb-3'>
                <p className='w-full flex text-md font-medium  align-center'>
                  P - {project.projectNumber} - {clientName}
                </p>
              </div>

              <div className='flex gap-4'>
                <div className='w-2/3 bg-gray-100 shadow-md p-4 rounded-md flex flex-col'>
                  <div className='flex items-center gap-1'>
                    <CircleDollarSign className='h-6 w-6 text-blue-500' />
                    <p className='text-xl font-medium'>Saldo</p>
                  </div>
                  <div className='mt-auto'>
                    <div className='text-3xl font-semibold text-right'>
                      {formatCurrency(pendingBalance)}
                    </div>
                  </div>
                </div>

                {/* Gráfico circular */}
                <div className='w-1/3 bg-gray-100 shadow-md p-2 rounded-md flex items-center justify-center'>
                  <div className='relative w-24 h-24'>
                    <svg className='w-full h-full transform -rotate-90' viewBox='0 0 120 120'>
                      <circle
                        cx='60'
                        cy='60'
                        r='50'
                        fill='none'
                        stroke='currentColor'
                        className='text-gray-300'
                        strokeWidth='10'
                      />
                      <circle
                        cx='60'
                        cy='60'
                        r='50'
                        fill='none'
                        stroke='currentColor'
                        className='text-primary'
                        strokeWidth='10'
                        strokeLinecap='round'
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    <span className='absolute inset-0 flex items-center justify-center text-xl font-semibold text-gray-800'>
                      {paymentPercentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className='flex gap-4 py-4'>
                <div className='w-1/2 bg-gray-100 shadow-md p-4 rounded-md'>
                  <div className='flex items-center gap-1'>
                    <Wallet className='h-5 w-5 text-orange-500' />
                    <p className='text-lg font-medium'>Abonos</p>
                  </div>
                  <div className='text-2xl text-right font-semibold pt-4'>
                    {formatCurrency(totalPaid)}
                  </div>
                </div>

                <div className='w-1/2 bg-gray-100 shadow-md p-4 rounded-md'>
                  <div className='flex items-center gap-1'>
                    <FileText className='h-5 w-5 text-green-600' />
                    <p className='text-lg font-medium'>Proyecto</p>
                  </div>
                  <div className='text-2xl text-right font-semibold pt-4'>
                    {formatCurrency(project.total || 0)}
                  </div>
                </div>
              </div>

              <h3 className='text-lg font-bold pb-2'>Detalle de Abonos</h3>
              <div className='bg-blue-500 p-0 rounded-md text-gray-100'>
                <div className='overflow-hidden'>
                  <table className='w-full'>
                    <thead>
                      <tr>
                        <th className='py-2 px-4'>Abono</th>
                        <th className='py-2 px-4'>Valor</th>
                        <th className='py-2 px-4'>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length > 0 ? (
                        [...payments]
                          .sort((a, b) => {
                            // Ordenar por fecha (más antiguo primero)
                            const dateA = a.date ? new Date(a.date).getTime() : 0;
                            const dateB = b.date ? new Date(b.date).getTime() : 0;
                            return dateA - dateB;
                          })
                          .map((payment, index) => (
                            <tr key={payment.id} className='bg-blue-50 shadow-sm gap-2 text-gray-700'>
                            <td className='text-sm py-2 px-4 text-center'>
                              {index + 1}
                            </td>
                            <td className='text-sm py-2 px-4 text-right'>
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className='text-sm py-2 px-4 text-center'>
                              {payment.date
                                ? formatDate(payment.date, 'dd/MM/yyyy', { locale: es })
                                : 'N/A'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className='bg-gray-100 py-4 text-center text-gray-700'>
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
            <div className='p-6 flex flex-col items-center justify-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4' />
              <p className='text-gray-700'>Cargando información del proyecto...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
