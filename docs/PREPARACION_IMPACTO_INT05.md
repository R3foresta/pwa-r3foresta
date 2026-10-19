# INT05 — Cotejo previo de Impacto y Mis registros

**Antecedente conservado.** El 18 de octubre se integró la entrega backend del 17 y se completó la implementación/verificación frontend local. Estado vigente: [QA INT05](QA_IMPACTO_INT05.md). Los bloqueos descritos abajo corresponden al corte previo.

**Corte:** 17 de octubre de 2026. **Alcance:** inspección local de código y documentación; preparación parcial de FE01. No acredita implementación, HTTP/SQL, recorrido de navegador ni cierre de BE01–BE06/FE01–FE06.

Fuente del encargo: [PA-T-INT05](../../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/pa-t-int05.md). Comportamiento: [PA-S02](../../r3foresta-docs/specs/plantacion/participacion-aliada/02-consulta-impacto-y-registros/spec.md) y [PA-S00](../../r3foresta-docs/specs/plantacion/participacion-aliada/00-experiencia-participante/spec.md). La ficha exige **BE01–BE06 verificadas y contrato/entorno entregados antes de integrar frontend**; permite preparar el boceto y revisar componentes previamente.

## Revisiones inspeccionadas

| Repositorio | HEAD al iniciar el cotejo | Estado observado |
| --- | --- | --- |
| PWA | `6a2c95508ab902f5d89161dae03f94b21401dd08` | Árbol limpio; código INT04 en `94f62a9`. |
| Backend | `10e5dc59ee4eec9b94142fa7b2aeadaafc838263` | Árbol limpio; código D en `75a57eb`; sin entrega INT05 encontrada. |
| Documentación | `919a9bd9bb34451103b6e2f0aac114007d773d13` | Ficha INT05 con las doce tareas pendientes. |

Stack confirmado: React 19, TypeScript, Vite, Tailwind, React Router 6, Leaflet/React Leaflet; `package-lock.json` y npm. Scripts disponibles: `dev`, `build`, `lint`, `test`, `preview`. El build incluye TypeScript; no existe script `typecheck`.

## Contratos existentes y límites

Los siguientes endpoints se comprobaron en controllers/código local. Esto no verifica su despliegue ni su comportamiento con datos de un entorno ejecutándose.

| Lectura bajo `/api/v1` | Audiencia y base comprobada | Límite para INT05 |
| --- | --- | --- |
| `GET /impact/organizations` | Pública. | No equivale a resumen global de registros elegibles. |
| `GET /impact/organizations/:organizationId/dashboard` | Pública, por organización. | Exige organización; alcance de estados pendiente de corregir. |
| `GET /impact/organizations/:organizationId/campaigns/:campaignId` | Pública, campaña asociada a organización. | No resuelve enlace independiente a campaña, subcampaña o registro. |
| `GET /impact/organizations/:organizationId/monitoring-timeline` | Pública; filtro opcional `campaignId`. | Sus indicadores/fuentes deben cotejarse con BE03; no son el listado propio. |
| `GET /impact/organizations/:organizationId/evidence` | Pública; `page`, `pageSize`, `campaignId`, `speciesId`, `from`, `to`. | Paginación de fotos existente; no define la de registros INT05. |
| `GET /impact/imagenes/:evidenciaId` | Pública; JPEG sanitizado, `no-store`, según entrega D. | Conservar elegibilidad backend y no usar originales/previews privados. |
| `GET /impact/fotos/:evidencia_id` | Pública; JSON con URL temporal del derivado. | No intercambiable con el endpoint binario de imagen. |
| `GET /plantaciones/:id/detalle-propio` | JWT verificado; autor o participante histórico. | Detalle por ID, no listado «Mis registros» ni destino público para compartir. Observaciones solo del autor. |

Fuentes: [controller Impacto](../../Backend-r3foresta/src/impact/impact.controller.ts), [DTO de consulta](../../Backend-r3foresta/src/impact/impact-query.dto.ts), [tipos actuales](../../Backend-r3foresta/src/impact/impact.types.ts), [controller de registro](../../Backend-r3foresta/src/participacion/participacion-registro.controller.ts) y [compatibilidad D](../../Backend-r3foresta/docs/pa-int02d-compatibilidad.md).

