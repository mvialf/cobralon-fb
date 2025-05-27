
// src/app/projects/[projectId]/edit/page.tsx
"use client";

import type { SubmitHandler } from 'react-hook-form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient as useQueryClientHook } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { format as formatDateFns, parseISO } from 'date-fns';

import type { ProjectType, ProjectStatus } from '@/types/project';
import type { Client } from '@/types/client';
import { getProjectById, updateProject } from '@/services/projectService';
import { getClients, addClient as addClientService } from '@/services/clientService';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronsUpDown, Loader2, Save, XCircle, PlusCircle, ArrowLeftToLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ClientModal from '@/components/client-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';


const UNINSTALL_TYPE_OPTIONS = ["Aluminio", "Madera", "Fierro", "PVC", "Americano"];

const projectSchema = z.object({
  clientId: z.string().min(1, "Cliente es requerido."),
  projectNumber: z.string().min(1, "Número de proyecto es requerido."),
  glosa: z.string().optional(),
  date: z.date({ required_error: "Fecha de inicio es requerida." }),
  status: z.enum(['ingresado', 'en progreso', 'completado', 'cancelado', 'pendiente aprobación'] as [ProjectStatus, ...ProjectStatus[]], {
    required_error: "Estado es requerido."
  }),
  subtotal: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number({ invalid_type_error: "Subtotal debe ser un número." }).min(0, "Subtotal no puede ser negativo.")
  ),
  taxRate: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number({ invalid_type_error: "IVA debe ser un número." }).min(0).max(100).default(19)
  ),
  windowsCount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? 0 : (typeof val === 'string' ? parseInt(val, 10) : val)),
    z.number().int().min(0).optional().default(0)
  ),
  squareMeters: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? 0 : (typeof val === 'string' ? parseFloat(val) : val)),
    z.number().min(0).optional().default(0)
  ),
  phone: z.string().optional(),
  commune: z.string().optional(),
  region: z.string().optional().default('RM'),
  address: z.string().optional(),
  description: z.string().optional(),
  uninstall: z.boolean().default(false),
  uninstallTypes: z.array(z.string()).optional().default([]), 
  collect: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  isPaid: z.boolean().default(false), 
});


type ProjectFormValues = z.infer<typeof projectSchema>;

const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date; 
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDateFns(d, 'yyyy-MM-dd');
  } catch (error) {
    console.warn("Error formatting date for input:", date, error);
    return ''; 
  }
};

const FormSkeleton = () => (
    <Card className="flex-grow shadow-lg">
        <CardContent className="pt-6 space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-2/3 space-y-2"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:w-1/3 space-y-2"><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2 space-y-2"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:w-1/4 space-y-2"><Skeleton className="h-6 w-20 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:w-1/4 space-y-2"><Skeleton className="h-6 w-12 mb-1" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-9 gap-6">
                <div className="md:col-span-3 space-y-2"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:col-span-2 space-y-2"><Skeleton className="h-6 w-10 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:col-span-2 space-y-2"><Skeleton className="h-6 w-20 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:col-span-2 space-y-2"><Skeleton className="h-6 w-8 mb-1" /><Skeleton className="h-10 w-full" /></div>
            </div>
             <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 space-y-2"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:w-1/3 space-y-2"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-10 w-full" /></div>
                <div className="md:w-1/3 space-y-2"><Skeleton className="h-6 w-12 mb-1" /><Skeleton className="h-10 w-full" /></div>
            </div>
             <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2 space-y-2"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-20 w-full" /></div>
                 <div className="md:w-1/2 space-y-2"><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-20 w-full" /></div>
            </div>
            <div className="md:w-1/3 space-y-2"><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex justify-end gap-4 pt-8">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-36" />
            </div>
        </CardContent>
    </Card>
);


