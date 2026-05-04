# DOMAIN_INDEX.md — Índice de dominio para Frontend R3foresta

Actualizado: 2026-04-30

## 1. Propósito

Mapa corto del dominio para frontend. Sirve para saber qué reglas afectan UI, formularios, validaciones UX, estados, eventos, enums, snapshots, saldos y evidencias.

No reemplaza los documentos fuente ni define reglas nuevas.

## 2. Orden de verdad

1. Reglas de negocio vigentes.
2. Requerimientos funcionales.
3. Procesos / guías operativas.
4. Esquema de base de datos.
5. `DOMAIN_INDEX.md`.
6. `AGENTS.md`.
7. `FRONTEND_GUIDE.md`.
8. Código frontend existente.

Regla: si el frontend contradice reglas de negocio o esquema, el frontend está mal.

## 3. Documentos fuente

La documentación oficial del dominio vive fuera del repo frontend, en:

- Repositorio remoto: `https://github.com/R3foresta/r3foresta-docs`
- Ruta local recomendada: `../r3foresta-docs`
- Tambien puedes consultar el esquema de la base de datos en `./docs/db-strucuture.md`

El frontend no debe copiar estos documentos dentro de su repo.  
Debe consultarlos como fuente externa del dominio.

| Área | Usar cuando toque | Ruta local recomendada |
|---|---|---|
| General | usuarios, roles, plantas, viveros, ubicaciones, comunidades, evidencias, catálogos | `../r3foresta-docs/general-module` |
| Recolección | borradores, validación, rechazo, snapshots, ubicación, evidencia, saldo origen, consumo a Vivero, descarte | `../r3foresta-docs/recoleccion-module` |
| Vivero | inicio, embolsado, adaptabilidad, merma, despacho, cierre automático, saldo vivo, timeline, evidencia por evento | `../r3foresta-docs/vivero-module` |
| Base de datos | entidades, campos, enums, relaciones, snapshots y campos calculados | `../r3foresta-docs/database` |

## 4. Reglas transversales frontend

El frontend puede:
- guiar al usuario;
- prevenir errores obvios;
- mostrar restricciones antes de enviar;
- bloquear submits evidentemente inválidos;
- mostrar datos calculados como solo lectura;
- consumir contratos del backend;
- representar saldos, estados, snapshots y evidencias con claridad.

El frontend no debe:
- recalcular saldos como fuente de verdad;
- simular persistencia antes de respuesta exitosa;
- decidir elegibilidad final;
- sobrescribir snapshots;
- inventar enums, estados o flujos;
- modificar eventos históricos;
- partir operaciones atómicas en varios requests manuales;
- tratar blockchain como requisito para guardar operación base.

## 5. Unidades

Persistencia oficial:
- `UNIDAD`
- `G`

Entrada aceptable en UI:
- `kg`
- `g`
- `unidad`

Reglas frontend:
- `kg` es solo input, nunca persistencia.
- `g` debe normalizarse visualmente a `G` cuando se hable de unidad oficial.
- No usar `GR`.
- `UNIDAD` no acepta decimales.
- `G` permite decimales.
- `ESQUEJE` siempre usa `UNIDAD`, entero estricto.
- `SEMILLA` puede trabajar en `G` o `UNIDAD`.
- Desde `EMBOLSADO`, saldo vivo siempre se maneja en `UNIDAD`.
- El sistema no convierte masa en plantas vivas.

## 6. Snapshots

Los snapshots son datos congelados. Mostrar como solo lectura.

Campos frecuentes:
- `nombre_cientifico_snapshot`
- `nombre_comercial_snapshot`
- `variedad_snapshot`
- `nombre_comunidad_snapshot`
- `nombre_comunidad_origen_snapshot`
- `nombre_recolector_snapshot`
- `nombre_responsable_snapshot`
- `tipo_material_snapshot`

