## 1. Rol del agente

Eres un agente de desarrollo frontend para R3foresta.
Tu trabajo es ayudar a mejorar, refactorizar, documentar, auditar o implementar pantallas del frontend sin romper reglas de negocio, contratos con backend ni trazabilidad.

Prioriza:

- claridad sobre “magia”;
- cambios pequeños sobre refactors gigantes;
- consistencia con patrones existentes;
- UX simple para operación real en campo/vivero;
- verificación antes de declarar una tarea terminada.
- Si hay algo que no esta claro, pregunta o pedir como un ENDPOINT.

## Arquitectura del frontend

El frontend usa una arquitectura modular basada en features.
Orden estructural para escalar, mantener trazabilidad y evitar mezcla entre UI, reglas de negocio y acceso a datos.
Aunque la UI todavía puede evolucionar, la estructura del código debe mantenerse estable.

---

## 2. Antes de modificar código

Primero explora, luego planifica, luego implementa.

Antes de tocar archivos:

1. Lee `package.json` y detecta el stack real.
2. Revisa la estructura de carpetas existente.
3. Busca patrones ya usados antes de crear uno nuevo.
4. Revisa `FRONTEND_GUIDE.md`.
5. Revisa `FRONTEND_AUDIT.md` si la tarea es de limpieza, deuda técnica o refactor.
6. Identifica si la tarea afecta reglas de Recolección, Vivero, Evidencias o Auth.
7. Si el cambio toca varios archivos o no está claro, propone un plan corto antes de implementar.

No asumas arquitectura, librerías o rutas si puedes verificarlas en el repo.

---

## 3. Comandos del proyecto

Usa siempre el package manager existente. Detecta por lockfile:

- `package-lock.json` -> usar `npm`

```bash
# instalar dependencias
npm install

# desarrollo
npm run dev

# lint
npm run lint

# typecheck, si existe
npm run typecheck

# tests, si existen
npm run test

# build
npm run build
```

Regla: no inventes scripts. Si un script no existe, reporta que no existe y que puedes crearlo. Usa el comando equivalente solo si el stack lo permite.

---

## 4. Archivos de referencia

Documentos esperados dentro de `/frontend`:

- `AGENTS.md`: reglas para agentes.
- `FRONTEND_GUIDE.md`: arquitectura frontend, convenciones UI/UX y patrones.
- `FRONTEND_AUDIT.md`: checklist vivo de deuda técnica, calidad y pendientes.
- `../docs/DOMAIN_INDEX.md`: resumen de entidades, reglas y procesos del dominio.

---

## 5. Reglas críticas del dominio

Estas reglas no son negociables desde frontend.

### 5.1 Recolección

- Una recolección es el lote origen del sistema.
- Estados de registro: `BORRADOR`, `PENDIENTE_VALIDACION`, `VALIDADO`, `RECHAZADO`.
- Estado operativo: `ABIERTO` o `CERRADO`, derivado del saldo.
- Solo una recolección `VALIDADO` y `ABIERTO` puede alimentar Vivero.
- `BORRADOR` y `RECHAZADO` pueden editarse según permisos.
- `PENDIENTE_VALIDACION` queda congelado mientras se revisa.
- `VALIDADO` no se edita: solo permite movimientos posteriores.
- El consumo hacia Vivero se registra como `CONSUMO_A_VIVERO` con delta negativo.
- El frontend no debe crear pantallas que permitan consumir manualmente desde Recolección si el flujo definido es automático desde Vivero.

### 5.2 Unidades

- Persistencia oficial: `UNIDAD` y `G`.
- `kg` puede existir como input de UI, pero no se persiste.
- No usar `GR`. Usar siempre `G`.
- `G` permite 1 decimal.
- `UNIDAD` no permite decimales.
- `ESQUEJE` siempre usa `UNIDAD`, entero estricto.
- Desde `EMBOLSADO`, el saldo vivo siempre se maneja en `UNIDAD`.

### 5.3 Inicio de Vivero

- Un lote de vivero nace desde un único lote origen.
- No se mezclan varias recolecciones en un lote de vivero.
- El lote de vivero hereda snapshots desde `RECOLECCION` validada, no desde una lectura viva de `PLANTA`.
- `vivero_id` se selecciona en Vivero; no se hereda automáticamente desde `RECOLECCION.vivero_id`.
- `INICIO` descuenta material de Recolección y crea material en proceso.
- `INICIO` no crea plantas vivas.
- En `INICIO`, `plantas_vivas_iniciales`, `saldo_vivo_actual`, `saldo_vivo_antes` y `saldo_vivo_despues` deben mostrarse como no disponibles o nulos si aparecen en UI.

### 5.4 Embolsado

