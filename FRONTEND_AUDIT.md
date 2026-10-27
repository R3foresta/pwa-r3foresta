# Auditoría y pendientes del frontend

Corte: 20 de octubre de 2026. Lista única de deuda frontend. No sustituye el [tablero global](../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/README.md) ni acredita estado del backend desplegado.

El [histórico de auditoría](docs/archivo/FRONTEND_AUDIT_2026-10-15.md) conserva diagnósticos, cierres y resultados anteriores. Se retiraron de esta entrada los checklists repetidos y diagnósticos de módulos que ya no describían su implementación. Un hallazgo abierto se mantiene pendiente hasta verificar su cierre; este ajuste documental no lo resuelve por sí solo.

## Estado comprobado y prioridad

Entrega INT06 publicada en PWA `62f55dc`: 32 suites/445 tests, lint y build/TypeScript/PWA aprobados; 20 comprobaciones del recorrido de acceso, ocho de sesión entre pestañas y cotejo de nueve comandos/historial en PostgreSQL sintético. [Informe y límites](docs/QA_GESTION_ACCESOS_INT06.md). No extrapolar esa evidencia a WebAuthn real, otros eventos o despliegue.

| Prioridad | ID | Estado | Qué falta |
| --- | --- | --- | --- |
| Media | AUD-025 | PENDIENTE · QA de campo | Verificar Liberty en los mapas operativos con dispositivos reales y conectividad variable; comprobar WebGL2, carga, atribución y manejo de fallo del fondo. |
| Alta | AUD-024 | CERRADO en localhost | Lectura de Equipo verificada con VOLUNTARIO/PLANTADOR y Supabase real; publicación externa se sigue en AUD-021. |
| Media | AUD-023 | PENDIENTE · aceptación UX | Impacto recompuesto con componentes existentes; completar revisión humana del recorrido público/participante y verificación externa. |
| Alta | AUD-022 | PENDIENTE · contrato INT07 | Coordinar schemas cerrados, catálogo de comandos y lecturas por audiencia al recibir APIs verificadas, ejemplos y fixture. Cotejo/bocetos preparados; FE01–FE08 pendientes. |
| Alta | AUD-021 | PENDIENTE externo | WebAuthn real, entorno externo y QA completo del incremento; Impacto/registro/acceso ya verificados localmente. |
| Alta | AUD-020 | CERRADO local | Impacto público/Mis registros implementados con proyecciones INT05 y verificación sintética; evidencia externa en AUD-021. |
| Crítica | AUD-013 | PENDIENTE de verificación externa | Acreditar la publicación/regresión de identidad y autoridad corregidas en backend. |
| Alta | AUD-007 | BLOQUEADO en eventos físicos | Idempotencia durable/recuperación de operaciones de Vivero; C04–C09 ya tienen su propio contrato. |
| Alta | AUD-015 | PENDIENTE | QA del editor de plan con backend/migraciones 062/063 coordinados. |
| Media | AUD-016 | PENDIENTE | Reconciliar encabezado del detalle tras cierre concurrente. |
| Media | AUD-018 | PENDIENTE | Guarda ADMIN de todos los pasos del asistente de subcampaña. |
| Media | AUD-014 | PENDIENTE de reevaluación | Confirmar alertas de dependencias y planificar migración compatible. |
| Baja | AUD-004 | PENDIENTE | Revisar duplicación de formatters de fecha/zona horaria. |
| Baja | AUD-005 | PENDIENTE | Revisar tipos de campaña duplicados conservando orden visual. |

El orden de ejecución entre repositorios se decide en el tablero oficial; esta tabla prioriza riesgos de frontend, no introduce nuevas dependencias de producto.

## Pendientes y criterio de cierre

### AUD-025 — Base vectorial Liberty en mapas operativos

