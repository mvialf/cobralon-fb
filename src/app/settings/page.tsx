// src/app/settings/page.tsx
"use client"; // Necesario para SidebarTrigger si usa hooks de useSidebar

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center gap-4 mb-6 md:mb-8">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Configuración</h1>
          <p className="text-muted-foreground">Administra tus preferencias de la aplicación.</p>
        </div>
      </header>
      <main className="flex-grow space-y-6">
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
            <Button>Guardar Cambios</Button>
        </div>
      </main>
    </div>
  );
}
