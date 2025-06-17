"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { AfterSales } from '@/types/afterSales';
import type { ProjectType } from '@/types/project';
import { getProjects } from '@/services/projectService';
import { format as formatDate } from '@/lib/calendar-utils';
import { es } from 'date-fns/locale';

// Importación del servicio afterSalesService con soporte para instancia de Firestore
import { db } from '@/lib/firebase/client';
import { getAfterSalesForProject } from '@/services/afterSalesService';

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
import { PlusCircle, MoreHorizontal, Wrench } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  
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

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                        {project?.clientName || project?.description || `Proyecto ${project?.projectNumber || 'desconocido'}`}
                      </TableCell>
                      <TableCell>
                        {afterSale.entryDate ? formatDate(afterSale.entryDate, 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAfterSaleStatusBadgeVariant(afterSale.afterSalesStatus || '')}>
                          {afterSale.afterSalesStatus || 'Sin estado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/aftersales/${afterSale.id}`)}>
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/aftersales/${afterSale.id}/edit`)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Eliminar
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
    </div>
  );
}
