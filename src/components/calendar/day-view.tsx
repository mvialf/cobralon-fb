
"use client";

import type { EventType } from '@/types/event';
import { CalendarEvent } from './calendar-event';
import { 
  format, 
  isToday, 
  startOfDay,
  endOfDay
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface DayViewProps {
  currentDate: Date;
  events: EventType[];
  onEventClick: (event: EventType) => void;
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

export function DayView({
  currentDate,
  events,
  onEventClick,
  enableDragAndDrop,
  enableResizing,
}: DayViewProps) {
  
  const dayEvents = events.filter(event => {
      const eventStartDay = startOfDay(event.startDate);
      const eventEndDay = startOfDay(event.endDate); // Compare start of day for multi-day events
      const currentViewDayStart = startOfDay(currentDate);
      return (eventStartDay <= currentViewDayStart && eventEndDay >= currentViewDayStart);
  }).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-md border border-border overflow-hidden">
      {/* Header: Day Name and Date */}
      <div className="p-2 text-center font-medium text-sm border-b border-border sticky top-0 bg-card z-10">
        <div className={cn(isToday(currentDate) ? "text-primary" : "text-muted-foreground")}>
          {format(currentDate, 'EEEE')}
        </div>
        <div className={cn("text-lg font-semibold", isToday(currentDate) ? "text-primary" : "text-foreground")}>
          {format(currentDate, 'MMMM d, yyyy')}
        </div>
      </div>

      {/* Body: Events List */}
      <div 
        className="flex-grow overflow-auto p-2 space-y-2 transition-colors"
      >
        {dayEvents.length > 0 ? (
          dayEvents.map(event => (
            <div key={event.id} className="w-full">
              <CalendarEvent
                event={event}
                onClick={onEventClick}
                view="day"
                enableDragAndDrop={enableDragAndDrop}
                enableResizing={enableResizing}
              />
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground pt-4">No hay tareas para este día.</div>
        )}
      </div>
    </div>
  );
}
