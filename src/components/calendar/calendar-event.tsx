
"use client";

import { useMemo } from 'react';
import type { EventType } from '@/types/event';
import { format, isSameDay } from '@/lib/calendar-utils';
import { isValid } from 'date-fns';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

  // Configurar el evento como draggable
  const {attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging} = useDraggable({
    id: event.id,
    data: eventData,
    disabled: !enableDragAndDrop,
  });

  // Configurar el evento como droppable para permitir soltar otros eventos sobre él
  const {setNodeRef: setDroppableRef, isOver} = useDroppable({
    id: `droppable-event-${event.id}`,
    data: {
      type: 'event-target',
      accepts: ['event'],
      eventId: event.id,
      date: event.startDate,
      targetEvent: event
    },
    disabled: !enableDragAndDrop,
  });
  
  // Combinar los refs para que el elemento sea tanto draggable como droppable
  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  // Determinar el color según el tipo de evento
  const getEventColor = () => {
    // Si el evento tiene un color personalizado, usar ese primero
    if (event.color) return event.color;
    
    // Si no, asignar un color según el tipo
    switch(event.type) {
      case 'Proyecto':
        return 'hsl(221, 83%, 53%)'; // Azul
      case 'Postventa':
        return 'hsl(142, 71%, 45%)'; // Verde
      case 'Visita':
        return 'hsl(31, 90%, 50%)';  // Naranja
      default:
        return 'hsl(var(--primary))';
    }
  };
  
  // Estilos para el evento
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    borderLeftColor: getEventColor(),
    zIndex: isDragging ? 1000 : (isOver ? 999 : 'auto'),
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? 'none' : 'transform 200ms ease',
    cursor: enableDragAndDrop ? 'grab' : 'pointer',
    boxShadow: isOver ? '0 0 0 2px hsl(var(--primary))' : undefined,
  };


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onClick(event);
  };
  
  // Validar fechas antes de usarlas  
  const isMultiDay = useMemo(() => {
    try {
      return !isSameDay(event.startDate, event.endDate);
    } catch (error) {
      console.error('Error al verificar si es evento de varios días:', error);
      return false;
    }
  }, [event.startDate, event.endDate]);

  // Formatear la fecha en formato local
  const formatLocalDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTooltipText = () => {
    let text = event.name;
    
    if (isMultiDay) {
      text += `\nDel ${formatLocalDate(event.startDate)} al ${formatLocalDate(event.endDate)}`;
    } else {
      text += `\n${formatLocalDate(event.startDate)}`;
    }
    
    if (event.description) {
      text += `\n\n${event.description}`;
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
        "p-1.5 rounded-md text-xs overflow-hidden shadow-sm hover:shadow-md relative",
        isDragging ? "shadow-2xl" : "hover:shadow-md",
        isOver ? "ring-2 ring-primary ring-offset-1" : ""
      )}
      onClick={handleClick}
      title={getTooltipText()}
      data-calendar-event="true" // Keep this for event click detection in parent
    >
      <div className="font-semibold truncate">{event.name}</div>
      {isMultiDay && (
        <div className="text-xs opacity-80 truncate">
          {formatLocalDate(event.startDate)} - {formatLocalDate(event.endDate)}
        </div>
      )}
      {!isMultiDay && view !== 'month' && event.description && (
        <p className="text-xs truncate opacity-75 mt-0.5">{event.description}</p>
      )}
    </div>
  );
}
