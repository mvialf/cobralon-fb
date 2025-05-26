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
import { addClient, type ClientImportData } from '@/services/clientService'; // Import ClientImportData
import { addProject } from '@/services/projectService';
import type { ProjectType } from '@/types/project';
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
    try {
      const fileContent = await clientFile.text();
      const rawClientsToImport: any[] = JSON.parse(fileContent);

      if (!Array.isArray(rawClientsToImport)) {
        throw new Error("El archivo JSON de clientes debe contener un array.");
      }

      let successCount = 0;
      let errorCount = 0;

      const importPromises = rawClientsToImport.map(item => {
        // Validate required fields (name)
        if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
          errorCount++;
          console.error("Cliente omitido del JSON: falta 'name' o es inválido.", item);
          return Promise.reject(new Error(`Cliente omitido: falta el campo 'name' o es inválido.`));
        }

        const clientPayload: ClientImportData = {
          name: item.name,
        };

        if (item.id && typeof item.id === 'string' && item.id.trim() !== '') {
          clientPayload.id = item.id;
        }
        
        // Handle optional fields, allowing null
        if (item.hasOwnProperty('phone')) {
          clientPayload.phone = typeof item.phone === 'string' || item.phone === null ? item.phone : String(item.phone);
        }
        if (item.hasOwnProperty('email')) {
           clientPayload.email = typeof item.email === 'string' || item.email === null ? item.email : String(item.email);
        }

        if (item.createdAt) {
          if (typeof item.createdAt === 'string' || item.createdAt instanceof Date) {
            const dateTest = new Date(item.createdAt);
            if (isNaN(dateTest.getTime())) {
              console.warn(`Fecha 'createdAt' inválida para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
            } else {
              clientPayload.createdAt = item.createdAt; // Pass string or Date to service
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
          // errorCount was already incremented for validation failures before calling addClient
          // This path handles errors from addClient itself (e.g., Firestore permission issues)
          if (!result.reason.message.startsWith("Cliente omitido:")) {
             errorCount++; // Avoid double counting
          }
          console.error("Error al importar cliente (desde addClient):", result.reason);
        }
      });

      toast({
        title: "Importación de Clientes Completada",
        description: `${successCount} clientes importados exitosamente. ${errorCount} errores.`,
        variant: errorCount > 0 ? "destructive" : "default",
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
    try {
      const fileContent = await projectFile.text();
      const projectsToImport: any[] = JSON.parse(fileContent); 

      if (!Array.isArray(projectsToImport)) {
        throw new Error("El archivo JSON de proyectos debe contener un array.");
      }

      let successCount = 0;
      let errorCount = 0;

      const results = await Promise.allSettled(
        projectsToImport.map(proj => {
          // Basic validation
          if (!proj.projectNumber || !proj.clientId || !proj.date || proj.subtotal === undefined || proj.taxRate === undefined || !proj.status || !proj.classification) {
            errorCount++;
            console.error("Proyecto omitido por campos faltantes:", proj);
            return Promise.reject(new Error(`Proyecto '${proj.projectNumber || 'Desconocido'}' omitido: faltan campos obligatorios.`));
          }

          const projectData: Omit<ProjectType, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'balance'> = {
            projectNumber: proj.projectNumber,
            clientId: proj.clientId,
            description: proj.description || '',
            date: new Date(proj.date), // Convert string date to Date object
            subtotal: Number(proj.subtotal),
            taxRate: Number(proj.taxRate),
            status: proj.status,
            classification: proj.classification,
            endDate: proj.endDate ? new Date(proj.endDate) : undefined,
            phone: proj.phone || '',
            address: proj.address || '',
            commune: proj.commune || '',
            region: proj.region || 'RM',
            windowsCount: Number(proj.windowsCount) || 0,
            squareMeters: Number(proj.squareMeters) || 0,
            uninstall: Boolean(proj.uninstall) || false,
            uninstallTypes: Array.isArray(proj.uninstallTypes) ? proj.uninstallTypes : [],
            uninstallOther: proj.uninstallOther || '',
            glosa: proj.glosa || '',
            collect: Boolean(proj.collect) || false,
            isHidden: Boolean(proj.isHidden) || false,
          };
          
          // The addProject service calculates total and balance
          return addProject(projectData);
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          console.error("Error al importar proyecto:", result.reason);
        }
      });

      toast({
        title: "Importación de Proyectos Completada",
        description: `${successCount} proyectos importados exitosamente. ${errorCount} errores.`,
        variant: errorCount > 0 ? "destructive" : "default",
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
                    Selecciona un archivo JSON que contenga un array de objetos de clientes.
                    Cada objeto debe tener `name` (string). Opcional: `id` (string), `phone` (string o null), `email` (string o null), `createdAt` (string ISO 8601 o YYYY-MM-DD).
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
                    Selecciona un archivo JSON con un array de proyectos. Campos requeridos: `projectNumber`, `clientId` (ID de Firestore del cliente), `date` (YYYY-MM-DD), `subtotal`, `taxRate`, `status`, `classification`.
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

