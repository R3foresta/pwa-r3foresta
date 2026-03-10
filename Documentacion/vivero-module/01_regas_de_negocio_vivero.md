# Reglas de Negocio (RN) — Módulo 2: Vivero

## 1. Propósito

Estas reglas definen **cómo debe comportarse el sistema frente a la realidad operativa del vivero**, independientemente de la interfaz o la tecnología.
Buscan garantizar:

* **Trazabilidad fuerte** (auditoría clara y consistente)
* **Coherencia temporal y de cantidades**
* Registro fiel de eventos reales (mermas, despachos, cambios de ambiente)
* Un modelo compatible con **validación** y **anclaje blockchain** (MVP)

Estas reglas gobiernan el ciclo de vida del **Lote de Vivero** y sus eventos.

---

## 2. Definiciones básicas

* **Lote Origen:** lote de semillas o esquejes registrado en el Módulo 1.
* **Lote de Vivero:** lote iniciado en el Módulo 2 a partir de un único lote origen.
* **Unidades en proceso (Inicio):** semillas sembradas o esquejes en agua (no son “plantas vivas” aún).
* **Plantas vivas (desde Embolsado):** unidades ya establecidas en bolsa/maceta y sujetas a saldo vivo.
* **Evento:** registro append-only (se agrega, no se reescribe).
* **Estados:** PENDIENTE, COMPLETO, FINALIZADO.
* **Corrección:** evento posterior que ajusta sin editar el pasado.

---

## 3. Reglas de identidad y trazabilidad del lote

### RN-VIV-01 — Identificador único del lote de vivero

Todo lote de vivero posee un **identificador único** generado por el sistema y se mantiene durante todo su ciclo de vida.

### RN-VIV-02 — Origen único (prohibida la mezcla)

Un lote de vivero debe estar vinculado a **un solo lote origen**.
**No se permite mezclar** múltiples lotes origen en un mismo lote de vivero.

### RN-VIV-03 — Prohibida la división y fusión en vivero

En el módulo de vivero:

* **No se permite dividir** un lote en sub-lotes.
* **No se permite fusionar** dos lotes en uno.

> Nota: En Módulo 3 (Plantación) sí se permite usar 1..N lotes y hacer despachos parciales.

### RN-VIV-04 — Consistencia con vivero físico/origen

Un lote de vivero solo puede iniciarse con material biológico disponible y consistente con el vivero seleccionado, según el control del Módulo 1.

---

## 4. Reglas del flujo operativo por etapas (modelo real)

### RN-VIV-05 — Etapas obligatorias del ciclo

El lote debe atravesar estas etapas operativas:

1. Inicio
2. Embolsado
3. Adaptación
4. Despacho

### RN-VIV-06 — Secuencialidad mínima por hitos

No se puede registrar:

* Embolsado sin haber registrado Inicio
* Despachos sin haber registrado Embolsado

*(Adaptación es flexible y no bloquea el despacho.)*

### RN-VIV-07 — Adaptación flexible por eventos (no rígida)

Los ambientes (Media Sombra, Sol Directo, etc.) no siguen un orden obligatorio.
Se registran como **eventos de cambio de ambiente**, permitiendo ida y vuelta sin afectar la trazabilidad principal.

---

## 5. Reglas del modelo “eventos” e inmutabilidad

### RN-VIV-08 — Eventos append-only (no reescritura)

El sistema registra la operación como **eventos que se agregan** al historial.
No se permite sobrescribir ni eliminar eventos registrados.

### RN-VIV-09 — “Merma” es pérdida explícita

Las pérdidas se registran solo mediante eventos de **MERMA**, con:

* cantidad perdida
* causa (catálogo)
* fecha del evento
* responsable
* notas y evidencia si existen

> “Salida” NO significa “murió”; salida es despacho o transferencia operacional.

### RN-VIV-10 — Observaciones acumulativas e inmutables

Las observaciones se agregan como nuevas entradas por evento.
No se permite modificar ni eliminar observaciones ya registradas en estado COMPLETO.

---

## 6. Reglas de estados: PENDIENTE, COMPLETO, FINALIZADO

### RN-VIV-11 — Estados del registro

Cada registro/evento puede estar en:

* **PENDIENTE:** borrador editable con datos mínimos
* **COMPLETO:** validado e inmutable
* **FINALIZADO:** lote cerrado por saldo vivo 0

### RN-VIV-12 — Edición permitida solo en PENDIENTE

Mientras un registro esté en PENDIENTE, se permite editar campos operativos.
Una vez en COMPLETO, la edición queda bloqueada.

### RN-VIV-13 — Paso a COMPLETO requiere validación del Supervisor

El cambio de PENDIENTE → COMPLETO requiere acción explícita de un **Supervisor**.

### RN-VIV-14 — Correcciones sin editar el pasado

Si se detecta un error después de COMPLETO:

* no se edita el evento original
* se registra un **Evento Correctivo (CORRECCIÓN)** con delta y motivo