No se encontraron contratos/entrega INT05 para resumen global, campaña independiente de organización, detalle público de subcampaña/registro o listado propio. No nombrar rutas API ni crear validadores nuevos para esos casos hasta recibir la entrega backend.

## Diferencias a resolver en backend

1. **Estados públicos:** `ImpactService.loadDataset` carga subcampañas mediante cliente administrativo filtrando eliminación, pero sin filtrar estado (`src/impact/impact.service.ts`, líneas 384–398 de la revisión indicada). La [guía anterior](../../Backend-r3foresta/documentacion/frontend/impact-portal.md) incluso describe campañas sin filtro de estado. Contrasta con [RN-PLA-34](../../r3foresta-docs/03-plantacion-module/01_reglas_de_negocio_plantacion.md): `ACTIVA`, `COMPLETADA`, `FINALIZADA_PARCIAL`. La exclusión debe suceder en servidor para totales, listas, mapa, detalle y rutas equivalentes; ocultar elementos en la PWA no resuelve la audiencia.
2. **Avance:** `calculateMetrics` usa `percentage`, que limita a 100% (`impact.service.ts`, líneas 1078–1112). PA-S02 exige poder mostrar 125% para meta 40 e inicial 50. Falta contrato de faltantes por subcampaña; no agregar faltantes globales/de campaña sin regla aprobada.
3. **Historia pública:** `ImpactPlantingRecord`/`mapPlantingRecord` actuales no entregan responsable, participantes ni afiliaciones históricas. Los snapshots del detalle propio no autorizan publicar su DTO completo. BE05 debe separar contexto de campaña, afiliación declarada, ausencia declarada e historia no disponible.
4. **Listado propio:** existe detalle histórico, pero no unión paginada «registré/participé». Backend debe derivar actor desde JWT, deduplicar por registro y mantener lectura tras retiro, con observaciones privadas limitadas al autor.

Estos hallazgos proceden de inspección estática. No se ejecutaron probes para determinar datos efectivamente expuestos en un despliegue.

## Reutilización frontend

| Base | Decisión de integración |
| --- | --- |
| `src/App.tsx`, `routes/ProtectedRoute.tsx`, `layouts/AppLayout.tsx` | Crear árbol público fuera de los guards privados y del provider de capacidades de `AppLayout`. Actualmente `/` espera sesión y redirige a login. |
| `contexts/AuthContext.tsx` | Ya renderiza hijos durante hidratación. La lectura pública puede arrancar sin esperar perfil; identidad verificada solo controla acciones/lecturas propias. |
| `modules/map/MapScreen.tsx` | Consulta Recolección interna. Conservar su audiencia; no usar esta pantalla como Impacto público. |
| `modules/participacion/registro/components/RegistroLocationMap.tsx` | Patrón Leaflet, polígonos con anillos y coordenadas GeoJSON. Preparar mapa de consulta sin handlers de captura. |
| `modules/participacion/registro/pages/DetallePropioScreen.tsx` | Reutilizar presentación de snapshots/fotos mediante componentes pequeños. Conservar contrato privado y revisar retorno fijo a `/app/home`. |
| `modules/participacion/api/participacion.transport.ts` | Transporte privado: exige Bearer y mensajes orientados a comandos. No reutilizarlo como cliente público. Compartir configuración de URL sin introducir identidad en requests públicos. |
| `modules/participacion/api/participacion.api.ts` | `verificarActorParticipacion` consulta capacidades cuando no tiene identidad para el token. Revisar dependencia de esta lectura para Mis registros/detalle histórico sin cambiar garantías de los comandos INT04/INT06. |
| `modules/participacion/components/ParticipacionCapabilitiesProvider.tsx` | Reutilizar para acciones autenticadas; completa páginas, separa cuenta/token y distingue error de ausencia confirmada. No condicionar a este provider el contenido público. |
| `utils/appAccess.ts`, `data/navigation.ts`, `modules/home/ParticipantHomeScreen.tsx` | Incorporar acceso exacto al futuro listado propio; conservar entradas de registro/gestión, recuperación e internos existentes. |
| `components/ui/`, `vite.config.ts` | Reutilizar UI y carga lazy. No añadir caché de API/recibos privados al service worker. |

