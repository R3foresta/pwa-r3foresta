# Reglas de Negocio (RN) — Módulo 1 Recolección

## 1. Propósito

Estas reglas definen **cómo debe comportarse el sistema frente a la realidad operativa de la recolección**, independientemente de la interfaz o tecnología.

Buscan garantizar:

* **Trazabilidad fuerte** (origen claro del material biológico).
* **Coherencia temporal y de cantidades** (no magia, no “inventos”).
* Registro fiel de evidencia (fotos) y ubicación.
* Compatibilidad con el flujo del **Módulo 2 (Vivero)** y con una futura estrategia de **validación/anclaje blockchain** (MVP).

Estas reglas gobiernan el ciclo de vida del **Lote Origen / Recolección**.

---

## 2. Definiciones básicas

* **Recolección (Lote Origen):** registro que representa material biológico recolectado (semillas o esquejes) con evidencia y ubicación.
* **Tipo de material:** `SEMILLA` o `ESQUEJE`.
* **Cantidad:**

  * Para `ESQUEJE`: unidades enteras.
  * Para `SEMILLA`: bien peso (kg/gr) o son unidades enteras, almacenado en una unidad canónica.
* **Estados:** `BORRADOR/VALIDADO` (registro) y `ABIERTO/CERRADO` (operativo, derivado del saldo).
* **Ubicación estructurada:** latitud/longitud obligatorias **para validar** + datos administrativos opcionales (catálogos).
* **Evidencia:** fotos obligatorias **para validar** (mínimo 2), formato JPG/PNG.
* **Historial:** bitácora inmutable de cambios (quién/cuándo/antes-después).

---

## 3. Reglas de identidad, propiedad y trazabilidad

### RN-REC-01 — Identificador único

Toda recolección tiene un **identificador único** generado automáticamente por el sistema. No se puede editar.

### RN-REC-02 — Propiedad del registro (recolector)

Cada recolección debe estar asociada a un **Recolector** (RF-GEN-01) y a una **Ubicación**.
En el MVP: por defecto el recolector es **el usuario autenticado**, salvo roles con permiso para registrar en nombre de otro.

### RN-REC-03 — Recolección como “Lote Origen”

Una recolección **es** un “lote origen” para los módulos siguientes. Por tanto:

* Debe poder **ser referenciada** desde Vivero (M2).
* Debe poder **cambiar de estado** por uso/consumo (manual o automático según reglas).

---

## 4. Reglas de captura y campos mínimos

### RN-REC-04 — Fecha de recolección obligatoria y acotada

La **fecha de recolección** es obligatoria y debe cumplir:

* No puede ser futura.
* Puede ser retroactiva hasta **45 días** como máximo.

Además, el sistema registra automáticamente:

* `fecha_registro` (timestamp del sistema),
* `usuario_registro`.

### RN-REC-05 — Especie: nombre científico + nombre comercial

Se debe registrar **nombre científico** y **nombre comercial**.

MVP (práctico, compatible con lo que ya tienen):

* Se guardan como texto.
* Si existe un catálogo de especies, se recomienda guardar también una referencia (`especie_id`) **sin perder el snapshot textual**.

### RN-REC-06 — Método de recolección desde catálogo cerrado

El método de recolección se selecciona de un **catálogo de métodos de recolección predefinidos**.

### RN-REC-07 — Lugar de almacenamiento (vivero) desde catálogo

El lugar de almacenamiento se selecciona de la lista de **viveros (RF-GEN-02)**.
Para añadir un nuevo vivero, debe registrarse primero en el módulo general correspondiente.

---

## 5. Reglas de estado del registro e inventario (saldo)

### RN-REC-08 — Estados válidos (registro + operativo)

Cada recolección maneja **dos estados**:

1) **Estado del registro (Web2 / calidad de datos):**
- `BORRADOR` (editable)
- `VALIDADO` (sellado)

2) **Estado operativo (inventario):**
- `ABIERTO` (saldo disponible > 0)
- `CERRADO` (saldo disponible = 0)

> Nota: `ABIERTO/CERRADO` **no se elige manualmente**; se deriva del saldo.

