
# Documentación de Backend: Página de Clientes (`/clients`)

## 1. Propósito Principal

La página de "Clientes" sirve como el centro de gestión para toda la información relacionada con los clientes. Permite a los usuarios ver una lista de todos los clientes registrados, añadir nuevos clientes, editar la información de los existentes y eliminar clientes del sistema.

## 2. Colecciones de Firestore Involucradas

*   **`clients`**:
    *   **Lectura (Principal)**: Se leen todos los documentos de esta colección para mostrar la lista de clientes. La consulta se ordena por `name` (nombre del cliente) de forma ascendente.
    *   **Escritura (Creación)**: Se añaden nuevos documentos a esta colección cuando un usuario registra un nuevo cliente a través del modal.
    *   **Actualización**: Se actualizan documentos existentes cuando un usuario modifica la información de un cliente a través del modal.
    *   **Eliminación**: Se eliminan documentos de esta colección cuando un usuario confirma la acción de "Eliminar cliente". Esta acción desencadena una lógica de cascada.

## 3. Servicios de Backend Utilizados (ubicados en `src/services/`)

*   **`clientService.ts`**:
    *   `getClients()`: Función principal invocada para obtener la lista completa de clientes desde Firestore, ordenada por nombre.
    *   `addClient(clientData)`: Se llama cuando se guarda un nuevo cliente desde el modal. `clientData` es del tipo `Omit<Client, 'id' | 'createdAt' | 'updatedAt'>` o `ClientImportData` (para importaciones). El servicio añade los timestamps `createdAt` y `updatedAt`.
    *   `updateClient(clientId, clientData)`: Se llama cuando se guarda un cliente existente desde el modal. `clientData` es un objeto parcial con los campos a modificar. El servicio actualiza los campos proporcionados y el timestamp `updatedAt`.
    *   `deleteClient(clientId)`: Se invoca al confirmar la eliminación de un cliente. Este servicio es crucial porque maneja la **eliminación en cascada**:
        1.  Llama a `getProjects(clientId)` (de `projectService.ts`) para obtener todos los proyectos asociados a este cliente.
        2.  Para cada proyecto obtenido, llama a `deleteProject(projectId)` (de `projectService.ts`). Esta función, a su vez, se encarga de eliminar los pagos y postventas asociados a ese proyecto.
        3.  Finalmente, elimina el documento del cliente de la colección `clients`.

*   **`projectService.ts`** (invocado indirectamente por `clientService.ts`):
    *   `getProjects(clientId)`: Usado por `deleteClient` para encontrar proyectos a eliminar.
    *   `deleteProject(projectId)`: Usado por `deleteClient` para eliminar cada proyecto del cliente.

## 4. Tipos de Datos Principales (ubicados en `src/types/`)

*   **`Client` (de `client.ts`)**: Define la estructura de un objeto de cliente en la aplicación. Incluye campos como `id`, `name`, `phone`, `email`, `createdAt`, `updatedAt`.
*   **`ClientDocument` (de `client.ts`)**: Representa cómo se almacena un cliente en Firestore (con fechas como Timestamps).
*   **`ClientImportData` (de `client.ts`)**: Interfaz específica para la importación de datos de clientes, permitiendo `id` y `createdAt` opcionales.

## 5. Lógica de Negocio Clave (Backend y Datos)

*   **Listado de Clientes**:
    *   Se recuperan todos los documentos de la colección `clients` ordenados por nombre.
*   **Creación de Clientes**:
    *   El modal `ClientModal` recopila los datos del nuevo cliente (`name`, `phone`, `email`).
    *   Al guardar, se llama a `addClient`. El servicio se encarga de añadir los timestamps `createdAt` y `updatedAt` (usando `serverTimestamp()`) y guarda el nuevo documento en Firestore. Firestore genera un ID único para el nuevo cliente si no se proporciona uno (como en el caso de la importación).
*   **Actualización de Clientes**:
    *   El modal `ClientModal` se precarga con los datos del cliente seleccionado.
    *   Al guardar los cambios, se llama a `updateClient` con el `clientId` y un objeto con los campos modificados. El servicio actualiza solo los campos proporcionados y el timestamp `updatedAt`.
*   **Eliminación de Clientes (Cascada)**:
    *   Es la operación más compleja de esta página desde la perspectiva del backend.
    *   Cuando se confirma la eliminación de un cliente, `deleteClient(clientId)` es invocado.
    *   El servicio primero identifica todos los proyectos asociados al cliente.
    *   Luego, para cada uno de esos proyectos, llama a `deleteProject(projectId)`. Como se detalló en la documentación de `proyectos.md`, `deleteProject` a su vez elimina pagos y postventas relacionadas.
    *   Solo después de que todos los proyectos (y sus datos dependientes) han sido eliminados, se elimina el documento del cliente.
    *   Este enfoque manual de cascada asegura que no queden datos huérfanos (proyectos sin cliente, pagos sin proyecto).
*   **Validación en el Modal**:
    *   `ClientModal` realiza una validación simple para asegurar que el campo `name` no esté vacío antes de intentar guardar.

## 6. Consideraciones Importantes de Backend

*   **Reglas de Seguridad de Firestore**:
    *   Para la colección `clients`: Deben permitir `read` (para listar), `create` (para añadir nuevos), `update` (para editar) y `delete` (para eliminar).
    *   Para las colecciones `projects`, `payments`, y `afterSales`: Deben permitir las operaciones de lectura y eliminación que son invocadas durante la cascada de `deleteClient`.
*   **Indexación**:
    *   La consulta principal en `clients` ordena por `name` (`orderBy('name', 'asc')`). Firestore crea índices para campos individuales por defecto. Si se añaden capacidades de búsqueda o filtrado más complejas, podrían necesitarse índices compuestos.
*   **Atomicidad de la Eliminación en Cascada**:
    *   La lógica de eliminación en cascada (eliminar cliente -> eliminar sus proyectos -> eliminar pagos/postventas de esos proyectos) se ejecuta desde el cliente y consiste en múltiples operaciones separadas de Firestore. Esto **no es una operación atómica**. Si una parte de la cascada falla (ej. una regla de seguridad impide eliminar un proyecto específico, o hay un problema de red), la eliminación podría quedar incompleta, dejando algunos datos huérfanos.
    *   **Recomendación para Producción**: Para una integridad de datos robusta, esta lógica de cascada debería implementarse utilizando **Cloud Functions de Firebase**. Un trigger `onDelete` en la colección `clients` podría ejecutar código en el backend para eliminar de forma segura y atómica todos los datos relacionados.
*   **Gestión de Estado con React Query**:
    *   La página utiliza `@tanstack/react-query` (`useQuery`, `useMutation`) para obtener la lista de clientes y para manejar las operaciones de añadir, actualizar y eliminar clientes. Esto gestiona los estados de carga, errores y la invalidación/actualización automática de la lista de clientes después de una mutación exitosa.

## 7. Flujo de Datos (Simplificado para Añadir un Cliente)

1.  Usuario hace clic en "Nuevo Cliente".
2.  Se abre `ClientModal`.
3.  Usuario ingresa datos y hace clic en "Guardar".
4.  `handleSaveClient` en `ClientsPage` llama a `addClientMutation.mutate(clientData)`.
5.  `clientService.ts -> addClient` crea un nuevo documento en la colección `clients` en Firestore.
6.  Al éxito, React Query invalida la caché para `['clients']`.
7.  `useQuery(['clients'])` vuelve a ejecutar `getClients()`, obteniendo la lista actualizada.
8.  La tabla de clientes se renderiza con el nuevo cliente.
