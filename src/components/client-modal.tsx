import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Client } from '@/types/client';
import { useToast } from '@/hooks/use-toast'; // Importar useToast

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
    address: '',
  });
  const { toast } = useToast(); // Inicializar useToast

  useEffect(() => {
    if (clientData) {
      setClient(clientData);
    } else {
      setClient({
        id: '',
        name: '',
        email: '',
        phone: '',
        address: '',
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
    // Aquí se podrían añadir más validaciones (email, teléfono, etc.)

    onSave(client);
    // onClose(); // La lógica de cierre del modal ya está en las onSuccess de las mutaciones en la página de clientes
    // No es estrictamente necesario llamar a onClose() aquí si las mutaciones lo manejan,
    // pero para asegurar que se cierre incluso si onSave no es una mutación directa, lo mantenemos.
    // Si onSave (pasado desde ClientsPage) desencadena una mutación que a su vez cierra el modal,
    // llamar a onClose() aquí es redundante pero generalmente inofensivo.
    // Para mayor claridad, y dado que las mutaciones en ClientsPage ya cierran el modal en caso de éxito,
    // es mejor que el modal se cierre a sí mismo tras invocar onSave.
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{clientData ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
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
            <Input id="email" name="email" type="email" value={client.email} onChange={handleChange} className="col-span-3" placeholder="correo@ejemplo.com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input id="phone" name="phone" type="tel" value={client.phone} onChange={handleChange} className="col-span-3" placeholder="Ej: +123456789" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Dirección
            </Label>
            <Input id="address" name="address" value={client.address} onChange={handleChange} className="col-span-3" placeholder="Dirección completa" />
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
