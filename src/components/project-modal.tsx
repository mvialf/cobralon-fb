
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronsUpDown } from 'lucide-react';
import type { ProjectType, ProjectStatus } from '@/types/project';
import type { Client } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { format as formatDateFns, parseISO } from 'date-fns'; 

const UNINSTALL_TYPE_OPTIONS = ["Aluminio", "Madera", "Fierro", "PVC", "Americano"];

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
  date: new Date(), 
  subtotal: 0,
  taxRate: 19, 
  status: 'ingresado',
  collect: false, 
  phone: '',
  address: '',
  commune: '',
  region: 'RM',
  windowsCount: 0,
  squareMeters: 0,
  uninstall: false,
  uninstallTypes: [],
  glosa: '',
  isHidden: false,
  isPaid: false,
};


const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, projectData, clients }) => {
  const [project, setProject] = useState<Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'> & { id?: string }>(initialProjectState);
  const { toast } = useToast();
  const [openUninstallTypesPopover, setOpenUninstallTypesPopover] = useState(false);

  const formatDateForInput = (date: Date | string | undefined): string => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    try {
      const d = typeof date === 'string' ? parseISO(date) : date;
      return formatDateFns(d, 'yyyy-MM-dd');
    } catch (error) {
      console.warn("Error formatting date for input:", date, error);
      return ''; 
    }
  };


  useEffect(() => {
    if (projectData) {
      setProject({
        ...initialProjectState, 
        ...projectData, 
        date: projectData.date, 
        collect: projectData.collect ?? false,
        uninstall: projectData.uninstall ?? false,
        uninstallTypes: Array.isArray(projectData.uninstallTypes) ? projectData.uninstallTypes : [],
        isHidden: projectData.isHidden ?? false,
        isPaid: projectData.isPaid ?? false,
      });
    } else {
      setProject({...initialProjectState, date: new Date() });
    }
  }, [projectData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setProject(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'date' && name === 'date') {
       setProject(prev => ({ ...prev, date: value ? parseISO(value) : new Date() }));
    } 
    else {
      setProject(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: keyof Omit<ProjectType, 'endDate'>, value: string) => {
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
      ...initialProjectState, 
      ...project,
      id: project.id || '',
      total: total,
      balance: projectData?.balance !== undefined ? projectData.balance : total,
      date: project.date instanceof Date ? project.date : parseISO(project.date as unknown as string),
      collect: project.collect ?? false,
      uninstall: project.uninstall ?? false,
      uninstallTypes: Array.isArray(project.uninstallTypes) ? project.uninstallTypes : [],
      isHidden: project.isHidden ?? false,
      isPaid: project.isPaid ?? false,
    } as ProjectType; 

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
              <Label htmlFor="projectNumber-modal">Nº Proyecto <span className="text-destructive">*</span></Label>
              <Input id="projectNumber-modal" name="projectNumber" value={project.projectNumber} onChange={handleChange} placeholder="Ej: P2024-001" />
            </div>
            <div>
              <Label htmlFor="clientId-modal">Cliente <span className="text-destructive">*</span></Label>
              <Select name="clientId" value={project.clientId} onValueChange={(value) => handleSelectChange('clientId', value)}>
                <SelectTrigger id="clientId-modal">
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
            <Label htmlFor="description-modal">Descripción</Label>
            <Textarea id="description-modal" name="description" value={project.description || ''} onChange={handleChange} placeholder="Breve descripción del proyecto" />
          </div>

          {/* Row 3: Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <Label htmlFor="date-modal">Fecha de Inicio <span className="text-destructive">*</span></Label>
              <Input id="date-modal" name="date" type="date" value={formatDateForInput(project.date)} onChange={handleChange} />
            </div>
          </div>

          {/* Row 4: Subtotal, Tax Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subtotal-modal">Subtotal <span className="text-destructive">*</span></Label>
              <Input id="subtotal-modal" name="subtotal" type="number" value={project.subtotal} onChange={handleChange} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="taxRate-modal">Tasa de Impuesto (%) <span className="text-destructive">*</span></Label>
              <Input id="taxRate-modal" name="taxRate" type="number" value={project.taxRate} onChange={handleChange} placeholder="19" />
            </div>
          </div>
           {/* Display Calculated Total */}
           <div>
              <Label>Valor Total (Calculado)</Label>
              <Input value={formatCurrency(calculateTotal(project.subtotal, project.taxRate))} readOnly disabled className="bg-muted/50" />
            </div>


          {/* Row 5: Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status-modal">Estado <span className="text-destructive">*</span></Label>
              <Select name="status" value={project.status} onValueChange={(value) => handleSelectChange('status', value as ProjectStatus)}>
                <SelectTrigger id="status-modal"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingresado">Ingresado</SelectItem>
                  <SelectItem value="en progreso">En Progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="pendiente aprobación">Pendiente Aprobación</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

           {/* Optional Contact and Location Info */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone-modal">Teléfono Contacto (Proyecto)</Label>
              <Input id="phone-modal" name="phone" value={project.phone || ''} onChange={handleChange} placeholder="Teléfono opcional" />
            </div>
            <div>
              <Label htmlFor="address-modal">Dirección (Proyecto)</Label>
              <Input id="address-modal" name="address" value={project.address || ''} onChange={handleChange} placeholder="Dirección de la obra" />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commune-modal">Comuna</Label>
              <Input id="commune-modal" name="commune" value={project.commune || ''} onChange={handleChange} placeholder="Comuna" />
            </div>
            <div>
              <Label htmlFor="region-modal">Región</Label>
              <Input id="region-modal" name="region" value={project.region || 'RM'} onChange={handleChange} placeholder="Región" />
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="windowsCount-modal">Cantidad de Ventanas</Label>
                <Input id="windowsCount-modal" name="windowsCount" type="number" value={project.windowsCount || 0} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="squareMeters-modal">Metros Cuadrados (m²)</Label>
                <Input id="squareMeters-modal" name="squareMeters" type="number" step="any" value={project.squareMeters || 0} onChange={handleChange} />
            </div>
          </div>

          {/* Uninstall Details */}
          <div className="space-y-4 border p-4 rounded-md">
            <div className="flex items-center space-x-2">
                <Switch id="uninstall-modal" name="uninstall" checked={project.uninstall || false} onCheckedChange={(checked) => handleSwitchChange('uninstall', checked)} />
                <Label htmlFor="uninstall-modal">¿Requiere Desinstalación?</Label>
            </div>
            {project.uninstall && (
                <div className="pl-6 space-y-4 border-l-2 border-muted ml-2">
                    <div>
                        <Label htmlFor="uninstallTypes-modal-trigger">Tipos de Desinstalación</Label>
                        <Popover open={openUninstallTypesPopover} onOpenChange={setOpenUninstallTypesPopover}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                id="uninstallTypes-modal-trigger"
                                className="w-full justify-between mt-1"
                              >
                                {(project.uninstallTypes || []).length > 0
                                  ? (project.uninstallTypes || []).join(', ')
                                  : "Seleccionar tipos..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar tipo..." />
                                <CommandList>
                                  <CommandEmpty>No se encontró el tipo.</CommandEmpty>
                                  <CommandGroup>
                                    {UNINSTALL_TYPE_OPTIONS.map((option) => (
                                      <CommandItem
                                        key={`modal-${option}`}
                                        onSelect={() => {
                                          const currentValues = project.uninstallTypes || [];
                                          const newValues = currentValues.includes(option)
                                            ? currentValues.filter(val => val !== option)
                                            : [...currentValues, option];
                                          setProject(prev => ({...prev, uninstallTypes: newValues}));
                                        }}
                                      >
                                        <Checkbox
                                          className="mr-2"
                                          checked={project.uninstallTypes?.includes(option)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = project.uninstallTypes || [];
                                            const newValues = checked
                                              ? [...currentValues, option]
                                              : currentValues.filter(val => val !== option);
                                            setProject(prev => ({...prev, uninstallTypes: newValues}));
                                          }}
                                        />
                                        {option}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                    </div>
                </div>
            )}
          </div>

          {/* Glosa and Collect */}
          <div>
            <Label htmlFor="glosa-modal">Glosa / Notas Adicionales</Label>
            <Textarea id="glosa-modal" name="glosa" value={project.glosa || ''} onChange={handleChange} placeholder="Notas importantes, observaciones del proyecto..." />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="collect-modal" name="collect" checked={project.collect} onCheckedChange={(checked) => handleSwitchChange('collect', checked)} />
            <Label htmlFor="collect-modal">¿Retirar Materiales? <span className="text-destructive">*</span></Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isHidden-modal" name="isHidden" checked={project.isHidden || false} onCheckedChange={(checked) => handleSwitchChange('isHidden', checked)} />
            <Label htmlFor="isHidden-modal">Ocultar Proyecto (Archivar)</Label>
          </div>
           <div className="flex items-center space-x-2">
            <Switch id="isPaid-modal" name="isPaid" checked={project.isPaid || false} onCheckedChange={(checked) => handleSwitchChange('isPaid', checked)} />
            <Label htmlFor="isPaid-modal">Proyecto Pagado Completamente</Label>
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

