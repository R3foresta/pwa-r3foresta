## 1. Propósito

Este documento registra hallazgos, deuda técnica, riesgos y pendientes del frontend de R3foresta.

Debe servir para:

- revisar calidad del código;
- detectar inconsistencias con `AGENTS.md` y `FRONTEND_GUIDE.md`;
- priorizar mejoras reales;
- evitar que deuda técnica quede “en el aire”;
- dar contexto a devs y agentes de IA antes de refactorizar;
- validar que el frontend respete reglas críticas del dominio.

Este archivo no reemplaza:

- `AGENTS.md`: reglas obligatorias para agentes.
- `FRONTEND_GUIDE.md`: guía para construir frontend.
- `DOMAIN_INDEX.md`: mapa de reglas del dominio.
- documentación fuente: requerimientos, reglas de negocio, procesos y esquema DB.

---

## 2. Cómo usar este documento

Usar este archivo cuando:

- se revise una pantalla;
- se haga refactor;
- se detecte deuda técnica;
- se encuentre una inconsistencia de dominio;
- se encuentre duplicación de código;
- se detecte una pantalla incompleta;
- se revise calidad antes de cerrar una tarea.

No convertir este documento en una lista infinita sin mantenimiento.

Regla:

> Todo hallazgo debe tener estado, severidad, ubicación y acción sugerida.

---

## 3. Estados de auditoría

Usar estos estados:

| Estado | Significado |
|---|---|
| `PENDIENTE` | Detectado, todavía no trabajado. |
| `EN_PROGRESO` | Ya hay alguien corrigiendo. |
| `BLOQUEADO` | No puede resolverse sin decisión, backend, diseño o dato externo. |
| `RESUELTO` | Corregido y verificado. |
| `DESCARTADO` | Se decidió no corregir, con motivo claro. |

No marcar como `RESUELTO` sin verificación mínima.

---

## 4. Severidad

Usar estas severidades:

| Severidad | Criterio |
|---|---|
| `CRITICA` | Rompe reglas de dominio, trazabilidad, saldos, snapshots, evidencias o flujo principal. |
| `ALTA` | Afecta operación, datos, navegación crítica o integración con backend. |
| `MEDIA` | Afecta mantenibilidad, UX, duplicación o claridad del código. |
| `BAJA` | Mejora menor, limpieza, naming, orden o detalle visual. |

Ejemplos:

- `CRITICA`: pantalla permite editar un evento append-only.
- `CRITICA`: frontend recalcula saldo como verdad.
- `ALTA`: formulario no maneja error del backend.
- `MEDIA`: componente gigante difícil de mantener.
- `BAJA`: texto poco claro o inconsistencia visual menor.

---

## 5. Formato estándar de hallazgo

Copiar este bloque para cada hallazgo relevante:

```md
### AUD-000 — Título corto

- Estado: `PENDIENTE`
- Severidad: `MEDIA`
- Módulo: `vivero | recoleccion | evidencias | auth | shared | app`
- Ubicación: `ruta/archivo.tsx`
- Tipo: `dominio | arquitectura | api | ui | formulario | tipos | testing | deuda`
- Detectado por: `persona/IA`
- Fecha: `YYYY-MM-DD`

#### Problema

Descripción breve del problema.

#### Riesgo

Qué puede romper o confundir.

#### Acción sugerida

Qué debería hacerse para resolverlo.

#### Verificación esperada

Cómo confirmar que quedó bien.

#### Notas

Contexto adicional si aplica.
```

---

## 6. Resumen ejecutivo

Auditoría base: `2026-07-21`. Cierre de correcciones prioritarias: `2026-09-29`, con lint, build/PWA, 32 pruebas automatizadas y comprobación de acceso/registro/rutas protegidas en navegador. El QA de autorización y persistencia contra el backend desplegado sigue pendiente. `BIEN` no reemplaza esa verificación.

| Área | Estado | Observación |
|---|---|---|
| Arquitectura por módulos | `MEJORABLE` | Feature-first funcional, pero hay pantallas y services demasiado grandes. |
| Servicios/API | `RIESGO` | Existen varias capas y llamadas HTTP repetidas; falta un cliente común. |
| Formularios | `MEJORABLE` | Eventos de Vivero con confirmación previa y guarda de doble envío; idempotencia durable pendiente del backend. |
| UI/UX dominio | `BIEN` | Embolsado unificado, precisión canónica y corrección de rechazados atendidos en frontend. |
| TypeScript | `BIEN` | TypeScript estricto; no se encontraron usos de `any` en la revisión. |
| Testing/build | `MEJORABLE` | Al 2026-10-09 pasan build/PWA, lint completo y 191 pruebas. Recorridos en navegador con API sintética; falta QA integrado con backend real (`AUD-015`). |
| Seguridad | `RIESGO` | Sesión frontend verificada por Bearer; autorización por headers en backend y migración de React Router pendientes (`AUD-013`, `AUD-014`). |

Estados sugeridos para esta tabla:

- `SIN_REVISAR`
- `BIEN`
- `MEJORABLE`
- `RIESGO`
- `CRITICO`

### Histórico — Lint global afectado por worktrees locales

- Estado: `RESUELTO`
- Severidad: `MEDIA`
- Módulo: `shared`
- Ubicación: `eslint.config.js`, `.claude/worktrees`, varios módulos legacy
- Tipo: `testing`
- Detectado por: `Codex`
- Fecha: `2026-07-02`

#### Problema

En la detección original, `npm run lint` ejecutaba `eslint .` y fallaba por errores fuera del cambio de Vivero, incluyendo archivos duplicados dentro de `.claude/worktrees` y reglas en módulos legacy.

#### Riesgo

