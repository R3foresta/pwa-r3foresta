# Guardado de plantación — subcampaña 51

26 de octubre de 2026. Backend local en puerto 3000; PWA en 5173.

## Causa y evidencia

- El usuario aportó POST `/api/v1/plantaciones/iniciales` con HTTP503.
- `PARTICIPACION_INICIAL_ESCRITURA_HABILITADA` no estaba definida ni en `.env` del backend ni en el entorno del proceso anterior (PID44396).
- `ParticipacionRegistroService.registrar` pausa nuevos registros por omisión: consulta únicamente replay y devuelve503 si la preparación aún no tiene terminal. Subir fotos sigue permitido. GET de una preparación devuelve202 `SIN_RESULTADO`; consultarlo repetidamente no ejecuta el POST.
- Consulta de sólo lectura: `ff6f9246-dade-4ada-af3f-09b950154f95` y `8472076a-9e44-457b-8e19-68a3f640db2b` permanecían PREPARADO, con registro y finalización nulos. Sus tres fotos observadas estaban DISPONIBLE (evidencias720,721,722). No se modificó DB/Storage directamente.
- No se capturó el cuerpo del POST del usuario ni su payload. La pausa se acredita en configuración/código; su respuesta individual503 fue aportada por el usuario.

## Corrección

Pablo confirmó que el entorno ya estaba verificado y autorizó habilitar las escrituras. Se estableció el flag en `true` en la configuración local y se reinició el mismo backend con `node --enable-source-maps dist/main` (PID75028). `/health` respondió200 a las15:50:35 UTC. Log local: `/private/tmp/r3foresta-backend-registro.log`. La habilitación se basa en esa confirmación; esta tarea no ejecutó migraciones ni acredita por sí sola el cotejo remoto completo.

La PWA diferencia consulta y reenvío. El reintento busca primero el recibo y, ante incertidumbre con `MISMA_CLAVE`, repite exactamente el payload persistido. Un terminal recuperado evita el POST; sesión/permisos inválidos o contrato incompatible detienen el reenvío. GET202 conserva identidad, fotos y payload.

## Verificación y límites

Pruebas focales cubren terminal confirmado/rechazado recuperado sin POST, errores inconclusos con la misma clave, bloqueo por sesión/permisos y el recorrido de UI desde pausa hasta recuperación simulada.

- `npm run test -- src/modules/participacion/api/registro.api.test.ts src/modules/participacion/commands/registrationCommands.test.tsx src/modules/participacion/registro/pages/RegistrarParticipanteScreen.test.tsx`: 3 archivos / 87 pruebas aprobadas.
- `npm run lint`, `npm run build` y `git diff --check`: aprobados. El build conserva el aviso conocido por tamaño de MapLibre.
- A las15:52:26 UTC, lectura posterior al reinicio: ambos comandos continuaban PREPARADO, sin registro asociado. Esto no acredita aún un reintento del usuario después de habilitar el servidor.

El acceso al navegador local está deshabilitado para el agente. Los tests con servicios simulados no acreditan por sí solos el envío autenticado ni un despliegue remoto.

## Confirmación del guardado real

Pablo confirmó que el reintento funcionó. La consulta de sólo lectura a las12:37:14 (America/La_Paz) verificó el comando `8472076a-9e44-457b-8e19-68a3f640db2b` en CONFIRMADO, asociado al registro de plantación13 y finalizado a las12:00:25 del26 de octubre. Se acredita el guardado de ese intento tras habilitar el backend local. El otro comando `ff6f9246-dade-4ada-af3f-09b950154f95` permanece PREPARADO: no se envió, descartó ni modificó durante esta comprobación. Esto no acredita un despliegue remoto ni cierra los demás pendientes de UX.
