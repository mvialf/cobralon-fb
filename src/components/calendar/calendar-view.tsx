
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
  onDayCellClick: (date: Date, viewContext: ViewOption) => void;
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
  onDayCellClick,
  onEventDrop,
  onEventResize,
  enableDragAndDrop = true,
  enableResizing = true,
  weekStartsOn = 0,
}: CalendarViewProps) {

  const handleDayCellWrapper = (date: Date) => {
    // For month view, date already represents the day.
    // Ensure it's start of day for consistency when creating new events.
    onDayCellClick(startOfDay(date), currentView);
  };

  return (
    <div className="h-full flex flex-col">
      {currentView === 'month' && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDayCellClick={handleDayCellWrapper} // Month view clicks are for a whole day
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
          onDayCellClick={(date) => onDayCellClick(date, 'week')} // Week view clicks are for a whole day
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
          onDayCellClick={(date) => onDayCellClick(date, 'day')} // Day view clicks are for the whole day
          enableDragAndDrop={enableDragAndDrop}
          enableResizing={enableResizing}
        />
      )}
    </div>
  );
}