La verificación global no permite distinguir rápidamente si una tarea nueva introdujo errores o si está chocando con deuda previa.

#### Acción sugerida

Excluir worktrees locales del lint o limpiar esos errores existentes por módulo; mientras tanto, usar lint acotado a archivos modificados como verificación complementaria.

#### Verificación esperada

`npm run lint` debe pasar desde la raíz del repo.

#### Notas

Resuelto el 2026-07-19: ESLint excluye `.claude/**` y los errores del workspace activo fueron corregidos. Quedan dos advertencias no bloqueantes de dependencias de hooks en Comunidades.

---

## 7. Checklist general de auditoría

Usar al revisar cualquier pantalla o feature.

### 7.1 Estructura

- [ ] ¿El código está dentro de la feature correcta?
- [ ] ¿La pantalla no está mezclando demasiadas responsabilidades?
- [ ] ¿Se reutilizan componentes existentes?
- [ ] ¿La lógica repetida está en hooks/utils/mappers?
- [ ] ¿No hay componentes gigantes difíciles de mantener?
- [ ] ¿No se metió lógica de dominio compleja dentro de JSX?

### 7.2 TypeScript

- [ ] ¿No se usa `any` sin justificación?
- [ ] ¿Los props están tipados?
- [ ] ¿Los DTOs mantienen nombres reales del backend?
- [ ] ¿Los tipos de UI están separados cuando hace falta?
- [ ] ¿Los enums vienen del contrato o están centralizados?
- [ ] ¿No hay strings mágicos repetidos para estados/eventos?

### 7.3 Servicios/API

- [ ] ¿Las llamadas HTTP están centralizadas?
- [ ] ¿No hay `fetch/axios` disperso en componentes?
- [ ] ¿Se usa configuración/env para base URL?
- [ ] ¿Request y response están tipados?
- [ ] ¿Se manejan errores del backend?
- [ ] ¿No se simula persistencia antes de respuesta exitosa?
- [ ] ¿Operaciones atómicas usan endpoint transaccional del backend?

### 7.4 Estado de UI

- [ ] ¿Existe estado `loading`?
- [ ] ¿Existe estado `error`?
- [ ] ¿Existe estado `empty`?
- [ ] ¿Existe estado `submitting` en formularios?
- [ ] ¿El usuario recibe feedback al guardar?
- [ ] ¿No se ocultan errores importantes?

### 7.5 Formularios

- [ ] ¿Los formularios están separados por bloques claros?
- [ ] ¿Se validan campos obligatorios evidentes?
- [ ] ¿Se muestran errores por campo cuando aplica?
- [ ] ¿El submit se bloquea durante envío?
- [ ] ¿Hay resumen antes de acciones definitivas?
- [ ] ¿No se reemplaza validación del backend?
- [ ] ¿No se recalculan saldos como verdad del sistema?

### 7.6 UI/UX

- [ ] ¿La UI está en español?
- [ ] ¿Los estados se muestran con badges o indicadores claros?
- [ ] ¿Los campos calculados se muestran como solo lectura?
- [ ] ¿Los snapshots se muestran como datos congelados?
- [ ] ¿Las restricciones son visibles antes de enviar?
- [ ] ¿La pantalla comunica qué puede y no puede hacer el usuario?
- [ ] ¿El diseño prioriza claridad operativa sobre decoración?

### 7.7 Evidencias

- [ ] ¿La evidencia obligatoria se exige antes de enviar?
- [ ] ¿Se muestra preview cuando existe?
- [ ] ¿Se muestra nombre/título?
- [ ] ¿Se muestra tipo o mime type?
- [ ] ¿Se muestra peso si está disponible?
- [ ] ¿Se muestra fecha si está disponible?
- [ ] ¿No se trata `bucket` o `ruta_archivo` como URL pública?
- [ ] ¿Se manejan errores de carga/subida?

### 7.8 Testing y verificación

- [ ] ¿Se ejecutó lint si existe?
- [ ] ¿Se ejecutó typecheck si existe?
- [ ] ¿Se ejecutaron tests si existen?
- [ ] ¿Se ejecutó build si el cambio lo requiere?
- [ ] ¿Se probó manualmente el flujo afectado?
- [ ] ¿Se documentó lo que no se pudo verificar?

---

## 8. Checklist de dominio — Recolección

Usar cuando se revise una pantalla relacionada con Recolección.

- [ ] `BORRADOR` se muestra editable si el rol lo permite.
- [ ] `RECHAZADO` se muestra corregible si el rol lo permite.
- [ ] `PENDIENTE_VALIDACION` se muestra congelado.
- [ ] `VALIDADO` no permite edición directa de ficha.
- [ ] `ABIERTO/CERRADO` se muestran como estado operativo derivado.
- [ ] Solo `VALIDADO + ABIERTO` aparece como elegible para iniciar Vivero.
- [ ] El consumo hacia Vivero no aparece como acción manual suelta desde Recolección.
- [ ] Los snapshots validados se muestran como lectura.
- [ ] La unidad oficial visible respeta `UNIDAD` y `G`.
- [ ] No se usa `GR`.
- [ ] `kg` no se trata como persistencia.
- [ ] La evidencia mínima se comunica claramente cuando aplica.

Hallazgos relacionados:

- `AUD-008`: precisión canónica de `G` y etiquetas de unidad.
- `AUD-009`: corrección y reenvío de registros `RECHAZADO`.

---

## 9. Checklist de dominio — Vivero

Usar cuando se revise una pantalla relacionada con Vivero.

