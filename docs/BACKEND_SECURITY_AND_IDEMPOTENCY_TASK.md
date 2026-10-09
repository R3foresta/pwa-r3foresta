# Pendientes backend de seguridad e idempotencia

Revisión estática: 2026-09-27. Relacionado con `AUD-007`, `AUD-011` y `AUD-013` de `FRONTEND_AUDIT.md`.

Este documento registra dependencias encontradas al corregir el frontend. No acredita el estado del backend desplegado ni autoriza migraciones o cambios de datos. Las referencias se verificaron en el repositorio local `../Backend-r3foresta` y en `../r3foresta-docs/ARCHITECTURE.md`.

## 1. Identidad autenticada en backend — prioridad crítica

### Evidencia

- `src/users/users.controller.ts`, `GET /api/users/profile`: cuando llega `x-auth-id`, el controller consulta ese usuario antes de verificar el JWT. El comentario lo llama modo de desarrollo, pero la rama no comprueba el entorno.
- El mismo controller admite identidad por header en `POST /api/users/register-form` y `PATCH /api/users/profile/photo`.
- El frontend puede validar la restauración usando únicamente `Authorization: Bearer <token>` en perfil. Esto no elimina el acceso directo por headers admitido por el servidor.

### Trabajo requerido

1. Revisar los guards y controllers del backend real; inventariar qué rutas confían en `x-auth-id` o `x-user-role` y cuáles verifican credenciales.
2. Derivar identidad y rol de una credencial verificada para rutas protegidas. No permitir que un header suministrado por el cliente sustituya esa identidad ni cambie su rol.
3. Acordar la migración de consumidores que actualmente requieren `x-auth-id`, preservando contratos de dominio. No retirar headers globalmente desde frontend antes de confirmar compatibilidad.
4. Confirmar expiración del token y si hay revocación de servidor. El logout local no revoca tokens ya emitidos; no hay ruta de revocación confirmada en esta revisión.
5. Revisar asociación, expiración y consumo único del challenge WebAuthn según su contrato oficial.

### Aceptación

- Token ausente, inválido o expirado: la ruta protegida devuelve `401`, aunque haya un `x-auth-id` válido.
- Un usuario autenticado no puede consultar o modificar otro perfil cambiando `x-auth-id`.
- Un rol enviado en `x-user-role` no permite elevar privilegios.
- Login, registro WebAuthn, completar perfil y operaciones autorizadas siguen funcionando con cuentas QA controladas.

## 2. Idempotencia de eventos y comandos de saldo — prioridad alta

### Evidencia

La sección 11.3 de `../r3foresta-docs/ARCHITECTURE.md` declara que eventos y comandos de saldo no aceptan una clave de idempotencia de extremo a extremo. La búsqueda en código backend no identificó un contrato para esos comandos. La eliminación idempotente de evidencias pendientes de Plantación no cubre el registro de eventos de Vivero.

### Contrato por acordar

- Transporte y formato de la clave, alcance por actor y operación, duración y persistencia durable.
- Mismo intento y mismo contenido: devolver la operación original.
- Misma clave con contenido distinto: rechazar con un conflicto explícito.
- Solicitudes concurrentes con la misma clave: una sola operación registrada.
- Recuperación tras pérdida de respuesta, recarga o timeout.
- Vínculo entre intento, evidencias pendientes, evento y movimientos de saldo; evitar duplicar evidencias o consumirlas dos veces.
- Forma de consultar el resultado de un intento cuyo resultado es incierto.

No se define aquí una ruta ni un header definitivo. El contrato debe confirmarse en backend antes de conectarlo desde frontend.

### Aceptación conjunta

1. Simular que el servidor registra un evento y se pierde su respuesta.
2. Reenviar el mismo intento; recibir el evento original.
3. Comprobar un solo evento, un solo efecto sobre saldo y los vínculos correctos de evidencia.
4. Repetir con concurrencia y con contenido distinto bajo la misma clave.
5. Comprobar que un intento nuevo sí puede registrar otra operación válida.

Los botones bloqueados durante envío y las confirmaciones previas son prevención de errores de interacción. No demuestran idempotencia ni permiten cerrar `AUD-007`.

## 3. QA integrado pendiente

Usar un ambiente y actores QA controlados. Las pruebas de frontend con servicios simulados verifican comportamiento de UI y requests; no sustituyen pruebas de autorización, atomicidad o persistencia contra el backend real. Registrar por separado qué se verificó localmente y qué se verificó en ese ambiente.