26 de octubre: Impacto y los seis mapas Leaflet usan OpenFreeMap Liberty. Una vista local con geometría sintética mostró calles, etiquetas, superposiciones y atribución en ambos motores; la suite, lint y build pasaron. La revisión posterior encontró que un fallo al crear WebGL dejaba una capa parcialmente registrada y podía desmontar la pantalla operativa. `OpenFreeMapBaseLayer` ahora captura ese fallo, retira la capa incompleta mediante el ciclo de vida público de Leaflet y muestra un aviso conservando puntos, polígonos y formulario. Los errores de carga y la pérdida/restauración del contexto también actualizan el aviso; reintentar reemplaza sólo la base. Los minimapas pasivos muestran un aviso breve sin anidar un botón de reintento. Falta comprobar rendimiento, gestos y carga o fallo del estilo en teléfonos de campo con WebGL2 y conectividad variable. Cerrar AUD-025 tras esa revisión en dispositivos reales; la corrección local no acredita QA de campo.

Incidencia adicional del adaptador 0.1.4, preexistente a esta corrección: tras un `resize`, su `_transitionEnd` programa un frame que usa el mapa sin comprobar si sigue montado. Desmontar o reintentar antes de ese frame puede producir un acceso a `null` (`getZoom`). Se reprodujo con Leaflet/adaptador reales y motor/scheduler simulados; queda pendiente una solución compatible o actualización del adaptador y su regresión de cambio de tamaño seguido de salida/reintento. Este arreglo no modifica APIs privadas del paquete.

Verificación de la protección WebGL: seis pruebas nuevas con Leaflet y adaptador reales, simulando únicamente el motor; cubren conservación del formulario/marcador, retirada parcial, reintento sin seleccionar coordenadas, recuperación, minimapas pasivos y StrictMode. `npm run lint`, `npm run build` (TypeScript/PWA) y `git diff --check` aprobados. La primera suite completa tuvo un timeout al esperar el enlace de registro en Inicio; ese archivo pasó aislado (33/33) y la pasada final `npm run test -- --maxWorkers=2` aprobó 58 archivos/849 pruebas. El build mantiene el aviso de tamaño de MapLibre; no se ejecutó QA en teléfonos reales.

Limpieza posterior del fondo anterior: retirado `impactoMapStyle.ts`, que ya sólo reexportaba la URL y constantes de un único consumidor, y los mocks obsoletos de `TileLayer`. El controlador usa directamente la configuración Liberty compartida y conserva sus identificadores de capas. La guía del módulo describe esa estructura actual; el historial de verificación permanece aquí. La búsqueda de referencias al fondo raster anterior en código activo quedó sin coincidencias. Leaflet, React Leaflet y el adaptador siguen en uso; los créditos actuales de OpenFreeMap/OpenStreetMap y la geocodificación Nominatim se conservan. Verificación: lint, build/TypeScript/PWA, diff-check y 13 archivos/201 pruebas afectadas aprobados. Esta limpieza no cierra el QA de campo ni la incidencia del adaptador descritos arriba.

### AUD-024 — Lectura del equipo para el voluntario plantador

26 de octubre: `ParticipacionDetalleEquipo` monta la lectura de miembros para PLANTADOR y oculta el enlace de gestión. También se oculta el acceso de gestión en el inicio del plantador aunque un DTO anuncie una acción por error. La revisión anterior pasó 56 suites/826 pruebas; después de este ajuste, la prueba focal pasó 36/36, lint y build/TypeScript. La migración aditiva backend 087, limitada al GET de miembros, pasó 37/37 comprobaciones HTTP en PostgreSQL aislado; backend build y 72 suites/1002 unitarias también pasaron. Tras aplicarla al proyecto Supabase configurado, una comprobación RPC de solo lectura con un VOLUNTARIO/PLANTADOR activo obtuvo 200 en su ámbito, 403 en otro ámbito, 403 en búsqueda privada y 401 con identidad inválida. `localhost:5173` sirvió el componente actualizado y el backend local respondió 200 en salud; la persona usuaria comprobó con su sesión VOLUNTARIO/PLANTADOR que Equipo muestra miembros sin controles de modificación. [Contrato y verificación](docs/BACKEND_TAREA_LECTURA_EQUIPO_PLANTADOR.md). Este cierre acredita el entorno local con Supabase configurado; no acredita una publicación externa de la PWA.

