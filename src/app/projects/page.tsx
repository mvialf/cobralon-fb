
// src/app/projects/page.tsx
"use client";
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient as useQueryClientHook } from '@tanstack/react-query'; // Renamed to avoid conflict
import type { ProjectType } from '@/types/project';
import type { Client } from '@/types/client';
import { getProjects, addProject, updateProject, deleteProject } from '@/services/projectService';
import { getClients } from '@/services/clientService';
import { format as formatDate } from '@/lib/calendar-utils'; // Assuming es locale is default
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
import { Edit, Trash2, PlusCircle, Briefcase, Loader2, Search } from 'lucide-react';
import ProjectModal from '@/components/project-modal';
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
    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right space-x-2">
      <div className="h-8 w-8 bg-muted rounded-full inline-block animate-pulse"></div>
      <div className="h-8 w-8 bg-muted rounded-full inline-block animate-pulse"></div>
    </TableCell>
  </TableRow>
);

export default function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClientHook();

  const [filterText, setFilterText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectType | undefined>(undefined);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});


  const { data: projects = [], isLoading: isLoadingProjects, isError: isErrorProjects, error: errorProjects } = useQuery<ProjectType[], Error>({
    queryKey: ['projects'],
    queryFn: () => getProjects(), // Fetches all projects
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const clientMap = useMemo(() => {
    if (isLoadingClients || !clients) return new Map<string, string>();
    return new Map(clients.map(client => [client.id, client.name]));
  }, [clients, isLoadingClients]);

  const addProjectMutation = useMutation({
    mutationFn: (projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>) => addProject(projectData),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Proyecto Añadido", description: `"${newProject.projectNumber}" ha sido añadido.` });
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo añadir el proyecto: ${err.message}`, variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (variables: { projectId: string; projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>> }) =>
      updateProject(variables.projectId, variables.projectData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const updatedProject = projects.find(p => p.id === variables.projectId);
      toast({ title: "Proyecto Actualizado", description: `"${updatedProject?.projectNumber || 'El proyecto'}" ha sido actualizado.` });
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo actualizar el proyecto: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject, 
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const deletedProject = projects.find(p => p.id === projectId);
      toast({ title: "Proyecto Eliminado", description: `"${deletedProject?.projectNumber || 'El proyecto'}" ha sido eliminado.`, variant: "destructive" });
      setSelectedRows(prev => {
        const newSelected = {...prev};
        delete newSelected[projectId];
        return newSelected;
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo eliminar el proyecto: ${err.message}`, variant: "destructive" });
    },
  });

  const handleOpenModal = (project?: ProjectType) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(undefined);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  const handleSaveProject = (savedProject: ProjectType) => {
    if (savedProject.id) {
      const { id, ...projectData } = savedProject;
      updateProjectMutation.mutate({ projectId: id, projectData });
    } else {
      const { id, ...newProjectData } = savedProject;
      addProjectMutation.mutate(newProjectData as Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };
  
  const filteredProjects = useMemo(() => projects.filter(project => {
    const clientName = clientMap.get(project.clientId)?.toLowerCase() || '';
    return (
      project.projectNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      clientName.includes(filterText.toLowerCase()) ||
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
  const isMutating = addProjectMutation.isPending || updateProjectMutation.isPending || deleteProjectMutation.isPending;

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
        <Button onClick={() => handleOpenModal()} disabled={isMutating || isLoading}>
          {isMutating && addProjectMutation.isPending && !selectedProject ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
          Nuevo Proyecto
        </Button>
      </header>
      <main className="flex-grow">
        <Card className="shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por Nº proyecto, cliente..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-8"
                disabled={isLoading}
              />
            </div>
            {/* Add other toolbar items here if needed, e.g., bulk actions button */}
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
                        data-indeterminate={isIndeterminate ? "true" : undefined}
                        disabled={isLoading || filteredProjects.length === 0}
                     />
                  </TableHead>
                  <TableHead>Nº Proyecto / Cliente</TableHead>
                  <TableHead>F. Inicio</TableHead>
                  <TableHead className="text-right">V. Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Por Cobrar</TableHead>
                  <TableHead className="text-right">Abonos</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <ProjectRowSkeleton key={i} />)
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => {
                    const clientName = clientMap.get(project.clientId) || 'Cliente no encontrado';
                    const abonos = (project.total ?? 0) - (project.balance ?? 0);
                    const isRowMutating = (updateProjectMutation.variables?.projectId === project.id || deleteProjectMutation.variables === project.id);

                    return (
                      <TableRow 
                        key={project.id} 
                        className={isRowMutating ? 'opacity-50' : ''}
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
                          <div className="text-xs text-muted-foreground">{clientName}</div>
                        </TableCell>
                        <TableCell>{project.date ? formatDate(project.date, 'P', { locale: es }) : 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.total)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'completado' ? 'bg-green-100 text-green-700' :
                            project.status === 'en progreso' ? 'bg-blue-100 text-blue-700' :
                            project.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                            project.status === 'ingresado' ? 'bg-yellow-100 text-yellow-700' :
                            project.status === 'pendiente aprobación' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {project.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(project.balance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(abonos)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="outline" size="icon" onClick={() => handleOpenModal(project)} aria-label="Editar proyecto" disabled={isMutating}>
                            {isMutating && updateProjectMutation.variables?.projectId === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteProject(project.id)} aria-label="Eliminar proyecto" disabled={isMutating}>
                            {isRowMutating && deleteProjectMutation.variables === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
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
      {isModalOpen && (
        <ProjectModal 
            isOpen={isModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSaveProject} 
            projectData={selectedProject}
            clients={clients} 
        />
      )}
    </div>
  );
}

