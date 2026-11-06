# T4 · Recepción de semillas y «Recibir y validar»

**6 de noviembre de 2026 · implementación y QA locales; revisión coordinadora pendiente.**
Bases: PWA `fc48be2d1c317d004fd88fd0f4ca009a1c9cb47d` y Backend
`032527a342d5e696e3cb15e5903355d04a91560a`, más el árbol de esta entrega.
[Contrato, API y transición](../../Backend-r3foresta/docs/t4-recepcion-semillas.md),
[huellas/bases/verificación](../../Backend-r3foresta/docs/evidencia/t4-validacion-2026-11-06.json),
[SQL/HTTP/PostGIS aislados](../../Backend-r3foresta/docs/evidencia/t4-recepcion-local-2026-11-06.json).
Sin commit de entrega, push, SQL remoto, corte, despliegue ni T5.

## Recorrido implementado

Desde Vivero, «Recibir y validar material» abre `/app/recepciones-semillas` y su
detalle `/:id`. GENERAL/VALIDADOR con solo M2 pueden consultar la cola, el detalle
mínimo y evidencia autorizada, y confirmar material de otro recolector en su vivero.
No se carga la ficha privada M1 ajena ni se concede M1. ADMIN conserva alcance
global y la prohibición de autorrecepción. Las capacidades cerradas T3/M3 conservan
su forma; recepción deriva de M2 `operar` y de la capacidad por objeto de la API.

Cantidad/unidad/fecha física/fotos se confirman explícitamente. La recepción
conforme valida y conserva el saldo inicial M1. Una diferencia registra incidencia
sin aprobación, consumo ni desecho. La resolución exige nueva comprobación total
conforme, motivo y evidencia nueva, conservando lo observado. El legado VALIDADO
se muestra como aprobación documental; los casos con movimientos/saldo previo o
fecha fuera de ventana se bloquean para conciliación, sin backfill ficticio.
El detalle M1 muestra recepción física por separado y solo ofrece DESECHO con
recepción conforme. M3 y sus asignaciones conservan su ruta independiente.

La intención queda guardada por actor antes del POST, con UUID y revisión BIGINT
exactos. Ante incertidumbre se conserva y se ofrece recuperar el mismo comando.
202 no prueba rollback. Reenviar requiere confirmación explícita de la misma
intención; nunca hay reenvío automático. La recuperación propia sigue disponible
al perder M2 o el rol interno; el guard permite esa pantalla y esta niega nuevas
operaciones sin capacidad vigente. Datos de otra cuenta o respuestas obsoletas no
se usan como resultado propio. Un fallo del almacenamiento local bloquea el envío.

## Verificación ejecutada

Node **24.19.0**, npm **12.0.2**, TypeScript **5.9.3**. React19.2.0,
Vite7.3.6, Vitest5.0.2 y jsdom30.1.1. No se modificaron dependencias/lockfiles. Los [metadatos finales por comando](../../Backend-r3foresta/docs/qa/t4-recepcion-2026-11-06/) registran el binario Node24.19 real en tests, build, lint, SQL/HTTP y navegador.

| Comprobación | Resultado |
|---|---|
| `npm run test -- --maxWorkers=2` | 92 archivos / **1.263 pruebas** aprobadas. |
| Focales recepción/detalle M1/guard de participante | 3 archivos / 38 pruebas aprobadas; incluidas después en la suite completa final. |
| `npm run lint` | Aprobado. |
| `npm run build` | TypeScript, Vite y service worker aprobados. Aviso conocido de chunk MapLibre >1000 KB. No existe script separado `typecheck`. |
| `git diff --check` / sintaxis del runner | Aprobados. |
| Chrome156.0.8078.80 + Playwright1.64.1 | **28 comprobaciones**, 10 capturas, sin errores de página/API sintética ni desbordes en 320/390/1280 px. |
| Backend | Build, 89 suites/1.268 unitarios, 69 grupos SQL, 8 carreras observadas y 7 HTTP/JWT reales aprobados; ver evidencia enlazada. |

Se inspeccionaron visualmente [incidencia móvil](qa/t4-recepcion-2026-11-06/incidencia-390.png)
y [confirmación de escritorio](qa/t4-recepcion-2026-11-06/confirmacion-1280.png).
El [resultado de navegador](qa/t4-recepcion-2026-11-06/resultados.json) registra
peticiones sintéticas, intenciones, versiones, capturas y medidas. Comprueba entrada
real desde Vivero, cancelar sin escribir, recepción, incidencia/resolución,
autorrecepción, otro vivero, conciliación histórica, solo M1/VOLUNTARIO,
503/202 y recuperación tras perder M2/rol sin duplicar el POST.

Para reproducir, usar API/PWA locales exclusivamente y fijar Node24.19:

```sh
export PATH="/Users/pabloandresfernandezcari/.nvm/versions/node/v24.19.0/bin:$PATH"
```

```sh
VITE_API_URL=http://127.0.0.1:3344 TMPDIR=/private/tmp npm run dev -- --host 127.0.0.1 --port 5194 --strictPort
```

```sh
PLAYWRIGHT_MODULE_PATH=/ruta/al/paquete/playwright T4_QA_PWA=http://127.0.0.1:5194 T4_QA_API_PORT=3344 T4_QA_CHROMIUM=/ruta/al/chrome node scripts/qa/t4-recepcion-browser.cjs
```

## Límites y conservación

La QA de navegador usa PWA real y **API HTTP sintética**: cuentas, JWT, permisos,
recibos, Storage y saldos están simulados; se bloquean hosts externos. La evidencia
Backend ejecuta aparte PostgreSQL14.24/PostGIS3.2.10, RPC y JWT/HTTP reales sobre
antecedentes mínimos aislados; Storage/Pinata/blockchain están sustituidos o no
se ejecutan. No acredita replay completo001–096, Supabase/RLS/Storage remotos,
WebAuthn real, aceptación humana o despliegue.

El nuevo comando no llama Pinata/mint y devuelve anclaje externo pendiente. Las
cargas multipart siguen fuera de SQL, sin recuperación durable propia; una respuesta
perdida puede dejar cargas pendientes sin vínculo. Las URLs públicas del bucket
legado mantienen audiencia. No hay corrección documental de faltantes ni recepción
parcial; los legados con movimientos requieren procedimiento de conciliación antes
del corte. Aplicación/cotejo096 y coordinación del cliente siguen pendientes.

Se conservaron por SHA-256 los cambios preexistentes de
`RecoleccionFormDatosScreen.tsx` y `recoleccionFormTypes.ts`, los documentos del
encargo y 092–095. No se reescribieron evidencias anteriores. Archivos y huellas de
esta entrega están en el manifest enlazado; T5 permanece fuera de alcance.
