"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { Plus, Eye, Edit, Phone, MapPin, Clock, GanttChartSquare, MoreHorizontal, Trash2, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Visit, getVisits, deleteVisit, VisitStatus } from '@/services/visitService';

const getStatusVariant = (status: VisitStatus) => {
  switch (status) {
    case 'Completada':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Agendada':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'Reagendada':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Cancelada':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: // Ingresada
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

export default function VisitsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar visitas desde Firestore
  useEffect(() => {
    const loadVisits = async () => {
      try {
        setLoading(true);
        const visitsData = await getVisits();
        setVisits(visitsData);
        setError(null);
      } catch (err) {
        console.error('Error al cargar visitas:', err);
        setError('No se pudieron cargar las visitas. Por favor, inténtalo de nuevo.');
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las visitas',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadVisits();
  }, [toast]);

  const handleViewDetails = (visitId?: string) => {
    if (!visitId) return;
    router.push(`/visits/${visitId}`);
  };

  const handleEdit = (visitId?: string) => {
    if (!visitId) return;
    router.push(`/visits/${visitId}/edit`);
  };

  const handleDelete = (visit: Visit) => {
    setVisitToDelete(visit);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!visitToDelete?.id) return;
    
    try {
      await deleteVisit(visitToDelete.id);
      
      // Actualizar el estado local
      const updatedVisits = visits.filter(v => v.id !== visitToDelete.id);
      setVisits(updatedVisits);
      
      toast({
        title: 'Visita eliminada',
        description: 'La visita ha sido eliminada correctamente.',
      });
    } catch (error) {
      console.error('Error al eliminar la visita:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la visita. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setVisitToDelete(null);
    }
  };

  // Filtrar visitas por término de búsqueda y estado
  const filteredVisits = visits.filter(visit => {
    if (!visit) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const name = visit.name || '';
    const phone = visit.phone || '';
    const address = visit.address || '';
    
    const matchesSearch = 
      name.toLowerCase().includes(searchLower) ||
      phone.includes(searchTerm) ||
      address.toLowerCase().includes(searchLower);
      
    const matchesStatus = selectedStatus === 'all' || visit.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };

  // Mostrar mensaje de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando visitas...</span>
      </div>
    );
  }
  
  // Mostrar mensaje de error
  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        <p>{error}</p>
      </div>
    );
  }
  
  // Mostrar mensaje cuando no hay visitas
  if (visits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No hay visitas registradas</p>
        <Button onClick={() => router.push('/visits/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Visita
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitas</h1>
          <p className="text-muted-foreground">
            Gestiona las visitas de clientes a tus proyectos
          </p>
        </div>
        <Link href="/visits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Visita
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-4 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar visitas..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    <Phone className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span>Teléfono</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    <MapPin className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span>Dirección</span>
                  </div>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span>Fecha de Visita</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.length > 0 ? (
                filteredVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">{visit.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {visit.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="truncate max-w-[200px]" title={visit.address}>
                          {visit.address}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusVariant(visit.status)}>
                        {visit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {formatDate(visit.scheduledDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <GanttChartSquare className="h-6 w-6" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(visit.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Ver detalles</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(visit.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(visit);
                            }}
                          >
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron visitas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={!!visitToDelete} onOpenChange={(open) => !open && setVisitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La visita será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


