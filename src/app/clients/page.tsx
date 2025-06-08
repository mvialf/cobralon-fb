
// src/app/clients/page.tsx
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Client } from '@/types/client';
import { getClients, addClient, updateClient, deleteClient } from '@/services/clientService';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/table/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SquarePen, Trash2, PlusCircle, Users, Loader2, GanttChartSquare, DollarSign, FileText } from 'lucide-react';
import ClientModal from '@/components/client-modal';
import { useToast } from '@/hooks/use-toast';

// Skeleton for table rows
const ClientRowSkeleton = () => (
  <TableRow>
    <TableCell><div className="h-5 w-32 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-5 w-40 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right">
      <div className="h-8 w-8 bg-muted rounded-full inline-block animate-pulse"></div>
    </TableCell>
  </TableRow>
);

export default function ClientsPage() {
  const { toast } = useToast();
  const queryClientHook = useQueryClient();
  const router = useRouter();

  const [filterText, setFilterText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);


  const { data: clients = [], isLoading, isError, error } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const addClientMutation = useMutation({
    mutationFn: addClient,
    onSuccess: (newClient) => {
      queryClientHook.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Cliente Añadido", description: `"${newClient.name}" ha sido añadido.` });
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo añadir el cliente: ${err.message}`, variant: "destructive" });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: (variables: { clientId: string; clientData: Partial<Omit<Client, 'id'>> }) => 
      updateClient(variables.clientId, variables.clientData),
    onSuccess: (_, variables) => {
      queryClientHook.invalidateQueries({ queryKey: ['clients'] });
      const updatedClient = clients.find(c => c.id === variables.clientId);
      toast({ title: "Cliente Actualizado", description: `"${updatedClient?.name || 'El cliente'}" ha sido actualizado.` });
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `No se pudo actualizar el cliente: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: (_, clientId) => {
      queryClientHook.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Cliente Eliminado", description: `"${clientToDelete?.name || 'El cliente'}" ha sido eliminado.`, variant: "destructive" });
      setClientToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      let description = `No se pudo eliminar el cliente: ${err.message}`;
      if (err.code) {
        description += ` (Código: ${err.code})`;
      }
      toast({ title: "Error al Eliminar", description, variant: "destructive" });
      setClientToDelete(null);
      setIsDeleteDialogOpen(false);
    },
  });


  const handleOpenModal = (client?: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(undefined);
  };

  const handleDeleteClientInitiate = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteClient = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  };


  const handleSaveClient = (savedClient: Client) => {
    if (savedClient.id) {
      const { id, ...clientData } = savedClient;
      updateClientMutation.mutate({ clientId: id, clientData });
    } else {
      const { id, ...newClientData } = savedClient; 
      addClientMutation.mutate(newClientData as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(filterText.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(filterText.toLowerCase()))
  );

  if (isError) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center text-destructive">
        <h1 className="text-2xl font-bold mb-2">Error al cargar clientes</h1>
        <p>{error?.message || "Ha ocurrido un error desconocido."}</p>
        <Button onClick={() => queryClientHook.refetchQueries({ queryKey: ['clients'] })} className="mt-4">
          Intentar de Nuevo
        </Button>
      </div>
    );
  }
  
  const isMutating = addClientMutation.isPending || updateClientMutation.isPending || deleteClientMutation.isPending;


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
        <Button onClick={() => handleOpenModal()} disabled={isMutating && addClientMutation.isPending && !selectedClient}>
          {isMutating && addClientMutation.isPending && !selectedClient ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
          Nuevo Cliente
        </Button>
      </header>
      <main className="flex-grow">
        <Card className="shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
             <Input 
              placeholder="Filtrar clientes por nombre o email..." 
              value={filterText} 
              onChange={(e) => setFilterText(e.target.value)} 
              className="max-w-sm"
            />
          </div>
          <CardContent className="pt-6">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Nombre</TableHead>
                    <TableHead className="w-[150px]">Teléfono</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <ClientRowSkeleton />
                  <ClientRowSkeleton />
                  <ClientRowSkeleton />
                </TableBody>
              </Table>
            ) : filteredClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Nombre</TableHead>
                    <TableHead className="w-[150px]">Teléfono</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const isCurrentRowEditing = updateClientMutation.isPending && updateClientMutation.variables?.clientId === client.id;
                    const isCurrentRowDeleting = deleteClientMutation.isPending && clientToDelete?.id === client.id;
                    const isCurrentRowMutating = isCurrentRowEditing || isCurrentRowDeleting;

                    return (
                      <TableRow 
                        key={client.id} 
                        className={isCurrentRowMutating ? 'opacity-50' : ''}
                      >
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isCurrentRowMutating} aria-label="Más acciones para el cliente">
                                {isCurrentRowMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <GanttChartSquare className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onSelect={() => router.push(`/clients/newPayment/${client.id}`)}
                                disabled={isCurrentRowMutating}
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                <span>Registrar Pago</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onSelect={() => toast({ title: "Próximamente", description: "La función de estado de cuenta para clientes estará disponible pronto." })}
                                disabled={isCurrentRowMutating}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Estado de cuenta</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleOpenModal(client)} disabled={isCurrentRowMutating}>
                                <SquarePen className="mr-2 h-4 w-4" />
                                <span>Editar cliente</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onSelect={() => handleDeleteClientInitiate(client)} 
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                disabled={isCurrentRowDeleting || isCurrentRowEditing} // Disable if editing or already deleting
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar cliente</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
      <ClientModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveClient} clientData={selectedClient} />
      
      {clientToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente "{clientToDelete.name}"
                y todos sus proyectos, pagos y registros de postventa asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setClientToDelete(null); setIsDeleteDialogOpen(false); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteClient}
                disabled={deleteClientMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteClientMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sí, eliminar cliente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
