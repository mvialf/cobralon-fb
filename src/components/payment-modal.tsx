
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
import { PAYMENT_METHODS, type PaymentMethod } from '@/constants/payment';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput } from '@/utils/date-helpers';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; date: Date; paymentMethod: PaymentMethod; installments?: number }) => void;
  project: ProjectType | null;
  clientDisplay: string;
}



const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSave, project, clientDisplay }) => {
  const [amount, setAmount] = useState<string>('');
  const [dateString, setDateString] = useState<string>(formatDateForInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [installments, setInstallments] = useState<string>('1');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens or project changes
      setAmount('');
      setDateString(formatDateForInput(new Date()));
      setPaymentMethod('');
      setInstallments('1');
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
    
    // Validar las cuotas si el método de pago es tarjeta de crédito
    if (paymentMethod === 'tarjeta de crédito') {
      const numInstallments = parseInt(installments, 10);
      if (isNaN(numInstallments) || numInstallments < 1) {
        toast({ title: "Error de Validación", description: "El número de cuotas debe ser mayor o igual a 1.", variant: "destructive" });
        return;
      }
      // Incluir cuotas en los datos a guardar
      onSave({ amount: numericAmount, date: paymentDate, paymentMethod, installments: numInstallments });
    } else {
      // No incluir cuotas para otros métodos de pago
      onSave({ amount: numericAmount, date: paymentDate, paymentMethod });
    }
  };

  const projectDisplayName = project ? `${project.projectNumber}${project.glosa ? ` - ${project.glosa}` : ''}` : 'Desconocido';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 pb-4 pt-0">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Proyecto</Label>
              <p className="font-semibold text-foreground">{project?.projectNumber}</p>
              <p className="font-semibold text-foreground">{clientDisplay}</p>
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
              <div className="flex items-center gap-4">
                <div className="flex-grow space-y-1.5">
                  <Label htmlFor="paymentMethod-modal">Medio de Pago <span className="text-destructive">*</span></Label>
                  <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                    <SelectTrigger id="paymentMethod-modal">
                      <SelectValue placeholder="Seleccionar medio de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Campo de cuotas condicionalmente renderizado */}
                {paymentMethod === 'tarjeta de crédito' && (
                  <div className="w-24 space-y-1.5">
                    <Label htmlFor="installments-modal">Cuotas <span className="text-destructive">*</span></Label>
                    <Input
                      id="installments-modal"
                      type="number"
                      placeholder="1"
                      min="1"
                      step="1"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="text-right"
                      required
                    />
                  </div>
                )}
              </div>
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
