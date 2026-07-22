# TASK — Estandarización UI Fase 5 (final): pantallas restantes + barrido global

> **Tipo:** Frontend · UI only (sin cambios de lógica)
> **Depende de:** Fases 0–4 (hechas) — tokens, capa `src/components/ui/`, módulos CRUD / recolecciones / vivero / plantacion migrados a las primitivas.
> **Lee antes de empezar:** [`FRONTEND_UI_STANDARD.md`](./FRONTEND_UI_STANDARD.md) (§3 tokens, §4 primitivas, §5 registro de estado, §7 checklist, §8 verificación) y [`AGENTS.md`](./AGENTS.md).

---

## 1. Contexto

La app ya tiene tokens semánticos (`brand`, `success`, `warning`, `danger`, `info`,
`neutral`) y la capa `src/components/ui/` (`Button`, `Card`, `Badge`, `StatusBadge`,
`Chip`, `SearchBar`, `PageHeader`, `Field`/`Input`/`Select`/`Textarea`, registro
`status.ts`). Los módulos de las fases 1–4 ya consumen esas primitivas.

Falta cerrar el círculo: **(A)** las pantallas que nunca entraron en una fase, y
**(B)** un barrido global que elimina los residuos que quedaron sueltos (hex fijos,
colores one-off, mapas de estado inline) y retira la capa vieja `components/crud/`.

> **Nota de imports:** el repo **no** tiene alias `@/`. Importar desde la capa de UI
> con ruta relativa, p. ej. `import { Button, PageHeader } from '../../../components/ui'`.

## 2. Objetivo

Dejar **un solo vocabulario visual** en todo `src/`: cero hex de color sueltos,
cero colores fuera de los tokens, un único registro estado→color, y `components/crud/`
retirado. Sin cambios de comportamiento (paridad visual).

---

## PARTE A — Migrar pantallas/áreas restantes

### A.1 Alcance

| Área | Archivos | Notas |
|---|---|---|
| `home` | `HomeScreen.tsx` | 6 botones, 1 emerald |
| `auth` | `LoginScreen.tsx`, `RecoverScreen.tsx`, `RegisterScreen.tsx` | 6 botones. **Ojo:** no tocar el flujo mock de `RegisterScreen` (AUD-011), solo su presentación |
| `map` | `MapScreen.tsx` | 2 botones + control leaflet |
| `user_profile` | `CompleteProfileScreen.tsx`, `perfil.tsx`, `components/AvatarUpload.tsx` | 6 botones, 2 emerald |
| `layouts` | `AppLayout.tsx` (2 hex), `AuthLayout.tsx` (5 hex, 2 emerald, 1 one-off) | Shells globales |
| `components/` compartidos | `BottomNav.tsx` (5 btn), `MenuLateral.tsx` (3 btn), `ConfirmDialog.tsx` (2 btn), `PwaInstallPrompt.tsx` (2 btn) | Nav e infra; migrar botones e hex a primitivas/tokens |

### A.2 Mapa de reemplazos (igual que fases previas)

| Patrón actual | Reemplazar por |
|---|---|
| `<button className="…bg-brand-…">` | `<Button variant="primary\|secondary\|ghost\|danger" size=…>` |
| Header propio de pantalla | `<PageHeader variant="compact" … />` |
| `<input>`/`<select>`/`<textarea>` con clases inline | `<Field>` + `<Input/Select/Textarea>` |
| Píldora de estado inline | `<StatusBadge status={…} />` o `<Badge variant=…>` |
| `bg-[#hex]`, `text-[#hex]`, gradientes `from-[#hex]` | token más cercano (`bg-brand-950`, `from-brand-950`, etc.) |
| `emerald-*` | `success-*` (estado) o `brand-*` (decorativo) |
| `slate-*` | `neutral-*` |

---

## PARTE B — Barrido global final (consolidación)