## Secuencia FE01–FE06 propuesta

| Tarea | Resultado a implementar tras recibir backend | Dependencia concreta |
| --- | --- | --- |
| FE01 | Módulo `src/modules/impacto/` con DTO, validación runtime, cliente y separación de audiencia. | Matriz BE01, ejemplos y contrato/entorno BE06. Cotejo parcial en este documento; tarea sin cerrar. |
| FE02 | Global/campaña/subcampaña públicos, mapa y selección restaurable. | Lecturas/filtros/paginación/alcance elegible de BE02. |
| FE03 | Detalle público compartible, fotos elegibles, cantidades grupales y etiquetas de seguimiento/historia. | Agregación BE03 y proyección/snapshots/fotos BE05. |
| FE04 | Lista propia paginada y deduplicada, relaciones visibles y navegación al resultado permitido. | Unión histórica, JWT y política de observaciones BE04. |
| FE05 | Entrada por última campaña utilizada por cuenta, revalidada; global como alternativa y acciones según capacidad. | Elegibilidad pública BE02 y capacidades actuales; error no equivale a revocación. |
| FE06 | Contratos/comportamiento y recorrido navegador → API → datos con regresión INT04/INT06. | BE06 reproducible y FE02–FE05 implementadas. |

Rutas **PWA propuestas, todavía no implementadas**: `/impacto`, `/impacto/campanias/:campaniaId`, `/impacto/subcampanias/:subcampaniaId`, `/impacto/registros/:registroId` y `/app/participacion/mis-registros`. Estas rutas de navegación no proponen nombres de endpoints backend. Un enlace público directo conserva su destino; la preferencia de campaña solo interviene en la entrada por defecto. El registro privado existente permanece en `/app/participacion/registros/:registroId`.

## Recepción backend y verificación posterior

Antes de integrar, recibir nombres exactos de endpoints/DTO, ejemplos JSON públicos/propios/operativos, errores HTTP, reglas de filtros/paginación/caché, IDs/revisiones sin pérdida de precisión y entorno sintético reproducible con versiones. Verificar también compatibilidad de las rutas organizacionales existentes y GET /plan técnico autenticado.

Dataset y pruebas pendientes, asociados a PA-S02-CA01–24:

- Registros iniciales 30 y 20 en campañas distintas: total global 50; varias personas/organizaciones no multiplican cantidades. Ámbitos no elegibles quedan fuera de mapas, listas y totales.
- Meta 40/inicial 50: avance 125%, faltante 0. Meta 40/inicial 30/reposición 3/bajas 5: faltante 10; seguimiento separado, sin inferir composición viva por especie.
- Incógnito, VOLUNTARIO sin asignación, sesión vencida y fallo de capacidades: mismo contenido público, enlaces profundos y fotos elegibles sin login ni espera de perfil.
- Autor revocado y participante histórico: lista deduplicada con relación identificable; observaciones privadas solo del autor. Cambio de cuenta descarta respuestas/páginas previas.
- Afiliación cambiada después del hecho, ausencia declarada y legado sin snapshot: historia explícita, sin reconstruir desde perfil actual/organización de campaña.
- Selección/filtros y retorno al mapa; carga, vacío filtrado, error, 404 no elegible y sesión propia vencida distinguibles.
- Foto pública: comprobar bytes/URLs además de UI; sin EXIF, originales o pendientes. Mantener frontera SQL/Storage de D y regresión de registro recuperable/gestión.

Después de implementar: `npm run test`, `npm run lint`, `npm run build` y QA integrado autorizado, registrando qué evidencia corresponde a mocks, HTTP/SQL, navegador o despliegue. Ninguna de esas comprobaciones se ejecutó como parte de este cotejo documental.
