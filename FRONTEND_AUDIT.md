# Auditoría y pendientes del frontend

Corte: 17 de octubre de 2026. Lista única de deuda frontend. No sustituye el [tablero global](../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/README.md) ni acredita estado del backend desplegado.

El [histórico de auditoría](docs/archivo/FRONTEND_AUDIT_2026-10-15.md) conserva diagnósticos, cierres y resultados anteriores. Se retiraron de esta entrada los checklists repetidos y diagnósticos de módulos que ya no describían su implementación. Un hallazgo abierto se mantiene pendiente hasta verificar su cierre; este ajuste documental no lo resuelve por sí solo.

## Estado comprobado y prioridad

Entrega INT06 publicada en PWA `62f55dc`: 32 suites/445 tests, lint y build/TypeScript/PWA aprobados; 20 comprobaciones del recorrido de acceso, ocho de sesión entre pestañas y cotejo de nueve comandos/historial en PostgreSQL sintético. [Informe y límites](docs/QA_GESTION_ACCESOS_INT06.md). No extrapolar esa evidencia a WebAuthn real, otros eventos o despliegue.

| Prioridad | ID | Estado | Qué falta |
| --- | --- | --- | --- |
| Alta | AUD-021 | PENDIENTE | Completar Impacto/WebAuthn/entorno externo y QA integrado; registro/cargas con D verificados localmente en INT04. |
| Alta | AUD-020 | PENDIENTE | Implementar Impacto público/Mis registros con su proyección; no abrir el mapa interno. |
| Crítica | AUD-013 | PENDIENTE de verificación externa | Acreditar la publicación/regresión de identidad y autoridad corregidas en backend. |
| Alta | AUD-007 | BLOQUEADO en eventos físicos | Idempotencia durable/recuperación de operaciones de Vivero; C04–C09 ya tienen su propio contrato. |
| Alta | AUD-015 | PENDIENTE | QA del editor de plan con backend/migraciones 062/063 coordinados. |
| Media | AUD-016 | PENDIENTE | Reconciliar encabezado del detalle tras cierre concurrente. |
| Media | AUD-018 | PENDIENTE | Guarda ADMIN de todos los pasos del asistente de subcampaña. |
| Media | AUD-014 | PENDIENTE de reevaluación | Confirmar alertas de dependencias y planificar migración compatible. |
| Baja | AUD-004 | PENDIENTE | Revisar duplicación de formatters de fecha/zona horaria. |
| Baja | AUD-005 | PENDIENTE | Revisar tipos de campaña duplicados conservando orden visual. |

El orden de ejecución entre repositorios se decide en el tablero oficial; esta tabla prioriza riesgos de frontend, no introduce nuevas dependencias de producto.

## Pendientes y criterio de cierre

### AUD-021 — QA integrado de gestión contextual

INT06 FE01–FE05 e INT04 están implementadas/verificadas localmente. Entrega INT04 en commit local PWA `94f62a9`, con backend D `75a57eb`; pendiente de push, sin SQL remoto ni despliegue acreditados. INT04 añade 30 checks integrados de registro/cargas, dos pestañas, plan concurrente y retiro, más 18 de reposición y 12 de fotos adversarias con D ([informe](docs/QA_REGISTRO_PARTICIPANTE_INT04.md)). INT06 FE06 sigue parcial: Impacto/Mis registros INT05, WebAuthn real, entorno externo y QA completo del recorrido conservan evidencia pendiente. El QA sintético sólo adapta perfil propio; capacidades/comandos/DB son reales dentro del fixture.

Cerrar con evidencia navegador → API → DB de roles/estados, pérdida de respuesta tras commit, recarga/cambio de cuenta y regresión interna/pública. [Informe reproducible](docs/QA_GESTION_ACCESOS_INT06.md); [módulo](src/modules/participacion/README.md). No habilitar piloto sólo por cerrar esta UI.

### AUD-020 — Impacto público pendiente

`src/App.tsx` y `modules/map/MapScreen.tsx` todavía no implementan la proyección pública. El mapa actual consulta Recolección interna bajo sesión.

Cerrar con contratos públicos y rutas global/campaña/subcampaña/registro/foto fuera de guards privados, probadas en incógnito, con VOLUNTARIO sin permiso y sesión vencida. No descargar stock/equipos ni exigir perfil para consultar.

### AUD-013 — Identidad/autoridad: verificación externa pendiente

