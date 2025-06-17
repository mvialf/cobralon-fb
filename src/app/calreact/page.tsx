"use client";

import { useState, useEffect, useMemo } from 'react';
import type { EventType, ViewOption } from '@/types/event';
import { CalendarView } from '@/components/calendar/calendar-view';
import { EventModal } from '@/components/calendar/event-modal';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { getFirestore } from 'firebase/firestore'; // Asegúrate de que Firebase está inicializado
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
  const db = {} as any; // Placeholder para la instancia de Firestore
  const userId = "mockUserId"; // Placeholder para el ID de usuario

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined);
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

  useEffect(() => {
    setIsClient(true);
    setCurrentDate(new Date());

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
  }, [userId, db]); // Dependencia de userId y db para recargar si cambian

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

  const handleAddEventClick = () => {
    const now = new Date();
    setSelectedEvent({ 
      name: '',
      startDate: startOfDay(now), 
      endDate: endOfDay(now), 
      description: '',
      color: 'hsl(var(--primary))' 
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (event: EventType) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDayCellClick = (date: Date, viewContext: ViewOption) => {
    setSelectedEvent({
      name: '',
      startDate: startOfDay(date),
      endDate: endOfDay(date),
      description: '',
      color: 'hsl(var(--primary))',
    });
    setIsModalOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const originalEvent = events.find(ev => ev.id === active.id);
      if (!originalEvent) return;
      
      const droppedOnDateISO = over.id as string;
      const droppedOnDate = parseISO(droppedOnDateISO);

      if (isNaN(droppedOnDate.getTime())) {
        console.error("Invalid date from droppable ID:", droppedOnDateISO);
        return;
      }
      
      const originalDuration = originalEvent.endDate.getTime() - originalEvent.startDate.getTime();
      let newEventStartTime = startOfDay(droppedOnDate);
      const originalStartIsMidnight = originalEvent.startDate.getHours() === 0 && originalEvent.startDate.getMinutes() === 0 && originalEvent.startDate.getSeconds() === 0 && originalEvent.startDate.getMilliseconds() === 0;

      if (!originalStartIsMidnight) {
          newEventStartTime.setHours(originalEvent.startDate.getHours());
          newEventStartTime.setMinutes(originalEvent.startDate.getMinutes());
          newEventStartTime.setSeconds(originalEvent.startDate.getSeconds());
          newEventStartTime.setMilliseconds(originalEvent.startDate.getMilliseconds());
      }
  
      let newEventEndTime = new Date(newEventStartTime.getTime() + originalDuration);

      const originalWasSingleAllDay = 
        originalStartIsMidnight &&
        originalEvent.endDate.getTime() === endOfDay(originalEvent.startDate).getTime() &&
        isSameDay(originalEvent.startDate, originalEvent.endDate);

      if (originalWasSingleAllDay) {
        newEventStartTime = startOfDay(droppedOnDate);
        newEventEndTime = endOfDay(droppedOnDate);
      }
      
      const eventIdToUpdate = active.id as string;
      const changes: Partial<Omit<EventType, 'id'>> = { startDate: newEventStartTime, endDate: newEventEndTime };

      try {
        if (!userId || Object.keys(db).length === 0) throw new Error("Firestore no configurado");
        const updatedEvent = await updateEvent(db, userId, eventIdToUpdate, changes);
        setEvents(prevEvents =>
          prevEvents.map(ev => (ev.id === updatedEvent.id ? updatedEvent : ev))
        );
        toast({ title: "Tarea Actualizada", description: "Fecha de la tarea cambiada arrastrando y soltando." });
      } catch (error) {
        console.error("Error al actualizar tarea (drag and drop):", error);
        toast({ title: "Error al Actualizar", description: "No se pudo cambiar la fecha de la tarea.", variant: "destructive" });
        // Opcional: Revertir el cambio visual si la actualización falla
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
          <div>
            <h1 className="text-3xl font-bold text-primary">CalReact</h1>
            <p className="text-muted-foreground">Aplicación de Calendario Avanzada</p>
          </div>
        </header>
        
        <main className="flex-grow flex flex-col overflow-hidden p-0 sm:p-4 rounded-lg shadow-2xl bg-card">
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
              onDayCellClick={handleDayCellClick}
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
          />
        )}
      </div>
    </DndContext>
  );
}
