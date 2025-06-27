// src/app/projects/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format as formatDateFns } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ProjectType } from '@/types/project';
import { addProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';
import { ProjectForm } from '@/components/projects/ProjectForm';
import type { ProjectFormValues } from '@/components/projects/ProjectForm';
import { CardHeader } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { CardDescription } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { addClient } from '@/services/clientService';
import type { Client } from '@/types/client';

// Función para formatear la fecha para el input de fecha
const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : new Date(date);
  return formatDateFns(dateObj, 'yyyy-MM-dd');
};

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutación para crear un nuevo cliente
  const addClientMutation = useMutation({
    mutationFn: (clientData: { name: string; email?: string; phone?: string }) => {
      // Asegurar que los campos opcionales tengan un valor por defecto
      const clientToAdd = {
        name: clientData.name,
        email: clientData.email || '',
        phone: clientData.phone || ''
      };
      return addClient(clientToAdd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente Agregado',
        description: 'El cliente ha sido agregado exitosamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al Agregar Cliente',
        description: error.message || 'Ocurrió un error al agregar el cliente.',
        variant: 'destructive',
      });
    },
  });

  // Función para manejar la adición de un nuevo cliente
  const handleAddClient = async (client: { name: string; email?: string; phone?: string }) => {
    try {
      await addClientMutation.mutateAsync(client);
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente ProjectForm
    }
  };

  // Mutación para crear un nuevo proyecto
  const addProjectMutation = useMutation({
    mutationFn: (
      projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'>
    ) => addProject(projectData),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Proyecto Creado',
        description: `El proyecto "${newProject.projectNumber}" ha sido creado exitosamente.`,
      });
      router.push('/projects');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al Crear Proyecto',
        description: error.message || 'No se pudo crear el proyecto.',
        variant: 'destructive',
      });
    },
  });

  // Manejador de envío del formulario
  const handleFormSubmit = async (formData: ProjectFormValues) => {
    try {
      // Calcular total y balance
      const subtotal = Number(formData.subtotal) || 0;
      const taxRate = Number(formData.taxRate) || 0;
      const total = subtotal * (1 + taxRate / 100);

      // Preparar los datos para la creación
      const projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'> =
        {
          ...formData,
          subtotal,
          taxRate,
          // No incluir 'total' ni 'balance' ya que son calculados en el servidor
          // Asegurarse de que los campos opcionales estén definidos
          uninstallTypes: formData.uninstallTypes || [],
          // Si hay dirección completa, extraer los campos individuales para compatibilidad
          ...(formData.fullAddress && {
            address: formData.fullAddress.textoCompleto || '',
            commune: formData.fullAddress.componentes?.comuna || '',
            region: formData.fullAddress.componentes?.region || '',
          }),
        };

      // Crear el proyecto
      await addProjectMutation.mutateAsync(projectData);
    } catch (error) {
      console.error('Error al crear el proyecto:', error);
    }
  };

  // Componente de carga esquelético
  const FormSkeleton = () => (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-10 w-full' />
        </div>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-10 w-full' />
        </div>
      </div>
      <Skeleton className='h-10 w-32 ml-auto' />
    </div>
  );

  return (
    <div className='container mx-6 py-6 px-4 sm:px-6 lg:px-8 max-w-[33rem]'>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex flex-col space-y-2 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight text-primary'>Nuevo Proyecto</h1>
          </div>
          <Button
            variant='outline'
            onClick={() => router.push('/projects')}
            className='w-full md:w-auto'
          >
            Volver a proyectos
          </Button>
        </div>

        {/* Formulario */}
        <Card className='overflow-hidden'>
          <CardContent className='p-6'>
            {addProjectMutation.isPending ? (
              <FormSkeleton />
            ) : (
              <ProjectForm
                onSubmit={handleFormSubmit}
                isSubmitting={addProjectMutation.isPending}
                submitButtonText='Crear Proyecto'
                onCancel={() => router.push('/projects')}
                onClientAdd={handleAddClient}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
