
# Documentación: Relaciones entre Páginas y Datos (Backend)

Este documento describe cómo las principales entidades de datos (Clientes, Proyectos, Pagos, Postventas) se relacionan entre sí y cómo estas relaciones se reflejan en las interacciones de backend y la estructura de datos en Firestore.

## 1. Entidades Principales y Colecciones de Firestore

La aplicación gestiona principalmente cuatro tipos de datos, cada uno almacenado en su propia colección en Firestore:

*   **Clientes**: Colección `clients`
*   **Proyectos**: Colección `projects`
*   **Pagos**: Colección `payments`
*   **Postventas**: Colección `afterSales` (anteriormente llamada "postventas" en la solicitud inicial)

## 2. Relaciones Clave entre Entidades

Estas entidades no existen de forma aislada; están interconectadas para representar el flujo de trabajo del negocio. Firestore, al ser una base de datos NoSQL, no impone restricciones de clave externa como las bases de datos SQL. En su lugar, estas relaciones se modelan almacenando los IDs de los documentos relacionados como campos dentro de otros documentos.

### 2.1. Clientes y Proyectos

*   **Relación**: Un (1) Cliente puede tener muchos (N) Proyectos. Un Proyecto pertenece a un (1) solo Cliente.
*   **Implementación en Firestore**:
    *   Cada documento en la colección `projects` contiene un campo `clientId` (de tipo `string`).
    *   El valor de `clientId` es el ID único del documento correspondiente en la colección `clients`.
*   **Implicaciones para el Backend y los Servicios**:
    *   **Al crear un Proyecto**: Se debe proporcionar un `clientId` válido. El formulario de "Nuevo Proyecto" incluye un selector para buscar y asignar un cliente existente.
    *   **Al visualizar Proyectos**: Para mostrar el nombre del cliente junto a un proyecto, la aplicación primero obtiene el proyecto (con su `clientId`) y luego realiza una búsqueda (o utiliza datos ya cargados) en la colección `clients` para encontrar el documento del cliente con ese `clientId` y extraer su nombre. Esto se ve en la página de listado de proyectos.
    *   **Al eliminar un Cliente (`clientService.ts -> deleteClient`)**: Se implementa una lógica de eliminación en cascada. Antes de eliminar el documento del cliente, el servicio busca todos los proyectos donde `clientId` coincida con el ID del cliente a eliminar. Luego, invoca `projectService.ts -> deleteProject` para cada uno de estos proyectos (que a su vez eliminará pagos y postventas asociados a esos proyectos).

### 2.2. Proyectos y Pagos

*   **Relación**: Un (1) Proyecto puede tener muchos (N) Pagos. Un Pago pertenece a un (1) solo Proyecto.
*   **Implementación en Firestore**:
    *   Cada documento en la colección `payments` contiene un campo `projectId` (de tipo `string`).
    *   El valor de `projectId` es el ID único del documento correspondiente en la colección `projects`.
*   **Implicaciones para el Backend y los Servicios**:
    *   **Al crear un Pago**: Se debe proporcionar un `projectId` válido. (La UI para esto está marcada como "Próximamente", pero el servicio `paymentService.ts -> addPayment` espera un `projectId`).
    *   **Al visualizar Pagos**: Para mostrar información del proyecto junto a un pago (como el número de proyecto o el cliente del proyecto), la aplicación necesita usar el `projectId` del pago para buscar el documento del proyecto correspondiente. Esto se ve en la página de "Pagos" donde se muestra el nombre del cliente (obtenido a través del proyecto).
    *   **Al eliminar un Proyecto (`projectService.ts -> deleteProject`)**: Se implementa una lógica de eliminación en cascada. Antes de eliminar el documento del proyecto, el servicio busca y elimina todos los pagos donde `projectId` coincida con el ID del proyecto a eliminar. Esto se realiza usando `paymentService.ts -> deletePaymentsForProject`.

### 2.3. Proyectos y Postventas

*   **Relación**: Un (1) Proyecto puede tener muchos (N) registros de Postventa. Un registro de Postventa pertenece a un (1) solo Proyecto.
*   **Implementación en Firestore**:
    *   Cada documento en la colección `afterSales` contiene un campo `projectId` (de tipo `string`).
    *   El valor de `projectId` es el ID único del documento correspondiente en la colección `projects`.
