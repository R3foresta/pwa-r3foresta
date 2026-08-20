# TASK — Estandarización UI Fase 3: migrar `vivero` a la capa `ui/`

> **Tipo:** Frontend · UI only (sin cambios de lógica)
> **Depende de:** Fase 0 (tokens + `src/components/ui/`). Fases 1–2 son referencia de patrón, no bloqueantes.
> **Lee antes de empezar:** [`src/modules/vivero/README.md`](./src/modules/vivero/README.md) (**obligatorio** — es el módulo más maduro y tiene reglas de mantenimiento), [`FRONTEND_UI_STANDARD.md`](./FRONTEND_UI_STANDARD.md) (§4 primitivas, §5 estados, §7 checklist, §8 verificación), [`FRONTEND_UI_PHASE2_TASK.md`](./FRONTEND_UI_PHASE2_TASK.md) (mismo patrón) y [`AGENTS.md`](./AGENTS.md).

---

## 1. Contexto

`vivero` es el módulo con la **arquitectura más madura** (layering completo:
`api → services → mappers → hooks → screens → components`, con `types/contracts.ts`
y `types/view-models.ts`). Pero su **presentación** sigue siendo a medida: **0 imports**
de `components/ui/` o `components/crud/`, **~147 `slate-*`**, **~69 `emerald-*`** y mapas
de color de estado/etapa dispersos en componentes.

Es también el módulo más **grande**: 43 archivos `.tsx`, ~62 botones, un flujo de
eventos con formularios por etapa (`event/forms/`), timelines, barras/medidores
data-driven, galería y la pestaña de asignaciones (`ViveroLotAsignacionesTab`, 988 líneas).

## 2. Objetivo

Migrar toda la **presentación** a la capa `ui/`, sin cambiar comportamiento ni violar
las reglas del README (`screens/` sin lógica pesada, conversiones en `mappers/`,
filtros de etapa en `utils/stageFilters.ts`). Paridad visual.

## 3. Alcance — archivos a migrar (agrupados)

| Grupo | Archivos representativos | Notas |
|---|---|---|
| Lista + tarjeta | `screens/ViveroScreen.tsx`, `components/ViveroLotCard.tsx`, `components/FiltersRow.tsx` | tarjeta con **mapa de etapa** inline (ver §4) |
| Detalle + secciones | `screens/ViveroDetailScreen.tsx`, `HeroHeader`, `IndicadoresRapidos`, `OrigenCard`, `SaludCard`, `CierreLoteCard`, `QuickActions`, `AuditoriaSection`, `CollapsibleSection`, `GalleryModal` | `HeroHeader` tenía hex fijo → token `brand-950` |
| Timelines + barras | `StageTimeline`, `AdaptabilidadTimeline`, `Timeline`, `UltimosEventos`, `EventCard`, `SubetapasBar`, `SurvivalBar`, `DispatchFlowCard` | **color data-driven**, ver §6 |
| Asignaciones | `ViveroLotAsignacionesTab` (988), `ViveroLotAsignacionesCollapsible`, `EvidenciaTab` | archivo grande → considerar PR propio |
| Flujo de evento | `screens/ViveroEventScreen.tsx`, `ViveroEmbolsadoScreen.tsx`, y `components/event/*` (`SectionCard`, `CantidadStepper`, `CantidadInputCard`, `FechaCard`, `ObservacionesCard`, `PhotoUploader`, `SaldoMeter`, `ProgressHeader`, `QuickPercentages`, `EventoCTABar`, `StageTabs`) | steppers y medidores a medida |
| Formularios de evento | `event/forms/` (`EmbolsadoForm`, `AdaptabilidadForm`, `MermaForm` 615, `DespachoForm`, `DescartePreEmbolsadoForm`) | `<Field>`/`<Input>`/`<Select>`/`<Textarea>` + `<Button>` |
| Alta | `screens/ViveroNewScreen.tsx` (791) | form grande |

**~43 archivos `.tsx`, ~62 botones.** (Confirmar el set exacto con `find src/modules/vivero -name '*.tsx'`.)

> **Piloto intra-módulo:** 1) `ViveroLotCard` + `ViveroScreen` (fija `StatusBadge`, `Button`, `SearchBar`), 2) `ViveroDetailScreen` + secciones, 3) flujo de evento + `event/forms/`, 4) `ViveroLotAsignacionesTab` (PR propio por tamaño).

## 4. Mapa de reemplazos (mecánico)

Igual que Fase 2 (ver `FRONTEND_UI_PHASE2_TASK.md` §4): `<button …>` → `<Button variant=…>`,
inputs/selects/textareas → primitivas de `Field`, buscador → `SearchBar`, `<PageHeader>`.

### ⚠️ Tokens = alias exactos (swap seguro)

`neutral = colors.slate`, `success = colors.emerald`, `warning = colors.amber`,
`danger = colors.red`, `info = colors.sky`. Por tanto **`slate-→neutral-` y
`emerald-→success-` son idénticos byte a byte** (cero diff visual). `emerald-→brand-`
**sí** cambia el color (brand = verde bosque a medida) — usar solo si es intencional.

### Estados vs. **etapas** (dos dimensiones distintas)

`vivero` tiene DOS ejes de color:

