import React from 'react';
import { cn } from '@/lib/utils'; // Asumo que tienes esta utilidad para las clases

interface HeaderNavProps extends React.HTMLAttributes<HTMLElement> {}

export function HeaderNav({ className, ...props }: HeaderNavProps) {
  // Definimos la altura del header. Esto será útil para el margen del sidebar.
  // h-16 en Tailwind es 4rem o 64px.
  const headerHeightClass = 'h-16';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 flex items-center px-6 bg-background border-b', // z-40 para estar sobre el contenido pero debajo de modales (z-50) si los hubiera
        headerHeightClass,
        className
      )}
      {...props}
    >
      <div className="flex items-center">
        <span className="text-xl font-bold">CalReact</span>
      </div>
      {/* Aquí puedes añadir más elementos como un menú de usuario, notificaciones, etc. */}
      <div className="ml-auto">
        {/* Ejemplo: <UserNav /> */}
      </div>
    </header>
  );
}

// Constante para la altura del header, para ser usada en otros componentes
export const HEADER_HEIGHT_CLASS = 'h-16'; // Corresponde a 64px
export const HEADER_HEIGHT_PX = 64; // Valor numérico en píxeles
