# Specs UX — Participar y subcampaña

Fecha: 24 de octubre de 2026. Alcance: especificación frontend. UX-01 y restauración del detalle común implementadas localmente; aceptación visual autenticada y contratos faltantes pendientes.

## Objetivo

**Inicio → Subcampaña → Consultar, registrar o gestionar → Misma subcampaña.**

Participar permite elegir dónde trabajar. El detalle concentra contexto y acciones. La campaña agrupa; la subcampaña es el ámbito operativo. La experiencia tiene una estructura compartida y acciones según capacidades vigentes.

## Acuerdos confirmados

- Tarjetas de subcampañas agrupadas por campaña.
- Alternativa de mapa a pantalla completa desde la que también se entra a una subcampaña.
- Conservar el encabezado del detalle: foto, fechas, estado y avance; pestañas Resumen, Equipo y Mapa.
- «Especies de plantas» reemplaza «Mix de especies».
- El plantador no ve indicadores administrativos de eventos, superficie ni lotes asignados.
- Gestionar equipo es otorgar o retirar permisos de participación, incluidos administradores según las capacidades existentes.
- Los plantadores ven foto, nombre y rol del equipo, sin contacto.
- Guardar un registro devuelve a la misma subcampaña conservando filtros y contexto. Se conservan borradores pendientes; un confirmado no vuelve a ser un borrador reenviable.

## Documentos

| Spec | Resultado | Situación |
| --- | --- | --- |
| [UX-01 · Inicio](UX-01-inicio.md) | Tarjetas y mapa para entrar a una zona | Inicio implementado y verificado localmente; geometría no pública sigue en B02 |
| [UX-02 · Detalle](UX-02-detalle.md) | Contexto común y acciones comprensibles | Composición original restaurada; límites de contrato explícitos |
| [UX-03 · Permisos](UX-03-permisos.md) | Matriz de contenido y acciones | Definida sobre capacidades existentes |
| [UX-04 · Equipo](UX-04-equipo.md) | Consulta y gestión de participación | Lectura para plantador y fotos requieren contrato |
| [UX-05 · Continuidad](UX-05-continuidad.md) | Registro, regreso y recuperación | Definida; adaptar destinos de navegación |
| [Dependencias y entrega](DEPENDENCIAS_Y_ENTREGA.md) | Contratos, secuencia y validación | Pendientes explícitos, sin endpoints inventados |

Cada spec distingue acuerdos del usuario de **criterios de diseño adoptados** para concretar detalles no discutidos. Estos últimos son propuestas reversibles; no se presentan como confirmaciones del usuario. Los IDs UX son locales a este paquete, no reemplazan los IDs oficiales de Participación Aliada.

## Límites

No cambia stock, plan, evidencia obligatoria, atomicidad, roles globales ni reglas de Vivero/Recolección. No rediseña el asistente de captura. No agrega autoinscripción, invitaciones por correo, sincronización offline ni edición de eventos. Impacto continúa público y separado de los datos privados.

## Referencias

- [Notas y acuerdos de la llamada](../../PLAN_UX_PARTICIPAR_SUBCAMPANIA.md).
- [Guía frontend](../../../FRONTEND_GUIDE.md) y [dominio](../../../DOMAIN_INDEX.md).
- [Participación](../../../src/modules/participacion/README.md) e [Impacto](../../../src/modules/impacto/README.md).

La entrega documental no acredita QA visual, APIs desplegadas ni cambios implementados.

Implementación UX-01 y límites: [informe local](../../QA_PARTICIPACION_UX01.md). El detalle ahora comparte ruta y diseño original: [restauración y verificación](../../QA_RESTAURACION_DETALLE_SUBCAMPANIA.md). B01–B03 no se consideran cerrados.
