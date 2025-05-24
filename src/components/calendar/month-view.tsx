"use client";

import type { EventType } from '@/types/event';
import { CalendarEvent } from './calendar-event';
import { 
  getDaysInMonth, 
  isSameMonth, 
  isToday, 
  format,
  isSameDay,
  startOfDay,
  endOfDay
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  currentDate: Date;
  events: EventType[];
  onEventClick: (event: EventType) => void;
  onDayCellClick: (date: Date) => void;
  weekStartsOn?: 0 | 1;
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

export function MonthView({ 
  currentDate, 
  events, 
  onEventClick, 
  onDayCellClick, 
  weekStartsOn = 0, // Default to Sunday
  enableDragAndDrop,
  enableResizing,
}: MonthViewProps) {
  const weeks = getDaysInMonth(currentDate, weekStartsOn);
  
  // Day names in Spanish, considering weekStartsOn
  let dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  if (weekStartsOn === 1) { // Monday start
    dayNames.push(dayNames.shift()!); // Moves "Dom" to the end
  }


  const getEventsForDay = (day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    return events
      .filter(event => {
        const eventStart = startOfDay(event.startDate); // Compare date parts only for month view span
        const eventEnd = startOfDay(event.endDate);
        return (eventStart <= dayEnd && eventEnd >= dayStart);
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-md border border-border overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map(dayName => (
          <div key={dayName} className="p-2 text-center font-medium text-sm text-muted-foreground">
            {dayName}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-5 flex-grow overflow-auto">
        {weeks.flat().map((day, index) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={index}
              className={cn(
                "border-r border-b border-border p-1.5 flex flex-col min-h-[calc((100vh-200px)/5)] sm:min-h-[calc((100vh-200px)/5.5)] md:min-h-[calc((100vh-220px)/5.5)] lg:min-h-[calc((100vh-240px)/5.5)] relative cursor-pointer hover:bg-secondary/50 transition-colors duration-150",
                !isSameMonth(day, currentDate) && "bg-muted/30 text-muted-foreground/60",
                isToday(day) && "bg-primary/10",
                (index + 1) % 7 === 0 && "border-r-0" // No right border for last column
              )}
              onClick={() => onDayCellClick(day)}
            >
              <span
                className={cn(
                  "self-start mb-1 text-xs font-medium p-1 rounded-full h-6 w-6 flex items-center justify-center",
                  isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="flex-grow space-y-0.5 overflow-y-auto max-h-[calc(100%-2rem)]">
                {dayEvents.slice(0, 3).map(event => ( // Show max 3 events, then maybe a "+X more"
                  <CalendarEvent 
                    key={event.id} 
                    event={event} 
                    onClick={onEventClick} 
                    view="month"
                    enableDragAndDrop={enableDragAndDrop}
                    enableResizing={enableResizing}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground p-1 text-center">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
