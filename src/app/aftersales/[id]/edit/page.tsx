"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';
import { getProjects } from '@/services/projectService';
import { getAfterSalesById, updateAfterSales } from '@/services/afterSalesService';
import type { AfterSales } from '@/types/afterSales';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

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
});

type FormValues = z.infer<typeof formSchema>;

export default function EditAfterSalePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const afterSaleId = params.id as string;

  const { data: afterSaleData, isLoading: isLoadingAfterSale } = useQuery<AfterSales | null>({
    queryKey: ['afterSale', afterSaleId],
    queryFn: () => getAfterSalesById(afterSaleId),
    enabled: !!afterSaleId,
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (afterSaleData) {
      form.reset({
        projectId: afterSaleData.projectId,
        description: afterSaleData.description || '',
        entryDate: afterSaleData.entryDate ? new Date(afterSaleData.entryDate) : new Date(),
        afterSalesStatus: afterSaleData.afterSalesStatus,
      });
    }
  }, [afterSaleData, form]);

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => updateAfterSales(afterSaleId, data),
    onSuccess: () => {
      toast({
        title: 'Postventa actualizada',
        description: 'El registro de postventa ha sido actualizado correctamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['afterSales'] });
      queryClient.invalidateQueries({ queryKey: ['afterSale', afterSaleId] });
      router.push('/aftersales');
    },
    onError: (error) => {
      toast({
        title: 'Error al actualizar',
        description: 'No se pudo actualizar el registro. Intente nuevamente.',
        variant: 'destructive',
      });
      console.error('Error:', error);
    },
  });

  const onSubmit = (data: FormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoadingAfterSale || isLoadingProjects) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!afterSaleData) {
    return <div className="text-center mt-10">No se encontró el registro de postventa.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Editar Postventa</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-lg border p-6 max-w-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Proyecto</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value
                            ? projects.find((p) => p.id === field.value)?.clientName
                            : 'Seleccionar proyecto'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar proyecto..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron proyectos.</CommandEmpty>
                          <CommandGroup>
                            {projects.map((project) => (
                              <CommandItem
                                value={project.id}
                                key={project.id}
                                onSelect={() => {
                                  form.setValue('projectId', project.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    project.id === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {project.clientName}
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

            <div className="flex w-full gap-4">
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div>
          <FormField
                control={form.control}
                name="afterSalesStatus"
                render={({ field }) => (
                  <FormItem className="w-1/2 flex flex-col">
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {afterSalesStatusOptions.map((status) => (
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
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción Detallada</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describa el problema o solicitud..."
                    className="min-h-[120px]"
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
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