- `EMBOLSADO` es el nacimiento del saldo vivo.
- Solo puede registrarse una vez por lote.
- `plantas_vivas_iniciales > 0`.
- `cantidad_afectada = plantas_vivas_iniciales`.
- `unidad_medida_evento = UNIDAD`.
- `saldo_vivo_antes = 0` (el backend pasa null).
- `saldo_vivo_despues = plantas_vivas_iniciales`.
- El sistema no convierte automáticamente gramos en plantas vivas.
- La UI debe tratar las plantas vivas como dato observado, no como resultado matemático del peso inicial.

### 5.5 Adaptabilidad

- `ADAPTABILIDAD` es seguimiento operativo.
- No cambia saldo vivo.
- No bloquea `MERMA` ni `DESPACHO`.
- Puede registrarse múltiples veces.
- No requiere secuencia rígida entre `SOMBRA`, `MEDIA_SOMBRA` y `SOL_DIRECTO`.
- Aplica al lote completo, no a plantas individuales.
- Evidencia opcional.

### 5.6 Merma

- `MERMA` registra pérdida real del saldo vivo.
- Requiere `EMBOLSADO` previo.
- Puede registrarse después de `EMBOLSADO`, exista o no evento de `ADAPTABILIDAD`.
- Usa `UNIDAD`.
- `cantidad_afectada > 0`.
- `cantidad_afectada <= saldo_vivo_disponible`.
- Requiere causa de merma.
- Requiere evidencia en eventos críticos.
- Si el saldo llega a 0, el backend debe cerrar el lote automáticamente.

### 5.7 Despacho

- `DESPACHO` registra salida parcial o total hacia plantación u otro destino.
- Requiere `EMBOLSADO` previo.
- `ADAPTABILIDAD` no es requisito para despachar.
- Usa `UNIDAD`.
- `cantidad_afectada > 0`.
- `cantidad_afectada <= saldo_vivo_disponible`.
- Requiere destino estructurado.
- Requiere evidencia.
- Puede haber múltiples despachos parciales.
- Si el saldo llega a 0, el backend debe cerrar el lote automáticamente.

### 5.8 Eventos e historial

- Los eventos de Vivero son append-only.
- Una vez registrado un evento, no se edita ni se elimina desde UI.
- Si una pantalla muestra eventos, debe comunicar que son historial auditable.
- No ocultar eventos en timelines salvo filtros visuales explícitos.
- No crear botones de “editar evento” o “borrar evento” para eventos ya registrados.

### 5.9 Evidencias de trazabilidad

- La evidencia se asocia por `tipo_entidad_id` + `entidad_id`.
- Para eventos de Vivero, `entidad_id` apunta a `EVENTO_LOTE_VIVERO.id`.
- `INICIO`, `EMBOLSADO`, `MERMA` y `DESPACHO` requieren mínimo una foto válida.
- `ADAPTABILIDAD` puede tener evidencia, pero no es obligatoria.
- No se aceptan evidencias tardías para eventos obligatorios en el MVP.
- `bucket` y `ruta_archivo` no deben tratarse como URL pública.
- Los metadatos de evidencia deben mostrarse, no reinventarse.

---

## 6. Responsabilidad del frontend

El frontend debe:

- guiar al usuario;
- prevenir errores obvios antes de enviar;
- mostrar estados, saldos y restricciones con claridad;
- consumir contratos del backend;
- representar snapshots congelados cuando corresponda;
- mostrar campos calculados como solo lectura;
- mantener formularios simples y entendibles;
- reflejar la secuencia real del proceso (no inventar flujos);
- hacer visibles las restricciones del sistema (estado, saldo, evidencia, etc.).

El frontend no debe:

- recalcular saldos como fuente de verdad;
- simular cierres automáticos como si fueran persistidos;
- convertir masa en plantas vivas;
- sobrescribir snapshots;
- editar o sobrescribir eventos existentes;
- asumir que los eventos pueden modificarse después de guardados;
- decidir reglas de elegibilidad finales;
- reemplazar validaciones del backend;
- asumir reglas como definitivas sin confirmación del backend;
- dividir operaciones que deben ser atómicas en múltiples acciones independientes;
- inventar enums fuera del esquema;
- persistir kg;
- mezclar G con GR;
- ocultar restricciones críticas del sistema.

Validación frontend = ayuda UX.
Validación backend = verdad del sistema.
---

## 7. Convenciones de implementación

El frontend usa React + TypeScript + Vite + Tailwind CSS. 
Adáptate a la estructura real del repo, pero respeta estas reglas generales.

### 7.1 TypeScript

- Preferir tipos explícitos para entidades del dominio.
- Evitar `any`, salvo justificación temporal y localizada.
- Mantener DTOs/contratos API separados de tipos de UI si el proyecto ya usa esa separación.
- No cambiar nombres de campos del backend para “hacerlos más bonitos”.
- Si hace falta mejorar labels para UI, mapearlos en capa de presentación.
- No inventar enums en frontend; usar los valores definidos por backend/esquema.

