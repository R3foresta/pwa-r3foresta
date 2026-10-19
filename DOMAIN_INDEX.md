# Índice de dominio para frontend

Corte documental: 15 de octubre de 2026. Es un mapa de consulta, no otro contrato. Las reglas/ADR/esquema aceptados viven en `r3foresta-docs`; la implementación local y los informes de QA acreditan sólo su alcance explícito. Ante una contradicción o contrato faltante, contrastar la fuente y pedir aclaración antes de cambiar negocio.

## Fuentes oficiales

| Área | Fuente local en el repositorio hermano |
| --- | --- |
| General: personas, roles, plantas, ubicaciones, evidencias | [00-general-module](../r3foresta-docs/00-general-module/README.md) |
| Recolección: estados, snapshots, unidades y saldo origen | [01-recoleccion-module](../r3foresta-docs/01-recoleccion-module/README.md) |
| Vivero: etapas, eventos y saldo vivo | [02-vivero-module](../r3foresta-docs/02-vivero-module/README.md) |
| Plantación: stock, plan y cierre | [03-plantacion-module](../r3foresta-docs/03-plantacion-module/README.md) |
| Participación Aliada: specs y ejecución | [Specs](../r3foresta-docs/specs/plantacion/participacion-aliada/README.md), [tablero](../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/README.md) |
| Identidad, capacidades, comandos y recuperación | [Contrato aceptado](../r3foresta-docs/specs/plantacion/participacion-aliada/contrato-identidad-permisos-backend-propuesta.md) |
| Esquema de referencia | [database](../r3foresta-docs/database/00_database_schema.md); contrastar migraciones del backend y catálogo del entorno |

