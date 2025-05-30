
// src/app/settings/page.tsx
"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addClient, type ClientImportData } from '@/services/clientService';
import { addProject, type ProjectImportData } from '@/services/projectService';
import { addPayment, type PaymentImportData as PaymentImportDataType } from '@/services/paymentService';
import { POSSIBLE_PAYMENT_METHODS, POSSIBLE_PAYMENT_TYPES } from '@/types/payment';
import type { ProjectStatus } from '@/types/project';
import { Loader2, HelpCircle } from 'lucide-react';
import { useTheme } from "next-themes";
import { FileDndInput } from '@/components/ui/file-dnd-input';
import { CopyableCodeBlock } from '@/components/ui/copyable-code-block';

const clientJsonSchemaExample = `
[
  {
    "id": "opcional-uuid-existente-para-reemplazar",
    "name": "Nombre Cliente Requerido S.A.",
    "phone": "123456789 (opcional, puede ser string o null)",
    "email": "cliente@ejemplo.com (opcional, puede ser string o null)",
    "createdAt": "2023-10-26T10:00:00.000Z (opcional, formato ISO 8601 o YYYY-MM-DD)"
  },
  {
    "name": "Otro Cliente (ID autogenerado)",
    "phone": null,
    "email": "otro@ejemplo.com"
  }
]
`.trim();

const projectJsonSchemaExample = `
[
  {
    "id": "opcional-uuid-existente-para-reemplazar",
    "projectNumber": "P2024-001 (requerido)",
    "clientId": "ID_DEL_CLIENTE_EXISTENTE_EN_FIRESTORE (requerido)",
    "description": "Descripción opcional del proyecto detallada.",
    "date": "2024-07-28 (requerido, formato YYYY-MM-DD o ISO 8601)",
    "subtotal": 1500.75 (requerido, número)",
    "taxRate": 19 (requerido, ej. 19 para 19%)",
    "status": "ingresado (requerido, ej: ingresado, en progreso, completado, etc.)",
    "collect": true (requerido, boolean: true o false)",
    "createdAt": "2023-10-26T10:00:00.000Z (opcional, formato ISO 8601 o YYYY-MM-DD)",
    "glosa": "Glosa breve o notas adicionales (opcional)",
    "phone": "+56912345678 (opcional, teléfono específico del proyecto)",
    "address": "Calle Falsa 123, Depto 4B (opcional)",
    "commune": "Comuna Ejemplo (opcional)",
    "region": "RM (opcional, defecto 'RM' si se omite)",
    "windowsCount": 5 (opcional, número, defecto 0)",
    "squareMeters": 50.5 (opcional, número, defecto 0)",
    "uninstall": false (opcional, boolean, defecto false)",
    "uninstallTypes": ["Marcos antiguos", "Protecciones (opcional, array de strings)"],
    "isHidden": false (opcional, boolean, defecto false)"
  }
]
`.trim();

const paymentJsonSchemaExample = `
[
  {
    "id": "uuid-del-pago-requerido-o-omitir-para-autogenerar",
    "projectId": "uuid-del-proyecto-asociado-requerido",
    "amount": 1000.00 (opcional, número)",
    "date": "2024-08-15 (requerido, formato YYYY-MM-DD o ISO 8601)",
    "paymentMethod": "transferencia (opcional, valores aceptados: ${POSSIBLE_PAYMENT_METHODS.join(', ')})",
    "createdAt": "2024-08-15T10:30:00.000Z (requerido, formato ISO 8601 o YYYY-MM-DD)",
    "paymentType": "abono inicial (opcional, valores aceptados: ${POSSIBLE_PAYMENT_TYPES.join(', ')})",
    "installments": 1 (opcional, número, para tarjetas)",
    "isAdjustment": false (requerido, boolean: true o false)",
    "notes": "Notas adicionales sobre el pago (opcional)"
  }
]
`.trim();


