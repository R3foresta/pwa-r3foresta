# T5 · revisión e integración local

Corte: 16 de noviembre de 2026. Revisión de los cinco chats de planeación,
contrato e implementación y de ambos repositorios. **T5 completa sigue abierta**;
la integración Git no acredita aplicación de SQL ni despliegue.

| Entrega | Estado comprobado |
| --- | --- |
| Planeación y contrato base | Definidos; incorporados a las entregas locales. |
| Backend T5 y contratos ADMIN/trazabilidad | Integrados en `main`, `3cb82e4`, mediante fast-forward desde `69545ed`. |
| Frontend iteraciones 1/2 | Implementadas y verificadas localmente; commits `382ec9b`, `7730675`, `f83c7ab`. |
| Ajuste de ficha | Commit `20fbb8a`: origen desplegable en Historial, acciones rápidas en Resumen. |
| Frontend iteración 3 | Pendientes procedencia M3 propia/ADMIN, vínculos persistidos y nuevos estados de evidencias. |
| Corte de entorno | Aplicación de 109 → 110, recorrido autenticado y aceptación móvil sin acreditar en esta revisión. |

## Compatibilidad del historial

El backend `3cb82e4` devuelve 100 eventos por omisión. El cliente anterior sólo
leía `data.eventos` e ignoraba el cursor: podía omitir eventos posteriores.
La corrección reúne todas las páginas del historial general y de adaptabilidad,
conservando filtros, Bearer, cancelación e IDs exactos. Valida conteos, corte,
cursores y duplicados; un fallo de página no publica un resultado parcial.
Un 409 por cambio durante la lectura exige reintentar desde el principio.

La primera petición conserva compatibilidad con el backend anterior sin
paginación. Ese contrato legado no acredita completitud; comunicar ese límite
en la interfaz sigue pendiente de la iteración 3. La lectura paginada
no reconstruye saldos ni cierra la integración de procedencia y fotos de la
iteración 3.

## Verificación de esta revisión

- Frontend: `npm run test -- --maxWorkers=2`, 106 archivos / 1.473 pruebas
  aprobadas. Tras ajustar el tipado del lector compartido, regresión focal con
  `src/api/lotes-vivero.api.test.ts`, `useViveroDetail.test.tsx` y
  `ViveroDetailScreen.test.tsx`: 3 archivos / 34 pruebas aprobadas.
  `npm run lint`, `npm run build` (incluye TypeScript/PWA) y
  `git diff --check` aprobados en el estado final.
- Backend: `npm run build` y `npm run test:unit -- --runInBand
  --cacheDirectory=/private/tmp/r3-jest-t5-cierre-2026-11-16` aprobados:
  97 suites / 1.412 pruebas. El primer intento quedó limitado por sockets
  bloqueados en el sandbox; la repetición autorizada pasó.
- Backend: los verificadores `vivero-acceso-openapi.cjs`,
  `pa-int02c-openapi.cjs` y `recepcion-semillas-openapi.cjs`, todos con
  `--check`, y `git diff --check` aprobados.

No se repitieron SQL/PostGIS/Storage remotos, altas reales ni QA de navegador.
La [entrega backend](../../Backend-r3foresta/docs/t5-integracion-backend-2026-11-15.md)
conserva su evidencia SQL aislada anterior. El build frontend mantiene el aviso
conocido de tamaño de MapLibre. Ambos repositorios se integran localmente en
`main`; sin push ni despliegue en esta revisión. AUD-038 permanece abierto para
los pendientes de la tabla.

## Archivos de este cierre

- Ficha: `ViveroDetailScreen.tsx`, su prueba, `OrigenCard.tsx` y
  `CollapsibleSection.tsx`, incluidos en `20fbb8a`.
- Compatibilidad paginada: `src/api/lotes-vivero.api.ts`, su prueba,
  `src/services/lotes-vivero.service.ts` y
  `src/modules/vivero/types/contracts.ts`.
- Documentación: este informe, `docs/README.md`, `FRONTEND_AUDIT.md`,
  `FRONTEND_GUIDE.md` y `src/modules/vivero/README.md`.
- Backend: integración del commit existente `3cb82e4`; sin cambios nuevos
  de código backend en esta revisión.
