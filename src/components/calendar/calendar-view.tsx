"use client";

import type { EventType, ViewOption } from '@/types/event';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';

interface CalendarViewProps {
  currentDate: Date;
  events: EventType[];
  currentView: ViewOption;
  onEventClick: (event: EventType) => void;
  onDayCellClick: (date: Date, viewContext: ViewOption) => void;
  // Optional drag & drop / resize handlers
  onEventDrop?: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  onEventResize?: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
  weekStartsOn?: 0 | 1; // 0 for Sunday, 1 for Monday
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
    // For week/day view, date includes time. This is handled by their respective onDayCellClick.
    onDayCellClick(date, currentView);
  };

  return (
    <div className="h-full flex flex-col">
      {currentView === 'month' && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDayCellClick={handleDayCellWrapper}
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
          onDayCellClick={onDayCellClick} // Pass directly as it needs view context
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
          onDayCellClick={onDayCellClick} // Pass directly
          enableDragAndDrop={enableDragAndDrop}
          enableResizing={enableResizing}
        />
      )}
    </div>
  );
}
