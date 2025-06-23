// src/app/projects/new/page.tsx
"use client";

import type { SubmitHandler } from 'react-hook-form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient as useQueryClientHook } from '@tanstack/react-query';
import { useState } from 'react';
import { format as formatDateFns, parseISO } from 'date-fns';
import {MoneyInput} from '@/components/ui/money-input';
import type { ProjectType } from '@/types/project';
import type { Client } from '@/types/client';
import { addProject } from '@/services/projectService';
import { getClients, addClient as addClientService } from '@/services/clientService';
import { useToast } from '@/hooks/use-toast';
import { UNINSTALL_TYPE_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaxRateInput } from '@/components/ui/tax-rate-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronsUpDown, Loader2, Save, XCircle, PlusCircle, ArrowLeftToLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ClientModal from '@/components/client-modal';
import { Switch } from '@/components/ui/switch';
import { AddressInput, FormattedAddress } from '@/components/ui/addressInput'; // Importamos el componente y el tipo

// Schema para el objeto de dirección que viene de nuestro componente
const addressSchema = z.object({
  textoCompleto: z.string().optional(),
  coordenadas: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  componentes: z.object({
    calle: z.string().optional(),
    numero: z.string().optional(),
    comuna: z.string().optional(),
    ciudad: z.string().optional(),
    region: z.string().optional(),
    pais: z.string().optional(),
    codigoPostal: z.string().optional(),
  }).optional(),
}).optional();

