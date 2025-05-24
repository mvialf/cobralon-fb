"use client";

import type { EventType } from '@/types/event';
import { CalendarEvent } from './calendar-event';
import { 
  getDaysInWeek, 
  getTimeSlots, 
  format, 
  isToday, 
  addHours,
  isSameDay,
  startOfDay,
  endOfDay
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  currentDate: Date;
  events: EventType[];
  onEventClick: (event: EventType) => void;
  onDayCellClick: (date: Date, view: 'week' | 'day') => void; // Pass specific time
  weekStartsOn?: 0 | 1;
  startHour?: number;
  endHour?: number;
  hourInterval?: number; // in minutes
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

const calculateEventPositionAndSpan = (
  event: EventType,
  day: Date,
  startHour: number,
  hourInterval: number // in minutes
) => {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  // Clamp event start and end to the current day for rendering in this day's column
  const eventVisibleStart = event.startDate > dayStart ? event.startDate : dayStart;
  const eventVisibleEnd = event.endDate < dayEnd ? event.endDate : dayEnd;

  if (eventVisibleStart >= eventVisibleEnd) return null; // Event not visible on this day

  const totalDayMinutes = (24 - startHour) * 60; // Total minutes in the visible part of the day
  const topOffsetMinutes = (eventVisibleStart.getHours() - startHour) * 60 + eventVisibleStart.getMinutes();
  const eventDurationMinutes = (eventVisibleEnd.getTime() - eventVisibleStart.getTime()) / (1000 * 60);
  
  // Calculate position and height based on time slots (e.g. 1 hour slots)
  const minutesPerSlot = hourInterval; // e.g., 60 for 1-hour slots
  const topSlotIndex = Math.floor(topOffsetMinutes / minutesPerSlot);
  const numberOfSlots = Math.ceil(eventDurationMinutes / minutesPerSlot);

  // If event starts before view's startHour, adjust top position
  const adjustedTopOffsetMinutes = Math.max(0, topOffsetMinutes);
  const topPercent = (adjustedTopOffsetMinutes / totalDayMinutes) * 100;
  const heightPercent = (eventDurationMinutes / totalDayMinutes) * 100;


  return {
    // These are percentages for absolute positioning within a day column
    // top: `${(adjustedTopOffsetMinutes / minutesPerSlot) * (100 / ((endHour-startHour)*(60/minutesPerSlot)))}%`,
    // height: `${(eventDurationMinutes / minutesPerSlot) * (100 / ((endHour-startHour)*(60/minutesPerSlot)))}%`,
    // For simplicity, let's calculate based on slot index and number of slots.
    // This assumes each slot has a fixed height.
    // The parent grid needs to define row heights for this to work well.
    // A common approach is to calculate height based on duration.
    // Let's use grid rows, this is simpler for now.
    gridRowStart: topSlotIndex + 2, // +1 for header row, +1 for 1-based index
    gridRowEnd: topSlotIndex + numberOfSlots + 2,
    topInMinutes: adjustedTopOffsetMinutes,
    durationInMinutes: eventDurationMinutes,
  };
};


export function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayCellClick,
  weekStartsOn = 0,
  startHour = 0, // 0 (12 AM) to 23 (11 PM)
  endHour = 24,
  hourInterval = 60, // 60 minutes
  enableDragAndDrop,
  enableResizing,
}: WeekViewProps) {
  const days = getDaysInWeek(currentDate, weekStartsOn);
  const timeSlots = getTimeSlots(startHour, endHour, hourInterval);

  const handleCellClick = (day: Date, timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const clickedDateTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    onDayCellClick(clickedDateTime, 'week');
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-md border border-border overflow-hidden">
      {/* Header: Day Names */}
      <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
        <div className="p-2 text-center font-medium text-sm text-muted-foreground border-r border-border">Time</div>
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-2 text-center font-medium text-sm",
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

      {/* Body: Time Slots and Events */}
      <div className="flex-grow overflow-auto">
        <div className="grid grid-cols-[auto_repeat(7,1fr)]">
          {/* Time Gutter */}
          <div className="grid grid-rows-[repeat(var(--time-slot-count),minmax(4rem,auto))] border-r border-border" style={{'--time-slot-count': timeSlots.length} as React.CSSProperties}>
            {timeSlots.map(slot => (
              <div key={slot} className="h-16 p-2 text-xs text-muted-foreground text-right border-b border-border flex items-center justify-end">
                {format(new Date(2000, 0, 1, parseInt(slot.split(':')[0]), parseInt(slot.split(':')[1])), 'h:mm a')}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {days.map(day => (
            <div 
              key={day.toISOString()} 
              className="grid grid-rows-[repeat(var(--time-slot-count),minmax(4rem,auto))] border-r border-border relative"
              style={{'--time-slot-count': timeSlots.length} as React.CSSProperties}
            >
              {timeSlots.map((slot, slotIndex) => (
                <div
                  key={slot}
                  className="h-16 border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => handleCellClick(day, slot)}
                />
              ))}
              {/* Render events for this day */}
              {events.map(event => {
                // Check if event falls on this day or spans across it
                const eventStartDay = startOfDay(event.startDate);
                const eventEndDay = endOfDay(event.endDate);
                const currentDayStart = startOfDay(day);

                if (eventStartDay <= currentDayStart && eventEndDay >= currentDayStart) {
                  const pos = calculateEventPositionAndSpan(event, day, startHour, hourInterval);
                  if (!pos) return null;

                  // Calculate height based on duration. 1 hour = 4rem (h-16)
                  const slotHeightRem = 4;
                  const eventHeight = (pos.durationInMinutes / hourInterval) * slotHeightRem;
                  const eventTop = (pos.topInMinutes / hourInterval) * slotHeightRem;
                  
                  return (
                     <div
                      key={event.id}
                      className="absolute w-[calc(100%-0.5rem)] left-[0.25rem] z-[5]" // Slightly inset
                      style={{
                        top: `${eventTop}rem`,
                        height: `${eventHeight}rem`,
                      }}
                    >
                      <CalendarEvent
                        event={event}
                        onClick={onEventClick}
                        view="week"
                        enableDragAndDrop={enableDragAndDrop}
                        enableResizing={enableResizing}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
