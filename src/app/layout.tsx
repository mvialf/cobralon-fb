
// src/app/layout.tsx
"use client";

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, CalendarDays, Settings, Users, Loader2, DollarSign } from 'lucide-react'; // Added DollarSign
import { useState, useEffect } from 'react';
import { ThemeProvider } from "next-themes";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
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
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <Sidebar collapsible="icon">
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
                        isActive={pathname === '/'}
                        tooltip={{children: "Calendario", side:"right"}}
                      >
                        <Link href="/">
                          <CalendarDays />
                          <span>Calendario</span>
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

              <SidebarInset>
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
