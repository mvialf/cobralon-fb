"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from '@/lib/calendar-utils';
import type { ViewOption } from '@/types/event';
import { ChevronLeft, ChevronRight, Plus, Search, CalendarDays, Columns, SigmaSquare, Wrench, Briefcase, Users } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface CalendarToolbarProps {
  currentDate: Date;
  currentView: ViewOption;
  filterTerm: string;
  onDateChange: (newDate: Date) => void;
  onViewChange: (newView: ViewOption) => void;
  onFilterChange: (term: string) => void;
  onAddEvent: (type?: 'Proyecto' | 'Postventa' | 'Visita') => void;
  onToday: () => void;
}

export function CalendarToolbar({
  currentDate,
  currentView,
  filterTerm,
  onDateChange,
  onViewChange,
  onFilterChange,
  onAddEvent,
  onToday,
}: CalendarToolbarProps) {
  
  const handlePrev = () => {
    let newDate;
    if (currentView === 'month') {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    } else if (currentView === 'week') {
      newDate = new Date(currentDate.setDate(currentDate.getDate() - 7));
    } else { // day
      newDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    let newDate;
    if (currentView === 'month') {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    } else if (currentView === 'week') {
      newDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
    } else { // day
      newDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
    onDateChange(newDate);
  };

  const getTitle = () => {
    if (currentView === 'month') {
      return format(currentDate, 'MMMM yyyy');
    }
    if (currentView === 'week') {
      const start = format(currentDate, 'MMM d');
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + 6);
      const end = format(endDate, 'MMM d, yyyy');
      return `${start} - ${end}`;
    }
    return format(currentDate, 'MMMM d, yyyy');
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mx-4 mb-6 
    border-b  border-border bg-card rounded-t-lg">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button variant="outline" onClick={onToday}>Hoy</Button>
        <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Periodo anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext} aria-label="Periodo siguiente">
          <ChevronRight className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground ml-2 whitespace-nowrap">
          {getTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filtrar eventos..."
            value={filterTerm}
            onChange={(e) => onFilterChange(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={currentView} onValueChange={(value) => onViewChange(value as ViewOption)}>
          <SelectTrigger className="w-full sm:w-[120px]" aria-label="Seleccionar vista de calendario">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month"><CalendarDays className="inline-block mr-2 h-4 w-4"/>Mes</SelectItem>
            <SelectItem value="week"><Columns className="inline-block mr-2 h-4 w-4"/>Semana</SelectItem>
            <SelectItem value="day"><SigmaSquare className="inline-block mr-2 h-4 w-4"/>Día</SelectItem> 
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" /> Añadir Evento
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddEvent('Proyecto')}>
              <Briefcase className="mr-2 h-4 w-4" /> Proyecto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddEvent('Postventa')}>
              <Wrench className="mr-2 h-4 w-4" /> Postventa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddEvent('Visita')}>
              <Users className="mr-2 h-4 w-4" /> Visita
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