- [ ] `INICIO` se muestra como material en proceso, no como plantas vivas.
- [ ] `INICIO` no muestra saldo vivo como existente.
- [ ] `EMBOLSADO` se muestra como nacimiento del saldo vivo.
- [ ] `EMBOLSADO` solo aparece disponible si corresponde.
- [ ] `ADAPTABILIDAD` no modifica saldo.
- [ ] `ADAPTABILIDAD` no bloquea `MERMA` ni `DESPACHO`.
- [ ] `MERMA` descuenta saldo vivo.
- [ ] `DESPACHO` descuenta saldo vivo.
- [ ] `MERMA` y `DESPACHO` no permiten cantidades mayores al saldo disponible desde UX.
- [ ] `FINALIZADO` bloquea nuevos eventos operativos normales.
- [ ] `CIERRE_AUTOMATICO` se muestra como resultado del backend.
- [ ] Timeline muestra eventos append-only.
- [ ] No hay botones para editar/borrar eventos ya registrados.
- [ ] Eventos críticos exigen evidencia.

Hallazgos relacionados:

- `AUD-006`: ruta legacy de Embolsado con tope masa → plantas.
- `AUD-007`: confirmación e idempotencia de eventos append-only.
- `AUD-010`: comentarios de contratos desactualizados.

---

## 10. Checklist de arquitectura por feature

Usar al revisar una carpeta dentro de `src/modules/`.

### Feature revisada

- Nombre: `src/modules/*`, `src/api`, `src/services`
- Fecha: `2026-07-21`
- Responsable: `Codex`

### Estructura

- [ ] Tiene acceso API en `src/api/` o en la capa equivalente existente.
- [ ] Tiene `components/` si hay UI específica.
- [ ] Tiene `hooks/` si hay lógica reutilizable.
- [ ] Tiene `screens/` si maneja rutas.
- [ ] Tiene `types/` si define contratos o modelos.
- [ ] Tiene `utils/`, `mappers/` o `schemas/` si transforma datos o valida formularios.
- [ ] No mezcla responsabilidades de otros módulos.
- [ ] No duplica componentes de `src/components`.

### Resultado

- Estado: `MEJORABLE`
- Observaciones:
  - La separación por módulos existe y los tipos están razonablemente aislados.
  - Vivero y Plantación tienen hooks, mappers y servicios reutilizables.
  - Campañas, subcampañas, dashboards y algunos services requieren extracción por caso de uso.

---

## 11. Auditoría por módulo

### 11.1 `app/`

Estado: `MEJORABLE`

Revisar:

- providers globales;
- router;
- layout base;
- configuración;
- carga inicial;
- dependencias globales.

Hallazgos:

- Router operativo y rutas de Recolección, Vivero y Plantación conectadas.
- Optimización de arranque aplicada el `2026-08-13`: splash nativo y boot shell anterior a React con fondo consistente, pantallas cargadas bajo demanda, Leaflet fuera del entrypoint, registro del service worker después de la carga inicial y recursos principales convertidos a WebP. El JS/CSS obligatorio comprimido bajó aproximadamente de `313 kB` a `94 kB` en el build local.
- `/auth/register` reutiliza el registro real con passkeys; ver cierre `AUD-011`.
- `/app/vivero/:id/event/new` redirige al formulario vigente de Embolsado; ver cierre `AUD-006`.

### 11.2 `shared/`

Estado: `RIESGO`

Revisar:

- componentes reutilizables;
- helpers;
- cliente HTTP base;
- tipos genéricos;
- constantes;
- layouts comunes.

Hallazgos:

- No hay un cliente HTTP único: `fetch`, base URL y headers se repiten entre `src/api` y services.
- La UI comunica que guardar registros/fotos requiere conexión. Outbox y sincronización offline real siguen fuera del alcance implementado; ver cierre `AUD-012`.

### 11.3 `modules/recolecciones`

Estado: `RIESGO`

Revisar:

- formularios de borrador;
- validación;
- estados de registro;
- estado operativo;
- evidencia;
- elegibilidad para Vivero;
- snapshots.

Hallazgos:

- `RECHAZADO` puede corregirse según permiso; guardar lo devuelve a `BORRADOR`, desde donde puede enviarse. El acceso directo al formulario también verifica estado y permiso.
- La conversión a `G` valida máximo un decimal sin redondeo silencioso; `UNIDAD` exige enteros. La UI usa la etiqueta oficial `G`.
- El formateo de fechas puede desplazarse por zona horaria.

### 11.4 `modules/vivero`

Estado: `RIESGO`

Revisar:

- listado de lotes;
- detalle de lote;
- inicio;
- embolsado;
- adaptabilidad;
- merma;
- despacho;
- cierre automático;
- timeline;
- evidencias.

Hallazgos:

- Embolsado, Adaptabilidad, Merma, Despacho, Descarte pre-embolsado, timeline, evidencias, asignaciones y devoluciones ya tienen implementación conectada.
- La ruta legacy redirige a Embolsado vigente; se retiraron el hook y los topes que relacionaban gramos con plantas.
- INICIO, Embolsado, Adaptabilidad, Merma, Despacho, Descarte y entrega física muestran resumen previo. Cancelar no escribe ni sube evidencias; una guarda evita doble envío simultáneo desde el formulario.
- Los comentarios de contratos fueron sincronizados en esta auditoría; ver `AUD-010` como `RESUELTO`.

### 11.5 `modules/evidencias`

Estado: `MEJORABLE`

Revisar:

- subida;
- preview;
- metadatos;
- errores de carga;
- vínculo con entidad;
- uso correcto de storage.

Hallazgos:

- Los eventos críticos exigen fotos desde los formularios revisados.
- Falta una estrategia de idempotencia para reintentos después de respuestas perdidas.

### 11.6 `modules/auth`

Estado: `RIESGO`

Revisar:

- login;
- sesión;
- roles;
- permisos visuales;
- rutas protegidas;
- expiración o error de sesión.

