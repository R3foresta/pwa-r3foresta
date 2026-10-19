# Evidencia y referencias del frontend

Entrada de trabajo: [README](../README.md). Pendientes vigentes: [auditoría](../FRONTEND_AUDIT.md). Cada informe acredita sólo su revisión/entorno y distingue mocks, navegador y backend; no es un contrato nuevo ni una garantía del despliegue actual.

## Evidencia útil para continuar

| Área | Informe | Alcance |
| --- | --- | --- |
| Impacto y Mis registros INT05 | [QA y reproducción](QA_IMPACTO_INT05.md), [resultados](qa/pa-int05/resultados.json), [versiones](qa/pa-int05/versiones.json) | Consulta pública/propia, preferencias y regresión integrada local de INT04/INT06; sin despliegue ni piloto. [Cotejo previo](PREPARACION_IMPACTO_INT05.md) conservado como antecedente. |
| Registro participante INT04 | [QA y reproducción](QA_REGISTRO_PARTICIPANTE_INT04.md), [registro/DB](qa/pa-int04/resultados.json), [reposición](qa/pa-int04/reposicion.json), [fotos](qa/pa-int04/fotos.json), [versiones](qa/pa-int04/versiones.json) | Tres pasos, cargas/recuperación real con D/PostGIS, aislamiento y regresión interna local. |
| Gestión de acceso INT06 | [QA y reproducción](QA_GESTION_ACCESOS_INT06.md), [resultados](qa/pa-int06/resultados.json), [DB](qa/pa-int06/db.json), [sesión](qa/pa-int06/session.json) | C04–C09 con backend/PostgreSQL sintéticos reales; perfil de arranque adaptado, FE06 parcial. |
| Identidad/perfil | [QA UX](QA_PERFIL_PARTICIPACION_UX.md) | Pantallas/API con HTTP sintético; enlaza a evidencia backend separada. |
| Plan de Plantación | [QA editor](QA_EDITOR_PLAN_USO.md), [reutilización](QA_REUTILIZACION_PLAN.md) | Revisión atómica, propuesta/conflictos y regresión de uso; integración externa pendiente. |
| Auditorías anteriores | [Histórico al 15 de octubre](archivo/FRONTEND_AUDIT_2026-10-15.md) | Diagnósticos/cierres fechados; no usar como estado actual. |

## Antecedentes conservados

- [Inventario backend para QA](BACKEND_QA_GUIDE.md) y [encargo Recolección](BACKEND_QA_TASK.md): análisis del frontend de septiembre; cotejar código/contratos actuales antes de ejecutar.
- [Seguridad e idempotencia](BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md): criterios históricos; el problema de headers fue corregido localmente en A, y acceso C04–C09 ya tiene idempotencia propia. Sigue pendiente verificar el entorno externo y los eventos físicos.
- [Análisis inicial de Participación](ANALISIS_LCO_PLANTACION.md): corte del 9 de octubre, anterior a A/C/INT06; consultar el [tablero vigente](../../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/README.md) para continuar.
- [Diagrama DB legado](db-strucuture.md): fotografía, no esquema actual ni SQL ejecutable. Fuente de referencia: [esquema oficial](../../r3foresta-docs/database/00_database_schema.md) y migraciones/catálogo del entorno backend.

No borrar evidencia fechada para actualizar un estado: corregir la entrada vigente y enlazar el antecedente. No guardar tokens, credenciales o datos reales de personas en capturas/JSON.
