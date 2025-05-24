"use client";

import type { EventType } from '@/types/event';
import { CalendarEvent } from './calendar-event';
import { 
  getTimeSlots, 
  format, 
  isToday, 
  addHours,
  startOfDay,
  endOfDay
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface DayViewProps {
  currentDate: Date;
  events: EventType[];
  onEventClick: (event: EventType) => void;
  onDayCellClick: (date: Date, view: 'week' | 'day') => void; // Pass specific time
  startHour?: number;
  endHour?: number;
  hourInterval?: number; // in minutes
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

const calculateEventPositionAndSpanDay = (
  event: EventType,
  day: Date,
  startHour: number,
  hourInterval: number // in minutes
) => {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const eventVisibleStart = event.startDate > dayStart ? event.startDate : dayStart;
  const eventVisibleEnd = event.endDate < dayEnd ? event.endDate : dayEnd;

  if (eventVisibleStart >= eventVisibleEnd) return null; 

  const totalDayMinutes = (24 - startHour) * 60;
  const topOffsetMinutes = (eventVisibleStart.getHours() - startHour) * 60 + eventVisibleStart.getMinutes();
  const eventDurationMinutes = (eventVisibleEnd.getTime() - eventVisibleStart.getTime()) / (1000 * 60);
  
  const adjustedTopOffsetMinutes = Math.max(0, topOffsetMinutes);
  
  return {
    topInMinutes: adjustedTopOffsetMinutes,
    durationInMinutes: eventDurationMinutes,
  };
};

export function DayView({
  currentDate,
  events,
  onEventClick,
  onDayCellClick,
  startHour = 0,
  endHour = 24,
  hourInterval = 60,
  enableDragAndDrop,
  enableResizing,
}: DayViewProps) {
  const timeSlots = getTimeSlots(startHour, endHour, hourInterval);

  const handleCellClick = (timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const clickedDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, minute);
    onDayCellClick(clickedDateTime, 'day');
  };
  
  const dayEvents = events.filter(event => {
      const eventStartDay = startOfDay(event.startDate);
      const eventEndDay = endOfDay(event.endDate); // Consider events ending on the next day but starting today
      const currentDayStart = startOfDay(currentDate);
      return (eventStartDay <= currentDayStart && eventEndDay >= currentDayStart) || (eventStartDay.getTime() === currentDayStart.getTime());
  });

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-md border border-border overflow-hidden">
      {/* Header: Day Name (already shown in toolbar, so this is mainly for structure) */}
      <div className="grid grid-cols-[auto_1fr] border-b border-border sticky top-0 bg-card z-10">
        <div className="p-2 text-center font-medium text-sm text-muted-foreground border-r border-border">Hora</div>
        <div
          className={cn(
            "p-2 text-center font-medium text-sm",
            isToday(currentDate) ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div>{format(currentDate, 'EEEE')}</div>
          <div className={cn("text-lg font-semibold", isToday(currentDate) ? "text-primary" : "text-foreground")}>
            {format(currentDate, 'MMMM d')}
          </div>
        </div>
      </div>

      {/* Body: Time Slots and Events */}
      <div className="flex-grow overflow-auto">
        <div className="grid grid-cols-[auto_1fr]">
          {/* Time Gutter */}
          <div className="grid grid-rows-[repeat(var(--time-slot-count),minmax(4rem,auto))] border-r border-border" style={{'--time-slot-count': timeSlots.length} as React.CSSProperties}>
            {timeSlots.map(slot => (
              <div key={slot} className="h-16 p-2 text-xs text-muted-foreground text-right border-b border-border flex items-center justify-end">
                {format(new Date(2000, 0, 1, parseInt(slot.split(':')[0]), parseInt(slot.split(':')[1])), 'p')}
              </div>
            ))}
          </div>

          {/* Day Column */}
          <div className="grid grid-rows-[repeat(var(--time-slot-count),minmax(4rem,auto))] border-r-0 border-border relative" style={{'--time-slot-count': timeSlots.length} as React.CSSProperties}>
            {timeSlots.map(slot => (
              <div
                key={slot}
                className="h-16 border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => handleCellClick(slot)}
              />
            ))}
            {/* Render events for this day */}
            {dayEvents.map(event => {
                const pos = calculateEventPositionAndSpanDay(event, currentDate, startHour, hourInterval);
                if (!pos) return null;
                
                const slotHeightRem = 4;
                const eventHeight = (pos.durationInMinutes / hourInterval) * slotHeightRem;
                const eventTop = (pos.topInMinutes / hourInterval) * slotHeightRem;

                return (
                  <div
                    key={event.id}
                    className="absolute w-[calc(100%-0.5rem)] left-[0.25rem] z-[5]" // Slightly inset
                    style={{
                      top: `${eventTop}rem`,
                      height: `${Math.max(eventHeight, slotHeightRem / 2)}rem`, // Min height for small events
                    }}
                  >
                    <CalendarEvent
                      event={event}
                      onClick={onEventClick}
                      view="day"
                      enableDragAndDrop={enableDragAndDrop}
                      enableResizing={enableResizing}
                    />
                  </div>
                );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
