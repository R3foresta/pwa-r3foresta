# Informe para exportar componentes - Crear subcampana

## Objetivo



Migrar desde el prototipo de mocks al codigo main el flujo de creacion/configuracion de una subcampana, tomando como base el prototipo actual de `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/Crear campaña.html`.

Todas las rutas de este informe estan escritas como rutas absolutas del workspace local.

El flujo vigente quedo en 5 pasos:

1. Coordinador y fechas
2. Zona
3. Especies y meta
4. Equipo
5. Resumen y publicacion

Los pasos 1 al 3 ya están vaildados y terminados, lo único que talta es el validar la UX y UI, la logica esta perfecta. 4 y 5 faltan implmentar.

Importante: el antiguo paso de lotes/asignaciones ya no forma parte de este flujo. La asignacion de lotes debe quedar para una pantalla posterior, por ejemplo desde el detalle de subcampana.

## Archivos fuente del prototipo

Archivos debes leer primero:

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaA.jsx`
  - Define `CC_STEPS` y `CC_TITLES`.
  - Contiene la cabecera del wizard `CCHeader`.
  - Contiene el paso de contexto `SubcampanaContextCard`.
  - Contiene el paso de zona `CCStepZona`.
  - Contiene el paso de especies y meta `CCStepEspecies`.
  - Contiene la pantalla general y gestion de subcampanas del prototipo.

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx`
  - Contiene `CCStepEquipo`.
  - Contiene `CCStepResumen`.
  - Contiene `CCSuccessOverlay`.
  - Contiene `CCStepLotes`, pero esta marcado como legacy y no debe conectarse al wizard principal.

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaScreen.jsx`
  - Es el orquestador del wizard.
  - Decide que paso renderizar.
  - Controla el avance con `canNext`.
  - Ahora conecta el paso 4 directamente con `CCStepEquipo`.

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/Crear campaña.html`
  - Es el host/demo del prototipo.
  - Tiene el estado local de ejemplo.
  - Tiene los handlers base: `updateActiveSubcampana`, `onTogglePct`, `onTogglePersona`.
  - Tiene `createSubcampana`, `SUBCAMPANA_ESPECIES_BASE` y `SUBCAMPANA_EQUIPO_BASE`.

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/AdminShell.jsx`
  - Dependencias visuales reutilizadas: `TipoBadge`, `MiniMap`, `AvatarPile`, `OrgLogo`, `OrgLogoPile`, `OrgInlineList`.

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/Icon.jsx`
  - Dependencia visual `Icon`.

- `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/AdminData.jsx`
  - Datos mock/globales usados por el prototipo: `PERSONAS`, `ORGANIZACIONES`, `CATALOGO_ESPECIES`, etc.

## Componentes que si deben migrarse

### `CrearCampanaScreen`

Archivo fuente: `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaScreen.jsx`

Este componente es el contenedor del wizard. Recibe el estado desde el componente padre y renderiza cada paso segun `paso`.

Props principales:

```jsx
function CrearCampanaScreen({
  paso, onPaso,
  tipo, nombre, organizacion, organizacionesSeleccionadas, descripcion,
  fechaInicio, fechaFin, fechaInicioISO, fechaFinISO,
  subcampanaActiva,
  onSubcampanaCoordinador, onSubcampanaFecha,
  tieneZona, hectareas, onTieneZona,
  meta, especies, onMeta, onTogglePct,
  equipoIds, onTogglePersona,
  onBackToGeneral,
  confirmacion, onConfirmacion,
})
```

Reglas actuales de avance:

```jsx
if (paso === 1) return subcampanaReady;
if (paso === 2) return tieneZona;
if (paso === 3) return meta > 0 && especies.reduce((a, e) => a + e.pct, 0) === 100;
if (paso === 4) return true;
if (paso === 5) return subcampanaReady;
```

### `CCStepEspecies`

Archivo fuente: `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaA.jsx`

