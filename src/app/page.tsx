
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { EventType, ViewOption } from '@/types/event';
import { CalendarView } from '@/components/calendar/calendar-view';
import { EventModal } from '@/components/calendar/event-modal';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { mockEvents } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { addHours } from '@/lib/calendar-utils';

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
  const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);
  const [events, setEvents] = useState<EventType[]>([]);
  const [currentView, setCurrentView] = useState<ViewOption>('month');
  const [filterTerm, setFilterTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | Partial<Omit<EventType, 'id'>> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // This effect runs only on the client after mounting
    setIsClient(true);
    setCurrentDate(new Date());

    // Ensure mockEvents dates are actual Date objects if they aren't already
    const initialEvents = mockEvents.map(event => ({
      ...event,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
    }));
    setEvents(initialEvents);
  }, []); // Empty dependency array ensures this runs once on mount

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
      startDate: now, 
      endDate: addHours(now, 1), // Default 1 hour duration
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
      startDate: date,
      endDate: addHours(date, 1),
      description: '',
      color: 'hsl(var(--primary))',
    });
    setIsModalOpen(true);
  };

  const handleEventDrop = (eventId: string, newStartDate: Date, newEndDate: Date) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId ? { ...event, startDate: newStartDate, endDate: newEndDate } : event
      )
    );
    toast({ title: "Event Updated", description: "Event time changed by drag & drop." });
  };

  const handleEventResize = (eventId: string, newStartDate: Date, newEndDate: Date) => {
     setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId ? { ...event, startDate: newStartDate, endDate: newEndDate } : event
      )
    );
    toast({ title: "Event Resized", description: "Event duration has been updated." });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleModalSave = (eventToSave: Omit<EventType, 'id'> & { id?: string }) => {
    if (eventToSave.id) { // Editing existing event
      setEvents(prevEvents =>
        prevEvents.map(event => (event.id === eventToSave.id ? { ...event, ...eventToSave } : event))
      );
      toast({ title: "Event Updated", description: `"${eventToSave.name}" has been updated.` });
    } else { // Creating new event
      const newEventWithId = { ...eventToSave, id: crypto.randomUUID() };
      setEvents(prevEvents => [...prevEvents, newEventWithId]);
      toast({ title: "Event Created", description: `"${newEventWithId.name}" has been added.` });
    }
    handleModalClose();
  };

  const handleModalDelete = (eventId: string) => {
    const eventToDelete = events.find(e => e.id === eventId);
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    toast({ title: "Event Deleted", description: `"${eventToDelete?.name}" has been removed.`, variant: "destructive" });
    handleModalClose();
  };

  if (!isClient || currentDate === undefined) {
    // Render skeleton UI until client is mounted and currentDate is initialized
    return (
      <div className="flex flex-col h-screen bg-background text-foreground p-0 sm:p-4">
        <header className="p-4 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-primary">CalReact</h1>
          <p className="text-muted-foreground">Advanced Calendar Application</p>
        </header>
        <main className="flex-grow flex flex-col overflow-hidden p-0 sm:p-4 rounded-lg shadow-2xl bg-card">
          <ToolbarSkeleton />
          <CalendarViewSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground p-0 sm:p-4">
      <header className="p-4 text-center sm:text-left">
        <h1 className="text-3xl font-bold text-primary">CalReact</h1>
        <p className="text-muted-foreground">Advanced Calendar Application</p>
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
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            enableDragAndDrop={true}
            enableResizing={true}
            weekStartsOn={1} // Monday
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
  );
}

