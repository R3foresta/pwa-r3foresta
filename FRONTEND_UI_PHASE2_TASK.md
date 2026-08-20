# TASK — Estandarización UI Fase 2: migrar `recolecciones` a la capa `ui/`

> **Tipo:** Frontend · UI only (sin cambios de lógica)
> **Depende de:** Fase 0 (tokens + `src/components/ui/`). Fase 1 (CRUD) es paralela — no bloqueante.
> **Lee antes de empezar:** [`FRONTEND_UI_STANDARD.md`](./FRONTEND_UI_STANDARD.md) (§4 primitivas, §5 estados, §7 checklist, §8 verificación), [`FRONTEND_UI_PHASE1_TASK.md`](./FRONTEND_UI_PHASE1_TASK.md) (mismo patrón, módulos más simples) y [`AGENTS.md`](./AGENTS.md).

---

## 1. Contexto

`recolecciones` es el **primer módulo de dominio** que se estandariza y es más
complejo que los CRUD de la Fase 1: lista + tarjeta, pantalla de detalle, un
**wizard de 3 pasos** (datos → ubicación → resumen) que comparte estado vía
`RecoleccionFormContext`, una pantalla de **validación** (aprobar/rechazar), carga
de fotos y controles a medida (`CantidadInput`, `TipoMaterialSwitcher`, `PhotoUploader`).

Hoy el módulo es **100% a medida**: no importa nada de `components/crud/` ni de
`components/ui/`. Usa Tailwind crudo con **~177 `slate-*`**, **5 `emerald-*`** y un
registro de estado propio (`recoleccionStatus.ts`). Esta tarea lo mueve al estándar.

## 2. Objetivo

Migrar toda la **presentación** del módulo a la capa `ui/`, sin cambiar comportamiento.
Paridad visual **con una sola excepción documentada**: el estado operativo `ABIERTO`
pasa de cyan a sky (`info`) al consolidarse en el registro único — es un cambio
**intencional** (ver §6 y `status.ts`).

## 3. Alcance — archivos a migrar

| Grupo | Archivos | Botones |
|---|---|---|
| Lista + tarjeta | `RecoleccionesScreen.tsx`, `RecoleccionCard.tsx` | 7 |
| Detalle | `RecoleccionDetailScreen.tsx` | 5 |
| Wizard (3 pasos) | `RecoleccionFormLayout.tsx`, `RecoleccionFormDatosScreen.tsx`, `RecoleccionFormUbicacionScreen.tsx`, `RecoleccionFormResumenScreen.tsx` | 14 |
| Validación | `RecoleccionesValidacionScreen.tsx` | 7 |
| Evidencia | `RecoleccionNuevaEvidenciaScreen.tsx` | 2 |
| Modal | `RecoleccionSuccessModal.tsx` | 2 |
| Controles a medida | `components/CantidadInput.tsx`, `src/components/evidence/PhotoUploader.tsx`, `components/TipoMaterialSwitcher.tsx` | 4 |

**Total: 13 archivos `.tsx`, ~41 botones.** Más una edición parcial de
`recoleccionStatus.ts` (ver §4, solo se quitan las 2 funciones de color).

> **Sugerencia de piloto intra-módulo (orden recomendado):**
> 1. `RecoleccionCard` + `RecoleccionesScreen` (lista — introduce `StatusBadge`, `Button`, `SearchBar`),
> 2. `RecoleccionDetailScreen` (detalle + badges),
> 3. wizard (los 3 pasos + layout),
> 4. `RecoleccionesValidacionScreen` (flujo aprobar/rechazar),
> 5. evidencia + modal + controles a medida.
> Abrir revisión al terminar (1) para fijar el patrón antes de replicar.

## 4. Mapa de reemplazos (mecánico)

