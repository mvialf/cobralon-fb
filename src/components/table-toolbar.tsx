
import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  children?: ReactNode;
  className?: string;
}

const TableToolbar: React.FC<TableToolbarProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border-b", className)}>
      {children}
    </div>
  );
};

export default TableToolbar;
