# FRONTEND_UI_STANDARD.md — Estándar de UI R3foresta

## 0. Estado de este documento

- Tipo: **propuesta / spec** para revisión previa a implementación.
- Alcance: **solo UI (presentación)**. Cero cambios de lógica.
- Enfoque acordado: **foundation-first** — primero tokens + capa de primitivas, luego migración módulo por módulo.
- Relación con otros docs: complementa `FRONTEND_GUIDE.md` (cómo construir) y `FRONTEND_AUDIT.md` (deuda). No reemplaza `AGENTS.md` ni `DOMAIN_INDEX.md`.

> Regla base: si esta guía y una regla de negocio oficial entran en conflicto, prevalece la regla de negocio. Este estándar nunca justifica cambiar comportamiento.

---

## 1. Problema que resuelve

Hoy la UI no está estandarizada. Hallazgos de la revisión estática (121 archivos `.tsx`):

| Síntoma | Medición |
|---|---|
| No existe componente `Button` | 292 `<button>`; solo los botones primarios son **73 instancias en 50 strings de clase distintos** |
| No existe `Card` / `Badge` / `Input` reutilizable | 13 componentes `*Card` propios de cada módulo; 67 `<input>` crudos, solo **5 archivos** usan `inputClasses` |
| Dos verdes en competencia | `brand-*` (1372 usos) vs `emerald-*` (296 usos en 50+ archivos) + hex fijo `bg-[#002b15]` en `HeroHeader.tsx` |
| Dos sistemas de header | 9 pantallas usan `CrudHeader`; **11 pantallas** arman su propio hero `rounded-b-3xl` |
| Radios inconsistentes | Sistema real `2xl`/`3xl`/`full` (957) pero se filtran `xl` (75), `rounded` (22), `md`, `lg` |
| Mapa estado→color duplicado | Definido en **6 archivos** distintos |
| Sombras (lo bueno) | `shadow-soft` domina (441): ya es consistente |

Causa raíz: hay **dos mundos paralelos**. Los módulos CRUD (`organizaciones`, `comunidades`, `plantas`) comparten primitivas (`form-classes.ts`, `FormField`, `CrudHeader`, `SearchBar`). Los módulos de dominio (`vivero`, `plantacion`, `recolecciones`, `home`, `auth`) reimplementan todo inline.

---

## 2. Principios

1. **Un solo vocabulario.** Todo color, radio, sombra y control sale de un token o de una primitiva. Nada de hex sueltos ni `emerald-*` crudo en pantallas.
2. **Primitivas sobre clases inline.** Si un elemento se repite (botón, card, badge, input, header), se consume como componente, no como string de Tailwind copiado.
3. **Paridad visual.** La migración busca que el resultado se vea prácticamente igual al actual. No es un rediseño. Los tokens semánticos se alinean con los valores ya usados para no desplazar la estética.
4. **Cero cambios de lógica.** No se tocan hooks, services, api, mappers, contexts, validaciones ni handlers. Solo cambia JSX de presentación, `className`, y archivos nuevos en `components/ui/`.
5. **Semántica por intención.** Los tokens se nombran por rol (`success`, `warning`, `danger`), no por color crudo. Eso permite futuros ajustes desde un solo lugar.

---

## 3. Design tokens

### 3.1 Paleta semántica

Se mantiene `brand` como verde primario y se **nombran por intención** los demás roles. Para preservar paridad visual, los roles semánticos se alían a los valores que la UI ya usa hoy.

| Token | Rol | Origen (valores actuales) | Notas |
|---|---|---|---|
| `brand` | Verde primario: acciones, headers, navegación | escala `brand` 50–900 existente | Se añade `brand-950: #002b15` para absorber el hex del hero sin cambiar el look |
| `success` | Estados positivos: ACTIVO, VALIDADO, saldo vivo, supervivencia | alias de `emerald` | Solo para **estado**, no decoración. Verde decorativo usa `brand` |
| `warning` | Advertencia, subetapa, atención | alias de `amber` | |
| `danger` | Error, destructivo, RECHAZADO | alias de `red` | |
| `info` | Informativo neutro (absorbe `blue`/`sky` sueltos) | alias de `sky` | |
| `neutral` | Texto, bordes, superficies grises | alias de `slate` | Migra los `gray-*` sueltos (2) |

