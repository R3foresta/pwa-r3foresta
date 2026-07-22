# TASK — Estandarización UI Fase 4: migrar `plantacion` a la capa `ui/`

> **Tipo:** Frontend · UI only (sin cambios de lógica)
> **Depende de:** Fase 0 (tokens + `src/components/ui/`). Fases 1–3 son referencia de patrón.
> **Lee antes de empezar:** [`FRONTEND_UI_STANDARD.md`](./FRONTEND_UI_STANDARD.md) (§4 primitivas, §5 estados, §7 checklist, §8 verificación), [`FRONTEND_UI_PHASE3_TASK.md`](./FRONTEND_UI_PHASE3_TASK.md) (patrón + gotchas de mini-viz) y [`AGENTS.md`](./AGENTS.md).

---

## 1. Contexto

`plantacion` es el módulo **más pesado en presentación** de toda la app: 25 archivos
`.tsx` pero con pantallas enormes (`CampaniaAdminDashboardScreen` 1686, `DetalleSubcampanaScreen`
1316, `PlantacionDashboardScreen` 1139, `RegistrarPlantacionScreen` 983, `CrearSubcampanaScreen` 871).
**0 imports** de `components/ui/`/`components/crud/`, **~245 `slate-*`**, **~88 `emerald-*`** y
**~119 botones** (el mayor conteo de la app).

Tiene dos sub-áreas: (a) **campañas/subcampañas** (CRUD + dashboards admin + wizard de
subcampaña: Equipo → Especies → Polígono → Resumen) y (b) **registro de plantación**
(`components/registro/*`) con **GPS** y **mapa de polígono** (Leaflet).

> **Por tamaño, esta fase se entrega en VARIOS PRs** (ver §3). No intentar un solo PR.

## 2. Objetivo

Migrar toda la **presentación** a la capa `ui/`, sin cambiar comportamiento. Paridad visual.
Excepción esperable: colores de **gráficos** (donut de campañas) se mantienen como hex de dato
(ver §4), no se convierten a badges.

## 3. Alcance — archivos y PRs sugeridos

| PR sugerido | Archivos | Notas |
|---|---|---|
| PR-A · Campaña CRUD | `screens/CrearCampanaScreen.tsx` (220), `EditarCampanaScreen.tsx` (291), `components/CrearCampaniaForm.tsx` (443), `components/SelectorCampania.tsx` (212) | piloto: fija el patrón |
| PR-B · Dashboards | `screens/PlantacionDashboardScreen.tsx` (1139), `CampaniaAdminDashboardScreen.tsx` (1686) | **donut/agregados = charts**, ver §4/§6 |
| PR-C · Wizard subcampaña | `screens/CrearSubcampanaScreen.tsx` (871), `components/Subcampania{EquipoStep,EquipoManager,EspeciesStep,PolygonStep,ResumenStep,SuccessOverlay,OperativasSheet}.tsx`, `CatalogoEspeciesPicker.tsx`, `CancelarSubcampaniaModal.tsx` | `PolygonStep` = **mapa Leaflet** |
| PR-D · Registro + detalle | `screens/RegistrarPlantacionScreen.tsx` (983), `DetalleSubcampanaScreen.tsx` (1316), `components/registro/*` (`WizardHeader`, `StepFooter`, `SpeciesCounterRow`, `SummaryRow`, `GpsStatusCard`, `SuccessOverlay`), `UserAvatar.tsx` | **GPS** + contadores |

**25 archivos `.tsx`, ~119 botones.** (Confirmar con `find src/modules/plantacion -name '*.tsx'`.)

## 4. Mapa de reemplazos (mecánico)

Igual que Fases 2–3: `<button …>` → `<Button variant=…>`, inputs/selects/textareas →
primitivas de `Field`, buscador → `SearchBar`, `<PageHeader>`.

### ⚠️ Tokens = alias exactos (swap seguro)

`neutral = colors.slate`, `success = colors.emerald`, `warning = colors.amber`,
`danger = colors.red`, `info = colors.sky`. **`slate-→neutral-` y `emerald-→success-`
son idénticos byte a byte** (cero diff). `emerald-→brand-` cambia el color (verde bosque) —
solo si es intencional.

### Estado de campaña + **charts** (`utils/dashboardAggregates.ts`)

`ESTADO_CAMPANIA_META` mapea cada estado a **tres** cosas:
```ts
{ tone: 'bg-emerald-50 text-emerald-800 ring-emerald-100', // ← BADGE
  dot:  'bg-emerald-500',                                   // ← punto de leyenda
  color:'#10b981' }                                         // ← HEX del donut
```
- **`tone`** (píldora de estado): reemplazar por `<StatusBadge status=… label=… />`. Agregar las claves
  de `EstadoCampania` que falten a `src/components/ui/status.ts` (una sola fuente).