Reglas:
- No editar snapshots.
- No recalcular snapshots desde `PLANTA`.
- En Recolección se congelan al validar.
- En Vivero se heredan desde Recolección validada al crear el lote.
- El nombre oficial es `nombre_comercial_snapshot`; no usar `nombre_comun_snapshot`.

## 7. Evidencias

Modelo común:
- `TIPOS_ENTIDAD_EVIDENCIA`
- `EVIDENCIAS_TRAZABILIDAD`
- `tipo_entidad_id`
- `entidad_id`

Reglas frontend:
- No crear modelos paralelos por módulo.
- `bucket` no es URL pública.
- `ruta_archivo` no es URL pública.
- Mostrar preview solo si backend/storage entrega recurso seguro.
- Mostrar metadatos si existen: título, tipo, mime type, tamaño, fecha, principal, orden.
- No implementar eliminación funcional en MVP si el flujo no lo soporta.
- No inventar evidencia tardía si el MVP no la acepta.

Obligatoriedad:
- Recolección: mínimo 2 fotos para validación; en el flujo actual también se exige evidencia desde borrador.
- Vivero: `INICIO`, `EMBOLSADO`, `MERMA` y `DESPACHO` requieren mínimo 1 foto válida.
- `ADAPTABILIDAD` puede tener evidencia, pero no es obligatoria.

## 8. Fechas

Reglas:
- No permitir fechas futuras.
- Mostrar diferencia entre fecha operativa y fecha de registro cuando aplique.
- `created_at` indica cuándo se guardó realmente.
- `fecha_evento` o `fecha` indica cuándo ocurrió el hecho operativo.
- Recolección permite fecha retroactiva hasta 45 días.
- Vivero permite eventos retroactivos hasta 10 días.
- La validación final siempre corresponde al backend.

## 9. General para frontend

### 9.1 Usuarios y roles

Roles oficiales:
- `ADMIN`
- `GENERAL`
- `VALIDADOR`
- `VOLUNTARIO`

Reglas UI:
- No tratar rol como texto libre.
- Mostrar acciones según permisos recibidos o definidos.
- El usuario autenticado suele ser actor/responsable por defecto.
- No borrar historial visual si un usuario fue inactivado.

### 9.2 Plantas

Campos importantes:
- `nombre_cientifico`
- `nombre_comun_principal`
- `variedad`
- `tipo_material_permitido`
- `imagen_url`
- `notas`

Reglas UI:
- Seleccionar planta desde catálogo.
- No permitir planta inexistente en captura productiva.
- `nombre_comun_principal` alimenta naming operativo.
- `nombres_comunes` queda fuera del MVP funcional.
- Plantas inactivas no se usan en nuevos registros, pero deben seguir visibles en historial.

### 9.3 Viveros

Reglas UI:
- Recolección selecciona vivero de almacenamiento.
- Vivero selecciona vivero operativo del lote.
- No tratar vivero como texto libre.
- No usar viveros inactivos en nuevos registros.
- `LOTE_VIVERO.vivero_id` no se hereda automáticamente desde `RECOLECCION.vivero_id`.

### 9.4 Ubicaciones y comunidades

Reglas UI:
- Latitud: `-90` a `90`.
- Longitud: `-180` a `180`.
- Usar catálogos para comunidad/localidad/división.
- No inventar comunidades como texto libre.
- Si falta dato de catálogo, usar estrategia MVP `SIN ESPECIFICAR`.
- Coordenada GPS es la base mínima de verdad geográfica.

## 10. Recolección para frontend

### 10.1 Qué representa

Una recolección es el lote origen del sistema y puede alimentar uno o varios lotes de Vivero mediante movimientos.

### 10.2 Estados

| Tipo | Valores | Lectura UI |
|---|---|---|
| Registro | `BORRADOR`, `PENDIENTE_VALIDACION`, `VALIDADO`, `RECHAZADO` | calidad/ciclo de vida del registro |
| Operativo | `ABIERTO`, `CERRADO` | derivado del saldo, no se elige manualmente |

