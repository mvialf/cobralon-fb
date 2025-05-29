
# Documentación de Backend: Página de Proyectos (`/projects`)

## 1. Propósito Principal

La página de "Proyectos" es la interfaz principal para que los usuarios visualicen una lista de todos los proyectos registrados en el sistema. Permite acciones básicas como la navegación para crear un nuevo proyecto, editar uno existente, y eliminar proyectos. También muestra información clave de cada proyecto de un vistazo y permite una interacción rápida como marcar un proyecto como "Pagado".

## 2. Colecciones de Firestore Involucradas

*   **`projects`**:
    *   **Lectura (Principal)**: Se leen todos los documentos de esta colección para poblar la tabla de proyectos. La consulta se ordena por `date` (fecha de inicio del proyecto) de forma descendente.
    *   **Actualización**: Se actualizan documentos individuales cuando un usuario interactúa con el interruptor "Pagado". Específicamente, se modifica el campo `isPaid` y `updatedAt` del proyecto.
    *   **Eliminación**: Se eliminan documentos de esta colección cuando un usuario confirma la acción de "Eliminar proyecto". Esta acción desencadena una lógica de cascada.
*   **`clients`**:
    *   **Lectura**: Se leen los documentos de esta colección para obtener el nombre del cliente asociado a cada proyecto. Este nombre se muestra en la tabla junto al número de proyecto y la glosa.

## 3. Servicios de Backend Utilizados (ubicados en `src/services/`)

*   **`projectService.ts`**:
    *   `getProjects()`: Función principal invocada para obtener la lista completa de proyectos desde Firestore. Internamente, ordena los proyectos por la fecha de inicio (`date`).
    *   `updateProject(projectId, projectData)`: Se llama cuando se cambia el estado del interruptor "Pagado". El `projectData` enviado solo contiene `{ isPaid: nuevoValorBooleano }`. El servicio se encarga de actualizar este campo y el `updatedAt` timestamp en Firestore.
    *   `deleteProject(projectId)`: Se invoca al confirmar la eliminación de un proyecto. Este servicio es crítico porque maneja la **eliminación en cascada**:
        1.  Llama a `deletePaymentsForProject(projectId)` (de `paymentService.ts`) para eliminar todos los pagos asociados.
        2.  Llama a `deleteAfterSalesForProject(projectId)` (de `afterSalesService.ts`) para eliminar todos los registros de postventa asociados.
        3.  Finalmente, elimina el documento del proyecto de la colección `projects`.
*   **`clientService.ts`**:
    *   `getClients()`: Se utiliza para obtener la lista de todos los clientes. La página de proyectos luego usa esta lista para encontrar y mostrar el nombre del cliente correspondiente a cada `clientId` almacenado en los documentos de proyecto.

## 4. Tipos de Datos Principales (ubicados en `src/types/`)

*   **`ProjectType` (de `project.ts`)**: Define la estructura completa de un objeto de proyecto como se utiliza en la aplicación y se espera de Firestore (después de la conversión de Timestamps a Dates). Incluye campos como `id`, `projectNumber`, `clientId`, `glosa`, `date`, `subtotal`, `taxRate`, `total`, `balance`, `status`, `isPaid`, `collect`, `isHidden`, `phone`, `address`, `commune`, `region`, `windowsCount`, `squareMeters`, `uninstall`, `uninstallTypes`, `createdAt`, `updatedAt`.
*   **`Client` (de `client.ts`)**: Define la estructura de un objeto de cliente. En esta página, se utiliza principalmente para acceder al campo `name` del cliente.
*   **`ProjectDocument` (de `project.ts`)**: Representa la estructura del documento como se almacena en Firestore (con campos de fecha como `Timestamp` de Firestore). Los servicios manejan la conversión entre `ProjectType` y `ProjectDocument`.

## 5. Lógica de Negocio Clave (Backend y Datos)

*   **Listado y Enriquecimiento de Datos**:
    *   La página utiliza `useQuery` (de TanStack Query) para obtener proyectos y clientes de forma independiente.
    *   Una vez que ambos conjuntos de datos están disponibles, un `useMemo` combina esta información: para cada proyecto, busca el cliente correspondiente usando `clientId` y añade el `clientName` al objeto del proyecto que se pasará a la tabla.
    *   Se calcula el monto de "Abonos" como `project.total - project.balance`.
