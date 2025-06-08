'use client';

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Users, 
  DollarSign, 
  CalendarDays, 
  ArrowUpCircle,
  ArrowDownCircle, 
  Clock,
  CircleDot,
  LineChart,
  Loader2
} from 'lucide-react';

// Importación del nuevo componente reutilizable
import DashboardProjectItem from '@/components/dashboard/dashboard-project-item';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getClients } from '@/services/clientService';
import { getProjects } from '@/services/projectService';
import { getAllPayments } from '@/services/paymentService';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ProjectType } from '@/types/project'; // Importar ProjectType

// Definición de tipos para los datos
interface DashboardData {
  totalProjects: number;
  activeProjects: number;
  totalClients: number;
  totalPayments: number;
  recentPaymentsAmount: number;
  pendingAmount: number;
  projectsThisMonth: number;
  isLoading: boolean;
}

// Componente de tarjeta con skeleton para carga
const StatCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  loading, 
  colorClass = "text-primary",
  change
}: { 
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  loading: boolean;
  colorClass?: string;
  change?: {
    value: number;
    isPositive: boolean;
  }
}) => (
  <Card className="bg-card border-border">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="h-9 w-24 bg-muted/70 rounded-md animate-pulse"></div>
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      <p className="text-xs text-muted-foreground mt-1 flex items-center">
        {description}
        {change && (
          <span className={`ml-2 flex items-center ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {change.isPositive ? <ArrowUpCircle className="w-3 h-3 mr-1" /> : <ArrowDownCircle className="w-3 h-3 mr-1" />}
            {change.value}%
          </span>
        )}
      </p>
    </CardContent>
  </Card>
);

// Componente para el gráfico de actividad reciente (simplificado)
const ActivityChart = ({ loading }: { loading: boolean }) => (
  <Card className="h-full bg-card border-border">
    <CardHeader>
      <CardTitle>Actividad Reciente</CardTitle>
      <CardDescription>Resumen de actividad de los últimos 30 días</CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="h-40 sm:h-52 bg-muted/70 rounded-md animate-pulse"></div>
      ) : (
        <div className="h-40 sm:h-52 flex items-center justify-center">
          <div className="text-center">
            <LineChart className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Gráfico de actividad - En desarrollo</p>
            <p className="text-xs text-muted-foreground/70 mt-2">Los datos de actividad serán mostrados aquí</p>
          </div>
        </div>
      )}
    </CardContent>
    <CardFooter>
      <Button className="w-full" variant="outline" asChild>
        <Link href="/projects">Ver todos los proyectos</Link>
      </Button>
    </CardFooter>
  </Card>
);

// Componente para proyectos recientes
const RecentProjects = ({ projects, loading }: { projects: ProjectType[]; loading: boolean }) => (
  <Card className="h-full bg-card border-border">
    <CardHeader>
      <CardTitle>Proyectos Recientes</CardTitle>
    </CardHeader>
    <CardContent className="overflow-auto" style={{ maxHeight: 'calc(100% - 100px)' }}> {/* Ajustar altura para CardFooter */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/70 rounded-md animate-pulse"></div>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((project) => (
            <DashboardProjectItem
              key={project.id}
              project={project}
              icon={project.isPaid ? CircleDot : Clock}
              iconColorClass={project.isPaid ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}
              line1TextMain={project.projectNumber}
              line1TextSecondary={project.glosa || ''}
              line2Text={`${new Date(project.date).toLocaleDateString()} - ${formatCurrency(project.total)}`}
              href={`/projects/${project.id}/edit`}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay proyectos recientes para mostrar</p>
      )}
    </CardContent>
    <CardFooter>
      <Button asChild variant="outline" className="w-full">
        <Link href="/projects">Ver todos los proyectos</Link>
      </Button>
    </CardFooter>
  </Card>
);

// Componente para proyectos por cobrar
const ProjectsToCollectList = ({ projects, loading }: { projects: ProjectType[]; loading: boolean }) => (
  <Card className="h-full bg-card border-border">
    <CardHeader>
      <CardTitle>Proyectos por Cobrar</CardTitle>
    </CardHeader>
    <CardContent className="overflow-auto" style={{ maxHeight: 'calc(100% - 100px)' }}> 
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={`skeleton-collect-${i}`} className="flex items-center justify-between p-3 bg-muted/70 rounded-md animate-pulse">
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-3 w-32 bg-muted rounded"></div>
              </div>
              <div className="h-5 w-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <DashboardProjectItem
              key={project.id}
              project={project}
              icon={DollarSign}
              iconColorClass="bg-sky-500/20 text-sky-500"
              line1TextMain={project.projectNumber}
              line1TextSecondary={project.clientName || ''}
              line2Text={`Saldo Pendiente: ${formatCurrency(project.balance)}`}
              href={`/projects/${project.id}/edit`}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <CircleDot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay proyectos marcados para cobrar.</p>
        </div>
      )}
    </CardContent>
    <CardFooter>
      <Button className="w-full" variant="outline" asChild>
        <Link href="/projects">Ver todos los proyectos</Link>
      </Button>
    </CardFooter>
  </Card>
);

// Función para formatear montos a peso chileno
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    totalProjects: 0,
    activeProjects: 0,
    totalClients: 0,
    totalPayments: 0,
    recentPaymentsAmount: 0,
    pendingAmount: 0,
    projectsThisMonth: 0,
    isLoading: true,
  });
  
  const [recentProjects, setRecentProjects] = useState<ProjectType[]>([]);
  const [projectsToCollect, setProjectsToCollect] = useState<ProjectType[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setData(prev => ({ ...prev, isLoading: true }));
        const [rawProjectsData, clientsData, paymentsData] = await Promise.all([
          getProjects(),
          getClients(),
          getAllPayments()
        ]);

        const clientMap = new Map(clientsData.map(client => [client.id, client.name]));

        const projects: ProjectType[] = rawProjectsData.map(project => ({
          ...project,
          clientName: clientMap.get(project.clientId) || 'Cliente Desconocido'
        }));

        // Cálculos existentes basados en 'projects' (ahora enriquecidos), 'clientsData', 'paymentsData'
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Proyectos activos (no pagados)
        const activeProjects = projects.filter(p => !p.isPaid);
        
        // Pagos recientes (últimos 30 días)
        const recentPayments = paymentsData.filter((p: any) => new Date(p.date) >= thirtyDaysAgo); // Usar paymentsData y tipar p
        // Línea duplicada eliminada
        
        // Proyectos de este mes
        const projectsThisMonth = projects.filter(p => new Date(p.date) >= startOfMonth);
        
        // Monto pendiente total
        const pendingAmount = activeProjects.reduce((sum, project) => sum + (project.balance || 0), 0);
        
        // Monto pagado reciente (últimos 30 días)
        const recentPaymentsAmount = recentPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Actualizar el estado con los datos calculados
        setData({
          totalProjects: projects.length, // Usar projects enriquecidos
          activeProjects: activeProjects.length,
          totalClients: clientsData.length, // Usar clientsData
          totalPayments: paymentsData.length, // Usar paymentsData
          recentPaymentsAmount,
          pendingAmount,
          projectsThisMonth: projectsThisMonth.length,
          isLoading: false,
        });
        
        // Ordenar proyectos por fecha (más recientes primero) y tomar los 5 primeros
        setRecentProjects(
          [...projects]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
        );

        // Filtrar y ordenar proyectos para cobrar
        const allProjectsToCollect = projects
          .filter(p => p.collect === true && p.isPaid === false)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Opcional: ordenar por fecha más antigua primero
        
        setProjectsToCollect(allProjectsToCollect.slice(0, 5)); // Mostrar solo los primeros 5
        // Podríamos guardar allProjectsToCollect.length en el estado 'data' si quisiéramos mostrar un contador total.
        
        // NOTA: La lógica de recentPayments se eliminó porque el componente ahora es ProjectsToCollectList
        // Si se necesita una lista de pagos recientes en otro lugar, se debería añadir un nuevo estado y lógica para ello.
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
    
    loadDashboardData();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground p-0 sm:p-4">
      <header className="p-4 text-center sm:text-left flex items-center gap-4">
        <SidebarTrigger className="md:hidden" /> {/* Para control móvil, se oculta en desktop */}
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Información general del sistema</p>
        </div>
      </header>
      
      <main className="flex-grow overflow-auto p-4">
        {data.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="Proyectos Totales" 
                value={data.totalProjects}
                description="Total de proyectos registrados" 
                icon={Briefcase} 
                loading={data.isLoading}
                change={{ value: 5, isPositive: true }}
              />
              <StatCard 
                title="Proyectos Activos" 
                value={data.activeProjects} 
                description="Proyectos pendientes" 
                icon={Clock} 
                loading={data.isLoading}
                colorClass="text-amber-500"
              />
              <StatCard 
                title="Clientes" 
                value={data.totalClients} 
                description="Total de clientes" 
                icon={Users} 
                loading={data.isLoading}
              />
              <StatCard 
                title="Pagos Recibidos" 
                value={formatCurrency(data.recentPaymentsAmount)} 
                description="Pagos últimos 30 días" 
                icon={DollarSign} 
                loading={data.isLoading}
                colorClass="text-green-500"
              />
            </div>
            
            {/* Contenedores inferiores - 3 en fila con diferentes proporciones */}
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <div className="md:col-span-3">
                <ActivityChart loading={data.isLoading} />
              </div>
              <div className="md:col-span-3">
                <RecentProjects projects={recentProjects} loading={data.isLoading} />
              </div>
              <div className="md:col-span-2">
                <ProjectsToCollectList projects={projectsToCollect} loading={data.isLoading} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