### AUD-023 — Claridad del recorrido público y participante

26 de octubre, Equipo de subcampaña: la gestión rápida de cuentas existentes reutiliza las tarjetas, avatares, badges y buscador del equipo interno; ADMIN global y administrador contextual incorporan plantadores en el ámbito abierto, y la designación de administradores sigue reservada a ADMIN global. La lectura/logística interna conserva sus fotos reales; `miembros-participacion` v1 no entrega URL de foto ni fecha de incorporación, por lo que el equipo contextual muestra iniciales y no inventa fechas. Pendiente aceptación visual autenticada de las dos audiencias en móvil y, si se requieren fotos en la proyección contextual, un contrato backend de imagen autorizada. Los comandos C04/C06 conservan revisión, confirmación y recuperación; no se crea cuenta desde Equipo.

26 de octubre, eliminación de capturas: la lista de borradores ofrece confirmación por subcampaña y elimina el registro privado de IndexedDB únicamente después de cerrar la preparación remota con la misma clave. Un borrador que nunca generó comando se elimina solo en el dispositivo. El envío final con resultado incierto permanece bloqueado; un resultado CONFIRMADO conserva la plantación y sus evidencias. El descarte remoto marca fotos no vinculadas para limpieza posterior de Storage y el recibo no acredita que los objetos ya hayan sido borrados. Falta verificar la tarea periódica de limpieza en el entorno usado y probar el flujo con una sesión autenticada real.

26 de octubre, acceso a capturas: «Plantaciones en Borrador» queda como botón secundario blanco con borde verde debajo de «Registrar plantación» en el detalle de subcampaña de ambas audiencias. Abre `/app/participacion/borradores`, separado del selector para iniciar capturas, y muestra las capturas editables o por resolver de esta cuenta en este dispositivo. Se retiraron los otros enlaces visibles de recuperación. Sigue pendiente mostrar nombres de subcampaña y fecha de actualización; el almacenamiento conserva una entrada por cuenta y subcampaña, sin listado de borradores de otros dispositivos. Al volver a registrar en una subcampaña con terminal CONFIRMADO, el formulario todavía muestra el comprobante hasta iniciar explícitamente otra intención; revisar ese acceso sin perder el recibo. Si se retiran todos los ámbitos de una cuenta, el botón del detalle deja de estar accesible desde su inicio; el comando local sigue conservado y la ruta directa de borradores permanece disponible para recuperación.

26 de octubre, primer paso del registro: un `LISTAR` de fotos podía devolver `COMANDO_NO_ENCONTRADO` para una preparación local sin envío final; la pantalla bloqueaba fotos y ubicación y mostraba el texto interno del backend. El frontend ahora vuelve a preparar con el mismo UUID, conserva las fotos del dispositivo y permite seguir capturando ante fallos recuperables previos al envío. El GET 404 de una preparación todavía no enviada vuelve al formulario sin alerta técnica. Se añadió un recorrido de prueba para fotos y coordenadas tras la recuperación. Verificación local: 53 suites/815 pruebas, lint y build/TypeScript aprobados. Falta comprobar el caso con la cuenta y el navegador reales; los tests simulados no acreditan la disponibilidad del backend ni una subida efectiva.

Revisión posterior del mismo día: la subcampaña 51 mostró un `COMANDO_NO_CONFIRMADO` en una captura congelada que el selector llamaba genéricamente «resultado pendiente». Se separaron envío y descarte pendientes, con consulta y reintento de la misma clave para cada uno. Si el descarte no encontró preparación remota, se prepara y clausura esa misma clave; no se crea una intención de plantación nueva. El selector explica que sus entradas proceden del almacenamiento privado de este dispositivo y distingue borrador, envío, descarte y terminales. `CONTEXTO_INCOMPLETO` se explica como corrección administrativa pendiente de plan, polígono o fecha operativa de entrega; el frontend no puede determinar cuál de los tres falta con la respuesta actual. Pedir al backend que identifique la condición faltante en `campos` o en un diagnóstico autorizado del ámbito; no inferirla en la UI. Verificación local: 54 suites/821 pruebas, lint, build/TypeScript y diff-check aprobados. Falta QA autenticado en el navegador real y conciliación de los datos de cada subcampaña afectada.

