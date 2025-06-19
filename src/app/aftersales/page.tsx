"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AfterSales } from '@/types/afterSales';
import type { ProjectType } from '@/types/project';
import { getProjects } from '@/services/projectService';
import { toast } from '@/components/ui/use-toast';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProjectClientDisplay } from '@/components/client-display';
import { formatCurrency, formatClientDisplay } from '@/utils/format-helpers';

// Importación del servicio afterSalesService con soporte para instancia de Firestore
import { db } from '@/lib/firebase/client';
import { getAfterSalesForProject, deleteAfterSales } from '@/services/afterSalesService';

// Componentes de UI
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, GanttChartSquare, Wrench, Trash2, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Estados definidos para postventas
const AFTERSALES_STATUS_OPTIONS = [
  { value: 'Ingresada', label: 'Ingresada' },
  { value: 'Agendada', label: 'Agendada' },
  { value: 'Reagendar', label: 'Reagendar' },
  { value: 'Completada', label: 'Completada' },
];

// Función para obtener la variante del badge según el estado
const getAfterSaleStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Ingresada':
      return 'outline';
    case 'Agendada':
      return 'secondary';
    case 'Reagendar':
      return 'destructive';
    case 'Completada':
      return 'complete';
    default:
      return 'default';
  }
};

// Adaptación para usar la nueva versión del servicio que acepta instancia de Firestore
const getAllAfterSales = async () => {
  // Esta función es provisional y deberá ser actualizada para usar
  // un contexto de base de datos que proporcione la instancia de Firestore
  try {
    // Obtener todos los proyectos primero
    const projects = await getProjects();
    
    // Luego obtener todos los casos de posventa para cada proyecto
    const afterSalesPromises = projects.map(project => 
      getAfterSalesForProject(project.id)
    );
    
    const allAfterSalesArrays = await Promise.all(afterSalesPromises);
    
    // Combinar todos los resultados en un único array
    return allAfterSalesArrays.flat();
  } catch (error) {
    console.error("Error al obtener casos de posventa:", error);
    throw error;
  }
};

export default function AfterSalesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isDetailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAfterSale, setSelectedAfterSale] = useState<AfterSales | null>(null);

  const handleDeleteClick = (afterSale: AfterSales) => {
    setSelectedAfterSale(afterSale);
    setDeleteAlertOpen(true);
  };

  const handleDetailsClick = (afterSale: AfterSales) => {
    setSelectedAfterSale(afterSale);
    setDetailsDialogOpen(true);
  };
  
  // Obtener todas las postventas
  const { data: afterSalesData = [], isLoading: isLoadingAfterSales } = useQuery({
    queryKey: ['afterSales'],
    queryFn: () => getAllAfterSales(),
  });

  // Obtener todos los proyectos para mostrar nombres
  const { data: projectsData = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const deleteMutation = useMutation({
    mutationFn: (afterSalesId: string) => deleteAfterSales(afterSalesId),
    onSuccess: () => {
      toast({ title: 'Postventa eliminada', description: 'El registro ha sido eliminado con éxito.' });
      queryClient.invalidateQueries({ queryKey: ['afterSales'] });
    },
    onError: (error) => {
      toast({ title: 'Error al eliminar', description: 'No se pudo eliminar el registro.', variant: 'destructive' });
      console.error('Error deleting after-sale:', error);
    },
    onSettled: () => {
      setDeleteAlertOpen(false);
      setSelectedAfterSale(null);
    },
  });

  // Crear un mapa de proyectos por ID para acceso rápido
  const projectsMap = useMemo(() => {
    return projectsData.reduce((acc, project) => {
      acc[project.id] = project;
      return acc;
    }, {} as Record<string, ProjectType>);
  }, [projectsData]);

  // Filtrar los datos según el término de búsqueda
  const filteredAfterSales = useMemo(() => {
    return afterSalesData.filter(item => {
      const projectName = projectsMap[item.projectId]?.clientName || projectsMap[item.projectId]?.description || '';
      const searchTerm = searchQuery.toLowerCase();
      
      return (
        projectName.toLowerCase().includes(searchTerm) ||
        (item.description || '').toLowerCase().includes(searchTerm) ||
        (item.afterSalesStatus || '').toLowerCase().includes(searchTerm)
      );
    });
  }, [afterSalesData, projectsMap, searchQuery]);

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Postventas</h2>
        </div>
        <Button onClick={() => router.push('/aftersales/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Postventa
        </Button>
      </div>
      
      <div className="mt-4">
        <Input
          placeholder="Buscar postventas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card className="w-max mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-80">Proyecto</TableHead>
                <TableHead className="w-40 text-center">Ingreso</TableHead>
                <TableHead className="w-40 text-center">Estado</TableHead>
                <TableHead className="w-40 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAfterSales ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Cargando postventas...
                  </TableCell>
                </TableRow>
              ) : filteredAfterSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No se encontraron registros de postventa.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAfterSales.map((afterSale) => {
                  const project = projectsMap[afterSale.projectId];
                  return (
                    <TableRow key={afterSale.id}>
                      <TableCell className="font-medium">
                        {project ? (
                          <ProjectClientDisplay project={project} />
                        ) : (
                          <span>Proyecto desconocido</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {afterSale.entryDate ? formatDate(afterSale.entryDate, 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getAfterSaleStatusBadgeVariant(afterSale.afterSalesStatus || '')}>
                          {afterSale.afterSalesStatus || 'Sin estado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <GanttChartSquare className="h-6 w-6" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDetailsClick(afterSale)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/aftersales/${afterSale.id}/edit`)}>
                              <Wrench className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(afterSale)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Postventa</DialogTitle>
            <DialogDescription>
              {selectedAfterSale && projectsMap[selectedAfterSale.projectId]?.clientName}
            </DialogDescription>
          </DialogHeader>
          {selectedAfterSale && (
            <div className="space-y-4">
              <div><strong>Proyecto:</strong> {projectsMap[selectedAfterSale.projectId]?.description}</div>
              <div><strong>Fecha de Ingreso:</strong> {selectedAfterSale.entryDate ? formatDate(selectedAfterSale.entryDate, 'PPP', { locale: es }) : 'N/A'}</div>
              <div><strong>Estado:</strong> {selectedAfterSale.afterSalesStatus}</div>
              <div className="pt-2"><strong>Descripción:</strong><p className="text-sm text-muted-foreground">{selectedAfterSale.description}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alerta de Eliminación */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de postventa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAfterSale && deleteMutation.mutate(selectedAfterSale.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
