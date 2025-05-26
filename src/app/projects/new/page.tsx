
// src/app/projects/new/page.tsx
"use client";

import type { SubmitHandler } from 'react-hook-form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient as useQueryClientHook } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { format as formatDateFns, parseISO } from 'date-fns';

import type { ProjectType, ProjectStatus } from '@/types/project';
import type { Client } from '@/types/client';
import { addProject } from '@/services/projectService';
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
import { Check, ChevronsUpDown, Loader2, Save, XCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ClientModal from '@/components/client-modal';


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
  endDate: z.date().optional(),
  // classification: z.enum(['bajo', 'medio', 'alto'] as [string, ...string[]]).default('bajo'), // Removed classification
  uninstall: z.boolean().default(false),
  uninstallTypes: z.array(z.string()).default([]),
  uninstallOther: z.string().optional(),
  collect: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});


type ProjectFormValues = z.infer<typeof projectSchema>;

const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDateFns(d, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClientHook();
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientSearchActive, setIsClientSearchActive] = useState(false);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting: isProjectSubmitting }, setValue, watch } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      date: new Date(),
      status: 'ingresado',
      taxRate: 19,
      region: 'RM',
      subtotal: 0,
      windowsCount: 0,
      squareMeters: 0,
      glosa: '',
      phone: '',
      commune: '',
      address: '',
      // classification: 'bajo', // Removed classification
      uninstall: false,
      uninstallTypes: [],
      collect: false,
      isHidden: false,
    },
  });

  const addProjectMutation = useMutation({
    mutationFn: (projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'>) => addProject(projectData),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Proyecto Creado", description: `El proyecto "${newProject.projectNumber}" ha sido creado exitosamente.` });
      router.push('/projects');
    },
    onError: (error: Error) => {
      toast({ title: "Error al Crear Proyecto", description: error.message || "No se pudo crear el proyecto.", variant: "destructive" });
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
    const total = subtotal * (1 + taxRate / 100);
    const balance = total;

    const projectDataToSave: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      date: data.date,
      subtotal,
      taxRate,
      total,
      balance,
      windowsCount: Number(data.windowsCount) || 0,
      squareMeters: Number(data.squareMeters) || 0,
      description: data.description || '',
      endDate: data.endDate,
      // classification: data.classification || 'bajo', // Removed classification
      phone: data.phone || '',
      address: data.address || '',
      commune: data.commune || '',
      region: data.region || 'RM',
      uninstall: data.uninstall || false,
      uninstallTypes: data.uninstallTypes || [],
      uninstallOther: data.uninstallOther || '',
      glosa: data.glosa || '',
      collect: data.collect || false,
      isHidden: data.isHidden || false,
    };
    addProjectMutation.mutate(projectDataToSave);
  };

  const selectedClientId = watch("clientId");

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

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center gap-4 mb-6 md:mb-8">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Nuevo Proyecto</h1>
          <p className="text-muted-foreground">Complete los detalles para registrar un nuevo proyecto.</p>
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
                          disabled={isLoadingClients || addClientMutation.isPending}
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
                <Input id="projectNumber" {...register("projectNumber")} placeholder="Ej: P2024-001" disabled={addClientMutation.isPending} />
                {errors.projectNumber && <p className="text-sm text-destructive">{errors.projectNumber.message}</p>}
              </div>
            </div>

            {/* Fila 2: Glosa, Fecha de inicio, Estado */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 space-y-2">
                <Label htmlFor="glosa">Glosa / Descripción Breve</Label>
                <Input id="glosa" {...register("glosa")} placeholder="Descripción corta o notas iniciales del proyecto" disabled={addClientMutation.isPending} />
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
                        disabled={addClientMutation.isPending}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={addClientMutation.isPending}>
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
                <Input id="subtotal" type="number" step="any" {...register("subtotal")} placeholder="0" disabled={addClientMutation.isPending}/>
                {errors.subtotal && <p className="text-sm text-destructive">{errors.subtotal.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="taxRate">IVA (%) <span className="text-destructive">*</span></Label>
                <Input id="taxRate" type="number" step="any" {...register("taxRate")} placeholder="19" disabled={addClientMutation.isPending}/>
                {errors.taxRate && <p className="text-sm text-destructive">{errors.taxRate.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="windowsCount">N° Ventanas</Label>
                <Input id="windowsCount" type="number" {...register("windowsCount")} placeholder="0" disabled={addClientMutation.isPending}/>
                {errors.windowsCount && <p className="text-sm text-destructive">{errors.windowsCount.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="squareMeters">M²</Label>
                <Input id="squareMeters" type="number" step="any" {...register("squareMeters")} placeholder="0" disabled={addClientMutation.isPending}/>
                {errors.squareMeters && <p className="text-sm text-destructive">{errors.squareMeters.message}</p>}
              </div>
            </div>

            {/* Fila 4: Teléfono, Comuna, Región */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="phone">Teléfono (Proyecto)</Label>
                <Input id="phone" {...register("phone")} placeholder="Ej: +56912345678" disabled={addClientMutation.isPending}/>
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="commune">Comuna</Label>
                <Input id="commune" {...register("commune")} placeholder="Ej: Las Condes" disabled={addClientMutation.isPending}/>
                {errors.commune && <p className="text-sm text-destructive">{errors.commune.message}</p>}
              </div>
              <div className="md:w-1/3 space-y-2">
                <Label htmlFor="region">Región</Label>
                <Input id="region" {...register("region")} placeholder="Ej: RM" disabled={addClientMutation.isPending}/>
                {errors.region && <p className="text-sm text-destructive">{errors.region.message}</p>}
              </div>
            </div>

            {/* Fila 5: Dirección */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 space-y-2">
                <Label htmlFor="address">Dirección (Proyecto)</Label>
                <Textarea id="address" {...register("address")} placeholder="Dirección donde se realizará el proyecto" disabled={addClientMutation.isPending}/>
                {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
              </div>
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


            <div className="flex justify-end gap-4 pt-8">
              <Button type="button" variant="outline" onClick={() => router.push('/projects')} disabled={addProjectMutation.isPending || isProjectSubmitting || addClientMutation.isPending}>
                <XCircle className="mr-2 h-5 w-5" />
                Cancelar
              </Button>
              <Button type="submit" disabled={addProjectMutation.isPending || isProjectSubmitting || addClientMutation.isPending}>
                {(addProjectMutation.isPending || isProjectSubmitting) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Guardar Proyecto
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