Colores a **eliminar** (one-offs, ~40 usos): `green`, `teal`, `lime`, `orange`, `yellow`, `zinc`, `stone`. Cada uno se reasigna al token semántico más cercano, caso por caso, en la migración.

### 3.2 `tailwind.config.js` propuesto

```js
import colors from 'tailwindcss/colors'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f6f2', 100: '#d9e8dd', 200: '#b8d2c2', 300: '#8fb89e',
          400: '#5f9a78', 500: '#1f613b', 600: '#164d2f', 700: '#0f3b23',
          800: '#0c2e1c', 900: '#08140f',
          950: '#002b15', // absorbe el hex del HeroHeader
        },
        success: colors.emerald,
        warning: colors.amber,
        danger:  colors.red,
        info:    colors.sky,
        neutral: colors.slate,
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
```

> Decisión abierta a tu criterio: mantener **dos verdes** (`brand` + `success`=emerald) preserva la estética actual exacta. Colapsar a un solo verde (emerald → brand) es más “puro” pero **sí cambia el matiz** en ~50 archivos. La propuesta por defecto conserva ambos por paridad visual.

### 3.3 Radio, sombra, espaciado

| Convención | Regla |
|---|---|
| Radio contenedores / cards | `rounded-3xl` |
| Radio controles (botón, input, chip) | `rounded-2xl` |
| Radio píldoras / avatares | `rounded-full` |
| Retirar | `rounded-xl`, `rounded-lg`, `rounded-md`, `rounded` a secas en cards/controles |
| Sombra elevación normal | `shadow-soft` |
| Sombra overlay / modal | `shadow-2xl` |
| Shell de pantalla | `px-4` (o `px-5`) + `space-y-*` entre secciones |

### 3.4 Tipografía

Escala mínima con `font-display` (Manrope):

| Uso | Clases |
|---|---|
| Título de pantalla | `text-2xl font-semibold tracking-tight` |
| Hero title | `text-3xl/`+ `font-black tracking-tight` |
| Eyebrow / label | `text-xs font-semibold uppercase tracking-[0.2em]` |
| Cuerpo | `text-sm font-medium` |
| Caption / hint | `text-xs font-medium` |

---

## 4. Capa de primitivas — `src/components/ui/`

Cada primitiva reemplaza N variantes inline por un puñado de props. Todas tipadas, sin lógica de dominio.

### 4.1 `Button`

Reemplaza los 50 strings de botón primario y demás variantes.

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'  // default 'primary'
  size?: 'sm' | 'md' | 'lg'                                 // default 'md'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: IconName
  rightIcon?: IconName
} & React.ButtonHTMLAttributes<HTMLButtonElement>
```

| variant | Look (derivado de lo existente) |
|---|---|
| `primary` | `bg-brand-600 text-white shadow-soft hover:bg-brand-700` |
| `secondary` | `bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50` |
| `ghost` | `text-brand-700 hover:bg-brand-50` |
| `danger` | `bg-danger-600 text-white hover:bg-danger-700` |

| size | Padding / texto |
|---|---|
| `sm` | `px-3 py-2 text-xs font-bold` |
| `md` | `px-4 py-3 text-sm font-semibold` |
| `lg` | `px-4 py-4 text-base font-extrabold` |

Reglas fijas: `rounded-2xl`, `transition`, `disabled:cursor-not-allowed disabled:opacity-60`, `loading` deshabilita + muestra spinner. **Preservar** siempre el `disabled`/`onClick` existente (muchos dependen de reglas de dominio).

### 4.2 `Card`

Unifica el shell de los 13 `*Card`. Los `*Card` de dominio se quedan como componentes, pero **envuelven** `<Card>` en vez de repetir el shell.

```tsx
type CardProps = {
  padding?: 'none' | 'sm' | 'md' | 'lg'   // default 'md' (p-4)
  as?: 'div' | 'section' | 'article'
} & React.HTMLAttributes<HTMLElement>
// Base: rounded-3xl bg-white shadow-soft ring-1 ring-black/5
```

### 4.3 `Badge` y `StatusBadge`

```tsx
type BadgeProps = {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  size?: 'sm' | 'md'
  children: ReactNode
}
// StatusBadge traduce un estado de dominio → variant vía el registro (§5)
function StatusBadge({ status }: { status: DomainStatus })
```

Base badge: `inline-flex items-center gap-1 rounded-full font-semibold`, colores `bg-{variant}-50 text-{variant}-700 ring-1 ring-{variant}-100`.

### 4.4 `Field`, `Input`, `Select`, `Textarea`

Formaliza lo que ya existe en `form-classes.ts` + `FormField.tsx` y lo extiende al resto de módulos.

```tsx
<Field label="Especie" required error={err} hint="Nombre común">
  <Input value={...} onChange={...} error={!!err} />