Comportamiento:
- `BORRADOR`: editable si rol permite.
- `PENDIENTE_VALIDACION`: congelado.
- `VALIDADO`: sellado, no editable.
- `RECHAZADO`: corregible y reenviable si rol permite.
- `ABIERTO`: saldo disponible.
- `CERRADO`: saldo agotado.

### 10.3 Crear BORRADOR

Campos UI principales:
- fecha;
- planta/especie;
- tipo de material;
- cantidad inicial;
- unidad de entrada;
- método de recolección;
- recolector;
- vivero de almacenamiento;
- ubicación;
- evidencia/fotos;
- observaciones.

Validaciones UX:
- fecha no futura;
- cantidad > 0;
- `ESQUEJE` solo `UNIDAD` entera;
- no usar `GR`;
- mostrar que `kg` se normaliza;
- lat/long válidas;
- evidencia mínima según flujo.

### 10.4 Solicitar validación

Antes de enviar, verificar visualmente:
- campos mínimos completos;
- mínimo 2 fotos;
- latitud/longitud válidas;
- estado actual `BORRADOR` o `RECHAZADO`.

Resultado:
- pasa a `PENDIENTE_VALIDACION`;
- la ficha queda congelada;
- mostrar confirmación.

### 10.5 Validar / rechazar

Transiciones:
- `PENDIENTE_VALIDACION -> VALIDADO`
- `PENDIENTE_VALIDACION -> RECHAZADO`

Si se aprueba:
- snapshots quedan congelados;
- registro queda sellado;
- ya no se edita ficha.

Si se rechaza:
- registro no es consumible;
- puede corregirse y reenviarse.

### 10.6 Movimientos

Movimientos MVP:
- `CONSUMO_A_VIVERO`
- `DESECHO`

Reglas UI:
- `CONSUMO_A_VIVERO` no debe aparecer como acción manual suelta en Recolección si el flujo oficial ocurre desde Vivero.
- `DESECHO` puede existir como descarte si está implementado.
- Movimientos son append-only.
- No editar ni borrar movimientos.
- No recalcular saldo como verdad frontend.

### 10.7 Elegibilidad para Vivero

Mostrar una recolección como origen si cumple:
- `estado_registro = VALIDADO`
- `estado_operativo = ABIERTO`
- `saldo_actual > 0`
- snapshot oficial congelado
- unidad canónica definida
- planta asociada
- ubicación/evidencia válidas según contrato

No mostrar como elegibles:
- `BORRADOR`
- `PENDIENTE_VALIDACION`
- `RECHAZADO`
- `CERRADO`

## 11. Vivero para frontend

### 11.1 Qué representa

Vivero registra la maduración pre-plantación del material que viene desde Recolección.

Secuencia visual:
`Recolección -> Consumo -> Inicio -> Embolsado -> Adaptabilidad -> Merma/Despacho -> Cierre`

### 11.2 Estados del lote

Estados:
- `ACTIVO`: permite eventos según etapa.
- `FINALIZADO`: bloquea nuevos eventos operativos normales.

Motivos de cierre:
- `DESPACHO_TOTAL`
- `PERDIDA_TOTAL`
- `MIXTO`

Reglas UI:
- No permitir cierre manual.
- Mostrar motivo de cierre si existe.
- Bloquear acciones normales en `FINALIZADO`.

### 11.3 Eventos

Eventos oficiales:
- `INICIO`
- `EMBOLSADO`
- `ADAPTABILIDAD`
- `MERMA`
- `DESPACHO`
- `CIERRE_AUTOMATICO`

Reglas UI:
- Eventos son append-only.
- No mostrar editar/borrar evento.
- Mostrar timeline completo.
- Filtros solo ocultan visualmente, no eliminan historia.

### 11.4 INICIO

Objetivo UI: crear lote de vivero desde una recolección validada y abierta.