26 de octubre, segundo paso de registro: se recuperó el contador `− / +` de `20157dc` para cada especie, adaptado al saldo elegible v1 y con entrada manual conservada. El total propuesto vuelve a destacarse. Una propuesta que supera un saldo actualizado permanece visible; `−` la corrige de una en una y `+` no supera el saldo. Verificación local: 22 pruebas focales, lint, build/TypeScript y diff-check aprobados. Sigue pendiente la aceptación visual autenticada en móvil; no se hizo una escritura de plantación por este cambio.

Avance del contrato del mismo paso: el backend local tiene la migración 086, proyección y OpenAPI candidatos para `plantado_inicial` y `pendiente_meta`; la PWA acepta la respuesta anterior o la ampliada completa y muestra el avance sólo con los dos campos. [Solicitud original](docs/BACKEND_TAREA_AVANCE_ESPECIES_REGISTRO.md). Verificación frontend local: 67 pruebas focales, lint, build/TypeScript y diff-check aprobados. Pendiente: cotejo/aplicación SQL y publicación por entorno, activación del flag backend y aceptación autenticada en móvil. No exigir los campos en frontend antes de verificar esa secuencia.

La barra de progreso del paso 2 se extrajo a `RegistroSpeciesProgressBar` y ahora aparece también con el contexto anterior, etiquetada como propuesta sin avance previo. Con el contexto ampliado conserva dos segmentos: acumulado oficial y cantidad propuesta. Verificación local: 23 pruebas del formulario, lint, build/TypeScript y diff-check aprobados. La compatibilidad visual no acredita que el contrato backend esté desplegado; falta aceptación visual autenticada en móvil.

El terminal `CONFIRMADO` del registro inicial muestra ahora el mismo modal de éxito que Recolección, extraído como componente compartido. Se retiró el comprobante largo de la captura; las acciones llevan al detalle de la subcampaña de origen o inician otra captura tras conservar el recibo. Resultados inciertos y rechazados mantienen recuperación/revisión. Verificación local: 27 pruebas focales de registro y Recolección, lint, build/TypeScript y diff-check aprobados. Pendiente aceptación visual autenticada en dispositivo real.