| Patrón actual | Reemplazar por |
|---|---|
| `<button className="…bg-brand-…">` | `<Button variant="primary">` |
| Botón secundario (borde/ghost) | `<Button variant="secondary">` / `variant="ghost"` |
| Botón destructivo / rechazar (`bg-red-…`) | `<Button variant="danger">` |
| `<input className="…" />` | `<Input error={!!err} … />` |
| `<select>` a medida | `<Select error={!!err}>` |
| `<textarea>` a medida | `<Textarea error={!!err}>` |
| Label + error + hint manuales | `<Field label … required error hint>` |
| Buscador de la lista | `import { SearchBar } from '@/components/ui'` |
| `estadoRegistroBadgeClass(...)` / `estadoOperativoBadgeClass(...)` | `<StatusBadge status={estado} label={…} />` |
| **`slate-*`** | **`neutral-*`** |
| **`emerald-*` de estado** | **`success-*`** |
| `emerald-*` decorativo que se quiera "verde marca" | `brand-*` (**ojo: cambia el color**, ver abajo) |
| `amber-*` de estado | `warning-*` · `cyan-*`/`sky-*` de estado → `info-*` · `red-*` de estado → `danger-*` |

### ⚠️ Dato clave — los tokens son alias exactos

En `tailwind.config.js`: `neutral = colors.slate`, `success = colors.emerald`,
`warning = colors.amber`, `danger = colors.red`, `info = colors.sky`.

- `slate-N` → `neutral-N` y `emerald-N` → `success-N` son **swaps idénticos byte a byte**
  (mismo hex, misma escala). **Cero diferencia visual.** Los ~177 `slate-` se migran
  con un find/replace cuidadoso sin riesgo de color.
- `emerald-* → brand-*` **NO** es idéntico: `brand` es el verde bosque a medida, distinto
  del emerald. Usar `brand-*` solo cuando se **quiera** ese cambio de color; para preservar
  paridad, `emerald-* → success-*`.

### Consolidación de estado (`recoleccionStatus.ts`)

`recoleccionStatus.ts` mezcla **dominio** y **presentación**:

- `resolveEstadoRegistro()` / `resolveEstadoOperativo()` / `normalize*` → **dominio, se quedan.**
- `estadoRegistroBadgeClass()` / `estadoOperativoBadgeClass()` → **presentación, se eliminan.**
  Su equivalente ya está sembrado en el registro único `src/components/ui/status.ts`
  (`STATUS_VARIANT`). En los 3 consumidores (`RecoleccionCard`, `RecoleccionDetailScreen`,
  `RecoleccionesValidacionScreen`) reemplazar la píldora manual por `<StatusBadge status=… label=… />`.

### Ejemplo antes/después

```tsx
// ANTES
<span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${estadoRegistroBadgeClass(estado)}`}>
  {estadoLabel}
</span>

