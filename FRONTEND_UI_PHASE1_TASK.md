# TASK — Estandarización UI Fase 1: migrar módulos CRUD a la capa `ui/`

> **Tipo:** Frontend · UI only (sin cambios de lógica)
> **Depende de:** Fase 0 (ya hecha) — tokens + `src/components/ui/`
> **Lee antes de empezar:** [`FRONTEND_UI_STANDARD.md`](./FRONTEND_UI_STANDARD.md) (§4 primitivas, §7 checklist, §8 verificación) y [`AGENTS.md`](./AGENTS.md).

---

## 1. Contexto

En Fase 0 se creó el estándar de UI: tokens semánticos en `tailwind.config.js`
(`brand`, `success`, `warning`, `danger`, `info`, `neutral`) y una capa de
primitivas en `src/components/ui/`:

`Button`, `Card`, `Badge`, `StatusBadge`, `Chip`, `SearchBar`, `PageHeader`
(variantes `compact` | `hero`), `Field` + `Input`/`Select`/`Textarea`, y el
registro único `status.ts`. Todo se importa desde `@/components/ui` (barrel `index.ts`).

Los módulos CRUD ya usan las primitivas viejas de `components/crud/` (`CrudHeader`,
`FormField`, `form-classes`, `SearchBar`). Esta tarea los mueve al estándar nuevo.

## 2. Objetivo

Migrar los 3 módulos CRUD para que **toda la presentación salga de la capa `ui/`**,
sin cambiar comportamiento. El resultado debe verse prácticamente igual (paridad visual).

## 3. Alcance — archivos a migrar

| Módulo | Archivos | Botones aprox. |
|---|---|---|
| `organizaciones` | `OrganizacionesScreen.tsx`, `NuevaOrganizacionScreen.tsx`, `EditarOrganizacionScreen.tsx`, `components/OrganizacionForm.tsx` | 10 |
| `comunidades` | `ComunidadesScreen.tsx`, `NuevaComunidadScreen.tsx`, `EditarComunidadScreen.tsx`, `SelectorComunidad.tsx` | 13 |
| `plantas` | `PlantasScreen.tsx`, `NuevaPlantaScreen.tsx`, `EditarPlantaScreen.tsx`, `components/PlantaForm.tsx`, `components/PlantSelector.tsx` | 12 |

> **Sugerencia:** hacer primero **`plantas`** como piloto (es representativo:
> tiene lista con búsqueda, form grande y selector), abrir PR/revisión de ese
> diff, y luego replicar el mismo patrón en `organizaciones` y `comunidades`.

## 4. Mapa de reemplazos (mecánico)

| Patrón actual | Reemplazar por |
|---|---|
| `<button className="…bg-brand-…">Guardar</button>` | `<Button variant="primary" size="md">Guardar</Button>` |
| Botón secundario (borde/ghost) | `<Button variant="secondary">` / `variant="ghost"` |
| Botón destructivo (`bg-red-…`) | `<Button variant="danger">` |
| `import CrudHeader from '…/crud/CrudHeader'` | `<PageHeader variant="compact" … />` desde `ui/` |
| `import FormField from '…/crud/FormField'` | `import { Field } from '@/components/ui'` (misma API) |
| `<input className={inputClasses(err)} />` | `<Input error={!!err} … />` |
| `<select>` con `selectWrapperClasses` | `<Select error={!!err}>` |
| `import SearchBar from '…/crud/SearchBar'` | `import { SearchBar } from '@/components/ui'` |
| Píldora de estado literal (`bg-emerald-50 text-emerald-700 …`) | `<StatusBadge status={estado} label={…} />` |
| `emerald-*` decorativo suelto | token `success-*` (si es estado) o `brand-*` (si es decorativo) |
| `slate-*` | `neutral-*` |
| Radios/sombras fuera de convención | normalizar (§3.3 del estándar) |

### Ejemplo antes/después

