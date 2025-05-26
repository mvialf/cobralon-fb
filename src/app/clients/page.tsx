// src/app/clients/page.tsx
"use client";

import type { Client } from '@/types/client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const mockClients: Client[] = [
  { id: crypto.randomUUID(), name: 'Ana Pérez', phone: '555-1234', email: 'ana.perez@example.com' },
  { id: crypto.randomUUID(), name: 'Luis García', phone: '555-5678', email: 'luis.garcia@example.com' },
  { id: crypto.randomUUID(), name: 'Sofía Rodríguez', phone: '555-8765', email: 'sofia.rodriguez@example.com' },
  { id: crypto.randomUUID(), name: 'Carlos Martínez', phone: '555-4321', email: 'carlos.martinez@example.com' },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Simulate data fetching
    setClients(mockClients);
    setIsClient(true);
  }, []);

  if (!isClient) {
    // You can render a skeleton loader here
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
        <header className="flex items-center gap-4 mb-6 md:mb-8">
          <SidebarTrigger className="md:hidden" />
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
        </header>
        <main className="flex-grow">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse mb-1"></div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-40 w-full bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleAddClient = () => {
    // Placeholder for adding a new client
    console.log("Añadir nuevo cliente");
  };

  const handleEditClient = (clientId: string) => {
    // Placeholder for editing a client
    console.log("Editar cliente:", clientId);
  };

  const handleDeleteClient = (clientId: string) => {
    // Placeholder for deleting a client
    setClients(prevClients => prevClients.filter(client => client.id !== clientId));
    console.log("Eliminar cliente:", clientId);
  };


  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Gestión de Clientes</h1>
            <p className="text-muted-foreground">Administra la información de tus clientes.</p>
          </div>
        </div>
        <Button onClick={handleAddClient}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Cliente
        </Button>
      </header>
      <main className="flex-grow">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>Un listado de todos los clientes registrados en el sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Nombre</TableHead>
                    <TableHead className="w-[150px]">Teléfono</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead className="text-right w-[150px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditClient(client.id)} aria-label="Editar cliente">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClient(client.id)} aria-label="Eliminar cliente">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg font-semibold">No hay clientes registrados.</p>
                <p className="text-sm">Empieza añadiendo tu primer cliente.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