### RN-REC-09 — Estados por defecto

Al crear una recolección:

- `estado_registro = BORRADOR`
- `saldo_actual = cantidad_inicial` (normalizada a unidad canónica gramos o unidades de semillas)
- `estado_operativo = ABIERTO` (porque cantidad_inicial debe ser > 0)

### RN-REC-10 — Restricción de uso por estado (consumo a vivero)

Para que una recolección pueda alimentar lotes del Módulo 2 (Vivero) debe cumplir:

- `estado_registro = VALIDADO`
- `estado_operativo = ABIERTO`
- `saldo_actual >= cantidad_a_consumir`

Si está en `BORRADOR` o `CERRADO`, **no puede** consumirse.

### RN-REC-10A — Movimientos permitidos (append-only) y efecto en saldo

Post-validación, el saldo solo cambia mediante **movimientos** (no edición directa):

- `CONSUMO_A_VIVERO` (automático desde M2) → delta negativo + referencia al lote de vivero
- `DESECHO` (manual) → delta negativo + **motivo obligatorio**
- `CORRECCIÓN` (controlado) → delta positivo/negativo + **motivo obligatorio** + rol autorizado

Los movimientos son **append-only**: no se editan ni se borran; si hay error, se registra una corrección nueva.

### RN-REC-10B — Conservación del saldo (no magia)

- `saldo_actual = cantidad_inicial + SUM(delta_movimientos)`
- Regla dura: el sistema **no permite** que `saldo_actual` quede por debajo de 0.
- Cuando `saldo_actual = 0` ⇒ `estado_operativo = CERRADO`.

## 6. Reglas de cantidades y unidades

### RN-REC-11 — Cantidad obligatoria y > 0

La cantidad de recolección es obligatoria y debe ser **mayor a 0**.

### RN-REC-12 — Semillas: conversión a unidad canónica

Para `SEMILLA`:

* El usuario puede ingresar en **kg** o **gr**,
* El sistema debe almacenar en una unidad canónica (que serían **gramos** como decimal en caso de ser peso, o unidades enteras si se cuenta por cantidad de semillas).
* Mantener (si se quiere) el “input original” solo para UI, pero la lógica usan las unidades canónicas.

### RN-REC-13 — Esquejes: entero estricto

Para `ESQUEJE`:

* La cantidad es **entera** y **sin decimales**.
* Debe ser ≥ 1.

---

## 7. Reglas de evidencia fotográfica

### RN-REC-14 — Evidencia mínima obligatoria (solo para VALIDADO)

- En `BORRADOR`: su porposito es evitar subir registros errados a blockchain si no se esta seguro de los datos ya que es editable, fotos y ubicación son obligatorias para crear un borrador y evitar huecos de trazabilidad.
- Para pasar a `VALIDADO`: se exige **mínimo 2 fotografías**:
  - 1 foto que evidencie la especie,
  - 1 foto que evidencie la cantidad/volumen recolectado (o su contenedor/medición).

Se pueden agregar más.


(Futuro: La validación también se hará por la comunidad, no solo el recolector, se puede proponer que más de una persona valide la recolección y quede registrado en blockchain quienes validaron y cuando.)

### RN-REC-15 — Formato y tamaño por foto

Cada foto debe cumplir:

- Formato: **JPG o PNG**.
- Tamaño máximo: **5 MB**.

Si excede: procesar la imagen para reducir tamaño o rechazar con error claro.

## 8. Reglas de observaciones

### RN-REC-16 — Observaciones acotadas

Observaciones:

* Máximo **1000 caracteres**.
* Sin emojis (validación técnica; si esto trae problemas reales en campo, lo revisamos).

---

## 9. Reglas de ubicación estructurada (RF-REC-02)

### RN-REC-17 — Latitud y longitud obligatorias (solo para VALIDADO)

- En `BORRADOR`: `latitud/longitud` son **opcionales**.
- Para pasar a `VALIDADO`: son **obligatorias** y deben cumplir:
  - `latitud` en rango **[-90, 90]** con **6 decimales**.
  - `longitud` en rango **[-180, 180]** con **6 decimales**.

Si faltan al validar: error indicando exactamente el campo faltante.

