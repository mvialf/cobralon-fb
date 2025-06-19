
// src/app/projects/page.tsx
"use client";
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useQuery, useMutation, useQueryClient as useQueryClientHook } from '@tanstack/react-query';
import type { ProjectType, ProjectStatus } from '@/types/project';
import type { Client } from '@/types/client';
import type { Payment, PaymentMethod } from '@/types/payment'; // Import Payment types
import { getProjects, updateProject, deleteProject } from '@/services/projectService';
import { getClients } from '@/services/clientService';
import { addPayment, getAllPayments } from '@/services/paymentService'; // Import addPayment service
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, formatClientDisplay } from '@/utils/format-helpers';
import { getPaymentPercentageBadgeVariant, getStatusBadgeVariant, PROJECT_STATUS_OPTIONS } from '@/lib/constants'; 
import type { ProjectStatusConstant } from '@/lib/constants';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { GanttChartSquare, DollarSign, FileText, SquarePen, Trash2, PlusCircle, Briefcase, Loader2, Search } from 'lucide-react';
import PaymentModal from '@/components/payment-modal'; 
import AccountStatementDialog from '@/components/account-statement-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Skeleton for table rows
const ProjectRowSkeleton = () => (
  <TableRow>
    <TableCell className="w-10 text-center"><Checkbox disabled /></TableCell>
    <TableCell><div className="h-5 w-32 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right"><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><Badge><div className="h-4 w-16 bg-muted/50 rounded animate-pulse"></div></Badge></TableCell>
    <TableCell className="text-center"><div className="h-6 w-10 bg-muted rounded-full inline-block animate-pulse"></div></TableCell>
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-2">
        <div className="h-5 w-20 bg-muted rounded animate-pulse"></div> {/* Amount */}
        <div className="h-5 w-12 bg-muted rounded-full animate-pulse"></div> {/* Percentage Badge */}
      </div>
    </TableCell>
    <TableCell className="text-right space-x-2">
      <div className="h-8 w-8 bg-muted rounded-full inline-block animate-pulse"></div>
    </TableCell>
  </TableRow>
);

interface EnrichedProject extends ProjectType {
  clientName?: string;
  totalPayments: number;
  totalPaymentPercentage: number;
}