Campos clave:
- `recoleccion_id`
- `vivero_id`
- `responsable_id`
- `fecha_inicio`
- `fecha_evento`
- `cantidad_inicial_en_proceso`
- `unidad_medida_inicial`
- evidencia obligatoria
- observaciones opcionales

Reglas UI:
- seleccionar una sola recolección origen;
- no mezclar lotes origen;
- `vivero_id` se selecciona en Vivero;
- mostrar snapshots heredados desde Recolección;
- no mostrar saldo vivo todavía;
- `saldo_vivo_antes` y `saldo_vivo_despues` no aplican/null;
- requiere mínimo una foto válida.

Backend resuelve la transacción atómica: lote + evento `INICIO` + movimiento `CONSUMO_A_VIVERO` + descuento de saldo origen.

### 11.5 EMBOLSADO

Objetivo UI: registrar nacimiento del saldo vivo.

Campos clave:
- `fecha_evento`
- `responsable_id`
- `plantas_vivas_iniciales`
- evidencia obligatoria
- observaciones opcionales

Reglas UI:
- requiere `INICIO` previo;
- solo una vez por lote;
- no permitido si lote `FINALIZADO`;
- `plantas_vivas_iniciales > 0`;
- `cantidad_afectada = plantas_vivas_iniciales`;
- unidad `UNIDAD`;
- `saldo_vivo_antes = null`;
- `saldo_vivo_despues = plantas_vivas_iniciales`;
- no convertir gramos en plantas;
- plantas vivas son dato observado.

### 11.6 ADAPTABILIDAD

Objetivo UI: seguimiento operativo.

Campos clave:
- `fecha_evento`
- `responsable_id`
- `subetapa_destino`
- observaciones opcionales
- evidencia opcional

Subetapas:
- `SOMBRA`
- `MEDIA_SOMBRA`
- `SOL_DIRECTO`

Reglas UI:
- requiere `EMBOLSADO` previo;
- puede registrarse varias veces;
- no requiere secuencia rígida;
- no bloquea `MERMA`;
- no bloquea `DESPACHO`;
- aplica al lote completo;
- no modifica saldo vivo;
- no exigir foto.

### 11.7 MERMA

Objetivo UI: registrar pérdida real del saldo vivo.

Campos clave:
- `fecha_evento`
- `responsable_id`
- `cantidad_afectada`
- `causa_merma`
- evidencia obligatoria
- observaciones opcionales

Reglas UI:
- requiere `EMBOLSADO` previo;
- no permitido si lote `FINALIZADO`;
- unidad siempre `UNIDAD`;
- cantidad > 0;
- cantidad <= saldo vivo disponible;
- mostrar saldo antes/después como calculado por sistema;
- si saldo llega a 0, backend cierra automáticamente;
- requiere evidencia.

Causas:
- `PLAGA`
- `ENFERMEDAD`
- `SEQUIA`
- `DANO_FISICO`
- `MUERTE_NATURAL`
- `DESCARTE_CALIDAD`
- `OTRO`

### 11.8 DESPACHO

Objetivo UI: registrar salida parcial o total.

Campos clave:
- `fecha_evento`
- `responsable_id`
- `cantidad_afectada`
- `destino_tipo`
- `destino_referencia`
- `comunidad_destino_id` cuando aplique
- evidencia obligatoria
- `metadata_blockchain` si existe
- observaciones opcionales

Reglas UI:
- requiere `EMBOLSADO` previo;
- `ADAPTABILIDAD` no es requisito;
- no permitido si lote `FINALIZADO`;
- unidad siempre `UNIDAD`;
- cantidad > 0;
- cantidad <= saldo vivo disponible;
- puede haber múltiples despachos;
- requiere destino estructurado;
- requiere evidencia;
- si saldo llega a 0, backend cierra automáticamente;
- blockchain no bloquea la operación base.