El diagnóstico del 27 de septiembre describía un bypass de JWT por headers. El [informe backend del 14 de octubre](../Backend-r3foresta/docs/pa-int02a-continuacion-2026-10-14.md) ya acredita JWT/actividad, actor derivado y privilegios en desarrollo; no presentar aquel defecto como comportamiento del código local actual.

Conservar el ID abierto para comprobar versión desplegada, rutas equivalentes, expiración/revocación y regresión con cuentas autorizadas. Logout local no revoca un token de servidor. Los criterios originales están en la [tarea histórica](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md); el contrato nuevo prevalece donde ya se verificó.

### AUD-007 — Idempotencia de eventos físicos

Confirmaciones y guardas de envío de Vivero evitan doble clic, pero no acreditan idempotencia después de una respuesta perdida. No añadir reintentos automáticos de eventos append-only sin contrato durable del backend.

Cerrar con misma clave → mismo resultado, un solo evento/efecto de saldo/evidencia y recuperación tras recarga. El motor C04–C09 de Participación no cierra este hallazgo. [Dependencia backend](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md).

### AUD-015 — Integración del editor de plan

La revisión atómica, JWT, propuesta conservada y conflictos están cubiertos con respuestas simuladas. Falta entorno coordinado con 062/063: ADMIN BORRADOR/ACTIVA, meta/especies, retirada protegida, dos revisiones concurrentes, stock sin cambios y cierre con meta vigente. [QA del editor](docs/QA_EDITOR_PLAN_USO.md).

### AUD-016 — Encabezado tras cierre concurrente

El editor puede bloquear correctamente una revisión rechazada mientras el encabezado exterior sigue ACTIVA hasta recargar. Revisar `DetalleSubcampanaScreen.tsx` y `EditarPlanSubcampania.tsx`.

Cerrar al reconciliar estado/permiso del detalle, conservando la propuesta y sin repetir el PUT; cubrir también error de lectura. Diagnóstico de uso del 9 de octubre, no una regresión nueva reproducida en esta limpieza.

### AUD-018 — Guardas del asistente

Revisar todos los pasos de `CrearSubcampanaScreen.tsx` por URL directa, no sólo meta/especies. Cerrar cuando roles sin permiso no monten acciones de edición y ADMIN mantenga el flujo. El backend conserva autorización final.

### AUD-014 — Dependencias

El análisis del 27 de septiembre registró dos alertas moderadas de React Router y una posible migración mayor. No se repitió `npm audit` en esta limpieza documental; no afirmar que su conteo sigue vigente.

Cerrar con diagnóstico actual del lockfile, actualización revisada y pruebas de navegación/guards/redirecciones. Evitar `npm audit fix --force` sin evaluar el cambio de versión principal.

### AUD-004 — Formatters

Revisar `subcampaniaFormatters.ts` y formateos en dashboards antes de extraer utilidades de fecha/zona horaria. Cerrar al reutilizar lo compartido sin cambiar presentación deliberada; no hacer un refactor global por esta lista.

### AUD-005 — Tipos de campaña

El service conserva `TIPOS_CAMPANIA` y el formulario `CAMPANIA_TYPES`, con distinto orden. Cerrar al compartir valores canónicos conservando el orden visual explícito. No reemplazar enums de backend por etiquetas de UI.

## Cierres conservados

| IDs | Alcance cerrado en su fecha |
| --- | --- |
| AUD-002 / AUD-003 | TypeScript/build y lint del workspace. |
| AUD-006 | Embolsado unificado; sin tope masa → plantas. |
| AUD-008 / AUD-009 | Precisión canónica y corrección/reenvío de Recolección rechazada. |
| AUD-010 | Comentarios/README de Vivero alineados con consumidores. |
| AUD-011 / AUD-012 | Registro mock retirado, sesión verificada y promesas offline ficticias retiradas. |
| AUD-017 / AUD-019 | Consulta de plan y UX de identidad/perfil/navegación. |

Evidencia completa en el [histórico](docs/archivo/FRONTEND_AUDIT_2026-10-15.md) y [QA por entrega](docs/README.md). No reabrir un cierre por leer su descripción antigua; registrar una regresión con evidencia nueva.

## Mantener esta lista

Cada hallazgo nuevo necesita ID estable, ubicación, síntoma reproducible, riesgo y criterio verificable de cierre. Priorizar problemas operativos, autorización, atomicidad e incertidumbre. No duplicar checklists de [AGENTS](AGENTS.md), reglas del [dominio](DOMAIN_INDEX.md) ni el backlog global.
