# Handoff · Dashboard de campaña — conexión backend, refactor y decisiones

Última actualización: 2026-07-04
Backend base: `81b095b fix: activity muestra cancelaciones y metrics filtra solo vivas`
Commit UI base: `241ddd2 feat(campania): rediseño dashboard con métricas, filtros y actividad`

**Estado**: los endpoints del backend ya están implementados, versionados y con tests unitarios (378+ tests verdes en la rama `dev` del backend). Este documento describe los contratos reales para que el frontend reemplace los mocks. Todas las URL asumen la base `/api`.

## 1. Contexto

Se rediseñó `CampaniaAdminDashboardScreen` para reflejar los mockups aprobados (header con métricas, tabs Resumen/Equipo/Lotes/Mapa, grid 2×2 de métricas agregadas, alerta de sub-campañas sin coordinador, preview de mapa, lista de sub-campañas con filtros y tres variantes de card, timeline de actividad reciente y FAB para crear sub-campaña).

La UI compila (`npm run build` verde). Todas las cifras agregadas y por-sub-campaña están hoy calculadas con mocks. Los contratos backend descriptos abajo reemplazan esos mocks.

## 2. Archivo tocado

- `src/modules/plantacion/screens/CampaniaAdminDashboardScreen.tsx`  (~1300 líneas)
  - Todos los sub-componentes conviven en el mismo archivo. Ver §7 para el refactor sugerido.
  - Rutas y flujos existentes (borradores locales, navegación a detalle, creación de sub-campaña) se preservan.

Cada bloque mock está marcado con `// TODO(backend): ...` para poder grep.

## 3. Endpoints backend disponibles

Convenciones globales (ver también el `api-reference.md` del backend):

- Base URL dev: `http://localhost:3000/api` — prod: `https://<dominio>/api`.
- Todos los endpoints requieren el header `x-auth-id: <supabase_auth_id>`.
- Todas las respuestas exitosas son envueltas en `{ "success": true, "data": <payload> }`.
- Errores devuelven `{ "statusCode": <n>, "message": <string> | <string[]> }` (formato NestJS).
- Errores comunes: 401 header ausente, 403 rol insuficiente, 404 recurso no encontrado, **422 violación de regla de negocio** (usar para mostrar toasts amigables al usuario).

### 3.1 Métricas agregadas de campaña

```
GET /api/campanias/:id/metrics
```

**Rol mínimo**: GENERAL (cualquier usuario autenticado).

**Respuesta 200**:

```json
{
  "success": true,
  "data": {
    "supervivencia_pct": 82.5,
    "co2_proyectado_ton": 3.3,
    "hectareas": 4.75,
    "comunidades_count": 2,
    "eventos_count": 12,
    "ultima_actividad": {
      "autor": "Ana Pérez",
      "detalle": "12 árboles",
      "timestamp": "2026-07-03T15:20:00Z"
    }
  }
}
```

**Cálculos** (documentar en `computeDashboardMetrics()`):

| Campo | Fórmula |
|-------|---------|
| `supervivencia_pct` | `SUM(saldo_vivo_actual) / SUM(total_plantado_inicial + total_repuesto) × 100` sobre subcampañas vivas. `0` si el denominador es 0. |
| `co2_proyectado_ton` | **Placeholder MVP**: `SUM(saldo_vivo_actual) × 0.022` (~22 kg CO₂/árbol/año). Fórmula final pendiente de producto. No mostrar en un tono definitivo — considerar sufijo "(estimado)". |
| `hectareas` | `SUM(area_hectareas)` de subcampañas vivas, `null` se trata como 0. |
| `comunidades_count` | `COUNT(DISTINCT zona_id)` de subcampañas vivas. |
| `eventos_count` | `COUNT(registro_plantacion) + COUNT(evento_plantacion)` de subcampañas vivas. |
| `ultima_actividad` | Último item de `/activity` filtrado a subcampañas vivas. `null` si no hay actividad. |

Errores: `401`, `404` (campaña no encontrada).

### 3.2 Actividad reciente

```
GET /api/campanias/:id/activity?limit=5
```

**Rol mínimo**: GENERAL.

`limit` default `5`, rango `1..50` (fuera de rango → `400`).

**Respuesta 200**:

