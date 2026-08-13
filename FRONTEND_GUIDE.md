# FRONTEND_GUIDE.md — Guía de construcción frontend R3foresta

## 1. Propósito

Este documento explica cómo entender, construir, probar y validar el frontend de R3foresta.

Sirve para guiar a devs y agentes de IA al construir pantallas, formularios, servicios, hooks y componentes sin romper contratos del backend ni reglas críticas del dominio.

No reemplaza:

- `AGENTS.md`: reglas obligatorias para agentes.
- `FRONTEND_AUDIT.md`: deuda técnica, hallazgos y checklist vivo.
- `DOMAIN_INDEX.md`: mapa resumido del dominio.
- Documentos fuente: requerimientos, reglas de negocio, procesos y esquema DB.

Regla de uso:

> Si necesitas construir frontend, usa esta guía.
> Si necesitas validar una regla de negocio, consulta `DOMAIN_INDEX.md` y la documentación fuente.

---

## 2. Stack y verificación inicial

Stack base:

- React
- TypeScript
- Vite
- Tailwind CSS

Antes de crear o modificar código, revisar:

- `package.json`
- lockfile
- estructura de carpetas
- componentes existentes
- servicios API existentes
- rutas existentes
- configuración de `.env`
- patrones ya usados

No introducir librerías nuevas si el patrón existente resuelve el problema.

---

## 3. Principios del frontend

El frontend es una capa de operación y experiencia de usuario.

Debe:

- guiar al usuario;
- mostrar estado real del sistema;
- prevenir errores obvios;
- consumir contratos del backend;
- representar saldos, estados, snapshots y evidencias con claridad;
- mantener formularios simples;
- mostrar restricciones antes de enviar.

No debe:

- ser motor final de reglas de negocio;
- recalcular saldos como fuente de verdad;
- inventar enums, estados o flujos;
- simular persistencia antes de respuesta exitosa;
- ocultar restricciones críticas.

Idea central:

> Validación frontend = ayuda UX.  
> Validación backend = verdad del sistema.

---

## 4. Arquitectura general

El frontend se organiza por módulos de dominio. En el repo actual la implementación usa `src/modules/` para las features y mantiene `src/api/` y `src/services/` como capas compartidas de acceso a datos y casos de uso.

```txt
src/
  api/
  components/
  contexts/
  hooks/
  layouts/
  modules/
    recolecciones/
    vivero/
    plantacion/
    evidencias/
    auth/
  services/
  utils/
```

Adaptar nombres a la estructura real del repo, pero mantener la separación conceptual.

### 4.1 Entrada y composición de la aplicación

El router principal vive en `src/App.tsx`; los providers globales viven en `src/contexts/`, los layouts en `src/layouts/` y la configuración de build en la raíz.

No debe contener lógica específica de Recolección, Vivero o Evidencias.

### 4.2 Capas compartidas

`src/components/`, `src/hooks/`, `src/utils/`, `src/api/` y `src/services/` contienen componentes reutilizables, utilidades, tipos transversales, llamadas HTTP y casos de uso compartidos.

No debe depender de una feature concreta.

### 4.3 `modules/`

Contiene pantallas, componentes, hooks, tipos, mappers, validaciones de UI y composición específica de cada módulo.

Cada feature debe poder entenderse sin revisar todo el proyecto.

---

## 5. Estructura recomendada por módulo

Ejemplo:

```txt
modules/vivero/
  api/
  components/
  hooks/
  pages/
  types/
  utils/
  schemas/
  index.ts
```

No todas las carpetas son obligatorias desde el inicio. Crear solo lo necesario.

### 5.1 `api/`

Centraliza llamadas al backend.

Reglas:

- no hacer `fetch`/`axios` disperso en componentes;
- no hardcodear base URL;
- usar configuración/env existente;
- tipar request y response;
- no partir operaciones atómicas en varios requests desde UI.

Ejemplos:

```txt
src/api/lotes-vivero.api.ts
src/services/recolecciones.service.ts
src/api/plantacion.api.ts
```