---

## 7. Reglas de cantidades y saldo vivo

### RN-VIV-15 — Inicio registra “unidades en proceso”

En Inicio, la cantidad representa unidades en proceso (semillas o esquejes).
No se interpreta como plantas vivas hasta Embolsado.

### RN-VIV-16 — Embolsado inicia el saldo de plantas vivas

En Embolsado se establece `plantas_vivas_iniciales` y desde ahí:

* se controlan saldos vivos
* se aplican mermas
* se aplican despachos

### RN-VIV-17 — Conservación del saldo vivo (operación normal)

En operación normal, el saldo vivo:

* solo puede mantenerse o disminuir
* no puede incrementarse por eventos normales

### RN-VIV-18 — Incrementos solo por CORRECCIÓN auditada

El saldo vivo solo puede aumentar mediante un evento de CORRECCIÓN con:

* delta positivo
* motivo obligatorio
* trazabilidad del responsable (y aprobación si se define)

### RN-VIV-19 — Cantidades válidas y no negativas

Reglas generales:

* cantidades registradas deben ser > 0 en eventos de merma/despacho
* la merma o despacho no puede exceder el saldo disponible
* el saldo no puede quedar negativo

---

## 8. Reglas temporales y trazabilidad de tiempo

### RN-VIV-20 — Doble fecha obligatoria

Todo evento registra:

* `fecha_evento`: cuándo ocurrió realmente
* `created_at`: cuándo se registró en el sistema (siempre “ahora”)

### RN-VIV-21 — Ventana de registro retroactivo (10 días)

Se permite registrar eventos ocurridos en el pasado dentro de un margen máximo de **10 días**.
No se permite registrar eventos con fecha futura.

### RN-VIV-22 — Coherencia temporal mínima por hitos

Reglas base:

* `fecha_evento_embolsado >= fecha_evento_inicio`
* los eventos no deben tener fecha anterior al inicio del proceso/etapa correspondiente
  Salvo corrección con motivo explícito.

---

## 9. Reglas de evidencia fotográfica y excepciones

### RN-VIV-23 — Evidencia por evento

La evidencia fotográfica se asocia preferentemente a eventos (merma, despacho, etc.), no solo a etapas.

### RN-VIV-24 — Evidencia obligatoria para COMPLETO o excepción aprobada

Para pasar a COMPLETO se requiere:

* evidencia mínima (foto)
  **o**
* una **Excepción de Evidencia** aprobada por Supervisor, con motivo y fecha.

### RN-VIV-25 — Evidencia tardía permitida

Si luego se obtiene la foto, puede registrarse como evidencia tardía **sin alterar el historial**, manteniendo visible la excepción aprobada.

---

## 10. Reglas sobre despachos y cierre del lote

### RN-VIV-26 — Despachos parciales permitidos

Se permiten múltiples despachos parciales mientras haya saldo vivo disponible.

### RN-VIV-27 — Todo despacho debe registrar destino

Todo despacho debe registrar al menos un destino:

* ideal: referencia a Plantación (Módulo 3)
* mínimo: descripción estructurada del destino

### RN-VIV-28 — Finalización automática

Un lote se considera FINALIZADO automáticamente cuando:

* `plantas_vivas_actuales = 0`
  o
* un despacho deja saldo 0

### RN-VIV-29 — Restricción post-finalización

Una vez FINALIZADO:

* no se permiten nuevos eventos operativos (merma, despacho, cambios de ambiente)
* solo se permite:

  * consulta del historial
  * correcciones auditadas (si corresponde)

---

## 11. Roles y estrategia blockchain (MVP)

### RN-VIV-30 — Roles mínimos

Roles base:

* **Responsable:** registra y completa eventos (PENDIENTE)
* **Supervisor:** valida (COMPLETO), aprueba excepciones y autoriza cierres/anclajes
* **Auditor/Consulta:** solo lectura

### RN-VIV-31 — Anclaje blockchain por hitos (MVP)

Para optimizar costos:

* el anclaje blockchain se realiza por **cierres de etapa/hitos** (snapshot/hash), no por cada evento
* el Supervisor decide cuándo anclar

### RN-VIV-32 — Correcciones también son anclables

Los eventos de CORRECCIÓN deben ser auditables y elegibles para anclaje, porque alteran la “verdad operacional” posterior.

---

## 12. Principio rector del MVP

### RN-VIV-33 — Prioridad del registro real sobre la “perfección”

El sistema prioriza registrar el proceso real (con mermas, retrasos, faltas de evidencia y correcciones) de forma **controlada y auditable**, evitando bloquear la operación y preservando confianza.

---

Si quieres, el siguiente upgrade (sin complicarte) es agregar 2 columnas internas a cada regla:

* **Severidad:** Bloqueante / Requiere supervisor / Solo advertencia
* **Aplica en MVP:** Sí/No

Y con eso ya queda listo para auditoría y para tus pantallas.