Destinos:
- `PLANTACION_PROPIA`
- `DONACION_COMUNIDAD`
- `VENTA`
- `OTRO`

### 11.9 CIERRE_AUTOMATICO

Reglas UI:
- mostrar cuando backend devuelva lote finalizado o evento de cierre;
- no crear botón manual;
- mostrar mensaje si una operación disparó cierre;
- actualizar timeline;
- bloquear eventos operativos normales;
- mostrar motivo: `DESPACHO_TOTAL`, `PERDIDA_TOTAL` o `MIXTO`.

## 12. Timelines

### Recolección

Mostrar:
- creación de borrador;
- solicitud de validación;
- aprobación;
- rechazo;
- soft delete si aplica;
- consumos a vivero;
- desechos.

Fuentes:
- `RECOLECCION.created_at`
- `RECOLECCION_HISTORIAL`
- `RECOLECCION.fecha_validacion`
- `RECOLECCION_MOVIMIENTO.created_at`

### Vivero

Mostrar:
- `INICIO`
- `EMBOLSADO`
- `ADAPTABILIDAD`
- `MERMA`
- `DESPACHO`
- `CIERRE_AUTOMATICO`

Por evento mostrar, cuando exista:
- tipo;
- `fecha_evento`;
- `created_at`;
- responsable;
- cantidad/unidad;
- saldo antes/después;
- evidencia;
- observaciones;
- motivo de cierre;
- metadata blockchain.

## 13. Listados mínimos

### Recolección

Filtros sugeridos:
- estado de registro;
- estado operativo;
- planta/especie;
- tipo material;
- recolector;
- vivero de almacenamiento;
- rango de fechas;
- saldo disponible.

Acciones sugeridas:
- `BORRADOR`: editar, eliminar, solicitar validación.
- `PENDIENTE_VALIDACION`: ver, validar/rechazar si rol permite.
- `VALIDADO + ABIERTO`: ver, usar como origen desde Vivero.
- `VALIDADO + CERRADO`: ver.
- `RECHAZADO`: editar/corregir, reenviar.

### Vivero

Filtros mínimos:
- `estado_lote`;
- vivero;
- planta/especie;
- `recoleccion_id`;
- `lote_vivero_id`;
- `motivo_cierre`;
- `saldo_vivo_actual`.

Acciones sugeridas:
- sin `EMBOLSADO`: registrar embolsado.
- con `EMBOLSADO` y `ACTIVO`: registrar adaptabilidad, merma o despacho.
- `FINALIZADO`: ver detalle y timeline.

## 14. Campos solo lectura

Calculados por backend:
- `saldo_actual`
- `estado_operativo`
- `saldo_vivo_actual`
- `saldo_vivo_antes`
- `saldo_vivo_despues`
- `estado_lote`
- `motivo_cierre`
- `motivo_cierre_calculado`
- `created_at`
- `updated_at`
- `fecha_validacion`
- `codigo_trazabilidad`
- hashes/transacciones generadas

Congelados:
- todos los campos `*_snapshot`

Relaciones derivadas:
- vínculo `RECOLECCION_MOVIMIENTO -> LOTE_VIVERO`
- `ref_evento_trigger_id`
- evidencia vinculada a evento ya registrado

## 15. Enums visibles para frontend

### Recolección

```ts
type TipoMaterialOrigen = "SEMILLA" | "ESQUEJE";

type EstadoRegistroRecoleccion =
  | "BORRADOR"
  | "PENDIENTE_VALIDACION"
  | "VALIDADO"
  | "RECHAZADO";

type EstadoOperativoRecoleccion = "ABIERTO" | "CERRADO";

type TipoMovimientoRecoleccion =
  | "CONSUMO_A_VIVERO"
  | "DESECHO";
```

### Vivero