```json
{
  "success": true,
  "data": [
    {
      "id": "registro-42",
      "tipo": "plantacion",
      "autor": "Ana Pérez",
      "detalle": "12 árboles",
      "ubicacion": "Subcampaña Zona A · Comunidad Sur",
      "timestamp": "2026-07-03T15:20:00Z"
    },
    {
      "id": "historial-91",
      "tipo": "cancelacion",
      "autor": "Coord Pepe",
      "detalle": "Falta de acceso al terreno.",
      "ubicacion": "Subcampaña Zona B · Comunidad Norte",
      "timestamp": "2026-07-02T08:00:00Z"
    }
  ]
}
```

**Tipos de evento** (enum del campo `tipo` — fijo, no cambia sin coordinar con el backend):

| `tipo` | Fuente | Detalle típico | Notas |
|--------|--------|----------------|-------|
| `plantacion` | `registro_plantacion` | `"N árboles"` | La cantidad es `cantidad_total_plantada`. |
| `nueva_subcampana` | `subcampania_historial.BORRADOR_CREADO` | `""` | Solo si el backend registra ese evento en el historial. |
| `activacion` | `subcampania_historial.SUBCAMPANIA_ACTIVADA` | `""` | |
| `cancelacion` | `subcampania_historial.SUBCAMPANIA_CANCELADA` | motivo textual | La subcampaña queda `deleted_at`, pero el evento sí aparece en el feed. |
| `cambio_coordinador` | `subcampania_historial.COORDINADOR_CAMBIADO` | `""` | |

`autor`: nombre completo del responsable; fallback `"Sistema"`.
`ubicacion`: `"<nombre subcampaña> · <zona>"` cuando ambos datos están disponibles, solo el nombre si falta la zona.
`timestamp`: ISO 8601, ordenados descendente.

Errores: `400` (limit fuera de rango), `401`, `404`.

### 3.3 Payload enriquecido de sub-campañas

`GET /api/campanias/:id/subcampanias` y `GET /api/subcampanias?campania_id=:id` devuelven ahora el payload extendido para el dashboard.

**Respuesta 200** (item):

```json
{
  "id": 11,
  "campania_id": 1,
  "nombre": "Subcampaña Zona A",
  "descripcion": null,
  "tipo": "REFORESTACION",
  "estado": "ACTIVA",
  "fase_mantenimiento": "NO_APLICA",
  "zona_id": 10,
  "zona_nombre": "Comunidad Sur",
  "area_hectareas": 2.5,
  "meta_total_arboles": 500,
  "codigo_trazabilidad": "SUB-001-CMP-2026-001",
  "total_plantado_inicial": 120,
  "total_repuesto": 0,
  "total_muerto_acumulado": 0,
  "saldo_vivo_actual": 120,
  "plantados": 120,
  "avance_pct": 24,
  "has_plan_especies": true,
  "personas_count": 3,
  "lotes_count": 2,
  "eventos_count": 5,
  "equipo": [
    { "usuario_id": 7, "nombre_usuario": "Coord Pepe", "rol": "COORDINADOR", "foto_perfil_url": null },
    { "usuario_id": 12, "nombre_usuario": "Op Ana", "rol": "OPERARIO", "foto_perfil_url": null }
  ],
  "coordinador": { "id": 7, "nombre": "Coord Pepe" },
  "created_at": "2026-05-28T10:00:00Z",
  "updated_at": "2026-05-28T10:00:00Z"
}
```

**Campos nuevos** para el dashboard:

| Campo | Tipo | Semántica |
|-------|------|-----------|
| `zona_nombre` | `string \| null` | Nombre visible de la zona. Prefiere el snapshot inmutable si la subcampaña ya se activó; si no, resuelve desde `division_administrativa`. |
| `area_hectareas` | `number \| null` | Del campo persistido; puede ser `null` en `BORRADOR`. |
| `plantados` | `number` | Alias de `total_plantado_inicial` (para leer más rápido en el frontend). |
| `avance_pct` | `number \| null` | `plantados / meta × 100`, acotado a `[0, 100]`; `null` si la meta es 0. |
| `has_plan_especies` | `boolean` | `true` si existen filas en `SUBCAMPANIA_META_ESPECIE` para la subcampaña. Usar para el chip "mix de especies" en cards. |
| `personas_count` | `number` | Miembros del equipo (COORDINADOR + OPERARIO). |
| `lotes_count` | `number` | **Lotes distintos** (`lote_vivero_id` únicos) con asignación `ACTIVA` — no cuenta filas duplicadas por múltiples reservas del mismo lote. |
| `eventos_count` | `number` | `registro_plantacion + evento_plantacion`. |
| `equipo` | `EquipoMember[]` | Siempre array; `[]` si la subcampaña aún no tiene equipo. |
| `coordinador` | `{ id, nombre } \| null` | Se mantiene por compatibilidad; equivalente a `equipo.find(m => m.rol === 'COORDINADOR')`. |