// DESPUÉS
<StatusBadge status={estado} label={estadoLabel} size="sm" />
```

## 5. Frontera "solo UI" — NO tocar

- `hooks/` (`useCatalogosRecoleccion`, `usePhotoUpload`), `validators/`, `utils/`,
  `useRecoleccionForm.ts`, `recoleccionFormTypes.ts`, `recoleccionTypes.ts`, `index.ts`.
- **`RecoleccionFormContext.tsx`** — es estado compartido del wizard, no presentación.
- En `recoleccionStatus.ts`: las funciones `resolve*` / `normalize*` (dominio) se preservan tal cual.
- **Interior del mapa Leaflet** en `RecoleccionFormUbicacionScreen` (marcadores `divIcon`,
  capas, lógica de geo): solo se migra el *chrome* alrededor (botones, headers, campos), no el mapa.
- **Lógica de carga de fotos** (`usePhotoUpload`, validación 2–5 archivos/≤5 MB/JPG-PNG,
  `FormData` con campo `fotos`): intacta. Solo el disparador visual de `PhotoUploader`.
- Handlers (`onClick`, `onSubmit`, `onChange`), condiciones de render por dominio,
  textos, labels, enums y unidades: se mueven **sin modificarse**.

## 6. Gotchas

1. **`Button` es `type="button"` por defecto.** En el wizard, el botón que **avanza/envía**
   cada paso debe pasar `type="submit"` explícito si dependía del `<button>` nativo dentro de un `<form>`.
2. **Excepción de paridad — `ABIERTO`:** hoy `estadoOperativoBadgeClass` lo pinta **cyan**;
   el registro lo consolida a **`info` (sky)** para diferenciarlo de `VALIDADO` (verde).
   Es el **único** cambio de color intencional de la fase — anotarlo en el PR. El resto
   (`BORRADOR`→amber, `VALIDADO`→emerald, `CERRADO`→slate) queda idéntico.
3. **No interpolar clases de Tailwind** (`bg-${x}-50`): usar props de variante de las primitivas.
4. **Controles a medida — decisión de diseño, no automáticos:**
   - `TipoMaterialSwitcher` (toggle Semilla/Esqueje): es un segmented control legítimo.
     Migrar tokens (`emerald→success`, `slate→neutral`) **o** expresarlo con `<Chip>` seleccionable
     si el estilo "activo" del `Chip` calza. Mantener comportamiento idéntico.
   - `CantidadInput` (stepper +/−): los botones de ícono pueden ir a `<Button variant="ghost">`;
     si el layout del stepper se rompe, documentar por qué quedan a medida.
   - `PhotoUploader`: el disparador de archivo → `<Button>`; el `<input type="file">` oculto no cambia.
5. **Modal (`RecoleccionSuccessModal`):** botones de acción → `<Button>`; no tocar el
   montaje/estado del modal.
6. **`StatusBadge`:** si aparece un estado no presente en `status.ts`, agregarlo **ahí**
   (una sola fuente), no crear un mapa nuevo en el módulo.
7. **Imports:** preferir el barrel `@/components/ui`.

## 7. Criterios de aceptación (DoD)

- [ ] `grep -rn "slate-" src/modules/recolecciones` → **0** (todo migrado a `neutral-`).
- [ ] `grep -rn "emerald-" src/modules/recolecciones` → **0** (migrado a `success-`, o a `brand-` si fue decisión explícita documentada en el PR).
- [ ] `grep -rn "estadoRegistroBadgeClass\|estadoOperativoBadgeClass" src/modules/recolecciones` → **0** (reemplazado por `<StatusBadge>`).
- [ ] `recoleccionStatus.ts` conserva `resolve*`/`normalize*` y **ya no exporta** las funciones `*BadgeClass`.
- [ ] Los 13 `.tsx` del §3 no usan `<button className="…">` de estilo (usan `<Button>`), salvo íconos puros muy específicos documentados en el PR.
- [ ] Estados con `<StatusBadge>` / `<Badge>`, no strings de color inline.
- [ ] `npm run build` verde (typecheck + bundle).
- [ ] `npm run lint` sin errores nuevos.
- [ ] Revisión visual de los flujos completos: **listar → detalle → wizard (3 pasos con fotos y mapa) → éxito**, y **validar (aprobar/rechazar)**. Loading/empty/error/success incluidos. Único cambio de color esperado: `ABIERTO` cyan→sky.
- [ ] Diff contiene **solo** presentación de `recolecciones` (+ la poda de `recoleccionStatus.ts`). Cero cambios en `hooks/`, `validators/`, `services`, `mappers`, `RecoleccionFormContext`, `useRecoleccionForm`.

## 8. Verificación

```bash
npm run build        # tsc -b && vite build
npm run lint         # eslint .
# scope check — no debe haber lógica tocada:
git diff --name-only | grep -E "service|api|mapper|hook|context|validator|useRecoleccionForm" \
  && echo "REVISAR: se tocó lógica" || echo "OK: sin archivos de lógica"
# residuos de token/color:
grep -rn "slate-\|emerald-\|BadgeClass" src/modules/recolecciones && echo "REVISAR" || echo "OK: sin residuos"
```

## 9. Fuera de alcance

- `vivero` → Fase 3 · `plantacion` → Fase 4 · `home`/`auth`/barrido final → Fase 5.
- Rediseño del wizard, del mapa o del flujo de validación. Esto es **estandarización, no rediseño**.
- Hallazgos de dominio del `FRONTEND_AUDIT.md`: no se tocan aquí.

## 10. Salida esperada

Un PR titulado `refactor(ui): migrar recolecciones a la capa de primitivas (Fase 2)`
con el módulo migrado (o varios PRs siguiendo el orden de piloto del §3). El PR debe
mencionar explícitamente la única excepción de paridad: `ABIERTO` cyan→sky.
