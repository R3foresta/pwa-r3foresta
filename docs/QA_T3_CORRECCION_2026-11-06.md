# T3 · Correcciones de la revisión coordinadora

**6 de noviembre de 2026 · implementación local corregida y revisada.** [Cierre y evidencia coordinadora](../../Backend-r3foresta/docs/evidencia/t3-revision-coordinadora-2026-11-06.json). No se inició T4/T5 ni se hizo SQL remoto, commit de entrega, push o despliegue.

Este corte complementa la [entrega del 5 de noviembre](QA_T3_ACCESOS.md). Conserva sin reescribir el [manifest anterior](evidencia/t3-validacion-2026-11-05.json), sus resultados/capturas/logs y las migraciones 092–095. [Base comprobada antes de corregir](evidencia/t3-correccion-base-2026-11-06.json), [nuevo manifest y huellas](evidencia/t3-correccion-validacion-2026-11-06.json).

## P2 · Entrada y regreso del revisor M2 sin M1

La entrada de Inicio y de la barra apuntaba al índice `/app/collections`. El guard permitía entrar al VALIDADOR con revisión M2, pero el índice montaba la lista propia (`GET /api/recolecciones`), que exige M1. El navegador anterior entraba directamente a `/validate` y su fixture no reproducía ese 403.

El índice ahora espera la lectura M1 antes de montar la lista propia. Con capacidad M1 mantiene esa lista; sin ella y con revisión M2 redirige a `/app/collections/validate`, que consume `pending-validation`. Un fallo de lectura M1 tampoco convierte M1 en requisito nuevo del revisor M2. El guard existente presenta falta de permiso/error cuando no existe ninguna vía autorizada.

«Volver» desde la cola lleva a Inicio cuando no hay lista propia M1 y conserva el regreso a Recolecciones cuando sí existe. Así el índice y la vuelta no producen un bucle. No se cambian backend, roles, permisos M3 ni audiencia pública.

Las siete regresiones del índice cubren entrada del revisor, entrada con M1 solo/ambos, carga M1 tardía, fallo/sesión expirada de M1, y los dos destinos de regreso. El navegador pulsa las entradas reales de Inicio y de la barra; su fixture **devuelve 403 a la lista propia sin M1**, con control negativo explícito. Esos recorridos no solicitan esa lista ni conceden M1 para poder revisar.

## P3 · Una lectura confirmada tras DESECHO incierto

Después de un fallo de DESECHO, el diálogo consultaba material pero dejaba activo el bloqueo y exigía una segunda consulta. Ahora el bloqueo registra la versión anterior a la consulta. Sólo una lectura correcta de una versión posterior, publicada por `useOrigenes` para la clave actual, permite preparar otra operación. Los datos de la clave anterior no se muestran como un saldo nuevo durante carga o error.

El diálogo y el reintento comparten una única acción de consulta. La confirmación física queda deshabilitada mientras el resultado sea incierto; una lectura fallida mantiene el bloqueo y permite reintentar **la lectura**. Una sola lectura correcta basta, incluido un resultado vacío/saldo agotado. No hay POST automático ni reconstrucción del saldo en el cliente; se conserva el aviso de que el resultado del desecho anterior sigue sin confirmarse.

Tres regresiones con el hook real comprueban saldo posterior positivo/vacío y lectura fallida seguida de reintento correcto. Se controlan conteos de GET/POST, desaparición del saldo viejo, bloqueo durante carga/error y ausencia de una segunda consulta innecesaria.

## Verificación

Se repitieron pruebas completas/focales, lint y build con `PATH=/Users/pabloandresfernandezcari/.nvm/versions/node/v24.19.0/bin:$PATH` y `TMPDIR=/private/tmp` explícitos. Cada ejecución registra el binario real de Node, la versión de npm, el comando y su salida: [pruebas completas](qa/t3-accesos-correccion-2026-11-06/runtime-tests.json), [focales](qa/t3-accesos-correccion-2026-11-06/runtime-focales.json), [lint](qa/t3-accesos-correccion-2026-11-06/runtime-lint.json) y [build](qa/t3-accesos-correccion-2026-11-06/runtime-build.json). Esto acredita Node 24.19.0 para los comandos de este corte, sin cambiar el registro histórico.

