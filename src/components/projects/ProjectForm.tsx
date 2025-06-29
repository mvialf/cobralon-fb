'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { format as formatDateFns, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos y constantes locales
type ProjectStatus =
  | 'ingresado'
  | 'en_proceso'
  | 'completado'
  | 'facturado'
  | 'pagado'
  | 'cancelado';
type UninstallType = 'retiro_cristales' | 'retiro_marco' | 'retiro_completo' | 'otro';

interface LocalClient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  rut?: string;
  businessName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Servicio para obtener clientes
import { getClients } from '@/services/clientService';

// Función para obtener clientes con el tipo LocalClient
async function fetchClients(): Promise<LocalClient[]> {
  const clients = await getClients();
  // Mapear los clientes al tipo LocalClient
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone || '',
    email: client.email || '',
    address: '', // Este campo podría no existir en Client
    rut: '', // Este campo podría no existir en Client
    businessName: '', // Este campo podría no existir en Client
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  }));
}

// Componentes UI
import { MoneyInput } from '@/components/ui/money-input';
import { TaxRateInput } from '@/components/ui/tax-rate-input';
import { AddressInput } from '@/components/ui/addressInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, PlusCircle } from 'lucide-react';
import ClientModal from '@/components/client-modal';
import { cn } from '@/lib/utils';
import { commandFilter } from '@/utils/search-utils';