```ts
type EstadoLoteVivero = "ACTIVO" | "FINALIZADO";

type TipoEventoVivero =
  | "INICIO"
  | "EMBOLSADO"
  | "ADAPTABILIDAD"
  | "MERMA"
  | "DESPACHO"
  | "CIERRE_AUTOMATICO";

type SubetapaAdaptabilidad =
  | "SOMBRA"
  | "MEDIA_SOMBRA"
  | "SOL_DIRECTO";

type CausaMermaVivero =
  | "PLAGA"
  | "ENFERMEDAD"
  | "SEQUIA"
  | "DANO_FISICO"
  | "MUERTE_NATURAL"
  | "OTRO";

type DestinoTipoVivero =
  | "PLANTACION_PROPIA"
  | "PLANTACION_COMUNIDAD"
  | "DONACION"
  | "VENTA"
  | "OTRO";

type MotivoCierreLote =
  | "DESPACHO_TOTAL"
  | "PERDIDA_TOTAL"
  | "MIXTO";
```

### General

```ts
type RolUsuario =
  | "ADMIN"
  | "GENERAL"
  | "VALIDADOR"
  | "VOLUNTARIO";

type UnidadMedida = "UNIDAD" | "G";
```

Regla: preferir tipos/enums generados desde backend si existen. No duplicar manualmente en muchos archivos.

## 16. Errores comunes a evitar

- Permitir editar `VALIDADO`.
- Permitir consumir desde `BORRADOR`, `PENDIENTE_VALIDACION`, `RECHAZADO` o `CERRADO`.
- Crear consumo manual suelto en Recolección para Vivero.
- Recalcular saldo como fuente de verdad.
- Persistir `kg`.
- Usar `GR`.
- Convertir gramos en plantas vivas.
- Mostrar snapshots como editables.
- Ocultar eventos históricos.
- Crear botones para editar/borrar eventos.
- Permitir `MERMA` o `DESPACHO` sin `EMBOLSADO`.
- Tratar `ADAPTABILIDAD` como requisito para despachar.
- Permitir evidencia tardía en eventos obligatorios del MVP.
- Tratar `bucket` o `ruta_archivo` como URL pública.
- Permitir cierre manual si el cierre es automático.
- Tratar blockchain como requisito para guardar operación base.

## 17. Checklist por tipo de tarea

| Tarea | Revisar |
|---|---|
| Formularios de Recolección | estados, unidades, tipo material, ubicación, evidencia, snapshots, permisos, no edición en `VALIDADO` |
| Selección de origen para Vivero | solo `VALIDADO + ABIERTO`, saldo suficiente, snapshots, unidad canónica, recolección única, no consumo manual, contrato atómico backend |
| Evento de Vivero | hito requerido, lote `ACTIVO`, evidencia, unidad, cantidad, saldo disponible, fecha, resumen, no edición posterior |
| Evidencias | modelo común, `tipo_entidad_id`, `entidad_id`, obligatoriedad, preview seguro, metadatos, errores, no evidencia tardía MVP |
| Catálogos | no texto libre, inactivos no disponibles, históricos legibles, no duplicar catálogos por módulo |

## 18. Qué mover fuera de este archivo

| Mover a | Contenido |
|---|---|
| `FRONTEND_GUIDE.md` | estructura de carpetas, hooks, servicios API, rutas, testing |
| `FRONTEND_AUDIT.md` | deuda técnica, hallazgos, bugs, pantallas incompletas |
| Documentos fuente | reglas nuevas, cambios backend, cambios de esquema, migraciones, decisiones definitivas |
| `AGENTS.md` | comportamiento para IA, formato de respuesta, criterios de terminado, comandos |

## 19. Mantenimiento

Actualizar cuando:
- cambie una regla que afecta UI;
- cambie un enum visible;
- cambie un flujo de pantalla;
- cambie obligatoriedad de evidencia;
- cambie elegibilidad de Recolección/Vivero;
- cambie un campo visible importante;
- una confusión se repita más de una vez.

Mantenerlo como índice operativo para frontend, no como copia de reglas de negocio.
