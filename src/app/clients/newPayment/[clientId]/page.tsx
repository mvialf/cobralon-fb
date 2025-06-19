'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

import { getClientById } from '@/services/clientService';
import { getProjects } from '@/services/projectService';
import { addPayment, getPaymentsForProject } from '@/services/paymentService';
import { ProjectType } from '@/types/project';
import { PaymentMethod, Payment } from '@/types/payment';
import { getAllPayments } from '@/services/paymentService';

// Función para formatear montos a peso chileno
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

interface PaymentAllocation {
  projectId: string;
  projectNumber: string;
  glosa: string;
  paymentDate: string;
  amount: number;
}

const paymentMethods = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cheque', label: 'Cheque' },
];

export default function NewClientPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = typeof params.clientId === 'string' ? params.clientId : '';

  const [client, setClient] = useState<{id: string, name: string} | null>(null);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0].value);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAutoPayment, setIsAutoPayment] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [projectAllocations, setProjectAllocations] = useState<Record<string, number>>({});
  const [historicalPayments, setHistoricalPayments] = useState<{[projectId: string]: Payment[]}>({});
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [projectBalances, setProjectBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadClientData() {
      try {
        setIsLoading(true);
        
        // Verificar si el clientId es válido
        if (!clientId) {
          toast({
            title: "Error",
            description: "ID de cliente no válido",
            variant: "destructive"
          });
          router.push('/clients');
          return;
        }

        // Obtener datos del cliente
        const clientData = await getClientById(clientId);
        if (!clientData) {
          toast({
            title: "Error",
            description: "Cliente no encontrado",
            variant: "destructive"
          });
          router.push('/clients');
          return;
        }
        setClient(clientData);

        // Obtener proyectos del cliente
        const projectsData = await getProjects(clientId);
        
        // Obtener todos los pagos
        const allPayments = await getAllPayments();
        
        // Calcular balances reales para cada proyecto
        const calculatedBalances: Record<string, number> = {};
        const projectsWithRealBalances = [];
        
        for (const project of projectsData) {
          if (project.id) {
            // Calcular la suma de pagos para este proyecto
            const projectPayments = allPayments.filter(payment => 
              payment.projectId === project.id && !payment.isAdjustment
            );
            
            const sumOfPayments = projectPayments.reduce((sum, payment) => 
              sum + (payment.amount || 0), 0
            );
            
            // Calcular balance real
            const calculatedBalance = (project.total || 0) - sumOfPayments;
            calculatedBalances[project.id] = calculatedBalance;
            
            // Solo incluir proyectos con balance pendiente
            if (calculatedBalance > 0) {
              projectsWithRealBalances.push(project);
            }
          }
        }
        
        // Actualizar estado con los balances calculados
        setProjectBalances(calculatedBalances);
        
        // Ordenar proyectos por fecha (más antiguo primero)
        const filteredProjects = projectsWithRealBalances
          .sort((a, b) => a.date.getTime() - b.date.getTime());
          
        setProjects(filteredProjects);

        // Cargar historial de pagos para cada proyecto
        setIsLoadingPayments(true);
        const paymentsHistory: {[projectId: string]: Payment[]} = {};
        for (const project of filteredProjects) {
          if (project.id) {
            const projectPayments = await getPaymentsForProject(project.id);
            if (projectPayments.length > 0) {
              paymentsHistory[project.id] = projectPayments;
            }
          }
        }
        setHistoricalPayments(paymentsHistory);
        setIsLoadingPayments(false);

      } catch (error) {
        console.error("Error al cargar datos del cliente:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, intente de nuevo.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadClientData();
  }, [clientId, router, toast]);

  const handleAllocationChange = (projectId: string, amount: number | undefined) => {
    setProjectAllocations(prev => ({ ...prev, [projectId]: Math.max(0, amount || 0) }));
  };

  // Función para distribuir automáticamente los pagos entre proyectos
  const handleAutoDistribute = useCallback(() => {
    if (totalAmount <= 0) return;
    
    const remainingAmount = { value: totalAmount };
    const newAllocations: Record<string, number> = {};

    // Distribuir automáticamente - proyectos más antiguos primero
    projects.forEach(project => {
      if (remainingAmount.value <= 0) return;
      const projectId = project.id;
      const projectBalance = projectBalances[projectId] || 0;
      
      if (projectBalance <= 0) return;

      const amountToAllocate = Math.min(projectBalance, remainingAmount.value);
      newAllocations[projectId] = amountToAllocate;
      remainingAmount.value -= amountToAllocate;
    });

    setProjectAllocations(newAllocations);
  }, [projects, totalAmount, projectBalances]);

  // Efecto para manejar cambios en modo automático
  useEffect(() => {
    if (isAutoPayment) {
      handleAutoDistribute();
    }
    // Si se desactiva el pago automático, mantenemos las asignaciones existentes
  }, [isAutoPayment, handleAutoDistribute]);

  const currentAllocations = projects.map(p => ({
    projectId: p.id,
    projectNumber: p.projectNumber || '',
    glosa: p.glosa || '',
    paymentDate: paymentDate,
    amount: projectAllocations[p.id] || 0,
  })).filter(a => a.amount > 0);

  const handleRegisterPayment = async () => {
    try {
      setIsSaving(true);
      
      // Validaciones
      const allocationsArray = Object.values(projectAllocations) as number[];
      const sumOfAllocations: number = allocationsArray.reduce((sum: number, current: number) => sum + current, 0);

      if (sumOfAllocations > totalAmount && !isAutoPayment) {
        toast({
          title: "Error",
          description: "La suma de los montos asignados a los proyectos no puede exceder el monto total del pago.",
          variant: "destructive"
        });
        return;
      }
      
      if (sumOfAllocations === 0 && totalAmount > 0) {
        toast({
          title: "Error",
          description: "Debe asignar el monto del pago a al menos un proyecto, o activar el pago automático.",
          variant: "destructive"
        });
        return;
      }
      
      if (!client || !currentAllocations.length) {
        toast({
          title: "Error",
          description: "Faltan datos necesarios para registrar el pago.",
          variant: "destructive"
        });
        return;
      }

      // Convertir el método de pago al tipo PaymentMethod
      const method = paymentMethod as PaymentMethod;
      const paymentDate_Date = new Date(paymentDate);

      // Crear un registro de pago por cada proyecto con monto asignado
      for (const allocation of currentAllocations) {
        await addPayment({
          projectId: allocation.projectId,
          amount: allocation.amount,
          date: paymentDate_Date,
          paymentMethod: method,
          paymentType: 'cliente',
          notes: `Pago de cliente: ${client.name}`,
          isAdjustment: false,
          createdAt: new Date() // Añadir createdAt requerido por el tipo
        });
      }

      toast({
        title: "Éxito",
        description: `Pago de ${formatCurrency(totalAmount)} registrado correctamente.`,
      });

      // Redirigir a la página de clientes
      router.push('/clients');
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !client) {
    return <div className="container mx-auto p-4">Cargando datos del cliente...</div>;
  }
  
  if (projects.length === 0) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
        <Card className="flex items-center justify-between p-4 border-b">
          <CardHeader>
            <CardTitle>Cliente: {client.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Este cliente no tiene proyectos con saldo pendiente.</p>
            <Button className="mt-4" onClick={() => router.push('/clients')}>Volver a clientes</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 bg-background">
      <Card className="mb-6 bg-card border-border w-max">
        <CardHeader>
          <CardTitle>Registrar pago - {client.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="w-60 "> 
              <Label htmlFor="totalAmount" className="text-right">Monto</Label>
              <MoneyInput
                id="totalAmount"
                value={totalAmount}
                onValueChange={(value) => setTotalAmount(value || 0)}
                placeholder="0"
                className="text-right"
              />
            </div>
            <div className="w-60">
              <Label htmlFor="paymentMethod" className="flex items-center text-sm font-medium mb-1">Medio de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod" className="text-right">
                  <SelectValue placeholder="Seleccionar medio" />
                </SelectTrigger>
                <SelectContent className="text-right">
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-60">
              <Label htmlFor="paymentDate" className="block text-sm font-medium mb-1">Fecha de pago</Label>
              <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="text-right" />
            </div>
            <div className="flex items-center space-x-2 pt-6 w-30">
              <Switch id="autoPayment" checked={isAutoPayment} onCheckedChange={setIsAutoPayment} />
              <Label htmlFor="autoPayment" className="text-sm font-medium">Auto</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-card border-border w-max">
        <CardHeader>
          <CardTitle>Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className='w-max'>
            <TableHeader>
              <TableRow>
                <TableHead className="w-80">Proyecto</TableHead>
                <TableHead className="w-40">Fecha</TableHead>
                <TableHead className="w-40 text-right">Saldo</TableHead>
                <TableHead className="w-60 text-right">Monto a pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.projectNumber} - {project.glosa}</TableCell>
                  <TableCell>{new Date(project.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(projectBalances[project.id] || 0)}</TableCell>
                  <TableCell className="text-right">
                    <MoneyInput 
                      value={projectAllocations[project.id] || 0} 
                      onValueChange={(value) => handleAllocationChange(project.id, value)} 
                      placeholder="0.00" 
                      disabled={isAutoPayment}
                      className="w-full text-right"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      <Card className="mb-6 bg-card border-border w-max">
        <CardHeader>
          <CardTitle>Historial de Pagos Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPayments ? (
            <p>Cargando historial de pagos...</p>
          ) : Object.keys(historicalPayments).length > 0 ? (
            <div>
              <Table className="w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-80">Proyecto</TableHead>
                    <TableHead className="w-40">Fecha</TableHead>
                    <TableHead className="w-40">Medio de Pago</TableHead>
                    <TableHead className="w-60 text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(historicalPayments).flatMap(([projectId, payments]) => {
                    const project = projects.find(p => p.id === projectId);
                    return payments.map((payment) => (
                      <TableRow key={`${projectId}-${payment.id}`}>
                        <TableCell>{project?.projectNumber} - {project?.glosa}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-400">No hay pagos previos registrados para los proyectos de este cliente.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4 pr-80">
        <Button variant="outline" onClick={() => router.push('/clients')} disabled={isSaving}>Cancelar</Button>
        <Button onClick={handleRegisterPayment} disabled={isSaving || totalAmount <= 0}>
          {isSaving ? 'Registrando...' : 'Registrar pago'}
        </Button>
      </div>
    </div>
  );
}
