import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';

interface TableToolbarProps {
  children?: React.ReactNode;
  searchPlaceholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const TableToolbar: React.FC<TableToolbarProps> = ({ children, searchPlaceholder = 'Buscar...', value, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-3">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="pl-8 w-full"
        />
      </div>
      <div className="flex-1 flex justify-end items-center gap-2">
        {children}
      </div>
    </div>
  );
};

export { TableToolbar };
