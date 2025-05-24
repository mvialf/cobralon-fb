"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

interface EventModalProps {
  isOpen: boolean;
  eventData?: EventType | Partial<Omit<EventType, 'id'>> | null;
  onClose: () => void;
  onSave: (event: Omit<EventType, 'id'> & { id?: string }) => void;
  onDelete?: (eventId: string) => void;
}

const defaultColor = 'hsl(var(--primary))'; // Default to primary color

export function EventModal({
  isOpen,
  eventData,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();


  useEffect(() => {
    if (eventData) {
      setCurrentId((eventData as EventType).id);
      setName(eventData.name || '');
      
      const start = eventData.startDate ? new Date(eventData.startDate) : new Date();
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().substring(0, 5));

      const end = eventData.endDate ? new Date(eventData.endDate) : new Date(start.getTime() + 3600000); // Default 1 hour duration
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().substring(0, 5));
      
      setDescription(eventData.description || '');
      setColor(eventData.color || defaultColor);
    } else {
      // New event, default to now + 1 hour
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);
      setCurrentId(undefined);
      setName('');
      setStartDate(now.toISOString().split('T')[0]);
      setStartTime(now.toTimeString().substring(0, 5));
      setEndDate(oneHourLater.toISOString().split('T')[0]);
      setEndTime(oneHourLater.toTimeString().substring(0, 5));
      setDescription('');
      setColor(defaultColor);
    }
  }, [eventData]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error de Validación", description: "El nombre del evento es obligatorio.", variant: "destructive" });
      return;
    }

    const combinedStartDate = new Date(`${startDate}T${startTime}`);
    const combinedEndDate = new Date(`${endDate}T${endTime}`);

    if (combinedEndDate < combinedStartDate) {
      toast({ title: "Error de Validación", description: "La fecha de fin no puede ser anterior a la fecha de inicio.", variant: "destructive" });
      return;
    }
    
    const eventToSave: Omit<EventType, 'id'> & { id?: string } = {
      name,
      startDate: combinedStartDate,
      endDate: combinedEndDate,
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
        const combinedStartDate = new Date(`${startDate}T${startTime}`);
        const result = await enrichEventTitle({
          title: name,
          description: description,
          startDate: combinedStartDate,
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
            {currentId ? 'Editar Evento' : 'Añadir Nuevo Evento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-6 py-6 px-2">
            <div className="grid gap-3">
              <Label htmlFor="name" className="text-sm font-medium">Nombre del Evento</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Ej: Reunión de equipo"
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
                <Input id="start-date" type="date" value={startDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="start-time" className="text-sm font-medium">Hora de Inicio</Label>
                <Input id="start-time" type="time" value={startTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="end-date" className="text-sm font-medium">Fecha de Fin</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="end-time" className="text-sm font-medium">Hora de Fin</Label>
                <Input id="end-time" type="time" value={endTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} required />
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Opcional: Añade más detalles sobre el evento"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="color" className="text-sm font-medium">Color del Evento</Label>
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
                  aria-label="Elegir color del evento"
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
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente el evento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Sí, eliminar evento
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
              <Save className="mr-2 h-4 w-4" /> Guardar Evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