Sin checkout hermano, usar [r3foresta-docs remoto](https://github.com/R3foresta/r3foresta-docs). `docs/db-strucuture.md` es una fotografía legada; no usarla para inventar enums/campos ni modificar DB.

## Invariantes que no debe romper la UI

### Unidades y snapshots

- Persistir `UNIDAD` entera o `G` con máximo un decimal. `kg` es entrada de UI; convertir exactamente, sin redondeo silencioso. Nunca persistir kg ni usar `GR`.
- `ESQUEJE` siempre usa `UNIDAD`. Desde EMBOLSADO, saldo vivo en `UNIDAD`; ninguna conversión automática de masa en plantas.
- Snapshots congelados, de sólo lectura. En Vivero proceden de Recolección validada; no recalcularlos desde PLANTA viva. Usar nombres contractuales, incluido `nombre_comercial_snapshot`.
- Saldos, cierres y elegibilidad final pertenecen al backend; frontend muestra restricciones y ayuda a validar.

### Recolección

| Estado | Comportamiento |
| --- | --- |
| BORRADOR / RECHAZADO | Edición según permiso. La corrección de rechazado guarda BORRADOR antes del envío. |
| PENDIENTE_VALIDACION | Congelado mientras se revisa. |
| VALIDADO | Sellado; sólo movimientos posteriores, sin editar snapshots/ficha. |
| ABIERTO / CERRADO | Estado operativo derivado del saldo, no seleccionable. |

Sólo VALIDADO + ABIERTO con saldo puede alimentar Vivero. INICIO registra el consumo negativo `CONSUMO_A_VIVERO`; no ofrecer consumo manual paralelo desde Recolección. Movimientos append-only.

### Vivero

| Evento / etapa | Efecto y restricción |
| --- | --- |
| INICIO | Un único lote origen; selecciona vivero operativo, no hereda automáticamente `RECOLECCION.vivero_id`. Crea material en proceso y descuenta Recolección de forma atómica; no crea plantas vivas. Saldos vivos se muestran no disponibles/null. |
| EMBOLSADO | Único por lote; plantas observadas > 0. Nace saldo vivo en UNIDAD; cantidad afectada igual a plantas iniciales. Saldo anterior conceptual 0 (backend null). |
| ADAPTABILIDAD | Seguimiento del lote completo; repetible, sin saldo ni secuencia rígida SOMBRA/MEDIA_SOMBRA/SOL_DIRECTO. No es requisito de merma/despacho. |
| MERMA | Requiere EMBOLSADO, causa y cantidad entera > 0 hasta saldo disponible. |
| DESPACHO | Requiere EMBOLSADO, destino estructurado y cantidad entera > 0 hasta saldo disponible. Admite parciales. |
| Cierre | Backend cierra al agotar saldo; no simularlo persistido ni ofrecer cierre manual de Vivero. |

Eventos append-only: no editar/borrar ni ocultar historial salvo filtros visuales. Despacho manual y asignación física a Plantación son operaciones distintas; consumir una asignación no crea otro despacho automático. Para Descarte pre-embolsado y asignaciones/devoluciones, consultar sus DTO reales y fuente Vivero/Plantación; no ampliar enums desde este resumen.

### Evidencias y fechas

- Evidencia por `tipo_entidad_id` + `entidad_id`; para eventos Vivero, apunta al ID de `EVENTO_LOTE_VIVERO`.
- INICIO/EMBOLSADO/MERMA/DESPACHO requieren mínimo una foto válida; ADAPTABILIDAD es opcional. No añadir evidencias tardías a eventos obligatorios del MVP.
- Recolección requiere mínimo dos fotos en el flujo vigente. Conservar metadatos y mostrar preview sólo con recurso seguro; bucket/ruta no son URL pública.
- Distinguir fecha operativa y de registro, sin futuro. Ventanas y zona horaria se contrastan con el contrato: no reutilizar validadores de otro módulo por similitud.
- Blockchain no reemplaza ni condiciona la persistencia base salvo contrato explícito.

### Plantación y acceso contextual

- Unidades/personas/organizaciones no son bolsas de stock equivalentes. La asignación física abastece la subcampaña; el registro consume ese stock según su endpoint, sin un trámite inventado de recepción.
- Meta orientativa; revisión de meta/especies es atómica/versionada. Cierre manual de Plantación es independiente y no habilita reapertura de COMPLETADA/FINALIZADA_PARCIAL/CANCELADA.
- Cuenta nueva VOLUNTARIO; perfil/afiliación opcional no conceden autoridad. Roles globales: ADMIN, GENERAL, VALIDADOR, VOLUNTARIO.
- PLANTADOR/ADMINISTRADOR_SUBCAMPANIA son permisos persona + subcampaña; logística COORDINADOR/OPERARIO permanece separada. El administrador contextual no obtiene herramientas internas por su permiso.
- ADMIN global conserva autoridad efectiva aunque se retire su permiso contextual. Proteger al último administrador contextual dentro de la transacción backend.
- Incorporar en BORRADOR/ACTIVA; retiros y reemplazos en cerradas/canceladas conforme a capacidades/contrato, sin reapertura. PAUSADA reservada no habilita mutaciones nuevas.
- Selección masiva: hasta 100 IDs actuales, todo-o-nada; no heredar ámbitos futuros ni ejecutar un POST por ámbito.
- Conservar UUID/payload/revisiones ante incertidumbre y recuperar con el actor original. El terminal histórico no concede permisos actuales ni un retiro borra registros anteriores.
- Impacto es público por contrato y su proyección/frontend INT05 están verificados localmente; [evidencia y límites](docs/QA_IMPACTO_INT05.md). El mapa interno conserva su audiencia. Registro privado sí requiere sesión y autoridad.

## Dónde continuar

DTO/enums reales en `src/modules/*/types`, `src/api/` y clientes del módulo; no copiar una lista de enums de este documento a código. [Guía](FRONTEND_GUIDE.md) para patrones, [auditoría](FRONTEND_AUDIT.md) para pendientes y [evidencia](docs/README.md) para alcance probado. El registro interno existente y el nuevo registro participante v1 tienen contratos/estado de entrega distintos.