Hallazgos:

- Login y registro usan WebAuthn y el estado de sesión se centraliza en `AuthContext`.
- Logout limpia token, usuario e identificador y descarta respuestas pendientes de una sesión anterior.
- Restauración mediante perfil con JWT Bearer, timeout, manejo de sesión rechazada y reintento tras fallo de red. Los datos locales no conceden acceso.
- La autorización insegura por headers todavía admitida por backend requiere un cambio coordinado (`AUD-013`).

---

## 12. Registro de hallazgos activos

Mantener esta tabla actualizada.

| ID | Severidad | Estado | Módulo | Tipo | Resumen | Ubicación |
|---|---|---|---|---|---|---|
| AUD-002 | `ALTA` | `RESUELTO` | `general` | `testing` | `build` vuelve a completar correctamente. | `src/` |
| AUD-003 | `ALTA` | `RESUELTO` | `general` | `testing` | `npm run lint` pasa y excluye worktrees internos. | `eslint.config.js`, `src/` |
| AUD-004 | `BAJA` | `PENDIENTE` | `general` | `deuda` | `formatDate` y `formatRelativeTime` viven duplicados/en línea por módulo; conviene extraerlos a un util compartido. | `src/modules/plantacion/utils/subcampaniaFormatters.ts`, `src/modules/plantacion/screens/CampaniaAdminDashboardScreen.tsx` |
| AUD-005 | `BAJA` | `PENDIENTE` | `plantacion` | `deuda` | `CAMPANIA_TYPES` está definido dos veces con distinto orden (validación en service, orden visual en form). | `src/services/plantacion.service.ts`, `src/modules/plantacion/components/CrearCampaniaForm.tsx` |
| AUD-006 | `CRITICA` | `RESUELTO` | `vivero` | `dominio` | Ruta legacy redirigida; eliminado el tope masa → plantas. | `src/modules/vivero/screens/ViveroEmbolsadoScreen.tsx` |
| AUD-007 | `ALTA` | `BLOQUEADO` | `vivero` | `api` | Eventos append-only no tienen idempotencia para reintentos después de respuestas perdidas. | `src/modules/vivero/components/event/forms/` |
| AUD-008 | `ALTA` | `RESUELTO` | `recoleccion` | `dominio` | Conversión exacta y precisión canónica validadas antes de persistir; etiquetas G. | `src/utils/recoleccionUnidad.ts`, `src/modules/recolecciones/` |
| AUD-009 | `ALTA` | `RESUELTO` | `recoleccion` | `flujo` | Corrección de RECHAZADO y envío posterior como BORRADOR; rutas de edición protegidas por estado/permiso. | `src/modules/recolecciones/` |
| AUD-010 | `MEDIA` | `RESUELTO` | `vivero` | `deuda` | Comentarios de contratos y README describían como pendientes funciones ya conectadas. | `src/api/lotes-vivero.api.ts`, `src/modules/vivero/types/contracts.ts`, `src/modules/vivero/README.md` |
| AUD-011 | `CRITICA` | `RESUELTO` | `auth` | `seguridad` | Mock retirado; sesión frontend verificada y logout local completo. Seguridad de servidor pendiente en AUD-013. | `src/modules/auth/`, `src/contexts/AuthContext.tsx` |
| AUD-012 | `ALTA` | `RESUELTO` | `shared` | `pwa` | Retirada la promesa de sincronización y los contadores ficticios; se comunica conexión necesaria. | `src/layouts/AuthLayout.tsx`, `src/data/home.ts` |
| AUD-013 | `CRITICA` | `BLOQUEADO` | `auth` | `api` | Backend local admite identidad por x-auth-id sin validar JWT en rutas de perfil; no hay revocación confirmada. | `docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md` |
| AUD-014 | `MEDIA` | `PENDIENTE` | `shared` | `deuda` | Quedan dos alertas moderadas de React Router cuya solución exige migración de versión principal. | `package-lock.json` |
| AUD-015 | `ALTA` | `PENDIENTE` | `plantacion` | `testing` | Revisión de plan y JWT verificados con fixtures; integración backend/migraciones 062 y 063 pendiente. | `docs/QA_EDITOR_PLAN_USO.md` |
| AUD-016 | `MEDIA` | `PENDIENTE` | `plantacion` | `ui` | Estado del encabezado puede quedar antiguo tras cierre concurrente rechazado en el editor. | `DetalleSubcampanaScreen.tsx`, `EditarPlanSubcampania.tsx` |
| AUD-018 | `MEDIA` | `PENDIENTE` | `plantacion` | `ui` | Otros pasos del asistente de creación carecen de guarda ADMIN en UI; el paso del plan ya restringe edición. | `src/modules/plantacion/screens/CrearSubcampanaScreen.tsx` |

---

## 13. Hallazgos detallados

### AUD-002 — Build roto por errores de TypeScript fuera del flujo corregido

- Estado: `RESUELTO`
- Severidad: `ALTA`
- Módulo: `general`
- Ubicación: `src/modules/recolecciones/components/CantidadInput.tsx`, `src/modules/vivero/screens/ViveroNewScreen.tsx`
- Tipo: `testing`
- Detectado por: `IA`
- Fecha: `2026-05-04`

#### Problema

La verificación con `npm run build` falla por errores de TypeScript preexistentes fuera de los archivos corregidos en esta tarea.

#### Riesgo

El frontend no tiene una señal global limpia de compilación, lo que dificulta cerrar tareas con confianza y puede ocultar regresiones reales.

#### Acción sugerida

Corregir primero los errores de `CantidadInput.tsx` relacionados con `onErrorClear` y luego normalizar las unidades inválidas en `ViveroNewScreen.tsx`.

