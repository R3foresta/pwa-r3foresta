# T5 · iteración 1 · lecturas de Vivero

Entrega local del 15 de noviembre de 2026, sobre frontend `0007ee0` y contratos backend leídos en `69545ed`. Sin commit, push, despliegue, cambios backend/Supabase/env, instalación de dependencias ni movimientos nuevos. Sólo esta iteración; el alta y M3 se revisarán por separado.

## Comportamiento implementado

- Origen discriminado desde DTO: Recolección o incorporación, con modalidad/procedencia. Sin prefijos como fuente de negocio, REC-null/0, material ficticio o Embolsado atribuido a T5.
- Snapshots de nombre, variedad y responsable inicial primero; una ausencia histórica no se completa con catálogo/cuenta actuales. El nombre de otros eventos se identifica como nombre consultado porque el backend no entrega snapshot.
- Cantidad inicial fija separada del saldo físico actual del servidor. INICIO mantiene saldo vivo no disponible. No hay supervivencia calculada, suma de despachos como plantas vivas ni certificación de aptitud.
- IDs BIGINT exactos en mappers, rutas de consulta/eventos/compatibilidad, evidencias y asignaciones. Rechazo de números JSON inseguros. El selector de subcampaña y su petición por campaña mantienen cadenas sin convertir a Number. Se corrigieron los nombres de los DTO de respuesta de asignación/devolución al contrato real.
- Nueve eventos, incluyendo INCORPORACION y DEVOLUCION_PLANTACION. Fallback visible para tipos futuros; filtros visuales sin eliminar hechos. Seguimientos reales de adaptabilidad, con saltos/repeticiones y sin inferir SOMBRA/duraciones/cierre por despacho parcial.
- Lectura independiente de ficha e historial: carga, vacío y error diferenciados; reintento del historial sin perder ficha. Respuestas obsoletas descartadas por lote/cuenta/token/permiso. Lecturas Bearer y no-store.
- Fotos privadas con signed_url/TTL sólo en memoria y renovación desde timeline autorizado. Preview, metadatos disponibles, error/expiración por foto. No URL pública construida ni API genérica de evidencia para T5. La descarga existente se etiqueta como metadatos, no como exportación completa.
- El comando INICIO conserva unidad obligatoria y cantidad canónica. Sus formularios comprueban los nulos de lectura antes de escribir. Las acciones posteriores de un incorporado usan su base viva real para elegibilidad UX y piso de fecha; backend sigue siendo autoridad.

## Verificación local

Runtime: Node `v24.19.0`, npm del lockfile existente. No existe script typecheck separado; build incluye `tsc -b`.

- Focal: `npm run test -- src/modules/vivero src/api/lotes-vivero.api.test.ts --maxWorkers=2`: 14 archivos / 121 pruebas aprobados antes de la revisión final de etiquetas de base viva. La pasada final se registra abajo.
- Nuevas regresiones: incorporación con material null, inicial/actual distintos, snapshots ausentes, INICIO/EMBOLSADO, IDs vecinos superiores a MAX_SAFE_INTEGER en lectura/rutas/acciones/evidencias/asignaciones, DATE y La Paz, devolución y tipo desconocido, adaptabilidad repetida/saltos tras despacho parcial, FINALIZADO, fallo vs vacío, foto fallida/expirada, aislamiento por lote/cuenta/token/permiso y página obsoleta.
- Las pruebas automatizadas usan datos sintéticos y HTTP simulado; no acreditan transacciones reales ni permisos/RPC/Storage en otros perfiles.

## Navegador local, sólo lectura

Chrome con la sesión ADMIN ya existente, localhost:5173. Se observó:

- Lote 122: ficha e historial de INICIO, 5 UNIDAD en proceso, saldo vivo no disponible y fecha de Recolección 12 nov 2026.
- Lote 124 existente de QA: ficha abierta sin pantalla blanca, Saldo inicial · Donación, 3 UNIDAD iniciales/actuales, historia previa no registrada, sin enlace Recolección ni acción Embolsado. Historial con INCORPORACION y pestaña Evidencia.
- Foto privada 779: preview y galería decodificaron el PNG sintético de 640×480; MIME visible y peso/fecha ausentes como no disponibles. No se extrajeron credenciales, persistieron firmas ni enviaron formularios.

Esta comprobación no crea datos ni repite las 17 pruebas HTTP/Storage que informó backend. No acredita renovación por expiración real, otros perfiles, dispositivo físico ni recorrido M3. Error/expiración/aislamiento están cubiertos por pruebas sintéticas. El fixture 124 ya estaba creado antes de esta entrega.

## Dependencias concretas conservadas

Referencia: `vivero-timeline.service.ts` y auditoría backend `t5-historial-revision-2026-11-14.md` del contrato leído.

1. El timeline no entrega `origen_despacho`, `asignacion_id`, `subcampania_id`, `campania_id`, ni `vivero_incorporacion.registrado_en`. No construir enlaces ni horas a partir de especie, saldo o created_at DATE. La iteración 3 requiere el DTO autorizado con estos vínculos exactos y semántica de timestamp.
2. No hay protocolo de paginado/completitud: no certificar que el array recibido sea todo el historial ni reconstruir stock sumando eventos. La consulta de fotos puede fallar en backend y volver como []; el cliente no puede distinguir ese caso de ausencia válida. Firmar una foto fallida también puede rechazar el timeline entero: la ficha sigue legible, pero separar ese fallo por evento requiere backend.
3. Salvo incorporación, los nombres de responsables son actuales; faltan snapshots históricos. El timeline tampoco proyecta título/peso/fecha de cada evidencia aunque existan en almacenamiento. Sólo se muestran los campos recibidos.
4. El origen M2 no incluye autoría de Recolección para legitimar su enlace de revisión para un VALIDADOR. La ficha M1 legada sólo admite IDs seguros. El enlace se conserva para ADMIN con M1 verificado e ID representable; el historial M2 sigue accesible con IDs grandes. Recepción desde Inicio y sus permisos no se revocan.
5. La lista mantiene filtros locales existentes de stock/asignaciones sobre la página recibida; no se añadió búsqueda global por modalidad/procedencia ni query inventada. La paginación global y filtros de la lista existentes necesitan su entrega propia.

