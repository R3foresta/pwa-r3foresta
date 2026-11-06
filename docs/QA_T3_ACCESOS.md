# T3 · Administración de accesos M1/M2

Entrega local del **5 de noviembre de 2026**, pendiente de revisión del chat coordinador. Sin commit de entrega, push ni despliegue; T4/T5 no se iniciaron.

**Corte posterior:** [correcciones de la revisión coordinadora del 6 de noviembre](QA_T3_CORRECCION_2026-11-06.md), con entrada/regreso del revisor sin M1 y consulta única tras DESECHO incierto. Los números, huellas y capturas de esta entrega del 5 se conservan como antecedente.

## Bases y fuentes

- PWA `dbcedc51eac388045a5d383d6a326e241c40b312`, árbol limpio comprobado antes de editar.
- Backend `6f59263c349c664c15893528df1c129a7d25ef0d` **más el árbol local T1/T2 revisado y sus correcciones**, conservado. No partir sólo de HEAD.
- [Ficha canónica T3](../../Backend-r3foresta/documentacion/tareas/t3-administracion-accesos.md), [contrato M1 histórico](../../Backend-r3foresta/docs/t1-acceso-recoleccion.md), [contrato M2 vigente](../../Backend-r3foresta/docs/t2-acceso-viveros.md) y [revisión coordinadora T2](../../Backend-r3foresta/docs/evidencia/t2-revision-coordinadora-2026-11-05.json). Se cotejaron los controllers/DTOs, Swagger/OpenAPI y la proyección de orígenes de 095.
- [Base y huellas previas](evidencia/t3-base-2026-11-05.json), [base documental](evidencia/t3-documentacion-base-2026-11-05.json), [validación, archivos y huellas finales](evidencia/t3-validacion-2026-11-05.json). El manifest final distingue los cambios T3 de todo el árbol ajeno del backend.

## Resultado

`/app/usuarios` conserva búsqueda, selección, paginación, foco y cambio de rol. La cuenta seleccionada añade acceso M1 y viveros M2, estado explícito/efectivo, autoridad ADMIN derivada, vigencias conservadas y motivos de historia paginada. La consulta por ID permite localizar una cuenta inactiva conocida usando la autoridad existente; no amplía el directorio.

Cada otorgamiento/retiro tiene motivo y confirmación con cuenta, operación y vivero. Usa exclusivamente el endpoint del dominio y su revisión; M2 versiona el conjunto de viveros del destino. No hay guardado combinado, flags globales M2, cargos nuevos ni cambios de permisos M3. GENERAL/VALIDADOR activos son destinos elegibles; ADMIN/VOLUNTARIO/inactivos admiten el retiro de vigencias conservadas.

| Contrato consumido | Uso |
|---|---|
| `GET /api/v1/me/acceso-recoleccion` / `me/acceso-viveros` | Capacidades propias independientes por operación y vivero. |
| `GET /api/v1/usuarios/:id/acceso-recoleccion` / `acceso-viveros` | Lectura ADMIN del destino e historia con `antes_de_id`/`limite`. |
| `POST /api/v1/usuarios/:id/acceso-recoleccion/{otorgamientos,retiros}` | Comando M1 con UUID, motivo y revisión M1. |
| `POST /api/v1/usuarios/:id/acceso-viveros/{otorgamientos,retiros}` | Comando M2 con vivero exacto y revisión del conjunto. |
| `GET /api/v1/{recoleccion,vivero}/accesos/comandos/:uuid` | Recuperación propia aunque el actor haya perdido ADMIN. |
| `GET /api/v1/vivero/origenes?vivero_id=…` | Proyección mínima paginada; sin ficha/fotos M1 ajenas. |
| `GET /api/viveros` | Catálogo público; no concede acceso. |
| Rutas existentes de eventos/evidencias/DESECHO/equipo | Compatibilidad operativa mínima, sin nuevos endpoints. |

`src/modules/accesos/` mantiene DTOs propios, validación runtime, lectura por identidad y comandos M1/M2. Comparte transporte, `CommandLifecycle` y Web Locks existentes. Slots separados por actor/dominio y separados del rol/participación. 503/timeout/202 conservan la intención original; un terminal validado libera el slot. Un 409 durable exige releer y confirmar otra intención con UUID nuevo. El recibo histórico no sustituye una lectura actual de efectividad.

Navegación, URL directa y acciones M1/M2 dependen del servidor. M1 mantiene lo propio; VALIDADOR puede revisar su vivero sin M1; ninguna cuenta aprueba lo propio. DESECHO depende del vivero de almacenamiento y tiene una entrada desde Vivero para el operario sin M1. La revisión documental se diferencia expresamente de recepción física.

INICIO selecciona material mínimo del vivero y envía ese `vivero_id` exacto al subir fotos. Cambiar vivero invalida sus evidencias preparadas; una carga tardía tras cambiar cuenta/desmontar no dispara el alta. La entrega física usa evidencia DESPACHO del lote. Entrega/devolución mantienen la intersección M2 y COORDINADOR M3, salvo ADMIN. Plantación conserva sus capacidades y su consumo independiente; Impacto y las APIs públicas de Banco de semillas no reciben guards M1/M2 nuevos.

## Correcciones mínimas de backend

El cotejo de código encontró tres lecturas legadas que podían redondear IDs antes de usarlos en T3. Se corrigieron con casts PostgREST a texto y mapeo exacto:

1. `GET /api/viveros`: `id::text`, para elegir viveros BIGINT vecinos.
2. Listado/detalle de lotes: `vivero_id::text` y `vivero.id::text`, sin `Number` en el campo que usa la autorización visual por establecimiento.
3. Lectura de equipo: `usuario_id::text` y mapeo exacto para comprobar COORDINADOR sin confundir cuentas vecinas.

Se añadieron cuatro regresiones unitarias. [Complemento backend](../../Backend-r3foresta/docs/t3-proyecciones-compatibilidad.md). No se modificaron SQL, guards, RPCs, DTO cerrado de Participación ni evidencias históricas. Las cuatro migraciones 092–095 conservan sus SHA-256 previos, incluidas 094/095 congeladas.

La comprobación logística usa `getSubcampaniaEquipoExacto`; el adaptador del editor M3 legado conserva números únicamente después de comprobar que son seguros. Una cuenta fuera de ese rango no se redondea para editar equipo. Esta entrega no migra globalmente los contratos operativos legados.

## Verificación ejecutada

Node **24.19.0**, npm **12.0.2**. No existe script `typecheck`; `npm run build` incluye `tsc -b`.

| Comando/entorno | Resultado |
|---|---|
| PWA: `TMPDIR=/private/tmp npm run test -- --maxWorkers=2` | **89 archivos / 1.241 pruebas**, aprobados. Incluye regresión de rol/último ADMIN, M3 e Impacto y pruebas nuevas de contratos, comandos, identidad, revisión, orígenes, fotos y logística. |
| PWA: `TMPDIR=/private/tmp npm run lint` | Aprobado. |
| PWA: `TMPDIR=/private/tmp npm run build` | TypeScript, Vite y service worker aprobados. Conserva el aviso de tamaño del chunk MapLibre. |
| `git diff --check` | Aprobado. |
| Backend: `npm run build` | Aprobado. |
| Backend: `npm run test:unit -- --runInBand` | **88 suites / 1.256 pruebas**, aprobados. |
| Backend: checks OpenAPI T2, T1 y Participación | Coinciden: **36 rutas**, **5 rutas**, **41 rutas / 86 schemas**, respectivamente. |
| Chrome con API HTTP sintética local | **40 comprobaciones**, ocho capturas, sin errores de página; 320/390/1280 px sin desborde en las vistas medidas. |

Las nuevas pruebas cubren slots M1/M2 independientes, doble envío, locks entre instancias, almacenamiento bloqueado/dañado, UUID/revisión exactos, rechazo y nueva confirmación, 503/202, recuperación al recargar, StrictMode, sesión vencida, cambio de cuenta/logout y respuestas tardías. Cubren los viveros `9007199254740992`/`9007199254740993`, ausencia de permiso por autoría, veto de aprobación propia, cuenta inactiva/inelegible, historia paginada y lectura logística exacta.

## Navegador y reproducción

[Resultados y peticiones](qa/t3-accesos/resultados.json), [cuenta a 320 px](qa/t3-accesos/cuenta-320.png), [escritorio](qa/t3-accesos/cuenta-1280.png), [incertidumbre](qa/t3-accesos/resultado-incierto-390.png), [recuperación sin ADMIN](qa/t3-accesos/recuperacion-sin-admin-390.png), [material M2](qa/t3-accesos/material-m2-390.png), [revisión sin M1](qa/t3-accesos/revision-sin-m1-1280.png). Inspección visual adicional de las capturas de cuenta móvil/escritorio, material y revisión; las otras medidas son programáticas.

En una terminal local:

```sh
VITE_API_URL=http://127.0.0.1:3339 TMPDIR=/private/tmp npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
```

En otra terminal, con Playwright disponible fuera de las dependencias del proyecto:

```sh
PLAYWRIGHT_MODULE_PATH=/ruta/al/paquete/playwright T3_QA_CHROMIUM=/ruta/al/binario/chrome node scripts/qa/t3-access-browser.cjs
```

El runner abre una API HTTP efímera en `127.0.0.1:3339`, crea contextos Chrome separados y bloquea hosts externos. Al finalizar cierra navegador/conexiones/API. No lee `.env` del backend ni usa JWT, personas, Storage o RPC reales. El registro de red omite tokens/headers privados. La fixture reproduce revisiones/recibos y saldos sólo para probar UI; no acredita las garantías SQL de T1/T2.

## Límites y revisión pendiente

- Falta revisión coordinadora, aceptación humana/dispositivo y cotejo/corte del cliente y backend en el entorno autorizado. La aplicación hasta 095 reportada en T2 no acredita este cliente ni sus proyecciones desplegadas.
- No se ejecutaron SQL remoto ni pruebas contra servicios/personas reales. No se repitió la suite SQL/HTTP/PostGIS de T2: las correcciones de esta entrega son sólo proyecciones. Build/unitarios/OpenAPI backend están separados del QA HTTP simulado de la PWA. No se acredita lint global backend.
- WebAuthn, Storage/URLs legadas, Pinata/blockchain y condiciones de campo conservan sus límites previos. Las operaciones físicas siguen sin recuperación durable (AUD-007); ante incertidumbre se relee, sin reenvío automático.
- T4 (recepción/acción conjunta) y T5 (plantas externas/saldo inicial), SQL remoto, commit de entrega, push y despliegue quedan fuera. [AUD-034](../FRONTEND_AUDIT.md) mantiene el corte externo pendiente.