export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [clientFile, setClientFile] = useState<File | null>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isImportingClients, setIsImportingClients] = useState(false);
  const [isImportingProjects, setIsImportingProjects] = useState(false);
  const [isImportingPayments, setIsImportingPayments] = useState(false);
  const [isClientSchemaModalOpen, setIsClientSchemaModalOpen] = useState(false);
  const [isProjectSchemaModalOpen, setIsProjectSchemaModalOpen] = useState(false);
  const [isPaymentSchemaModalOpen, setIsPaymentSchemaModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClientFileSelected = (file: File | null) => {
    setClientFile(file);
  };

  const handleProjectFileSelected = (file: File | null) => {
    setProjectFile(file);
  };

  const handlePaymentFileSelected = (file: File | null) => {
    setPaymentFile(file);
  };

  const handleImportClients = async () => {
    if (!clientFile) {
      toast({ title: "Error", description: "Por favor, selecciona un archivo de clientes.", variant: "destructive" });
      return;
    }
    setIsImportingClients(true);
    const errorMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const fileContent = await clientFile.text();
      const rawClientsToImport: any[] = JSON.parse(fileContent);

      if (!Array.isArray(rawClientsToImport)) {
        throw new Error("El archivo JSON de clientes debe contener un array.");
      }

      const validClientItems = rawClientsToImport.filter(item => {
        if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
            const msg = `Item de cliente omitido: no es un objeto válido o está vacío. Item: ${JSON.stringify(item)}`;
            console.warn(msg);
            errorMessages.push(msg); 
            errorCount++;
            return false;
        }
        return true;
      });

      const importPromises = validClientItems.map(async (item) => {
        // Validar campos requeridos
        if (!item || typeof item.name !== 'string' || item.name.trim() === '') {
          const msg = `Cliente omitido: falta 'name' o es inválido. ID: ${item?.id || 'N/A'}`;
          throw new Error(msg);
        }

        const clientPayload: ClientImportData = {
          name: item.name,
        };

        // Campos opcionales
        if (item.id && typeof item.id === 'string' && item.id.trim() !== '') {
          clientPayload.id = item.id.trim();
        }
        if (item.hasOwnProperty('phone')) {
            clientPayload.phone = item.phone === null ? null : String(item.phone);
        }
        if (item.hasOwnProperty('email')) {
            clientPayload.email = item.email === null ? null : String(item.email);
        }

        if (item.createdAt) {
          if (typeof item.createdAt === 'string' || item.createdAt instanceof Date) {
            const dateTest = new Date(item.createdAt);
            if (isNaN(dateTest.getTime())) {
              console.warn(`Fecha 'createdAt' inválida para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
            } else {
              clientPayload.createdAt = dateTest;
            }
          } else {
            console.warn(`Formato 'createdAt' inesperado para cliente ${item.name || item.id}, se usará valor por defecto del servidor. Valor recibido:`, item.createdAt);
          }
        }
        try {
          return await addClient(clientPayload);
        } catch (serviceError: any) {
          throw new Error(`Error al guardar cliente '${item.name || item.id || 'Desconocido'}': ${serviceError.message}`);
        }
      });

      const results = await Promise.allSettled(importPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          const errorMessage = result.reason?.message || 'Error desconocido durante la importación del cliente.';
          errorMessages.push(errorMessage);
          console.error("Error en la importación de cliente:", result.reason);
        }
      });

      let description = `${successCount} clientes importados exitosamente. ${errorCount} errores.`;
      if (errorMessages.length > 0) {
        description += ` Detalles: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`;
      }

      toast({
        title: "Importación de Clientes Completada",
        description: description,
        variant: errorCount > 0 ? "destructive" : "default",
        duration: errorCount > 0 ? 10000 : 5000,
      });

    } catch (error: any) {
      console.error("Error durante la importación de clientes:", error);
      toast({
        title: "Error de Importación General",
        description: `No se pudo importar clientes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingClients(false);
      setClientFile(null);
    }
  };

 const handleImportProjects = async () => {
    if (!projectFile) {
      toast({ title: "Error", description: "Por favor, selecciona un archivo de proyectos.", variant: "destructive" });
      return;
    }
    setIsImportingProjects(true);
    let successCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    try {
      const fileContent = await projectFile.text();
      const projectsToImportJSON: any[] = JSON.parse(fileContent);

      if (!Array.isArray(projectsToImportJSON)) {
        throw new Error("El archivo JSON de proyectos debe contener un array.");
      }

      const validProjectItems = projectsToImportJSON.filter(item => {
        if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
          const msg = `Item de proyecto omitido: no es un objeto válido o está vacío. Item: ${JSON.stringify(item)}`;
          console.warn(msg);
          errorMessages.push(msg);
          errorCount++;
          return false;
        }
        return true;
      });

      const importPromises = validProjectItems.map(async (proj) => {
        const currentProjTyped = proj as ProjectImportData;

        const requiredFields: (keyof Omit<ProjectImportData, 'id' | 'createdAt' | 'description' | 'glosa' | 'phone' | 'address' | 'commune' | 'region' | 'windowsCount' | 'squareMeters' | 'uninstall' | 'uninstallTypes' | 'isHidden' | 'isPaid' >)[] =
          ['projectNumber', 'clientId', 'date', 'subtotal', 'taxRate', 'status', 'collect'];

        const missingFields = requiredFields.filter(field => {
          const value = currentProjTyped[field as keyof ProjectImportData];
          if (field === 'collect') return typeof value !== 'boolean';
          if (typeof value === 'string') return value.trim() === '';
          if (typeof value === 'number') return isNaN(value);
          return value === undefined || value === null;
        });

        if (missingFields.length > 0) {
           const msg = `Proyecto '${currentProjTyped.projectNumber || 'Desconocido'}' omitido: faltan campos obligatorios o son inválidos: ${missingFields.join(', ')}.`;
           throw new Error(msg);
        }

        let projectDate: Date;
        try {
          projectDate = new Date(currentProjTyped.date as string);
          if (isNaN(projectDate.getTime())) throw new Error('Formato de fecha inválido para "date"');
        } catch (e: any) {
          throw new Error(`Proyecto '${currentProjTyped.projectNumber || 'Desconocido'}': Fecha de inicio inválida. ${e.message}. Valor: ${currentProjTyped.date}`);
        }

        let projectCreatedAt: Date | undefined = undefined;
        if (currentProjTyped.createdAt) {
          try {
              projectCreatedAt = new Date(currentProjTyped.createdAt as string);
              if (isNaN(projectCreatedAt.getTime())) {
                  console.warn(`Proyecto '${currentProjTyped.projectNumber || 'Desconocido'}': Fecha de creación inválida, se usará timestamp del servidor. Valor:`, currentProjTyped.createdAt);
                  projectCreatedAt = undefined;
              }
          } catch(e) {
              console.warn(`Proyecto '${currentProjTyped.projectNumber || 'Desconocido'}': Error al parsear fecha de creación, se usará timestamp del servidor. Valor:`, currentProjTyped.createdAt);
              projectCreatedAt = undefined;
          }
        }

        const projectDataPayload: ProjectImportData = {
          id: (currentProjTyped.id && typeof currentProjTyped.id === 'string') ? currentProjTyped.id.trim() : undefined,
          projectNumber: String(currentProjTyped.projectNumber).trim(),
          clientId: String(currentProjTyped.clientId).trim(),
          date: projectDate,
          subtotal: Number(currentProjTyped.subtotal),
          taxRate: Number(currentProjTyped.taxRate),
          status: currentProjTyped.status as ProjectStatus,
          collect: typeof currentProjTyped.collect === 'boolean' ? currentProjTyped.collect : false,
          isPaid: typeof currentProjTyped.isPaid === 'boolean' ? currentProjTyped.isPaid : false,

          description: currentProjTyped.description ? String(currentProjTyped.description) : undefined,
          glosa: currentProjTyped.glosa ? String(currentProjTyped.glosa) : undefined,
          createdAt: projectCreatedAt,
          phone: currentProjTyped.phone ? String(currentProjTyped.phone) : undefined,
          address: currentProjTyped.address ? String(currentProjTyped.address) : undefined,
          commune: currentProjTyped.commune ? String(currentProjTyped.commune) : undefined,
          region: currentProjTyped.region ? String(currentProjTyped.region) : 'RM',
          windowsCount: currentProjTyped.windowsCount ? Number(currentProjTyped.windowsCount) : 0,
          squareMeters: currentProjTyped.squareMeters ? Number(currentProjTyped.squareMeters) : 0,
          uninstall: typeof currentProjTyped.uninstall === 'boolean' ? currentProjTyped.uninstall : false,
          uninstallTypes: Array.isArray(currentProjTyped.uninstallTypes) ? currentProjTyped.uninstallTypes.map(String).filter(Boolean) : [],
          isHidden: typeof currentProjTyped.isHidden === 'boolean' ? currentProjTyped.isHidden : false,
        };
        
        try {
            return await addProject(projectDataPayload);
        } catch (serviceError: any) {
            throw new Error(`Error al guardar proyecto '${projectDataPayload.projectNumber || 'Desconocido'}': ${serviceError.message}`);
        }
      });

      const results = await Promise.allSettled(importPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          const errorMessage = result.reason?.message || 'Error desconocido durante la importación del proyecto.';
          errorMessages.push(errorMessage);
          console.error("Error en la importación de proyecto:", result.reason);
        }
      });

      let description = `${successCount} proyectos importados exitosamente. ${errorCount} errores.`;
      if (errorMessages.length > 0) {
        description += ` Detalles: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`;
      }

      toast({
        title: "Importación de Proyectos Completada",
        description: description,
        variant: errorCount > 0 ? "destructive" : "default",
        duration: errorCount > 0 ? 10000 : 5000,
      });

    } catch (error: any)      {
      console.error("Error general durante la importación de proyectos:", error);
      toast({
        title: "Error de Importación General",
        description: `No se pudo importar proyectos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingProjects(false);
      setProjectFile(null);
    }
  };

  const handleImportPayments = async () => {
    if (!paymentFile) {
      toast({ title: "Error", description: "Por favor, selecciona un archivo de pagos.", variant: "destructive" });
      return;
    }
    setIsImportingPayments(true);
    let successCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    try {
      const fileContent = await paymentFile.text();
      const paymentsToImportJSON: any[] = JSON.parse(fileContent);

      if (!Array.isArray(paymentsToImportJSON)) {
        throw new Error("El archivo JSON de pagos debe contener un array.");
      }

      const validPaymentItems = paymentsToImportJSON.filter(item => {
        if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
          const msg = `Item de pago omitido: no es un objeto válido o está vacío. Item: ${JSON.stringify(item)}`;
          console.warn(msg);
          errorMessages.push(msg);
          errorCount++;
          return false;
        }
        return true;
      });

      const importPromises = validPaymentItems.map(async (pay) => {
        const currentPayTyped = pay as PaymentImportDataType;

        const requiredFields: (keyof PaymentImportDataType)[] = ['id', 'projectId', 'date', 'createdAt', 'isAdjustment'];
        const missingFields = requiredFields.filter(field => {
          const value = currentPayTyped[field as keyof PaymentImportDataType];
          if (field === 'isAdjustment') return typeof value !== 'boolean';
          if (field === 'id' || field === 'projectId') {
             if (typeof value === 'string') return value.trim() === '';
             return value === undefined || value === null;
          }
          if (typeof value === 'string' && (field === 'date' || field === 'createdAt')) {
            return value.trim() === '';
          }
          return value === undefined || value === null;
        });

        if (missingFields.length > 0) {
          const msg = `Pago '${currentPayTyped.id || 'Desconocido'}' omitido: faltan campos obligatorios o son inválidos: ${missingFields.join(', ')}.`;
          throw new Error(msg);
        }

        let paymentDate: Date;
        try {
          paymentDate = new Date(currentPayTyped.date as string);
          if (isNaN(paymentDate.getTime())) throw new Error('Formato de fecha inválido para "date"');
        } catch (e: any) {
          throw new Error(`Pago '${currentPayTyped.id || 'Desconocido'}': Fecha de pago inválida. ${e.message}. Valor: ${currentPayTyped.date}`);
        }

        let paymentCreatedAt: Date;
        try {
          paymentCreatedAt = new Date(currentPayTyped.createdAt as string);
          if (isNaN(paymentCreatedAt.getTime())) throw new Error('Formato de fecha inválido para "createdAt"');
        } catch (e: any) {
          throw new Error(`Pago '${currentPayTyped.id || 'Desconocido'}': Fecha de creación inválida. ${e.message}. Valor: ${currentPayTyped.createdAt}`);
        }
        
        // Validar paymentMethod
        if (currentPayTyped.paymentMethod && !POSSIBLE_PAYMENT_METHODS.includes(currentPayTyped.paymentMethod as any)) {
          throw new Error(`Pago '${currentPayTyped.id || 'Desconocido'}': campo 'paymentMethod' con valor "${currentPayTyped.paymentMethod}" es incorrecto. Valores aceptados: ${POSSIBLE_PAYMENT_METHODS.join(', ')}.`);
        }

        // Validar paymentType
        if (currentPayTyped.paymentType && !POSSIBLE_PAYMENT_TYPES.includes(currentPayTyped.paymentType as any)) {
          // Nota: POSSIBLE_PAYMENT_TYPES no incluye ' '. Si se necesita, se debe añadir a la constante.
          throw new Error(`Pago '${currentPayTyped.id || 'Desconocido'}': campo 'paymentType' con valor "${currentPayTyped.paymentType}" es incorrecto. Valores aceptados: ${POSSIBLE_PAYMENT_TYPES.join(', ')}.`);
        }


        const paymentDataPayload: PaymentImportDataType = {
          id: String(currentPayTyped.id).trim(),
          projectId: String(currentPayTyped.projectId).trim(),
          amount: currentPayTyped.amount !== undefined ? Number(currentPayTyped.amount) : undefined,
          date: paymentDate,
          paymentMethod: currentPayTyped.paymentMethod ? String(currentPayTyped.paymentMethod) : undefined,
          createdAt: paymentCreatedAt,
          paymentType: currentPayTyped.paymentType ? String(currentPayTyped.paymentType) : undefined,
          installments: currentPayTyped.installments !== undefined ? Number(currentPayTyped.installments) : undefined,
          isAdjustment: typeof currentPayTyped.isAdjustment === 'boolean' ? currentPayTyped.isAdjustment : false,
          notes: currentPayTyped.notes ? String(currentPayTyped.notes) : undefined,
        };

        try {
          return await addPayment(paymentDataPayload);
        } catch (serviceError: any) {
          throw new Error(`Error al guardar pago '${paymentDataPayload.id}': ${serviceError.message}`);
        }
      });

      const results = await Promise.allSettled(importPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          const errorMessage = result.reason?.message || 'Error desconocido durante la importación del pago.';
          errorMessages.push(errorMessage);
          console.error("Error en la importación de pago:", result.reason);
        }
      });

      let description = `${successCount} pagos importados exitosamente. ${errorCount} errores.`;
      if (errorMessages.length > 0) {
        description += ` Detalles: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`;
      }

      toast({
        title: "Importación de Pagos Completada",
        description: description,
        variant: errorCount > 0 ? "destructive" : "default",
        duration: errorCount > 0 ? 10000 : 5000,
      });

    } catch (error: any) {
      console.error("Error general durante la importación de pagos:", error);
      toast({
        title: "Error de Importación General",
        description: `No se pudo importar pagos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsImportingPayments(false);
      setPaymentFile(null);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3">
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
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-full sm:w-[180px]" id="theme">
                      <SelectValue placeholder="Seleccionar tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end pt-4">
                <Button onClick={() => toast({title: "Próximamente", description: "Guardar preferencias generales estará disponible pronto."})}>Guardar Cambios (General)</Button>
            </div>
          </TabsContent>

          <TabsContent value="datos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Importar Datos</CardTitle>
                <CardDescription>Importa clientes, proyectos o pagos desde archivos JSON.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Importar Clientes */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="import-clients-dnd" className="text-base font-semibold">Importar Clientes (JSON)</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsClientSchemaModalOpen(true)}>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Arrastra un archivo JSON o haz clic para seleccionar. Campos: `name` (string, req), `id` (string, opc), `phone` (string|null, opc), `email` (string|null, opc), `createdAt` (string ISO 8601 o YYYY-MM-DD, opc).
                  </p>
                  <FileDndInput
                    id="import-clients-dnd"
                    accept=".json"
                    onFileSelected={handleClientFileSelected}
                    disabled={isImportingClients}
                    label={clientFile ? `Archivo seleccionado: ${clientFile.name}` : "Arrastra y suelta tu JSON aquí, o haz clic"}
                    maxSize={5 * 1024 * 1024} // 5MB limit
                  />
                  <Button onClick={handleImportClients} className="w-full sm:w-auto mt-2" disabled={!clientFile || isImportingClients}>
                    {isImportingClients ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Importar Clientes
                  </Button>
                </div>

                {/* Importar Proyectos */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="import-projects-dnd" className="text-base font-semibold">Importar Proyectos (JSON)</Label>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsProjectSchemaModalOpen(true)}>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JSON array. Requeridos: `projectNumber`, `clientId`, `date` (YYYY-MM-DD), `subtotal`, `taxRate`, `status`, `collect`. Opc: `id`, `description`, `glosa`, `createdAt`, `phone`, `address`, `commune`, `region`, `windowsCount`, `squareMeters`, `uninstall`, `uninstallTypes` (array de strings), `isHidden`, `isPaid`.
                  </p>
                   <FileDndInput
                    id="import-projects-dnd"
                    accept=".json"
                    onFileSelected={handleProjectFileSelected}
                    disabled={isImportingProjects}
                    label={projectFile ? `Archivo seleccionado: ${projectFile.name}` : "Arrastra y suelta tu JSON aquí, o haz clic"}
                    maxSize={10 * 1024 * 1024} // 10MB limit
                  />
                  <Button onClick={handleImportProjects} className="w-full sm:w-auto mt-2" disabled={!projectFile || isImportingProjects}>
                    {isImportingProjects ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Importar Proyectos
                  </Button>
                </div>

                {/* Importar Pagos */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="import-payments-dnd" className="text-base font-semibold">Importar Pagos (JSON)</Label>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsPaymentSchemaModalOpen(true)}>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JSON array. Requeridos: `id`, `projectId`, `date` (YYYY-MM-DD o ISO), `createdAt` (YYYY-MM-DD o ISO), `isAdjustment` (boolean). Opc: `amount`, `paymentMethod`, `paymentType`, `installments`, `notes`.
                  </p>
                   <FileDndInput
                    id="import-payments-dnd"
                    accept=".json"
                    onFileSelected={handlePaymentFileSelected}
                    disabled={isImportingPayments}
                    label={paymentFile ? `Archivo seleccionado: ${paymentFile.name}` : "Arrastra y suelta tu JSON aquí, o haz clic"}
                    maxSize={5 * 1024 * 1024} // 5MB limit
                  />
                  <Button onClick={handleImportPayments} className="w-full sm:w-auto mt-2" disabled={!paymentFile || isImportingPayments}>
                    {isImportingPayments ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Importar Pagos
                  </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Esquema Clientes */}
      <Dialog open={isClientSchemaModalOpen} onOpenChange={setIsClientSchemaModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Esquema JSON para Importar Clientes</DialogTitle>
            <DialogDescription>
              Asegúrate de que tu archivo JSON siga esta estructura. Los campos con "(opcional)" pueden omitirse.
              El campo `id` es opcional; si se proporciona y ya existe, se intentará actualizar. Si no, se creará con ese ID.
              Si `id` se omite, se generará uno nuevo.
            </DialogDescription>
          </DialogHeader>
          <CopyableCodeBlock codeString={clientJsonSchemaExample} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Esquema Proyectos */}
      <Dialog open={isProjectSchemaModalOpen} onOpenChange={setIsProjectSchemaModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Esquema JSON para Importar Proyectos</DialogTitle>
            <DialogDescription>
              Asegúrate de que tu archivo JSON siga esta estructura. Los campos con "(opcional)" pueden omitirse.
              El campo `id` es opcional; si se proporciona y ya existe, se intentará actualizar. Si no, se creará con ese ID.
              Si `id` se omite, se generará uno nuevo. `clientId` debe ser un ID válido de un cliente existente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2">
            <CopyableCodeBlock codeString={projectJsonSchemaExample} />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Modal Esquema Pagos */}
      <Dialog open={isPaymentSchemaModalOpen} onOpenChange={setIsPaymentSchemaModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Esquema JSON para Importar Pagos</DialogTitle>
            <DialogDescription>
              Asegúrate de que tu archivo JSON siga esta estructura. El campo `id` es requerido para la importación.
              `projectId` debe ser un ID válido de un proyecto existente. Los campos `paymentMethod` y `paymentType` tienen valores específicos aceptados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2">
            <CopyableCodeBlock codeString={paymentJsonSchemaExample} />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
