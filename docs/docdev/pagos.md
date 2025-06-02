
# Documentación de Backend: Página de Pagos (`/payments`)

## 1. Propósito Principal

La página de "Pagos" permite a los usuarios visualizar un listado de todos los pagos registrados en el sistema, independientemente del proyecto al que pertenezcan. Ofrece una visión general de las transacciones financieras, mostrando información clave como el cliente asociado, el valor del pago, la fecha y el tipo de pago. También proporciona acciones básicas como la eliminación de un pago.

## 2. Colecciones de Firestore Involucradas

*   **`payments`**:
    *   **Lectura (Principal)**: Se leen todos los documentos de esta colección para poblar la tabla de pagos. La consulta se ordena por `date` (fecha del pago) de forma descendente.
    *   **Eliminación**: Se eliminan documentos de esta colección cuando un usuario confirma la acción de "Eliminar pago".
*   **`projects`**:
    *   **Lectura**: Se leen los documentos de esta colección para obtener el `clientId` asociado a cada pago (a través del `projectId` del pago).
*   **`clients`**:
    *   **Lectura**: Se leen los documentos de esta colección para obtener el nombre del cliente asociado a cada proyecto, y por ende, a cada pago.

## 3. Servicios de Backend Utilizados (ubicados en `src/services/`)

*   **`paymentService.ts`**:
    *   `getAllPayments()`: Función principal invocada para obtener la lista completa de pagos desde Firestore. Internamente, ordena los pagos por la fecha (`date`) de forma descendente.
    *   `deletePayment(paymentId)`: Se invoca al confirmar la eliminación de un pago. Simplemente elimina el documento del pago especificado de la colección `payments`. No implica lógica de cascada desde este servicio, ya que un pago es generalmente una entidad final en una relación.
*   **`projectService.ts`**:
    *   `getProjects()`: Se utiliza para obtener la lista de todos los proyectos. La página de pagos usa esta lista para, a partir del `projectId` de un pago, encontrar el proyecto correspondiente y luego su `clientId`.
*   **`clientService.ts`**:
    *   `getClients()`: Se utiliza para obtener la lista de todos los clientes. Combinado con la información de los proyectos, permite mostrar el nombre del cliente (`clientName`) para cada pago.

## 4. Tipos de Datos Principales (ubicados en `src/types/`)

*   **`Payment` (de `payment.ts`)**: Define la estructura de un objeto de pago. Incluye campos como `id`, `projectId`, `amount`, `date`, `paymentMethod`, `paymentType`, `installments`, `isAdjustment`, `createdAt`, `updatedAt`.
*   **`ProjectType` (de `project.ts`)**: Define la estructura de un proyecto. Se utiliza para obtener el `clientId`.
*   **`Client` (de `client.ts`)**: Define la estructura de un cliente. Se utiliza para obtener el `name` del cliente.
*   **`PaymentDocument` (de `payment.ts`)**: Representa cómo se almacena un pago en Firestore (con fechas como Timestamps).

## 5. Lógica de Negocio Clave (Backend y Datos)

*   **Listado y Enriquecimiento de Datos**:
    *   La página utiliza `useQuery` para obtener pagos, proyectos y clientes de forma independiente.
    *   Una vez que los tres conjuntos de datos están disponibles, un `useMemo` los procesa:
        1.  Se crea un mapa de proyectos (`projectMap`) para buscar rápidamente un proyecto por su ID.
        2.  Se crea un mapa de clientes (`clientMap`) para buscar rápidamente un nombre de cliente por su ID.
        3.  Para cada pago, se usa su `projectId` para encontrar el proyecto en `projectMap`.
        4.  Si se encuentra el proyecto, se usa su `clientId` para encontrar el nombre del cliente en `clientMap`.
        5.  Se construye un objeto `EnrichedPayment` que incluye el `clientName` (y anteriormente el `projectNumber`, que fue eliminado por solicitud).
    *   Este array de `enrichedPayments` es el que se utiliza para renderizar la tabla.
*   **Eliminación de Pagos**:
    *   Al confirmar la eliminación, se invoca `deletePayment(paymentId)`.
    *   El servicio elimina el documento del pago de Firestore.
    *   **Importante**: La eliminación de un pago no afecta directamente el `balance` del proyecto en el modelo de datos actual de forma automática. Si se requiere que al eliminar un pago se reajuste el `balance` de un proyecto, esa lógica necesitaría ser implementada (preferiblemente en el servicio `deletePayment` o mediante una Cloud Function que recalcule el balance del proyecto).
*   **Funcionalidad Placeholder**:
    *   Los botones "Registrar Pago" y la acción "Editar" en el menú desplegable actualmente son placeholders y muestran un toast de "Próximamente". Su implementación futura implicaría la creación de un formulario/modal y la interacción con `addPayment` y `updatePayment` del `paymentService.ts`.

## 6. Consideraciones Importantes de Backend

*   **Reglas de Seguridad de Firestore**:
    *   Para la colección `payments`: Deben permitir `read` (para listar) y `delete` (para eliminar).
    *   Para las colecciones `projects` y `clients`: Deben permitir `read` para el enriquecimiento de datos.
*   **Indexación**:
    *   La consulta principal en `payments` ordena por `date` (`orderBy('date', 'desc')`). Firestore crea índices para campos individuales. Si se añaden filtros (ej. por `projectId` o `paymentType`), podrían necesitarse índices compuestos.
*   **Actualización del Balance del Proyecto**: Actualmente, la creación, edición o eliminación de un pago **no** actualiza automáticamente el campo `balance` en el documento del proyecto asociado. Esta es una pieza de lógica de negocio que necesitaría implementarse por separado si se desea que el `balance` del proyecto refleje dinámicamente los pagos. Las opciones incluyen:
    1.  **Recalcular en el cliente**: Al mostrar un proyecto, calcular el balance sumando sus pagos. Esto puede ser menos eficiente si hay muchos pagos.
    2.  **Actualizar en el servidor (Cloud Functions)**: Usar triggers de Firestore en la colección `payments` para que, cada vez que se cree, actualice o elimine un pago, una Cloud Function recalcule y actualice el `balance` del proyecto correspondiente. Esta es la solución más robusta y recomendada para mantener la consistencia de los datos.
    3.  **Actualizar desde el servicio**: Modificar los servicios `addPayment`, `updatePayment`, `deletePayment` para que también lean el proyecto, recalculen el balance y actualicen el proyecto. Esto añade más operaciones de lectura/escritura a cada transacción de pago.
*   **Consistencia de Datos**: Asegurar que el `projectId` en un pago siempre se refiera a un proyecto existente es crucial. Aunque Firestore no impone claves foráneas, la lógica de la aplicación debe esforzarse por mantener esta consistencia.

## 7. Flujo de Datos (Simplificado)

1.  Componente `PaymentsPage` se monta.
2.  `useQuery` para `['payments']` llama a `getAllPayments()`.
3.  `useQuery` para `['projects']` llama a `getProjects()`.
4.  `useQuery` para `['clients']` llama a `getClients()`.
5.  Los servicios interactúan con Firestore.
6.  Los datos regresan, se combinan en `enrichedPayments`.
7.  La tabla se renderiza.
8.  Usuario elimina un pago:
    *   `deletePaymentMutation.mutate(paymentId)` es invocado.
    *   `paymentService.ts -> deletePayment` elimina el documento en Firestore.
    *   React Query invalida `['payments']` y la vuelve a obtener.
