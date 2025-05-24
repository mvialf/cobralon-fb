"use client";

import type { EventType } from '@/types/event';
import { format } from '@/lib/calendar-utils';

interface CalendarEventProps {
  event: EventType;
  onClick: (event: EventType) => void;
  view: 'month' | 'week' | 'day';
  // Props for D&D and resize would go here, e.g.,
  // onDragStart?: (e: React.DragEvent, eventId: string) => void;
  // onResizeStart?: (e: React.MouseEvent, eventId: string, handle: 'start' | 'end') => void;
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

  const formattedTime = (date: Date) => format(date, 'h:mm a');

  return (
    <div
      className={`p-1 rounded-md text-xs cursor-pointer overflow-hidden h-full
                  ${view === 'month' ? 'text-white hover:opacity-80' : 'text-primary-foreground shadow-sm hover:shadow-md'}`}
      style={eventStyle}
      onClick={handleClick}
      title={`${event.name}\n${format(event.startDate, 'MMM d, h:mm a')} - ${format(event.endDate, 'MMM d, h:mm a')}${event.description ? '\n' + event.description : ''}`}
      // draggable={enableDragAndDrop}
      // onDragStart={(e) => onDragStart?.(e, event.id)}
    >
      <div className="font-semibold truncate">{event.name}</div>
      {(view === 'week' || view === 'day') && (
        <div className="truncate opacity-90">
          {formattedTime(event.startDate)} - {formattedTime(event.endDate)}
        </div>
      )}
      {view === 'month' && event.startDate.getHours() !== 0 && (
         <div className="truncate opacity-90">{formattedTime(event.startDate)}</div>
      )}
      {(view === 'week' || view === 'day') && event.description && (
        <p className="text-xs truncate opacity-75 mt-0.5">{event.description}</p>
      )}
    </div>
  );
}
