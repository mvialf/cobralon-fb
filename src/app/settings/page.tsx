
// src/app/settings/page.tsx
"use client"; 

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addClient, type ClientImportData } from '@/services/clientService';
import { addProject, type ProjectImportData } from '@/services/projectService';
import type { ProjectStatus } from '@/types/project';
import { Loader2, HelpCircle } from 'lucide-react';
import { useTheme } from "next-themes";
import { FileDndInput } from '@/components/ui/file-dnd-input';
import { CopyableCodeBlock } from '@/components/ui/copyable-code-block';

const clientJsonSchemaExample = `
[
  {
    "id": "opcional-uuid-existente-para-reemplazar",
    "name": "Nombre Cliente Requerido S.A.",
    "phone": "123456789 (opcional, puede ser string o null)",
    "email": "cliente@ejemplo.com (opcional, puede ser string o null)",
    "createdAt": "2023-10-26T10:00:00.000Z (opcional, formato ISO 8601 o YYYY-MM-DD)"
  },
  {
    "name": "Otro Cliente (ID autogenerado)",
    "phone": null,
    "email": "otro@ejemplo.com"
  }
]
`.trim();

const projectJsonSchemaExample = `
[
  {
    "id": "opcional-uuid-existente-para-reemplazar",
    "projectNumber": "P2024-001 (requerido)",
    "clientId": "ID_DEL_CLIENTE_EXISTENTE_EN_FIRESTORE (requerido)",
    "description": "Descripción opcional del proyecto detallada.",
    "date": "2024-07-28 (requerido, formato YYYY-MM-DD o ISO 8601)",
    "subtotal": 1500.75 (requerido, número)",
    "taxRate": 19 (requerido, ej. 19 para 19%)",
    "status": "ingresado (requerido, ej: ingresado, en progreso, completado, etc.)",
    "collect": true (requerido, boolean: true o false)",
    "endDate": "2024-12-31 (opcional, YYYY-MM-DD o ISO 8601)",
    "createdAt": "2023-10-26T10:00:00.000Z (opcional, formato ISO 8601 o YYYY-MM-DD)",
    "glosa": "Glosa breve o notas adicionales (opcional)",
    "phone": "+56912345678 (opcional, teléfono específico del proyecto)",
    "address": "Calle Falsa 123, Depto 4B (opcional)",
    "commune": "Comuna Ejemplo (opcional)",
    "region": "RM (opcional, defecto 'RM' si se omite)",
    "windowsCount": 5 (opcional, número, defecto 0)",
    "squareMeters": 50.5 (opcional, número, defecto 0)",
    "uninstall": false (opcional, boolean, defecto false)",
    "uninstallTypes": ["Marcos antiguos", "Protecciones (opcional, array de strings)"],
    "uninstallOther": "Retiro de escombros específicos (opcional)",
    "isHidden": false (opcional, boolean, defecto false)"
  }
]
`.trim();