#### Verificación esperada

`npm run build` debe completar sin errores.

#### Notas

Resuelto el 2026-07-19. Verificación: `npm run build` completó TypeScript y el bundle de producción sin errores.

### AUD-003 — Lint global falla por deuda previa y worktrees internos

- Estado: `RESUELTO`
- Severidad: `ALTA`
- Módulo: `general`
- Ubicación: `src/`, `.claude/worktrees/`
- Tipo: `testing`
- Detectado por: `IA`
- Fecha: `2026-06-22`

#### Problema

`npm run lint` falla en archivos ajenos al CRUD de Organizaciones y también analiza `.claude/worktrees`, duplicando errores de worktrees internos.

#### Riesgo

La verificación global de lint no sirve como señal limpia para cerrar tareas y puede ocultar regresiones reales entre errores preexistentes.

#### Acción sugerida

Corregir los errores existentes en `src/` y ajustar la configuración de ESLint para excluir worktrees internos que no forman parte del frontend activo.

#### Verificación esperada

`npm run lint` debe completar sin errores sobre el workspace activo.

#### Notas

Resuelto el 2026-07-19. `eslint.config.js` excluye `.claude/**`; se corrigieron los errores del workspace activo. `npm run lint` finaliza con código 0 y dos advertencias no bloqueantes en Comunidades.

### AUD-004 — Formatters de fecha/tiempo relativo dispersos por módulo

- Estado: `PENDIENTE`
- Severidad: `BAJA`
- Módulo: `general`
- Ubicación: `src/modules/plantacion/utils/subcampaniaFormatters.ts`, `src/modules/plantacion/screens/CampaniaAdminDashboardScreen.tsx`
- Tipo: `deuda`
- Detectado por: `equipo`
- Fecha: `2026-07-05`

#### Problema

`formatDate` está definido en `plantacion/utils/subcampaniaFormatters.ts` y re-envuelto en cada pantalla que necesita un fallback distinto (por ejemplo `CampaniaAdminDashboardScreen` con `"Sin fecha"`). `formatRelativeTime` vive inline en el dashboard de campañas y es útil para cualquier feed con timestamps.

#### Riesgo

Duplicación cuando otros módulos (vivero, recolección) sumen timelines/actividades. Divergencia de estilos ("hace 2 h" vs "hace 2 horas"). Difícil unificar el locale/formato desde un solo lugar.

#### Acción sugerida

Extraer a `src/utils/datetime.ts` (o similar) helpers compartidos: `formatDate(value, opts)`, `formatRelativeTime(iso)`. Actualizar consumidores.

#### Verificación esperada

Una sola implementación por helper, consumidores importan desde el util compartido.

### AUD-005 — Duplicidad de `CAMPANIA_TYPES` con distinto orden

- Estado: `PENDIENTE`
- Severidad: `BAJA`
- Módulo: `plantacion`
- Ubicación: `src/services/plantacion.service.ts`, `src/modules/plantacion/components/CrearCampaniaForm.tsx`
- Tipo: `deuda`
- Detectado por: `equipo`
- Fecha: `2026-07-05`

#### Problema

El service declara `TIPOS_CAMPANIA: TipoCampania[] = ['REFORESTACION', 'ARBORIZACION', 'FORESTACION']` para validación de entrada. El form declara `CAMPANIA_TYPES: TipoCampania[] = ['ARBORIZACION', 'REFORESTACION', 'FORESTACION']` con el orden invertido para el layout visual.

#### Riesgo

Un futuro cambio de enum puede quedar desincronizado. También confunde al lector: sugiere que el orden "correcto" es alguno de los dos.

#### Acción sugerida

Documentar por qué los órdenes difieren (validación vs display) o extraer a `contracts.ts` un `CAMPANIA_TYPE_ORDER` compartido si algún día se decide unificar.

#### Verificación esperada

Los dos arrays incluyen exactamente los mismos elementos (comparados por `sort()`), con un comentario explicando la diferencia de orden.

---

### AUD-006 — Ruta legacy de Embolsado limita plantas según gramos

- Estado: `RESUELTO`
- Severidad: `CRITICA`
- Módulo: `vivero`
- Ubicación: `src/modules/vivero/utils/validators.ts`, `src/modules/vivero/hooks/useEmbolsado.ts`, `src/modules/vivero/screens/ViveroEmbolsadoScreen.tsx`
- Tipo: `dominio`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

La ruta `/app/vivero/:id/event/new` conserva una pantalla antigua que calcula un tope de plantas desde gramos. El contrato vigente define `EMBOLSADO` como un conteo observado y prohíbe convertir masa en plantas.

#### Acción sugerida

Redirigir la ruta legacy al formulario único de eventos y eliminar el cálculo `PLANTAS_POR_GRAMO_TOPE`.

#### Verificación esperada

Una única pantalla registra Embolsado; una cantidad observada válida no se rechaza por una conversión de gramos.

#### Cierre — 2026-09-29

Ruta legacy convertida en redirección. Retirados `useEmbolsado`, `computeMaxPlantasEmbolsado` y la advertencia del formulario vigente basada en gramos. Las pruebas de Embolsado verifican redirección, conteo observado, cancelación/Escape sin upload y confirmación sin doble envío. Lint, tests y build/PWA pasan.

### AUD-007 — Operaciones append-only sin idempotencia

- Estado: `BLOQUEADO`
- Severidad: `ALTA`
- Módulo: `vivero`
- Ubicación: `src/modules/vivero/components/event/forms/`
- Tipo: `api`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

Merma, Adaptabilidad, Despacho y otros eventos definitivos pueden duplicarse si la respuesta se pierde y el usuario reintenta. El frontend no puede resolverlo de forma fiable sin soporte del backend.

