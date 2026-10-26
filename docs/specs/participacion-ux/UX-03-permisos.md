# UX-03 — Contenido y acciones por capacidad

## Regla

Los perfiles sirven para explicar la experiencia. Las acciones se habilitan con capacidades vigentes del servidor para la subcampaña y las reglas de cada operación. Una persona puede administrar una zona y ser plantador en otra. Ser administrador contextual no otorga rol global ni acceso interno.

## Matriz UX

| Elemento | Plantador | Administrador contextual | ADMIN global |
| --- | --- | --- | --- |
| Encabezado, avance, especies y mapa | Consultar datos autorizados | Consultar datos autorizados | Consultar datos autorizados |
| Registrar inicial | Según capacidad, estado y stock | Según capacidad, estado y stock | Según capacidad, estado y stock |
| Foto, nombre y rol del equipo | Consultar, tras contrato de lectura | Consultar | Consultar |
| Habilitar / retirar plantador | No | Según capacidades | Según capacidades |
| Designar, cambiar, retirar o reemplazar administrador | No | Solo acciones concedidas | Solo acciones concedidas |
| Editar plan de especies | No | No por permiso contextual | Según contrato y estado vigente |
| Asignaciones físicas | No | No por permiso contextual | Acceso al flujo autorizado pendiente de cotejar |
| Eventos, superficie y lotes como indicadores | Ocultos | Ocultos por criterio de diseño inicial | Conservar información existente autorizada |
| Reposición, logística, cierre, cancelación | No por permiso de plantador | No por permiso contextual | Conservar flujos internos autorizados |

Ocultar indicadores al administrador contextual es una propuesta de simplificación, no un cambio en sus permisos ni una decisión expresamente confirmada en la llamada. Si existe además una facultad interna legítima, se conserva por su propia política. GENERAL y VALIDADOR no se reclasifican como ADMIN ni pierden accesos internos existentes por este rediseño.

## Presentación de acciones

- No mostrar acciones administrativas ajenas a la capacidad de la persona.
- Cuando una acción propia no está disponible temporalmente por estado, carga o stock, mostrar explicación precisa.
- Una lista de capacidades fallida o incompleta no equivale a ausencia de permisos.
- El nombre del rol visible no sirve para autorizar llamadas.
- Cambiar subcampaña o cuenta invalida el contexto anterior antes de habilitar acciones nuevas.
- La confirmación de una operación incluye persona, ámbito y consecuencia. Cancelarla no escribe.
- El resultado confirmado no garantiza conservar permisos actuales: reconsultarlos cuando corresponda.

## Aceptación

- UX03-CA01: un plantador no recibe datos internos para luego esconderlos con CSS.
- UX03-CA02: un administrador contextual no obtiene asignaciones, plan editable ni módulos internos por su etiqueta.
- UX03-CA03: la persona que administra A y planta en B ve acciones distintas al cambiar de zona.
- UX03-CA04: abrir una URL directa respeta la misma audiencia que entrar por tarjetas.
- UX03-CA05: una lectura de permisos fallida muestra reintento y no activa acciones por valores recordados.
- UX03-CA06: las facultades internas existentes de otros roles conservan su política y se prueban como regresión.

Referencia: tipos de capacidades y ACCESS_ACTIONS existentes en Participación. No ampliar enums ni inventar nuevas capacidades para resolver presentación.
