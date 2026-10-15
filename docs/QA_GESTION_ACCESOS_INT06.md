# PA-T-INT06 — Gestión de accesos: implementación y QA local

**Corte:** 15 de octubre de 2026, America/La_Paz. **Resultado:** FE01–FE05 implementadas/verificadas localmente; FE06 parcial. La interfaz queda revisable, sin aceptación humana de UX ni publicación/despliegue acreditados. No completa PA-S00/PA-S03 ni habilita el piloto.

La gestión permite a una persona administradora elegir ámbitos actuales, localizar una cuenta registrada, revisar sus responsabilidades y confirmar un comando C04–C09. La pantalla sólo comunica éxito o rechazo después de validar el recibo. Conserva el comando original ante incertidumbre y recupera su resultado tras recarga o cambio de sesión.

## Versiones, entorno y límites

| Componente | Revisión y entorno comprobados |
| --- | --- |
| PWA | HEAD `cf13036526ba6279207d5f4b6c1ba6173907c7d5` más los cambios de esta entrega; React 19, TypeScript, Vite y npm existentes. |
| Backend | HEAD `57e5b7155270e0d83936175ef51d31575876ec11` más árbol B/C; [entrega C](../../Backend-r3foresta/docs/pa-int02c-entrega-local.md), OpenAPI y ejemplos reales cotejados. |
| Documentación | HEAD `89dfdb2aaf8d976acb84d5692122c58d8da00b6e` más árbol existente y actualización de INT06. |
| Integración | PWA `http://127.0.0.1:5173` → launcher C `http://127.0.0.1:3304` → PostgreSQL aislado por socket, sin Supabase ni personas reales. |
| Navegador | Chromium local, 390×844 y 1440×1000. Las huellas de migraciones están en [resultados](qa/pa-int06/resultados.json). |

El launcher de C no incluye WebAuthn ni el endpoint de perfil de arranque. El QA intercepta **solamente el perfil propio**, ligado al JWT sintético cuya identidad y actividad comprueba la API real de capacidades. Las lecturas de participación, los comandos, los recibos, los rechazos y los cambios de permisos usan guard, servicios, RPC y PostgreSQL reales. No se acredita una ceremonia WebAuthn física ni un entorno externo desplegado.

## Implementación entregada

- Ruta `/app/participacion/accesos` y entrada en ambos inicios, con capacidades compartidas por cuenta. Una responsabilidad contextual no abre Recolección, Vivero, catálogos o planificación interna. Las herramientas internas conservan su navegación existente.
- Cliente v1 con validación runtime estricta, IDs/revisiones como cadenas, Bearer, `no-store`, cancelación y timeout de 40 segundos incluyendo el body. Cotejado contra 13 ejemplos HTTP reales de C.
- Miembros paginados con presencia global deduplicada y logística mínima; búsqueda por nombre/correo exacto con afiliación opcional, homónimos y paginación. No devuelve un directorio de correos ni crea cuentas/invitaciones.
- Selector de una/varias/todas las subcampañas actuales, máximo 100. Confirmación explícita con persona, ámbitos, responsabilidades y revisiones; C09 muestra ambas personas y tratamiento del saliente. Cambiar la intención invalida la revisión, incluso al volver a una selección anterior.
- Un POST para toda la selección. Se conserva actor/operación/payload/UUID antes del envío en almacenamiento local por actor; Web Locks coordina pestañas. No hay claves nuevas por timeout ni reenvío silencioso con revisiones actualizadas.
- Recibos validados semánticamente contra el comando y su selección. Se distinguen CONFIRMADO, RECHAZADO e inconcluso; el recibo histórico no sustituye las lecturas vigentes. Hay recuperación por GET y reenvío idéntico, también tras recarga.
- La entrada de recuperación sigue disponible con un pendiente propio aunque ya no existan capacidades de gestión. Cambiar cuenta o cerrar sesión oculta los datos anteriores y conserva el comando para su actor original. Los cambios de token entre pestañas ocultan la pantalla hasta verificar el perfil nuevo.

Arquitectura y contrato de reutilización para INT04: [README del módulo](../src/modules/participacion/README.md) y `FRONTEND_GUIDE.md` §16.7. El motor de registro/evidencias debe extender las primitivas compartidas con sus contratos propios; el hook actual está tipado para acceso C04–C09.

## Verificación automatizada

| Comando ejecutado | Resultado |
| --- | --- |
| `TMPDIR=/private/tmp npm run test` | **32 archivos / 445 pruebas aprobadas**, incluida la regresión anterior y 98 pruebas de participación; ocho casos nuevos de sesión entre pestañas. |
| `TMPDIR=/private/tmp npm run lint` | Aprobado, sin errores ni warnings. |
| `TMPDIR=/private/tmp npm run build` | Aprobado: `tsc -b`, Vite y PWA; 108 entradas de precaché. No existe script `typecheck` independiente. |
| `git diff --check` | Aprobado. |

El service worker conserva únicamente precaché del shell/assets y la exclusión `/api`; no se añadió caché pública de capacidades, miembros, búsquedas o recibos.

## Navegador → API → DB

[Recorrido principal](qa/pa-int06/resultados.json): **20 comprobaciones, nueve comandos desde navegador, cero errores de ejecución**. Incluye sin permiso, plantador, logística sin permiso contextual, gestora propia/ajena y ADMIN global; ámbitos ACTIVA/BORRADOR y restricciones de cerradas/PAUSADA. Las respuestas privadas de gestora no descargan stock/equipos internos. El navegador prueba todas las operaciones C04–C09.

