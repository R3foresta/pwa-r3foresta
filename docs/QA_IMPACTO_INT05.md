# INT05 — Impacto público y Mis registros

**Corte de pruebas: 18 de octubre de 2026. FE01–FE06 implementadas y verificadas en alcance técnico local.** El ensayo original usó PWA en árbol sobre `6a2c955` y backend en árbol sobre `10e5dc5`, SQL 081 y OpenAPI 1.3.0.

**Consolidación local del 19 de octubre:** revisión independiente sin defectos bloqueantes; las 50 huellas PWA y las seis referencias backend de [versiones.json](qa/pa-int05/versiones.json) coinciden con las fuentes entregadas. Los seis informes suman 111 comprobaciones y no registran errores JavaScript. El manifest original se conserva intacto; los ajustes posteriores de este informe son documentales y no representan pruebas nuevas. [Versiones de entrega y pendientes](../../r3foresta-docs/ESTADO.md). Push, SQL remoto, despliegue y piloto permanecen pendientes.

Historia verificada: visitante → global/campaña/subcampaña/registro → API pública → hechos SQL 081 y foto sanitizada; cuenta verificada → lista propia por autoría/participación histórica → detalle permitido. Las acciones operativas conservan INT04/INT06.

Fuentes: [contrato backend](../../Backend-r3foresta/docs/pa-int05-contrato.md), [entrega/entorno](../../Backend-r3foresta/docs/pa-int05-entrega-local.md), [ejemplos HTTP](../../Backend-r3foresta/docs/pa-int05-ejemplos.json), [ficha](../../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/pa-t-int05.md) y [módulo](../src/modules/impacto/README.md). El [cotejo previo](PREPARACION_IMPACTO_INT05.md) conserva el diagnóstico anterior a la entrega backend, no el estado actual.

## Entrega por tarea

| Tarea | Resultado local |
| --- | --- |
| FE01 | DTO/validación estricta para cinco lecturas, BIGINT como cadenas, allowlist de campos, filtros/URLs/paginación y fixtures HTTP reales sintéticos. Público sin token/cookies; propio con Bearer, sin exigir capacidades. |
| FE02 | Global/campaña/subcampaña fuera de guards privados; mapa lazy con zonas/puntos, selección en misma vista, listas accesibles, filtros URL y retorno con contexto. Carga/vacío/error/404 separados. |
| FE03 | Detalle público compartible: cantidades grupales, especies, GPS, personas/afiliaciones históricas, organizaciones de campaña separadas, fotos elegibles e historial fechado. Inicial/meta/faltantes separados de seguimiento; avance 125%. |
| FE04 | Lista propia paginada/deduplicada con «Registré»/«Participé», resultados tras retiro y destinos propios/públicos separados. Cambio de cuenta/token oculta datos previos; participante no recibe observaciones del autor. |
| FE05 | Solo `/` aplica última campaña por cuenta, revalidada con capacidades completas y campaña pública. Enlaces directos conservan destino. Error de capacidades no equivale a revocación. Registro/gestión/recuperación conservados. |
| FE06 | **111 comprobaciones integradas/SQL:** Impacto 31, registro 30, reposición 18, acceso 20, sesión 8 y recibos 4. Capturas, versiones, reproducción y límites documentados. |

## Rutas y comportamiento

| Ruta PWA | Audiencia |
| --- | --- |
| `/` | Global inmediato; cuenta interna verificada conserva `/app/home`; participante usa última campaña pública con habilitación contextual vigente. |
| `/impacto` | Global público explícito, sin aplicar preferencia ni esperar perfil/capacidades. |
| `/impacto/campanias/:campaniaId` | Campaña pública directa. |
| `/impacto/subcampanias/:subcampaniaId` | Subcampaña pública, meta/avance y registros. |
| `/impacto/registros/:registroId` | Registro público compartible, sin query de filtros. |
| `/app/participacion/mis-registros` | Lista propia autenticada. |
| `/app/participacion/registros/:registroId` | Detalle histórico propio existente; retorno a la lista. |

Solo se pagina la lista pública: mapa/indicadores representan todo el alcance filtrado y no se suman por página. Si cambia el conjunto de IDs, se retiran filas que perdieron elegibilidad y se ofrece actualizar alcance/lista. La cancelación e identidad de cada transición impiden restaurar resultados anteriores al volver A → B → A.

La organización filtra campañas asociadas; la especie selecciona grupos completos. Fechas reducen hechos conservando meta vigente, con etiquetas explícitas. No se agregan faltantes globales ni se reparte crédito individual. Sugerencias de organización/especie proceden de registros cargados y permiten ID explícito; el contrato no entrega catálogos públicos completos.

Detalle propio usa Bearer directamente, validando al actor en el DTO y descartando token cambiado. Los comandos/recuperaciones conservan su verificación existente mediante capacidades.401/403 de lectura propia ofrecen recuperar sesión.

## Comprobaciones ejecutadas