export default function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClientHook();
  const router = useRouter(); 

  const [filterText, setFilterText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [projectToDelete, setProjectToDelete] = useState<ProjectType | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProjectForPayment, setSelectedProjectForPayment] = useState<ProjectType | null>(null);

  // Estado para manejar la apertura del modal de estado de cuenta
  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false);
  const [selectedProjectForAccountStatement, setSelectedProjectForAccountStatement] = useState<ProjectType | null>(null);


  const { data: projects = [], isLoading: isLoadingProjects, isError: isErrorProjects, error: errorProjects } = useQuery<ProjectType[], Error>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const { data: allPayments = [], isLoading: isLoadingAllPayments } = useQuery<Payment[], Error>({
    queryKey: ['payments'], 
    queryFn: getAllPayments,
  });

  const clientMap = useMemo(() => {
    if (isLoadingClients || !clients) return new Map<string, string>();
    return new Map(clients.map(client => [client.id, client.name]));
  }, [clients, isLoadingClients]);

  const enrichedProjects = useMemo((): EnrichedProject[] => {
    if (isLoadingProjects || isLoadingClients || isLoadingAllPayments || !projects || !clients || !allPayments) {
      return [];
    }

    return projects.map(project => {
      const clientName = clientMap.get(project.clientId) || 'Cliente Desconocido';
      
      const sumOfPaymentsForProject = allPayments
        .filter(p => p.projectId === project.id && !p.isAdjustment && typeof p.amount === 'number')
        .reduce((acc, p) => acc + (p.amount || 0), 0);

      const calculatedBalance = (project.total ?? 0) - sumOfPaymentsForProject;
      
      const projectTotalValue = project.total ?? 0;
      let calculatedTotalPaymentPercentage = 0;

      if (projectTotalValue > 0) {
        calculatedTotalPaymentPercentage = (sumOfPaymentsForProject / projectTotalValue) * 100;
      } else if (projectTotalValue === 0 && sumOfPaymentsForProject === 0) {
        calculatedTotalPaymentPercentage = 100; 
      } else if (projectTotalValue === 0 && sumOfPaymentsForProject > 0) {
        calculatedTotalPaymentPercentage = 100; 
      } else if (projectTotalValue === 0 && sumOfPaymentsForProject < 0) { // Should not happen with valid data
        calculatedTotalPaymentPercentage = 0;
      }
      
      return {
        ...project,
        clientName,
        totalPayments: sumOfPaymentsForProject,
        balance: calculatedBalance, 
        totalPaymentPercentage: calculatedTotalPaymentPercentage,
      };
    });
  }, [projects, clients, allPayments, clientMap, isLoadingProjects, isLoadingClients, isLoadingAllPayments]);


  const updateProjectMutation = useMutation({
    mutationFn: (variables: { projectId: string; projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>> }) =>
      updateProject(variables.projectId, variables.projectData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] }); 
      // Toast for status change is handled in handleStatusChange, toast for isPaid in handleToggleIsPaid
      if (!variables.projectData.hasOwnProperty('isPaid') && !variables.projectData.hasOwnProperty('status')) {
           toast({ title: "Proyecto Actualizado", description: `El proyecto ha sido actualizado.` });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo actualizar el proyecto: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] }); 
      toast({ title: "Proyecto Eliminado", description: `"${projectToDelete?.projectNumber || 'El proyecto'}" ha sido eliminado.`, variant: "destructive" });
      setSelectedRows(prev => {
        const newSelected = {...prev};
        delete newSelected[projectId];
        return newSelected;
      });
      setProjectToDelete(null);
      setIsDeleteProjectDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error al Eliminar", description: `No se pudo eliminar el proyecto: ${err.message}`, variant: "destructive" });
      setProjectToDelete(null);
      setIsDeleteProjectDialogOpen(false);
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: (paymentData: Omit<Payment, 'id' | 'updatedAt'>) => addPayment(paymentData),
    onSuccess: (newPayment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] }); 
      toast({ title: "Pago Registrado", description: `Pago de ${formatCurrency(newPayment.amount)} para el proyecto "${selectedProjectForPayment?.projectNumber}" registrado.` });
      setIsPaymentModalOpen(false);
      setSelectedProjectForPayment(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error al Registrar Pago", description: err.message, variant: "destructive" });
    }
  });

  const handleOpenPaymentModal = (project: ProjectType) => {
    const projectForModal = enrichedProjects.find(ep => ep.id === project.id) || project;
    setSelectedProjectForPayment(projectForModal);
    setIsPaymentModalOpen(true);
  };

  // Función para abrir el diálogo de estado de cuenta
  const handleOpenAccountStatement = (project: ProjectType) => {
    const projectForDialog = enrichedProjects.find(ep => ep.id === project.id) || project;
    setSelectedProjectForAccountStatement(projectForDialog);
    setIsAccountStatementOpen(true);
  };

  const handleSavePayment = (formData: { amount: number; date: Date; paymentMethod: PaymentMethod }) => {
    if (!selectedProjectForPayment) {
      toast({ title: "Error", description: "No hay un proyecto seleccionado para el pago.", variant: "destructive" });
      return;
    }

    const paymentPayload: Omit<Payment, 'id' | 'updatedAt'> = {
      projectId: selectedProjectForPayment.id,
      amount: formData.amount,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      paymentType: 'proyecto', // Tipo de pago por defecto
      isAdjustment: false, // No es un ajuste por defecto
      createdAt: new Date(), // Añadir createdAt como requiere la interfaz Payment
    };
    addPaymentMutation.mutate(paymentPayload);
  };


  const handleDeleteProjectInitiate = (project: ProjectType) => {
    setProjectToDelete(project);
    setIsDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
    }
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/projects/${projectId}/edit`);
  };

  const handleToggleCollect = async (projectId: string, newCollectState: boolean) => {
    try {
      await updateProjectMutation.mutateAsync({ projectId, projectData: { collect: newCollectState } });
      toast({
        title: "Estado de Cobro Actualizado",
        description: `El proyecto ha sido marcado para ${newCollectState ? 'cobrar' : 'no cobrar'}.`,
      });
    } catch (error) {
      // Error toast is handled by mutation's onError
    }
  };
  
  const handleStatusChange = (projectId: string, newStatus: ProjectStatusConstant) => {
    updateProjectMutation.mutate(
      { projectId, projectData: { status: newStatus } },
      {
        onSuccess: () => {
          toast({
            title: "Estado Actualizado",
            description: `El estado del proyecto ha sido cambiado a "${newStatus}".`,
          });
        },
        // onError is handled by the default mutation onError
      }
    );
  };


  const filteredProjects = useMemo(() => enrichedProjects.filter(project => {
    const clientName = project.clientName?.toLowerCase() || '';
    return (
      project.projectNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      clientName.includes(filterText.toLowerCase()) ||
      (project.glosa && project.glosa.toLowerCase().includes(filterText.toLowerCase())) ||
      (project.description && project.description.toLowerCase().includes(filterText.toLowerCase()))
    );
  }), [enrichedProjects, filterText]);

  const handleSelectAllRows = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      filteredProjects.forEach(project => newSelectedRows[project.id] = true);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleSelectRow = (projectId: string, checked: boolean) => {
    setSelectedRows(prev => ({ ...prev, [projectId]: checked }));
  };

  const isAllSelected = filteredProjects.length > 0 && filteredProjects.every(p => selectedRows[p.id]);
  const isIndeterminate = Object.values(selectedRows).some(Boolean) && !isAllSelected;


  if (isErrorProjects) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center text-destructive">
        <h1 className="text-2xl font-bold mb-2">Error al cargar proyectos</h1>
        <p>{errorProjects?.message || "Ha ocurrido un error desconocido."}</p>
        <Button onClick={() => queryClient.refetchQueries({ queryKey: ['projects'] })} className="mt-4">
          Intentar de Nuevo
        </Button>
      </div>
    );
  }

  const isLoading = isLoadingProjects || isLoadingClients || isLoadingAllPayments;
  const isMutating = updateProjectMutation.isPending || deleteProjectMutation.isPending || addPaymentMutation.isPending;


  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Gestión de Proyectos</h1>
            <p className="text-muted-foreground">Administra tus proyectos y su información.</p>
          </div>
        </div>
        <Button asChild disabled={isLoading}>
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Nuevo Proyecto
          </Link>
        </Button>
      </header>
      <main className="flex-grow">
        <Card className="shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por Nº proyecto, cliente, glosa..."
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
                  <TableHead className="w-10 text-center">
                     <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))}
                        aria-label="Seleccionar todas las filas"
                        data-state={isIndeterminate ? "indeterminate" : (isAllSelected ? "checked" : "unchecked")}
                        disabled={isLoading || filteredProjects.length === 0}
                     />
                  </TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>F. Inicio</TableHead>
                  <TableHead className="text-right">V. Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Cobrar</TableHead>
                  <TableHead className="text-right">Abonos</TableHead>
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <ProjectRowSkeleton key={i} />)
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => {
                    const clientDisplay = formatClientDisplay({
                      clientName: project.clientName,
                      glosa: project.glosa
                    });
                    const isRowUpdating = updateProjectMutation.isPending && updateProjectMutation.variables?.projectId === project.id;
                    const isRowDeleting = deleteProjectMutation.isPending && projectToDelete?.id === project.id;
                    const isCurrentRowMutating = isRowUpdating || isRowDeleting || (addPaymentMutation.isPending && selectedProjectForPayment?.id === project.id);
                    
                    return (
                      <TableRow
                        key={project.id}
                        className={isCurrentRowMutating ? 'opacity-50' : ''}
                        data-state={selectedRows[project.id] ? 'selected' : undefined}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedRows[project.id] || false}
                            onCheckedChange={(checked) => handleSelectRow(project.id, Boolean(checked))}
                            aria-label={`Seleccionar proyecto ${project.projectNumber}`}
                            disabled={isMutating}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>{project.projectNumber}</div>
                          <div className="text-xs text-muted-foreground">{clientDisplay}</div>
                        </TableCell>
                        <TableCell>{project.date ? formatDate(project.date, 'P', { locale: es }) : 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.total)}</TableCell>
                        <TableCell>
                          <Select
                            value={project.status}
                            onValueChange={(newStatus) => handleStatusChange(project.id, newStatus as ProjectStatusConstant)}
                            disabled={isCurrentRowMutating}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-auto p-0 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 min-w-[120px] [&_svg]:size-3.5",
                                // El siguiente estilo es para cuando el select está abierto
                                "data-[state=open]:ring-1 data-[state=open]:ring-ring data-[state=open]:ring-offset-1"
                              )}
                              aria-label={`Estado: ${project.status}. Cambiar estado.`}
                            >
                              <Badge variant={getStatusBadgeVariant(project.status)} className="pointer-events-none px-4 align-center justify-center">
                                {project.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {PROJECT_STATUS_OPTIONS.map((statusOption) => (
                                <SelectItem key={statusOption} value={statusOption}>
                                  <Badge variant={getStatusBadgeVariant(statusOption)} className="mr-2 border !h-3 !w-3 !p-0" />
                                  {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={project.collect || false}
                            onCheckedChange={(newCheckedState) => handleToggleCollect(project.id, newCheckedState)}
                            disabled={(isRowUpdating && updateProjectMutation.variables?.projectData.hasOwnProperty('collect')) || project.isPaid === true}
                            aria-label={project.collect ? "Proyecto marcado para cobrar" : "Marcar proyecto para cobrar"}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{formatCurrency(project.totalPayments)}</span>
                            <Badge variant={getPaymentPercentageBadgeVariant(project.totalPaymentPercentage)}>
                              {project.totalPaymentPercentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="default" disabled={isCurrentRowMutating} aria-label="Más acciones">
                                {isCurrentRowMutating && (isRowDeleting || (isRowUpdating && !updateProjectMutation.variables?.projectData.hasOwnProperty('isPaid') && !updateProjectMutation.variables?.projectData.hasOwnProperty('status'))) ? <Loader2 className="h-4 w-4 animate-spin" /> : <GanttChartSquare className="h-6 w-6" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenPaymentModal(project)} disabled={isMutating}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                <span>Registrar Pago</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleOpenAccountStatement(project)} disabled={isMutating}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Estado de cuenta</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleEditProject(project.id)} disabled={isMutating}>
                                <SquarePen className="mr-2 h-4 w-4" />
                                <span>Editar proyecto</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteProjectInitiate(project)} disabled={isMutating} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar proyecto</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      <Briefcase className="mx-auto h-12 w-12 mb-4" />
                      <p className="text-lg font-semibold">No hay proyectos registrados.</p>
                      <p className="text-sm">Empieza añadiendo tu primer proyecto.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedProjectForPayment(null);
        }}
        onSave={handleSavePayment}
        project={selectedProjectForPayment}
        clientDisplay={
          selectedProjectForPayment 
            ? `${selectedProjectForPayment.clientName || 'Cliente no encontrado'}${selectedProjectForPayment.glosa?.trim() ? ` - ${selectedProjectForPayment.glosa}` : ''}`
            : 'Cliente no disponible'
        }
      />

      <AccountStatementDialog
        isOpen={isAccountStatementOpen}
        onClose={() => {
          setIsAccountStatementOpen(false);
          setSelectedProjectForAccountStatement(null);
        }}
        project={selectedProjectForAccountStatement}
        clientName={
          selectedProjectForAccountStatement 
            ? `${selectedProjectForAccountStatement.clientName || 'Cliente no encontrado'}${selectedProjectForAccountStatement.glosa?.trim() ? ` - ${selectedProjectForAccountStatement.glosa}` : ''}`
            : 'Cliente no disponible'
        }
      />

      {projectToDelete && (
        <AlertDialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el proyecto "{projectToDelete.projectNumber}"
                y todos sus pagos y registros de postventa asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setProjectToDelete(null); setIsDeleteProjectDialogOpen(false); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteProject}
                disabled={deleteProjectMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteProjectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sí, eliminar proyecto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

