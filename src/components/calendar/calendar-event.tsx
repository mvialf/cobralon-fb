
"use client";

import type { EventType } from '@/types/event';
import { format, isSameDay } from '@/lib/calendar-utils';

interface CalendarEventProps {
  event: EventType;
  onClick: (event: EventType) => void;
  view: 'month' | 'week' | 'day';
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

export function CalendarEvent({ event, onClick, view }: CalendarEventProps) {
  const eventStyle = {
    backgroundColor: event.color || 'hsl(var(--primary))',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent day cell click when clicking event
    onClick(event);
  };

  const formattedTime = (date: Date) => format(date, 'p'); // 'p' is locale-aware time format
  const isAllDayOrTask = event.startDate.getHours() === 0 && event.startDate.getMinutes() === 0 && event.endDate.getHours() === 23 && event.endDate.getMinutes() === 59;
  const isMultiDay = !isSameDay(event.startDate, event.endDate);

  const getTooltipText = () => {
    let text = event.name;
    if (view === 'month') {
      if (!isAllDayOrTask && !isMultiDay) { // Show time only if not all-day and single day
        text += `\n${formattedTime(event.startDate)} - ${formattedTime(event.endDate)}`;
      } else if (isMultiDay) {
        text += `\n${format(event.startDate, 'MMM d')} - ${format(event.endDate, 'MMM d')}`;
      } else { // All-day single day
         text += `\n${format(event.startDate, 'MMM d')}`;
      }
    } else { // Day/Week view - tasks are per day, no specific time shown here
      text += `\n${format(event.startDate, 'MMM d')}`;
      if (isMultiDay) {
        text += ` - ${format(event.endDate, 'MMM d')}`;
      }
    }
    if (event.description) {
      text += `\n${event.description}`;
    }
    return text;
  };


  return (
    <div
      className={`p-1.5 rounded-md text-xs cursor-pointer overflow-hidden h-full shadow-sm hover:shadow-md
                  ${view === 'month' ? 'text-white hover:opacity-90' : 'text-primary-foreground'}`}
      style={eventStyle}
      onClick={handleClick}
      title={getTooltipText()}
      // draggable={enableDragAndDrop}
      // onDragStart={(e) => onDragStart?.(e, event.id)}
    >
      <div className="font-semibold truncate">{event.name}</div>
      {view === 'month' && !isAllDayOrTask && !isMultiDay && ( // Only show time in month view if not an all-day event
         <div className="truncate opacity-90">{formattedTime(event.startDate)}</div>
      )}
      {(view === 'week' || view === 'day') && event.description && (
        <p className="text-xs truncate opacity-75 mt-0.5">{event.description}</p>
      )}
       {view === 'month' && event.description && (
        <p className="text-xs truncate opacity-75 mt-0.5">{event.description}</p>
      )}
    </div>
  );
}
