
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Client } from '@/types/client';
import { useToast } from '@/hooks/use-toast';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  clientData?: Client;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, clientData }) => {
  const [client, setClient] = useState<Client>({
    id: '',
    name: '',
    email: '',
    phone: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (clientData) {
      setClient(clientData);
    } else {
      setClient({
        id: '',
        name: '',
        email: '',
        phone: '',
      });
    }
  }, [clientData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClient((prevClient) => ({
      ...prevClient,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!client.name.trim()) {
      toast({
        title: "Validación Fallida",
        description: "El nombre del cliente no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }
    onSave(client);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{clientData ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          <DialogDescription>
            {clientData ? 'Modifica los datos del cliente.' : 'Ingresa los datos para un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" name="name" value={client.name} onChange={handleChange} className="col-span-3" placeholder="Nombre del cliente" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" name="email" type="email" value={client.email || ''} onChange={handleChange} className="col-span-3" placeholder="correo@ejemplo.com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input id="phone" name="phone" type="tel" value={client.phone || ''} onChange={handleChange} className="col-span-3" placeholder="Ej: +123456789" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientModal;