`EquipoMember`:

```ts
{
  usuario_id: number;
  nombre_usuario: string | null;
  rol: 'COORDINADOR' | 'OPERARIO';
  foto_perfil_url: string | null;
}
```

### 3.4 Editar campaña (RN-PLA-38)

```
PATCH /api/campanias/:id
```

**Rol mínimo**: ADMIN.

**Body**:

| Campo | Regla |
|-------|-------|
| `nombre` | 3..200 chars, único. Editable siempre. |
| `descripcion` | ≤ 1000 chars. Editable siempre. |
| `fecha_estimada_inicio`, `fecha_estimada_fin` | ISO date, coherentes entre sí. Editable siempre. |
| `tipo` | `REFORESTACION \| ARBORIZACION \| FORESTACION`. **Sólo editable si no existe ninguna subcampaña asociada** (incluye `CANCELADA` e historicas soft-deleted). |

`codigo_trazabilidad` no se edita nunca. **Las organizaciones no se envían en este PATCH** — usar los endpoints dedicados `POST /organizaciones` y `DELETE /organizaciones/:orgId` (ver §3.6).

**Respuesta 200**: la campaña actualizada (mismos campos que `GET /:id`).

**Errores relevantes**:

| Status | Escenario UX |
|--------|--------------|
| `400` | Fechas incoherentes o `tipo` inválido — feedback inline. |
| `422` | Cambio de `tipo` con subcampañas asociadas → mostrar toast: "No se puede cambiar el tipo de una campaña con subcampañas." Nombre duplicado → mostrar toast del campo `nombre`. |
| `403` | Usuario no ADMIN — ocultar la opción antes de llamar. |

### 3.5 Desactivar campaña (soft-delete, RN-PLA-38)

```
DELETE /api/campanias/:id
```

**Rol mínimo**: ADMIN.
**Semántica**: soft-delete. Setea `deleted_at`/`deleted_by`. No hay endpoint separado `POST /:id/cancelar` ni `POST /:id/desactivar` — usar `DELETE`.

**Reglas**:

- Permitido si la campaña **no tiene subcampañas asociadas**, o
- si **todas** sus subcampañas están en estado `CANCELADA`.

Si existe al menos una subcampaña en `BORRADOR`, `ACTIVA`, `COMPLETADA`, `FINALIZADA_PARCIAL` o `PAUSADA` → `422` con mensaje `"No se puede desactivar una campaña con subcampañas no canceladas."`

> Sin cascada. Desactivar la campaña **no** cancela sus subcampañas: primero hay que cancelarlas (`POST /subcampanias/:id/cancelar`, requiere `total_plantado_inicial = 0`) o cerrarlas (`FINALIZADA_PARCIAL`) según corresponda. Si hay plantaciones registradas, la subcampaña ya no puede cancelarse; en ese caso la campaña queda como está — no permitir soft-delete.

**Respuesta 200**:

```json
{ "success": true, "data": { "message": "Campaña eliminada correctamente.", "id": 1 } }
```

**UX sugerida**:

- Antes de disparar el `DELETE`, la UI puede consultar `GET /:id/subcampanias` y anticipar si el borrado será rechazado (todas `CANCELADA` o lista vacía). Si hay subcampañas no canceladas, deshabilitar la opción del kebab y mostrar tooltip: "Cancela primero las subcampañas activas."
- Confirmar con `ConfirmDialog` estilo "Desactivar campaña — esta acción se puede revertir contactando al administrador." (Hoy no hay endpoint de re-activación; documentar como manual de DB).

### 3.6 Organizaciones asociadas

Se editan siempre con endpoints dedicados. Un cambio acá no reescribe los `nombres_organizaciones_snapshot` de subcampañas ya activas.

```
POST   /api/campanias/:id/organizaciones     Body: { "organizacion_ids": number[] }
DELETE /api/campanias/:id/organizaciones/:orgId
```

