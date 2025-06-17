# Propuesta de Nuevas Funcionalidades para Cobralon-FB

## Análisis del Sistema Actual

Este proyecto es una aplicación web desarrollada con Next.js y Firebase/Firestore que gestiona proyectos de instalación de ventanas. El sistema actual permite:

- Gestión de clientes (registro, edición, eliminación)
- Gestión de proyectos (creación, edición, seguimiento de estado, eliminación)
- Gestión de pagos (registro de pagos, manejo de pagos a plazos/cuotas)
- Seguimiento post-venta (registro y gestión de incidencias)
- Cálculo de montos pendientes, balances y porcentajes de pago

## Nuevas Funcionalidades Propuestas

### 1. Programación y Gestión de Visitas Técnicas

**Nombre de la Función:** Calendario de Visitas Técnicas

**Descripción:** Implementar un sistema de programación de visitas técnicas para instalación y servicio post-venta. Permitirá agendar, reprogramar y dar seguimiento a visitas con un calendario visual. Las visitas se sincronizarán en tiempo real con todos los dispositivos gracias a la funcionalidad de Firestore y se enviarán notificaciones automáticas a los técnicos.

**Justificación:** Actualmente el sistema no cuenta con una manera estructurada de gestionar las visitas técnicas. Esta función optimizará la planificación operativa, reducirá tiempos muertos entre instalaciones y mejorará la comunicación con los clientes al poder confirmarles fechas exactas de servicio.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/visitService.ts`, `src/types/visit.ts`, `src/app/visits/page.tsx`
- Modificados: `src/app/projects/page.tsx`, `src/app/aftersales/page.tsx`

### 2. Sistema de Notificaciones en Tiempo Real

**Nombre de la Función:** Notificaciones y Alertas Inteligentes

**Descripción:** Implementar un sistema de notificaciones en tiempo real aprovechando Firestore. Generará alertas para pagos próximos a vencer, cuotas pendientes, visitas programadas para el día siguiente, cambios en el estado de proyectos y recordatorios de seguimiento post-venta. Las notificaciones aparecerán en la interfaz y, opcionalmente, podrán enviarse por correo electrónico.

**Justificación:** El sistema actual requiere una revisión manual de los estados y fechas importantes. Un sistema de notificaciones automatizado permitirá anticipar situaciones críticas, reducir la morosidad en pagos y mejorar significativamente la experiencia de usuario al mantener informados a todos los actores relevantes.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/notificationService.ts`, `src/types/notification.ts`, `src/components/notification-center.tsx`
- Modificados: `src/components/ui/layout.tsx`, `src/services/paymentService.ts`

### 3. Dashboard Analítico con KPIs

**Nombre de la Función:** Dashboard Analítico Integral

**Descripción:** Implementar un dashboard de análisis con indicadores clave de rendimiento que muestre métricas como: ingresos mensuales/anuales, proyectos por estado, tasa de conversión de presupuestos, tiempo promedio de instalación, métricas de satisfacción post-venta, y proyección de ingresos basada en cuotas pendientes. Se utilizarán gráficas interactivas que permitan filtrar por períodos.

**Justificación:** Actualmente el sistema carece de una visión consolidada del rendimiento del negocio. Un dashboard analítico permitiría tomar decisiones estratégicas basadas en datos, identificar tendencias, anticipar flujos de caja y optimizar recursos operativos.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/analyticsService.ts`, `src/app/dashboard/page.tsx`, `src/components/charts/`
- Modificados: `src/app/page.tsx`

### 4. Generación de Presupuestos y Documentos

**Nombre de la Función:** Sistema de Presupuestos y Documentos

**Descripción:** Implementar un sistema completo para crear, editar y gestionar presupuestos antes de que se conviertan en proyectos. Incluirá plantillas personalizables, cálculo automático de materiales y costos, firma digital del cliente, y generación de PDFs. Además, permitirá exportar reportes de estados de cuenta, facturas y comprobantes de pago.

**Justificación:** El sistema actual se enfoca en proyectos ya confirmados, pero no gestiona la fase previa de cotización. Esta funcionalidad ayudaría a profesionalizar la imagen de la empresa, estandarizar los presupuestos, mejorar el seguimiento de oportunidades comerciales y facilitar la conversión de presupuestos a proyectos con un simple clic.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/quoteService.ts`, `src/types/quote.ts`, `src/app/quotes/page.tsx`, `src/lib/pdf-generator.ts`
- Modificados: `src/types/project.ts`, `src/services/projectService.ts`

### 5. Catálogo de Productos y Materiales

**Nombre de la Función:** Gestión de Catálogo y Stock

**Descripción:** Crear un catálogo digital de productos, materiales y servicios que se utilizan en los proyectos. Incluirá imágenes, especificaciones técnicas, precios, proveedores y gestión básica de inventario. Al crear presupuestos o proyectos, se podrán seleccionar ítems del catálogo, calculando automáticamente costos y tiempos estimados de instalación.

