
# Documentación de Backend: Página de Configuración (`/settings`)

## 1. Propósito Principal

La página de "Configuración" permite a los usuarios personalizar aspectos de la aplicación y gestionar datos a un nivel más global. Actualmente, se divide en dos pestañas principales: "General" para configuraciones de apariencia y "Datos" para operaciones de importación de datos.

## 2. Pestaña: General

### 2.1. Propósito

Permite al usuario cambiar el tema visual de la aplicación (Claro, Oscuro, Sistema).

### 2.2. Colecciones de Firestore Involucradas

*   Actualmente, **ninguna** colección de Firestore está directamente involucrada para la funcionalidad de cambio de tema, ya que esta preferencia se gestiona y persiste en el lado del cliente (usualmente a través de `localStorage` por la librería `next-themes`).

### 2.3. Servicios de Backend Utilizados

*   No se utilizan servicios de backend personalizados (de `src/services/`) para la funcionalidad de cambio de tema. La lógica es manejada por `next-themes`.

### 2.4. Lógica de Negocio Clave (Backend y Datos)

*   La selección del tema es una funcionalidad del frontend. `next-themes` se encarga de:
    *   Aplicar las clases CSS correspondientes al elemento `<html>` (ej. `class="dark"`).
    *   Persistir la preferencia del usuario (generalmente en `localStorage`).
*   El archivo `src/app/globals.css` contiene las variables CSS HSL para los temas claro y oscuro que se aplican según la clase en el elemento `<html>`.

### 2.5. Consideraciones Importantes de Backend

*   Aunque el cambio de tema es frontend, si en el futuro se deseara persistir esta preferencia por usuario en la base de datos (para sincronizar entre dispositivos, por ejemplo), se necesitaría:
    *   Una colección de Firestore para perfiles de usuario o configuraciones de usuario.
    *   Un servicio para actualizar esta preferencia en Firestore.
    *   Lógica de autenticación para identificar al usuario.

## 3. Pestaña: Datos

### 3.1. Propósito

Permite a los usuarios importar datos masivos de Clientes, Proyectos y Pagos a la aplicación utilizando archivos en formato JSON.

### 3.2. Colecciones de Firestore Involucradas

*   **`clients`**:
    *   **Escritura**: Se añaden nuevos documentos (o se actualizan si se proporciona un ID existente en el JSON) al importar datos de clientes.
*   **`projects`**:
    *   **Escritura**: Se añaden nuevos documentos (o se actualizan) al importar datos de proyectos.
*   **`payments`**:
    *   **Escritura**: Se añaden nuevos documentos (o se actualizan) al importar datos de pagos.

### 3.3. Servicios de Backend Utilizados (de `src/services/`)

*   **`clientService.ts`**:
    *   `addClient(clientData: ClientImportData)`: Se invoca para cada objeto de cliente válido en el archivo JSON de clientes. Maneja la creación con ID provisto o auto-generado y la conversión de `createdAt` si existe.
*   **`projectService.ts`**:
    *   `addProject(projectData: ProjectImportData)`: Se invoca para cada objeto de proyecto válido. Similar a `addClient`, maneja ID provisto/auto-generado, conversión de fechas, y cálculo de `total` y `balance`.
*   **`paymentService.ts`**:
    *   `addPayment(paymentData: PaymentImportData)`: Se invoca para cada objeto de pago válido. Maneja ID provisto/auto-generado y conversión de fechas.

### 3.4. Tipos de Datos Principales (de `src/types/`)

*   **`ClientImportData` (de `client.ts`)**: Define la estructura esperada para cada objeto cliente en el JSON de importación.
*   **`ProjectImportData` (de `project.ts`)**: Define la estructura esperada para cada objeto proyecto en el JSON de importación.
*   **`PaymentImportData` (de `payment.ts`)**: Define la estructura esperada para cada objeto pago en el JSON de importación.

### 3.5. Lógica de Negocio Clave (Backend y Datos) - Importación

La lógica es similar para la importación de Clientes, Proyectos y Pagos, y se encuentra en las funciones `handleImportClients`, `handleImportProjects`, y `handleImportPayments` dentro de `src/app/settings/page.tsx`:

