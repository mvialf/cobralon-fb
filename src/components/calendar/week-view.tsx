
"use client";

import type { EventType } from '@/types/event';
import { CalendarEvent } from './calendar-event';
import { 
  getDaysInWeek, 
  format, 
  isToday, 
  startOfDay,
  endOfDay
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  currentDate: Date;
  events: EventType[];
  onEventClick: (event: EventType) => void;
  onDayCellClick: (date: Date, view: 'week') => void;
  weekStartsOn?: 0 | 1;
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

export function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayCellClick,
  weekStartsOn = 0,
  enableDragAndDrop,
  enableResizing,
}: WeekViewProps) {
  const days = getDaysInWeek(currentDate, weekStartsOn);

  const handleDayColumnClick = (day: Date) => {
    onDayCellClick(startOfDay(day), 'week');
  };

  const getEventsForDay = (day: Date) => {
    const currentViewDayStart = startOfDay(day);
    return events
      .filter(event => {
        const eventStartDay = startOfDay(event.startDate);
        const eventEndDay = startOfDay(event.endDate); // Compare start of day for multi-day events
        return (eventStartDay <= currentViewDayStart && eventEndDay >= currentViewDayStart);
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-md border border-border overflow-hidden">
      {/* Header: Day Names */}
      <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-card z-10">
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-2 text-center font-medium text-sm border-r border-border last:border-r-0",
              isToday(day) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div>{format(day, 'EEE')}</div>
            <div className={cn("text-lg font-semibold", isToday(day) ? "text-primary" : "text-foreground")}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Body: Day Columns with Events List */}
      <div className="grid grid-cols-7 flex-grow overflow-auto">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "border-r border-border last:border-r-0 p-1.5 space-y-1.5 overflow-y-auto min-h-[calc(100vh-220px)] cursor-pointer hover:bg-secondary/20 transition-colors",
                isToday(day) && "bg-primary/5"
              )}
              onClick={() => handleDayColumnClick(day)}
            >
              {dayEvents.length > 0 ? (
                dayEvents.map(event => (
                  <div key={event.id} className="w-full">
                    <CalendarEvent
                      event={event}
                      onClick={onEventClick}
                      view="week"
                      enableDragAndDrop={enableDragAndDrop}
                      enableResizing={enableResizing}
                    />
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-muted-foreground pt-2">Vacío</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
