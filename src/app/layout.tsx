// src/app/layout.tsx
"use client"; // Necesario para usePathname y SidebarProvider

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Settings } from 'lucide-react';

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

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata no puede estar en un Client Component directamente,
// pero Next.js lo manejará si se exporta desde un Server Component o layout.tsx.
// Como este es el RootLayout y ahora es "use client",
// la exportación de metadata aquí podría no ser ideal para SEO estático si no se maneja bien por Next.js.
// Por ahora lo dejamos, pero en apps complejas se podría separar.
/*
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

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
          
          <Toaster />
        </SidebarProvider>
      </body>
    </html>
  );
}