| Comando/entorno | Resultado |
|---|---|
| `TMPDIR=/private/tmp npm run test -- src/modules/recolecciones/RecoleccionesScreen.test.tsx src/modules/vivero/screens/ViveroMaterialScreen.test.tsx --maxWorkers=2` | **2 archivos / 10 casos focales**, aprobados. |
| `TMPDIR=/private/tmp npm run test -- --maxWorkers=2` | **91 archivos / 1.251 pruebas**, aprobados. |
| `TMPDIR=/private/tmp npm run lint` | Aprobado. |
| `TMPDIR=/private/tmp npm run build` | TypeScript, Vite y service worker aprobados. Sin script `typecheck` separado; aviso conocido del chunk MapLibre conservado. |
| `git diff --check` y `node --check scripts/qa/t3-access-browser.cjs` | Aprobados. |
| Chrome, PWA real y API HTTP sintética local | **60 comprobaciones y 13 capturas**, sin errores de página; incluye Inicio/barra/Volver, lectura tras DESECHO incierto, fallo de esa lectura y reintento. |

Backend no se modificó en este corte y no se repitieron sus suites; el [corte anterior](evidencia/t3-validacion-2026-11-05.json) conserva build, 88 suites/1.256 unitarios y checks OpenAPI. El coordinador informó haber repetido esos mismos checks de la base recibida; no se presentan como una nueva ejecución del implementador. No se ejecutó SQL/HTTP/PostGIS real ni se modificaron dependencias.

## Evidencia y reproducción

[Resultados, peticiones y medidas](qa/t3-accesos-correccion-2026-11-06/resultados.json), [revisión desde Inicio](qa/t3-accesos-correccion-2026-11-06/revision-desde-inicio-sin-m1-1280.png), [revisión desde la barra](qa/t3-accesos-correccion-2026-11-06/revision-desde-menu-sin-m1-390.png), [consulta de material en curso](qa/t3-accesos-correccion-2026-11-06/material-consulta-pendiente-390.png), [material tras una consulta](qa/t3-accesos-correccion-2026-11-06/material-observado-390.png), [material tras fallo y reintento](qa/t3-accesos-correccion-2026-11-06/material-recuperado-1280.png).

Se inspeccionaron visualmente las capturas focales de revisión móvil y material móvil/escritorio. Los resultados incluyen medidas de ancho en 320/390/1280 px. Pruebas/lint/build: Node 24.19.0 (`/Users/pabloandresfernandezcari/.nvm/versions/node/v24.19.0/bin/node`) y npm 12.0.2. El driver de navegador registra por separado Node 24.19.0, Chrome 156.0.8078.80 y Playwright 1.64.1 en `resultados.json`; no se atribuyen a este corte las versiones usadas por la comprobación independiente del coordinador.

```sh
export PATH="/Users/pabloandresfernandezcari/.nvm/versions/node/v24.19.0/bin:$PATH"
VITE_API_URL=http://127.0.0.1:3342 TMPDIR=/private/tmp npm run dev -- --host 127.0.0.1 --port 5192 --strictPort
```

En otra terminal:

```sh
export PATH="/Users/pabloandresfernandezcari/.nvm/versions/node/v24.19.0/bin:$PATH"
T3_QA_API_PORT=3342 T3_QA_PWA=http://127.0.0.1:5192 PLAYWRIGHT_MODULE_PATH=/ruta/al/paquete/playwright T3_QA_CHROMIUM=/ruta/al/binario/chrome node scripts/qa/t3-access-browser.cjs
```

El runner guarda este corte en una carpeta nueva, inicia y cierra su API desechable y bloquea hosts externos. Perfiles, capacidades, 403, recibos y saldos se simulan; no acredita JWT/RPC/Storage, WebAuthn, autorización desplegada o idempotencia durable de operaciones físicas. AUD-007 y el corte externo de AUD-034 conservan sus pendientes. La comprobación coordinadora está cerrada; el cotejo y corte externos siguen pendientes.
