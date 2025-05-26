// src/app/settings/page.tsx
"use client"; 

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addClient, type ClientImportData } from '@/services/clientService';
import { addProject, type ProjectImportData } from '@/services/projectService';
import type { ProjectStatus, ProjectClassification } from '@/types/project';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [clientFile, setClientFile] = useState<File | null>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [isImportingClients, setIsImportingClients] = useState(false);
  const [isImportingProjects, setIsImportingProjects] = useState(false);

  const handleClientFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setClientFile(file);
    } else {
      setClientFile(null);
    }
  };

  const handleProjectFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProjectFile(file);
    } else {
      setProjectFile(null);
    }
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

      const importPromises = rawClientsToImport.map(item => {
        if (!item || typeof item.name !== 'string' || item.name.trim() === '') {
          errorCount++;
          const msg = `Cliente omitido: falta 'name' o es inválido. ID: ${item?.id || 'N/A'}`;
          errorMessages.push(msg);
          console.error(msg, item);
          return Promise.reject(new Error(msg)); // Skip this item
        }

        const clientPayload: ClientImportData = {
          name: item.name,
        };

        if (item.id && typeof item.id === 'string' && item.id.trim() !== '') {
          clientPayload.id = item.id;
        }
        
        // Handle optional fields, allowing null
        if (item.hasOwnProperty('phone')) {
            clientPayload.phone = item.phone === null ? null : String(item.phone);
        }
        if (item.hasOwnProperty('email')) {
            clientPayload.email = item.email === null ? null : String(item.email);
        }

        if (item.createdAt) {
          if (typeof item.createdAt === 'string' || typeof item.createdAt === 'number' || item.createdAt instanceof Date) {
            const dateTest = new Date(item.createdAt);
            if (isNaN(dateTest.getTime())) {
              console.warn(`Fecha 'createdAt' inválida para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
            } else {
              clientPayload.createdAt = dateTest;
            }
          } else {
            console.warn(`Formato 'createdAt' inesperado para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
          }
        }
        
        return addClient(clientPayload);
      });

      const results = await Promise.allSettled(importPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          // Errors for items that passed initial validation but failed at service level
          // Errors for items that failed initial validation (like missing name) are already counted
          if (!result.reason.message.startsWith("Cliente omitido:")) {
             errorCount++; // Increment only if not already counted
             errorMessages.push(result.reason.message || 'Error desconocido durante la importación del cliente.');
          }
          console.error("Error al importar cliente (desde addClient):", result.reason);
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
        title: "Error de Importación",
        description: `No se pudo importar clientes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingClients(false);
      setClientFile(null);
      const clientInput = document.getElementById('import-clients') as HTMLInputElement;
      if (clientInput) clientInput.value = '';
    }
  };

  const handleImportProjects = async () => {
    if (!projectFile) {
      toast({ title: "Error", description: "Por favor, selecciona un archivo de proyectos.", variant: "destructive" });
      return;
    }
    setIsImportingProjects(true);
    const errorMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const fileContent = await projectFile.text();
      const projectsToImportJSON: any[] = JSON.parse(fileContent); 

      if (!Array.isArray(projectsToImportJSON)) {
        throw new Error("El archivo JSON de proyectos debe contener un array.");
      }

      // Pre-filter invalid items (non-objects, null, or empty objects)
      const validProjectItems = projectsToImportJSON.filter(item => {
        if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
          errorCount++;
          const msg = `Item omitido: no es un objeto de proyecto válido o está vacío. Item: ${JSON.stringify(item)}`;
          errorMessages.push(msg);
          console.warn(msg);
          return false;
        }
        return true;
      });

      const results = await Promise.allSettled(
        validProjectItems.map(proj => {
          // --- Validation ---
          const requiredFields: (keyof ProjectImportData)[] = ['projectNumber', 'clientId', 'date', 'subtotal', 'taxRate', 'status', 'classification', 'collect'];
          const missingFields = requiredFields.filter(field => {
            const value = proj[field];
            return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
          });
          
          if (missingFields.length > 0) {
            errorCount++;
            const msg = `Proyecto '${proj.projectNumber || 'Desconocido'}' omitido: faltan campos obligatorios: ${missingFields.join(', ')}.`;
            errorMessages.push(msg);
            console.error(msg, proj);
            return Promise.reject(new Error(msg));
          }

          // --- Data Preparation ---
          let projectDate: Date;
          try {
            projectDate = new Date(proj.date); // Assumes date is YYYY-MM-DD or full ISO string
            if (isNaN(projectDate.getTime())) throw new Error('Invalid date format for "date"');
          } catch (e) {
            errorCount++;
            const msg = `Proyecto '${proj.projectNumber}': Fecha de inicio inválida. Formato esperado YYYY-MM-DD o ISO. Valor: ${proj.date}`;
            errorMessages.push(msg);
            console.error(msg, proj.date);
            return Promise.reject(new Error(msg));
          }
          
          let projectEndDate: Date | undefined = undefined;
          if (proj.endDate) {
            try {
              projectEndDate = new Date(proj.endDate);
              if (isNaN(projectEndDate.getTime())) {
                console.warn(`Proyecto '${proj.projectNumber}': Fecha de fin inválida, se omitirá. Valor:`, proj.endDate);
                projectEndDate = undefined;
              }
            } catch (e) {
              console.warn(`Proyecto '${proj.projectNumber}': Error al parsear fecha de fin, se omitirá. Valor:`, proj.endDate);
              projectEndDate = undefined;
            }
          }

          let projectCreatedAt: Date | undefined = undefined;
          if (proj.createdAt) {
            try {
                projectCreatedAt = new Date(proj.createdAt);
                if (isNaN(projectCreatedAt.getTime())) {
                    console.warn(`Proyecto '${proj.projectNumber}': Fecha de creación inválida, se usará timestamp del servidor. Valor:`, proj.createdAt);
                    projectCreatedAt = undefined;
                }
            } catch(e) {
                console.warn(`Proyecto '${proj.projectNumber}': Error al parsear fecha de creación, se usará timestamp del servidor. Valor:`, proj.createdAt);
                projectCreatedAt = undefined;
            }
          }


          const projectDataPayload: ProjectImportData = {
            id: (proj.id && typeof proj.id === 'string') ? proj.id.trim() : undefined,
            projectNumber: String(proj.projectNumber).trim(),
            clientId: String(proj.clientId).trim(),
            date: projectDate,
            subtotal: Number(proj.subtotal),
            taxRate: Number(proj.taxRate),
            status: proj.status as ProjectStatus,
            classification: proj.classification as ProjectClassification,
            collect: Boolean(proj.collect), // Ensured by requiredFields check
            
            description: proj.description ? String(proj.description) : '',
            glosa: proj.glosa ? String(proj.glosa) : '',
            endDate: projectEndDate,
            createdAt: projectCreatedAt, // Will be handled by service if undefined
            phone: proj.phone ? String(proj.phone) : '',
            address: proj.address ? String(proj.address) : '',
            commune: proj.commune ? String(proj.commune) : '',
            region: proj.region ? String(proj.region) : 'RM', // Default if not provided
            windowsCount: proj.windowsCount ? Number(proj.windowsCount) : 0,
            squareMeters: proj.squareMeters ? Number(proj.squareMeters) : 0,
            uninstall: proj.hasOwnProperty('uninstall') ? Boolean(proj.uninstall) : false,
            uninstallTypes: Array.isArray(proj.uninstallTypes) ? proj.uninstallTypes.map(String) : [],
            uninstallOther: proj.uninstallOther ? String(proj.uninstallOther) : '',
            isHidden: proj.hasOwnProperty('isHidden') ? Boolean(proj.isHidden) : false,
          };
          
          return addProject(projectDataPayload);
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          // errorCount was incremented by pre-filter or validation errors
          // This path handles errors from addProject service itself if not already caught
          if (!errorMessages.some(msg => result.reason.message.includes(msg) || msg.includes(result.reason.message))) {
            errorCount++; 
            errorMessages.push(result.reason.message || 'Error desconocido durante la importación del proyecto.');
          }
          console.error("Error al importar proyecto (desde addProject):", result.reason);
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
      console.error("Error durante la importación de proyectos:", error);
      toast({
        title: "Error de Importación",
        description: `No se pudo importar proyectos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingProjects(false);
      setProjectFile(null);
      const projectInput = document.getElementById('import-projects') as HTMLInputElement;
      if (projectInput) projectInput.value = '';
    }
  };


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
                  <Select defaultValue="system">
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                  <Label htmlFor="import-clients" className="text-base font-semibold">Importar Clientes (JSON)</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona un archivo JSON con un array de clientes. Campos: `name` (string, req), `id` (string, opc), `phone` (string|null, opc), `email` (string|null, opc), `createdAt` (string ISO 8601 o YYYY-MM-DD, opc).
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      id="import-clients"
                      type="file"
                      accept=".json"
                      onChange={handleClientFileChange}
                      className="flex-grow"
                      disabled={isImportingClients}
                    />
                    <Button onClick={handleImportClients} className="w-full sm:w-auto" disabled={!clientFile || isImportingClients}>
                      {isImportingClients ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Importar Clientes
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <Label htmlFor="import-projects" className="text-base font-semibold">Importar Proyectos (JSON)</Label>
                  <p className="text-sm text-muted-foreground">
                    JSON array. Requeridos: `projectNumber`, `clientId`, `date` (YYYY-MM-DD), `subtotal`, `taxRate`, `status`, `classification`, `collect`. Opc: `id`, `description`, `glosa`, `endDate`, `createdAt`, `phone`, `address`, `commune`, `region`, `windowsCount`, `squareMeters`, `uninstall`, `uninstallTypes` (array de strings), `uninstallOther`, `isHidden`.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      id="import-projects"
                      type="file"
                      accept=".json"
                      onChange={handleProjectFileChange}
                      className="flex-grow"
                      disabled={isImportingProjects}
                    />
                    <Button onClick={handleImportProjects} className="w-full sm:w-auto" disabled={!projectFile || isImportingProjects}>
                      {isImportingProjects ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Importar Proyectos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

