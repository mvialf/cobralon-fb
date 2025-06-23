"use client";

import { useState, useEffect, useMemo } from 'react';
import type { EventType, ViewOption } from '@/types/event';
import { CalendarView } from '@/components/calendar/calendar-view';
import { EventModal } from '@/components/calendar/event-modal';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { db } from '@/lib/firebase/client'; // Importar la instancia db configurada
import { getEvents, addEvent, updateEvent, deleteEvent } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, isSameDay, parseISO } from '@/lib/calendar-utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';

// Skeleton components for loading state
const ToolbarSkeleton = () => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-border bg-card rounded-t-lg animate-pulse">
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="h-10 w-20 bg-muted/70 rounded-md"></div> {/* Today Button */}
      <div className="h-10 w-10 bg-muted/70 rounded-md"></div> {/* Prev Button */}
      <div className="h-10 w-10 bg-muted/70 rounded-md"></div> {/* Next Button */}
      <div className="h-6 w-40 bg-muted/70 rounded-md ml-2"></div> {/* Title */}
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
      <div className="h-10 sm:w-48 w-full bg-muted/70 rounded-md"></div> {/* Filter */}
      <div className="h-10 sm:w-[120px] w-full bg-muted/70 rounded-md"></div> {/* View Select */}
      <div className="h-10 sm:w-32 w-full bg-muted/70 rounded-md"></div> {/* Add Event */}
    </div>
  </div>
);

const CalendarViewSkeleton = () => (
  <div className="flex-grow overflow-auto p-0 sm:p-2 md:p-4 animate-pulse">
    <div className="h-full w-full bg-muted/70 rounded-lg"></div> {/* Calendar area */}
  </div>
);

