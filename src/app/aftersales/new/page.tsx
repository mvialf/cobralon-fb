"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';

// Servicios
import { getProjects } from '@/services/projectService';
import type { AfterSalesStatus } from '@/types/afterSales';
import { addAfterSales } from '@/services/afterSalesService';

// Componentes UI
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Check, 
  ChevronsUpDown, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  CalendarIcon,
  FilePlus,
} from 'lucide-react';
import { CheckList, type CheckListItem } from "@/components/ui/check-list";
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Esquema de validación con Zod
const afterSalesStatusOptions = [
  'Ingresada',
  'Agendada',
  'Reagendar',
  'Completada',
] as const;

const formSchema = z.object({
  projectId: z.string({
    required_error: 'Debe seleccionar un proyecto',
  }),
  description: z.string().min(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  }),
  entryDate: z.date({
    required_error: 'La fecha de solicitud es obligatoria',
  }),
  afterSalesStatus: z.enum(afterSalesStatusOptions).optional(),
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

export default function NewAfterSalePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<CheckListItem[]>([]);

  // Obtener la lista de proyectos
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  // Configuración del formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
      description: '',
      entryDate: new Date(),
      afterSalesStatus: 'Ingresada',
      checklist: [],
    },
  });
  
  const { setValue } = form;

  // Mutación para crear una nueva postventa
  const createAfterSaleMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Transformar las tareas al formato TaskItem
      const tasks = (data.checklist || []).map(task => ({
        id: task.id,
        description: task.description,
        isCompleted: task.isCompleted,
        createdAt: task.createdAt || new Date(),
        completedAt: task.isCompleted ? task.completedAt || new Date() : undefined
      }));

      // Crear el objeto de postventa
      const afterSaleData = {
        projectId: data.projectId,
        description: data.description,
        entryDate: data.entryDate,
        afterSalesStatus: data.afterSalesStatus || 'Ingresada' as const,
        tasks: tasks,
        // No incluir resolutionDate inicialmente
      };

      return await addAfterSales(afterSaleData);
    },
    onSuccess: () => {
      // Mostrar notificación de éxito
      toast({
        title: 'Postventa creada',
        description: 'La solicitud de postventa se ha registrado correctamente.',
      });

      // Invalidar la consulta de postventas para actualizar la lista
      queryClient.invalidateQueries({ queryKey: ['afterSales'] });

      // Redirigir a la lista de postventas
      router.push('/aftersales');
    },
    onError: (error) => {
      console.error('Error al crear la postventa:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la solicitud de postventa. Intente nuevamente.',
        variant: 'destructive',
      });
    },
  });

  // Manejar el envío del formulario
  const onSubmit = (data: FormValues) => {
    createAfterSaleMutation.mutate(data);
  };

  // Efecto para actualizar el proyecto seleccionado cuando cambia el valor del campo
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'projectId' && value.projectId) {
        const project = projects.find((p) => p.id === value.projectId);
        setSelectedProject(project || null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, projects]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Solicitud de Postventa</h1>
          <p className="text-muted-foreground">
            Complete el formulario para registrar una nueva solicitud de postventa.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6 max-w-[600px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Proyecto Asociado */}
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-96">
                    <FormLabel  className="pb-2">Proyecto Asociado</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl> 
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoadingProjects}
                          >
                            {field.value
                              ? (() => {
                                  const project = projects.find((p) => p.id === field.value);
                                  if (!project) return `Proyecto ${field.value.substring(0, 6)}`;
                                  
                                  const displayClientName = project.clientName?.trim() || 'Cliente no especificado';
                                  const glosa = project.glosa?.trim();
                                  const showGlosa = glosa && glosa !== displayClientName;
                                  
                                  return (
                                    <span className="text-left">
                                      {project.projectNumber} - {displayClientName}
                                      {showGlosa && (
                                        <span className="text-muted-foreground"> - {glosa}</span>
                                      )}
                                    </span>
                                  );
                                })()
                              : "Seleccionar proyecto..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar proyecto..." />
                          <CommandEmpty>No se encontraron proyectos.</CommandEmpty>
                          <CommandGroup>
                            {isLoadingProjects ? (
                            <div className="py-6 text-center">
                              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                              <p className="mt-2 text-sm text-muted-foreground">
                                Cargando proyectos...
                              </p>
                            </div>
                          ) : projects.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No hay proyectos disponibles
                            </div>
                          ) : (
                            <CommandList>
                              {projects.map((project) => (
                                <CommandItem
                                  value={`${project.projectNumber || ''} ${project.description || ''} ${project.clientName || ''}`}
                                  key={project.id}
                                  onSelect={() => {
                                    form.setValue('projectId', project.id);
                                    setSelectedProject(project);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        project.id  === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {project.projectNumber || `Proyecto ${project.id.substring(0, 6)}`}
                                      </div>
                                      {project.clientName && (
                                        <div className="text-xs text-muted-foreground">
                                          {project.clientName}
                                      </div>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandList>
                            )}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
              />
  
            </div>
            <div className="flex w-full gap-4">
              {/* Fecha de Solicitud */}
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem className="w-1/2 flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                        className="w-full"
                        calendarProps={{
                          disabled: (date) =>
                            date > new Date() || date < new Date("1900-01-01"),
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Estado de la Postventa */}
              <FormField
                control={form.control}
                name="afterSalesStatus"
                render={({ field }) => (
                  <FormItem className="w-1/2 flex flex-col  ">
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {afterSalesStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lista de verificación */}
            <FormField
              control={form.control}
              name="checklist"
              render={({ field }) => (
                <FormItem>
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
                    title="Tareas"
                    className="mt-4"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción Detallada */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción Detallada</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa con el mayor detalle posible el problema o solicitud..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/aftersales')}
                disabled={createAfterSaleMutation.isPending}
              >
                Cancelar
              </Button>
                <Button
                  type="submit"
                  disabled={createAfterSaleMutation.isPending}
                >
                  {createAfterSaleMutation.isPending ? (
                  <>
                      <span className="mr-2 h-4 w-4 animate-spin">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </span>
                    Guardando...
                  </>
                  ) : (
                  'Guardar'
                  )}
                </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
