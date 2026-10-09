# Pendientes del frontend R3foresta

Actualizado: 2026-09-29. El registro de hallazgos, evidencia y criterios de cierre se mantiene en [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md).

## Correcciones prioritarias terminadas

- [x] **AUD-006:** unificar Embolsado y retirar topes que relacionaban gramos con plantas.
- [x] **AUD-008:** precisión canónica de G, enteros en UNIDAD y conversión sin redondeo silencioso.
- [x] **AUD-009:** corregir RECHAZADO, guardar como BORRADOR y reenviar según contrato y permisos; proteger acceso directo al formulario.
- [x] **AUD-011 (frontend):** retirar registro mock, centralizar sesión, verificar perfil con Bearer y completar logout local.
- [x] **AUD-012:** retirar promesa de sync offline y contadores ficticios de sincronización.
- [x] Completar confirmaciones de INICIO y eventos de Vivero, guardas de doble envío, cancelación sin escrituras y navegación por teclado del diálogo.
- [x] Incorporar Vitest, Testing Library y 32 pruebas de comportamiento; lint y build/PWA pasan.
- [x] Aplicar actualizaciones compatibles de dependencias; se eliminaron las alertas altas detectadas.

AUD-002, AUD-003 y AUD-010 ya estaban resueltos antes de esta entrega. No reabrirlos por el texto del diagnóstico histórico; registrar una regresión nueva si se reproduce.

## Siguiente prioridad: coordinación con backend

- [ ] **AUD-013 — CRITICA / BLOQUEADO:** cerrar autorización por headers de identidad sin JWT y confirmar revocación/expiración de sesiones.
- [ ] **AUD-007 — ALTA / BLOQUEADO:** idempotencia durable de eventos y comandos de saldo, incluyendo evidencias y recuperación de respuestas perdidas.
- [ ] QA integrado con actores y datos controlados: las pruebas locales con servicios simulados no acreditan seguridad ni persistencia del backend desplegado.

Contrato, evidencia y criterios de aceptación: [BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md). No crear claves/headers/endpoints supuestos ni reintentos automáticos de escrituras.

## Mantenibilidad y ampliaciones posteriores

- [ ] **AUD-014 — MEDIA:** migrar React Router con pruebas de navegación para atender las dos alertas moderadas restantes; no aplicar `npm audit fix --force` sin esa revisión.
- [ ] Consolidar cliente HTTP por módulo después de acordar autenticación y errores; conservar contratos y atomicidad.
- [ ] **AUD-004 — BAJA:** completar formatters compartidos; `formatRelativeTime` ya existe, falta revisar fechas y zona horaria.
- [ ] **AUD-005 — BAJA:** reutilizar tipos canónicos de campaña y conservar el orden visual deliberado.
- [ ] Actividad global de Plantación: confirmar contrato antes de sustituir la vista previa.
- [ ] Tab Asignaciones: evaluar primero el endpoint de contexto de subcampaña existente y sus permisos.
- [ ] Mostrar saldo/estado de origen en Vivero y separar la presentación de Origen/Lote sin recalcular datos.
- [ ] Recuperar fotos de borradores localmente; la sincronización requiere un diseño posterior de outbox e idempotencia.
- [ ] Revisar TODO sobre PLANTA viva conservando los snapshots congelados de registros validados.

## Verificación por entrega

Ejecutar `npm run lint`, `npm test` y `npm run build`, más la comprobación funcional afectada. El build incluye TypeScript; no existe script independiente `typecheck`. Usar Node compatible con Vitest/jsdom (entorno verificado: 24.19). Documentar por separado resultados simulados, navegador y backend real.