Estos ítems tocan archivos de **todos** los módulos, incluidos los ya migrados en
fases 1–4 (quedaron residuos). Es el paso de limpieza final del estándar.

### B.1 Eliminar hex de color fijos → tokens

~30 archivos aún tienen `bg-[#…]` / `text-[#…]` / `from-[#…]`. Objetivo: **0**.

```bash
grep -rlE "\b(bg|text|border|ring|from|to|via)-\[#" src --include="*.tsx"
```

Mapear cada hex al token más cercano (el verde oscuro `#002b15` → `brand-950`, ya
existe). Si aparece un color que no encaja en ningún token, consultarlo en el PR
antes de inventar uno nuevo.

### B.2 Eliminar colores one-off → tokens

Aún se usan crudos: `emerald` (38), `blue` (43), `sky` (19), `green` (12),
`orange` (9), `teal` (3), `yellow` (3), `gray` (2), `lime` (1), y `cyan`. Objetivo: **0**
(salvo excepción documentada). Reasignación sugerida:

| One-off | Token |
|---|---|
| `emerald`, `green`, `lime`, `teal` | `success` (estado) o `brand` (marca) |
| `blue`, `sky`, `cyan` | `info` |
| `amber`, `yellow`, `orange` | `warning` |
| `gray`, `zinc`, `stone`, `slate` | `neutral` |

```bash
grep -rlE "(bg|text|border|ring|from|to)-(emerald|cyan|green|teal|lime|orange|yellow|blue|gray|zinc|stone)-[0-9]" src --include="*.tsx"
```

> `slate → neutral` son **valores idénticos** (alias): es un find/replace seguro y
> puramente cosmético; puede hacerse en bloque con revisión. Es el grupo más grande (~330).

### B.3 Consolidar mapas estado→color en el registro único

Varios módulos aún definen su propio mapa estado→clase en vez de usar
`src/components/ui/status.ts` (`statusVariant` / `<StatusBadge>`). Migrar cada uno:
mover el mapeo estado→**variante** al registro central (si falta un estado, agregarlo
ahí una sola vez) y renderizar con `<StatusBadge>` / `<Badge>`.

Candidatos principales (verificar y consolidar):
`recolecciones/recoleccionStatus.ts`, `vivero/utils/dispatchFlow.ts`,
`vivero/components/ViveroLotCard.tsx`, `vivero/components/StageTimeline.tsx`,
`plantacion/utils/dashboardAggregates.ts`, y demás listados por:

```bash
grep -rlnE "bg-(emerald|amber|red|slate|cyan|blue|sky)-[0-9]+ text-" src/modules --include="*.tsx" --include="*.ts"
```

> Solo se centraliza el **color**. La etiqueta de texto y la resolución del estado
> siguen viviendo en los mappers de cada módulo.

### B.4 Retirar `components/crud/`

Hoy `components/crud/` (`CrudHeader`, `FormField`, `SearchBar`, `form-classes`,
`FlashMessage`, `ImageUploader`) sigue siendo importado por `organizaciones`,
`comunidades` y `plantas` (11 archivos). Pasos:

1. Cambiar esos imports a la capa `ui/`: `CrudHeader→PageHeader`, `FormField→Field`,
   `SearchBar→ui/SearchBar`.
2. Mover `form-classes.ts` a `src/components/ui/` y actualizar el import de `ui/Field.tsx`
   (hoy hace `import { inputClasses } from '../crud/form-classes'`).
3. Promover `FlashMessage` a `ui/` (quitarle el `emerald` → `success`).
4. `ImageUploader`: mover a `ui/` o dejar donde está si no aplica al estándar (documentar).
5. Borrar los archivos de `components/crud/` que queden sin usar.

```bash
grep -rln "components/crud" src   # objetivo: 0
```

---

## 3. Frontera "solo UI" — NO tocar