</Field>
```

`Input`/`Select`/`Textarea` consumen `inputClasses(hasError)` existente. `Field` = `FormField` promovido a `ui/`. No cambia validación: `error`/`hint` siguen viniendo del hook.

### 4.5 `PageHeader`

Unifica **`CrudHeader` + `HeroHeader`** en un componente con dos variantes.

```tsx
type PageHeaderProps = {
  variant?: 'compact' | 'hero'   // default 'compact'
  eyebrow?: string
  title: string
  subtitle?: string
  backTo?: string
  rightSlot?: ReactNode
  // solo hero:
  media?: string | null          // imagen de fondo
  badge?: ReactNode              // píldora de estado
  metric?: { label: string; value: ReactNode }
}
```

- `compact` = comportamiento actual de `CrudHeader`.
- `hero` = comportamiento actual de `HeroHeader` (fondo `brand-950`, gradiente, botón volver, píldora estado, cifra). El hex `#002b15` pasa a `brand-950`; `emerald`/`amber` de las píldoras pasan a `success`/`warning`.

### 4.6 Promover existentes

`SearchBar`, `Chip`, `FlashMessage`, `ConfirmDialog` se mueven/reexportan desde `ui/` para que todos los módulos (no solo CRUD) los usen. `src/components/crud/` puede reexportar desde `ui/` durante la transición para no romper imports.

### 4.7 Índice de la carpeta

```
src/components/ui/
  index.ts          // barrel export
  Button.tsx
  Card.tsx
  Badge.tsx
  StatusBadge.tsx
  Field.tsx         // + Input, Select, Textarea
  PageHeader.tsx
  Chip.tsx
  SearchBar.tsx     // promovido
  status.ts         // registro estado→variant (§5)
  tokens.ts         // constantes de clases compartidas si hace falta
```

---

## 5. Registro único de estado → color

Reemplaza los 6 mapas duplicados (`recoleccionStatus.ts`, `lote.mapper.ts`, `dispatchFlow.ts`, `stageFilters.ts`, `ViveroLotCard.tsx`, `dashboardAggregates.ts`).

```ts
// src/components/ui/status.ts
export type BadgeVariant = 'brand'|'success'|'warning'|'danger'|'neutral'|'info'

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // Recolección
  BORRADOR: 'neutral', PENDIENTE_VALIDACION: 'warning',
  VALIDADO: 'success', RECHAZADO: 'danger',
  ABIERTO: 'success', CERRADO: 'neutral',
  // Vivero
  ACTIVO: 'success', FINALIZADO: 'neutral',
  // ...completar desde los enums de contracts al migrar
}
```

Importante: esto **solo** centraliza el color del badge (presentación). Las etiquetas de texto y la lógica de qué estado aplica siguen viviendo en sus mappers de dominio.

---

## 6. Plan de migración (por fases)

