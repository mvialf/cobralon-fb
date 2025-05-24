"use client";

import { useState, useEffect, useMemo } from 'react';
import type { EventType, ViewOption } from '@/types/event';
import { CalendarView } from '@/components/calendar/calendar-view';
import { EventModal } from '@/components/calendar/event-modal';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { mockEvents } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { addHours } from '@/lib/calendar-utils';

export default function CalReactAppPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [currentView, setCurrentView] = useState<ViewOption>('month');
  const [filterTerm, setFilterTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | Partial<Omit<EventType, 'id'>> | null>(null);
  const { toast } = useToast();

  // Load mock events on initial mount
  useEffect(() => {
    // Ensure mockEvents dates are actual Date objects if they aren't already
    const initialEvents = mockEvents.map(event => ({
      ...event,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
    }));
    setEvents(initialEvents);
  }, []);

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
    // For month view, 'date' is the start of the day. For week/day, 'date' includes the time.
    // We can default the end time to 1 hour after.
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
            onEventDrop={handleEventDrop} // Pass handler
            onEventResize={handleEventResize} // Pass handler
            enableDragAndDrop={true} // Enable prop (visual D&D simplified)
            enableResizing={true}    // Enable prop (visual resize simplified)
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