1.  **Selección de Archivo**: El usuario selecciona un archivo JSON usando el componente `FileDndInput`.
2.  **Lectura del Archivo**: El contenido del archivo se lee como texto.
3.  **Parseo JSON**: Se intenta parsear el texto a un objeto JavaScript. Se valida que la estructura raíz sea un array (`JSON.parse(fileContent)`).
4.  **Filtrado Preliminar**: Se filtran elementos del array que no sean objetos válidos o que sean objetos completamente vacíos. Estos se cuentan como errores.
5.  **Procesamiento Individual (Iteración sobre el Array)**:
    *   Para cada objeto del array JSON:
        *   **Validación de Campos Obligatorios**: Se verifica que todos los campos marcados como requeridos en la documentación (y en la lógica de la función de importación) estén presentes y tengan un formato básico aceptable (ej. no vacíos para strings, números válidos, booleanos, formato de fecha correcto).
        *   **Conversión de Tipos**:
            *   Las fechas (ej. `date`, `createdAt`) se convierten de strings (YYYY-MM-DD o ISO 8601) a objetos `Date` de JavaScript. Se manejan errores si el formato es inválido.
            *   Los valores numéricos se convierten usando `Number()`.
            *   Los valores booleanos se verifican.
            *   Los arrays (como `uninstallTypes` en proyectos) se validan para que sean arrays de strings.
        *   **Construcción del Payload**: Se crea un objeto del tipo `ClientImportData`, `ProjectImportData`, o `PaymentImportData` con los datos validados y convertidos.
        *   **Llamada al Servicio**: Se invoca la función de servicio correspondiente (`addClient`, `addProject`, `addPayment`) con el payload. Estas funciones de servicio son responsables de la interacción final con Firestore, incluyendo la creación/actualización del documento y el manejo de Timestamps de Firestore.
    *   Si la validación de un ítem falla antes de llamar al servicio, se lanza un error.
6.  **Manejo de Promesas**: Se utiliza `Promise.allSettled` para ejecutar todas las operaciones de guardado (una por cada ítem válido en el JSON) de forma concurrente y esperar a que todas terminen, ya sea con éxito o con error.
7.  **Feedback al Usuario**:
    *   Se cuentan los éxitos y errores.
    *   Se muestra una notificación (toast) resumiendo el resultado de la importación, incluyendo mensajes de error específicos si los hubo.
    *   El input del archivo se resetea.

### 3.6. Consideraciones Importantes de Backend - Importación

*   **Reglas de Seguridad de Firestore**: Las reglas deben permitir la operación `create` (y `update` si se permite la sobreescritura por ID) en las colecciones `clients`, `projects`, y `payments` para que la importación funcione.
*   **Validación de Datos de Entrada**: La validación actual en `settings/page.tsx` es básica. Para escenarios de producción o archivos JSON de fuentes menos confiables:
    *   Se podría usar una librería de validación de esquemas más robusta (como Zod, que ya se usa en los formularios) para validar la estructura de cada objeto JSON antes de procesarlo.
    *   Se debería considerar la validación de la existencia de IDs referenciados (ej. `clientId` en proyectos debe existir en la colección `clients`; `projectId` en pagos debe existir en `projects`). Esta validación es más compleja y podría requerir lecturas adicionales a Firestore durante la importación o realizarse como un paso de post-procesamiento. Actualmente, si se proporciona un `clientId` inválido, el proyecto se guardará, pero la referencia estará rota.
*   **Manejo de Grandes Volúmenes de Datos**: La importación actual procesa todo en el cliente. Para archivos JSON muy grandes (miles de registros):
    *   El navegador podría quedarse sin memoria o volverse muy lento.
    *   Podrían excederse los límites de escritura de Firestore si se realizan demasiadas operaciones en poco tiempo.
    *   **Recomendación**: Para importaciones masivas, es mucho más robusto y escalable utilizar **Cloud Functions de Firebase**. Se podría subir el archivo JSON a Firebase Storage y luego un trigger de Cloud Function procesaría el archivo en el backend, manejando lotes, reintentos y validaciones complejas de forma más eficiente.
*   **IDs Duplicados y Actualizaciones**:
    *   La lógica actual (`addClient`, `addProject`, `addPayment`) utiliza `setDoc` si se proporciona un `id` en el objeto JSON. Esto significa que si un documento con ese ID ya existe, **será sobrescrito**. Si se omite el `id` en el JSON, `addDoc` generará un nuevo ID único. Este comportamiento debe ser claro para el usuario.
*   **Transaccionalidad**: La importación de múltiples registros no es una operación atómica. Si algunos registros se importan con éxito y otros fallan, la base de datos quedará en un estado parcialmente actualizado. No hay un "rollback" automático para los registros ya guardados si uno posterior falla.

## 7. Esquemas JSON de Ejemplo para Importación

En la propia página de configuración, al lado de cada sección de importación, hay un icono de ayuda (`?`) que abre un modal mostrando el esquema JSON esperado y los campos requeridos/opcionales para `clients`, `projects`, y `payments`. Es fundamental que los archivos JSON del usuario se adhieran a estos esquemas.
