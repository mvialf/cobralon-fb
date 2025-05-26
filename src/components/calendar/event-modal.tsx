
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionContent, // Alias to avoid conflict
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleContent, // Alias to avoid conflict
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EventType } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { enrichEventTitle } from '@/ai/flows/enrich-event-title';
import { Wand2, Trash2, Save, Loader2 } from 'lucide-react';
import { startOfDay, endOfDay, format } from '@/lib/calendar-utils';

interface EventModalProps {
  isOpen: boolean;
  eventData?: EventType | Partial<Omit<EventType, 'id'>> | null;
  onClose: () => void;
  onSave: (event: Omit<EventType, 'id'> & { id?: string }) => void;
  onDelete?: (eventId: string) => void;
}

const defaultColor = 'hsl(var(--primary))';

export function EventModal({
  isOpen,
  eventData,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [name, setName] = useState('');
  const [startDateString, setStartDateString] = useState('');
  const [endDateString, setEndDateString] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const formatDateForInput = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  useEffect(() => {
    if (eventData) {
      setCurrentId((eventData as EventType).id);
      setName(eventData.name || '');

      const start = eventData.startDate ? new Date(eventData.startDate) : new Date();
      setStartDateString(formatDateForInput(start));

      // Default end date to same day as start if not provided or if it's an old event before endOfDay logic
      const end = eventData.endDate ? new Date(eventData.endDate) : start;
      setEndDateString(formatDateForInput(end));

      setDescription(eventData.description || '');
      setColor(eventData.color || defaultColor);
    } else {
      // New event, default to today
      const now = new Date();
      setCurrentId(undefined);
      setName('');
      setStartDateString(formatDateForInput(now));
      setEndDateString(formatDateForInput(now)); // Default end date is same as start for a new task
      setDescription('');
      setColor(defaultColor);
    }
  }, [eventData]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error de Validación", description: "El nombre de la tarea es obligatorio.", variant: "destructive" });
      return;
    }

    const finalStartDate = startOfDay(new Date(startDateString + 'T00:00:00')); // Ensure time is start of day in local timezone
    const finalEndDate = endOfDay(new Date(endDateString + 'T00:00:00')); // Ensure time is end of day in local timezone


    if (finalEndDate < finalStartDate) {
      toast({ title: "Error de Validación", description: "La fecha de fin no puede ser anterior a la fecha de inicio.", variant: "destructive" });
      return;
    }

    const eventToSave: Omit<EventType, 'id'> & { id?: string } = {
      name,
      startDate: finalStartDate,
      endDate: finalEndDate,
      description,
      color,
    };
    if (currentId) {
      eventToSave.id = currentId;
    }
    onSave(eventToSave);
  };

  const handleDelete = () => {
    if (currentId && onDelete) {
      onDelete(currentId);
    }
  };

  const handleEnrichTitle = async () => {
    if (!name.trim()) {
      toast({ title: "No se puede Enriquecer", description: "Por favor, introduce un título primero.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        const taskStartDate = startOfDay(new Date(startDateString));
        const result = await enrichEventTitle({
          title: name,
          description: description,
          startDate: taskStartDate,
        });
        if (result.enrichedTitle) {
          setName(result.enrichedTitle);
          toast({ title: "¡Título Enriquecido!", description: "La IA ha sugerido un nuevo título." });
        } else {
          toast({ title: "Fallo al Enriquecer", description: "No se pudo enriquecer el título.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error enriching title:", error);
        toast({ title: "Error", description: "Fallo al enriquecer el título debido a un error.", variant: "destructive" });
      }
    });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[480px] shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {currentId ? 'Editar Tarea' : 'Añadir Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>
            {currentId ? 'Modifica los detalles de la tarea existente.' : 'Ingresa los detalles para una nueva tarea.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-6 py-6 px-2">
            <div className="grid gap-3">
              <Label htmlFor="name" className="text-sm font-medium">Nombre de la Tarea</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Ej: Comprar víveres"
                  className="flex-grow"
                  required
                />
                <Button type="button" variant="outline" size="icon" onClick={handleEnrichTitle} disabled={isPending || !name.trim()} aria-label="Enriquecer Título con IA">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="start-date" className="text-sm font-medium">Fecha de Inicio</Label>
                <Input id="start-date" type="date" value={startDateString} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDateString(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="end-date" className="text-sm font-medium">Fecha de Fin</Label>
                <Input id="end-date" type="date" value={endDateString} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDateString(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Opcional: Añade más detalles sobre la tarea"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="color" className="text-sm font-medium">Color de la Tarea</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color-text"
                  type="text"
                  value={color}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  placeholder="Ej: #BA68C8 o azul"
                  className="flex-grow"
                />
                <Input
                  id="color-picker"
                  type="color"
                  value={color.startsWith('#') ? color : '#000000'} // type="color" needs hex
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
                  aria-label="Elegir color de la tarea"
                />
              </div>
               <p className="text-xs text-muted-foreground">Introduce un código hexadecimal (ej: #BA68C8) o usa el selector de color.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {currentId && onDelete && (
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitleContent>¿Estás seguro?</AlertDialogTitleContent> 
                    <AlertDialogDescriptionContent>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea.
                    </AlertDialogDescriptionContent>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Sí, eliminar tarea
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="mr-2 h-4 w-4" /> Guardar Tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