Detalles completos en `documentacion/frontend/modulos/campanias.md` del repo backend.

## 4. Puntos de conexión concretos en el archivo

| Función mock | Nueva fuente |
|---|---|
| `computeDashboardMetrics(campania, subs)` | `GET /api/campanias/:id/metrics` (§3.1) |
| `getMockActivaData(sub)` | campos ya vienen en el payload enriquecido (§3.3) |
| `getBackendSubcampaniaFaltantes(sub)` | `has_plan_especies`, `equipo`, fechas y polígono ya vienen enriquecidos |
| `getMockActivityFeed(subs)` | `GET /api/campanias/:id/activity?limit=5` (§3.2) |
| `SubcampaniaCardHeader` (ubicación) | `sub.zona_nombre` (§3.3) |
| `KebabMenu → onEditar` | pantalla/modal edición → `PATCH /api/campanias/:id` (§3.4) |
| `KebabMenu → onCancelar` | renombrar a "Desactivar campaña" → `DELETE /api/campanias/:id` (§3.5) |

**Orquestación sugerida** en `CampaniaAdminDashboardScreen`:

```ts
const [campania, subs, metrics, activity] = await Promise.all([
  PlantacionService.getCampania(id),
  PlantacionService.listSubcampaniasByCampania(id),   // ya devuelve payload enriquecido
  PlantacionService.getCampaniaMetrics(id),           // NUEVO
  PlantacionService.getCampaniaActivity(id, 5),       // NUEVO
]);
```

Manejo de errores para las llamadas nuevas: no bloquear render, mostrar "—" en las cards de métricas y ocultar el timeline si falla la llamada. Los tests del backend cubren los happy paths y los 400/404.

## 5. Menú kebab — pantallas y confirmaciones

### 5.1 Editar campaña
- Ruta sugerida: `/app/planting/campanias/:campaniaId/edit`
- Reusar `CrearCampaniaForm.tsx` en modo edición (`initialValues` + `submitLabel`).
- Deshabilitar el campo `tipo` en el form si `subs.length > 0` (aplicable a cualquier subcampaña, incluidas `CANCELADA`).
- Organizaciones: separar en su propia sub-vista con listado + agregar/quitar (llama a §3.6).

### 5.2 Desactivar campaña
- Renombrar la opción del kebab de "Cancelar" a **"Desactivar campaña"** para reflejar la semántica de soft-delete (no confundir con "Cancelar subcampaña").
- Usar `ConfirmDialog` con dos textos según el pre-check:
  - Si `subs.every(s => s.estado === 'CANCELADA')` o `subs.length === 0`: pedir confirmación simple.
  - Si hay subcampañas no canceladas: no habilitar la opción; tooltip explicativo.

## 6. Preguntas del handoff anterior — resueltas

1. **Supervivencia ponderada** — La calcula el backend en `/metrics`: `SUM(saldo_vivo_actual) / SUM(total_plantado_inicial + total_repuesto) × 100` sobre subcampañas vivas. Es un cociente global, no un promedio por subcampaña.
2. **Estado "Activa" de la campaña** — Sigue siendo derivado. Backend expone `estado_derivado` en `GET /campanias/:id` (`BORRADOR | ACTIVA | EN_MANTENIMIENTO | MONITOREO_HISTORICO`). Usar ese campo, no derivarlo en el cliente.
3. **Cancelar vs archivar** — Son la misma acción: `DELETE /campanias/:id` es soft-delete. **No hay cascada** — no cancela subcampañas automáticamente. **No hay endpoint de reactivación** por HTTP; se resuelve manualmente si es necesario.
4. **Editar campaña** — `nombre`, `descripcion` y fechas se editan siempre. `tipo` sólo si no existe ninguna subcampaña. Las organizaciones tienen endpoints separados. Cambiar fechas o descripción **no** afecta subcampañas ya activas.
5. **Actividad reciente** — Enum cerrado: `plantacion | nueva_subcampana | activacion | cancelacion | cambio_coordinador`. Fuentes descritas en §3.2.
6. **Filtros de sub-campañas** — El backend no impone; hoy `GET /subcampanias?estado=X` acepta cualquier valor del enum. Recomendación producto: mostrar `TODAS | BORRADOR | ACTIVA | CANCELADA` en el MVP y agrupar `COMPLETADA/FINALIZADA_PARCIAL` bajo "Cerradas" si suma UX.
7. **FAB + botón outlined** — Decisión de diseño, no bloqueado por backend.
8. **Mini mapa** — Ver §8.