*   **Actualización del Estado "Pagado"**:
    *   El interruptor en la tabla está vinculado al campo `isPaid` del proyecto.
    *   Al cambiar el interruptor, se llama a `updateProject` con el `projectId` y el nuevo estado de `isPaid`. El servicio actualiza este booleano y el `updatedAt` timestamp en Firestore.
*   **Eliminación de Proyectos (Cascada)**:
    *   La acción de eliminar un proyecto es una operación crítica que implica eliminar datos relacionados para mantener la integridad.
    *   `deleteProject` primero se asegura de eliminar todos los pagos (`payments`) y registros de postventa (`afterSales`) vinculados al `projectId` antes de eliminar el proyecto en sí. Esto se hace mediante escrituras por lotes (`writeBatch`) en los servicios respectivos para mayor eficiencia.
*   **Navegación a Formularios Dedicados**:
    *   El botón "Nuevo Proyecto" redirige a la página de formulario `/projects/new`.
    *   La acción "Editar proyecto" del menú desplegable redirige a `/projects/[projectId]/edit`. La lógica de carga de datos iniciales para edición y el guardado de las modificaciones residen en esa página de edición específica.

## 6. Consideraciones Importantes de Backend

*   **Reglas de Seguridad de Firestore**:
    *   Para la colección `projects`: Deben permitir `read` (para listar), `update` (para el campo `isPaid` y otras ediciones futuras), y `delete`.
    *   Para la colección `clients`: Deben permitir `read` (para obtener nombres).
    *   Para las colecciones `payments` y `afterSales`: Deben permitir `delete` para que la eliminación en cascada desde `projectService.ts` funcione.
    *   Es crucial que estas reglas estén bien definidas para proteger los datos y permitir solo las operaciones autorizadas.
*   **Indexación**:
    *   La consulta principal en `projects` ordena por `date` (`orderBy('date', 'desc')`). Firestore crea automáticamente índices para campos individuales. Si en el futuro se añaden filtros más complejos (ej. `where('status', '==', 'completado').orderBy('date')`), Firestore podría requerir la creación manual de índices compuestos. La consola de Firebase suele generar un enlace para crear estos índices si una consulta falla debido a la falta de uno.
*   **Manejo de Timestamps**: Los servicios (`projectService.ts`, etc.) se encargan de convertir entre objetos `Date` de JavaScript (usados en la UI y tipos de la aplicación) y objetos `Timestamp` de Firestore (cómo se almacenan las fechas en la base de datos). `serverTimestamp()` se usa para `createdAt` y `updatedAt` para asegurar que la hora del servidor se utilice.
*   **Robustez de la Eliminación en Cascada**: La eliminación en cascada implementada en los servicios se ejecuta desde el lado del cliente. Para una mayor robustez, atomicidad y para evitar problemas si el cliente pierde la conexión a mitad de la operación, se recomienda encarecidamente migrar esta lógica a **Cloud Functions de Firebase** (utilizando, por ejemplo, un trigger `onDelete` en la colección `projects` que luego elimine los datos relacionados en `payments` y `afterSales`).
*   **Gestión de Estado con React Query**: La página utiliza `@tanstack/react-query` (`useQuery`, `useMutation`) para gestionar la obtención de datos, los estados de carga/error y las operaciones de mutación (como actualizar `isPaid` o eliminar). Esto simplifica el manejo del estado asíncrono.

## 7. Flujo de Datos (Simplificado)

1.  Componente `ProjectsPage` se monta.
2.  `useQuery` para `['projects']` llama a `getProjects()`.
3.  `useQuery` para `['clients']` llama a `getClients()`.
4.  `projectService.ts` y `clientService.ts` interactúan con Firestore para obtener los datos.
5.  Los datos regresan a la página, se combinan (se añade `clientName` a los proyectos).
6.  La tabla se renderiza con los datos.
7.  Usuario interactúa (ej. cambia switch "Pagado"):
    *   Se llama a `handleToggleIsPaid`.
    *   `updateProjectMutation.mutate(...)` es invocado.
    *   `projectService.ts -> updateProject` actualiza el documento en Firestore.
    *   React Query invalida la consulta `['projects']` y la vuelve a obtener para reflejar los cambios.