| Comando | Resultado y evidencia |
| --- | --- |
| `TMPDIR=/private/tmp npm run test -- --maxWorkers=2` | **48 suites / 691 pruebas aprobadas.** |
| `npm run lint` | Correcto. |
| `TMPDIR=/private/tmp npm run build` | TypeScript, Vite y Workbox/PWA correctos; 130 entradas de precache. No existe script `typecheck`. |
| `node scripts/qa/pa-int05-browser.cjs` | **31 checks**, cero errores JavaScript; RPC/HTTP coincidentes y hechos sin cambios tras consultar. [Resultados](qa/pa-int05/resultados.json). |
| `node scripts/qa/pa-int04-reposicion.cjs` contra 3305 | **18 checks**. [Resultado](qa/pa-int05/regresion-reposicion/reposicion.json). |
| `node scripts/qa/pa-int04-browser.cjs` contra 3305 después de reposición | **30 checks**, cinco comandos cotejados en SQL: un registro/consumo/foto por confirmado; rechazos sin efectos parciales. [Resultado](qa/pa-int05/regresion-int04/resultados.json). |
| `node scripts/qa/pa-int06-browser.cjs` contra 3304 | **20 checks**, nueve comandos, cero errores JavaScript. [Resultado](qa/pa-int05/regresion-int06/resultados.json). |
| `node scripts/qa/pa-int06-session-browser.cjs` contra 3304 | **8 checks**, sin POST de acceso, cero errores JavaScript. [Sesión](qa/pa-int05/regresion-int06/session.json). |
| `python3 scripts/qa/pa-int06-db.py --socket … --evidence … --output …` | **4 cotejos READ ONLY**, nueve recibos durables con eventos correspondientes, sin duplicación. [SQL](qa/pa-int05/regresion-int06/db.json). |
| `git diff --check` y revisión de enlaces | Resultados y huellas en [versiones](qa/pa-int05/versiones.json). |

Tests/Workbox inicialmente encontraron `EPERM` en el TMPDIR heredado fuera del sandbox; se usó `/private/tmp` sin cambiar scripts. Una corrida concurrente agotó los 5 s de una prueba existente INT04; la corrida completa con dos workers aprobó las 691. El runner de navegador se corrigió para usar la fecha real del dataset y esperar revalidación antes de comprobar la preferencia; no se alteraron datos para cumplir esas expectativas.

## Cobertura PA-S02 y límites

| Casos | Evidencia local |
| --- | --- |
| CA01/12/14/15/22/23/24 | Incógnito y VOLUNTARIO ajeno abren todos los niveles; sesión vencida/fallo de capacidades no bloquean. Sin Bearer público, global 50/campañas 30 y 20, sin stock/equipo. |
| CA02/04/10 | Selección/retorno conserva filtro; zona de trabajo y punto grupal; vacío filtrado distinto de 503/falta de permiso. Filtros/cancelación y listas accesibles. |
| CA03/07/08/09/13/16 | Grupos antes de uniones, relación doble deduplicada,125%, faltantes y seguimiento separado; snapshots y organizaciones distintos. Contrato/etiquetas no convierten PWA en fuente de saldo. |
| CA05/06/20/21 | Autor retirado/participante conservan resultados; privado ajeno404 y participante sin observaciones. Historia no se reconstruye desde perfil. Cambio de cuenta y respuestas tardías cubiertos. |
| CA11 | Público no llama GET /plan técnico. Se conserva su autenticación, acreditada en backend INT05/regresión previa; no se abre ese endpoint desde frontend. |
| CA17 | Foto 900050 carga y devuelve JPEG sin EXIF; pendiente 900051 da 404. DTO rechaza observaciones/contactos/bucket/originales. No acredita Storage/CDN remoto. |
| CA18/19 | Preferencia por actor revalidada, ausencia confirmada lleva a global, error no declara revocación. Enlace 801 conserva destino pese a preferencia 800. |

Se inspeccionaron [global móvil](qa/pa-int05/global-mobile.png), [escritorio](qa/pa-int05/global-desktop.png), [registro público](qa/pa-int05/registro-mobile.png) y [lista propia](qa/pa-int05/mis-registros-mobile.png), sin desbordamiento horizontal. La revisión técnica no sustituye revisión humana de UX ni campo.

## Reproducción

Dependencias existentes, Playwright/Chrome disponibles y fixtures desechables. Runners restringen URLs/sockets a localhost y exigen sesiones sintéticas; no guardar tokens en Git. El único adaptador es el perfil de arranque, contrastado contra capacidades reales del mismo JWT: no se ensaya WebAuthn.

1. Backend: `npm run preview:impacto -- --pg-bin /ruta/runtime-postgis/bin`. Solo un fixture 3305; no carga `.env` ni usa Supabase. Registrar socket privado de esa ejecución.
2. PWA: `VITE_API_URL=http://127.0.0.1:3305 TMPDIR=/private/tmp npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.
3. Runner INT05 con `PA_QA_API=http://127.0.0.1:3305`, `PA_QA_PWA=http://127.0.0.1:5175`, `PA_QA_SOCKET=/private/tmp/pa-int03a-<ejecucion>/socket` y `PA_QA_PSQL=/ruta/runtime-postgis/bin/psql`. `PLAYWRIGHT_MODULE_PATH`/`PA_QA_CHROMIUM` admiten módulos/binarios ya instalados. Primero consultar la base 50 sin mutaciones.
4. Con ese entorno, ejecutar reposición y después registro INT04, con `PA_QA_OUTPUT` distintos. Esas regresiones escriben en el fixture: cambian indicadores y retiran permisos. Reiniciar un fixture propio y recuperar sesiones nuevas antes de repetir desde base 50.
5. INT06: backend `npm run preview:participacion -- --port 3304 --origin http://127.0.0.1:5176`, con PostgreSQL en PATH; otra PWA con API 3304/puerto 5176. Ejecutar ambos runners y cotejo SQL con socket privado. [Guía original](QA_GESTION_ACCESOS_INT06.md#reproducción-local).
6. Guardar versiones/evidencia y detener fixtures propios; Ctrl+C limpia clústeres/objetos. El fixture INT05 recibido de backend mantiene su ciclo de vida separado.

Pendientes fuera del cierre local: push, cotejo/aplicación remotos 081 y antecedentes, Storage/URLs/CDN históricos remotos, WebAuthn real, revisión humana de UX, entorno externo, carga masiva, despliegue/corte y piloto INT08. No cierra PA-F01 ni el QA completo de sus tareas padre. No se modificó backend ni se aplicó SQL remoto en este chat.
