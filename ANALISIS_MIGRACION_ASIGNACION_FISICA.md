# Análisis de migración frontend — Asignación física M2 ↔ M3

> Base: `/Users/pabloandresfernandezcari/Projects/R3foresta/Backend-r3foresta/documentacion/frontend/guia-migracion-asignacion-fisica.md`
> Alcance: consumo de APIs + lógica de negocio ya programada en `pwa-r3foresta`.
> Fecha: 2026-07-07

## 1. Qué cambió (resumen del contrato)

El backend pasó del modelo **"reserva lógica + despacho automático al plantar"** al de
**"asignación física + consumo de stock asignado"**:

- **Asignar = entregar plantas**: el `saldo_vivo_actual` del lote baja *en ese momento* (ya no se aparta un saldo lógico).
- **Plantar** solo consume `saldo_asignado_disponible` de la subcampaña; **no toca al vivero**.
- **Devolver = retorno físico**: el saldo del lote *sube* (reemplaza a "cancelar reserva").
- **Disponible del lote = `saldo_vivo_actual`** (físico). Desaparece el cálculo `vivo − asignado`.
- Asignar exige **evidencia fotográfica** (flujo de 2 pasos) y **permisos** (ADMIN o COORDINADOR de la subcampaña).

Consecuencia clave: **es un cambio rompiente y coordinado**. La API nueva rechaza el shape viejo
(faltará `evidencia_ids`) y los campos renombrados desaparecen de las responses. Frontend y backend
deben desplegarse juntos.

## 2. Estado del frontend

Todo el módulo de asignaciones y saldos del vivero, más el consumo de stock por especie en
plantación, siguen implementados con el **modelo viejo**. No hay nada del flujo físico nuevo
(evidencia previa, devolución, cierre/reapertura de lote). El registro de plantación M3
(`POST /registros-plantacion`) **aún no está consumido** por el frontend, así que el cambio
`despachos → consumos` no rompe nada hoy, pero condiciona ese desarrollo futuro.

## 3. Impacto por endpoint

| Endpoint | Cambio del contrato | Estado en el front | Acción |
|---|---|---|---|
| `POST /lotes-vivero/:id/asignaciones` | Body exige `proposito`, `fecha_asignacion`, `evidencia_ids` (≥1) | `crearAsignacionApi` envía solo `{subcampania_id, cantidad_asignada, proposito}` | **Romper**: 422. Añadir fecha + evidencia |
| `DELETE /lotes-vivero/:id/asignaciones/:id` | **ELIMINADO** → `POST .../:id/devolucion` con `cantidad_devuelta`, `motivo_devolucion`, `fecha_devolucion` | `cancelarAsignacionApi` usa `DELETE` | **Romper**: reescribir a devolución |
| `POST /lotes-vivero/evidencias-pendientes` | Sube fotos y devuelve `evidencia_ids` | Ya existe (`uploadEvidenciasPendientesViveroApi`) | **Reutilizar** en el paso 1 de asignar |
| `GET /lotes-vivero` y `/:id` | `saldo_asignado_total → saldo_asignado_subcampanias`; desaparece `saldo_vivo_disponible_asignacion` | Mapea ambos campos viejos | **Renombrar / eliminar** |
| `GET /lotes-vivero/:id/saldos` | Ídem | No se consume directamente hoy | Verificar si se agrega |
| `GET /lotes-vivero/stock/especies` | `saldo_reservado* / saldo_disponible* → saldo_vivo_actual* (asignable) + saldo_asignado_subcampanias* (informativo)` | `listStockEspecies` lee `saldo_reservado_total` y `saldo_disponible_total` | **Romper silencioso**: quedan en 0 |
| `POST /subcampanias/:id/activar` | `composicion_reservada → composicion_asignada`; `saldo_reservado → saldo_asignado_disponible` | Consumido en `DetalleSubcampanaScreen` | **Renombrar** |
| `POST /subcampanias/:id/cancelar` | Mismo request; ahora devuelve stock físicamente al vivero | Request OK | Solo copy/UX |
| `POST /registros-plantacion` | Response `despachos → consumos`; reposición acepta subcampaña `COMPLETADA`/`FINALIZADA_PARCIAL` | **No implementado** | Diseñar ya alineado |

