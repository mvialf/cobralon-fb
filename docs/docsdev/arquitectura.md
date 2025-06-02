# Arquitectura Web del Proyecto

Este documento describe la arquitectura general del proyecto web, detallando los principales componentes y cómo interactúan entre sí.

## 1. Frontend

*   **Tecnología Principal:** [Identificar la tecnología principal, ej. React/Next.js]
*   **Estructura de Archivos:** Organización de componentes (UI, modales, tablas), hooks, páginas (app directory en Next.js).
*   **Manejo de Estado:** [Describir cómo se maneja el estado global/local, ej. React Context, Redux, Zustand, etc.]
*   **Enrutamiento:** Gestión de las diferentes rutas de la aplicación.
*   **Interacción con Backend:** Cómo el frontend se comunica con los servicios de backend (ej. llamadas a API, uso de funciones en `src/services/`).
*   **Componentes Reutilizables:** Uso de una librería de componentes UI (`src/components/ui/`).

## 2. Backend (Lógica de Servicios)

*   **Ubicación:** Código de servicios en `src/services/`.
*   **Funcionalidad:** Implementación de la lógica de negocio, validación de datos, interacción directa con la base de datos (Firestore).
*   **Servicios Específicos:**
    *   `clientService.ts`: Lógica relacionada con clientes.
    *   `projectService.ts`: Lógica relacionada con proyectos.
    *   `paymentService.ts`: Lógica relacionada con pagos.
    *   `afterSalesService.ts`: Lógica relacionada con postventa.
*   **Manejo de Errores:** Implementación de validaciones y manejo de errores en la capa de servicios.

## 3. Base de Datos

*   **Tecnología:** Firestore (NoSQL Database).
*   **Estructura:** Colecciones principales como `clients`, `projects`, `payments`, `afterSales`.
*   **Interacciones:** Lectura, escritura, actualización y eliminación de documentos.
*   **Reglas de Seguridad:** [Mencionar si se aplican reglas de seguridad en Firestore]
*   **Lógica de Cascada:** Gestión de la eliminación de datos relacionados (ej. al eliminar un cliente, se eliminan sus proyectos asociados).

## 4. Otros Componentes y Servicios

*   **AI/Genkit:** Integración potencial con modelos de IA (visto en `src/ai/`).
*   **Utilidades:** Funciones helper para tareas comunes (`src/lib/`).
*   **Firebase Client/Admin:** Configuración para interactuar con Firebase desde el frontend y el backend (`src/lib/firebase/`).
*   **Autenticación:** [Si aplica, describir el sistema de autenticación]
*   **Despliegue:** [Mencionar la plataforma de despliegue, ej. Firebase Hosting, Vercel, etc.]

## 5. Flujo de Datos (Ejemplo)

*   **Carga de Página de Proyectos:**
    *   El frontend (página `/projects`) llama a `projectService.getProjects()`.
    *   `projectService` consulta la colección `projects` en Firestore.
    *   `projectService` también consulta la colección `clients` para obtener nombres asociados.
    *   Los datos se retornan al frontend para mostrar la tabla de proyectos.
*   **Creación de Cliente:**
    *   El usuario interactúa con un modal en el frontend.
    *   Se llama a `clientService.createClient()` con los datos del formulario.
    *   `clientService` valida los datos y escribe un nuevo documento en la colección `clients` en Firestore.
    *   Se muestra un feedback al usuario en el frontend (ej. un toast).
