# INT04 — Registro participante: entrega técnica local

Corte: **17 de octubre de 2026**. Frontend sobre `20157dc` más árbol INT04; backend sobre `a045d9d` más árbol INT02-D. Las revisiones, hashes de fuentes y entorno exactos se conservan en [versiones.json](qa/pa-int04/versiones.json). No son commits de esta entrega.

## Qué revisar primero

- Entrada en ambos inicios y `/app/participacion/registrar`: capacidades compartidas, selección ACTIVA habilitada, preferencia por cuenta y recuperación propia aunque se retire permiso. VOLUNTARIO no obtiene acceso al módulo interno.
- `/app/participacion/subcampanias/:id/registrar`: tres pasos, 1–10 fotos, GPS/manual/mapa, especies del contexto, meta orientativa, fecha operativa del servidor y observaciones; participantes opcionales y confirmación final explícita.
- `commands/registrationCommandController.ts`: identidad/bytes antes de red; payload completo e inmutable antes del POST. `registrationDraftStore.ts` usa IndexedDB por actor/ámbito; `commandLifecycle.ts` comparte exclusión/lifecycle con INT06. Una pestaña con revisión obsoleta debe recuperar antes de modificar.
- Un terminal válido acredita éxito o rechazo. El 503 durable del evaluador permite revisión nueva; timeout/otro 5xx/GET202 o404 después del POST conservan la incertidumbre. PREPARADO sin POST final permite reanudar captura/listar cargas.
- Tras rechazo se conservan datos/fotos permitidos; nueva revisión explícita crea comando/cargas nuevos y vuelve a subir bytes. El descarte clausura preparación antes de soltar fotos. Una clave incierta nunca se borra por tiempo transcurrido.
- El detalle propio representa snapshots y sólo muestra observaciones al autor; sigue disponible tras retirar permiso operativo.

Las rutas internas de inicial redirigen al mismo formulario v1. Se retiraron el contexto/FIFO legado y sus consumidores sin uso. El detalle de subcampaña conserva lecturas de plan/campaña/métricas/resumen sin la consulta retirada que producía advertencias falsas. La reposición conserva su cliente interno con ámbito, propósito y origen explícitos; no se creó otra pantalla.

## Evidencia ejecutada

**60 comprobaciones integradas** entre los tres runners, además de las pruebas unitarias.

| Capa | Resultado y evidencia |
| --- | --- |
| Vitest/jsdom | **553 pruebas, 39 suites**, incluidos INT06, contratos estrictos, tres pasos, retorno, GPS/fecha, paginación, sesión y comandos. Simulan servicios/HTTP; no acreditan Storage/DB. |
| ESLint / producción | `npm run lint` y `npm run build` aprobados; el build incluye TypeScript, Vite y SW. No existe script `typecheck`. |
| Registro integrado | **30 checks**, [resultados y cotejo DB](qa/pa-int04/resultados.json). Chromium → cliente v1 → API D → PostgreSQL14/PostGIS3.2 y fotos privadas de disco. |
| Fotos adversarias | **12 checks**, [evidencia](qa/pa-int04/fotos.json). PNG no decodificable rechazado, bytes conservados tras recarga y descarte confirmado; foto de otra preparación rechazada sin consumo. |
| Reposición interna | **18 checks**, [evidencia](qa/pa-int04/reposicion.json). Cliente real desde Chromium; origen ajeno y cuentas sin equipo rechazados, un efecto de reposición, saldo vivo de Vivero intacto. |

El registro integrado prueba respuesta perdida después de commit, dos pestañas, cambio de cuenta por evento de almacenamiento real, recarga durante preparación/PUT, listado sin upload ciego, cancelación durable, rechazo de plan concurrente, revisión explícita con otra carga, 503 del evaluador, SIN_STOCK, URL ajena, lectura propia tras retiro y ausencia de descargas internas en recorrido participante. La consulta SQL es por cada UUID enviado: **tres confirmados con un registro, detalle de consumo y vínculo de foto cada uno; dos rechazados sin efectos parciales**. El caso perdido confirma dos plantas una sola vez; Vivero conserva sus filas/saldos.

