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
import { addClient } from '@/services/clientService';
import { addProject } from '@/services/projectService';
import type { Client } from '@/types/client';
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
      const clientsToImport: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>[] = JSON.parse(fileContent);

      if (!Array.isArray(clientsToImport)) {
        throw new Error("El archivo JSON de clientes debe contener un array.");
      }

      let successCount = 0;
      let errorCount = 0;

      const results = await Promise.allSettled(
        clientsToImport.map(client => {
          if (!client.name) {
            errorCount++;
            return Promise.reject(new Error(`Cliente omitido: falta el campo 'name'.`));
          }
          // Type assertion is okay here as addClient expects Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
          // and we've checked for name. Other fields are optional or handled by service.
          return addClient(client as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>);
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          console.error("Error al importar cliente:", result.reason);
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
      // Reset file input
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
      const projectsToImport: any[] = JSON.parse(fileContent); // Use any for initial parsing

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
                    Cada objeto debe tener al menos el campo `name` (string). Otros campos como `email` y `phone` son opcionales.
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
