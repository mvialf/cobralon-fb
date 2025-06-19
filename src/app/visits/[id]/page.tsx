"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, FileText, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type VisitStatus = 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Realizada';

interface Visit {
  id: string;
  name: string;
  phone: string;
  status: VisitStatus;
  address: string;
  municipality: string;
  observations?: string;
  scheduledDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Datos de ejemplo - en una aplicación real, estos vendrían de una API
export default function VisitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.id as string;

  // Estado para almacenar los datos de la visita
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para cargar los datos de la visita
  useEffect(() => {
    const fetchVisit = async () => {
      try {
        // Aquí iría la llamada a la API para obtener los datos de la visita
        // const visitData = await getVisitById(visitId);
        // setVisit(visitData);
      } catch (err) {
        console.error('Error al cargar la visita:', err);
        setError('No se pudo cargar la información de la visita');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVisit();
  }, [visitId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Cargando información de la visita...</p>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">{error || 'No se encontró la visita solicitada'}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </Button>
      </div>
    );
  }

  const getStatusVariant = (status: VisitStatus) => {
    switch (status) {
      case 'Confirmada':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Realizada':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: // Pendiente
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const formatDateTime = (date: Date) => {
    return format(date, "EEEE d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 md:mb-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Detalles de la Visita</h1>
          <p className="text-muted-foreground">
            Información detallada de la visita
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/visits/${visitId}/edit`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Información General</CardTitle>
              <Badge className={getStatusVariant(visit.status)}>
                {visit.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-2 h-4 w-4" />
                  Nombre
                </div>
                <div className="text-sm font-medium">{visit.name}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  Teléfono
                </div>
                <div className="text-sm font-medium">{visit.phone}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Fecha y Hora
                </div>
                <div className="text-sm font-medium">
                  {formatDateTime(visit.scheduledDate)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  Dirección
                </div>
                <div className="text-sm font-medium">
                  {visit.address}, {visit.municipality}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {visit.observations && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start">
                <FileText className="mr-2 h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm whitespace-pre-line">{visit.observations}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">ID de la Visita</div>
                <div className="text-sm font-mono">{visit.id}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Creada</div>
                <div className="text-sm">
                  {format(visit.createdAt, "PPP", { locale: es })}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Última actualización</div>
                <div className="text-sm">
                  {format(visit.updatedAt, "PPPp", { locale: es })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Clock className="mr-2 h-4 w-4" />
                Reagendar Visita
              </Button>
              <Button variant="outline" className="w-full">
                <Phone className="mr-2 h-4 w-4" />
                Llamar al Cliente
              </Button>
              <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                <Clock className="mr-2 h-4 w-4" />
                Cancelar Visita
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