#### Acción sugerida

Definir con backend una clave de idempotencia por operación y persistirla junto al intento local.

#### Verificación esperada

Repetir la misma operación con la misma clave devuelve el evento original sin crear otro.

#### Avance — 2026-09-29

Se completaron confirmaciones previas y guardas de doble envío desde el formulario; no se añadieron reintentos automáticos. La ausencia de idempotencia durable sigue confirmada en documentación y código backend local. El hallazgo permanece `BLOQUEADO`; contrato y pruebas requeridas en [la tarea backend](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md).

### AUD-008 — Unidad `G` sin precisión canónica única

- Estado: `RESUELTO`
- Severidad: `ALTA`
- Módulo: `recoleccion`
- Ubicación: `src/utils/recoleccionUnidad.ts`, `src/modules/recolecciones/`
- Tipo: `dominio`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

La conversión redondea a seis decimales y algunos labels muestran `gr`, mientras el contrato exige persistir `G` con máximo un decimal.

#### Acción sugerida

Validar la precisión después de convertir `kg` a `G`, mostrar siempre `G` y evitar redondeos silenciosos que cambien el dato observado.

#### Cierre — 2026-09-29

Conversión decimal exacta antes de construir el payload, validada en captura y resumen; se rechazan fracciones no representables y se mantienen visibles para corregir. Se probaron `0.0001 kg → 0.1 G`, rechazo de `1.25 G` y fracciones en `UNIDAD`. Etiquetas de formulario y stock ajustadas a `G`. Lint, tests y build/PWA pasan.

### AUD-009 — Recolección rechazada sin corrección/reenvío

- Estado: `RESUELTO`
- Severidad: `ALTA`
- Módulo: `recoleccion`
- Ubicación: `src/modules/recolecciones/RecoleccionDetailScreen.tsx`, `src/modules/recolecciones/recoleccionStatus.ts`
- Tipo: `flujo`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

El detalle solo muestra acciones de edición y envío para `BORRADOR`; `RECHAZADO` queda sin camino visible de corrección aunque el dominio lo permite.

#### Acción sugerida

Centralizar la política de acciones por estado y mostrar badges distintos para `PENDIENTE_VALIDACION` y `RECHAZADO`.

#### Cierre — 2026-09-29

Se conserva el contrato observado en backend: `PATCH /:id/draft` corrige `RECHAZADO` y lo devuelve a `BORRADOR`; `PATCH /:id/submit` admite `BORRADOR`. El detalle permite corregir y el resumen guarda antes de enviar. Se verificaron permisos, bloqueo por URL directa de estados congelados y orden de requests con servicios simulados. Los badges existentes se conservaron. Lint, tests y build/PWA pasan; QA de persistencia real pendiente.

### AUD-010 — Documentación inline de Vivero desactualizada

- Estado: `RESUELTO`
- Severidad: `MEDIA`
- Módulo: `vivero`
- Ubicación: `src/api/lotes-vivero.api.ts`, `src/services/lotes-vivero.service.ts`, `src/modules/vivero/types/contracts.ts`, `src/modules/vivero/README.md`
- Tipo: `deuda`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

Comentarios antiguos indicaban que Despacho, Timeline, Asignaciones y endpoints de eventos no se consumían, aunque el código ya los usaba.

#### Acción sugerida

Eliminar bloques históricos y documentar el contrato vigente junto con los pendientes reales.

#### Cierre

- Fecha: `2026-07-21`
- Corregido por: `Codex`
- Verificación: `rg` sin referencias a Despacho/Timeline deshabilitados en los contratos revisados.
- Evidencia: `src/api/lotes-vivero.api.ts`, `src/services/lotes-vivero.service.ts`, `src/modules/vivero/types/contracts.ts`, `src/modules/vivero/README.md`.

### AUD-011 — Registro mock y logout incompleto

- Estado: `RESUELTO`
- Severidad: `CRITICA`
- Módulo: `auth`
- Ubicación: `src/modules/auth/RegisterScreen.tsx`, `src/contexts/AuthContext.tsx`
- Tipo: `seguridad`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

El registro crea una sesión local sin autenticación real y el logout del contexto no limpia el token persistido por WebAuthn.

#### Acción sugerida

Eliminar el flujo mock, usar una sola fuente de sesión y limpiar/invalidatear token y usuario en cada logout.

#### Cierre frontend — 2026-09-29

Registro real compartido con Login, único estado de sesión en `AuthContext`, perfil obtenido con Bearer, timeout/reintento y descarte de respuestas tardías después del logout. Se limpiaron logs de autenticación y perfil. Pruebas de sesión y contrato HTTP verifican token rechazado, fallo de red, timeout y logout; en navegador el cache local de un supuesto ADMIN sin token no permite acceder a una ruta protegida. Lint, tests y build/PWA pasan. Logout local no equivale a revocación de servidor; seguimiento separado en `AUD-013`.

### AUD-012 — Promesa offline superior a la implementación

- Estado: `RESUELTO`
- Severidad: `ALTA`
- Módulo: `shared`
- Ubicación: `vite.config.ts`, `src/pwa/registerPwa.ts`, `src/layouts/AuthLayout.tsx`
- Tipo: `pwa`
- Detectado por: `Codex`
- Fecha: `2026-07-21`

#### Problema

La interfaz anuncia sync offline. El app shell ya se precachea mediante Workbox, se excluyen las llamadas API del fallback de navegación y las nuevas versiones se activan automáticamente, pero todavía no existe una cola outbox ni sincronización real de operaciones con el backend.

#### Acción sugerida

Retirar la promesa de sincronización hasta implementar offline real o definir e implementar una estrategia explícita de API/outbox. No convertir errores de red del backend en respuestas cacheadas.

