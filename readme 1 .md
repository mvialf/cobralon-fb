# Documentación General del Proyecto

## 1. Resumen General y Propósito

Este proyecto es un sistema de gestión empresarial especializado para el seguimiento de instalaciones de ventanas, diseñado para Cobralon. La plataforma permite gestionar proyectos de instalación, clientes, pagos y servicios post-venta de manera integral. El usuario final es el personal administrativo y operativo de la empresa, que necesita una herramienta centralizada para rastrear el ciclo completo de sus proyectos, desde la venta inicial hasta el servicio post-instalación, incluyendo la facturación y el seguimiento de pagos.

El sistema resuelve el problema de la gestión fragmentada de información, unificando datos de clientes, proyectos, pagos y servicios post-venta en una única plataforma accesible y actualizada en tiempo real. Esto permite a la empresa tener visibilidad completa del estado financiero y operativo de cada proyecto.

## 2. Arquitectura Principal

La aplicación sigue una arquitectura monolítica basada en el patrón Cliente-Servidor con Next.js como framework principal. El proyecto implementa un modelo de arquitectura por capas:

- **Capa de Presentación**: Componentes React y páginas Next.js
- **Capa de Lógica de Negocio**: Servicios y hooks personalizados
- **Capa de Acceso a Datos**: Servicios que interactúan con Firebase Firestore

```
[Cliente Web] -> [Páginas Next.js] -> [Hooks/Context] -> [Servicios] -> [Firebase Firestore]
```

La aplicación utiliza:

- Renderizado del lado del cliente (CSR) para las operaciones dinámicas
- React Query para la gestión de estado del servidor y caché
- Firebase Firestore como base de datos NoSQL para almacenamiento y sincronización en tiempo real

## 3. Módulos y Componentes Clave

### `/src/app`

Contiene las rutas y páginas de Next.js organizadas por funcionalidad. Implementa el enrutamiento basado en archivos de Next.js.

### `/src/components`

Contiene componentes React reutilizables organizados por funcionalidad:

- Componentes de UI básicos (botones, inputs, modales)
- Componentes específicos del dominio (PaymentModal, ProjectList)
- Componentes de layout (header, sidebar)

### `/src/services`

Contiene la lógica de acceso a datos y servicios externos:

- `projectService.ts`: Gestión CRUD para proyectos
- `paymentService.ts`: Gestión de pagos y transacciones financieras
- `clientService.ts`: Gestión de información de clientes
- `afterSalesService.ts`: Gestión de servicios post-venta

### `/src/utils`

Contiene funciones utilitarias reutilizables:

- `tailwind-helpers.ts`: Utilidades para manipulación de clases CSS
- `date-helpers.ts`: Funciones para manipulación y formateo de fechas
- `calendar-helpers.ts`: Utilidades para la visualización de calendarios
- `badge-helpers.ts`: Funciones para determinar estados visuales

### `/src/constants`

Almacena valores constantes utilizados en toda la aplicación:

- `project.ts`: Constantes relacionadas con proyectos
- `payment.ts`: Constantes relacionadas con pagos

### `/src/lib`

Contiene configuraciones y utilidades a nivel de aplicación:

- `firebase/`: Configuración y utilidades de Firebase
- Archivos legados con re-exportaciones para mantener compatibilidad

### `/src/types`

Define interfaces y tipos TypeScript para todo el sistema:

- `project.ts`: Tipos relacionados con proyectos
- `payment.ts`: Tipos relacionados con pagos
- `client.ts`: Tipos relacionados con clientes
- `afterSales.ts`: Tipos relacionados con servicios post-venta

## 4. Flujos de Datos Principales

### Flujo de Gestión de Proyectos

1. **Creación de Proyecto**:


    - El usuario introduce datos del proyecto en el formulario correspondiente
    - El componente de página invoca `addProject()` del `projectService`
    - `addProject()` formatea los datos, calcula valores derivados (total, balance) y los almacena en Firestore
    - Se actualiza la interfaz y se notifica al usuario del éxito mediante toast

2. **Registro de Pagos para un Proyecto**:


    - El usuario selecciona un proyecto y abre el modal de pago
    - Completa el formulario de pago con monto, método y fecha
    - El componente de página llama a `addPayment()` del `paymentService`
    - `addPayment()` guarda el pago en Firestore y actualiza automáticamente el balance del proyecto
    - Se recalcula el estado de pago del proyecto (`isPaid`) basado en el balance actualizado
    - La UI se actualiza para reflejar el nuevo estado y balance

3. **Flujo de Servicio Post-Venta**:


    - El usuario registra un servicio post-venta desde la vista de proyecto
    - Se completan los datos requeridos (tipo de servicio, descripción, fecha)
    - Se llama a `addAfterSalesService()` del `afterSalesService`
    - El servicio queda registrado y vinculado al proyecto original
    - La vista de proyecto se actualiza para mostrar los servicios post-venta asociados

