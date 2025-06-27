
// src/app/payments/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient as useQueryClientHook, useMutation } from '@tanstack/react-query';
import type { Payment } from '@/types/payment';
import type { ProjectType } from '@/types/project';
import type { Client } from '@/types/client';
import { getAllPayments, deletePayment, updatePayment } from '@/services/paymentService';
import { EditPaymentDialog } from '@/components/payments/edit-payment-dialog';
import { getProjects } from '@/services/projectService';
import { getClients } from '@/services/clientService';
import { format as formatDate } from '@/lib/calendar-utils';
import { es } from 'date-fns/locale';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/table/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Edit, Trash2, GanttChartSquare, Search, Loader2, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { normalizeSearchText } from '@/utils/search-utils';

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

const PaymentRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="h-5 w-20 bg-muted rounded animate-pulse mb-1"></div>
      <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell className="text-right"><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded-full inline-block animate-pulse"></div></TableCell>
  </TableRow>
);

interface EnrichedPayment extends Payment {
  clientName?: string;
  projectNumber?: string;
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClientHook();

  const [filterText, setFilterText] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState<EnrichedPayment | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<EnrichedPayment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: payments = [], isLoading: isLoadingPayments, isError: isErrorPayments, error: errorPayments } = useQuery<Payment[], Error>({
    queryKey: ['payments'],
    queryFn: getAllPayments,
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ProjectType[], Error>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const enrichedPayments = useMemo((): EnrichedPayment[] => {
    if (isLoadingPayments || isLoadingProjects || isLoadingClients || !payments || !projects || !clients) {
      return [];
    }

    const projectMap = new Map(projects.map(p => [p.id, p]));
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    return payments.map(payment => {
      const project = projectMap.get(payment.projectId);
      let clientNameDisplay = 'Cliente Desconocido';
      let projectNumberDisplay = 'Proyecto Desconocido';

      if (project) {
        projectNumberDisplay = project.projectNumber;
         if (project.glosa) {
            projectNumberDisplay += ` - ${project.glosa}`;
        }

        const clientName = clientMap.get(project.clientId);
        if (clientName) {
          clientNameDisplay = clientName;
        } else {
          clientNameDisplay = `Cliente no encontrado (ID: ${project.clientId})`;
        }
      } else {
        projectNumberDisplay = `Proyecto no encontrado (ID: ${payment.projectId})`;
      }
      
      return {
        ...payment,
        clientName: clientNameDisplay,
        projectNumber: projectNumberDisplay,
      };
    });
  }, [payments, projects, clients, isLoadingPayments, isLoadingProjects, isLoadingClients]);

  const filteredPayments = useMemo(() => {
    const searchTerm = normalizeSearchText(filterText);
    return enrichedPayments.filter(payment => {
      const projectNumber = payment.projectNumber ? normalizeSearchText(payment.projectNumber) : '';
      const clientName = payment.clientName ? normalizeSearchText(payment.clientName) : '';
      const paymentType = payment.paymentType ? normalizeSearchText(payment.paymentType) : '';
      const paymentMethod = payment.paymentMethod ? normalizeSearchText(payment.paymentMethod) : '';
      
      return projectNumber.includes(searchTerm) ||
             clientName.includes(searchTerm) ||
             paymentType.includes(searchTerm) ||
             paymentMethod.includes(searchTerm);
    });
  }, [enrichedPayments, filterText]);

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: (_, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Invalidate projects due to balance change
      toast({ title: "Pago Eliminado", description: `El pago ha sido eliminado.`, variant: "destructive" });
      setPaymentToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error al Eliminar", description: `No se pudo eliminar el pago: ${err.message}`, variant: "destructive" });
      setPaymentToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  });


  const handleDeletePaymentInitiate = (payment: EnrichedPayment) => {
    setPaymentToDelete(payment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete.id);
    }
  };

  const handleEditPayment = (payment: EnrichedPayment) => {
    setPaymentToEdit(payment);
    setIsEditDialogOpen(true);
  };


  const isLoading = isLoadingPayments || isLoadingProjects || isLoadingClients;
  const isMutating = deletePaymentMutation.isPending;

  if (isErrorPayments) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center text-destructive">
        <h1 className="text-2xl font-bold mb-2">Error al cargar pagos</h1>
        <p>{errorPayments?.message || "Ha ocurrido un error desconocido."}</p>
         <Button onClick={() => queryClient.refetchQueries({ queryKey: ['payments'] })} className="mt-4">
          Intentar de Nuevo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Gestión de Pagos</h1>
            <p className="text-muted-foreground">Consulta y administra los pagos registrados.</p>
          </div>
        </div>
        <Button onClick={() => toast({ title: "Próximamente", description: "El registro de nuevos pagos estará disponible pronto."})} disabled={isLoading}>
          <DollarSign className="mr-2 h-5 w-5" />
          Registrar Pago
        </Button>
      </header>
      <main className="flex-grow">
        <Card className="shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Filtrar por proyecto, cliente, tipo..."
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
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Medio de Pago</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <PaymentRowSkeleton key={i} />)
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className={isMutating && paymentToDelete?.id === payment.id ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        <div>{payment.projectNumber}</div>
                        <div className="text-xs text-muted-foreground">{payment.clientName}</div>
                      </TableCell>
                      <TableCell className="text-right items-center">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.date ? formatDate(payment.date, 'P', { locale: es }) : 'N/A'}</TableCell>
                      <TableCell className="flex items-center ">
                        {payment.paymentMethod === 'tarjeta de crédito' ? (
                          <>
                            <span>Tarjeta de Crédito</span>
                            {payment.installments && (
                              <Badge variant="accent" className="ml-1 whitespace-nowrap">
                              {payment.installments}
                              </Badge>
                            )}
                          </>
                        ) : (
                          payment.paymentMethod || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>{payment.paymentType || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isMutating && paymentToDelete?.id === payment.id} aria-label="Más acciones">
                              {isMutating && paymentToDelete?.id === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <GanttChartSquare className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEditPayment(payment)} disabled={isMutating}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDeletePaymentInitiate(payment)} disabled={isMutating} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Eliminar</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <DollarSign className="mx-auto h-12 w-12 mb-4" />
                      <p className="text-lg font-semibold">No hay pagos registrados.</p>
                      <p className="text-sm">Empieza añadiendo pagos a tus proyectos.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {paymentToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el pago de {formatCurrency(paymentToDelete.amount)}
                asociado al proyecto {paymentToDelete.projectNumber} (Cliente: {paymentToDelete.clientName}). La eliminación de este pago también actualizará el saldo del proyecto.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setPaymentToDelete(null); setIsDeleteDialogOpen(false); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePayment}
                disabled={deletePaymentMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deletePaymentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sí, eliminar pago
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Diálogo de edición de pago */}
      {paymentToEdit && (
        <EditPaymentDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          payment={paymentToEdit}
        />
      )}
    </div>
  );
}
