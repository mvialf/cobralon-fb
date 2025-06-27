'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format as formatDateFns, parseISO } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ProjectType } from '@/types/project';
import { getProjectById, updateProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';
import { ProjectForm } from '@/components/projects/ProjectForm';
import type { ProjectFormValues } from '@/components/projects/ProjectForm';

// Función para formatear la fecha para el input de fecha
const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : parseISO(date as string);
  return formatDateFns(dateObj, 'yyyy-MM-dd');
};

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  // Obtener el proyecto actual
  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const data = await getProjectById(projectId);
      if (!data) {
        throw new Error('Proyecto no encontrado');
      }
      return data;
    },
    enabled: !!projectId,
  });

  // Mutación para actualizar el proyecto
  const updateProjectMutation = useMutation({
    mutationFn: async (
      projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'>
    ) => {
      if (!projectId) throw new Error('ID de proyecto no válido');
      return updateProject(projectId, projectData);
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Proyecto Actualizado',
        description: `El proyecto ha sido actualizado exitosamente.`,
      });
      router.push('/projects');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al Actualizar Proyecto',
        description: error.message || 'No se pudo actualizar el proyecto.',
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

      // Preparar los datos para la actualización
      const projectData = {
        ...formData,
        subtotal,
        taxRate,
        uninstallTypes: formData.uninstallTypes || [],
        // Si hay dirección completa, extraer los campos individuales para compatibilidad
        ...(formData.fullAddress && {
          address: formData.fullAddress.textoCompleto || '',
          commune: formData.fullAddress.componentes?.comuna || '',
          region: formData.fullAddress.componentes?.region || '',
        }),
      };

      // Actualizar el proyecto
      await updateProjectMutation.mutateAsync(projectData);
    } catch (error) {
      console.error('Error al actualizar el proyecto:', error);
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

  if (isLoading) {
    return (
      <div className='container mx-6 py-6 px-4 sm:px-6 lg:px-8 max-w-[33rem]'>
        <div className='space-y-6'>
          <div className='flex flex-col space-y-2 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-primary'>
                Cargando Proyecto...
              </h1>
            </div>
          </div>
          <Card className='overflow-hidden'>
            <CardContent className='p-6'>
              <FormSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className='container mx-6 py-6 px-4 sm:px-6 lg:px-8 max-w-[33rem]'>
        <div className='space-y-6'>
          <div className='flex flex-col space-y-2 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-destructive'>Error</h1>
              <p className='text-muted-foreground'>
                {error?.message || 'No se pudo cargar el proyecto.'}
              </p>
            </div>
            <Button variant='outline' onClick={() => router.push('/projects')}>
              Volver a proyectos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-6 py-6 px-4 sm:px-6 lg:px-8 max-w-[33rem]'>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex flex-col space-y-2 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight text-primary'>Editar Proyecto</h1>
            <p className='text-muted-foreground'>Editando proyecto: {project.projectNumber}</p>
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
            {updateProjectMutation.isPending ? (
              <FormSkeleton />
            ) : (
              <ProjectForm
                defaultValues={project}
                onSubmit={handleFormSubmit}
                isSubmitting={updateProjectMutation.isPending}
                submitButtonText='Guardar Cambios'
                onCancel={() => router.push('/projects')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