## 5. Estructura de la Base de Datos (Firestore)

### Colección `projects`

Almacena información de los proyectos de instalación de ventanas:

- **Documento**: Representa un proyecto único
- **Campos principales**:
  - `projectNumber`: Identificador único visible del proyecto
  - `clientId`: Referencia al cliente asociado
  - `date`: Fecha de inicio del proyecto
  - `subtotal`: Monto sin impuestos
  - `taxRate`: Tasa de impuestos aplicable
  - `total`: Monto total calculado
  - `balance`: Saldo pendiente por pagar
  - `status`: Estado actual del proyecto (ingresado, en progreso, completado, cancelado)
  - Campos de ubicación (`address`, `commune`, `region`)
  - Detalles técnicos (`windowsCount`, `squareMeters`)
  - Información de desinstalación (`uninstall`, `uninstallTypes`)
  - Metadatos (`createdAt`, `updatedAt`)
  - Indicadores de estado (`isPaid`, `isHidden`, `collect`)

### Colección `payments`

Registra pagos realizados por los clientes:

- **Documento**: Representa un pago único
- **Campos principales**:
  - `projectId`: Referencia al proyecto asociado
  - `amount`: Monto del pago
  - `date`: Fecha del pago
  - `paymentMethod`: Método utilizado (efectivo, transferencia, etc.)
  - `paymentType`: Tipo de pago (proyecto, servicio, etc.)
  - `isAdjustment`: Indica si es un ajuste contable y no un pago real
  - Metadatos (`createdAt`, `updatedAt`)

### Colección `clients`

Almacena información de los clientes:

- **Documento**: Representa un cliente único
- **Campos principales**:
  - `name`: Nombre del cliente
  - Información de contacto (`email`, `phone`, `address`)
  - Metadatos (`createdAt`, `updatedAt`)

### Colección `afterSales`

Registra servicios post-venta:

- **Documento**: Representa un servicio post-venta único
- **Campos principales**:
  - `projectId`: Referencia al proyecto original
  - `description`: Descripción del servicio o problema
  - `type`: Tipo de servicio post-venta
  - `status`: Estado actual del servicio
  - `date`: Fecha programada para el servicio
  - Metadatos (`createdAt`, `updatedAt`)

## 6. Dependencias y Tecnologías Externas

### Core Framework y UI

- **Next.js**: Framework React para renderizado en el servidor
- **React**: Biblioteca para construir interfaces de usuario
- **TypeScript**: Superset tipado de JavaScript
- **TailwindCSS**: Framework CSS utilitario para estilos

### Componentes de UI

- **Radix UI**: Componentes accesibles y sin estilos (diálogo, dropdown, etc.)
- **shadcn/ui**: Biblioteca construida sobre Radix UI para estilos consistentes
- **Lucide React**: Iconos SVG simples y consistentes
- **React Day Picker**: Componente para selección de fechas

### Gestión del Estado

- **React Query (@tanstack/react-query)**: Gestión de estado del servidor y cache
- **React Hook Form**: Manejo de formularios con validación
- **Zod**: Validación de esquemas y tipos en runtime

### Base de Datos y Backend

- **Firebase/Firestore**: Base de datos NoSQL en la nube
- **Firebase Authentication**: Autenticación de usuarios

### Utilidades

- **date-fns**: Manipulación y formateo de fechas
- **clsx/tailwind-merge**: Utilidades para manipulación condicional de clases CSS
- **Recharts**: Biblioteca para visualización de datos y gráficos

## 7. Configuración y Variables de Entorno

La configuración del proyecto se gestiona principalmente a través de variables de entorno definidas en `.env.local`:

### Variables de Firebase

- `NEXT_PUBLIC_FIREBASE_API_KEY`: Clave de API para Firebase
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Dominio de autenticación
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: ID del proyecto en Firebase
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Bucket de almacenamiento
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: ID de remitente para mensajería
- `NEXT_PUBLIC_FIREBASE_APP_ID`: ID de la aplicación en Firebase

### Variables de Next.js

- `NEXT_PUBLIC_APP_URL`: URL base para la aplicación

### Variables de Configuración de Aplicación

- `NEXT_PUBLIC_APP_NAME`: Nombre de la aplicación para mostrar en interfaces
- `NEXT_PUBLIC_DEFAULT_TAX_RATE`: Tasa de impuestos predeterminada

Para ejecutar el proyecto localmente, es necesario:

1. Crear una cuenta y proyecto en Firebase
2. Habilitar Firestore en el proyecto
3. Configurar las reglas de seguridad para Firestore
4. Copiar las credenciales de Firebase a un archivo `.env.local`
5. Instalar dependencias con `npm install`
6. Iniciar el servidor de desarrollo con `npm run dev`
