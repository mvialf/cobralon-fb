
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
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EventType } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { enrichEventTitle } from '@/ai/flows/enrich-event-title';
import { Wand2, Trash2, Save, Loader2, RefreshCw } from 'lucide-react';
import { startOfDay, endOfDay, format } from '@/lib/calendar-utils';
import { getReferencesByType, type ReferenceItem } from '@/services/eventReferenceService';
// Importar el componente ProjectModal
import { ProjectModal } from '@/components/modals/events/ProjectModal';

interface EventModalProps {
  isOpen: boolean;
  eventData?: EventType | Partial<Omit<EventType, 'id'>> | null;
  onClose: () => void;
  onSave: (event: Omit<EventType, 'id'> & { id?: string }) => void;
  onDelete?: (eventId: string) => void;
  preSelectedType?: 'Proyecto' | 'Postventa' | 'Visita';
}

const defaultColor = 'hsl(var(--primary))';

export function EventModal({
  isOpen,
  eventData,
  onClose,
  onSave,
  onDelete,
  preSelectedType,
}: EventModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [type, setType] = useState<'Proyecto' | 'Postventa' | 'Visita' | ''>('');
  const [referenceId, setReferenceId] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [availableReferences, setAvailableReferences] = useState<ReferenceItem[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Estado para controlar si se debe mostrar la modal específica de proyecto
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Cargar opciones de referencia según el tipo seleccionado
  const loadReferenceOptions = async (selectedType: 'Proyecto' | 'Postventa' | 'Visita') => {
    try {
      setLoadingReferences(true);
      const references = await getReferencesByType(selectedType);
      setAvailableReferences(references);
      
      if (references.length === 0) {
        toast({
          title: "Sin opciones disponibles",
          description: `No se encontraron ${selectedType.toLowerCase()}s disponibles.`,
        });
      }
    } catch (error) {
      console.error(`Error al cargar referencias de ${selectedType}:`, error);
      toast({
        title: "Error",
        description: `No se pudieron cargar los ${selectedType.toLowerCase()}s disponibles.`,
        variant: "destructive"
      });
      setAvailableReferences([]);
    } finally {
      setLoadingReferences(false);
    }
  };

  useEffect(() => {
    if (eventData) {
      // Editando un evento existente
      setCurrentId((eventData as EventType).id);
      setName(eventData.name || '');

      const start = eventData.startDate ? new Date(eventData.startDate) : new Date();
      setStartDate(start);

      // Default end date to same day as start if not provided or if it's an old event before endOfDay logic
      const end = eventData.endDate ? new Date(eventData.endDate) : start;
      setEndDate(end);

      setDescription(eventData.description || '');
      setColor(eventData.color || defaultColor);
      
      const eventType = (eventData as EventType).type || '';
      setType(eventType);
      setReferenceId((eventData as EventType).referenceId || '');
      setStatus((eventData as EventType).status);
      
      // Si es un evento existente con tipo, cargar las referencias disponibles
      if (eventType) {
        loadReferenceOptions(eventType);
      }
    } else {
      // Creando un nuevo evento
      const now = new Date();
      setCurrentId(undefined);
      setName('');
      setStartDate(now);
      setEndDate(now);
      setDescription('');
      setColor(defaultColor);
      
      // Si hay un tipo preseleccionado, usarlo
      if (preSelectedType) {
        setType(preSelectedType);
        loadReferenceOptions(preSelectedType);
      } else {
        setType('');
      }
      
      setReferenceId('');
      setStatus(undefined);
      setAvailableReferences([]);
    }
  }, [eventData, preSelectedType]);

  useEffect(() => {
    if (isOpen) {
      // Aplicar el tipo pre-seleccionado si está disponible
      if (preSelectedType) {
        setType(preSelectedType);
        loadReferenceOptions(preSelectedType);
        
        // Si es un proyecto, mostrar la modal específica de proyecto
        if (preSelectedType === 'Proyecto') {
          setShowProjectModal(true);
        } else {
          setShowProjectModal(false);
        }
      }
    } else {
      // Reiniciar estado cuando se cierra la modal
      setShowProjectModal(false);
    }
  }, [isOpen, preSelectedType]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error de Validación", description: "El nombre de la tarea es obligatorio.", variant: "destructive" });
      return;
    }
    
    if (!type) {
      toast({ title: "Error de Validación", description: "El tipo de evento es obligatorio.", variant: "destructive" });
      return;
    }
    
    if (!referenceId) {
      toast({ title: "Error de Validación", description: `Debe seleccionar un ${type.toLowerCase()} de referencia.`, variant: "destructive" });
      return;
    }

    if (!startDate || !endDate) {
      toast({ title: "Error de Validación", description: "Las fechas son obligatorias.", variant: "destructive" });
      return;
    }

    const finalStartDate = startOfDay(startDate);
    const finalEndDate = endOfDay(endDate);

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
      type,
      referenceId,
      status,
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
    if (!startDate) {
      toast({ title: "Error", description: "La fecha de inicio no está definida.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        const taskStartDate = startOfDay(startDate);
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

  const handleProjectSave = (data: any) => {
    // Construir un objeto de evento compatible con el formato esperado
    // Aseguramos que el tipo sea exactamente uno de los valores permitidos
    const eventToSave: Omit<EventType, 'id'> & { id?: string } = {
      name: `Proyecto: ${data.projectNumber}${data.glosa ? ` - ${data.glosa}` : ''}`,
      startDate: startOfDay(startDate || new Date()),
      endDate: endDate ? endOfDay(endDate) : endOfDay(startDate || new Date()),
      description: data.description || '',
      color: color,
      type: 'Proyecto', // Este valor ya es uno de los permitidos en EventType
      referenceId: data.projectId,
      status: undefined,
      ...(currentId && { id: currentId }),
      // Los datos específicos del proyecto podemos almacenarlos en el campo 'metadata' si existe en EventType
      // o podemos guardarlos en otro lugar como Firestore si es necesario
      // Por ahora, podemos almacenarlos en el campo description si es importante
      // O podemos extender EventType para incluir estos campos adicionales
    };
    
    // Si queremos guardar información adicional como el checklist, podríamos usar
    // localStorage o una base de datos para mantener esa información asociada al evento
    if (data.checklist && data.checklist.length > 0) {
      // Aquí podríamos implementar lógica para guardar el checklist en otra parte
      // Por ahora, lo agregamos a la descripción como texto
      const checklistText = data.checklist
        .map((item: any) => `[${item.isCompleted ? 'x' : ' '}] ${item.description}`)
        .join('\n');
      eventToSave.description = `${eventToSave.description}\n\nChecklist:\n${checklistText}`;
    }
    
    // Llamar a la función onSave con los datos del evento
    onSave(eventToSave);
    onClose();
  };

  // Renderizar la modal de proyecto específica si el tipo es 'Proyecto'
  if (type === 'Proyecto' && showProjectModal) {
    // Datos iniciales para la modal de proyecto
    const initialProjectData = {
      projectId: referenceId || '',
      description: description || '',
      // Extraer checklist si existe en la descripción
      checklist: [],
    };
    
    return (
      <ProjectModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleProjectSave}
        initialData={initialProjectData}
        isSubmitting={isPending}
      />
    );
  }
  
  // Modal genérica para otros tipos de eventos
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

            <div className="grid gap-3">
              <Label htmlFor="event-type" className="text-sm font-medium">Tipo de Evento</Label>
              <Select 
                value={type} 
                onValueChange={(value: 'Proyecto' | 'Postventa' | 'Visita') => {
                  setType(value);
                  setReferenceId(''); // Resetear ID de referencia al cambiar el tipo
                  loadReferenceOptions(value);
                }}
                required
              >
                <SelectTrigger id="event-type" className="w-full">
                  <SelectValue placeholder="Selecciona un tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Proyecto">Proyecto</SelectItem>
                  <SelectItem value="Postventa">Postventa</SelectItem>
                  <SelectItem value="Visita">Visita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="reference" className="text-sm font-medium">
                  {type === 'Proyecto' ? 'Seleccionar Proyecto' : 
                   type === 'Postventa' ? 'Seleccionar Servicio Postventa' : 
                   type === 'Visita' ? 'Seleccionar Visita' :
                   'Seleccionar Referencia'}
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  disabled={!type || loadingReferences} 
                  onClick={() => type && loadReferenceOptions(type)} 
                  title="Actualizar opciones"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingReferences ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Select 
                value={referenceId} 
                onValueChange={(value) => {
                  setReferenceId(value);
                  // Buscar el estado de la referencia seleccionada y actualizarlo
                  const selectedRef = availableReferences.find(ref => ref.id === value);
                  if (selectedRef && selectedRef.status) {
                    setStatus(selectedRef.status);
                  }
                }}
                disabled={!type || availableReferences.length === 0}
                required
              >
                <SelectTrigger id="reference" className="w-full">
                  <SelectValue placeholder={type ? 
                    `Selecciona un ${type.toLowerCase()}` : 
                    "Primero selecciona un tipo"} 
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableReferences.map((ref) => (
                    <SelectItem key={ref.id} value={ref.id}>
                      {ref.name} {ref.status && `(${ref.status})`}
                    </SelectItem>
                  ))}
                  {availableReferences.length === 0 && type && (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {loadingReferences ? 
                        "Cargando opciones..." : 
                        `No hay ${type.toLowerCase()} disponibles.`}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {status && (
                <div className="text-xs text-muted-foreground">
                  Estado actual: <span className="font-medium">{status}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Fecha de Inicio</Label>
                <DatePicker
                  date={startDate}
                  onSelect={setStartDate}
                  calendarProps={{
                    fromYear: new Date().getFullYear() - 1,
                    toYear: new Date().getFullYear() + 5,
                  }}
                />
              </div>
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Fecha de Fin</Label>
                <DatePicker
                  date={endDate}
                  onSelect={setEndDate}
                  calendarProps={{
                    fromYear: new Date().getFullYear() - 1,
                    toYear: new Date().getFullYear() + 5,
                  }}
                />
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
