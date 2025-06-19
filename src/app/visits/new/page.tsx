"use client";

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addVisit } from '@/services/visitService';

import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { VisitStatus, VISIT_STATUS_OPTIONS, DEFAULT_VISIT_STATUS } from '@/types/visit';

// Usar el array de opciones directamente para la validación
const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  phone: z.string().min(9, { message: 'El teléfono debe tener al menos 9 dígitos.' }),
  status: z.enum(VISIT_STATUS_OPTIONS as [string, ...string[]], { 
    required_error: 'Debe seleccionar un estado.' 
  }),
  address: z.string().min(5, { message: 'La dirección debe tener al menos 5 caracteres.' }),
  municipality: z.string().min(3, { message: 'La comuna debe tener al menos 3 caracteres.' }),
  observations: z.string().optional(),
  scheduledDate: z.date({
    required_error: 'La fecha programada es requerida',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewVisitPage() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      status: DEFAULT_VISIT_STATUS,
      address: '',
      municipality: '',
      observations: '',
      scheduledDate: new Date(),
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Preparar los datos para guardar
      const visitData = {
        ...data,
        // Asegurarse de que el status sea del tipo correcto
        status: data.status as VisitStatus,
        // Asegurarse de que la fecha sea un objeto Date
        scheduledDate: data.scheduledDate || new Date(),
      };
      
      // Guardar en Firestore
      await addVisit(visitData);
      
      // Mostrar mensaje de éxito
      toast({
        title: 'Visita Creada',
        description: 'La visita se ha registrado correctamente.',
      });
      
      // Redirigir a la lista de visitas
      router.push('/visits');
      
    } catch (error) {
      console.error('Error al guardar la visita:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la visita. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Nueva Visita</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-lg border p-6 max-w-[700px]">
          {/* Fila 1 */}
          <div className="flex flex-col md:flex-row gap-6 py-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full md:w-1/2">
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input  {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="w-full md:w-1/4">
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="w-full md:w-1/4">
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISIT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Fila 2 */}
          <div className="flex flex-col md:flex-row py-3 gap-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="w-full md:w-2/3">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem className="w-full md:w-1/3">
                  <FormLabel>Comuna</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Fila 3 - Fecha programada */}
          <div className="flex flex-col md:flex-row py-3 gap-6">
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem className="flex flex-col w-full md:w-1/2">
                  <FormLabel>Fecha programada</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Fila 4 - Observaciones */}
          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem className="py-3 w-full">
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[100px]"
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
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
