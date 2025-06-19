'use client';

import { cn } from '@/lib/utils';
import type { ProjectType } from '@/types/project';

interface ClientDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  clientName?: string;
  glosa?: string;
  className?: string;
}

/**
 * Componente para mostrar el nombre del cliente junto con información adicional
 * de manera consistente en toda la aplicación.
 */
export function ClientDisplay({ 
  clientName, 
  glosa, 
  className,
  ...props 
}: ClientDisplayProps) {
  // Si no hay nombre de cliente pero hay glosa, usamos la glosa como texto principal
  const displayText = clientName?.trim() || glosa?.trim() || 'Cliente no especificado';
  // Mostrar la glosa solo si es diferente al texto principal
  const showGlosa = glosa?.trim() && glosa.trim() !== displayText;

  return (
    <div 
      className={cn('text-sm text-foreground', className)}
      title={showGlosa ? `${displayText} - ${glosa}` : displayText}
      {...props}
    >
      {displayText}
      {showGlosa && (
        <span className="text-muted-foreground"> - {glosa}</span>
      )}
    </div>
  );
}

/**
 * Versión del componente que acepta un objeto ProjectType
 */
interface ProjectClientDisplayProps extends Omit<ClientDisplayProps, 'clientName' | 'glosa'> {
  project: {
    projectNumber?: string;
    clientName?: string | null;
    glosa?: string | null;
  };
}

/**
 * Componente para mostrar la información de un proyecto de manera consistente
 * Muestra el número de proyecto, nombre del cliente y glosa (si existe) en un formato de dos líneas
 */
export function ProjectClientDisplay({ project, ...props }: ProjectClientDisplayProps) {
  // Si no hay nombre de cliente, usamos 'Cliente no especificado'
  const displayClientName = project.clientName?.trim() || 'Cliente no especificado';
  // Mostrar la glosa solo si existe y es diferente al nombre del cliente
  const showGlosa = project.glosa?.trim() && project.glosa.trim() !== displayClientName;
  
  return (
    <div className="space-y-1" {...props}>
      {project.projectNumber && (
        <div className="text-sm font-medium">{project.projectNumber}</div>
      )}
      <div className="text-xs text-muted-foreground">
        {displayClientName}
        {showGlosa && (
          <span> - {project.glosa?.trim()}</span>
        )}
      </div>
    </div>
  );
}