### 5.2 `components/`

Componentes propios de la feature.

Reglas:

- componentes pequeños;
- nombres explícitos;
- props tipadas;
- sin lógica de negocio compleja dentro de JSX;
- reutilizar antes de crear.

Ejemplos:

```txt
LoteViveroCard.tsx
EventoTimeline.tsx
EvidenciaPreview.tsx
SaldoVivoBadge.tsx
```

### 5.3 `hooks`

Hooks para carga de datos, acciones o composición de estado.

Reglas:

- responsabilidad clara;
- no duplicar llamadas API;
- exponer estados útiles: `loading`, `error`, `data`, `isEmpty`, `submitting`;
- encapsular lógica repetida de pantalla.

### 5.4 `pages`

Pantallas conectadas a rutas.

Reglas:

- la page orquesta;
- no debe convertirse en componente gigante;
- dividir en secciones;
- delegar UI repetida a componentes.

### 5.5 `types`

Tipos TypeScript del módulo.

Separar cuando aporte claridad:

- DTOs del backend;
- request/response;
- modelos de UI;
- valores de formulario.

Regla:

> No deformar el contrato del backend por comodidad visual.

### 5.6 `utils`, `mappers` o `schemas`

Usar para transformar datos sin contaminar componentes:

- enum a label;
- fechas;
- badges;
- response a view model;
- schemas de formulario si el proyecto usa una librería para eso.

---

## 6. Tipos, DTOs y view models

Mantener tres capas cuando sea útil.

### 6.1 Response del backend

Mantiene nombres reales del contrato.

```ts
type EventoLoteViveroResponse = {
  id: number;
  tipo_evento: "INICIO" | "EMBOLSADO" | "ADAPTABILIDAD" | "MERMA" | "DESPACHO" | "CIERRE_AUTOMATICO";
  fecha_evento: string;
  cantidad_afectada: number | null;
  unidad_medida_evento: "UNIDAD" | "G" | null;
};
```

### 6.2 Form values

Representan lo que llena el usuario.

```ts
type RegistrarMermaFormValues = {
  fecha_evento: string;
  cantidad_afectada: string;
  causa_merma: string;
  observaciones?: string;
};
```

### 6.3 View model

Representa datos listos para UI.

```ts
type EventoTimelineItem = {
  id: number;
  title: string;
  dateLabel: string;
  quantityLabel?: string;
  badgeLabel: string;
};
```

Usar mappers para pasar de response a view model.

---

## 7. Servicios/API

Patrón recomendado:

```ts
// src/api/lotes-vivero.api.ts

export async function getLotesVivero() {
  // usar client HTTP existente
}

export async function registrarEmbolsado(payload: RegistrarEmbolsadoRequest) {
  // usar endpoint del backend
}
```

Reglas:

- usar client HTTP existente;
- usar `.env` para URL base;
- tipar request y response;
- manejar errores de forma consistente;
- no actualizar estado local como persistido hasta recibir confirmación;
- consumir endpoints transaccionales del backend para operaciones críticas.

Evitar:

- endpoints hardcodeados en componentes;
- payloads armados en JSX;
- duplicar funciones API similares;
- simular respuestas exitosas sin backend.

---

## 8. Estado de UI

Toda pantalla o acción debe representar estados explícitos:

- `loading`
- `error`
- `empty`
- `success`
- `submitting`

Flujo mental:

```txt
Cargar datos -> loading
Sin datos -> empty state
Error -> mensaje recuperable
Datos -> contenido
Submit -> botón deshabilitado + feedback
Success -> actualizar vista, timeline o redirigir
```

No ocultar fallos.

---

## 9. Dominio mínimo en UI

Esta sección solo resume lo necesario para construir interfaz. Para reglas completas, revisar `DOMAIN_INDEX.md`.

### 9.1 Recolección

Estados de registro:

- `BORRADOR`
- `PENDIENTE_VALIDACION`
- `VALIDADO`
- `RECHAZADO`