// Componentes de formulario de shadcn
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Servicios y tipos
import { getClients as fetchClientsFromService } from '@/services/clientService';
import { UNINSTALL_TYPE_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/lib/constants';
import { FormattedAddress } from '@/components/ui/addressInput'; // Importar el tipo FormattedAddress

// Esquema para la dirección
const addressSchema = z.object({
  textoCompleto: z.string().min(1, 'La dirección es requerida'),
  coordenadas: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  componentes: z
    .object({
      calle: z.string().optional(),
      numero: z.string().optional(),
      comuna: z.string().optional(),
      ciudad: z.string().optional(),
      region: z.string().optional(),
      pais: z.string().optional(),
      codigoPostal: z.string().optional(),
    })
    .optional(),
});

// Esquema principal del formulario
export const projectFormSchema = z
  .object({
    clientId: z.string().min(1, 'Cliente es requerido.'),
    projectNumber: z.string().min(1, 'Número de proyecto es requerido.'),
    glosa: z.string().optional(),
    date: z.date({ required_error: 'Fecha de inicio es requerida.' }),
    status: z.enum(PROJECT_STATUS_OPTIONS as unknown as [string, ...string[]], {
      required_error: 'Estado es requerido.',
    }),
    subtotal: z.preprocess(
      (val) =>
        typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val,
      z
        .number({ invalid_type_error: 'Subtotal debe ser un número.' })
        .min(0, 'Subtotal no puede ser negativo.')
    ),
    taxRate: z.preprocess(
      (val) => {
        if (val === '') return undefined;
        if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
        return val;
      },
      z
        .number({ invalid_type_error: 'IVA debe ser un número.' })
        .min(0, 'El IVA no puede ser negativo.')
        .max(100, 'El IVA no puede ser mayor a 100%')
        .refine(
          (val) => {
            const decimalPart = String(val).split('.')[1];
            return !decimalPart || decimalPart.length <= 2;
          },
          { message: 'Máximo 2 decimales permitidos' }
        )
        .default(19)
    ),
    windowsCount: z.preprocess(
      (val) =>
        val === '' || val === undefined || val === null
          ? 0
          : typeof val === 'string'
            ? parseInt(val, 10)
            : val,
      z.number().int().min(0).optional().default(0)
    ),
    squareMeters: z.preprocess(
      (val) =>
        val === '' || val === undefined || val === null
          ? 0
          : typeof val === 'string'
            ? parseFloat(val)
            : val,
      z.number().min(0).optional().default(0)
    ),
    phone: z.string().optional(),
    fullAddress: addressSchema.optional(),
    description: z.string().optional(),
    uninstall: z.boolean().default(false),
    uninstallTypes: z.array(z.string()).optional().default([]),
  })
  .refine((data) => !!data.fullAddress, {
    message: 'La dirección es requerida. Por favor, selecciónala de la lista.',
    path: ['fullAddress'],
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  onSubmit: SubmitHandler<ProjectFormValues>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  onClientAdd?: (client: Omit<LocalClient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({
  defaultValues = {},
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Guardar',
  onClientAdd,
  onCancel,
}: ProjectFormProps) {
  const {
    data: clients = [],
    isLoading: isLoadingClients,
    refetch: refetchClients,
  } = useQuery<LocalClient[]>({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      clientId: '',
      projectNumber: '',
      glosa: '',
      date: new Date(),
      status: 'en_progreso',
      subtotal: 0,
      taxRate: 19,
      windowsCount: 0,
      squareMeters: 0,
      phone: '',
      description: '',
      uninstall: false,
      uninstallTypes: [],
      fullAddress: {
        textoCompleto: '',
        coordenadas: { latitude: 0, longitude: 0 },
        componentes: {
          calle: '',
          numero: '',
          comuna: '',
          ciudad: '',
          region: '',
          pais: 'Chile',
          codigoPostal: '',
        },
      },
      ...defaultValues,
    },
  });

  const { control, watch, setValue } = form;

  const watchUninstall = watch('uninstall');
  const watchUninstallTypes = watch('uninstallTypes') || [];
  const watchClientId = watch('clientId');

  // Efecto para cargar datos del cliente seleccionado
  useEffect(() => {
    if (watchClientId) {
      const selectedClient = clients.find((c) => c.id === watchClientId);
      if (selectedClient) {
        setValue('phone', selectedClient.phone || '');
        // No intentamos establecer la dirección ya que no es parte del tipo Client
      }
    }
  }, [watchClientId, clients, setValue]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='w-full space-y-3'>
        <div className='w-full gap-3 space-y-1.5'>
          <div className='w-full flex row gap-4'>
            {/* Campo de Cliente */}
            <FormField
              control={form.control}
              name='clientId'
              render={({ field }) => (
                <FormItem className='w-72 space-y-1.5'>
                  <FormLabel>Cliente *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          role='combobox'
                          className='w-full justify-between'
                          disabled={isLoadingClients}
                        >
                          {field.value
                            ? clients.find((client) => client.id === field.value)?.name
                            : 'Seleccionar cliente...'}
                          {isLoadingClients ? (
                            <Loader2 className='ml-2 h-4 w-4 animate-spin' />
                          ) : (
                            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='w-72 p-0' align='start'>
                      <Command filter={commandFilter}>
                        <CommandInput placeholder='Buscar cliente...' />
                        <CommandList>
                          <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name} // Usar el nombre para la búsqueda
                                onSelect={() => {
                                  field.onChange(client.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === client.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {client.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                  {onClientAdd && (
                    <>
                      <ClientModal
                        isOpen={isClientModalOpen}
                        onClose={() => setIsClientModalOpen(false)}
                        onSave={async (newClient) => {
                          try {
                            // Asegurarse de que los tipos sean correctos
                            const clientToAdd = {
                              name: String(newClient.name || ''),
                              email: newClient.email ? String(newClient.email) : undefined,
                              phone: newClient.phone ? String(newClient.phone) : undefined,
                              rut:
                                'rut' in newClient && newClient.rut
                                  ? String(newClient.rut)
                                  : undefined,
                              businessName:
                                'businessName' in newClient && newClient.businessName
                                  ? String(newClient.businessName)
                                  : undefined,
                              address:
                                'address' in newClient && newClient.address
                                  ? String(newClient.address)
                                  : undefined,
                            } as Omit<LocalClient, 'id' | 'createdAt' | 'updatedAt'>;

                            await onClientAdd(clientToAdd);
                            // Recargar la lista de clientes
                            await refetchClients();
                            // Cerrar el modal
                            setIsClientModalOpen(false);
                          } catch (error) {
                            console.error('Error al guardar el cliente:', error);
                          }
                        }}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='mt-1 text-sm text-primary p-0 h-auto'
                        onClick={() => {
                          setIsClientModalOpen(true);
                        }}
                      >
                        <PlusCircle className='mr-2 h-4 w-4' />
                        Agregar nuevo cliente
                      </Button>
                    </>
                  )}
                </FormItem>
              )}
            />

            {/* Campo de Número de Proyecto */}
            <FormField
              control={form.control}
              name='projectNumber'
              render={({ field }) => (
                <FormItem className='w-28 space-y-1.5'>
                  <FormLabel>Proyecto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='flex flex-row gap-4'>
            {/* Glosa */}
            <FormField
              control={form.control}
              name='glosa'
              render={({ field }) => (
                <FormItem className='w-64 space-y-1.5'>
                  <FormLabel>Glosa</FormLabel>
                  <FormControl>
                    <Input placeholder='Descripción breve del proyecto' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Teléfono */}
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem className='w-36 space-y-1.5'>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='flex flex-row gap-4'>
            {/* Campo de Fecha */}
            <FormField
              control={form.control}
              name='date'
              render={({ field }) => (
                <FormItem className='w-52'>
                  <FormLabel>Fecha *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {field.value ? (
                            formatDateFns(field.value, 'PPP', { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0'>
                      <Calendar
                        mode='single'
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo de Estado */}
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='w-48'>
                  <FormLabel>Estado *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Seleccionar estado' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROJECT_STATUS_OPTIONS.map((status) => (
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

          <div className='flex gap-4'>
            {/* Subtotal */}
            <FormField
              control={form.control}
              name='subtotal'
              render={({ field }) => (
                <FormItem className='w-32'>
                  <FormLabel>Subtotal *</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value as number}
                      onValueChange={field.onChange}
                      placeholder='0,00'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* IVA */}
            <FormField
              control={form.control}
              name='taxRate'
              render={({ field }) => (
                <FormItem className='w-16'>
                  <FormLabel>IVA *</FormLabel>
                  <FormControl>
                    <TaxRateInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className='w-full'>
          {/* Dirección */}
          <FormField
            control={form.control}
            name='fullAddress'
            render={({ field }) => (
              <FormItem className='w-full md:col-span-2'>
                <FormLabel>Dirección *</FormLabel>
                <FormControl>
                  <div className='space-y-1'>
                    <AddressInput
                      value={
                        typeof field.value === 'string'
                          ? field.value
                          : field.value?.textoCompleto || ''
                      }
                      onPlaceSelected={(address: FormattedAddress) => {
                        // Asegurarse de que los componentes siempre tengan valores por defecto
                        const componentes = {
                          calle: '',
                          comuna: '',
                          region: '',
                          pais: 'Chile',
                          ...address.componentes,
                        };

                        // Crear el objeto de dirección completo
                        const direccionCompleta = {
                          textoCompleto: address.textoCompleto,
                          coordenadas: address.coordenadas || { latitude: 0, longitude: 0 },
                          componentes,
                        };

                        // Actualizar el valor del campo
                        field.onChange(direccionCompleta);
                      }}
                      placeholder='Buscar dirección...'
                      className='w-full'
                    />
                    {field.value?.textoCompleto && (
                      <div className='mt-1 text-sm text-muted-foreground'>
                        {field.value.textoCompleto}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          {/* Descripción */}
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem className='w-full md:col-span-2'>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder='Descripción detallada del proyecto...' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='flex flex-row gap-4'>
          {/* Contadores */}
          <FormField
            control={form.control}
            name='windowsCount'
            render={({ field }) => (
              <FormItem className='w-24'>
                <FormLabel>N° Ventanas</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min='0'
                    {...field}
                    value={field.value || ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='squareMeters'
            render={({ field }) => (
              <FormItem className='w-24'>
                <FormLabel>m²</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    min='0'
                    {...field}
                    value={field.value || ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          {/* Opciones de Desinstalación */}
          <div className='space-y-4 md:col-span-2'>
            <FormField
              control={form.control}
              name='uninstall'
              render={({ field }) => (
                <FormItem className='flex items-center space-x-2'>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className='!mt-0'>Requiere desinstalación</FormLabel>
                </FormItem>
              )}
            />

            {watchUninstall && (
              <div className='pl-6 space-y-2'>
                <Label>Tipos de desinstalación</Label>
                <div className='flex flex-wrap gap-2'>
                  {UNINSTALL_TYPE_OPTIONS.map((type) => (
                    <div key={type} className='flex items-center space-x-2'>
                      <Checkbox
                        id={`uninstall-${type}`}
                        checked={watchUninstallTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...watchUninstallTypes, type]
                            : watchUninstallTypes.filter((t) => t !== type);
                          setValue('uninstallTypes', newTypes);
                        }}
                      />
                      <Label htmlFor={`uninstall-${type}`} className='font-normal'>
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botones del formulario */}
          <div className='flex justify-end space-x-4 pt-6'>
            {onCancel && (
              <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
            )}
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {submitButtonText}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default ProjectForm;