### RN-REC-18 — Campos administrativos opcionales por catálogo

País/Departamento/Provincia/Comunidad/Zona:

- Son opcionales,
- Se seleccionan de catálogos (cuando existan),
- Si un dato no existe en catálogo, el sistema debe impedir “inventar” valores.
  - Alternativa MVP: permitir “SIN ESPECIFICAR” en niveles administrativos.

### RN-REC-19 — Coherencia mínima de estructura

Si se envían valores administrativos, deben estar “bien formados” (IDs válidos / pertenecen al catálogo correspondiente). Si no: error.

## 10. Reglas de edición + historial (RF-REC-03)

### RN-REC-20 — Historial obligatorio e inmutable

Cualquier modificación debe generar un registro en historial con:

- usuario que modificó,
- fecha/hora,
- versión anterior y nueva (o diff por campos),
- motivo (recomendado; obligatorio para correcciones post-validación).

El historial:

- se guarda en tablas separadas,
- **no se puede borrar**.

### RN-REC-21 — Reglas de edición por estado

- En `BORRADOR`: se permite editar los campos del registro (incluyendo fotos y ubicación).
- En `VALIDADO`: **no se permite editar la ficha**. Solo se permiten movimientos append-only:
  - `CONSUMO_A_VIVERO`
  - `DESECHO`
  - `CORRECCIÓN`

### RN-REC-22 — Qué cambios deben registrar historial

Se registra **cualquier cambio**, especialmente:

- transición `BORRADOR → VALIDADO`,
- cambios de cantidad inicial y unidad canónica,
- altas/bajas de fotos,
- cambios de ubicación (lat/long y estructura administrativa),
- cambios de especie/método/vivero/observaciones,
- creación de movimientos (consumo, desecho, corrección).

### RN-REC-22A — Datos automáticos en auditoría

Los datos de auditoría (usuario, timestamps) se toman automáticamente del sistema.

## 11. Reglas de integración con Módulo 2 (Vivero)

### RN-REC-23 — Elegibilidad para iniciar vivero

Solo se puede iniciar un lote de vivero desde una recolección que esté:

- `estado_registro = VALIDADO`
- `estado_operativo = ABIERTO`
- con evidencia mínima completa (≥ 2 fotos)
- con ubicación válida (lat/long)
- con tipo_material definido
- con `saldo_actual` suficiente para el consumo

### RN-REC-24 — Movimiento de consumo por creación de lote (consumo parcial)

Cuando se crea un lote de vivero desde una recolección, el sistema debe:

- registrar el vínculo (recolección → lote_vivero),
- registrar un movimiento `CONSUMO_A_VIVERO` con delta negativo,
- recalcular `saldo_actual` y el estado operativo:
  - `ABIERTO` si saldo > 0
  - `CERRADO` si saldo = 0

> No existe “cambio a USADO” como estado absoluto: el consumo se modela como movimiento.

## 12. Roles y estrategia blockchain (MVP)

### RN-REC-25 — Roles mínimos (MVP)

* **Recolector:** crea registros, adjunta evidencia.
* **Supervisor/Validador (opcional en v1):** valida calidad / aprueba especie nueva / aprueba métodos nuevos.
* **Auditor:** consulta historial completo.

(Futuro: se pueden agregar roles de “comunidad” para validación colaborativa, con registro de quién validó qué y cuándo.)

### RN-REC-26 — “Especie nueva” como bandera de control

Si `es_especie_nueva = true`:

* el registro debe quedar marcado para revisión (cola de validación),
  
(Futuro: Se requeren más evidencia de evidencia o una nota técnica.)

### RN-REC-27 — Anclaje blockchain (MVP)

Para mantener **confianza sin complicarnos**, el anclaje se considera “oficial” desde `VALIDADO`.

MVP recomendado:

- Anclar a blockchain el **snapshot** al pasar a `VALIDADO`.
- Anclar también cada **movimiento post-validación**:
  - `CONSUMO_A_VIVERO`
  - `DESECHO`
  - `CORRECCIÓN`

`BORRADOR` no se considera historia oficial (no requiere anclaje).