Estado operativo:

- `ABIERTO`
- `CERRADO`

Principios UI:

- `BORRADOR` y `RECHAZADO` pueden mostrar edición si el rol lo permite.
- `PENDIENTE_VALIDACION` debe mostrarse congelado.
- `VALIDADO` no debe mostrar edición directa.
- Solo `VALIDADO + ABIERTO` debe aparecer como elegible para iniciar Vivero.
- El consumo hacia Vivero no debe aparecer como acción manual suelta en Recolección si el flujo oficial ocurre desde Vivero.

### 9.2 Vivero

Secuencia visual recomendada:

```txt
Recolección -> Consumo -> Inicio -> Embolsado -> Adaptabilidad -> Merma/Despacho -> Cierre
```

Principios UI:

- `INICIO` representa material en proceso, no plantas vivas.
- `EMBOLSADO` crea plantas vivas y saldo vivo.
- `ADAPTABILIDAD` no cambia saldo.
- `MERMA` y `DESPACHO` descuentan saldo vivo.
- `CIERRE_AUTOMATICO` se muestra cuando el backend lo devuelve o cuando el lote ya aparece finalizado.

### 9.3 Evidencias

Principios UI:

- eventos críticos deben exigir evidencia antes de enviar;
- mostrar preview cuando exista;
- mostrar nombre, tipo, peso y fecha cuando estén disponibles;
- no tratar `bucket` o `ruta_archivo` como URL pública;
- mostrar errores de carga;
- evitar flujos de evidencia tardía si el MVP no los soporta.

---

## 10. Diseño de pantallas

Toda pantalla debe responder:

1. ¿Qué está viendo el usuario?
2. ¿En qué estado está el registro/lote?
3. ¿Qué puede hacer ahora?
4. ¿Qué no puede hacer y por qué?
5. ¿Qué datos son calculados por backend?
6. ¿Qué evidencia respalda la operación?
7. ¿Qué pasará después de confirmar?

### 10.1 Listados

Incluir cuando aplique:

- buscador;
- filtros principales;
- estado visible;
- acciones permitidas;
- loading;
- empty state;
- error state;
- estrategia de carga/paginación si aplica.

Ejemplo Vivero:

- filtro por estado del lote;
- búsqueda por código, lote de vivero o lote origen.

### 10.2 Detalles

Priorizar lectura operativa.

Secciones sugeridas:

- resumen principal;
- identidad/snapshots;
- saldos;
- estado;
- origen;
- timeline;
- evidencias;
- acciones disponibles;
- restricciones o alertas.

### 10.3 Formularios

Deben ser simples y por bloques.

Bloques sugeridos:

- datos base;
- cantidad/unidad;
- ubicación o destino;
- evidencia;
- observaciones;
- resumen antes de confirmar.

No diseñar formularios enormes sin secciones.

### 10.4 Modales

Usar modales para confirmaciones, resúmenes previos, acciones pequeñas y previews.

Evitar formularios largos en modales si afecta claridad.

---

## 11. Formularios y validaciones

Las validaciones frontend ayudan a evitar errores obvios antes del envío.

Deben validar:

- campos obligatorios evidentes;
- formato de fecha;
- formato de número;
- unidad seleccionada;
- archivos requeridos;
- tamaño/formato básico de evidencia si aplica;
- consistencia visual de campos condicionales.

No deben:

- reemplazar validación backend;
- decidir elegibilidad final;
- recalcular saldos como fuente de verdad;
- asumir persistencia antes de respuesta exitosa.

### 11.1 Confirmación para eventos append-only

Antes de registrar eventos definitivos, mostrar resumen:

- lote;
- tipo de evento;
- fecha;
- responsable;
- cantidad;
- unidad;
- evidencia;
- efecto esperado sobre saldo si aplica.

Texto sugerido:

> Este evento se agregará al historial del lote. Una vez registrado, no podrá editarse desde la interfaz.

### 11.2 Errores

Preferir errores claros:

- por campo si backend responde validaciones específicas;
- globales si la operación falla;
- con instrucción de recuperación si aplica.

Evitar:

> Error desconocido

Mejor:

> No se pudo registrar la merma. Revisa la cantidad disponible y vuelve a intentar.

---

## 12. UI/UX del dominio

### 12.1 Badges de estado

Usar badges para estados relevantes:

- `BORRADOR`
- `PENDIENTE_VALIDACION`
- `VALIDADO`
- `RECHAZADO`
- `ABIERTO`
- `CERRADO`
- `ACTIVO`
- `FINALIZADO`

Los badges deben ayudar a decidir acciones.

Ejemplos:

- `VALIDADO + ABIERTO`: puede iniciar Vivero.
- `VALIDADO + CERRADO`: no puede iniciar Vivero.
- `FINALIZADO`: no permite nuevos eventos operativos.

### 12.2 Saldos y cantidades

Diferenciar visualmente:

- cantidad inicial;
- material en proceso;
- plantas vivas iniciales;
- saldo vivo actual;
- saldo antes;
- saldo después.

Si el dato es calculado por backend, mostrarlo como solo lectura.

### 12.3 Snapshots

Los snapshots son datos congelados. Mostrar como lectura, no como campos editables.

### 12.4 Timeline

El timeline debe ser auditable y claro.

Cada evento debería mostrar, cuando exista:

- tipo de evento;
- fecha del evento;
- fecha de registro;
- responsable;
- cantidad/unidad;
- saldo antes/después;
- evidencia asociada;
- observaciones;
- anclaje blockchain.

No ocultar eventos. Los filtros deben ser visuales, no eliminación de historia.

---

## 13. Rutas y navegación

Nombrar rutas por intención del usuario, no solo por tabla.

Ejemplos sugeridos:

```txt
/recoleccion
/recoleccion/:id
/recoleccion/:id/editar
/vivero
/vivero/nuevo
/vivero/:id
/vivero/:id/eventos/embolsado
/vivero/:id/eventos/adaptabilidad
/vivero/:id/eventos/merma
/vivero/:id/eventos/despacho
```

Ajustar a la convención real del repo.

Reglas:

- rutas de detalle deben permitir entender el estado del recurso;
- formularios de eventos deben estar ligados al lote;
- no crear rutas que permitan acciones prohibidas por dominio.

---

## 14. Construir una nueva pantalla

Proceso recomendado:

1. Identificar feature.
2. Leer `AGENTS.md`.
3. Revisar `DOMAIN_INDEX.md` si toca reglas del dominio.
4. Buscar pantalla parecida.
5. Crear tipos mínimos.
6. Crear o reutilizar servicio API.
7. Crear hook si hay lógica de datos.
8. Crear componentes pequeños.
9. Crear page/ruta.
10. Agregar estados `loading`, `error` y `empty`.
11. Agregar validaciones UX.
12. Ejecutar verificación.

Evitar construir una pantalla completa en un solo archivo enorme.

---

## 15. Construir un formulario de evento Vivero

Flujo base:

1. Cargar lote.
2. Validar visualmente si el lote permite el evento.
3. Mostrar resumen del lote.
4. Capturar datos del evento.
5. Adjuntar evidencia si es obligatoria.
6. Mostrar resumen previo.
7. Enviar al backend.
8. Esperar respuesta.
9. Actualizar timeline/detalle.
10. Mostrar confirmación o error.

No asumir cierre automático desde frontend. Si el backend devuelve lote finalizado o evento `CIERRE_AUTOMATICO`, entonces mostrarlo.

---

## 16. Testing y verificación

Antes de cerrar una tarea:

1. Ejecutar lint si existe.
2. Ejecutar typecheck si existe.
3. Ejecutar tests si existen.
4. Ejecutar build si el cambio toca estructura, rutas o tipos globales.
5. Probar manualmente el flujo afectado si es posible.

Comandos típicos:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Si un comando no existe, reportarlo. No decir que pasó si no se ejecutó.