// Schema principal del formulario
const projectSchema = z.object({
  clientId: z.string().min(1, "Cliente es requerido."),
  projectNumber: z.string().min(1, "Número de proyecto es requerido."),
  glosa: z.string().optional(),
  date: z.date({ required_error: "Fecha de inicio es requerida." }),
  status: z.enum(PROJECT_STATUS_OPTIONS as unknown as [string, ...string[]], {
    required_error: "Estado es requerido."
  }),
  subtotal: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val),
    z.number({ invalid_type_error: "Subtotal debe ser un número." }).min(0, "Subtotal no puede ser negativo.")
  ),
  taxRate: z.preprocess(
    (val) => {
      if (val === '') return undefined;
      if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
      return val;
    },
    z.number({ invalid_type_error: "IVA debe ser un número." })
    .min(0, "El IVA no puede ser negativo.")
    .max(100, "El IVA no puede ser mayor a 100%")
    .refine( (val) => {
        const decimalPart = String(val).split('.')[1];
        return !decimalPart || decimalPart.length <= 2;
      }, { message: "Máximo 2 decimales permitidos" }
    )
    .default(19)
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
  
  // Reemplazamos los campos individuales por un único objeto
  fullAddress: addressSchema.optional(),

  description: z.string().optional(),
  uninstall: z.boolean().default(false),
  uninstallTypes: z.array(z.string()).optional().default([]),
  collect: z.boolean().default(false),
  isHidden: z.boolean().default(false),
}).refine(data => !!data.fullAddress, {
  message: "La dirección es requerida. Por favor, selecciónala de la lista.",
  path: ["fullAddress"],
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
  const [openUninstallTypesPopover, setOpenUninstallTypesPopover] = useState(false);


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
      subtotal: 0,
      windowsCount: 0,
      squareMeters: 0,
      glosa: '',
      phone: '',
      description: '',
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
    if (!data.fullAddress) {
      toast({ title: "Error de Validación", description: "Es necesario seleccionar una dirección válida.", variant: "destructive" });
      return;
    }

    const subtotal = Number(data.subtotal) || 0;
    const taxRate = Number(data.taxRate) || 0;
    const total = subtotal * (1 + taxRate / 100);
    const balance = total;

    const projectDataToSave: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt'> = {
      // Campos existentes
      clientId: data.clientId,
      projectNumber: data.projectNumber,
      date: data.date,
      status: data.status,
      subtotal,
      taxRate,
      total,
      balance,
      windowsCount: Number(data.windowsCount) || 0,
      squareMeters: Number(data.squareMeters) || 0,
      glosa: data.glosa || '',
      phone: data.phone || '',
      description: data.description || '',
      uninstall: data.uninstall || false,
      uninstallTypes: Array.isArray(data.uninstallTypes) ? data.uninstallTypes : [],
      collect: data.collect || false,
      isHidden: data.isHidden || false,
      
      // Mapeo desde el nuevo objeto de dirección (con manejo de valores opcionales)
      address: data.fullAddress?.textoCompleto || '',
      commune: data.fullAddress?.componentes?.comuna || '',
      region: data.fullAddress?.componentes?.region || '',
      // Nota: las coordenadas no se almacenan en ProjectType
      // Podríamos almacenarlas en un campo adicional o en otra colección si se necesitan
    };
    addProjectMutation.mutate(projectDataToSave);
  };

  const uninstallActive = watch("uninstall");
  const selectedUninstallTypes = watch("uninstallTypes") || [];

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

  // Función para conectar AddressInput con react-hook-form
  const handleAddressSelect = (address: FormattedAddress | null) => {
    if (address) {
      setValue('fullAddress', address, { shouldValidate: true, shouldDirty: true });
    } else {
      setValue('fullAddress', undefined, { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <div className="max-w-[900px] flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <Link href="/projects" passHref legacyBehavior>
            <Button variant="outline" size="icon" aria-label="Volver a Proyectos">
              <ArrowLeftToLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Nuevo Proyecto</h1>
            <p className="text-muted-foreground">Complete los detalles para registrar un nuevo proyecto.</p>
          </div>
        </div>
      </header>

      <Card className="w-full flex-grow shadow-lg">
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
                        <Button variant="outline" role="combobox" aria-expanded={openClientCombobox} className="w-full justify-between" disabled={isLoadingClients || addClientMutation.isPending}>
                          {field.value ? clients.find((client) => client.id === field.value)?.name : "Seleccionar cliente..."}
                          {isLoadingClients ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar cliente..."
                            onValueChange={(search) => { setIsClientSearchActive(search.length > 0); }}
                          />
                          <CommandList>
                            <CommandEmpty><span className="text-sm">No se encontró ningún cliente.</span></CommandEmpty>
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
                                    <Check className={cn("mr-2 h-4 w-4", field.value === client.id ? "opacity-100" : "opacity-0")} />
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                            <CommandItem onSelect={handleOpenClientModal} className="cursor-pointer text-primary hover:bg-accent/50">
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
                    <Input type="date" id="date" value={field.value ? formatDateForInput(field.value) : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} onBlur={field.onBlur} ref={field.ref} disabled={addClientMutation.isPending}/>
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
                      <SelectTrigger id="status"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUS_OPTIONS.map((statusOption) => (
                          <SelectItem key={statusOption} value={statusOption}>{statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}</SelectItem>
                        ))}
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
                <Controller name="subtotal" control={control} render={({ field }) => (<MoneyInput id="subtotal" value={field.value} onValueChange={(value) => field.onChange(value)} placeholder="0" disabled={addClientMutation.isPending}/>)}/>
                {errors.subtotal && <p className="text-sm text-right text-destructive">{errors.subtotal.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"> 
                <Label htmlFor="taxRate">IVA  <span className="text-destructive">*</span></Label>
                <Controller name="taxRate" control={control} render={({ field }) => (<TaxRateInput id="taxRate" className="text-right" value={field.value} onChange={(value) => field.onChange(value === '' ? '' : Number(value))} onBlur={field.onBlur} suffix="%" disabled={addClientMutation.isPending}/>)}/>
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

            {/* SECCIÓN DE DIRECCIÓN ACTUALIZADA */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium ">Ubicación del Proyecto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Controller
                    name="fullAddress"
                    control={control}
                    render={({ field }) => (
                      <AddressInput
                        label="Dirección *"
                        onPlaceSelected={handleAddressSelect}
                        // Solo pasamos las propiedades seguras y evitamos pasar el objeto 'value'
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        // Pasamos el texto completo como defaultValue si existe
                        defaultValue={field.value?.textoCompleto || ''}
                      />
                    )}
                  />
                  {errors.fullAddress && <p className="text-sm font-medium text-destructive mt-1">{errors.fullAddress.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono de Contacto (en obra)</Label>
                  <Input id="phone" {...register("phone")} disabled={addClientMutation.isPending}/>
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Detalles Adicionales de la Dirección</Label>
                  <Input id="description" {...register("description")} disabled={addClientMutation.isPending}/>
                  {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>
              </div>
            </div>

            {/* Sección de desinstalación y otros */}
            <div className="flex items-start space-x-6 pt-4">
              <div className="flex items-center space-x-2">
                <Controller name="uninstall" control={control} render={({ field }) => (<Switch id="uninstall" checked={field.value} onCheckedChange={field.onChange} disabled={addClientMutation.isPending || isProjectSubmitting}/>)}/>
                <Label htmlFor="uninstall">Incluye desinstalación</Label>
              </div>
              {errors.uninstall && <p className="text-sm text-destructive">{errors.uninstall.message}</p>}
              {uninstallActive && (
                <div className="pl-6 space-y-4 border-l-2 border-muted ml-2 w-80">
                  <div>
                    <Label htmlFor="uninstallTypes">Tipos de Desinstalación</Label>
                    <Controller
                      name="uninstallTypes"
                      control={control}
                      render={({ field }) => (
                        <Popover open={openUninstallTypesPopover} onOpenChange={setOpenUninstallTypesPopover}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between mt-1" disabled={isProjectSubmitting}>
                              {selectedUninstallTypes.length > 0 ? selectedUninstallTypes.join(', ') : "Seleccionar tipos..."}
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
                                    <CommandItem key={option} onSelect={() => {
                                      const currentValues = field.value || [];
                                      const newValues = currentValues.includes(option) ? currentValues.filter(val => val !== option) : [...currentValues, option];
                                      field.onChange(newValues);
                                    }}>
                                      <Checkbox className="mr-2" checked={field.value?.includes(option)} onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        const newValues = checked ? [...currentValues, option] : currentValues.filter(val => val !== option);
                                        field.onChange(newValues);
                                      }}/>
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
            
            <div className="flex flex-row justify-start gap-4 items-center w-96 space-y-2">
              <Label>Valor Total:</Label>
              <MoneyInput value={(Number(watch("subtotal")) || 0) * (1 + (Number(watch("taxRate")) || 0) / 100)} readOnly disabled className="w-60 text-right"/>
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

      <ClientModal isOpen={isClientModalOpen} onClose={handleCloseClientModal} onSave={handleSaveNewClientFromModal} />
    </div>
  );
}