#### Cierre — 2026-09-29

Acceso e Inicio comunican conexión necesaria para enviar registros y fotos. Se retiraron `82% sincronizado` y `6 registros se cargarán...`, que eran datos ficticios. No se implementó outbox ni caché de API. Inspección de textos, lint y build/PWA correctos.

### AUD-013 — Autorización backend por headers de identidad

- Estado: `BLOQUEADO`
- Severidad: `CRITICA`
- Módulo: `auth`
- Tipo: `api`
- Detectado: `2026-09-27`, revisión de código backend local.
- Ubicación: `../Backend-r3foresta/src/users/users.controller.ts`.

El controller de perfil prioriza `x-auth-id` antes de verificar JWT; la rama identificada como desarrollo no comprueba entorno. La corrección frontend usa Bearer, pero no impide solicitudes directas al servidor. Falta confirmar revocación y migrar coordinadamente otros consumidores de headers. Acción y aceptación: [tarea backend](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md). No se verificó el comportamiento del servidor desplegado.

### AUD-014 — Alertas de React Router pendientes de migración

- Estado: `PENDIENTE`
- Severidad: `MEDIA`
- Módulo: `shared`
- Tipo: `deuda`
- Ubicación: `package-lock.json`.
- Detectado: `2026-09-27`.

La actualización compatible (`npm audit fix`, sin `--force`) redujo 18 alertas, incluidas 10 altas, a dos moderadas en `react-router`/`react-router-dom`. El lockfile usa React Router 6.30.6 y Vite 7.3.6. Las alertas restantes son GHSA-wrjc-x8rr-h8h6 y GHSA-337j-9hxr-rhxg; npm propone migrar a React Router 7 para cerrarlas. Planificar esa migración con verificación de rutas y redirects; no aplicar un cambio mayor automático. Build y navegación básica fueron verificados tras actualizar.

---

### AUD-015 — QA integrado de revisiones del plan pendiente

- Estado: `PENDIENTE`
- Severidad: `ALTA`
- Módulo: `plantacion`
- Tipo: `api | testing`
- Ubicación: `src/api/plantacion.api.ts`, `src/modules/plantacion/components/EditarPlanSubcampania.tsx`, backend migraciones `062` (revisión atómica) y `063` (restricción de lectura directa).
- Detectado: `2026-10-09`.

El editor consume la revisión atómica con `meta_total_arboles`, `metas` y `revision_esperada`, conserva propuestas ante rechazos y bloquea servidores que no entregan `plan_revision`. Las pruebas frontend usan servicios/respuestas simulados; no acreditan la migración ni el despliegue en la base compartida.

Verificar en staging con actores controlados: ADMIN ACTIVA 50/40 → 50/60, misma cantidad física y estado; especie nueva sin stock; asignación/plantación posterior; retirada protegida; dos revisiones concurrentes; cierre manual con la meta vigente. Confirmar primero backend y migración 062 coordinados con la PWA. La prueba de idempotencia de eventos físicos continúa en `AUD-007`.

El 2026-10-09 se verificaron recorridos de uso en navegador con las pantallas/API/servicio reales y respuestas HTTP sintéticas, además de lint completo, 149 tests y build/PWA. Evidencia y límites en `docs/QA_EDITOR_PLAN_USO.md`; este avance no cierra la integración pendiente.

El 2026-10-10 se cerró el envío sin JWT en GET/PUT del plan, incluido el helper histórico. Se retiró del asistente el fallback que actualizaba meta por PATCH y especies por separado; un servidor sin versión conserva el borrador local. Los errores de lectura ya son visibles; 401 ofrece recuperación con el login WebAuthn existente y 403 bloquea edición sin cerrar sesión. Los fallos de guardado incierto exigen consulta y revisión explícita, conservando la propuesta. Las pruebas usan respuestas simuladas: la publicación coordinada del backend y las migraciones 062/063 siguen pendientes a cargo del usuario, sin escrituras de prueba en Supabase compartido.

La propuesta del editor se conserva también durante cambios de passkey y, antes de recuperar sesión, en un borrador temporal por subcampaña/propietario para sobrevivir al desmontaje de la ruta si falla el perfil. No se almacena token ni versión para reenvíos. Verificación ejecutada: `npm run test` (284 pruebas, 19 suites), `npm run lint`, `npm run build` (TypeScript, Vite y PWA) y `git diff --check`, todos aprobados.

### AUD-016 — Encabezado antiguo tras cierre concurrente en el editor

- Estado: `PENDIENTE`
- Severidad: `MEDIA`
- Módulo: `plantacion`
- Tipo: `ui`
- Ubicación: `src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx`, `src/modules/plantacion/components/EditarPlanSubcampania.tsx`.
- Detectado: `2026-10-09`.

En la prueba de uso con respuesta 422 y plan vigente COMPLETADA, el editor conservó la propuesta y bloqueó edición/guardado correctamente. El encabezado exterior seguía mostrando ACTIVA, procedente de su última lectura, hasta recargar. Puede confundir al cancelar la edición y volver a las acciones del detalle; no se observó guardado autorizado tras el rechazo.

Sugerencia: reconciliar o recargar el detalle cuando el editor confirma un cambio de estado/permiso, sin eliminar la propuesta ni repetir el PUT. Verificar cierre concurrente, error de la recarga y conservación de valores con una prueba de detalle más el backend integrado.

### AUD-017 — Consulta del plan sin feedback y código de Plantación sin consumidores

- Estado: `RESUELTO`
- Severidad: `BAJA`
- Módulo: `plantacion`
- Tipo: `ui`, `mantenibilidad`
- Detectado y corregido: `2026-10-09`.