1. **`estado_lote`** (`ACTIVO`/`FINALIZADO`) → ya sembrado en `status.ts`
   (`ACTIVO: success`, `FINALIZADO: neutral`). Usar `<StatusBadge status=… />`.
2. **Etapa/sub-etapa** (`INICIO`/`EMBOLSADO`/`ADAPTABILIDAD`/`DESPACHO`), hoy como
   literal inline en `ViveroLotCard`:
   ```ts
   INICIO: 'bg-sky-50 text-sky-700 border-sky-200'
   EMBOLSADO: 'bg-amber-50 text-amber-700 border-amber-200'
   FINALIZADO: 'bg-slate-50 text-slate-600 border-slate-200'
   ```
   Esto es una **paleta de etapa**, no un estado. Agregar esas claves al **registro único**
   `src/components/ui/status.ts` (una sola fuente) — mapeando a variantes (`INICIO→info`,
   `EMBOLSADO→warning`, etc., preservando color) — y renderizar con `<Badge>`/`<StatusBadge>`.
   No dejar el mapa literal en el componente.

## 5. Frontera "solo UI" — NO tocar

- `hooks/` (`useViveroLots`, `useViveroDetail`, `useViveroStats`, `useEmbolsado`),
  `services/`, `src/api/lotes-vivero.api.ts`, `mappers/lote.mapper.ts`,
  `types/contracts.ts`, `types/view-models.ts`, `contexts/nowContext.ts`.
- **`utils/stageFilters.ts`** (`buildBackendQueryForStageFilter`, `matchesStageFilter`),
  `utils/dispatchFlow.ts`, `utils/format.ts`, `utils/validators.ts` — lógica de dominio.
- **Protección de request obsoleto** (`requestIdRef` en `useViveroLots`): no tocar.
- Handlers, condiciones de render por estado/etapa, textos, enums, unidades: se mueven **sin modificarse**.
- Reglas del README (screens sin lógica pesada, mappers centralizan payload): respetarlas.

## 6. Gotchas

1. **`Button` es `type="button"` por defecto** → el envío de cada `event/forms/*` debe pasar `type="submit"` explícito.
2. **Barras/medidores data-driven** (`SurvivalBar`, `SubetapasBar`, `SaldoMeter`, `ProgressHeader`,
   `QuickPercentages`, `DispatchFlowCard`): el color codifica un **dato** (% supervivencia, saldo, avance),
   no un estado de dominio. Migrar el **nombre** del token (`emerald→success`, `slate→neutral`) pero
   **conservar la semántica** de la escala; **no** convertirlos a `<StatusBadge>`. Son mini-viz.
3. **No interpolar clases** (`bg-${etapa}-50`): la paleta de etapa va por el registro/props de variante.
4. **`HeroHeader`** tenía un hex fijo ya absorbido por `brand-950` en `tailwind.config.js`: usar el token.
5. **Controles a medida** (`CantidadStepper`, `CantidadInputCard`, `StageTabs`, `FiltersRow`): migrar tokens
   y, si calzan, expresarlos con `<Button variant="ghost">` / `<Chip>`; si el layout se rompe, documentar por qué quedan a medida.
6. **`PhotoUploader` / `GalleryModal`**: solo el *chrome* (botones, contenedores). La lógica de subida/preview intacta.
7. **`StatusBadge`:** estados/etapas nuevos → agregarlos a `status.ts` (una sola fuente), nunca un mapa nuevo en el módulo.

## 7. Criterios de aceptación (DoD)

- [ ] `grep -rn "slate-" src/modules/vivero` → **0** (migrado a `neutral-`).
- [ ] `grep -rn "emerald-" src/modules/vivero` → **0** (a `success-`, o `brand-` si fue decisión documentada).
- [ ] Ningún componente conserva mapas de color de estado/etapa inline; todo deriva de `status.ts` (o de `<Badge variant=…>` para las mini-viz data-driven).
- [ ] Los `.tsx` no usan `<button className="…">` de estilo (usan `<Button>`), salvo íconos puros documentados.
- [ ] `npm run build` verde · `npm run lint` sin errores nuevos.
- [ ] Revisión visual: lista+filtros de etapa, detalle, flujo de evento (cada form), asignaciones, galería, alta. Loading/empty/error/success incluidos.
- [ ] Diff **solo** de presentación de `vivero`. Cero cambios en `hooks/`, `services`, `mappers/`, `types/`, `utils/stageFilters.ts`, `utils/dispatchFlow.ts`, `contexts/`.

## 8. Verificación

```bash
npm run build && npm run lint
git diff --name-only | grep -E "service|api|mapper|hook|context|stageFilters|dispatchFlow|contracts|view-models" \
  && echo "REVISAR: se tocó lógica" || echo "OK: sin archivos de lógica"
grep -rn "slate-\|emerald-" src/modules/vivero && echo "REVISAR" || echo "OK: sin residuos de color"
```

## 9. Fuera de alcance

- `plantacion` → Fase 4 · `home`/`auth`/barrido final → Fase 5.
- Rediseño de timelines, medidores, flujo de evento o del layout. Estandarización, no rediseño.
- Refactors de arquitectura del módulo (ya es el más maduro): no mover capas.

## 10. Salida esperada

PR `refactor(ui): migrar vivero a la capa de primitivas (Fase 3)` (o varios PRs por el
orden de piloto del §3 — `ViveroLotAsignacionesTab` conviene en PR propio por tamaño).