- `hooks/`, `services/`, `src/api/`, `mappers/`, `contexts/`, `validators/`, utils de dominio (excepto mover el **color** de un mapa estado→variante en B.3).
- Handlers (`onClick`, `onSubmit`, `onChange`): se mueven al nuevo componente sin modificarlos.
- Condiciones de render ligadas a dominio (`disabled` por estado, `estado === 'VALIDADO' && …`): se preservan.
- Textos, labels, enums, unidades. **No** tocar el flujo mock de `RegisterScreen` (es hallazgo de seguridad AUD-011, va aparte).

## 4. Gotchas

1. `Button` usa `type="button"` por defecto → los que envían formularios necesitan `type="submit"`.
2. No interpolar clases Tailwind (`bg-${x}-50`): usar props de variante.
3. Imports relativos a `../components/ui` (no hay alias `@/`).
4. `map`: el contenedor Leaflet y sus controles pueden tener estilos propios; migrar solo lo que es UI de la app, no romper el render del mapa.
5. Si un color no encaja en ningún token, **preguntar** en el PR — no crear tokens nuevos sin acordar.

## 5. Criterios de aceptación (DoD)

- [ ] Parte A: las pantallas/áreas del §A.1 usan primitivas (`Button`, `PageHeader`, `Field`, `StatusBadge`) para su presentación.
- [ ] `grep -rlE "\b(bg|text|border|ring|from|to|via)-\[#" src --include="*.tsx"` → **0** (o excepciones documentadas en el PR).
- [ ] `grep -rlE "(bg|text|border|ring|from|to)-(emerald|cyan|green|teal|lime|orange|yellow|blue|gray|zinc|stone)-[0-9]" src --include="*.tsx"` → **0** (o excepciones documentadas).
- [ ] `grep -rln "components/crud" src` → **0**; carpeta `components/crud/` eliminada.
- [ ] Un único registro estado→color (`src/components/ui/status.ts`); no quedan mapas de color de estado inline en módulos.
- [ ] `npm run build` verde (typecheck + bundle).
- [ ] `npm run lint` sin errores (resolver, si se tocan, las 2 advertencias de `useEffect` en `comunidades`).
- [ ] Revisión visual de cada área: se ve y se comporta igual (loading/empty/error/success, nav, mapa, login).
- [ ] Diff solo de presentación: sin cambios en `*.service.ts`, `*.api.ts`, `*.mapper.ts`, `hooks/`, `contexts/`, `validators/` (salvo el color movido en B.3).

## 6. Verificación

```bash
npm run build
npm run lint
# gates del barrido:
grep -rlE "\b(bg|text|border|ring|from|to|via)-\[#" src --include="*.tsx" | wc -l   # -> 0
grep -rlE "(bg|text|border|ring|from|to)-(emerald|cyan|green|teal|lime|orange|yellow|blue|gray|zinc|stone)-[0-9]" src --include="*.tsx" | wc -l   # -> 0
grep -rln "components/crud" src | wc -l   # -> 0
# scope check (no lógica tocada):
git diff --name-only | grep -E "service|api|mapper|hook|context|validator" || echo "OK: sin archivos de lógica"
```

## 7. Fuera de alcance

- Rediseño visual o cambios de layout. Esto es estandarización, no rediseño.
- Hallazgos de dominio/seguridad de `FRONTEND_AUDIT.md` (AUD-006, AUD-009, AUD-011, AUD-012, …).
- Migrar el mapa Leaflet a otra librería o cambiar sus interacciones.

## 8. Salida esperada

PR `refactor(ui): pantallas restantes + barrido global final (Fase 5)`.
Opcional: separar en 2 PRs — **A)** pantallas restantes, **B)** barrido/consolidación —
si se prefiere revisar el barrido global (que toca muchos archivos) por separado.

### Sugerencia de asignación

- Si querés un solo dev: asignar A + B completo.
- Si querés paralelizar/reducir riesgo de revisión: **Parte A** a un dev (acotado a
  las pantallas nuevas) y **Parte B** como ticket de limpieza aparte, ya que toca
  archivos de módulos de otras fases.