export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [clientFile, setClientFile] = useState<File | null>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [isImportingClients, setIsImportingClients] = useState(false);
  const [isImportingProjects, setIsImportingProjects] = useState(false);
  const [isClientSchemaModalOpen, setIsClientSchemaModalOpen] = useState(false);
  const [isProjectSchemaModalOpen, setIsProjectSchemaModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClientFileSelected = (file: File | null) => {
    setClientFile(file);
  };

  const handleProjectFileSelected = (file: File | null) => {
    setProjectFile(file);
  };

  const handleImportClients = async () => {
    if (!clientFile) {
      toast({ title: "Error", description: "Por favor, selecciona un archivo de clientes.", variant: "destructive" });
      return;
    }
    setIsImportingClients(true);
    const errorMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const fileContent = await clientFile.text();
      const rawClientsToImport: any[] = JSON.parse(fileContent);

      if (!Array.isArray(rawClientsToImport)) {
        throw new Error("El archivo JSON de clientes debe contener un array.");
      }
      
      const validClientItems = rawClientsToImport.filter(item => {
        if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
            const msg = `Item omitido: no es un objeto de cliente válido o está vacío. Item: ${JSON.stringify(item)}`;
            console.warn(msg); 
            errorMessages.push(msg);
            errorCount++;
            return false;
        }
        return true;
      });


      const importPromises = validClientItems.map(async (item) => {
        // Basic validation: 'name' is required and must be a non-empty string
        if (!item || typeof item.name !== 'string' || item.name.trim() === '') {
          const msg = `Cliente omitido: falta 'name' o es inválido. ID: ${item?.id || 'N/A'}`;
          throw new Error(msg);
        }

        const clientPayload: ClientImportData = {
          name: item.name,
        };
        
        // Optional fields: id, phone, email, createdAt
        if (item.id && typeof item.id === 'string' && item.id.trim() !== '') {
          clientPayload.id = item.id.trim();
        }
        // For phone and email, allow explicit null or a string value
        if (item.hasOwnProperty('phone')) {
            clientPayload.phone = item.phone === null ? null : String(item.phone);
        }
        if (item.hasOwnProperty('email')) {
            clientPayload.email = item.email === null ? null : String(item.email);
        }

        // Handle createdAt from JSON (string or Date)
        if (item.createdAt) {
          if (typeof item.createdAt === 'string' || item.createdAt instanceof Date) {
            const dateTest = new Date(item.createdAt);
            if (isNaN(dateTest.getTime())) {
              // If date is invalid, service will use serverTimestamp
              console.warn(`Fecha 'createdAt' inválida para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
            } else {
              clientPayload.createdAt = dateTest;
            }
          } else {
            console.warn(`Formato 'createdAt' inesperado para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
          }
        }
        
        try {
          return await addClient(clientPayload);
        } catch (serviceError: any) {
          throw new Error(`Error al guardar cliente '${item.name || item.id || 'Desconocido'}': ${serviceError.message}`);
        }
      });

      const results = await Promise.allSettled(importPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else { 
          errorCount++;
          const errorMessage = result.reason?.message || 'Error desconocido durante la importación del cliente.';
          errorMessages.push(errorMessage);
          console.error("Error en la importación de cliente:", result.reason);
        }
      });
      
      let description = `${successCount} clientes importados exitosamente. ${errorCount} errores.`;
      if (errorMessages.length > 0) {
        description += ` Detalles: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`;
      }

      toast({
        title: "Importación de Clientes Completada",
        description: description,
        variant: errorCount > 0 ? "destructive" : "default",
        duration: errorCount > 0 ? 10000 : 5000,
      });

    } catch (error: any) {
      console.error("Error durante la importación de clientes:", error);
      toast({
        title: "Error de Importación General",
        description: `No se pudo importar clientes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingClients(false);
      setClientFile(null); 
    }
  };

 const handleImportProjects = async () => {
    if (!projectFile) {
      toast({ title: "Error", description: "Por favor, selecciona un archivo de proyectos.", variant: "destructive" });
      return;
    }
    setIsImportingProjects(true);
    let successCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    try {
      const fileContent = await projectFile.text();
      const projectsToImportJSON: any[] = JSON.parse(fileContent);

      if (!Array.isArray(projectsToImportJSON)) {
        throw new Error("El archivo JSON de proyectos debe contener un array.");
      }

      const validProjectItems = projectsToImportJSON.filter(item => {
        if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
          const msg = `Item de proyecto omitido: no es un objeto válido o está vacío. Item: ${JSON.stringify(item)}`;
          console.warn(msg);
          errorMessages.push(msg);
          errorCount++;
          return false;
        }
        return true;
      });

      const importPromises = validProjectItems.map(async (proj) => {
        try {
            const currentProjTyped = proj as ProjectImportData; 
            const requiredFields: (keyof Omit<ProjectImportData, 'id' | 'createdAt' | 'endDate' | 'description' | 'glosa' | 'phone' | 'address' | 'commune' | 'region' | 'windowsCount' | 'squareMeters' | 'uninstall' | 'uninstallTypes' | 'uninstallOther' | 'isHidden'>)[] = ['projectNumber', 'clientId', 'date', 'subtotal', 'taxRate', 'status', 'collect'];
            
            const missingFields = requiredFields.filter(field => {
              const value = currentProjTyped[field as keyof ProjectImportData];
              if (field === 'collect') return typeof value !== 'boolean'; // Collect must be a boolean
              if (typeof value === 'string') return value.trim() === ''; // String fields must not be empty
              if (typeof value === 'number') return isNaN(value); // Number fields must be valid numbers
              return value === undefined || value === null; // Other fields must not be undefined or null
            });
            
            if (missingFields.length > 0) {
               const msg = `Proyecto '${currentProjTyped.projectNumber || 'Desconocido'}' omitido: faltan campos obligatorios o son inválidos: ${missingFields.join(', ')}.`;
               throw new Error(msg);
            }

            let projectDate: Date;
            try {
              projectDate = new Date(currentProjTyped.date as string); 
              if (isNaN(projectDate.getTime())) throw new Error('Formato de fecha inválido para "date"');
            } catch (e: any) {
              throw new Error(`Proyecto '${currentProjTyped.projectNumber}': Fecha de inicio inválida. ${e.message}. Valor: ${currentProjTyped.date}`);
            }
            
            let projectEndDate: Date | undefined = undefined;
            if (currentProjTyped.endDate) {
              try {
                projectEndDate = new Date(currentProjTyped.endDate as string);
                if (isNaN(projectEndDate.getTime())) {
                   console.warn(`Proyecto '${currentProjTyped.projectNumber}': Fecha de fin inválida, se omitirá. Valor:`, currentProjTyped.endDate);
                   projectEndDate = undefined;
                }
              } catch (e) {
                console.warn(`Proyecto '${currentProjTyped.projectNumber}': Error al parsear fecha de fin, se omitirá. Valor:`, currentProjTyped.endDate);
                projectEndDate = undefined;
              }
            }

            let projectCreatedAt: Date | undefined = undefined;
            if (currentProjTyped.createdAt) {
              try {
                  projectCreatedAt = new Date(currentProjTyped.createdAt as string);
                  if (isNaN(projectCreatedAt.getTime())) {
                      console.warn(`Proyecto '${currentProjTyped.projectNumber}': Fecha de creación inválida, se usará timestamp del servidor. Valor:`, currentProjTyped.createdAt);
                      projectCreatedAt = undefined;
                  }
              } catch(e) {
                  console.warn(`Proyecto '${currentProjTyped.projectNumber}': Error al parsear fecha de creación, se usará timestamp del servidor. Valor:`, currentProjTyped.createdAt);
                  projectCreatedAt = undefined;
              }
            }

            const projectDataPayload: ProjectImportData = {
              id: (currentProjTyped.id && typeof currentProjTyped.id === 'string') ? currentProjTyped.id.trim() : undefined,
              projectNumber: String(currentProjTyped.projectNumber).trim(),
              clientId: String(currentProjTyped.clientId).trim(),
              date: projectDate,
              subtotal: Number(currentProjTyped.subtotal),
              taxRate: Number(currentProjTyped.taxRate),
              status: currentProjTyped.status as ProjectStatus,
              collect: typeof currentProjTyped.collect === 'boolean' ? currentProjTyped.collect : false,
              
              description: currentProjTyped.description ? String(currentProjTyped.description) : undefined,
              glosa: currentProjTyped.glosa ? String(currentProjTyped.glosa) : undefined,
              endDate: projectEndDate,
              createdAt: projectCreatedAt, 
              phone: currentProjTyped.phone ? String(currentProjTyped.phone) : undefined,
              address: currentProjTyped.address ? String(currentProjTyped.address) : undefined,
              commune: currentProjTyped.commune ? String(currentProjTyped.commune) : undefined,
              region: currentProjTyped.region ? String(currentProjTyped.region) : 'RM', 
              windowsCount: currentProjTyped.windowsCount ? Number(currentProjTyped.windowsCount) : 0,
              squareMeters: currentProjTyped.squareMeters ? Number(currentProjTyped.squareMeters) : 0,
              uninstall: typeof currentProjTyped.uninstall === 'boolean' ? currentProjTyped.uninstall : false,
              uninstallTypes: Array.isArray(currentProjTyped.uninstallTypes) ? currentProjTyped.uninstallTypes.map(String).filter(Boolean) : [],
              uninstallOther: currentProjTyped.uninstallOther ? String(currentProjTyped.uninstallOther) : undefined,
              isHidden: typeof currentProjTyped.isHidden === 'boolean' ? currentProjTyped.isHidden : false,
            };
            
            return await addProject(projectDataPayload);
        } catch (itemError: any) {
            // This catches errors from validation or from addProject service call
            throw new Error(itemError.message || `Error procesando proyecto: ${JSON.stringify(proj)}`);
        }
      });

      const results = await Promise.allSettled(importPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else { 
          errorCount++;
          const errorMessage = result.reason?.message || 'Error desconocido durante la importación del proyecto.';
          errorMessages.push(errorMessage);
          console.error("Error en la importación de proyecto:", result.reason); 
        }
      });
      
      let description = `${successCount} proyectos importados exitosamente. ${errorCount} errores.`;
      if (errorMessages.length > 0) {
        description += ` Detalles: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`;
      }

      toast({
        title: "Importación de Proyectos Completada",
        description: description,
        variant: errorCount > 0 ? "destructive" : "default",
        duration: errorCount > 0 ? 10000 : 5000,
      });

    } catch (error: any) { 
      console.error("Error general durante la importación de proyectos:", error);
      toast({
        title: "Error de Importación General",
        description: `No se pudo importar proyectos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingProjects(false);
      setProjectFile(null);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center gap-4 mb-6 md:mb-8">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Configuración</h1>
          <p className="text-muted-foreground">Administra tus preferencias y datos de la aplicación.</p>
        </div>
      </header>
      <main className="flex-grow">
        <Tabs defaultValue="general" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="datos">Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza cómo se ve y se siente la aplicación.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme" className="text-base">Tema de la aplicación</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecciona tu tema preferido.
                    </p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-full sm:w-[180px]" id="theme">
                      <SelectValue placeholder="Seleccionar tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border rounded-lg">
                   <div className="space-y-0.5">
                    <Label htmlFor="week-start" className="text-base">Inicio de semana</Label>
                     <p className="text-sm text-muted-foreground">
                      Elige qué día comienza tu semana en el calendario.
                    </p>
                  </div>
                  <Select defaultValue="monday">
                    <SelectTrigger className="w-full sm:w-[180px]" id="week-start">
                      <SelectValue placeholder="Seleccionar día" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Domingo</SelectItem>
                      <SelectItem value="monday">Lunes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Administra cómo recibes las notificaciones.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between gap-2 p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="event-reminders" className="text-base">Recordatorios de eventos</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe recordatorios para tus próximos eventos.
                    </p>
                  </div>
                  <Switch id="event-reminders" defaultChecked />
                </div>
                <div className="flex items-center justify-between gap-2 p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-base">Notificaciones por correo</Label>
                     <p className="text-sm text-muted-foreground">
                      Recibe resúmenes y actualizaciones por correo electrónico.
                    </p>
                  </div>
                  <Switch id="email-notifications" />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end pt-4">
                <Button>Guardar Cambios (General)</Button>
            </div>
          </TabsContent>

          <TabsContent value="datos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Importar Datos</CardTitle>
                <CardDescription>Importa clientes o proyectos desde archivos JSON.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="import-clients-dnd" className="text-base font-semibold">Importar Clientes (JSON)</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsClientSchemaModalOpen(true)}>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Arrastra un archivo JSON o haz clic para seleccionar. Campos: `name` (string, req), `id` (string, opc), `phone` (string|null, opc), `email` (string|null, opc), `createdAt` (string ISO 8601 o YYYY-MM-DD, opc).
                  </p>
                  <FileDndInput
                    id="import-clients-dnd"
                    accept=".json"
                    onFileSelected={handleClientFileSelected}
                    disabled={isImportingClients}
                    label={clientFile ? `Archivo seleccionado: ${clientFile.name}` : "Arrastra y suelta tu JSON aquí, o haz clic"}
                    maxSize={5 * 1024 * 1024} // 5MB limit
                  />
                  <Button onClick={handleImportClients} className="w-full sm:w-auto mt-2" disabled={!clientFile || isImportingClients}>
                    {isImportingClients ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Importar Clientes
                  </Button>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="import-projects-dnd" className="text-base font-semibold">Importar Proyectos (JSON)</Label>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsProjectSchemaModalOpen(true)}>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JSON array. Requeridos: `projectNumber`, `clientId`, `date` (YYYY-MM-DD), `subtotal`, `taxRate`, `status`, `collect`. Opc: `id`, `description`, `glosa`, `endDate`, `createdAt`, `phone`, `address`, `commune`, `region`, `windowsCount`, `squareMeters`, `uninstall`, `uninstallTypes` (array de strings), `uninstallOther`, `isHidden`.
                  </p>
                   <FileDndInput
                    id="import-projects-dnd"
                    accept=".json"
                    onFileSelected={handleProjectFileSelected}
                    disabled={isImportingProjects}
                    label={projectFile ? `Archivo seleccionado: ${projectFile.name}` : "Arrastra y suelta tu JSON aquí, o haz clic"}
                    maxSize={10 * 1024 * 1024} // 10MB limit
                  />
                  <Button onClick={handleImportProjects} className="w-full sm:w-auto mt-2" disabled={!projectFile || isImportingProjects}>
                    {isImportingProjects ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Importar Proyectos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isClientSchemaModalOpen} onOpenChange={setIsClientSchemaModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Esquema JSON para Importar Clientes</DialogTitle>
            <DialogDescription>
              Asegúrate de que tu archivo JSON siga esta estructura. Los campos con "(opcional)" pueden omitirse.
              El campo `id` es opcional; si se proporciona y ya existe, se intentará actualizar. Si no, se creará con ese ID.
              Si `id` se omite, se generará uno nuevo.
            </DialogDescription>
          </DialogHeader>
          <CopyableCodeBlock codeString={clientJsonSchemaExample} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectSchemaModalOpen} onOpenChange={setIsProjectSchemaModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Esquema JSON para Importar Proyectos</DialogTitle>
            <DialogDescription>
              Asegúrate de que tu archivo JSON siga esta estructura. Los campos con "(opcional)" pueden omitirse.
              El campo `id` es opcional; si se proporciona y ya existe, se intentará actualizar. Si no, se creará con ese ID.
              Si `id` se omite, se generará uno nuevo. `clientId` debe ser un ID válido de un cliente existente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2">
            <CopyableCodeBlock codeString={projectJsonSchemaExample} />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