### 7.2 Componentes

- Componentes pequeños y enfocados.
- Separar componentes presentacionales de lógica de datos cuando el patrón exista.
- No meter reglas de negocio complejas dentro de JSX.
- Extraer formularios grandes en secciones entendibles.
- Reutilizar componentes existentes antes de crear nuevos.
- Evitar componentes “mega pantalla” que mezclen tabla, formulario, API, validaciones y modal en un solo archivo.

### 7.3 Servicios/API

- Centralizar llamadas HTTP en servicios, clients, hooks o capa equivalente existente.
- No hacer `fetch/axios` disperso por cualquier componente si ya existe una capa API.
- Manejar estados: loading, empty, error, success.
- No hardcodear URLs del backend; usar configuración/env existente.
- No duplicar reglas finales del backend en frontend.
- No simular respuestas persistidas si el backend todavía no confirmó la operación.
- Para operaciones críticas, consumir endpoints transaccionales del backend; no partir operaciones atómicas en múltiples requests desde la UI.

### 7.4 Formularios

- Usar validaciones frontend para mejorar UX, no para reemplazar backend.
- Mostrar errores por campo cuando sea posible.
- Bloquear submit si faltan campos obligatorios evidentes.
- Evitar formularios enormes sin secciones.
- Separar formularios largos por bloques: datos base, cantidad/unidad, ubicación, evidencia, observaciones.
- Para eventos append-only, antes de confirmar mostrar resumen claro:
  - lote;
  - evento;
  - cantidad;
  - unidad;
  - fecha;
  - responsable;
  - evidencia;
  - efecto esperado sobre el saldo cuando aplique.
- Para acciones definitivas, usar confirmación explícita antes de enviar.

### 7.5 UI/UX

- UI en español.
- Priorizar claridad operativa sobre diseño ornamental.
- Usar Tailwind CSS siguiendo patrones existentes del proyecto.
- Evitar estilos inline salvo casos puntuales justificados.
- No introducir librerías UI nuevas sin necesidad clara.
- Mostrar badges para estados:
  - `BORRADOR`
  - `PENDIENTE_VALIDACION`
  - `VALIDADO`
  - `RECHAZADO`
  - `ABIERTO`
  - `CERRADO`
  - `ACTIVO`
  - `FINALIZADO`
- Diferenciar visualmente:
  - material en proceso;
  - plantas vivas;
  - saldo vivo;
  - eventos históricos;
  - campos calculados;
  - campos editables;
  - snapshots congelados.
- En Vivero, el timeline debe ayudar a entender:
  `Recolección -> Consumo -> Inicio -> Embolsado -> Adaptabilidad -> Merma/Despacho -> Cierre`.
- En pantallas de evidencia, mostrar cuando exista:
  - nombre/título;
  - tipo;
  - peso;
  - fecha;
  - preview;
  - estado de carga/error.

---

## 8. Flujo recomendado de trabajo

Para tareas pequeñas:

1. Entender el archivo/patrón.
2. Cambiar lo mínimo necesario.
3. Verificar lint/build/test.
4. Reportar cambios y riesgos.

Para tareas medianas o grandes:

1. Explorar archivos relevantes.
2. Escribir plan corto.
3. Implementar por pasos.
4. Verificar.
5. Actualizar documentación si cambió un patrón.
6. Reportar qué quedó hecho, qué no y qué revisar.

---

## 9. Criterio de terminado

Una tarea se considera terminada cuando:

- el cambio cumple el objetivo solicitado;
- no rompe reglas críticas del dominio;
- usa patrones existentes del proyecto;
- no introduce dependencias innecesarias;
- maneja loading/error/empty cuando aplica;
- lint/typecheck/build pasan o se reporta claramente por qué no se pudieron ejecutar;
- se actualizó documentación si cambió una convención;
- se registró deuda técnica en `FRONTEND_AUDIT.md` si se detectó algo relevante.

---

## 10. Formato de respuesta

Al terminar, responde con:

```md
## Cambios realizados
- ...

## Verificación
- Comando ejecutado: ...
- Resultado: ...

## Riesgos o pendientes
- ...

## Archivos modificados
- ...
```

Si no pudiste ejecutar una verificación, dilo claramente.
No digas que algo está probado si no lo ejecutaste.

---

## 11. Mantenimiento de este archivo

Actualiza este `AGENTS.md` solo cuando:

- una misma confusión ocurra más de una vez;
- cambie el stack frontend;
- cambien comandos del proyecto;
- cambien reglas críticas de Recolección/Vivero;
- se agregue una convención importante de arquitectura o UI.

Mantenerlo corto y útil es parte del trabajo.