*   **Implicaciones para el Backend y los Servicios**:
    *   **Al crear un registro de Postventa**: Se debe proporcionar un `projectId` válido. (La UI para la gestión de postventas aún no está desarrollada, pero el servicio `afterSalesService.ts -> addAfterSales` esperaría un `projectId`).
    *   **Al visualizar Postventas**: Para contextualizar un registro de postventa, se usaría su `projectId` para obtener detalles del proyecto asociado.
    *   **Al eliminar un Proyecto (`projectService.ts -> deleteProject`)**: Similar a los pagos, antes de eliminar el documento del proyecto, el servicio busca y elimina todos los registros de postventa donde `projectId` coincida. Esto se realiza usando `afterSalesService.ts -> deleteAfterSalesForProject`.

## 3. Diagrama Conceptual de Relaciones

```
[ Clients ] --1:N-- [ Projects ] --1:N-- [ Payments ]
                       |
                       `--1:N-- [ AfterSales ]
```

*   `1:N` significa "uno a muchos".
*   El campo `clientId` en `Projects` enlaza con `Clients`.
*   El campo `projectId` en `Payments` y `AfterSales` enlaza con `Projects`.

## 4. Integridad Referencial y Consideraciones

*   **No hay Restricciones Forzadas por Firestore**: A diferencia de SQL, Firestore no impide activamente que se cree un proyecto con un `clientId` que no existe, o un pago con un `projectId` inexistente. La responsabilidad de mantener la integridad referencial recae en la lógica de la aplicación (frontend y backend/servicios).
*   **Eliminación en Cascada Manual**: Como se ha detallado, la eliminación en cascada (ej. eliminar un cliente y que se eliminen sus proyectos, pagos, etc.) se ha implementado en los servicios del lado del cliente (`clientService.ts`, `projectService.ts`).
    *   **Desafío**: Estas operaciones no son atómicas si se ejecutan desde el cliente. Si una parte de la cascada falla, los datos pueden quedar en un estado inconsistente.
    *   **Solución Recomendada para Producción**: Utilizar **Cloud Functions de Firebase** con triggers (ej. `onDelete` para la colección `clients`) para manejar las eliminaciones en cascada de forma más robusta, atómica y segura en el entorno del servidor.
*   **Obtención de Datos Relacionados (Joins)**: Firestore no realiza "joins" del lado del servidor como SQL. Para obtener datos relacionados (ej. nombre del cliente para un proyecto), la aplicación realiza múltiples consultas: una para obtener el proyecto (que contiene `clientId`) y otra para obtener el cliente usando ese `clientId`. Librerías como React Query ayudan a gestionar estas operaciones asíncronas y el estado de los datos.

## 5. Impacto en las Páginas de la Aplicación

*   **Página de Clientes (`/clients`)**:
    *   Lista clientes.
    *   Al eliminar un cliente, se activa la cascada para eliminar sus proyectos, pagos y postventas.
*   **Página de Proyectos (`/projects`)**:
    *   Lista proyectos y muestra el nombre del cliente asociado (requiere leer de `clients`).
    *   Al eliminar un proyecto, se activa la cascada para eliminar sus pagos y postventas.
*   **Página de Pagos (`/payments`)**:
    *   Lista pagos y muestra el nombre del cliente asociado al proyecto del pago (requiere leer de `projects` y luego de `clients`).
*   **Páginas de Creación/Edición (ej. `/projects/new`, `/projects/[id]/edit`)**:
    *   Deben permitir la selección de entidades relacionadas (ej. seleccionar un cliente para un nuevo proyecto).
*   **Página de Configuración (`/settings` - pestaña "Datos")**:
    *   La importación de datos debe respetar estas relaciones. Por ejemplo, al importar proyectos, los `clientId` en el JSON deben corresponder a clientes existentes para que los datos sean significativos, aunque la importación actual no valida la existencia de estos IDs foráneos antes de escribir.

Comprender estas relaciones es fundamental para desarrollar nuevas funcionalidades, asegurar la consistencia de los datos y diseñar reglas de seguridad efectivas en Firestore.
