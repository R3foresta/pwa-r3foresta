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

Última auditoría estática: `2026-07-21`. Se revisó el repo real, la configuración, los flujos principales y la documentación asociada. `BIEN` significa que no se detectó una desviación crítica en la revisión estática; no reemplaza pruebas de integración ni QA manual.

| Área | Estado | Observación |
|---|---|---|
| Arquitectura por módulos | `MEJORABLE` | Feature-first funcional, pero hay pantallas y services demasiado grandes. |
| Servicios/API | `RIESGO` | Existen varias capas y llamadas HTTP repetidas; falta un cliente común. |
| Formularios | `MEJORABLE` | Los flujos principales manejan loading/error/evidencia; faltan confirmaciones e idempotencia uniforme. |
| UI/UX dominio | `RIESGO` | Hay una ruta legacy de Embolsado y estados de Recolección incompletos. |
| TypeScript | `BIEN` | TypeScript estricto; no se encontraron usos de `any` en la revisión. |
| Testing/build | `MEJORABLE` | `build` y `lint` pasan; no existen scripts de typecheck separado ni tests automatizados. |

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

`npm run lint` ejecuta `eslint .` y hoy falla por errores existentes fuera del cambio de Vivero, incluyendo archivos duplicados dentro de `.claude/worktrees` y reglas en módulos legacy.

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
- La ruta `/auth/register` todavía expone un flujo mock; ver `AUD-011`.
- Existe una ruta legacy `/app/vivero/:id/event/new`; ver `AUD-006`.

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
- La PWA declara sincronización offline, pero el service worker no implementa una cola de sincronización; ver `AUD-012`.

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

- `RECHAZADO` no recibe las mismas acciones de corrección/reenvío que `BORRADOR`.
- La conversión a `G` no limita la precisión a un decimal y algunas etiquetas muestran `gr`.
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
- La ruta legacy de Embolsado mantiene una regla de tope incompatible con el dominio.
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

Estado: `CRITICO`

Revisar:

- login;
- sesión;
- roles;
- permisos visuales;
- rutas protegidas;
- expiración o error de sesión.

Hallazgos:

- `/auth/register` crea sesión mock sin validar credenciales.
- `AuthContext.logout` no elimina el token persistido por WebAuthn.
- El manejo de sesión restaurada depende del cache local y no valida siempre el token contra backend.

---

## 12. Registro de hallazgos activos

Mantener esta tabla actualizada.

| ID | Severidad | Estado | Módulo | Tipo | Resumen | Ubicación |
|---|---|---|---|---|---|---|
| AUD-002 | `ALTA` | `RESUELTO` | `general` | `testing` | `build` vuelve a completar correctamente. | `src/` |
| AUD-003 | `ALTA` | `RESUELTO` | `general` | `testing` | `npm run lint` pasa y excluye worktrees internos. | `eslint.config.js`, `src/` |
| AUD-004 | `BAJA` | `PENDIENTE` | `general` | `deuda` | `formatDate` y `formatRelativeTime` viven duplicados/en línea por módulo; conviene extraerlos a un util compartido. | `src/modules/plantacion/utils/subcampaniaFormatters.ts`, `src/modules/plantacion/screens/CampaniaAdminDashboardScreen.tsx` |
| AUD-005 | `BAJA` | `PENDIENTE` | `plantacion` | `deuda` | `CAMPANIA_TYPES` está definido dos veces con distinto orden (validación en service, orden visual en form). | `src/services/plantacion.service.ts`, `src/modules/plantacion/components/CrearCampaniaForm.tsx` |
| AUD-006 | `CRITICA` | `PENDIENTE` | `vivero` | `dominio` | Ruta legacy de Embolsado limita plantas según gramos, contradiciendo RN-VIV-17C. | `src/modules/vivero/utils/validators.ts`, `src/modules/vivero/screens/ViveroEmbolsadoScreen.tsx` |
| AUD-007 | `ALTA` | `BLOQUEADO` | `vivero` | `api` | Eventos append-only no tienen idempotencia para reintentos después de respuestas perdidas. | `src/modules/vivero/components/event/forms/` |
| AUD-008 | `ALTA` | `PENDIENTE` | `recoleccion` | `dominio` | La precisión de `G` no está limitada a un decimal y la UI usa `gr` en algunos lugares. | `src/utils/recoleccionUnidad.ts`, `src/modules/recolecciones/` |
| AUD-009 | `ALTA` | `PENDIENTE` | `recoleccion` | `flujo` | Los registros `RECHAZADO` no se pueden corregir y reenviar desde el detalle. | `src/modules/recolecciones/RecoleccionDetailScreen.tsx` |
| AUD-010 | `MEDIA` | `RESUELTO` | `vivero` | `deuda` | Comentarios de contratos y README describían como pendientes funciones ya conectadas. | `src/api/lotes-vivero.api.ts`, `src/modules/vivero/types/contracts.ts`, `src/modules/vivero/README.md` |
| AUD-011 | `CRITICA` | `PENDIENTE` | `auth` | `seguridad` | Registro mock accesible y logout incompleto para tokens persistidos. | `src/modules/auth/RegisterScreen.tsx`, `src/contexts/AuthContext.tsx` |
| AUD-012 | `ALTA` | `PENDIENTE` | `shared` | `pwa` | El app shell ya se precachea y actualiza automáticamente, pero la UI todavía promete sync offline sin implementar outbox/API offline. | `vite.config.ts`, `src/pwa/registerPwa.ts`, `src/layouts/AuthLayout.tsx` |

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

- Estado: `PENDIENTE`
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

### AUD-008 — Unidad `G` sin precisión canónica única

- Estado: `PENDIENTE`
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

### AUD-009 — Recolección rechazada sin corrección/reenvío

- Estado: `PENDIENTE`
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

- Estado: `PENDIENTE`
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

### AUD-012 — Promesa offline superior a la implementación

- Estado: `PENDIENTE`
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

---

## 14. Riesgos conocidos

Registrar riesgos que todavía no son bugs confirmados.

| Riesgo | Impacto | Estado | Acción |
|---|---|---|---|
| La implementación y el contrato backend pueden desfasarse | Cambios de API o migraciones no aplicadas | `PENDIENTE` | Verificar staging y mantener `ESTADO.md` actualizado. |
| El backend no ofrece idempotencia para eventos | Reintentos pueden duplicar trazabilidad | `BLOQUEADO` | Definir contrato con backend. |
| El service worker no representa sync offline real | La operación en campo puede fallar sin red | `PENDIENTE` | Decidir alcance offline antes de prometerlo en UI. |

---

## 15. Deuda técnica aceptada temporalmente

Registrar deuda que se permite por ahora, con límite claro.

| Deuda | Motivo | Límite | Responsable | Estado |
|---|---|---|---|---|
| Pantallas monolíticas en flujos complejos | No bloquea el MVP; priorizar claridad operativa | Extraer gradualmente por caso de uso; la carga de rutas bajo demanda quedó resuelta el 2026-08-13 | Frontend | `PENDIENTE` |
| Ausencia de pruebas automatizadas | No hay runner configurado actualmente | Añadir unitarias de dominio y E2E de flujos críticos | Frontend | `PENDIENTE` |

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