Cada fase es un cambio revisable por separado. `npm run build` y `npm run lint` deben quedar verdes al cerrar cada una.

| Fase | Alcance | Riesgo |
|---|---|---|
| **0 — Fundación (esta)** | `tailwind.config.js` (tokens), carpeta `ui/` completa, `status.ts`. **Sin tocar pantallas.** Opcional: mini pantalla de referencia visual interna. | Bajo |
| **1 — CRUD** | `organizaciones`, `comunidades`, `plantas`. Ya usan primitivas; cambiar a `Button`/`Field`/`PageHeader`/`Badge`. | Bajo |
| **2 — recolecciones** | Botones, cards, `RecoleccionCard`, wizard, badges vía registro. | Medio |
| **3 — vivero** | El más grande: `HeroHeader`→`PageHeader hero`, todos los `*Card`→`Card`, botones, `emerald`→`success`/`brand`, hex→token. | Medio-alto |
| **4 — plantacion** | Wizards, dashboards, overlays; `emerald`→`success`. | Medio |
| **5 — home / auth / map / user_profile + barrido** | Últimas pantallas + búsqueda de hex y one-offs (`green`/`teal`/`lime`/`orange`/`yellow`) residuales. | Bajo |

---

## 7. Checklist mecánico por archivo (migración)

Aplicar en cada `.tsx` de pantalla/componente:

- [ ] `<button className="…brand…">` → `<Button variant=… size=…>` (conservar `onClick`, `disabled`, `type`, `aria-*`).
- [ ] Shell de card ad-hoc (`rounded-3xl bg-white shadow-soft …`) → `<Card>`.
- [ ] Píldora de estado literal → `<StatusBadge status={…}>` o `<Badge variant=…>`.
- [ ] `emerald-*` crudo → token `success-*` (o `brand-*` si es decorativo).
- [ ] Hex (`bg-[#…]`) → token más cercano (`brand-950`, etc.).
- [ ] `<input>`/`<select>`/`<textarea>` sueltos → `<Field>` + `<Input/Select/Textarea>`.
- [ ] Header propio → `<PageHeader variant=…>`.
- [ ] Radios/sombras fuera de convención → normalizar (§3.3).
- [ ] One-off colors (`teal`/`lime`/`orange`/`yellow`/`green`) → token semántico.

### Nunca tocar (frontera de “solo UI”)

- hooks, services, `src/api`, mappers, contexts, validators, utils de dominio.
- handlers (`onClick`, `onSubmit`, `onChange`) salvo mover el mismo handler al nuevo componente.
- condiciones de render ligadas a dominio (`disabled` por estado, `VALIDADO && …`, etc.): se **preservan tal cual**.
- textos, labels, enums, unidades.

---

## 8. Verificación (probar que no cambió la lógica)

Al cerrar cada fase:

1. `npm run build` (incluye `tsc -b`) sin errores.
2. `npm run lint` sin errores nuevos.
3. Revisión de diff: solo deben aparecer líneas de presentación (`className`, JSX de layout), archivos nuevos en `ui/`, y `tailwind.config.js`. Ningún cambio en `*.service.ts`, `*.api.ts`, `*.mapper.ts`, `hooks/`, `contexts/`, `validators/`.
4. Spot-check visual del módulo migrado (loading/empty/error/success siguen viéndose y comportándose igual).
5. Este estándar **no** resuelve hallazgos de dominio del `FRONTEND_AUDIT.md` (AUD-006, AUD-009, AUD-011, etc.). Esos quedan intactos y se tratan aparte.

---

## 9. Definición de “hecho”

- Existe `src/components/ui/` con las primitivas y el registro de estado.
- `tailwind.config.js` expone los tokens semánticos.
- Todos los módulos consumen primitivas; búsqueda de `emerald-` crudo, hex de color y `<button className>` primario devuelve ~0 en pantallas.
- Un solo mapa estado→color.
- `build` y `lint` verdes.
- Sin regresiones funcionales en los flujos revisados.
