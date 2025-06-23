"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

import { ModalEventLayout } from '../modalEventLayout';
import { getProjects } from '@/services/projectService';
// Importamos el tipo ProjectType desde su ubicación correcta
import { ProjectType } from '@/types/project';
import { toast } from '@/components/ui/use-toast';
import { CheckList, type CheckListItem } from "@/components/ui/check-list";
import { Textarea } from '@/components/ui/textarea';

// Componentes UI
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectClientDisplay } from "@/components/client-display";
import { AddressInput, FormattedAddress } from '@/components/ui/addressInput';

// Esquema para validación del formulario
const formSchema = z.object({
  projectId: z.string({
    required_error: 'Debe seleccionar un proyecto',
  }),
  glosa: z.string().optional(),
  projectNumber: z.string().min(1, "Número de proyecto es requerido."),
  description: z.string().optional(),
  phone: z.string().optional(),
  clientName: z.string().optional(),
  address: z.object({
    textoCompleto: z.string(),
    coordenadas: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    componentes: z.object({
      calle: z.string().optional(),
      numero: z.string().optional(),
      comuna: z.string().optional(),
      ciudad: z.string().optional(),
      region: z.string().optional(),
      pais: z.string().optional(),
      codigoPostal: z.string().optional(),
    }),
  }).optional(),
  checklist: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      isCompleted: z.boolean(),
      createdAt: z.date().optional(),
      completedAt: z.date().optional(),
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void;
  initialData?: Partial<FormValues>;
  isSubmitting?: boolean;
}

export function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}: ProjectModalProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [checklistItems, setChecklistItems] = useState<CheckListItem[]>([]);
  const [openProjectCombobox, setOpenProjectCombobox] = useState(false);

  // Obtener la lista de proyectos
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
    enabled: isOpen, // Solo cargar cuando la modal esté abierta
  });

  // Configuración del formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // Aseguramos que todos los valores estén siempre definidos para evitar cambios de no controlado a controlado
    defaultValues: {
      projectId: initialData?.projectId || '',
      glosa: initialData?.glosa || '',
      projectNumber: initialData?.projectNumber || '',
      description: initialData?.description || '',
      phone: initialData?.phone || '',
      clientName: initialData?.clientName || '',
      checklist: initialData?.checklist || [],
    },
  });

  const { watch, setValue, formState } = form;
  const watchedProjectId = watch('projectId');

  // Manejar la selección de un proyecto
  const handleProjectSelect = (projectId: string) => {
    setValue('projectId', projectId);
    setOpenProjectCombobox(false);
    
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject) {
      setSelectedProject(selectedProject);
      // Actualizar los campos del formulario con los datos del proyecto
      setValue('projectNumber', selectedProject.projectNumber || '');
      setValue('glosa', selectedProject.glosa || '');
      setValue('clientName', selectedProject.clientName || '');
      setValue('phone', selectedProject.phone || '');
      
      // Si el proyecto tiene dirección, actualizarla
      if (selectedProject.address) {
        // Usar la dirección directamente ya que es un string en ProjectType
        const addressString = selectedProject.address;
        // Crear un objeto FormattedAddress con la dirección en textoCompleto
        const formattedAddress: FormattedAddress = {
          textoCompleto: addressString,
          coordenadas: {
            latitude: 0,
            longitude: 0,
          },
          componentes: {
            calle: '',
            comuna: selectedProject.commune || '',
            ciudad: '',
            region: selectedProject.region || '',
          },
        };
        setValue('address', formattedAddress);
      } else {
        // Limpiar la dirección si no hay una definida
        setValue('address', undefined);
      }
    }
  };

  // Actualizar el formulario cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (watchedProjectId && projects.length > 0) {
      const foundProject = projects.find(p => p.id === watchedProjectId);
      if (foundProject) {
        setSelectedProject(foundProject);
        // Aseguramos que todos los valores sean strings vacíos si no existen
        setValue('projectNumber', foundProject.projectNumber || '');
        setValue('glosa', foundProject.glosa || '');
        setValue('clientName', foundProject.clientName || '');
        setValue('phone', foundProject.phone || '');
        
        // Si el proyecto tiene dirección, actualizarla
        if (foundProject.address) {
          // Usar la dirección directamente ya que es un string en ProjectType
          const addressString = foundProject.address;
          // Crear un objeto FormattedAddress con la dirección en textoCompleto
          const formattedAddress: FormattedAddress = {
            textoCompleto: addressString,
            coordenadas: {
              latitude: 0,
              longitude: 0,
            },
            componentes: {
              calle: '',
              comuna: foundProject.commune || '',
              ciudad: '',
              region: foundProject.region || '',
            },
          };
          setValue('address', formattedAddress);
        } else {
          // Limpiar la dirección si no hay una definida
          setValue('address', undefined);
        }
      }
    }
  }, [watchedProjectId, projects, setValue]);

  // Cargar datos iniciales si se proporcionan
  useEffect(() => {
    if (initialData?.checklist && initialData.checklist.length > 0) {
      setChecklistItems(initialData.checklist);
    }
  }, [initialData]);
  
  // Al abrir la modal, asegurarnos de que todos los campos estén sincronizados
  useEffect(() => {
    if (isOpen && selectedProject) {
      // Re-sincronizar los valores para asegurarnos que sean controlados
      setValue('projectNumber', selectedProject.projectNumber || '');
      setValue('glosa', selectedProject.glosa || '');
      setValue('clientName', selectedProject.clientName || '');
      setValue('phone', selectedProject.phone || '');
    }
  }, [isOpen, selectedProject, setValue]);

  // Manejar el envío del formulario
  const handleSubmit = () => {
    form.handleSubmit((data) => {
      onSubmit(data);
    })();
  };

  return (
    <ModalEventLayout
      isOpen={isOpen}
      title="Agendar Proyecto"
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting || isLoadingProjects}
      disabled={!formState.isValid}
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Buscador de Proyectos */}
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Proyecto</FormLabel>
                <Popover open={openProjectCombobox} onOpenChange={setOpenProjectCombobox}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-auto py-2",
                          !field.value && "text-muted-foreground"
                        )}
                        onClick={() => setOpenProjectCombobox(true)}
                      >
                        {field.value ? (
                          <div className="text-left w-full">
                            <ProjectClientDisplay 
                              project={projects.find((project) => project.id === field.value) || {}}
                              className="text-sm"
                            />
                          </div>
                        ) : (
                          <span>Seleccionar proyecto</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar proyecto..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron proyectos.</CommandEmpty>
                        <CommandGroup>
                          {projects.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={project.projectNumber} 
                              onSelect={() => handleProjectSelect(project.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  project.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <ProjectClientDisplay project={project} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

            {/* Teléfono */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dirección */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <AddressInput
                      onPlaceSelected={(address) => {
                        field.onChange(address);
                      }}
                      defaultValue={field.value?.textoCompleto || ''}
                      placeholder="Buscar dirección..."
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checklist */}
            <FormField
              control={form.control}
              name="checklist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CheckList</FormLabel>
                  <CheckList
                    items={field.value || []}
                    onItemToggle={(id, completed) => {
                      const updatedItems = (field.value || []).map(item =>
                        item.id === id 
                          ? { 
                              ...item, 
                              isCompleted: completed,
                              completedAt: completed ? new Date() : undefined 
                            } 
                          : item
                      );
                      field.onChange(updatedItems);
                    }}
                    onAddItem={(text) => {
                      const newItem: CheckListItem = {
                        id: Date.now().toString(),
                        description: text,
                        isCompleted: false,
                        createdAt: new Date()
                      };
                      const updatedItems = [...(field.value || []), newItem];
                      field.onChange(updatedItems);
                    }}
                    onItemDelete={(id) => {
                      const updatedItems = (field.value || []).filter(item => item.id !== id);
                      field.onChange(updatedItems);
                    }}
                    title=""
                    className="mt-2"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa los detalles del proyecto..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </ModalEventLayout>
      
  );
}