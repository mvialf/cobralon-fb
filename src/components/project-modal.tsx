
// src/components/project-modal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ProjectType, ProjectStatus, ProjectClassification } from '@/types/project';
import type { Client } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { format as formatDateFns, parseISO } from 'date-fns'; // Using date-fns for formatting
// import { es } from 'date-fns/locale'; // Locale already handled in calendar-utils

// Helper to format currency (Chilean Pesos example)
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};


interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ProjectType) => void;
  projectData?: ProjectType;
  clients: Client[];
}

const initialProjectState: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'> & { id?: string } = {
  projectNumber: '',
  clientId: '',
  description: '',
  date: new Date(), // Default to today
  subtotal: 0,
  taxRate: 19, // Default tax rate, e.g., 19% for IVA in Chile
  status: 'ingresado',
  classification: 'bajo',
  collect: false, // Non-optional, default to false
  // Optional fields
  endDate: undefined,
  phone: '',
  address: '',
  commune: '',
  region: 'RM',
  windowsCount: 0,
  squareMeters: 0,
  uninstall: false,
  uninstallTypes: [],
  uninstallOther: '',
  glosa: '',
  isHidden: false,
};


const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, projectData, clients }) => {
  const [project, setProject] = useState<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'> & { id?: string }>(initialProjectState);
  const { toast } = useToast();

  // Helper to format date for input type="date"
  const formatDateForInput = (date: Date | string | undefined): string => {
    if (!date) return '';
    // If it's already a string in 'yyyy-MM-dd' format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    try {
      // Attempt to parse if it's a string in a different format or an ISO string
      const d = typeof date === 'string' ? parseISO(date) : date;
      return formatDateFns(d, 'yyyy-MM-dd');
    } catch (error) {
      console.warn("Error formatting date for input:", date, error);
      return ''; // Fallback for invalid dates
    }
  };


  useEffect(() => {
    if (projectData) {
      setProject({
        ...initialProjectState, // Start with defaults for all fields
        ...projectData, // Override with actual project data
        date: projectData.date, // Keep as Date object
        endDate: projectData.endDate, // Keep as Date object or undefined
        // Ensure boolean fields have a default if undefined in projectData, though types should prevent this
        collect: projectData.collect ?? false,
        uninstall: projectData.uninstall ?? false,
        isHidden: projectData.isHidden ?? false,
      });
    } else {
      // Create a new date object for new projects to avoid mutating the initialProjectState.date
      setProject({...initialProjectState, date: new Date() });
    }
  }, [projectData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setProject(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'date' && name === 'date') {
       setProject(prev => ({ ...prev, date: value ? parseISO(value) : new Date() }));
    } else if (type === 'date' && name === 'endDate') {
       setProject(prev => ({ ...prev, endDate: value ? parseISO(value) : undefined }));
    }
    else {
      setProject(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: keyof ProjectType, value: string) => {
    setProject(prev => ({ ...prev, [name]: value as any }));
  };

  const handleSwitchChange = (name: keyof ProjectType, checked: boolean) => {
    setProject(prev => ({ ...prev, [name]: checked }));
  };


  const calculateTotal = (subtotal: number, taxRate: number): number => {
    return subtotal * (1 + taxRate / 100);
  };

  const handleSave = () => {
    if (!project.projectNumber.trim()) {
      toast({ title: "Error de Validación", description: "El número de proyecto es obligatorio.", variant: "destructive" });
      return;
    }
    if (!project.clientId) {
      toast({ title: "Error de Validación", description: "Debe seleccionar un cliente.", variant: "destructive" });
      return;
    }
     if (!project.date) {
      toast({ title: "Error de Validación", description: "La fecha de inicio es obligatoria.", variant: "destructive" });
      return;
    }


    const total = parseFloat(calculateTotal(project.subtotal, project.taxRate).toFixed(2));

    const projectToSave: ProjectType = {
      ...initialProjectState, // ensures all fields are present with defaults
      ...project,
      id: project.id || '',
      total: total,
      balance: projectData?.balance !== undefined ? projectData.balance : total,
      date: project.date instanceof Date ? project.date : parseISO(project.date as unknown as string),
      endDate: project.endDate ? (project.endDate instanceof Date ? project.endDate : parseISO(project.endDate as unknown as string)) : undefined,
      // Ensure all required boolean fields have a value
      collect: project.collect ?? false,
      uninstall: project.uninstall ?? false,
      isHidden: project.isHidden ?? false,
    };

    onSave(projectToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{projectData ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
          <DialogDescription>
            {projectData ? 'Actualiza los detalles del proyecto existente.' : 'Completa la información para crear un nuevo proyecto.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Row 1: Project Number, Client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectNumber">Nº Proyecto <span className="text-destructive">*</span></Label>
              <Input id="projectNumber" name="projectNumber" value={project.projectNumber} onChange={handleChange} placeholder="Ej: P2024-001" />
            </div>
            <div>
              <Label htmlFor="clientId">Cliente <span className="text-destructive">*</span></Label>
              <Select name="clientId" value={project.clientId} onValueChange={(value) => handleSelectChange('clientId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" value={project.description || ''} onChange={handleChange} placeholder="Breve descripción del proyecto" />
          </div>

          {/* Row 3: Start Date, End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha de Inicio <span className="text-destructive">*</span></Label>
              <Input id="date" name="date" type="date" value={formatDateForInput(project.date)} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha de Término (Estimada)</Label>
              <Input id="endDate" name="endDate" type="date" value={formatDateForInput(project.endDate)} onChange={handleChange} />
            </div>
          </div>

          {/* Row 4: Subtotal, Tax Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subtotal">Subtotal <span className="text-destructive">*</span></Label>
              <Input id="subtotal" name="subtotal" type="number" value={project.subtotal} onChange={handleChange} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="taxRate">Tasa de Impuesto (%) <span className="text-destructive">*</span></Label>
              <Input id="taxRate" name="taxRate" type="number" value={project.taxRate} onChange={handleChange} placeholder="19" />
            </div>
          </div>
           {/* Display Calculated Total */}
           <div>
              <Label>Valor Total (Calculado)</Label>
              <Input value={formatCurrency(calculateTotal(project.subtotal, project.taxRate))} readOnly disabled className="bg-muted/50" />
            </div>


          {/* Row 5: Status, Classification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Estado <span className="text-destructive">*</span></Label>
              <Select name="status" value={project.status} onValueChange={(value) => handleSelectChange('status', value as ProjectStatus)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingresado">Ingresado</SelectItem>
                  <SelectItem value="en progreso">En Progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="pendiente aprobación">Pendiente Aprobación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="classification">Clasificación <span className="text-destructive">*</span></Label>
              <Select name="classification" value={project.classification} onValueChange={(value) => handleSelectChange('classification', value as ProjectClassification)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar clasificación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bajo">Bajo</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

           {/* Optional Contact and Location Info */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Teléfono Contacto (Proyecto)</Label>
              <Input id="phone" name="phone" value={project.phone || ''} onChange={handleChange} placeholder="Teléfono opcional" />
            </div>
            <div>
              <Label htmlFor="address">Dirección (Proyecto)</Label>
              <Input id="address" name="address" value={project.address || ''} onChange={handleChange} placeholder="Dirección de la obra" />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commune">Comuna</Label>
              <Input id="commune" name="commune" value={project.commune || ''} onChange={handleChange} placeholder="Comuna" />
            </div>
            <div>
              <Label htmlFor="region">Región</Label>
              <Input id="region" name="region" value={project.region || 'RM'} onChange={handleChange} placeholder="Región" />
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="windowsCount">Cantidad de Ventanas</Label>
                <Input id="windowsCount" name="windowsCount" type="number" value={project.windowsCount || 0} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="squareMeters">Metros Cuadrados (m²)</Label>
                <Input id="squareMeters" name="squareMeters" type="number" step="any" value={project.squareMeters || 0} onChange={handleChange} />
            </div>
          </div>

          {/* Uninstall Details */}
          <div className="space-y-4 border p-4 rounded-md">
            <div className="flex items-center space-x-2">
                <Switch id="uninstall" name="uninstall" checked={project.uninstall || false} onCheckedChange={(checked) => handleSwitchChange('uninstall', checked)} />
                <Label htmlFor="uninstall">¿Requiere Desinstalación?</Label>
            </div>
            {project.uninstall && (
                <>
                    <div>
                        <Label htmlFor="uninstallTypes">Tipos de Desinstalación (separados por coma)</Label>
                        <Input
                            id="uninstallTypes"
                            name="uninstallTypes"
                            value={Array.isArray(project.uninstallTypes) ? project.uninstallTypes.join(', ') : ''}
                            onChange={(e) => setProject(prev => ({ ...prev, uninstallTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                            placeholder="Ej: Marcos antiguos, Protecciones"
                        />
                    </div>
                    <div>
                        <Label htmlFor="uninstallOther">Otro Tipo de Desinstalación</Label>
                        <Input id="uninstallOther" name="uninstallOther" value={project.uninstallOther || ''} onChange={handleChange} placeholder="Especificar si es 'otro'" />
                    </div>
                </>
            )}
          </div>

          {/* Glosa and Collect */}
          <div>
            <Label htmlFor="glosa">Glosa / Notas Adicionales</Label>
            <Textarea id="glosa" name="glosa" value={project.glosa || ''} onChange={handleChange} placeholder="Notas importantes, observaciones del proyecto..." />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="collect" name="collect" checked={project.collect} onCheckedChange={(checked) => handleSwitchChange('collect', checked)} />
            <Label htmlFor="collect">¿Retirar Materiales? <span className="text-destructive">*</span></Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isHidden" name="isHidden" checked={project.isHidden || false} onCheckedChange={(checked) => handleSwitchChange('isHidden', checked)} />
            <Label htmlFor="isHidden">Ocultar Proyecto (Archivar)</Label>
          </div>

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>Guardar Proyecto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
