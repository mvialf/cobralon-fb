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

export default function SettingsPage() {

  const handleClientFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Client file selected:", file.name);
      // Aquí iría la lógica para leer y procesar el archivo de clientes
    }
  };

  const handleProjectFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Project file selected:", file.name);
      // Aquí iría la lógica para leer y procesar el archivo de proyectos
    }
  };

  const handleImportClients = () => {
    // Aquí iría la lógica para disparar la importación de clientes
    // (usando el archivo seleccionado en el estado, si se guarda)
    alert("Funcionalidad de importar clientes aún no implementada.");
  };

  const handleImportProjects = () => {
    // Aquí iría la lógica para disparar la importación de proyectos
    alert("Funcionalidad de importar proyectos aún no implementada.");
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
                    Cada objeto debe tener al menos los campos: `name` (string), `phone` (string, opcional), `email` (string, opcional).
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      id="import-clients"
                      type="file"
                      accept=".json"
                      onChange={handleClientFileChange}
                      className="flex-grow"
                    />
                    <Button onClick={handleImportClients} className="w-full sm:w-auto">Importar Clientes</Button>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <Label htmlFor="import-projects" className="text-base font-semibold">Importar Proyectos (JSON)</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona un archivo JSON que contenga un array de objetos de proyectos.
                    Asegúrate de que los `clientId` en los proyectos existan previamente o se importen primero.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      id="import-projects"
                      type="file"
                      accept=".json"
                      onChange={handleProjectFileChange}
                      className="flex-grow"
                    />
                    <Button onClick={handleImportProjects} className="w-full sm:w-auto">Importar Proyectos</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
             {/* Podríamos añadir un botón de Guardar Cambios para Datos si fuera necesario */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
