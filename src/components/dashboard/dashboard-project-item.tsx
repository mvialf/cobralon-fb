import React from 'react';
import Link from 'next/link';
import { ProjectType } from '@/types/project';

// Props para el componente de ítem de proyecto en el dashboard
interface DashboardProjectItemProps {
  project: ProjectType;
  icon: React.ElementType;
  iconColorClass: string;
  line1TextMain: string;
  line1TextSecondary?: string;
  line2Text: string;
  href: string;
}

/**
 * Componente reutilizable para mostrar un proyecto en las listas del dashboard
 * Se usa tanto para "Proyectos Recientes" como para "Proyectos por Cobrar"
 */
export const DashboardProjectItem: React.FC<DashboardProjectItemProps> = ({
  project,
  icon: Icon,
  iconColorClass,
  line1TextMain,
  line1TextSecondary,
  line2Text,
  href,
}) => {
  return (
    <div className="flex items-center border-b border-border/60 pb-3 pt-2 last:border-0 last:pb-0 hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors">
      <div className="mr-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <h4 className="font-medium truncate">
          <Link href={href} className="hover:underline">
            {line1TextMain}
          </Link>
          {line1TextSecondary && <span className="text-muted-foreground"> - {line1TextSecondary}</span>}
        </h4>
        <p className="text-xs text-muted-foreground">
          {line2Text}
        </p>
      </div>
    </div>
  );
};

export default DashboardProjectItem;