**Justificación:** Actualmente, la información sobre los tipos de ventanas y materiales utilizados no está estandarizada en el sistema. Un catálogo estructurado mejoraría la exactitud de los presupuestos, reduciría errores de cálculo, facilitaría el seguimiento del stock y proporcionaría información visual valiosa para los clientes.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/catalogService.ts`, `src/types/product.ts`, `src/app/catalog/page.tsx`
- Modificados: `src/services/projectService.ts`, `src/types/project.ts`

### 6. Aplicación Móvil para Técnicos de Campo

**Nombre de la Función:** App Móvil para Técnicos

**Descripción:** Desarrollar una aplicación móvil progresiva (PWA) para técnicos de campo que les permita acceder a su calendario de visitas, detalles de instalación, formularios de registro de trabajo completado, firma del cliente, y carga de fotos del antes/después. La app funcionará offline con sincronización automática cuando se recupere la conexión, utilizando las capacidades offline de Firestore.

**Justificación:** La implementación móvil optimizaría enormemente el trabajo de campo, eliminando papeleos, reduciendo errores de comunicación y permitiendo documentar fotográficamente las instalaciones. El funcionamiento offline es crucial para zonas con cobertura limitada mientras los técnicos están en obra.

**Posibles Archivos Afectados:**
- Nuevos: Estructura PWA en carpeta `src/app/mobile/`
- Modificados: `src/services/visitService.ts`, `src/services/projectService.ts`, `next.config.ts`

### 7. Sistema de Comentarios y Comunicación Interna

**Nombre de la Función:** Comunicación Integrada por Proyecto

**Descripción:** Implementar un sistema de comentarios y comunicación interna asociado a cada proyecto, permitiendo a los diferentes departamentos (ventas, instalación, administración, post-venta) compartir notas, instrucciones específicas y actualizaciones en tiempo real. Incluirá menciones a usuarios, notificaciones y adjuntos básicos.

**Justificación:** Actualmente la comunicación entre equipos sobre un proyecto específico probablemente ocurre fuera del sistema, lo que puede llevar a pérdida de información crítica. Centralizar estas comunicaciones en la plataforma mejoraría la coordinación interdepartamental, crearía un registro histórico valioso y reduciría errores por malentendidos.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/commentService.ts`, `src/types/comment.ts`, `src/components/project-comments.tsx`
- Modificados: `src/app/projects/[id]/page.tsx`

### 8. Portal de Clientes

**Nombre de la Función:** Portal de Acceso para Clientes

**Descripción:** Crear un portal de acceso restringido para clientes donde puedan ver el estado de sus proyectos, historial de pagos, próximas cuotas, programar visitas post-venta y descargar documentación relevante. Implementará autenticación segura mediante Firebase Auth y permisos limitados a sus propios proyectos.

**Justificación:** Un portal de clientes reduce significativamente la carga operativa al permitir que los clientes accedan a información básica sin necesidad de contactar al personal. Mejora la experiencia de cliente, proyecta una imagen más profesional y moderna, y permite un seguimiento más transparente de los proyectos y pagos.

**Posibles Archivos Afectados:**
- Nuevos: `src/app/cliente/`, `src/services/clientPortalService.ts`, `src/lib/auth/client-auth.ts`
- Modificados: `src/lib/firebase/client.ts`

### 9. Integración con Proveedores

**Nombre de la Función:** Sistema de Pedidos a Proveedores

**Descripción:** Implementar un sistema para gestionar los pedidos a proveedores de materiales y ventanas. Permitirá generar órdenes de compra basadas en los proyectos aprobados, seguimiento de estado del pedido, notificaciones de llegada estimada y registro de facturas asociadas. Se integraría con el catálogo de productos para mantener actualizada la información de stock.

**Justificación:** Actualmente, la gestión con proveedores probablemente se realiza fuera del sistema. Integrando esta funcionalidad, se obtendrá una visión completa del ciclo de negocio, se mejorarán los tiempos de entrega al cliente final, y se facilitará la planificación financiera al tener registro de compromisos de pago con proveedores.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/supplierService.ts`, `src/types/supplier.ts`, `src/app/suppliers/page.tsx`
- Modificados: `src/services/projectService.ts`

### 10. Métricas de Satisfacción y Feedback

**Nombre de la Función:** Sistema de Encuestas y Feedback

**Descripción:** Desarrollar un sistema automatizado para enviar encuestas de satisfacción a clientes después de la instalación y posterior al servicio post-venta. Las encuestas se enviarán por correo electrónico con un enlace único, y las respuestas se registrarán automáticamente en Firestore. Incluirá métricas como NPS (Net Promoter Score) y análisis de sentimiento.

**Justificación:** La satisfacción del cliente es crucial para el crecimiento del negocio mediante recomendaciones. Esta función permitiría identificar áreas de mejora en el servicio, resaltar equipos o técnicos con mejor desempeño, y generar testimonios positivos que pueden utilizarse en marketing.

**Posibles Archivos Afectados:**
- Nuevos: `src/services/feedbackService.ts`, `src/types/feedback.ts`, `src/app/feedback/page.tsx`
- Modificados: `src/services/projectService.ts`, `src/app/dashboard/page.tsx`