export default function CalReactAppPage() {
  // TODO: Configura Firebase y obtén la instancia de db y el userId del usuario autenticado.
  // const db = getFirestore(); // Descomenta y configura según tu inicialización de Firebase
  // const userId = "REEMPLAZAR_CON_USER_ID_REAL"; // Ej: useAuth().currentUser?.uid;
  // Por ahora, usaremos placeholders para que el código compile. Reemplázalos.
  const userId = "mockUserId"; // Placeholder para el ID de usuario. TODO: Reemplazar con la lógica de autenticación real.

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined); // Se inicializará en useEffect
  const [isClient, setIsClient] = useState(false);
  const [events, setEvents] = useState<EventType[]>([]);
  const [currentView, setCurrentView] = useState<ViewOption>('month');
  const [filterTerm, setFilterTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | Partial<Omit<EventType, 'id'>> | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Efecto para inicialización del cliente y fecha actual (solo se ejecuta una vez)
  useEffect(() => {
    setIsClient(true);
    setCurrentDate(new Date());
  }, []);

  // Efecto para cargar eventos (se ejecuta cuando userId, db, o toast cambian)
  useEffect(() => {
    const fetchEvents = async () => {
      if (!userId || Object.keys(db).length === 0) { // Verifica que db no sea el placeholder vacío
        console.warn("Firestore db o userId no están configurados. Saltando carga de eventos.");
        setIsLoadingEvents(false);
        setEvents([]); // O mantén mockEvents si prefieres un fallback temporal
        return;
      }
      try {
        setIsLoadingEvents(true);
        const fetchedEvents = await getEvents(db, userId);
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error al cargar eventos desde Firestore:", error);
        toast({ title: "Error", description: "No se pudieron cargar los eventos.", variant: "destructive" });
        setEvents([]); // Limpia eventos en caso de error
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [userId, db, toast]); // Dependencias actualizadas

  const filteredEvents = useMemo(() => {
    if (!filterTerm.trim()) {
      return events;
    }
    return events.filter(event =>
      event.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(filterTerm.toLowerCase()))
    );
  }, [events, filterTerm]);

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: ViewOption) => {
    setCurrentView(newView);
  };

  const handleFilterChange = (term: string) => {
    setFilterTerm(term);
  };

  const handleAddEventClick = (type?: 'Proyecto' | 'Postventa' | 'Visita') => {
    const now = new Date();
    setSelectedEvent({
      name: '',
      startDate: startOfDay(now), // Usar startOfDay para tener una fecha de inicio consistente
      endDate: endOfDay(now), // Usar endOfDay para tener una fecha de fin consistente
      description: '',
      color: 'hsl(var(--primary))', // Incluir el color por defecto
      // Incluimos el tipo si fue preseleccionado
      ...(type && { type })
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (event: EventType) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Verificar si se soltó sobre un área válida y no es el mismo elemento
    if (!over || !over.data.current || active.id === over.id) {
      return;
    }

    // Obtener el evento directamente de los datos del elemento arrastrado
    const draggedEventData = active.data.current?.event;
    if (!draggedEventData) {
      console.error("No se encontraron datos del evento arrastrado");
      return;
    }

    // Reconstruir el evento original con los datos del arrastre
    const originalEvent: EventType = {
      ...draggedEventData,
      startDate: new Date(draggedEventData.startDate),
      endDate: new Date(draggedEventData.endDate),
      // Asegurarse de que los campos opcionales estén presentes
      name: draggedEventData.name || 'Sin título',
      description: draggedEventData.description || '',
      color: draggedEventData.color || 'hsl(var(--primary))',
    };

    // Verificar si se soltó sobre una celda de día
    if (over.data.current.accepts?.includes('event')) {
      const droppedOnDate = over.data.current.date as Date;
      
      if (!(droppedOnDate instanceof Date) || isNaN(droppedOnDate.getTime())) {
        console.error("Fecha de destino inválida:", droppedOnDate);
        return;
      }
      
      // Calcular la diferencia en días entre la fecha original y la nueva fecha
      const dayDiff = Math.floor((droppedOnDate.getTime() - originalEvent.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Crear nuevas fechas manteniendo la hora original
      const newStartDate = new Date(originalEvent.startDate);
      newStartDate.setDate(newStartDate.getDate() + dayDiff);
      
      const newEndDate = new Date(originalEvent.endDate);
      newEndDate.setDate(newEndDate.getDate() + dayDiff);
      
      // Asegurarse de que las nuevas fechas sean válidas
      if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
        console.error("Fechas inválidas después del cálculo:", { newStartDate, newEndDate });
        return;
      }
      
      // Si el evento era de todo el día, asegurarse de que las horas sean 00:00:00 y 23:59:59
      const isAllDay = originalEvent.startDate.getHours() === 0 && 
                      originalEvent.startDate.getMinutes() === 0 && 
                      originalEvent.startDate.getSeconds() === 0;
      
      if (isAllDay) {
        newStartDate.setHours(0, 0, 0, 0);
        newEndDate.setHours(23, 59, 59, 999);
      }
      
      const eventIdToUpdate = active.id as string;
      const changes: Partial<Omit<EventType, 'id'>> = { 
        startDate: newStartDate, 
        endDate: newEndDate 
      };

      try {
        if (!userId || Object.keys(db).length === 0) throw new Error("Firestore no configurado");
        const updatedEvent = await updateEvent(db, userId, eventIdToUpdate, changes);
        
        // Actualizar el estado local
        setEvents(prevEvents =>
          prevEvents.map(ev => (ev.id === updatedEvent.id ? updatedEvent : ev))
        );
        
        toast({ 
          title: "Tarea Actualizada", 
          description: `La tarea se ha movido al ${updatedEvent.startDate.toLocaleDateString()}.` 
        });
      } catch (error) {
        console.error("Error al actualizar tarea (drag and drop):", error);
        toast({ 
          title: "Error al Actualizar", 
          description: "No se pudo cambiar la fecha de la tarea.", 
          variant: "destructive" 
        });
      }
    }
  };

  const handleEventResize = async (eventId: string, newStartDate: Date, newEndDate: Date) => {
     const changes: Partial<Omit<EventType, 'id'>> = { 
      startDate: startOfDay(newStartDate), 
      endDate: endOfDay(newEndDate) 
    };

    try {
      if (!userId || Object.keys(db).length === 0) throw new Error("Firestore no configurado");
      const updatedEvent = await updateEvent(db, userId, eventId, changes);
      setEvents(prevEvents =>
        prevEvents.map(event => (event.id === updatedEvent.id ? updatedEvent : event))
      );
      toast({ title: "Tarea Redimensionada", description: "La duración de la tarea ha sido actualizada." });
    } catch (error) {
      console.error("Error al redimensionar tarea:", error);
      toast({ title: "Error al Redimensionar", description: "No se pudo actualizar la duración de la tarea.", variant: "destructive" });
      // Opcional: Revertir el cambio visual
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleModalSave = async (eventToSave: Omit<EventType, 'id'> & { id?: string }) => {
    if (!userId || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "Firestore no está configurado.", variant: "destructive" });
      return;
    }

    const eventDataForDb = {
      ...eventToSave,
      name: eventToSave.name || "Evento sin título", // Asegurar que name siempre sea string
      startDate: startOfDay(eventToSave.startDate),
      endDate: endOfDay(eventToSave.endDate),
      // color y description son opcionales y ya están en eventToSave
    };

    try {
      if (eventToSave.id) {
        // Actualizar evento existente
        const { id, ...dataToUpdate } = eventDataForDb;
        const updatedEvent = await updateEvent(db, userId, eventToSave.id, dataToUpdate as Partial<Omit<EventType, 'id'>>);
        setEvents(prevEvents =>
          prevEvents.map(event => (event.id === updatedEvent.id ? updatedEvent : event))
        );
        toast({ title: "Tarea Actualizada", description: `"${updatedEvent.name}" ha sido actualizada.` });
      } else {
        // Crear nuevo evento
        const newEvent = await addEvent(db, userId, eventDataForDb as Omit<EventType, 'id'>);
        setEvents(prevEvents => [...prevEvents, newEvent]);
        toast({ title: "Tarea Creada", description: `"${newEvent.name}" ha sido añadida.` });
      }
      handleModalClose();
    } catch (error) {
      console.error("Error al guardar el evento:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar la tarea.", variant: "destructive" });
    }
  };

  const handleModalDelete = async (eventId: string) => {
    if (!userId || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "Firestore no está configurado.", variant: "destructive" });
      return;
    }
    const eventToDelete = events.find(e => e.id === eventId);
    try {
      await deleteEvent(db, userId, eventId);
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      toast({ title: "Tarea Eliminada", description: `"${eventToDelete?.name}" ha sido eliminada.`, variant: "destructive" });
      handleModalClose();
    } catch (error) {
      console.error("Error al eliminar el evento:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la tarea.", variant: "destructive" });
    }
  };

  if (!isClient || currentDate === undefined || isLoadingEvents) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground p-0 sm:p-4">
        <header className="p-4 text-center sm:text-left flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">CalReact</h1>
              <p className="text-muted-foreground">Aplicación de Calendario Avanzada</p>
            </div>
        </header>
        <main className="flex-grow flex flex-col overflow-hidden p-0 sm:p-4 rounded-lg shadow-2xl bg-card">
          <ToolbarSkeleton />
          <CalendarViewSkeleton />
        </main>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-background text-foreground p-0 sm:p-4">
        <header className="p-4 text-center sm:text-left flex items-center gap-4">
          <SidebarTrigger className="md:hidden" /> 
          <h1 className="text-3xl font-bold text-primary">CalReact</h1>
        </header>
        
        <main className="flex-grow  overflow-hidden p-2 sm:p-4 rounded-lg shadow-2xl bg-background">
          <CalendarToolbar 
            currentDate={currentDate}
            currentView={currentView}
            filterTerm={filterTerm}
            onDateChange={handleDateChange}
            onViewChange={handleViewChange}
            onFilterChange={handleFilterChange}
            onAddEvent={handleAddEventClick}
            onToday={handleToday}
          />
          <div className="flex-grow overflow-auto p-0 sm:p-2 md:p-4">
            <CalendarView
              currentDate={currentDate}
              events={filteredEvents}
              currentView={currentView}
              onEventClick={handleEventClick}
              onEventResize={handleEventResize}
              enableDragAndDrop={true} 
              enableResizing={true} 
              weekStartsOn={1} 
            />
          </div>
        </main>

        {isModalOpen && (
          <EventModal
            isOpen={isModalOpen}
            eventData={selectedEvent}
            onClose={handleModalClose}
            onSave={handleModalSave}
            onDelete={selectedEvent && 'id' in selectedEvent ? handleModalDelete : undefined}
            preSelectedType={selectedEvent?.type as 'Proyecto' | 'Postventa' | 'Visita' | undefined}
          />
        )}
      </div>
    </DndContext>
  );
}