Renderiza:

- Meta total de arboles.
- Botones para subir/bajar la meta de 100 en 100.
- Mix planificado de especies.
- Porcentaje por especie.
- Validacion visual de suma igual a 100%.
- Equivalencia estimada en cantidad de arboles por especie.

Props:

```jsx
<CCStepEspecies
  meta={meta}
  especies={especies}
  onMeta={setMeta}
  onTogglePct={onTogglePct}
/>
```

Forma esperada de cada especie:

```js
{
  especie: 'Jacaranda',
  cientifico: 'Jacaranda mimosifolia',
  region: 'Urbano La Paz',
  viveroDisponible: 320,
  pct: 40
}
```

### `CCStepEquipo`

Archivo fuente: `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx`

Este es el nuevo paso 4. Renderiza:

- Resumen de personas seleccionadas.
- Lista de personas disponibles.
- Toggle para agregar/quitar personas del equipo.
- `AvatarPile` para mostrar seleccionados.

Props:

```jsx
<CCStepEquipo
  equipoIds={equipoIds}
  onTogglePersona={onTogglePersona}
/>
```

Depende de `PERSONAS`. En el main idealmente debe recibir `personas` por props o consumirlo desde una query/store.

### `CCStepResumen`

Archivo fuente: `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx`

Renderiza el resumen final sin lotes. Actualmente muestra:

- Tipo de campana.
- Nombre.
- Organizaciones asociadas.
- Meta.
- Zona/hectareas.
- Mini mapa.
- Calendario.
- Descripcion.
- Especies.
- Equipo.

Props:

```jsx
<CCStepResumen
  tipo={tipo}
  nombre={nombre}
  organizacion={organizacion}
  organizacionesSeleccionadas={organizacionesSeleccionadas}
  descripcion={descripcion}
  fechaInicio={fechaInicio}
  fechaFin={fechaFin}
  hectareas={hectareas}
  meta={meta}
  especies={especies}
  equipoIds={equipoIds}
/>
```

### `CCHeader`

Archivo fuente: `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaA.jsx`

Muestra:

- Boton volver.
- Estado borrador.
- Paso actual de `CC_STEPS.length`.
- Titulo del paso usando `CC_TITLES`.
- Barra de progreso.

Debe copiarse junto con `CC_STEPS` y `CC_TITLES`.

## Componentes/partes que no deben conectarse al flujo

No conectar al wizard principal:

- `CCStepLotes`
- `onToggleLote`
- `SUBCAMPANA_LOTES_BASE`
- `lotesIdsActiva`
- props `lotesIds` y `onToggleLote` en `CrearCampanaScreen`
- alerta de `Saldo de lotes insuficiente`
- bloque de resumen `Lotes asignados`

`CCStepLotes` puede conservarse en otra ruta o modulo, pero debe quedar fuera de la creacion inicial.

## Estado minimo para integrarlo en main

El componente padre del main deberia manejar algo equivalente a esto:

```jsx
const [paso, setPaso] = useState(1);
const [confirmacion, setConfirmacion] = useState('idle');

const [subcampana, setSubcampana] = useState({
  id: 'sub-1',
  comunidadNombre: 'San Miguel',
  tipo: 'ARBORIZACION',
  estado: 'BORRADOR',
  coordinadorId: '',
  coordinador: null,
  fechaInicio: '',
  fechaFin: '',
  tieneZona: false,
  hectareas: 4.2,
  meta: 3000,
  especies: [
    { especie: 'Jacaranda', cientifico: 'Jacaranda mimosifolia', region: 'Urbano La Paz', viveroDisponible: 320, pct: 40 },
    { especie: 'Molle', cientifico: 'Schinus molle', region: 'Urbano La Paz', viveroDisponible: 480, pct: 40 },
    { especie: 'Ceibo', cientifico: 'Erythrina crista-galli', region: 'Urbano La Paz', viveroDisponible: 210, pct: 20 },
  ],
  equipoIds: [],
});
```