## Reservado para iteraciones 2 y 3

- Iteración 2: menú ADMIN, formulario familiar, fotos previas, confirmación, persistencia/recuperación del intento propio y manejo de incertidumbre. El contrato backend leído todavía permite GENERAL/VALIDADOR con M2; ADMIN exclusivo requiere cierre backend verificado. La recuperación propia queda fuera del gate operativo al perder permiso, con cuenta original.
- Iteración 3: procedencia M3 propia y administrativa por contrato autorizado, vínculos de entrega/devolución y QA integrado. `procedencia-propia` exige relación propia incluso ADMIN; no usarlo para registros ajenos ni ampliar Impacto público. La vista administrativa actual basada en Impacto necesita lectura administrativa privada.

## Resultado final de checks

- `npm run test -- src/modules/vivero src/api/lotes-vivero.api.test.ts --maxWorkers=2`: **14 archivos / 121 pruebas aprobados**, pasada final de Vivero.
- `npm run test -- --maxWorkers=2`: **101 archivos / 1.398 pruebas aprobados**, pasada final completa (78,47 s).
- `npm run lint`: **aprobado**, sin errores ni avisos.
- `npm run build`: **aprobado**, incluye TypeScript y PWA. Persiste el aviso conocido de MapLibre mayor a 1.000 kB; no se introducen dependencias.
- `git diff --check`: **aprobado**.

La primera compilación detectó consumidores no preparados para null e IDs de texto; se corrigieron antes de los checks finales. Una prueba nueva usó inicialmente una consulta singular sobre un texto repetido; se ajustó la aserción. No se presentan esas ejecuciones iniciales como aprobadas.

## Archivos modificados

- `AGENTS.md`
- `DOMAIN_INDEX.md`
- `FRONTEND_AUDIT.md`
- `FRONTEND_GUIDE.md`
- `docs/QA_T5_ITERACION_1.md`
- `src/api/lotes-vivero.api.test.ts`
- `src/api/lotes-vivero.api.ts`
- `src/api/plantacion.api.ts`
- `src/modules/vivero/README.md`
- `src/modules/vivero/components/AdaptabilidadTimeline.tsx`
- `src/modules/vivero/components/AuditoriaSection.tsx`
- `src/modules/vivero/components/CierreLoteCard.tsx`
- `src/modules/vivero/components/EventCard.tsx`
- `src/modules/vivero/components/EvidencePhoto.tsx`
- `src/modules/vivero/components/EvidenciaTab.tsx`
- `src/modules/vivero/components/FiltersRow.tsx`
- `src/modules/vivero/components/GalleryModal.tsx`
- `src/modules/vivero/components/HeroHeader.tsx`
- `src/modules/vivero/components/IndicadoresRapidos.tsx`
- `src/modules/vivero/components/OrigenCard.tsx`
- `src/modules/vivero/components/QuickActions.tsx`
- `src/modules/vivero/components/SaludCard.tsx`
- `src/modules/vivero/components/SubetapasBar.tsx`
- `src/modules/vivero/components/SurvivalBar.tsx`
- `src/modules/vivero/components/Timeline.tsx`
- `src/modules/vivero/components/UltimosEventos.tsx`
- `src/modules/vivero/components/ViveroLotAsignacionesCollapsible.tsx`
- `src/modules/vivero/components/ViveroLotAsignacionesTab.tsx`
- `src/modules/vivero/components/ViveroLotCard.tsx`
- `src/modules/vivero/components/event/forms/AdaptabilidadForm.tsx`
- `src/modules/vivero/components/event/forms/AsignacionForm.tsx`
- `src/modules/vivero/components/event/forms/DescartePreEmbolsadoForm.tsx`
- `src/modules/vivero/components/event/forms/EmbolsadoForm.tsx`
- `src/modules/vivero/components/event/forms/EventConfirmations.test.tsx`
- `src/modules/vivero/components/event/forms/MermaForm.tsx`
- `src/modules/vivero/hooks/useViveroDetail.test.tsx`
- `src/modules/vivero/hooks/useViveroDetail.ts`
- `src/modules/vivero/hooks/useViveroLots.ts`
- `src/modules/vivero/hooks/useViveroStats.ts`
- `src/modules/vivero/mappers/lote.mapper.test.ts`
- `src/modules/vivero/mappers/lote.mapper.ts`
- `src/modules/vivero/screens/ViveroDetailScreen.test.tsx`
- `src/modules/vivero/screens/ViveroDetailScreen.tsx`
- `src/modules/vivero/screens/ViveroEmbolsadoScreen.tsx`
- `src/modules/vivero/screens/ViveroEventScreen.tsx`
- `src/modules/vivero/screens/ViveroNewScreen.tsx`
- `src/modules/vivero/screens/ViveroScreen.tsx`
- `src/modules/vivero/t5.test-fixtures.ts`
- `src/modules/vivero/types/contracts.ts`
- `src/modules/vivero/types/view-models.ts`
- `src/modules/vivero/utils/dispatchFlow.ts`
- `src/modules/vivero/utils/presentation.ts`
- `src/modules/vivero/utils/stageFilters.ts`
- `src/services/lotes-vivero.service.ts`
- `src/services/plantacion.service.ts`
