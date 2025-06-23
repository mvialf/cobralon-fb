
"use client";

import type { EventType, ViewOption } from '@/types/event';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { startOfDay } from '@/lib/calendar-utils';

interface CalendarViewProps {
  currentDate: Date;
  events: EventType[];
  currentView: ViewOption;
  onEventClick: (event: EventType) => void;
  onEventDrop?: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  onEventResize?: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
  weekStartsOn?: 0 | 1; 
}

export function CalendarView({
  currentDate,
  events,
  currentView,
  onEventClick,
  onEventDrop,
  onEventResize,
  enableDragAndDrop = true,
  enableResizing = true,
  weekStartsOn = 0,
}: CalendarViewProps) {

  return (
    <div className="h-full flex flex-col">
      {currentView === 'month' && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          weekStartsOn={weekStartsOn}
          enableDragAndDrop={enableDragAndDrop}
          enableResizing={enableResizing}
        />
      )}
      {currentView === 'week' && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          weekStartsOn={weekStartsOn}
          enableDragAndDrop={enableDragAndDrop}
          enableResizing={enableResizing}
        />
      )}
      {currentView === 'day' && (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          enableDragAndDrop={enableDragAndDrop}
          enableResizing={enableResizing}
        />
      )}
    </div>
  );
}
