
// src/app/projects/page.tsx
"use client";
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useQuery, useMutation, useQueryClient as useQueryClientHook } from '@tanstack/react-query';
import type { ProjectType } from '@/types/project';
import type { Client } from '@/types/client';
import { getProjects, updateProject, deleteProject } from '@/services/projectService';
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
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
// ProjectModal ya no se usa para edición aquí, se navegará a una página
// import ProjectModal from '@/components/project-modal'; 
import { useToast } from '@/hooks/use-toast';

// Helper to format currency (Chilean Pesos example)
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

// Skeleton for table rows
const ProjectRowSkeleton = () => (
  <TableRow>
    <TableCell className="w-10 text-center"><Checkbox disabled /></TableCell>
    <TableCell><div className="h-5 w-32 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-center"><div className="h-6 w-10 bg-muted rounded-full inline-block animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right space-x-2">
      <div className="h-8 w-8 bg-muted rounded-full inline-block animate-pulse"></div>
    </TableCell>
  </TableRow>
);

export default function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClientHook();
  const router = useRouter(); // Initialize router

  const [filterText, setFilterText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [projectToDelete, setProjectToDelete] = useState<ProjectType | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);


  const { data: projects = [], isLoading: isLoadingProjects, isError: isErrorProjects, error: errorProjects } = useQuery<ProjectType[], Error>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const clientMap = useMemo(() => {
    if (isLoadingClients || !clients) return new Map<string, string>();
    return new Map(clients.map(client => [client.id, client.name]));
  }, [clients, isLoadingClients]);

  const updateProjectMutation = useMutation({
    mutationFn: (variables: { projectId: string; projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>> }) =>
      updateProject(variables.projectId, variables.projectData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Toast for 'isPaid' toggle is handled in handleToggleIsPaid directly
      if (!variables.projectData.hasOwnProperty('isPaid')) {
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

  const handleToggleIsPaid = async (projectId: string, newIsPaidState: boolean) => {
    try {
      await updateProjectMutation.mutateAsync({ projectId, projectData: { isPaid: newIsPaidState } });
      toast({
        title: "Estado de Pago Actualizado",
        description: `El proyecto ha sido marcado como ${newIsPaidState ? 'pagado' : 'no pagado'}.`,
      });
    } catch (error) {
      let message = "Error actualizando estado de pago.";
      if (error instanceof Error) {
        message = error.message;
      }
      console.error("Error toggling isPaid status:", error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };


  const filteredProjects = useMemo(() => projects.filter(project => {
    const clientName = clientMap.get(project.clientId)?.toLowerCase() || '';
    return (
      project.projectNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      clientName.includes(filterText.toLowerCase()) ||
      (project.glosa && project.glosa.toLowerCase().includes(filterText.toLowerCase())) ||
      (project.description && project.description.toLowerCase().includes(filterText.toLowerCase()))
    );
  }), [projects, clientMap, filterText]);

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

  const isLoading = isLoadingProjects || isLoadingClients;
  const isMutating = updateProjectMutation.isPending || deleteProjectMutation.isPending;

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
                  <TableHead className="text-center">Pagado</TableHead>
                  <TableHead className="text-right">Abonos</TableHead>
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <ProjectRowSkeleton key={i} />)
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => {
                    let clientDisplay = clientMap.get(project.clientId) || 'Cliente no encontrado';
                    if (project.glosa && project.glosa.trim() !== '') {
                      clientDisplay += ` - ${project.glosa}`;
                    }
                    const abonos = (project.total ?? 0) - (project.balance ?? 0);
                    const isRowUpdating = updateProjectMutation.isPending && updateProjectMutation.variables?.projectId === project.id;
                    const isRowDeleting = deleteProjectMutation.isPending && projectToDelete?.id === project.id;
                    const isCurrentRowMutating = isRowUpdating || isRowDeleting;
                    
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
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'completado' ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' :
                            project.status === 'en progreso' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300' :
                            project.status === 'cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300' :
                            project.status === 'ingresado' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300' :
                            project.status === 'pendiente aprobación' ? 'bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300'
                          }`}>
                            {project.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={project.isPaid || false}
                            onCheckedChange={(newCheckedState) => handleToggleIsPaid(project.id, newCheckedState)}
                            disabled={isRowUpdating && updateProjectMutation.variables?.projectData.hasOwnProperty('isPaid')}
                            aria-label={project.isPaid ? "Proyecto marcado como pagado" : "Marcar proyecto como pagado"}
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(abonos)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isCurrentRowMutating} aria-label="Más acciones">
                                {isCurrentRowMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <GanttChartSquare className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => console.log("Registrar Pago para:", project.projectNumber)} disabled={isMutating}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                <span>Registrar Pago</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => console.log("Estado de cuenta para:", project.projectNumber)} disabled={isMutating}>
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
      
      {/* El ProjectModal ya no se usa aquí para editar, se navega a una página */}

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