### 16.1 Checklist funcional por pantalla

- ¿Carga datos correctamente?
- ¿Tiene loading?
- ¿Tiene empty state?
- ¿Tiene error state?
- ¿Muestra estados/badges?
- ¿Respeta acciones permitidas?
- ¿No muestra acciones prohibidas?
- ¿Los campos calculados son read-only?
- ¿La evidencia se muestra o exige cuando corresponde?
- ¿El submit maneja error y éxito?

### 16.2 Checklist Vivero

- `INICIO` no muestra saldo vivo como existente.
- `EMBOLSADO` crea plantas vivas iniciales.
- `ADAPTABILIDAD` no modifica saldo.
- `MERMA` y `DESPACHO` muestran efecto sobre saldo.
- `FINALIZADO` bloquea eventos normales.
- Timeline muestra eventos append-only.

### 16.3 Checklist Recolección

- `BORRADOR` editable si rol permite.
- `PENDIENTE_VALIDACION` congelado.
- `VALIDADO` no editable.
- `RECHAZADO` corregible si rol permite.
- Solo `VALIDADO + ABIERTO` aparece como elegible para Vivero.
- No existe consumo manual suelto desde Recolección si el flujo oficial parte desde Vivero.

### 16.4 PWA y actualizaciones

- El service worker se genera en cada `npm run build` con `vite-plugin-pwa` y Workbox.
- No crear ni versionar manualmente `public/sw.js`.
- Los cambios en los assets producen revisiones de precaché nuevas de forma automática.
- El registro global vive en `src/pwa/registerPwa.ts` y comprueba actualizaciones al abrir, recuperar conexión, volver a la app y cada hora.
- El estado del diálogo de instalación vive en `src/contexts/PwaInstallContext.tsx`; cualquier sugerencia o acceso alternativo debe consumir ese contexto para no registrar listeners duplicados de `beforeinstallprompt`.
- Cerrar una sugerencia visual de instalación no debe descartar el evento disponible: el acceso permanente del menú puede seguir utilizándolo.
- La comprobación del service worker, la disponibilidad del backend y el refresco del perfil deben ejecutarse en segundo plano; no deben bloquear el render global ni un refresh de ruta.
- No agregar caché de API ni sincronización en segundo plano sin definir antes el contrato de offline/outbox.
- En Vercel, `sw.js`, `index.html` y el manifest deben revalidarse; solo los assets con hash pueden usar caché inmutable.

---

## 17. Antipatrones a evitar

Evitar:

- componentes gigantes;
- `any` por comodidad;
- lógica de negocio dentro de JSX;
- `fetch`/`axios` en cualquier componente;
- duplicar enums manualmente en muchos archivos;
- hardcodear URLs;
- tratar campos calculados como editables;
- mostrar snapshots como editables;
- convertir `kg` en persistencia;
- mezclar `G` y `GR`;
- ocultar eventos históricos;
- crear botones para editar/borrar eventos append-only;
- partir operaciones atómicas en varios requests desde UI;
- agregar librerías sin necesidad.

---

## 18. Relación con otros documentos

Orden de consulta recomendado:

1. `AGENTS.md`: reglas obligatorias de trabajo.
2. `FRONTEND_GUIDE.md`: cómo construir frontend.
3. `FRONTEND_AUDIT.md`: deuda técnica y checklist.
4. `../docs/DOMAIN_INDEX.md`: mapa de reglas del dominio.
5. Documentación fuente del dominio.
6. Código existente.

Si hay conflicto entre esta guía y reglas de negocio oficiales, prevalecen las reglas de negocio oficiales.

---

## 19. Mantenimiento

Actualizar este archivo cuando:

- cambie la arquitectura de carpetas;
- cambien patrones de API;
- cambien patrones de formularios;
- cambie la librería de rutas, estado o formularios;
- se adopte una convención UI nueva;
- una confusión se repita varias veces;
- se agregue una feature grande nueva.

Mantenerlo práctico. No convertirlo en una copia de los documentos de negocio.
