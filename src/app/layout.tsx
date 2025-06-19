
// src/app/layout.tsx
"use client";

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, CalendarDays, Settings, Users, Loader2, DollarSign, LineChart, Wrench, Home } from 'lucide-react'; // Added LineChart, Wrench, and Home
import { useState, useEffect } from 'react';
import { ThemeProvider } from "next-themes";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { HeaderNav } from '@/components/ui/headernav';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset
} from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/*
// Metadata should be defined in a server component or RSC payload
export const metadata: Metadata = {
  title: 'CalReact - Calendario Avanzado',
  description: 'Una aplicación de calendario moderna inspirada en Bryntum, construida con Next.js y TypeScript.',
};
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <html lang="es" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
          <div className="flex flex-col h-screen items-center justify-center bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Cargando aplicación...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <HeaderNav />
            <SidebarProvider>
              <Sidebar collapsible="icon" className="pt-16">
                <SidebarHeader className="p-4">
                  <Link href="/" className="flex items-center gap-2" title="CalReact Home">
                    <CalendarDays className="h-7 w-7 text-primary flex-shrink-0" />
                    <h2 className="text-2xl font-bold text-primary group-data-[collapsible=icon]:hidden">
                      CalReact
                    </h2>
                  </Link>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard' || pathname === '/'}
                        tooltip={{children: "Dashboard", side:"right"}}
                      >
                        <Link href="/dashboard">
                          <LineChart />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/projects' || pathname?.startsWith('/projects/')}
                        tooltip={{children: "Proyectos", side:"right"}}
                      >
                        <Link href="/projects">
                          <Briefcase />
                          <span>Proyectos</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/calendar'}
                        tooltip={{children: "Calendario", side:"right"}}
                      >
                        <Link href="/calendar">
                          <CalendarDays />
                          <span>Calendario</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/aftersales' || pathname?.startsWith('/aftersales/')}
                        tooltip={{children: "Postventas", side:"right"}}
                      >
                        <Link href="/aftersales">
                          <Wrench />
                          <span>Postventas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/visits' || pathname?.startsWith('/visits/')}
                        tooltip={{children: "Visitas", side:"right"}}
                      >
                        <Link href="/visits">
                          <Home />
                          <span>Visitas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/payments'}
                        tooltip={{children: "Pagos", side:"right"}}
                      >
                        <Link href="/payments">
                          <DollarSign />
                          <span>Pagos</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/clients'}
                        tooltip={{children: "Clientes", side:"right"}}
                      >
                        <Link href="/clients">
                          <Users />
                          <span>Clientes</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/settings'}
                        tooltip={{children: "Configuración", side:"right"}}
                      >
                        <Link href="/settings">
                          <Settings />
                          <span>Configuración</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarContent>
                <SidebarFooter className="p-4 mt-auto">
                  <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    © 2024 CalReact App
                  </p>
                </SidebarFooter>
              </Sidebar>

              <SidebarInset className="pt-16">
                {children}
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