## 4. Impacto por archivo (con referencias)

### 4.1 Capa de datos (contratos, tipos, mapper)

- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/types/contracts.ts`**
  - L95–96: `saldo_asignado_total?` → renombrar a `saldo_asignado_subcampanias`; **eliminar** `saldo_vivo_disponible_asignacion?`.
  - L380–386: `CrearAsignacionViveroRequest` — añadir `fecha_asignacion: string` y `evidencia_ids: number[]` (≥1); `proposito` pasa a **requerido**.
  - Falta declarar: `DevolucionAsignacionRequest` (`cantidad_devuelta`, `motivo_devolucion`, `fecha_devolucion`) y las **responses nuevas** de asignación/devolución (con `lote_finalizado` y `lote_reabierto`).
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/types/view-models.ts`** — L23–25 y L58–60: `saldoAsignadoTotal` / `saldoVivoDisponibleAsignacion` en card y detail: renombrar/eliminar.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/mappers/lote.mapper.ts`** — L96–97 y L141–143: mapea los dos campos viejos. Ajustar al nuevo nombre y derivar "disponible" desde `saldo_vivo_actual`.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/services/lotes-vivero.service.ts`**
  - L93–101 y L440–473: `EspecieStockVivero` + `listStockEspecies` leen `saldo_reservado_total` / `saldo_disponible_total` → romper silencioso (0). Cambiar a `saldo_vivo_actual_total` + `saldo_asignado_subcampanias_total`.
  - L493–517: `crearAsignacion` no envía `fecha_asignacion` ni `evidencia_ids`.
  - L519–537: `cancelarAsignacion` llama al `DELETE` eliminado → reescribir como `devolverAsignacion`.
  - Nota lateral: hay *mojibake* en los mensajes de error (`invÃ¡lido`, `subcampaÃ±a`, L499–535). Corregir de paso.

### 4.2 Capa de red (API)

- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/api/lotes-vivero.api.ts`**
  - L262–272: `crearAsignacionApi` — URL correcta, body a ampliar (via tipo).
  - L274–283: `cancelarAsignacionApi` — **eliminar** y crear `devolverAsignacionApi` (`POST .../:id/devolucion`).
  - L124–133: `uploadEvidenciasPendientesViveroApi` ya apunta a `/lotes-vivero/evidencias-pendientes`: reutilizable para el paso de evidencia.

### 4.3 UI / lógica de negocio — Vivero

- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/components/ViveroLotAsignacionesTab.tsx`** (el componente más afectado):
  - L143–158: `maxAsignable` se calcula con `saldoVivoDisponibleAsignacion` y `saldoAsignadoTotal`. Debe pasar a ser **directamente `saldo_vivo_actual`**.
  - L206–245: `handleCreate` no sube fotos → falta **paso 1 (evidencia)** + `fecha_asignacion`.
  - L247–265, L491–505, L512–523: flujo de "Cancelar" → reemplazar por **devolución** con inputs de `cantidad_devuelta` (parcial permitido), `motivo_devolucion`, `fecha_devolucion`. La regla `canCancel = cantidad_consumida === 0` ya no aplica.
  - Falta manejar `lote_finalizado` (asignación total cierra el lote) y `lote_reabierto` (devolución posterior).
  - L284–298: tarjetas "Vivo / Reservado / Libre" → la semántica cambia (tras entregar, el vivo baja). Rediseñar.
  - Permisos: 422 si no es ADMIN/COORDINADOR — mensaje dedicado.
  - Copy de "reserva/reservar/liberar" en todo el archivo (L29–47 hints, L196–204, L305–325, L409, L458–517).
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/utils/dispatchFlow.ts`** — L11–14 y L34–38: usa los dos campos viejos; labels L20–30 ("Listo para despacho", "ofrecerse a asignacion") a repensar en clave de entrega física.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/components/ViveroLotCard.tsx`** — L59–60 y L150–158: "reservado" + "stock libre". Renombrar/eliminar.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/components/IndicadoresRapidos.tsx`** — L19–20: "Saldo reservado" y "Saldo libre". Renombrar a "Entregado a subcampañas" y quitar "libre" (o = saldo vivo).
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/screens/ViveroScreen.tsx`** — L47 y L211: `stockLibre = saldoVivoDisponibleAsignacion ?? …`. Eliminar.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/screens/ViveroEventScreen.tsx`** — L68: `saldoLibre = saldo_vivo_disponible_asignacion ?? saldo`. Eliminar.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/components/event/forms/DespachoForm.tsx`** — L43–44: usa ambos campos viejos. El form está **deshabilitado** (`DESPACHO_EVIDENCE_ENDPOINT_READY = false`), así que es baja prioridad, pero dejar consistente.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/vivero/components/ViveroLotAsignacionesCollapsible.tsx`** — tipado `any[]`; funciona pero conviene tipar y revisar copy.

### 4.4 UI / lógica de negocio — Plantación

- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/plantacion/types/contracts.ts`** — L180–185 (`ComposicionReservadaItem.saldo_reservado`) y L238 (`composicion_reservada`): renombrar a `composicion_asignada` / `saldo_asignado_disponible`.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx`** — L900–920 (`handleActivated`): lee `composicion_reservada` + `saldo_reservado` y arma copy de "stock reservado". Renombrar campos + copy.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/plantacion/components/CatalogoEspeciesPicker.tsx`** — L46 y L95: alimenta `saldo_disponible` desde `saldo_disponible_total` (que desaparece) → usar `saldo_vivo_actual_total`.
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/plantacion/components/SubcampaniaEspeciesStep.tsx`** + **`utils/subcampaniaDraft.ts`** — consumen `saldo_disponible` (L115, 222, 517–595 / L18, 143, 154). La semántica sigue, pero la fuente cambió de nombre; validar "excede stock disponible".
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/plantacion/components/SubcampaniaResumenStep.tsx`** — L431: copy "Las reservas de stock se asignan tras activar."
- **`/Users/pabloandresfernandezcari/Projects/R3foresta/pwa-r3foresta/src/modules/plantacion/components/CancelarSubcampaniaModal.tsx`** / **`SubcampaniaSuccessOverlay.tsx`** — copy: cancelar ahora **devuelve físicamente** el stock al vivero.

### 4.5 Aún no implementado (pero condicionado)

- **`POST /registros-plantacion`**: no hay cliente en el front. Cuando se construya M3, debe leer `consumos` (no `despachos`), validar meta por especie (400 si la especie no está en el plan o supera `cantidad_objetivo`), validar pendiente de reposición (400 si excede `muertas − repuestas`), y aceptar reposición con subcampaña `COMPLETADA`/`FINALIZADA_PARCIAL`.

## 5. Glosario de copy (buscar y reemplazar con criterio)

| Antes | Ahora |
|---|---|
| "Reservar stock" / "Crear reserva" | "Asignar (entregar) plantas" |
| "Reservado para subcampañas" / "Saldo reservado" | "Entregado a subcampañas" |
| "Liberar reserva" / "Cancelar asignación" | "Devolver al vivero" |
| "Disponible para reserva" / "Saldo libre" | "Disponible en vivero" |
| Despacho `origen_despacho = ASIGNACION_SUBCAMPANIA` | "Salida por asignación a subcampaña" |
| — (evento nuevo M2 `DEVOLUCION_PLANTACION`) | "Devolución desde plantación (+N)" |

## 6. Riesgos principales

1. **Rupturas silenciosas por renombrado** (`saldo_disponible_total`, `saldo_vivo_disponible_asignacion`, `saldo_reservado`): no lanzan error, muestran **0** o cálculos vacíos. Son las más peligrosas porque pasan QA visual desapercibidas.
2. **422 en asignar** por falta de `evidencia_ids`/permisos: bloquea el flujo principal del módulo.
3. **404/405 en devolver** por seguir usando `DELETE`.
4. **Despliegue no coordinado**: cualquier front viejo contra API nueva (o viceversa) rompe. Requiere feature-flag o release conjunto.