export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const { toast } = useToast();
  const queryClient = useQueryClientHook();
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientSearchActive, setIsClientSearchActive] = useState(false);
  const [openUninstallTypesPopover, setOpenUninstallTypesPopover] = useState(false);

  const { data: projectData, isLoading: isLoadingProject, isError: isErrorProject, error: errorProject } = useQuery<ProjectType, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => {
        const project = await getProjectById(projectId);
        if (!project) {
            throw new Error("Proyecto no encontrado.");
        }
        return project;
    },
    enabled: !!projectId, 
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting: isProjectSubmitting }, setValue, watch, reset } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    // Default values are set by reset in useEffect
  });

  useEffect(() => {
    if (projectData) {
      const formattedData = {
        ...projectData,
        date: projectData.date ? new Date(projectData.date) : new Date(),
        uninstallTypes: Array.isArray(projectData.uninstallTypes) ? projectData.uninstallTypes : [],
        isPaid: projectData.isPaid || false,
      };
      reset(formattedData);
    }
  }, [projectData, reset]);


  const updateProjectMutation = useMutation({
    mutationFn: (data: { projectId: string; projectData: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance' >> }) => 
      updateProject(data.projectId, data.projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: "Proyecto Actualizado", description: `El proyecto "${watch("projectNumber")}" ha sido actualizado exitosamente.` });
      router.push('/projects');
    },
    onError: (error: Error) => {
      toast({ title: "Error al Actualizar Proyecto", description: error.message || "No se pudo actualizar el proyecto.", variant: "destructive" });
    },
  });
  
  const addClientMutation = useMutation({
    mutationFn: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => addClientService(clientData),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] }).then(() => {
        setValue("clientId", newClient.id, { shouldValidate: true, shouldDirty: true });
      });
      toast({ title: "Cliente Añadido", description: `"${newClient.name}" ha sido añadido.` });
      setIsClientModalOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo añadir el cliente: ${err.message}`, variant: "destructive" });
    },
  });

  const onSubmit: SubmitHandler<ProjectFormValues> = (data) => {
    const subtotal = Number(data.subtotal) || 0;
    const taxRate = Number(data.taxRate) || 0;
    
    const projectDataToUpdate: Partial<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'>> = {
      ...data,
      date: data.date,
      subtotal,
      taxRate,
      windowsCount: Number(data.windowsCount) || 0,
      squareMeters: Number(data.squareMeters) || 0,
      uninstallTypes: Array.isArray(data.uninstallTypes) ? data.uninstallTypes : (typeof data.uninstallTypes === 'string' ? (data.uninstallTypes as string).split(',').map(s => s.trim()).filter(Boolean) : []),
    };
    updateProjectMutation.mutate({ projectId, projectData: projectDataToUpdate });
  };


  const handleOpenClientModal = () => {
    setOpenClientCombobox(false); 
    setIsClientModalOpen(true);
    setIsClientSearchActive(false);
  };

  const handleCloseClientModal = () => {
    setIsClientModalOpen(false);
  };

  const handleSaveNewClientFromModal = (savedClient: Client) => {
    const { id, createdAt, updatedAt, ...newClientData } = savedClient;
    addClientMutation.mutate(newClientData as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>);
  };

  const uninstallActive = watch("uninstall");
  const selectedUninstallTypes = watch("uninstallTypes") || [];

  if (isLoadingProject || !projectData) { 
    return (
        <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
            <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
                <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <Link href="/projects" passHref legacyBehavior>
                    <Button variant="outline" size="icon" aria-label="Volver a Proyectos">
                    <ArrowLeftToLine className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary">Editar Proyecto</h1>
                    <p className="text-muted-foreground">Cargando datos del proyecto...</p>
                </div>
                </div>
            </header>
            <FormSkeleton />
        </div>
    );
  }

  if (isErrorProject) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center text-destructive">
        <h1 className="text-2xl font-bold mb-2">Error al cargar el proyecto</h1>
        <p>{errorProject?.message || "No se pudo encontrar el proyecto o ha ocurrido un error."}</p>
        <Button onClick={() => router.push('/projects')} className="mt-4">
          Volver a Proyectos
        </Button>
      </div>
    );
  }
  

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <Link href="/projects" passHref legacyBehavior>
            <Button variant="outline" size="icon" aria-label="Volver a Proyectos">
              <ArrowLeftToLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Editar Proyecto</h1>
            <p className="text-muted-foreground">Modifique los detalles del proyecto "{projectData?.projectNumber}".</p>
          </div>
        </div>
      </header>

      <Card className="flex-grow shadow-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Fila 1: Cliente, Número de proyecto */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-2/3 space-y-2">
                <Label htmlFor="clientId">Cliente <span className="text-destructive">*</span></Label>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Popover open={openClientCombobox} onOpenChange={(isOpen) => {
                      setOpenClientCombobox(isOpen);
                      if (!isOpen) setIsClientSearchActive(false); 
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClientCombobox}
                          className="w-full justify-between"
                          disabled={isLoadingClients || addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}
                        >
                          {field.value
                            ? clients.find((client) => client.id === field.value)?.name
                            : "Seleccionar cliente..."}
                          {isLoadingClients ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar cliente..."
                            onValueChange={(search) => {
                              setIsClientSearchActive(search.length > 0);
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>
                                <span className="text-sm">No se encontró ningún cliente.</span>
                            </CommandEmpty>
                            {isClientSearchActive && (
                              <CommandGroup>
                                {clients.map((client) => (
                                  <CommandItem
                                    key={client.id}
                                    value={client.name} 
                                    onSelect={() => {
                                      setValue("clientId", client.id, { shouldValidate: true, shouldDirty: true });
                                      setOpenClientCombobox(false);
                                      setIsClientSearchActive(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === client.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                            <CommandItem
                                onSelect={handleOpenClientModal}
                                className="cursor-pointer text-primary hover:bg-accent/50"
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear Nuevo Cliente
                              </CommandItem>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
              </div>
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="projectNumber">Número de Proyecto <span className="text-destructive">*</span></Label>
                <Input id="projectNumber" {...register("projectNumber")} placeholder="Ej: P2024-001" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending} />
                {errors.projectNumber && <p className="text-sm text-destructive">{errors.projectNumber.message}</p>}
              </div>
            </div>

            {/* Fila 2: Glosa, Fecha de inicio, Estado */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 space-y-2">
                <Label htmlFor="glosa">Glosa / Descripción Breve</Label>
                <Input id="glosa" {...register("glosa")} placeholder="Descripción corta o notas iniciales del proyecto" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending} />
                {errors.glosa && <p className="text-sm text-destructive">{errors.glosa.message}</p>}
              </div>
              <div className="md:w-1/4 space-y-2">
                <Label htmlFor="date">Fecha de Inicio <span className="text-destructive">*</span></Label>
                 <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                        <Input
                        type="date"
                        id="date"
                        value={field.value ? formatDateForInput(field.value) : ''}
                        onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}
                        />
                    )}
                />
                {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
              </div>
              <div className="md:w-1/4 space-y-2">
                <Label htmlFor="status">Estado <span className="text-destructive">*</span></Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ingresado">Ingresado</SelectItem>
                        <SelectItem value="en progreso">En Progreso</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="pendiente aprobación">Pendiente Aprobación</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
              </div>
            </div>

            {/* Fila 3: Subtotal, IVA (%), N° Ventanas, M² */}
            <div className="grid grid-cols-1 md:grid-cols-9 gap-6">
              <div className="md:col-span-3 space-y-2"> 
                <Label htmlFor="subtotal">Subtotal <span className="text-destructive">*</span></Label>
                <Input id="subtotal" type="number" step="any" {...register("subtotal")} placeholder="0" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.subtotal && <p className="text-sm text-destructive">{errors.subtotal.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="taxRate">IVA (%) <span className="text-destructive">*</span></Label>
                <Input id="taxRate" type="number" step="any" {...register("taxRate")} placeholder="19" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.taxRate && <p className="text-sm text-destructive">{errors.taxRate.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="windowsCount">N° Ventanas</Label>
                <Input id="windowsCount" type="number" {...register("windowsCount")} placeholder="0" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.windowsCount && <p className="text-sm text-destructive">{errors.windowsCount.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="squareMeters">M²</Label>
                <Input id="squareMeters" type="number" step="any" {...register("squareMeters")} placeholder="0" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.squareMeters && <p className="text-sm text-destructive">{errors.squareMeters.message}</p>}
              </div>
            </div>

            {/* Fila 4: Teléfono, Comuna, Región */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="phone">Teléfono (Proyecto)</Label>
                <Input id="phone" {...register("phone")} placeholder="Ej: +56912345678" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="commune">Comuna</Label>
                <Input id="commune" {...register("commune")} placeholder="Ej: Las Condes" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.commune && <p className="text-sm text-destructive">{errors.commune.message}</p>}
              </div>
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="region">Región</Label>
                <Input id="region" {...register("region")} placeholder="Ej: RM" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                {errors.region && <p className="text-sm text-destructive">{errors.region.message}</p>}
              </div>
            </div>

            {/* Fila 5: Dirección y Descripción Completa */}
             <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2 space-y-2">
                    <Label htmlFor="address">Dirección (Proyecto)</Label>
                    <Textarea id="address" {...register("address")} placeholder="Dirección donde se realizará el proyecto" disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                    {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
                </div>
                <div className="md:w-1/2 space-y-2">
                    <Label htmlFor="description">Descripción Completa</Label>
                    <Textarea id="description" {...register("description")} placeholder="Detalles completos del proyecto, observaciones, etc." disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}/>
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>
            </div>

            {/* Fila 6: Uninstall Switch & Details */}
            <div className="space-y-4">
                 <div className="flex items-center space-x-2 pt-2">
                    <Controller
                        name="uninstall"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="uninstall"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={addClientMutation.isPending || isProjectSubmitting || updateProjectMutation.isPending}
                            />
                        )}
                    />
                    <Label htmlFor="uninstall">Incluye desinstalación</Label>
                </div>
                {errors.uninstall && <p className="text-sm text-destructive">{errors.uninstall.message}</p>}

                {uninstallActive && (
                  <div className="pl-6 space-y-4 border-l-2 border-muted ml-2">
                    <div>
                      <Label htmlFor="uninstallTypes">Tipos de Desinstalación</Label>
                      <Controller
                        name="uninstallTypes"
                        control={control}
                        render={({ field }) => (
                           <Popover open={openUninstallTypesPopover} onOpenChange={setOpenUninstallTypesPopover}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between mt-1"
                                disabled={isProjectSubmitting || updateProjectMutation.isPending}
                              >
                                {selectedUninstallTypes.length > 0
                                  ? selectedUninstallTypes.join(', ')
                                  : "Seleccionar tipos..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar tipo..." />
                                <CommandList>
                                  <CommandEmpty>No se encontró el tipo.</CommandEmpty>
                                  <CommandGroup>
                                    {UNINSTALL_TYPE_OPTIONS.map((option) => (
                                      <CommandItem
                                        key={option}
                                        onSelect={() => {
                                          const currentValues = field.value || [];
                                          const newValues = currentValues.includes(option)
                                            ? currentValues.filter(val => val !== option)
                                            : [...currentValues, option];
                                          field.onChange(newValues);
                                        }}
                                      >
                                        <Checkbox
                                          className="mr-2"
                                          checked={field.value?.includes(option)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            const newValues = checked
                                              ? [...currentValues, option]
                                              : currentValues.filter(val => val !== option);
                                            field.onChange(newValues);
                                          }}
                                        />
                                        {option}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                       {errors.uninstallTypes && <p className="text-sm text-destructive">{(errors.uninstallTypes as any).message}</p>}
                    </div>
                  </div>
                )}
            </div>
            
            {/* Calculated Total (Display Only) */}
            <div className="md:w-1/3 space-y-2">
                <Label>Total Calculado (con IVA)</Label>
                <Input 
                    value={
                        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                            (Number(watch("subtotal")) || 0) * (1 + (Number(watch("taxRate")) || 0) / 100)
                        )
                    } 
                    readOnly 
                    disabled 
                    className="bg-muted/50"
                />
            </div>

            {/* Switches for additional options */}
            <div className="space-y-4 pt-4">
                 <div className="flex items-center space-x-2">
                     <Controller name="collect" control={control} render={({ field }) => <Switch id="collect" checked={field.value} onCheckedChange={field.onChange} disabled={isProjectSubmitting || updateProjectMutation.isPending} />} />
                    <Label htmlFor="collect">¿Retirar Materiales? <span className="text-destructive">*</span></Label>
                     {errors.collect && <p className="text-sm text-destructive">{errors.collect.message}</p>}
                </div>
                 <div className="flex items-center space-x-2">
                     <Controller name="isHidden" control={control} render={({ field }) => <Switch id="isHidden" checked={field.value || false} onCheckedChange={field.onChange} disabled={isProjectSubmitting || updateProjectMutation.isPending} />} />
                    <Label htmlFor="isHidden">Ocultar Proyecto (Archivar)</Label>
                     {errors.isHidden && <p className="text-sm text-destructive">{errors.isHidden.message}</p>}
                </div>
                <div className="flex items-center space-x-2">
                     <Controller name="isPaid" control={control} render={({ field }) => <Switch id="isPaid" checked={field.value || false} onCheckedChange={field.onChange} disabled={isProjectSubmitting || updateProjectMutation.isPending} />} />
                    <Label htmlFor="isPaid">Proyecto Pagado Completamente</Label>
                     {errors.isPaid && <p className="text-sm text-destructive">{errors.isPaid.message}</p>}
                </div>
            </div>


            <div className="flex justify-end gap-4 pt-8">
              <Button type="button" variant="outline" onClick={() => router.push('/projects')} disabled={updateProjectMutation.isPending || isProjectSubmitting || addClientMutation.isPending}>
                <XCircle className="mr-2 h-5 w-5" />
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProjectMutation.isPending || isProjectSubmitting || addClientMutation.isPending}>
                {(updateProjectMutation.isPending || isProjectSubmitting) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ClientModal 
        isOpen={isClientModalOpen} 
        onClose={handleCloseClientModal} 
        onSave={handleSaveNewClientFromModal} 
      />
    </div>
  );
}