| Caso comprobado | Resultado y evidencia |
| --- | --- |
| Selección múltiple | Norte y Borrador reciben una sola intención/POST; cancelar el diálogo no escribe. [Confirmación móvil](qa/pa-int06/confirmacion-multiple-mobile.png). |
| Respuesta perdida después de commit | Se ejecuta el retiro real en dos ámbitos y se descarta sólo su respuesta. La pantalla queda inconclusa, bloquea otra intención y al recargar recupera por GET sin otro POST. [Inconcluso](qa/pa-int06/resultado-no-confirmado-mobile.png), [recuperado](qa/pa-int06/recuperado-mobile.png). |
| Continuidad | Retirar al único administrador devuelve RECHAZADO durable, sin cambios. Designar otro y cambiarlo a plantador conserva la administración restante. [Rechazo](qa/pa-int06/rechazo-ultimo-admin-desktop.png). |
| Reemplazo en cerrada | C09 designa al entrante y retira al saliente; el estado sigue COMPLETADA. [Resultado](qa/pa-int06/reemplazo-cerrada-desktop.png). |
| Autoridad global | C08 retira el permiso contextual de ADMIN global en Borrador; el recibo y la UI explican que conserva autoridad global. [Resultado](qa/pa-int06/retiro-conserva-global-desktop.png). |
| Revisión obsoleta | Una segunda intención cambia Norte después de revisar Norte/Borrador. La confirmación anterior rechaza todo el comando y Borrador conserva su revisión. [Rechazo múltiple](qa/pa-int06/rechazo-multiple-desktop.png). |
| Cuenta sin gestión | No monta miembros ni ofrece acciones administrativas. [Móvil](qa/pa-int06/sin-permiso-mobile.png). |

[Cotejo DB READ ONLY](qa/pa-int06/db.json): **cuatro comprobaciones** sobre los nueve UUID del navegador: siete CONFIRMADO, dos RECHAZADO y nueve eventos de cambio. Una fila durable por comando y un evento por ámbito con cambios; cero eventos para rechazos. El retiro cuya respuesta se perdió tiene dos ámbitos con revisiones `1 → 2`, sin duplicados. La intención concurrente introducida por el runner para provocar revisión obsoleta es una petición API adicional, distinta del comando rechazado del navegador.

[Prueba de sesión entre pestañas](qa/pa-int06/session.json): **ocho comprobaciones, sin POST de acceso y cero errores de ejecución**. Se prepara un comando local aún ausente del servidor; cambiar a otra cuenta oculta su identidad antes de recibir el perfil nuevo, no consulta ese comando con el Bearer nuevo y mantiene su almacenamiento. Volver al actor original reanuda el GET del mismo UUID; logout en otra pestaña oculta la pantalla privada. [Verificando cuenta](qa/pa-int06/cambio-cuenta-verificando-mobile.png), [cuenta nueva](qa/pa-int06/cambio-cuenta-confirmado-mobile.png).

Se inspeccionaron visualmente las capturas de confirmación, resultado inconcluso, rechazo y reemplazo. La comprobación de escritorio no encontró desbordamiento horizontal.

## Reproducción local

Se necesitan las dependencias existentes de ambos repositorios, los binarios PostgreSQL del launcher y Playwright/Chromium disponibles en el entorno de QA. No se agregó ninguna dependencia al proyecto.

1. Desde backend, iniciar una semilla limpia: `npm run preview:participacion -- --port 3304 --origin http://127.0.0.1:5173 --origin http://localhost:5173`. Reiniciarla antes de repetir el recorrido de escritura.
2. Desde PWA: `VITE_API_URL=http://127.0.0.1:3304 TMPDIR=/private/tmp npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.
3. Ejecutar `node scripts/qa/pa-int06-browser.cjs`; después `node scripts/qa/pa-int06-session-browser.cjs`. Si Playwright no está en la resolución habitual, indicar su ruta con `PLAYWRIGHT_MODULE_PATH`; `PA_QA_CHROMIUM` permite un ejecutable Chromium ya instalado. `PA_QA_API`, `PA_QA_PWA` y `PA_QA_OUTPUT` tienen defaults locales. Los runners rechazan destinos ajenos a localhost y exigen el marcador del fixture sintético; no guardan tokens.
4. Antes de detener el launcher: `python3 scripts/qa/pa-int06-db.py --socket /private/tmp/pa-int02c-preview-<directorio-de-esta-ejecucion>/socket`. El comando sólo admite su socket sintético y abre una transacción READ ONLY.

El entorno temporal de este chat quedó detenido y su PostgreSQL eliminado después de guardar la evidencia. Los tokens y la base sintética no se reutilizan entre ejecuciones. Los scripts de sesión no escriben permisos en DB.

## Pendientes de FE06

- INT02-D y las carreras/regresiones compartidas con registro, plan, stock, logística y cierre. La evidencia concurrente DB previa se enlaza a [C](../../Backend-r3foresta/docs/pa-int02c-entrega-local.md); no se sustituye por capturas.
- Recorrido participante de INT03-A/INT04 con registro/cargas/evidencias; Impacto/Mis registros de INT05, incluidos enlaces públicos en incógnito/sesión vencida y lectura propia tras retiro. Esta PWA todavía no tiene la ruta pública de Impacto; permanece en `AUD-020` y no se añadió un enlace ficticio.
- WebAuthn real, cuentas autorizadas del entorno externo, cotejo remoto de SQL/catálogo C/B y despliegue coordinado. Los ensayos locales no acreditan migración de personas reales.
- Revisión humana de las acciones/consecuencias y QA integrado de PA-T16/ENT06/INT08. Publicación Git, despliegue y decisión de piloto son estados separados.

No se modificaron reglas de Recolección/Vivero, contratos físicos de stock ni la UI de rol/baja global.
