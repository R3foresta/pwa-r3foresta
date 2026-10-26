# UX-02 — Detalle compartido de subcampaña

## Propósito y acuerdos

La subcampaña es el lugar para entender qué se ha plantado, consultar su equipo y registrar. Conservar como referencia el encabezado de la pantalla interna actual y las pestañas Resumen, Equipo y Mapa. Las acciones cambian según capacidades, no la identidad visual de la pantalla.

## Jerarquía móvil

1. Regreso al inicio, campaña y nombre de la subcampaña.
2. Foto disponible, estado, fechas y avance con las etiquetas existentes.
3. Pestañas Resumen / Equipo / Mapa con el diseño redondo original.
4. «Registrar plantación» al comienzo de Resumen cuando esté autorizado; indisponibilidad por stock o estado con explicación contextual.
5. Contenido y acciones autorizadas de cada pestaña.

No agregar un cuarto panel completo de administración al inicio. Las herramientas administrativas se ubican en sus secciones; el control de asignaciones es exclusivo del acceso interno que corresponda.

## Resumen

- Avance con plantación inicial y meta claramente diferenciadas. Si supera la meta, mostrar el porcentaje real; solo limitar visualmente la barra.
- **Especies de plantas** como título. No renombrar campos API.
- Criterio adoptado: nombres de especies y metas disponibles; disponibilidad para registrar en un bloque separado «Disponibles para registrar», consultado únicamente con autoridad. Cantidades plantadas por especie solo si existe ese dato explícito; nunca derivarlas restando stock a meta.
- Criterio adoptado: historial dentro de Resumen, con fecha, cantidad colectiva, especies y acceso al detalle según proyección autorizada. Los participantes históricos no sustituyen el equipo actual. No atribuir el total grupal a cada integrante.
- Indicadores administrativos según [UX-03](UX-03-permisos.md).

## Mapa

Reutilizar el mapa de Participar como base y abrirlo centrado en la subcampaña actual. Mostrar polígono y plantaciones disponibles de ese ámbito. Al seleccionar un registro, presentar su resumen y acceso al detalle público cuando sea elegible. Al volver, conservar zona y selección si todavía existen.

Criterio adoptado: el mapa del detalle se limita a esta subcampaña. Explorar toda la campaña permanece como enlace independiente a Impacto; no cambia silenciosamente la zona donde se registra.

## Estados y mensajes

- Se conserva la imagen decorativa del encabezado interno original; no se presenta como evidencia ni fotografía de la zona. No inventar fotos de miembros.
- Sin plantaciones: «Todavía no hay plantaciones registradas» solo si la lectura lo confirma.
- Datos públicos ausentes en un ámbito administrable: usar lecturas privadas autorizadas disponibles; no confundir ausencia pública con inexistencia.
- Error de stock: «No pudimos comprobar la disponibilidad» con reintento; nunca mostrar stock cero por error.
- Sin stock confirmado: explicar que no se puede iniciar un registro y permitir consultar la subcampaña.
- Error de mapa o equipo: error local de sección; el resto sigue utilizable según sus lecturas verificadas.
- Recurso no disponible o acceso retirado: explicar la limitación, ofrecer regreso e historial propio permitido.

## Aceptación

- UX02-CA01: los tres perfiles reconocen el mismo encabezado y las tres pestañas.
- UX02-CA02: el plantador encuentra la acción de registro antes de indicadores secundarios.
- UX02-CA03: se usa «Especies de plantas» y se distinguen meta, plantado y disponible.
- UX02-CA04: el mapa no muestra registros de otra zona como si pertenecieran a la seleccionada.
- UX02-CA05: fallo de una sección no convierte toda la pantalla en vacía.
- UX02-CA06: ocultar el contador Eventos no oculta el acceso al historial autorizado.
- UX02-CA07: compartir utiliza la ruta pública correspondiente; no comparte stock, equipo ni comprobantes privados.

## Acceso y composición

Corrección confirmada por el usuario el 25 de octubre: conservar la estructura original de `/app/planting/subcampanias/:id` y utilizar esa misma URL para voluntarios. El ID 99 es una referencia visual, no un destino fijo. Retirar el detalle separado de Participar; mantener allí el inicio de tarjetas/mapa.

Implementado localmente mediante `SubcampaniaDetailRoute`: roles internos mantienen su pantalla; participantes montan su composición solo tras validar capacidades completas, actor y ámbito. Encabezado, pestañas y tarjeta de especies compartidos conservan el estilo original. El guard permite solo el patrón exacto de detalle; no se amplía todo Plantación ni se cargan datos internos para ocultarlos después.

Pendientes de contrato: equipo legible por plantador, fechas y fotos por audiencia, resumen/geometría de ámbitos no públicos sin contexto autorizado. Se muestran limitaciones explícitas. Ver [verificación de la restauración](../../QA_RESTAURACION_DETALLE_SUBCAMPANIA.md).
