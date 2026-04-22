## Documentación actualizada (Mermaid ER)

```mermaid
erDiagram

  PAIS {
    bigint id PK
    text nombre
    character codigo_iso2 "UNIQUE"
    character codigo_iso3
    boolean activo
    timestamptz created_at
  }

  DIVISION_TIPO {
    bigint id PK
    bigint pais_id FK
    text nombre
    int orden
    boolean activo
    timestamptz created_at
  }

  DIVISION_ADMINISTRATIVA {
    bigint id PK
    bigint pais_id FK
    bigint parent_id FK "self"
    bigint tipo_id FK
    text nombre
    text codigo_externo
    boolean activo
    bigint reemplazada_por_id FK "self"
    timestamptz created_at
    timestamptz updated_at
  }

  UBICACION {
    bigint id PK
    numeric latitud
    numeric longitud
    timestamptz created_at
    bigint pais_id FK
    bigint division_id FK
    text nombre
    int precision_m
    text fuente
    text referencia
    timestamptz updated_at
  }

  USUARIO {
    bigint id PK
    text nombre
    text apellido
    text doc_identidad "UNIQUE"
    text wallet_address "UNIQUE"
    text organizacion
    text contacto
    ENUM(rol_usuario) rol
    timestamptz created_at
    text username "UNIQUE"
    text auth_id
    text correo "UNIQUE"
    text foto_perfil_url
  }

  USUARIO_CREDENCIAL {
    bigint id PK
    bigint usuario_id FK
    text credential_id "UNIQUE"
    text public_key
    text algorithm
    int counter
    ARRAY transports
    timestamptz created_at
    timestamptz last_used_at
  }

  TIPOS_ENTIDAD_EVIDENCIA {
    smallint id PK
    text codigo "UNIQUE"
    text descripcion
    boolean activo
    timestamptz creado_en
  }

  EVIDENCIAS_TRAZABILIDAD {
    bigint id PK
    smallint tipo_entidad_id FK
    bigint entidad_id
    text codigo_trazabilidad
    text bucket
    text ruta_archivo
    uuid storage_object_id
    text tipo_archivo
    text mime_type
    bigint tamano_bytes
    text hash_sha256
    text titulo
    text descripcion
    jsonb metadata
    boolean es_principal
    int orden
    timestamptz tomado_en
    timestamptz creado_en
    timestamptz actualizado_en
    timestamptz eliminado_en
    bigint creado_por_usuario_id FK
    bigint actualizado_por_usuario_id FK
    bigint eliminado_por_usuario_id FK
  }

  VIVERO {
    bigint id PK
    text codigo "UNIQUE"
    text nombre
    bigint ubicacion_id FK "UNIQUE"
    timestamptz created_at
  }

  TIPO_PLANTA {
    int id PK
    text nombre "UNIQUE"
    timestamptz created_at
  }

  PLANTA {
    bigint id PK
    text especie
    text nombre_cientifico
    text variedad
    timestamptz created_at
    text nombre_comun_principal
    text nombres_comunes
    text imagen_url
    text notas
    int tipo_planta_id FK
  }

  METODO_RECOLECCION {
    bigint id PK
    text nombre "UNIQUE (USER-DEFINED en tu DDL)"
    text descripcion
  }

  RECOLECCION {
    bigint id PK
    date fecha
    text nombre_cientifico
    text nombre_comercial
    numeric cantidad
    text unidad
    ENUM(tipo_material_origen) tipo_material
    ENUM(estado_recoleccion) estado
    boolean especie_nueva
    text observaciones
    bigint usuario_id FK
    bigint ubicacion_id FK
    bigint vivero_id FK
    bigint metodo_id FK
    bigint planta_id FK
    timestamptz created_at
    text codigo_trazabilidad "UNIQUE"
    text blockchain_url
    text token_id
    text transaction_hash
    ENUM(estado_registro_recoleccion) estado_registro
    text unidad_canonica
    numeric cantidad_inicial_canonica
    bigint usuario_validacion_id FK
    timestamptz fecha_validacion
    text blockchain_tx_validacion
  }

  RECOLECCION_MOVIMIENTO {
    bigint id PK
    bigint recoleccion_id FK
    ENUM(tipo_movimiento_recoleccion) tipo_movimiento
    numeric delta
    text unidad_operativa
    ENUM(motivo_movimiento_recoleccion) motivo
    text motivo_otro
    bigint lote_vivero_id
    jsonb detalle_cambios
    bigint created_by FK
    timestamptz created_at
    text blockchain_tx_hash
  }

  LOTE_FASE_VIVERO {
    bigint id PK
    bigint planta_id FK
    bigint vivero_id FK
    bigint responsable_id FK
    date fecha_inicio
    int cantidad_inicio
    int cantidad_embolsadas
    int cantidad_sombra
    int cantidad_lista_plantar
    date fecha_embolsado
    date fecha_sombra
    date fecha_salida
    numeric altura_prom_sombra
    numeric altura_prom_salida
    timestamptz created_at
    timestamptz updated_at
    bigint updated_by FK
    text codigo_trazabilidad "UNIQUE"
  }

  LOTE_FASE_VIVERO_HISTORIAL {
    bigint id PK
    bigint lote_id FK
    int nro_cambio
    timestamptz fecha_cambio
    bigint responsable_id FK
    int cantidad_inicio
    int cantidad_embolsadas
    int cantidad_sombra
    int cantidad_lista_plantar
    date fecha_inicio
    date fecha_embolsado
    date fecha_sombra
    date fecha_salida
    numeric altura_prom_sombra
    numeric altura_prom_salida
    text notas
  }

  LOTE_FASE_VIVERO_FOTO {
    bigint id PK
    bigint lote_historial_id FK
    text url
    int peso_bytes
    text formato
    boolean es_portada
    text descripcion
    timestamptz created_at
  }

  LOTE_FASE_VIVERO_RECOLECCION {
    bigint lote_id PK,FK
    bigint recoleccion_id PK,FK
  }

  PLANTACION {
    bigint id PK
    text codigo_trazabilidad "UNIQUE"
    text destino
    int ubicacion_id FK
    int cantidad_arboles
    date fecha_plantacion
    numeric superficie_m2
    numeric tamano_promedio_cm
    text propietario
    text origen_propiedad
    int frecuencia_monitoreo_dias
    int created_by FK
    timestamptz created_at
  }

  TIPO_ABONO {
    int id PK
    text nombre "UNIQUE"
    text descripcion
  }

  TIPO_RIEGO {
    int id PK
    text nombre "UNIQUE"
    text descripcion
  }

  PLANTACION_ABONO {
    bigint plantacion_id PK,FK
    int tipo_abono_id PK,FK
  }

  PLANTACION_RIEGO {
    bigint plantacion_id PK,FK
    int tipo_riego_id PK,FK
  }

  PLANTACION_USUARIO {
    bigint plantacion_id PK,FK
    int usuario_id PK,FK
    text rol
  }

  PLANTACION_FOTO {
    bigint id PK
    bigint plantacion_id FK
    text url
    int peso_bytes
    text formato
    text descripcion
  }

  PLANTACION_MONITOREO {
    bigint id PK
    bigint plantacion_id FK
    date fecha_monitoreo
    int arboles_vivos
    int arboles_muertos
    int arboles_reemplazados
    text notas
    int usuario_id FK
    timestamptz created_at
  }

  PLANTACION_LOTE_FASE_VIVERO {
    bigint plantacion_id PK,FK
    int lote_fase_vivero_id PK,FK
    int cantidad_plantines_usados
  }

  %% =========================
  %% Relaciones
  %% =========================

  PAIS ||--o{ DIVISION_TIPO : tiene
  PAIS ||--o{ DIVISION_ADMINISTRATIVA : tiene
  PAIS ||--o{ UBICACION : tiene

  DIVISION_TIPO ||--o{ DIVISION_ADMINISTRATIVA : clasifica
  DIVISION_ADMINISTRATIVA ||--o{ DIVISION_ADMINISTRATIVA : parent
  DIVISION_ADMINISTRATIVA ||--o{ DIVISION_ADMINISTRATIVA : reemplaza

  UBICACION }o--|| DIVISION_ADMINISTRATIVA : pertenece_a
  UBICACION ||--|| VIVERO : ubicacion_unica

  USUARIO ||--o{ USUARIO_CREDENCIAL : tiene

  USUARIO ||--o{ RECOLECCION : registra
  UBICACION ||--o{ RECOLECCION : ocurre_en
  VIVERO ||--o{ RECOLECCION : almacena_en
  METODO_RECOLECCION ||--o{ RECOLECCION : metodo
  PLANTA ||--o{ RECOLECCION : identifica

  RECOLECCION ||--o{ RECOLECCION_MOVIMIENTO : movimientos
  USUARIO ||--o{ RECOLECCION_MOVIMIENTO : creado_por

  VIVERO ||--o{ LOTE_FASE_VIVERO : contiene
  USUARIO ||--o{ LOTE_FASE_VIVERO : responsable
  USUARIO ||--o{ LOTE_FASE_VIVERO : updated_by
  PLANTA ||--o{ LOTE_FASE_VIVERO : planta

  LOTE_FASE_VIVERO ||--o{ LOTE_FASE_VIVERO_HISTORIAL : historial
  USUARIO ||--o{ LOTE_FASE_VIVERO_HISTORIAL : responsable
  LOTE_FASE_VIVERO_HISTORIAL ||--o{ LOTE_FASE_VIVERO_FOTO : fotos

  LOTE_FASE_VIVERO ||--o{ LOTE_FASE_VIVERO_RECOLECCION : consume
  RECOLECCION ||--o{ LOTE_FASE_VIVERO_RECOLECCION : origen

  UBICACION ||--o{ PLANTACION : lugar
  USUARIO ||--o{ PLANTACION : created_by

  PLANTACION ||--o{ PLANTACION_FOTO : fotos
  PLANTACION ||--o{ PLANTACION_MONITOREO : monitoreos
  USUARIO ||--o{ PLANTACION_MONITOREO : registra

  PLANTACION ||--o{ PLANTACION_ABONO : usa
  TIPO_ABONO ||--o{ PLANTACION_ABONO : tipo

  PLANTACION ||--o{ PLANTACION_RIEGO : usa
  TIPO_RIEGO ||--o{ PLANTACION_RIEGO : tipo

  PLANTACION ||--o{ PLANTACION_USUARIO : asigna
  USUARIO ||--o{ PLANTACION_USUARIO : participa

  PLANTACION ||--o{ PLANTACION_LOTE_FASE_VIVERO : usa_lote
  LOTE_FASE_VIVERO ||--o{ PLANTACION_LOTE_FASE_VIVERO : se_usa_en

  TIPOS_ENTIDAD_EVIDENCIA ||--o{ EVIDENCIAS_TRAZABILIDAD : tipo
  USUARIO ||--o{ EVIDENCIAS_TRAZABILIDAD : creado_por
  USUARIO ||--o{ EVIDENCIAS_TRAZABILIDAD : actualizado_por
  USUARIO ||--o{ EVIDENCIAS_TRAZABILIDAD : eliminado_por

```

---

## Aclaraciones (déjalas aparte tal como pediste)

**En UBICACION (nuevo):**

* `division_id` = la **división más específica** conocida (puede ser municipio, comunidad, cantón, etc.)
* `nombre` = nombre del sitio puntual: *Parcela X, Vivero Y, Sector Z*
* `fuente` = `GPS_MOVIL | MAPA | MANUAL | LEGACY`
* `precision_m` = precisión aproximada en metros
* `referencia` = indicaciones humanas (texto libre)

**En DIVISION_ADMINISTRATIVA:**

* `parent_id` arma el árbol (nivel variable por país)
* `reemplazada_por_id` sirve para “fusionar/renombrar” sin borrar historia (muy útil para trazabilidad)

**En RECOLECCION:**

* `estado` = `ALMACENADO` por defecto (enum)
* `tipo_material` = enum user-defined
* fechas: `fecha` limitada a 45 días hacia atrás


**En PLANTACION:**

* `destino` = `ARBORIZACION | FORESTACION | REFORESTACION`
* `origen_propiedad` = `DONADO | ADQUIRIDO | OTRO | NULL`

