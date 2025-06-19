
"use client";

import { useMemo } from 'react';
import type { EventType } from '@/types/event';
import { format, isSameDay } from '@/lib/calendar-utils';
import { isValid } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type React from 'react';

interface CalendarEventProps {
  event: EventType;
  onClick: (event: EventType) => void;
  view: 'month' | 'week' | 'day';
  enableDragAndDrop?: boolean;
  enableResizing?: boolean;
}

// Función para validar y normalizar las fechas del evento
const useValidatedEvent = (event: EventType) => {
  return useMemo(() => {
    try {
      // Crear nuevas instancias de fecha para evitar mutaciones
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      // Validar que las fechas sean válidas
      if (!isValid(startDate) || !isValid(endDate)) {
        console.error('Fechas de evento inválidas:', { startDate, endDate });
        return null;
      }
      
      return {
        ...event,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Error al procesar fechas del evento:', error);
      return null;
    }
  }, [event]);
};

export function CalendarEvent({ 
  event: originalEvent, 
  onClick, 
  view, 
  enableDragAndDrop 
}: CalendarEventProps) {
  // Usar el evento validado
  const event = useValidatedEvent(originalEvent);
  
  // Si el evento no es válido, no renderizar nada
  if (!event) {
    console.warn('Evento inválido, no se renderizará:', originalEvent);
    return null;
  }
  // Preparar datos del evento para el arrastre
  const eventData = useMemo(() => ({
    type: 'event',
    event: {
      ...event,
      // Asegurarse de que las fechas sean serializables
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      // Incluir todos los campos necesarios
      name: event.name,
      description: event.description,
      color: event.color,
      // Asegurarse de incluir cualquier otro campo necesario
      ...(event as any) // Esto asegura que no perdamos ningún campo
    }
  }), [event]);

  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: event.id,
    data: eventData,
    disabled: !enableDragAndDrop,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    borderLeftColor: event.color || 'hsl(var(--primary))',
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? 'none' : 'transform 200ms ease',
    cursor: enableDragAndDrop ? 'grab' : 'pointer',
  };


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onClick(event);
  };

  const formattedTime = (date: Date) => format(date, 'p'); 
  
  // Validar fechas antes de usarlas
  const isAllDayOrTask = useMemo(() => {
    try {
      return event.startDate.getHours() === 0 && 
             event.startDate.getMinutes() === 0 && 
             event.endDate.getHours() === 23 && 
             event.endDate.getMinutes() === 59;
    } catch (error) {
      console.error('Error al verificar si es evento de todo el día:', error);
      return false;
    }
  }, [event.startDate, event.endDate]);
  
  const isMultiDay = useMemo(() => {
    try {
      return !isSameDay(event.startDate, event.endDate);
    } catch (error) {
      console.error('Error al verificar si es evento de varios días:', error);
      return false;
    }
  }, [event.startDate, event.endDate]);

  const getTooltipText = () => {
    let text = event.name;
    if (view === 'month') {
      if (!isAllDayOrTask && !isMultiDay) { 
        text += `\n${formattedTime(event.startDate)} - ${formattedTime(event.endDate)}`;
      } else if (isMultiDay) {
        text += `\n${format(event.startDate, 'MMM d')} - ${format(event.endDate, 'MMM d')}`;
      } else { 
         text += `\n${format(event.startDate, 'MMM d')}`;
      }
    } else { 
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
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-card dark:bg-[hsl(240,5%,12%)] text-card-foreground", 
        "border border-border/60", 
        "border-l-4", 
        "p-1.5 rounded-md text-xs overflow-hidden shadow-sm hover:shadow-md",
        isDragging ? "shadow-2xl" : "hover:shadow-md"
      )}
      onClick={handleClick}
      title={getTooltipText()}
      data-calendar-event="true" // Keep this for event click detection in parent
    >
      <div className="font-semibold truncate">{event.name}</div>
      {view === 'month' && !isAllDayOrTask && !isMultiDay && ( 
         <div className="truncate opacity-80">{formattedTime(event.startDate)}</div>
      )}
      {(view === 'week' || view === 'day') && event.description && (
        <p className="text-xs truncate opacity-75 mt-0.5">{event.description}</p>
      )}
    </div>
  );
}