«Consultar plan vigente» hacía una lectura real, pero aparecía siempre y no informaba cuando el plan no había cambiado. Ahora «Actualizar plan para continuar» aparece ante conflicto o lectura actual fallida tras un rechazo; comunica carga, error o éxito, conserva la propuesta y exige revisar nuevamente. Los rechazos de autorización bloquean la recuperación.

La búsqueda de consumidores permitió retirar `SelectorCampania`, el barrel del módulo, el helper de borrador sin uso y las cadenas API/service/tipos de borrado directo de campaña y asociación/desasociación de organizaciones sin pantallas consumidoras. La desactivación atómica, creación con organizaciones y compatibilidad de borradores siguen conectadas. Esta limpieza cubre los archivos de Plantación revisados, no una auditoría completa del repositorio.

Verificación: 191 pruebas en 19 suites, lint completo, build/TypeScript/PWA y `git diff --check`. Se añadieron siete casos de recuperación; los tests de cierre, plantación y API siguen pasando. Las respuestas de estos tests son simuladas; `AUD-015` y `AUD-016` permanecen pendientes.

### AUD-018 — Permisos de UI en otros pasos del asistente

- Estado: `PENDIENTE`
- Severidad: `MEDIA`
- Módulo: `plantacion`
- Tipo: `ui`
- Ubicación: `src/modules/plantacion/screens/CrearSubcampanaScreen.tsx` y sus pasos de datos base/equipo/resumen.
- Detectado: `2026-10-10`.

El asistente admite acceso directo por URL sin una guarda ADMIN global en sus otros pasos. El paso de meta/especies ya limita edición a ADMIN y exige JWT, sin cambiar el contrato de las demás rutas. El backend conserva la autorización final; este hallazgo describe controles de UI que pueden ofrecer acciones rechazadas por el servidor. Revisar los permisos del asistente completo en una tarea propia y cubrir navegación directa de roles sin permiso.

## 14. Riesgos conocidos

Registrar riesgos que todavía no son bugs confirmados.

| Riesgo | Impacto | Estado | Acción |
|---|---|---|---|
| La implementación y el contrato backend pueden desfasarse | Cambios de API o migraciones no aplicadas | `PENDIENTE` | Verificar staging y mantener `ESTADO.md` actualizado. |
| El backend no ofrece idempotencia para eventos | Reintentos pueden duplicar trazabilidad | `BLOQUEADO` | Definir contrato con backend. |
| No existe sync offline de operaciones | La operación en campo necesita red | `PENDIENTE` | La UI ya comunica el límite; diseñar outbox solo tras acordar idempotencia. |

---

## 15. Deuda técnica aceptada temporalmente

Registrar deuda que se permite por ahora, con límite claro.

| Deuda | Motivo | Límite | Responsable | Estado |
|---|---|---|---|---|
| Pantallas monolíticas en flujos complejos | No bloquea el MVP; priorizar claridad operativa | Extraer gradualmente por caso de uso; la carga de rutas bajo demanda quedó resuelta el 2026-08-13 | Frontend | `PENDIENTE` |
| Cobertura E2E de backend real | Vitest y 32 pruebas frontend ya incorporados; no reemplazan integración real | Probar permisos, evidencia y persistencia con actores QA controlados | Frontend + Backend | `PENDIENTE` |

Regla:

> La deuda aceptada debe tener motivo y límite. Si no tiene límite, no es deuda aceptada: es desorden.

---

## 16. Criterio para cerrar hallazgos

Un hallazgo puede pasar a `RESUELTO` cuando:

- se corrigió el problema;
- se ejecutó verificación mínima;
- no se introdujo una regresión evidente;
- el cambio respeta `AGENTS.md`;
- el cambio respeta `FRONTEND_GUIDE.md`;
- si afecta dominio, se validó contra `DOMAIN_INDEX.md` o documentos fuente;
- se dejó nota si algo no pudo verificarse.

Formato de cierre recomendado:

```md
#### Cierre

- Fecha:
- Corregido por:
- Verificación:
- Evidencia:
- Notas:
```

---

## 17. Rutina sugerida de auditoría

### Auditoría ligera por PR o tarea

Revisar:

- archivos modificados;
- uso de tipos;
- manejo de loading/error/empty;
- contratos API;
- reglas de dominio afectadas;
- comandos ejecutados.

### Auditoría semanal

Revisar:

- hallazgos `CRITICA` y `ALTA`;
- deuda técnica nueva;
- pantallas incompletas;
- duplicaciones;
- formularios críticos;
- integración con backend.

### Auditoría por módulo

Cuando se cierre una feature grande, revisar:

- arquitectura interna;
- formularios;
- servicios API;
- estados UI;
- dominio;
- pruebas/verificación;
- documentación actualizada.

---

## 18. Antipatrones a vigilar

Marcar hallazgo si aparece alguno:

- componentes gigantes;
- lógica de negocio dentro de JSX;
- `any` usado por comodidad;
- llamadas HTTP dispersas;
- enums duplicados en muchos archivos;
- URLs hardcodeadas;
- snapshots editables;
- campos calculados editables;
- saldos recalculados como verdad en frontend;
- botones para editar/borrar eventos append-only;
- evidencia obligatoria no exigida;
- errores genéricos sin recuperación;
- operaciones atómicas partidas desde UI;
- librerías agregadas sin necesidad.

---

## 19. Mantenimiento del archivo

Actualizar este archivo cuando:

- se detecte un hallazgo relevante;
- se resuelva deuda técnica;
- cambie una decisión de arquitectura;
- se agregue una feature importante;
- se cierre una auditoría de módulo;
- una confusión se repita más de una vez.

Mantenerlo vivo, concreto y accionable.

No usarlo como diario informal ni como copia de reglas de negocio.