## 7. Refactor sugerido (opcional, después de conectar)

Sin cambios respecto al handoff anterior. Propuesta:

```
src/modules/plantacion/components/campania-dashboard/
├── CampaniaHeader.tsx
├── KebabMenu.tsx
├── MetricsGrid.tsx
├── NoCoordinadorAlert.tsx
├── CoverageMapPreview.tsx
├── SubcampaniasSection.tsx
├── ActivityFeed.tsx
├── AgregarSubcampaniaFab.tsx
└── shared.tsx
```

Mock helpers pueden eliminarse por completo tras conectar (§3.1–3.3 cubren todo).

## 8. Preview del mapa — decisión pendiente

Sin cambios respecto al handoff anterior. La recomendación sigue siendo mantener el SVG decorativo hasta que se implemente el tab "Mapa" completo. Backend ya expone `poligono_geojson` en `GET /subcampanias/:id`.

## 9. Cómo probar

```bash
# Backend (repo Backend-r3foresta, rama dev)
npm run start:dev            # http://localhost:3000/api
npm run test                 # 378+ tests

# Frontend
npm run dev
# Abrir: /app/planting → tap en una campaña
```

Casos a verificar manualmente:

- [ ] `/metrics` responde con los 6 campos, valores razonables.
- [ ] `/activity?limit=5` respeta el límite; `limit=0` responde 400.
- [ ] Payload de `/subcampanias` incluye `equipo: []` cuando no hay miembros.
- [ ] Cambiar `tipo` en `PATCH` con subcampañas → 422 con mensaje claro.
- [ ] `DELETE` con subcampañas en `BORRADOR` → 422; sin subcampañas → 200.
- [ ] `DELETE` con todas las subcampañas en `CANCELADA` → 200.
- [ ] Grid de métricas se renderiza en 2×2 sin cortar textos.
- [ ] Alerta amarilla aparece solo cuando hay sub-campañas sin coordinador.
- [ ] Card ACTIVA muestra avatar, área y avance.
- [ ] Card BORRADOR con faltantes → banda amarilla con lista.
- [ ] Timeline no aparece si `data: []`.

## 10. Archivos y referencias clave

Frontend:

| Propósito | Ruta |
|---|---|
| Screen rediseñado | `src/modules/plantacion/screens/CampaniaAdminDashboardScreen.tsx` |
| Servicio de datos | `src/services/plantacion.service.ts` |
| Tipos y contratos | `src/modules/plantacion/types/contracts.ts` |
| Rutas de la app | `src/App.tsx` |
| ConfirmDialog reusable | `src/components/ConfirmDialog.tsx` |

Backend:

| Propósito | Ruta |
|---|---|
| Módulo Campañas — docs cliente | `documentacion/frontend/modulos/campanias.md` |
| Módulo Subcampañas — docs cliente | `documentacion/frontend/modulos/subcampanias.md` |
| Reglas de negocio Plantación | `r3foresta-docs/03-plantacion-module/01_reglas_de_negocio_plantacion.md` (RN-PLA-36, 37, 38) |
| ADR eliminar/editar campaña | `r3foresta-docs/decisiones/02_decisiones_plantacion.md` (ADR-PLA-01) |
| Migración RN-PLA-38 | `Backend-r3foresta/migrations/050_m3_campania_edicion_eliminacion_estricta_mvp.sql` |
| Servicio metrics | `src/campanias/application/campanias-metrics.service.ts` |
| Servicio activity | `src/campanias/application/campanias-activity.service.ts` |
| Servicio edición (RN-PLA-38) | `src/campanias/application/campanias-edicion.service.ts` |

## 11. Orden sugerido de trabajo

1. Extender `PlantacionService` con `getCampaniaMetrics(id)` y `getCampaniaActivity(id, limit)`.
2. Reemplazar los 4 mocks del §4 por llamadas reales. Manejar loading/error.
3. Menú kebab: pantalla de edición (§5.1) y confirmación de desactivación (§5.2, renombrar de "Cancelar").
4. Chequeo pre-desactivación en cliente para mejorar UX (evita el 422 obvio).
5. Refactor de organización (§7).
6. Decisión sobre mini mapa (§8).

Cada paso puede commitearse independientemente.
