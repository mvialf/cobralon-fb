
// src/components/payment-modal.tsx
"use client";

import React, { useState, useEffect, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectType } from '@/types/project';
import { POSSIBLE_PAYMENT_METHODS, type PaymentMethod } from '@/types/payment';
import { useToast } from '@/hooks/use-toast';
import { format as formatDateFns, parseISO } from 'date-fns';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; date: Date; paymentMethod: PaymentMethod }) => void;
  project: ProjectType | null;
}

const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDateFns(d, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const [amount, setAmount] = useState<string>('');
  const [dateString, setDateString] = useState<string>(formatDateForInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens or project changes
      setAmount('');
      setDateString(formatDateForInput(new Date()));
      setPaymentMethod('');
    }
  }, [isOpen, project]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: "Error de Validación", description: "El monto debe ser un número positivo.", variant: "destructive" });
      return;
    }
    if (!dateString) {
      toast({ title: "Error de Validación", description: "La fecha es obligatoria.", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Error de Validación", description: "Debe seleccionar un medio de pago.", variant: "destructive" });
      return;
    }

    // Ensure date is parsed correctly, handling potential timezone issues by setting time to midday.
    const paymentDate = new Date(dateString + 'T12:00:00'); 

    if (!project) {
        toast({ title: "Error", description: "No se ha seleccionado un proyecto.", variant: "destructive" });
        return;
    }

    onSave({ amount: numericAmount, date: paymentDate, paymentMethod });
  };

  const projectDisplayName = project ? `${project.projectNumber}${project.glosa ? ` - ${project.glosa}` : ''}` : 'Desconocido';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Proyecto</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del pago para el proyecto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Proyecto</Label>
              <p className="font-semibold text-foreground">{projectDisplayName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount-modal">Monto <span className="text-destructive">*</span></Label>
                <Input
                  id="amount-modal"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0.01"
                  step="any"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-modal">Fecha <span className="text-destructive">*</span></Label>
                <Input
                  id="date-modal"
                  type="date"
                  value={dateString}
                  onChange={(e) => setDateString(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod-modal">Medio de Pago <span className="text-destructive">*</span></Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger id="paymentMethod-modal">
                  <SelectValue placeholder="Seleccionar medio de pago" />
                </SelectTrigger>
                <SelectContent>
                  {POSSIBLE_PAYMENT_METHODS.map(method => (
                    <SelectItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Guardar Pago</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