```tsx
// ANTES
<button
  type="submit"
  disabled={submitting}
  className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 disabled:opacity-60"
>
  {submitting ? 'Guardando…' : 'Guardar'}
</button>

// DESPUÉS
<Button type="submit" variant="primary" fullWidth loading={submitting}>
  Guardar
</Button>
```

## 5. Frontera "solo UI" — NO tocar

- `hooks/`, `services/`, `src/api/`, `mappers/`, `contexts/`, `validators/`, utils de dominio.
- Handlers (`onClick`, `onSubmit`, `onChange`): se mueven al nuevo componente **sin modificarlos**.
- Condiciones de render ligadas a dominio (`disabled` por estado, `estado === 'VALIDADO' && …`): se preservan tal cual.
- Textos, labels, enums, unidades.

## 6. Gotchas

1. **`Button` usa `type="button"` por defecto.** Los botones que envían formularios
   **deben** pasar `type="submit"` explícito (antes lo tomaban por defecto del `<button>` nativo).
2. **No interpolar clases de Tailwind** (`bg-${x}-50`): usar las props de variante de las primitivas.
3. **Imports:** preferir el barrel `@/components/ui`. No importar archivos sueltos salvo necesidad.
4. **`FormField` → `Field`:** la API es la misma (`label`, `required`, `error`, `hint`).
   Al terminar, ningún archivo CRUD debería seguir importando de `components/crud/`.
5. **`StatusBadge`:** si aparece un estado que aún no está en `src/components/ui/status.ts`,
   agregarlo ahí (una sola fuente), no crear un mapa nuevo en el módulo.

## 7. Criterios de aceptación (DoD)

- [ ] Los 13 archivos del §3 no contienen `<button className="…">` de estilo (usan `<Button>`), salvo casos justificados (íconos puros muy específicos) documentados en el PR.
- [ ] Ningún archivo CRUD importa desde `components/crud/` (todo viene de `components/ui/`).
- [ ] Búsqueda `grep -rn "emerald-" src/modules/{organizaciones,comunidades,plantas}` → **0** resultados.
- [ ] Búsqueda `grep -rn "slate-" src/modules/{organizaciones,comunidades,plantas}` → 0 (o migrado a `neutral-`).
- [ ] Estados se muestran con `<StatusBadge>` / `<Badge>`, no con strings de color inline.
- [ ] `npm run build` verde (typecheck + bundle).
- [ ] `npm run lint` sin errores nuevos (las 2 advertencias previas de `comunidades` pueden quedar; idealmente resolverlas si se tocan esos `useEffect`, pero **no** es parte de esta tarea).
- [ ] Revisión visual: listar/crear/editar/eliminar en cada módulo se ve y se comporta igual (loading, empty, error, success incluidos).
- [ ] Diff contiene **solo** archivos de presentación (`.tsx`) de estos 3 módulos. Cero cambios en `*.service.ts`, `*.api.ts`, `*.mapper.ts`, `hooks/`, `contexts/`.

## 8. Verificación

```bash
npm run build        # tsc -b && vite build
npm run lint         # eslint .
# scope check — no debe haber lógica tocada:
git diff --name-only | grep -E "service|api|mapper|hook|context|validator" || echo "OK: sin archivos de lógica"
```

## 9. Fuera de alcance

- Módulos de dominio (`vivero`, `plantacion`, `recolecciones`, `home`, `auth`) → Fases 2–5.
- Consolidar los 6 mapas de estado→color de los módulos de dominio (se hace al migrar cada uno).
- Hallazgos de dominio del `FRONTEND_AUDIT.md` (AUD-006, AUD-009, AUD-011, …) → no se tocan aquí.
- Rediseño visual / cambios de layout. Esto es estandarización, no rediseño.

## 10. Salida esperada

Un PR titulado `refactor(ui): migrar módulos CRUD a la capa de primitivas (Fase 1)`
con los 3 módulos migrados (o 3 PRs, uno por módulo, si se prefiere revisar por partes).
