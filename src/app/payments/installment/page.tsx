"use client";

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Search, FileText, DollarSign } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  getAllPayments, 
  getCurrentMonthInstallmentSum, 
  getTotalPendingInstallmentSum 
} from '@/services/paymentService';
import { getProjects } from '@/services/projectService';
import { getClients } from '@/services/clientService';
import type { Payment } from '@/types/payment';
import type { ProjectType } from '@/types/project';
import type { Client } from '@/types/client';
import { cn } from '@/lib/utils';

// Función para formatear moneda
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

interface InstallmentPayment extends Omit<Payment, 'installmentNumber' | 'installments'> {
  projectNumber: string;
  clientName: string;
  installmentNumber: number;
  installments: number;
  projectId: string;
  amount: number;
  date: Date;
  paymentMethod: string;
}

// Skeleton para las filas de la tabla
const PaymentRowSkeleton = () => (
  <TableRow>
    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-32 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right"><div className="h-5 w-20 bg-muted rounded animate-pulse ml-auto"></div></TableCell>
  </TableRow>
);

export default function InstallmentPaymentsPage() {
  const queryClient = useQueryClient();
  const [filterText, setFilterText] = useState('');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Obtener totales
  const { 
    data: currentMonthTotal, 
    isLoading: isLoadingCurrentMonth,
    error: currentMonthError 
  } = useQuery<number>({
    queryKey: ['currentMonthInstallmentTotal'],
    queryFn: getCurrentMonthInstallmentSum,
  });

  const { 
    data: pendingTotal, 
    isLoading: isLoadingPending,
    error: pendingError 
  } = useQuery<number>({
    queryKey: ['pendingInstallmentTotal'],
    queryFn: getTotalPendingInstallmentSum,
  });

  // Mostrar loading si alguna consulta está cargando
  const isLoadingTotals = isLoadingCurrentMonth || isLoadingPending;
  
  // Manejar errores
  React.useEffect(() => {
    if (currentMonthError) {
      console.error('Error al cargar total del mes actual:', currentMonthError);
      // Mostrar un valor predeterminado en caso de error
      queryClient.setQueryData(['currentMonthInstallmentTotal'], 0);
    }
    if (pendingError) {
      console.error('Error al cargar total pendiente:', pendingError);
      // Mostrar un valor predeterminado en caso de error
      queryClient.setQueryData(['pendingInstallmentTotal'], 0);
    }
  }, [currentMonthError, pendingError, queryClient]);

  // Obtener pagos
  const { 
    data: payments = [], 
    isLoading: isLoadingPayments, 
    error: paymentsError 
  } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      try {
        const data = await getAllPayments();
        console.log('Pagos obtenidos de Firestore:', data);
        return data;
      } catch (error) {
        console.error('Error obteniendo pagos:', error);
        throw error;
      }
    }
  });

  // Obtener proyectos
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects, 
    error: projectsError 
  } = useQuery<ProjectType[]>({
    queryKey: ['projects'],
    queryFn: () => getProjects()
  });

  // Obtener clientes
  const { 
    data: clients = [], 
    isLoading: isLoadingClients, 
    error: clientsError 
  } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => getClients()
  });

  // Mostrar errores en consola
  React.useEffect(() => {
    if (paymentsError) console.error('Error cargando pagos:', paymentsError);
    if (projectsError) console.error('Error cargando proyectos:', projectsError);
    if (clientsError) console.error('Error cargando clientes:', clientsError);
  }, [paymentsError, projectsError, clientsError]);

  // Procesar y filtrar cuotas
  const installmentPayments = useMemo<InstallmentPayment[]>(() => {
    if (isLoadingPayments || isLoadingProjects || isLoadingClients) return [];

    try {
      console.log('=== INICIO PROCESAMIENTO DE PAGOS ===');
      console.log('Fecha actual:', today.toISOString());
      console.log('Total de pagos recibidos:', payments.length);
      
      // Crear mapas para búsquedas rápidas
      const projectMap = new Map(projects.map((p: ProjectType) => [p.id, p]));
      const clientMap = new Map(clients.map((c: Client) => [c.id, c]));

      // Procesar cada pago
      const result: InstallmentPayment[] = [];
      
      payments.forEach((payment) => {
        try {
          console.log(`\nProcesando pago ${payment.id}:`);
          console.log('- Fecha pago:', payment.date);
          console.log('- Cuotas totales:', payment.installments);
          
          // Verificar si es un pago a cuotas
          const totalInstallments = payment.installments || 1;
          if (totalInstallments <= 1) {
            console.log('  - No es pago a cuotas, saltando...');
            return;
          }
          
          // Verificar fecha de pago
          const paymentDate = payment.date ? new Date(payment.date) : null;
          if (!paymentDate) {
            console.log('  - Pago sin fecha válida, saltando...');
            return;
          }
          
          // Obtener información del proyecto y cliente
          const project = projectMap.get(payment.projectId);
          const client = project ? clientMap.get(project.clientId) : null;
          
          // Calcular monto por cuota
          const amountPerInstallment = payment.amount ? payment.amount / totalInstallments : 0;
          
          // Generar cada cuota
          for (let i = 0; i < totalInstallments; i++) {
            const installmentDate = new Date(paymentDate);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            
            // Solo agregar cuotas futuras
            if (installmentDate >= today) {
              const installmentNumber = i + 1;
              console.log(`  - Cuota ${installmentNumber}/${totalInstallments} para ${installmentDate.toISOString()}`);
              
              result.push({
                ...payment,
                id: `${payment.id}_cuota_${installmentNumber}`,
                date: installmentDate,
                amount: amountPerInstallment,
                projectNumber: project?.projectNumber || 'N/A',
                clientName: client?.name || 'Cliente no encontrado',
                installmentNumber,
                installments: totalInstallments,
                projectId: payment.projectId,
                paymentMethod: payment.paymentMethod || 'No especificado'
              } as InstallmentPayment);
            }
          }
        } catch (error) {
          console.error(`Error procesando pago ${payment.id}:`, error);
        }
      });
      
      console.log('\n=== RESUMEN ===');
      console.log(`Total de cuotas futuras generadas: ${result.length}`);
      console.log('Cuotas generadas:', result.map(p => ({
        id: p.id,
        projectNumber: p.projectNumber,
        clientName: p.clientName,
        date: p.date,
        installmentNumber: p.installmentNumber,
        installments: p.installments,
        amount: p.amount
      })));
      
      // Ordenar por fecha
      return result.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error('Error procesando cuotas:', error);
      return [];
    }
  }, [payments, projects, clients, isLoadingPayments, isLoadingProjects, isLoadingClients]);

  const filteredInstallments = useMemo(() => {
    if (!filterText) return installmentPayments;
    
    const searchLower = filterText.toLowerCase();
    return installmentPayments.filter(payment => 
      payment.projectNumber?.toLowerCase().includes(searchLower) ||
      payment.clientName?.toLowerCase().includes(searchLower) ||
      payment.paymentMethod?.toLowerCase().includes(searchLower)
    );
  }, [installmentPayments, filterText]);

  const isLoading = isLoadingPayments || isLoadingProjects || isLoadingClients || isLoadingTotals;
  const hasError = paymentsError || projectsError || clientsError || currentMonthError || pendingError;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando datos...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center text-destructive">
        <h1 className="text-2xl font-bold mb-2">Error al cargar las cuotas</h1>
        <p>{(paymentsError || projectsError || clientsError)?.message || "Ha ocurrido un error desconocido."}</p>
        <Button 
          onClick={() => {
            if (paymentsError) queryClient.refetchQueries({ queryKey: ['payments'] });
            if (projectsError) queryClient.refetchQueries({ queryKey: ['projects'] });
            if (clientsError) queryClient.refetchQueries({ queryKey: ['clients'] });
          }} 
          className="mt-4"
        >
          Intentar de Nuevo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="space-y-4 mb-6 md:mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Cuotas de Pago</h1>
            <p className="text-muted-foreground">Próximos vencimientos de cuotas de pago.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/payments">
              <DollarSign className="mr-2 h-4 w-4" />
              Ver Pagos
            </Link>
          </Button>
        </div>
        
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Mes Actual</p>
                  <div className="min-h-8 flex items-center">
                    {isLoadingTotals ? (
                      <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
                    ) : (
                      <p className="text-2xl font-bold">
                        {formatCurrency(Number(currentMonthTotal) || 0)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pendiente</p>
                  <div className="min-h-8 flex items-center">
                    {isLoadingTotals ? (
                      <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
                    ) : (
                      <p className="text-2xl font-bold">
                        {formatCurrency(Number(pendingTotal) || 0)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-full bg-amber-500/10">
                  <DollarSign className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <main className="flex-grow">
        <Card className="shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proyecto, cliente o método de pago..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-8"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <PaymentRowSkeleton key={i} />)
                ) : filteredInstallments.length > 0 ? (
                  filteredInstallments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.projectNumber}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {payment.paymentMethod}
                        </div>
                      </TableCell>
                      <TableCell>{payment.clientName}</TableCell>
                      <TableCell>
                        <div className="font-medium">{format(payment.date, 'PPP', { locale: es })}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(payment.date, 'EEEE', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.installmentNumber} de {payment.installments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="font-mono">{formatCurrency(payment.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {payment.amount < 1000000 
                            ? 'Menos de 1M' 
                            : `~${Math.round(payment.amount / 1000000)}M`}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-40" />
                        <p>No se encontraron cuotas pendientes</p>
                        {filterText && (
                          <Button variant="ghost" size="sm" onClick={() => setFilterText('')}>
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