Se inyectaron únicamente en el clúster efímero una revisión de plan y ausencia de respuesta del evaluador para 824; la función real de PostGIS se restablece incluso si falla el runner. El resto de autorización, registro, cargas, recibos y persistencia usa backend real. El perfil de arranque es el único adaptador de sesión: D no ofrece WebAuthn; capacidades verifica realmente el mismo Bearer. No hay personas ni credenciales reales.

Capturas: [fotos](qa/pa-int04/fotos-mobile.png), [resumen](qa/pa-int04/resumen-mobile.png), [resultado pendiente](qa/pa-int04/respuesta-perdida-mobile.png), [rechazo de plan](qa/pa-int04/rechazo-plan-mobile.png), [evaluador](qa/pa-int04/evaluador-rechazado-mobile.png), [detalle](qa/pa-int04/detalle-mobile.png), [sin permiso](qa/pa-int04/sin-permiso-mobile.png), [entrada interna desktop](qa/pa-int04/reposicion-desktop.png).

## Reproducir

Usar el [launcher D](../../backend-r3foresta/docs/pa-int02d-preview.md), con sus fuentes actuales y runtime PostGIS. Desde backend:

```sh
PA_A_HTTP_PORT=3305 TMPDIR=/private/tmp npm run preview:participacion-d -- --pg-bin /ruta/runtime/14/bin
```

El runner crea exclusivamente su clúster/objetos efímeros; 077–080 sólo se aplican allí. Su `--serve` conserva el seed. Desde PWA, en otra terminal:

```sh
VITE_API_URL=http://127.0.0.1:3305 npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Ejecutar los runners con `PA_QA_API=http://127.0.0.1:3305`, `PA_QA_PWA=http://127.0.0.1:5175`, `PA_QA_SOCKET=/private/tmp/pa-int03a-.../socket` del nuevo clúster y `PA_QA_PSQL=/ruta/runtime/14/bin/psql`:

```sh
node scripts/qa/pa-int04-reposicion.cjs
node scripts/qa/pa-int04-browser.cjs
node scripts/qa/pa-int04-fotos.cjs
```

Si Playwright no está en la resolución habitual, indicar `PLAYWRIGHT_MODULE_PATH`; `PA_QA_CHROMIUM` acepta un Chromium instalado y `PA_QA_OUTPUT` cambia el destino de evidencia. Los runners rechazan destinos ajenos a localhost/socket efímero y exigen sesiones sintéticas. Consumen datos sólo de ese fixture: ejecutar reposición antes del registro, porque este último retira el permiso de 801/820 al final. Para repetir toda la secuencia, arrancar uno nuevo. La evidencia conserva IDs de comandos/resultados sintéticos; oculta tokens y UUID de archivos/cargas.

El autocheck final del launcher D también pasó sus cinco grupos HTTP/RPC/PostGIS/Storage y limpió su clúster de comprobación. Esa evidencia backend se referencia por hash en `versiones.json`; no sustituye los 60 checks de PWA anteriores.

## Alcance pendiente

Este cierre acredita implementación/QA técnico local de INT04; no completa PA-S00/PA-S01, PA-F01 ni el piloto. Faltan cotejo/aplicación SQL y Storage remotos, corte/drenaje real, ceremonia WebAuthn, revisión humana del acabado, Impacto/Mis registros INT05 y QA externo INT08. La aplicación 074–076 comunicada por Pablo es un antecedente separado y no se repitió en su destino.

No se realizó push, despliegue ni habilitación de usuarios reales. Originales y borradores siguen privados; el SW conserva sólo shell/assets, sin outbox ni caché pública de API. El almacenamiento privado del navegador puede fallar o ser eliminado por el usuario/sistema: ese fallo bloquea el envío y requiere resolver la recuperación, nunca generar silenciosamente otra intención.
