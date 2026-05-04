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

Actualizar esta sección cuando se haga una revisión importante.

| Área | Estado | Observación |
|---|---|---|
| Arquitectura por features | `SIN_REVISAR` | Pendiente revisar contra estructura real del repo. |
| Servicios/API | `SIN_REVISAR` | Pendiente confirmar si existe capa centralizada. |
| Formularios | `SIN_REVISAR` | Pendiente auditar validaciones y manejo de errores. |
| UI/UX dominio | `SIN_REVISAR` | Pendiente revisar estados, saldos, snapshots y evidencias. |
| TypeScript | `SIN_REVISAR` | Pendiente revisar uso de `any`, DTOs y view models. |
| Testing/build | `SIN_REVISAR` | Pendiente confirmar comandos y cobertura mínima. |

Estados sugeridos para esta tabla:

- `SIN_REVISAR`
- `BIEN`
- `MEJORABLE`
- `RIESGO`
- `CRITICO`

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

- Pendiente registrar.

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

- Pendiente registrar.

---

## 10. Checklist de arquitectura por feature

Usar al revisar una carpeta dentro de `features/`.

### Feature revisada

- Nombre: `pendiente`
- Fecha: `pendiente`
- Responsable: `pendiente`

### Estructura

- [ ] Tiene `api/` si consume backend.
- [ ] Tiene `components/` si hay UI específica.
- [ ] Tiene `hooks/` si hay lógica reutilizable.
- [ ] Tiene `pages/` si maneja rutas.
- [ ] Tiene `types/` si define contratos o modelos.
- [ ] Tiene `utils/`, `mappers/` o `schemas/` si transforma datos o valida formularios.
- [ ] No mezcla responsabilidades de otras features.
- [ ] No duplica componentes de `shared`.

### Resultado

- Estado: `SIN_REVISAR`
- Observaciones:
  - Pendiente.

---

## 11. Auditoría por módulo

### 11.1 `app/`

Estado: `SIN_REVISAR`

Revisar:

- providers globales;
- router;
- layout base;
- configuración;
- carga inicial;
- dependencias globales.

Hallazgos:

- Pendiente registrar.

### 11.2 `shared/`

Estado: `SIN_REVISAR`

Revisar:

- componentes reutilizables;
- helpers;
- cliente HTTP base;
- tipos genéricos;
- constantes;
- layouts comunes.

Hallazgos:

- Pendiente registrar.

### 11.3 `features/recoleccion`

Estado: `SIN_REVISAR`

Revisar:

- formularios de borrador;
- validación;
- estados de registro;
- estado operativo;
- evidencia;
- elegibilidad para Vivero;
- snapshots.

Hallazgos:

- Pendiente registrar.

### 11.4 `features/vivero`

Estado: `SIN_REVISAR`

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

- Pendiente registrar.

### 11.5 `features/evidencias`

Estado: `SIN_REVISAR`

Revisar:

- subida;
- preview;
- metadatos;
- errores de carga;
- vínculo con entidad;
- uso correcto de storage.

Hallazgos:

- Pendiente registrar.

### 11.6 `features/auth`

Estado: `SIN_REVISAR`

Revisar:

- login;
- sesión;
- roles;
- permisos visuales;
- rutas protegidas;
- expiración o error de sesión.

Hallazgos:

- Pendiente registrar.

---

## 12. Registro de hallazgos activos

Mantener esta tabla actualizada.

| ID | Severidad | Estado | Módulo | Tipo | Resumen | Ubicación |
|---|---|---|---|---|---|---|
| AUD-001 | `MEDIA` | `PENDIENTE` | `general` | `deuda` | Primera auditoría pendiente contra repo real. | `frontend/` |

---

## 13. Hallazgos detallados

### AUD-001 — Primera auditoría pendiente contra repo real

- Estado: `PENDIENTE`
- Severidad: `MEDIA`
- Módulo: `general`
- Ubicación: `frontend/`
- Tipo: `deuda`
- Detectado por: `equipo`
- Fecha: `pendiente`

#### Problema

Este documento define el marco de auditoría, pero todavía falta revisar el repo real con checklist por módulos.

#### Riesgo

Podrían existir pantallas, formularios o servicios que no sigan la arquitectura esperada o que dupliquen lógica.

#### Acción sugerida

Hacer una primera auditoría por carpetas:

1. `app`
2. `shared`
3. `features/recoleccion`
4. `features/vivero`
5. `features/evidencias`
6. `features/auth`

#### Verificación esperada

Cada módulo debe quedar marcado como `BIEN`, `MEJORABLE`, `RIESGO` o `CRITICO` en el resumen ejecutivo.

#### Notas

Actualizar este hallazgo después de la primera revisión real.

---

## 14. Riesgos conocidos

Registrar riesgos que todavía no son bugs confirmados.

| Riesgo | Impacto | Estado | Acción |
|---|---|---|---|
| Falta confirmar estructura real del repo | Puede haber desalineación con la guía | `PENDIENTE` | Revisar carpetas reales. |
| Falta confirmar capa API | Puede haber llamadas HTTP dispersas | `PENDIENTE` | Buscar `fetch`, `axios` o cliente HTTP. |
| Falta confirmar manejo de formularios | Puede haber validaciones duplicadas o débiles | `PENDIENTE` | Revisar formularios principales. |
| Falta confirmar comandos de verificación | Puede dificultar cierre de tareas | `PENDIENTE` | Revisar `package.json`. |

---

## 15. Deuda técnica aceptada temporalmente

Registrar deuda que se permite por ahora, con límite claro.

| Deuda | Motivo | Límite | Responsable | Estado |
|---|---|---|---|---|
| Pendiente | Pendiente | Pendiente | Pendiente | `PENDIENTE` |

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