26 de octubre, cierre del bloqueo de guardado local: Pablo confirma que el reintento funcionó. Consulta de sólo lectura a las12:37 America/La_Paz verifica el comando `8472076a-9e44-457b-8e19-68a3f640db2b` CONFIRMADO y asociado al registro13, finalizado a las12:00. El otro borrador observado sigue PREPARADO y no fue enviado ni descartado. Queda acreditado ese registro real; se conservan los demás pendientes de UX y despliegue. [Resultado](docs/QA_REGISTRO_GUARDADO_51.md#confirmación-del-guardado-real).

26 de octubre, bloqueo de guardado: identificada pausa del backend por ausencia del flag `PARTICIPACION_INICIAL_ESCRITURA_HABILITADA` tanto en archivo como en proceso. Lectura real: dos comandos PREPARADO sin registro y tres fotos DISPONIBLE; usuario aporta POST503. Pablo confirmó el entorno verificado y autorizó habilitarlo: flag local en true, proceso reiniciado y health200. UI aclara consulta frente a reenvío; el reintento consulta primero y conserva clave/payload según `MISMA_CLAVE`. Verificación: 87 pruebas focales, lint, build y diff-check aprobados; aviso conocido de tamaño MapLibre. Pendiente acreditar el terminal autenticado real, con navegador local deshabilitado. [Evidencia y límites](docs/QA_REGISTRO_GUARDADO_51.md).

26 de octubre, comprobación posterior al arreglo de backend: el chat «Corrige detección de fotos ausentes» documenta corrección del detector de ausencia del SDK y reinicio del proceso local. En la PWA autenticada de subcampaña 51 se reintentó la única foto visible del borrador, sin eliminarla ni seleccionar otro archivo: pasó a «Foto lista» y «Continuar» abrió el paso 2, «Especies y cantidades». Se verifica recuperación de esa foto y avance del primer paso; no se confirmó la plantación, no se verificaron las dos cargas distintas indicadas en el chat backend ni se acredita despliegue remoto. La comprobación adicional de volver al paso 1/mapa quedó impedida porque el navegador volvió a indicar uso local deshabilitado. Pendientes de UX: permitir edición de ubicación/datos durante carga sin debilitar la confirmación final y retirar el aviso local de foto faltante al resolver la carga (persistió hasta avanzar).

26 de octubre, prueba autenticada en subcampaña 51: se abrió el borrador existente con una foto pendiente; «Reintentar carga de fotos» recuperó y volvió al mismo estado sin completar la carga. Continuar y corregir ubicación permanecen bloqueados por la incertidumbre. No se envió plantación ni se descartó el borrador. El mensaje frontend deja de atribuir el pendiente a falta de conexión sin evidencia. El servicio backend `participacion-cargas.service.ts` puede conservar RESERVADA ante fallo de Storage o reserva vigente; falta correlacionar logs/estado de esta petición para determinar la causa concreta. La verificación simulada anterior no acredita el cierre de este bloqueo real.

26 de octubre: primer paso de registro simplificado con GPS automático, corrección conservada, miniaturas compactas, metadatos desplegables y subida automática de dos fotos por tanda. Consulta automática del listado tras respuesta perdida; identidad, bytes, persistencia y confirmación final conservados. Pruebas de comportamiento cubren diez fotos, éxitos parciales, pérdida de respuesta y GPS durante carga/corrección. Revisión visual con componentes reales y datos sintéticos; el navegador de la ruta privada redirige al login. Pendiente medir tiempos con 10 fotos reales/HEIC y conexión de campo, GPS en dispositivo y recorrido autenticado contra backend; no se acredita una reducción medida de latencia del servidor. Verificación final: `npm run test` (53 archivos / 796 pruebas), `npm run lint`, `npm run build` y `git diff --check` aprobados. El build conserva el aviso conocido del chunk MapLibre. La última comprobación visual quedó limitada por el uso del navegador local deshabilitado en los ajustes de Work; se retiró la página temporal de QA.

25 de octubre: restaurado el diseño original del detalle de subcampaña y unificada su URL para participantes, con autorización por ámbito antes de montar lecturas. Enlaces antiguos y retorno del formulario compatibles; limpieza de selección al cambiar cuenta. Pendientes: verificación visual autenticada (navegador local desactivado en Work), equipo para plantador, fechas/fotos y resumen privado por audiencia. [Informe de restauración](docs/QA_RESTAURACION_DETALLE_SUBCAMPANIA.md).

24 de octubre, UX-01: inicio con tarjetas por campaña, estados y roles por ámbito; mapa de selección a pantalla completa sin registros individuales, selección explícita y regreso al contexto. Accesos globales no se filtran por capacidad de escritura. Enlaces obsoletos informan indisponibilidad sin sustituir zona. Ver [QA UX-01](docs/QA_PARTICIPACION_UX01.md): pruebas locales y revisión móvil sintética; aceptación autenticada de los tres perfiles, escritorio/dispositivo real, geometría no pública (B02) y detalle UX-02 siguen pendientes.

24 de octubre: `/participar` se organiza por campaña, subcampañas propias, mapa colectivo y stock por especie de la zona elegida, reutilizando componentes y contratos vigentes. Segunda pasada solicitada por Pablo: retirado saludo/introducción, selectores compactos, mapa móvil ampliable y gestos cooperativos. Corregidos offset del footer del registro, retorno al ámbito y selección ajena/obsoleta. Pendiente aceptación visual autenticada en teléfono (el navegador local se desactivó en Work) y gestos en dispositivo real; no se ejecutaron escrituras de plantación contra backend.

Tercera pasada: ficha seleccionada antes del mapa, registro antes del stock por especie (desplegable), disponibilidad siempre visible y resumen reutilizable de dos cifras. Campaña muestra plantación inicial oficial y suma de metas públicas conforme a RN-PLA-36, independiente de las zonas propias y la paginación. La revisión de navegador volvió a indicar uso local desactivado en Work; aceptación visual móvil sigue pendiente.

Verificación local hasta la tercera pasada: `npm run test` (51 archivos / 755 pruebas), `npm run lint`, `npm run build` (incluye TypeScript/PWA) y `git diff --check` aprobados. El build conserva el aviso conocido del chunk diferido de MapLibre mayor a 1 MB; falta medirlo en equipos de campo.

Pendiente de contrato para la siguiente mejora: `GET /api/v1/plantaciones/mis-registros` admite únicamente `cursor`/`limite`; su DTO carece de campaña/nombres/coordenadas. Para filtrar el historial y dibujar su mapa se necesitan esos campos/filtros, conservando autor/participante histórico aun con acceso retirado. No derivar esa pertenencia de capacidades actuales ni usar el mapa colectivo como si fuera el historial propio. El primer paso ya simplifica la presentación de preparación/cargas; queda pendiente aceptación con usuarios y medición de carga en campo, manteniendo recuperación, identidad y confirmación durable.

El 22 de octubre se constató duplicación de Impacto global, retorno al mismo destino, bloque personal antes de las métricas y exceso de listas/filtros en la portada. Se recompuso con componentes existentes: contador/mapa/carrusel, perfil en esquina, navegación pública, copia directa y orientación para incorporarse. Lint/build y 695 pruebas aprobados; revisión de navegador local visitante en móvil/escritorio. La prueba de registro WebAuthn y la aceptación del diseño por Pablo siguen pendientes. [Detalle y límites](src/modules/impacto/README.md#revisión-uxui--22-de-octubre-de-2026).

Revisión del 23 de octubre: se corrigieron resúmenes de selección obsoletos, controles duplicados del carrusel para teclado/lector, subcampañas sin contexto diferenciador y ausencia de un siguiente paso en Mis registros vacío. Se compactó la navegación pública/participante y se distinguió verificación de sesión de visitante confirmado. Suite completa: 48 archivos / 707 pruebas; lint y build aprobados. La aceptación visual de estos ajustes sigue pendiente: la revisión automática rechazó abrir el navegador local por límite de uso. No acredita WebAuthn real, escritura de plantaciones ni integración INT07.

Segunda pasada del mismo día: fotos junto al resumen, estados de carga/reintento, enlace registro → ubicación → registro, eliminación de enlaces a la subcampaña actual y copia manual accesible si falla el portapapeles. Encabezados y acciones ajustados para pantallas estrechas. Suite completa: 48 archivos / 711 pruebas; lint/build aprobados. El último intento de navegador indicó uso local desactivado en Work; se conserva pendiente la aceptación visual.

Migración de Impacto a MapLibre GL JS 6.15.0: resumen y explorador separados de la consulta, componentes UI compartidos, OSM con atribución visible, marcadores por teclado y estados de error/reintento. Verificados lint, TypeScript/build/PWA y 50 archivos / 732 pruebas. Continúan pendientes aceptación visual móvil/escritorio, WebGL2 real y medición de carga en equipos de campo: el chunk diferido del mapa supera 1 MB minificado (aprox. 296 kB gzip), más worker de 517 kB. El navegador local quedó desactivado durante la revisión. [Arquitectura y límites](src/modules/impacto/README.md#motor-cartográfico).

### AUD-022 — Compatibilidad de contratos para correcciones INT07

Inspección estática del 20 de octubre, PWA `a3a4b28`: `validarCapacidades` exige ocho acciones/tres capacidades globales; los recibos/stores de acceso e inicial admiten catálogos cerrados. Los detalles INT04/05 exigen relación propia/cantidades positivas y objetos exactos: contexto ajeno, ficha mínima de revertido o snapshots nuevos no son compatibles por un cast. No es una regresión reproducida de la base actual; es un riesgo de la futura integración INT07. [Ubicaciones, contratos y bocetos](docs/PREPARACION_CORRECCIONES_INT07.md).

Cerrar con entrega backend verificada/OpenAPI/ejemplos/fixture reproducible, adaptadores y validadores coordinados, lecturas específicas por audiencia y regresión INT04/05/06. Reutilizar transporte/ciclo/locks; no enviar rutas candidatas ni presentar mocks como correcciones. Backend sigue parcial y FE01–FE08 pendientes; este cotejo no completa ninguna tarea de integración.

### AUD-021 — QA integrado de gestión contextual

INT06 FE01–FE05 e INT04 están implementadas/verificadas localmente. Entrega INT04 en commit local PWA `94f62a9`, con backend D `75a57eb`; pendiente de push, sin SQL remoto ni despliegue acreditados. INT04 añade 30 checks integrados de registro/cargas, dos pestañas, plan concurrente y retiro, más 18 de reposición y 12 de fotos adversarias con D ([informe](docs/QA_REGISTRO_PARTICIPANTE_INT04.md)). INT06 FE06 conserva los pendientes de WebAuthn real, entorno externo y QA completo del recorrido; la integración local de Impacto/Mis registros se acredita a continuación en INT05. El QA sintético sólo adapta perfil propio; capacidades/comandos/DB son reales dentro del fixture.

INT05 FE01–FE06 implementadas/verificadas localmente el 18 de octubre: 48 suites/691 pruebas, lint/build y 111 comprobaciones integradas/SQL, con nuevas regresiones INT04/INT06. [Informe y versiones](docs/QA_IMPACTO_INT05.md). Se retira Impacto local del pendiente; permanecen WebAuthn real, revisión humana, entorno externo, despliegue/corte y QA completo del incremento.

Cerrar el pendiente externo con evidencia navegador → API → DB en destino y decisión de piloto. [Informe de acceso](docs/QA_GESTION_ACCESOS_INT06.md); [módulo](src/modules/participacion/README.md). No habilitar piloto sólo por cerrar esta UI.

### AUD-020 — Impacto público implementado/verificado localmente

`src/modules/impacto/` implementa global/campaña/subcampaña/registro/fotos sin guards privados y lista propia por JWT, con retorno, filtros, snapshots, cantidades grupales y preferencias por cuenta. El mapa de Recolección conserva su audiencia interna.

El [cotejo previo del 17](docs/PREPARACION_IMPACTO_INT05.md) detectó contratos faltantes y diferencias de estado/avance; backend los resolvió en su entrega INT05 con 081 antes de integrar. La PWA consume la nueva proyección estricta, sin recomponer permisos ni totales desde respuestas internas.

Cierre técnico local: [QA INT05](docs/QA_IMPACTO_INT05.md), 31 comprobaciones propias de navegador/HTTP/SQL más regresiones. Incógnito, VOLUNTARIO ajeno, sesión vencida/fallo de capacidades, autor retirado y cambio de cuenta verificados sin descargar stock/equipo. No acredita despliegue ni entorno externo; esos límites permanecen en AUD-021.

### AUD-013 — Identidad/autoridad: verificación externa pendiente

El diagnóstico del 27 de septiembre describía un bypass de JWT por headers. El [informe backend del 14 de octubre](../Backend-r3foresta/docs/pa-int02a-continuacion-2026-10-14.md) ya acredita JWT/actividad, actor derivado y privilegios en desarrollo; no presentar aquel defecto como comportamiento del código local actual.

Conservar el ID abierto para comprobar versión desplegada, rutas equivalentes, expiración/revocación y regresión con cuentas autorizadas. Logout local no revoca un token de servidor. Los criterios originales están en la [tarea histórica](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md); el contrato nuevo prevalece donde ya se verificó.

### AUD-007 — Idempotencia de eventos físicos

Confirmaciones y guardas de envío de Vivero evitan doble clic, pero no acreditan idempotencia después de una respuesta perdida. No añadir reintentos automáticos de eventos append-only sin contrato durable del backend.

Cerrar con misma clave → mismo resultado, un solo evento/efecto de saldo/evidencia y recuperación tras recarga. El motor C04–C09 de Participación no cierra este hallazgo. [Dependencia backend](docs/BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md).

### AUD-015 — Integración del editor de plan

La revisión atómica, JWT, propuesta conservada y conflictos están cubiertos con respuestas simuladas. Falta entorno coordinado con 062/063: ADMIN BORRADOR/ACTIVA, meta/especies, retirada protegida, dos revisiones concurrentes, stock sin cambios y cierre con meta vigente. [QA del editor](docs/QA_EDITOR_PLAN_USO.md).

### AUD-016 — Encabezado tras cierre concurrente

El editor puede bloquear correctamente una revisión rechazada mientras el encabezado exterior sigue ACTIVA hasta recargar. Revisar `DetalleSubcampanaScreen.tsx` y `EditarPlanSubcampania.tsx`.

Cerrar al reconciliar estado/permiso del detalle, conservando la propuesta y sin repetir el PUT; cubrir también error de lectura. Diagnóstico de uso del 9 de octubre, no una regresión nueva reproducida en esta limpieza.

### AUD-018 — Guardas del asistente

Revisar todos los pasos de `CrearSubcampanaScreen.tsx` por URL directa, no sólo meta/especies. Cerrar cuando roles sin permiso no monten acciones de edición y ADMIN mantenga el flujo. El backend conserva autorización final.

### AUD-014 — Dependencias

El análisis del 27 de septiembre registró dos alertas moderadas de React Router y una posible migración mayor. No se repitió `npm audit` en esta limpieza documental; no afirmar que su conteo sigue vigente.

El 23 de octubre, tras autorización para consultar npm, `npm audit --json` confirmó 10 alertas (7 moderadas, 3 altas). Los paquetes señalados son Vite, Vitest/`@vitest/mocker`, `brace-expansion`, `source-map-js`, React Router y la cadena PostCSS/Tailwind. El informe no señala MapLibre 6.15.0 ni sus nuevas dependencias; los paquetes señalados conservan las versiones del lockfile anterior. Queda pendiente corregir y verificar estas alertas en un cambio dedicado: las soluciones propuestas para Router y Tailwind incluyen versiones mayores. No se ejecutó `audit fix`.

Cerrar con diagnóstico actual del lockfile, actualización revisada y pruebas de navegación/guards/redirecciones. Evitar `npm audit fix --force` sin evaluar el cambio de versión principal.

### AUD-004 — Formatters

Revisar `subcampaniaFormatters.ts` y formateos en dashboards antes de extraer utilidades de fecha/zona horaria. Cerrar al reutilizar lo compartido sin cambiar presentación deliberada; no hacer un refactor global por esta lista.

### AUD-005 — Tipos de campaña

El service conserva `TIPOS_CAMPANIA` y el formulario `CAMPANIA_TYPES`, con distinto orden. Cerrar al compartir valores canónicos conservando el orden visual explícito. No reemplazar enums de backend por etiquetas de UI.

## Cierres conservados

| IDs | Alcance cerrado en su fecha |
| --- | --- |
| AUD-002 / AUD-003 | TypeScript/build y lint del workspace. |
| AUD-006 | Embolsado unificado; sin tope masa → plantas. |
| AUD-008 / AUD-009 | Precisión canónica y corrección/reenvío de Recolección rechazada. |
| AUD-010 | Comentarios/README de Vivero alineados con consumidores. |
| AUD-011 / AUD-012 | Registro mock retirado, sesión verificada y promesas offline ficticias retiradas. |
| AUD-017 / AUD-019 | Consulta de plan y UX de identidad/perfil/navegación. |

Evidencia completa en el [histórico](docs/archivo/FRONTEND_AUDIT_2026-10-15.md) y [QA por entrega](docs/README.md). No reabrir un cierre por leer su descripción antigua; registrar una regresión con evidencia nueva.

## Mantener esta lista

Cada hallazgo nuevo necesita ID estable, ubicación, síntoma reproducible, riesgo y criterio verificable de cierre. Priorizar problemas operativos, autorización, atomicidad e incertidumbre. No duplicar checklists de [AGENTS](AGENTS.md), reglas del [dominio](DOMAIN_INDEX.md) ni el backlog global.