- **`dot` / `color`** (donut + leyenda del chart): **se quedan como dato de visualización.**
  Los charts necesitan hex explícito; no se expresan con variantes de `Badge`. Idealmente
  tomar el hex desde el token, pero **unificar la paleta del chart está fuera de alcance** aquí.
- **No borrar `ESTADO_CAMPANIA_META`**: podarle solo el uso de `tone` como clase suelta; conservar `color`/`dot`.

## 5. Frontera "solo UI" — NO tocar

- `hooks/usePlantacionContext.ts` (estado compartido de wizards) y toda `utils/`
  (`crearCampaniaForm`, `dashboardAggregates` salvo la poda de `tone`, `geo`,
  `resolverDetallesAsignacion`, `subcampaniaDraft`, `subcampaniaFormatters`, `userAvatar`),
  `types/contracts.ts`.
- **Mapa Leaflet** de `SubcampaniaPolygonStep` (dibujo de polígono, capas, geo) y **GPS**
  de `GpsStatusCard`: solo el *chrome* alrededor (botones, headers, campos), no la lógica de mapa/GPS.
- **Cálculos del donut/agregados** en dashboards: intactos; solo se restylan contenedores/labels/botones.
- Handlers, condiciones de render por dominio, textos, enums, unidades: se mueven **sin modificarse**.

## 6. Gotchas

1. **`Button` es `type="button"` por defecto** → los avances/envíos de los wizards
   (subcampaña y registro) que dependían del `<button>` nativo deben pasar `type="submit"` explícito.
2. **Charts (donut de campañas, agregados):** el color es **dato**, no estado — mantener hex
   (`ESTADO_CAMPANIA_META.color/dot`). No convertir a `<StatusBadge>`.
3. **No interpolar clases** (`bg-${estado}-50`): estado→badge por el registro.
4. **Overlays/modales** (`SubcampaniaSuccessOverlay`, `registro/SuccessOverlay`, `CancelarSubcampaniaModal`):
   botones → `<Button>`; no tocar montaje/estado del overlay.
5. **Volumen:** 245 `slate-` + 119 botones. El swap `slate-→neutral-` es seguro (alias), pero por
   tamaño conviene hacerlo **por PR/pantalla** y revisar cada diff, no un find/replace global de una sola pasada.
6. **Controles a medida** (`SpeciesCounterRow`, `SummaryRow`, `StepFooter`, `WizardHeader`, `UserAvatar`,
   `SelectorCampania`): migrar tokens; expresar con `<Button>`/`<Chip>`/`<Field>` donde calce, documentar lo que quede a medida.
7. **`StatusBadge`:** estados nuevos → a `status.ts` (una sola fuente).

## 7. Criterios de aceptación (DoD)

- [ ] `grep -rn "slate-" src/modules/plantacion` → **0** (migrado a `neutral-`).
- [ ] `grep -rn "emerald-" src/modules/plantacion` → **0** en `.tsx` (a `success-`/`brand-`); en `dashboardAggregates.ts` el hex del chart (`#10b981`, etc.) **puede** permanecer y se documenta.
- [ ] `ESTADO_CAMPANIA_META` conserva `color`/`dot` (charts) y ya no se usa `tone` como clase suelta (badges vía `<StatusBadge>`).
- [ ] Los `.tsx` no usan `<button className="…">` de estilo (usan `<Button>`), salvo íconos puros documentados.
- [ ] `npm run build` verde · `npm run lint` sin errores nuevos.
- [ ] Revisión visual por área: campaña CRUD, ambos dashboards (donut incluido), wizard de subcampaña (incl. mapa de polígono), registro (incl. GPS) y detalle. Loading/empty/error/success incluidos.
- [ ] Diff **solo** de presentación de `plantacion` (+ poda de `tone` en `dashboardAggregates`). Cero cambios en `hooks/`, `types/`, `utils/geo`, `utils/subcampania*`, lógica de mapa/GPS.

## 8. Verificación

```bash
npm run build && npm run lint
git diff --name-only | grep -E "hook|context|contracts|geo|resolverDetalles|subcampaniaDraft|Formatters" \
  && echo "REVISAR: se tocó lógica" || echo "OK: sin archivos de lógica"
grep -rn "slate-\|emerald-" src/modules/plantacion --include='*.tsx' && echo "REVISAR" || echo "OK: sin residuos en .tsx"
```

## 9. Fuera de alcance

- `home`/`auth`/barrido final → Fase 5.
- Unificar la paleta hex de los charts con los tokens (se hace en un pase de dataviz aparte).
- Rediseño de dashboards, wizards, mapa o GPS. Estandarización, no rediseño.

## 10. Salida esperada

**Varios PRs** `refactor(ui): migrar plantacion … (Fase 4)` siguiendo PR-A → PR-D del §3.
Cada PR menciona qué áreas cubre y confirma que los charts conservan su hex de dato.
