# Administración de usuarios y roles globales

**Verificación local: 3 de noviembre de 2026.** Base PWA `c684ad9` y backend `f26cbfa`, más árbol de trabajo. [Resultados del navegador](qa/usuarios-administracion/resultados.json), [versiones, pruebas y huellas](qa/usuarios-administracion/verificacion-local.json), [contrato backend](../../Backend-r3foresta/documentacion/frontend/modulos/usuarios.md#administración-de-roles-globales).

La entrada «Usuarios y permisos» aparece en el inicio y menú con ADMIN global vigente y capacidad `asignar_roles`. `/app/usuarios` permite buscar una cuenta activa por nombre/username, filtrar por rol, recorrer páginas y escoger GENERAL, ADMIN, VALIDADOR o VOLUNTARIO. Cada cuenta tiene un rol global. El motivo y la confirmación explícita conservan la auditoría existente; antes de confirmar se relee la autoridad y su revisión exacta. Sin ADMIN solo se permite recuperar un envío propio anterior, sin descargar el listado ni habilitar nuevas asignaciones.

El cliente comparte transporte privado, verificación de actor, exclusión entre pestañas y ciclo de comandos con participación. Conserva antes del POST la intención mínima por actor en `localStorage` (destino, UUID, rol, revisión y motivo necesarios para repetir el mismo comando), sin tokens ni perfiles. Red/5xx/recibo incompatible mantienen incertidumbre; recarga y cambio de cuenta conservan esa clave hasta un terminal validado. Un recibo no sustituye las capacidades actuales; cambiar el rol propio refresca también el perfil.

Las lecturas del listado, páginas adicionales y autoridad bloquean nuevas asignaciones ante `401` o `403`. La pantalla ofrece recuperar sesión o revisar permisos y solo libera ese bloqueo después de reconsultar capacidades. El diálogo y la revisión anterior quedan invalidados; la recuperación de un comando propio sigue disponible.

## Verificación ejecutada

- `npm run lint` y `npm run build` aprobados; build incluye TypeScript.
- `npm run test -- --maxWorkers=2`: 81 suites y 1.137 pruebas aprobadas tras los ajustes de sesión y permisos. La base recibida también pasó las 1.129 pruebas anteriores con dos workers; no se cambiaron timeouts.
- Navegador Chrome/Playwright contra preview C y PostgreSQL14.17 aislado: 27 comprobaciones; móvil390 y escritorio1280 sin desbordamiento ni errores de ejecución. Selección/cancelación/cambio, último ADMIN, pérdida de respuesta tras commit, GET de recuperación sin un POST nuevo y aislamiento entre cuentas verificados.
- Solo el perfil propio de arranque está adaptado, contrastando actor/rol con capacidades reales de API/DB. Selector, autoridad, comandos y recuperación usan backend real; no acredita WebAuthn.
- Ocho regresiones adicionales cubren `401`/`403` en las tres lecturas, dos confirmaciones simultáneas con un único UUID/POST y recuperación bajo `StrictMode` sin reenviar ni aceptar respuestas canceladas. Estas regresiones simulan servicios; las 27 comprobaciones de navegador anteriores usan el backend sintético real.

## Reproducir y publicar

El backend necesita [091](../../Backend-r3foresta/migrations/091_usuarios_administracion_lectura.sql), además de los antecedentes064/072/073. Aplicar/cotejar091 en destino antes de publicar el backend consumidor y la PWA. No se aplicó SQL remoto ni se realizó commit, push o despliegue.

Para QA aislada iniciar en el backend `python3 scripts/qa/pa-int02c-preview.py --origin http://127.0.0.1:3306` y en la PWA `VITE_API_URL=http://127.0.0.1:3302 npm run dev -- --host 127.0.0.1 --port 3306 --strictPort`. Ejecutar `scripts/qa/usuarios-administracion-browser.cjs` con `PA_QA_API`, `PA_QA_PWA` y un módulo Playwright/Chrome disponibles localmente. El script exige el marcador sintético y no conecta servicios reales. Sus dos mutaciones API preparan/restauran el segundo ADMIN sin borrar historia; la persona604 termina VALIDADOR/revisión2. Reiniciar el preview restablece la fixture; detenerlo limpia su clúster.