Handlers base:

```jsx
const updateSubcampana = (patchOrFn) => {
  setSubcampana((prev) =>
    typeof patchOrFn === 'function' ? patchOrFn(prev) : { ...prev, ...patchOrFn }
  );
};

const onTogglePct = (especie, pct) => {
  updateSubcampana((s) => ({
    ...s,
    especies: s.especies.map((e) =>
      e.especie === especie ? { ...e, pct } : e
    ),
  }));
};

const onTogglePersona = (id) => {
  updateSubcampana((s) => ({
    ...s,
    equipoIds: s.equipoIds.includes(id)
      ? s.equipoIds.filter((x) => x !== id)
      : [...s.equipoIds, id],
  }));
};
```

Uso sugerido:

```jsx
<CrearCampanaScreen
  paso={paso}
  onPaso={setPaso}
  tipo={subcampana.tipo}
  nombre="Arborizacion La Paz 2026"
  organizacion="Alcaldia de La Paz"
  organizacionesSeleccionadas={organizacionesSeleccionadas}
  descripcion={descripcion}
  fechaInicio="12 mar 2026"
  fechaFin="30 nov 2026"
  fechaInicioISO="2026-03-12"
  fechaFinISO="2026-11-30"
  subcampanaActiva={subcampana}
  onSubcampanaCoordinador={(id) => updateSubcampana({ coordinadorId: id })}
  onSubcampanaFecha={(field, value) => updateSubcampana({ [field]: value })}
  tieneZona={subcampana.tieneZona}
  hectareas={subcampana.hectareas}
  onTieneZona={(value) => updateSubcampana({ tieneZona: value })}
  meta={subcampana.meta}
  especies={subcampana.especies}
  onMeta={(value) => updateSubcampana({ meta: value })}
  onTogglePct={onTogglePct}
  equipoIds={subcampana.equipoIds}
  onTogglePersona={onTogglePersona}
  onBackToGeneral={goBack}
  confirmacion={confirmacion}
  onConfirmacion={setConfirmacion}
/>
```

## Como convertir de prototipo `window.*` a exports reales

El prototipo actual no usa ES modules. Exporta componentes asi:

```jsx
window.CCStepEspecies = CCStepEspecies;
window.CCStepEquipo = CCStepEquipo;
window.CrearCampanaScreen = CrearCampanaScreen;
```

En el codigo main se recomienda convertirlo a imports/exports normales:

```jsx
export const CC_STEPS = [
  { n: 1, label: 'Contexto' },
  { n: 2, label: 'Zona' },
  { n: 3, label: 'Especies' },
  { n: 4, label: 'Equipo' },
  { n: 5, label: 'Final' },
];

export function CCStepEspecies(props) {
  // copiar cuerpo desde /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaA.jsx
}

export function CCStepEquipo(props) {
  // copiar cuerpo desde /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx
}

export function CCStepResumen(props) {
  // copiar cuerpo desde /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx
}

export function CrearCampanaScreen(props) {
  // copiar cuerpo desde /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaScreen.jsx
}
```

Y luego usar:

```jsx
import {
  CrearCampanaScreen,
  CCStepEspecies,
  CCStepEquipo,
  CCStepResumen,
} from './crear-subcampana';
```

## Dependencias que se deben resolver en main

Los componentes copiados usan:

- `React`
- `Icon`
- `TipoBadge`
- `MiniMap`
- `AvatarPile`
- `OrgInlineList`
- `OrgLogo`
- `OrgLogoPile`
- `PERSONAS`
- `SUBCAMPANA_COORDINADORES`
- `formatSubcampanaDate`
- `getSubcampanaIssues`
- `formatSubcampanaRange`

Si el main ya tiene su propio design system, se puede reemplazar:

- `Icon` por el icon component del main.
- `TipoBadge` por el badge del main.
- `AvatarPile` por avatares/lista simple.
- `MiniMap` por el mapa real o placeholder.
- `PERSONAS` por datos de API/store.

## Checklist para la otra IA

1. Leer `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaA.jsx`, `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx`, `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaScreen.jsx` y `/Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/Crear campaña.html`.
2. Copiar `CC_STEPS` y `CC_TITLES` con 5 pasos.
3. Copiar `CCHeader`, `SubcampanaContextCard`, `CCStepZona`, `CCStepEspecies`.
4. Copiar `CCStepEquipo`, `CCStepResumen`, `CCSuccessOverlay`.
5. Copiar `CrearCampanaScreen`.
6. Eliminar toda conexion al paso de lotes dentro del flujo principal.
7. Reemplazar dependencias globales `window.*` por imports reales.
8. Conectar `PERSONAS`, organizaciones y catalogo de especies desde datos reales.
9. Validar que `paso === 4` renderice equipo.
10. Validar que `paso === 5` renderice resumen/publicacion.
11. Validar que la suma de especies sea 100 antes de continuar desde paso 3.
12. Validar que crear/publicar no dependa de lotes.

## Prompt sugerido para otra IA

```text
Necesito migrar al codigo main el flujo de creacion de subcampana desde este prototipo.

Lee estos archivos:
- /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaA.jsx
- /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaB.jsx
- /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/CrearCampanaScreen.jsx
- /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/Crear campaña.html
- /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/AdminShell.jsx
- /Users/pabloandresfernandezcari/Desktop/R3foresta-Plantacion/admin/Icon.jsx

El flujo correcto tiene 5 pasos:
1. Coordinador y fechas
2. Zona
3. Especies y meta
4. Equipo
5. Resumen y publicacion

No incluyas el paso de lotes/asignaciones en la creacion. CCStepLotes existe como legacy, pero no debe conectarse al wizard.

Convierte los componentes que hoy usan window.* a exports/imports reales de React. Mantiene la logica de validacion:
- paso 1 requiere coordinador y fechas validas
- paso 2 requiere zona
- paso 3 requiere meta > 0 y suma de especies igual a 100
- paso 4 equipo es opcional
- paso 5 publica o guarda borrador

Para el paso 04 podemos usar:
Sí. Para listar usuarios es:

```http
GET /api/users
Header: x-auth-id: <auth_id_de_supabase>
```

Opcionales:

```http
GET /api/users?q=juan
GET /api/users?rol=ADMIN
GET /api/users/rol/ADMIN
```

Devuelve para selector:

```json
[
  { "id": 1, "nombre": "Juan Perez", "rol": "ADMIN" }
]
```

Para obtener el perfil del usuario autenticado:

```http
GET /api/users/profile
Header: x-auth-id: <auth_id_de_supabase>
```

Copia/adapta estos componentes:
- CrearCampanaScreen
- CCHeader
- SubcampanaContextCard
- CCStepZona
- CCStepEspecies
- CCStepEquipo
- CCStepResumen
- CCSuccessOverlay

Reemplaza PERSONAS, organizaciones y catalogo de especies por datos reales del main.
```

## Riesgos o detalles a cuidar

- El prototipo usa Tailwind por CDN; el main debe tener clases equivalentes o adaptar estilos.
- El prototipo usa datos mock. En main, `PERSONAS` y organizaciones deben venir de API/store.
- El prototipo usa `window.location.href` para navegar; en main conviene usar el router real.
- El paso de equipo actualmente es opcional. Si el negocio requiere al menos una persona, cambiar `canNext` del paso 4.
- La zona actualmente es mock (`tieneZona`, `hectareas`, `MiniMap`). En main debe conectarse a GeoJSON real.
- Los textos dicen "campana" porque el prototipo se llama `CrearCampana`; si el main distingue campana paraguas vs subcampana, renombrar UI y tipos segun corresponda.
