'use client';
import React from 'react';
import { ProjectType } from '@/types/project';
import { cn } from '@/lib/utils';

interface DashboardProjectItemProps {
  /** Objeto del proyecto que contiene la información a mostrar */
  project: ProjectType;
  /** Contenido para la sección izquierda (información del proyecto/cliente) */
  leftContent: React.ReactNode;
  /** Contenido para la sección derecha (información financiera) */
  rightContent: React.ReactNode;
  /** Clases CSS adicionales para personalizar el contenedor */
  className?: string;
}

/**
 * Componente contenedor para mostrar un ítem de proyecto en el dashboard
 * con dos secciones: izquierda y derecha
 */
export const DashboardProjectItem: React.FC<DashboardProjectItemProps> = ({
  project,
  leftContent,
  rightContent,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between w-full p-3 border-b border-border/60 last:border-0',
        className
      )}
    >
      <div className='flex-1 min-w-0 pr-4'>{leftContent}</div>
      <div className='flex-shrink-0'>{rightContent}</div>
    </div>
  );
};

export default DashboardProjectItem;
