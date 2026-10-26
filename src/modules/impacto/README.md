# Impacto público y Mis registros — INT05

El módulo presenta la proyección de consulta PA-S02 sin reutilizar respuestas administrativas de Plantación. Visitante y cuenta autenticada consultan los mismos hechos públicos; las capacidades sólo añaden acciones de participación. No crea registros ni recalcula stock, permisos o cierre de subcampañas.

## Rutas PWA

| Ruta | Uso |
| --- | --- |
| `/` | Impacto global estable, sin redirección automática a otra campaña. ADMIN/GENERAL/VALIDADOR conservan `/app/home`. |
| `/participar` | Orientación para visitantes; cuenta verificada elige campaña/subcampaña, consulta mapa, avance y stock, y entra al registro existente. Reutiliza `ParticipantHomeScreen`. |
| `/impacto` | Global público explícito, sin redirección por preferencia. |
| `/impacto/campanias/:campaniaId` | Resumen público de campaña y sus subcampañas elegibles. |
| `/impacto/subcampanias/:subcampaniaId` | Zona, meta vigente, avance inicial y registros del ámbito. |
| `/impacto/registros/:registroId` | Detalle público compartible, fotografías elegibles e historia de seguimiento. |
| `/app/participacion/mis-registros` | Lista autenticada del autor o participante histórico, bajo `ProtectedRoute`. |

El detalle propio conserva `/app/participacion/registros/:registroId` y su contrato en [participación](../participacion/README.md). Un enlace compartido usa las rutas públicas, nunca ese comprobante privado. En las pantallas públicas, el retorno interno `impactoReturnTo` acepta rutas de Impacto, la ruta exacta de Mis registros o `/participar` con `campania_id` y `subcampania_id` decimales en ese orden; no acepta destinos externos. Los filtros y la selección del mapa se conservan en la URL pública al profundizar.

## Participar por campaña · 24 de octubre de 2026

La cuenta verificada entra directamente al selector de campaña, sin saludo ni introducción repetida. `PlantadorWorkspace`, `PlantadorCampaign` y `PlantadorScopePanel` componen `Card`, `Button`, `Chip`, `Badge`, `StatusBadge`, `ImpactoMapPanel` e `ImpactoSubcampaniaCard`. Las capacidades completas determinan las subcampañas propias; ampliar a «Toda la campaña» sólo amplía la consulta pública y conserva una alternativa de selección por lista.

La ficha seleccionada y «Registrar plantación» preceden al mapa en móvil y en el orden de lectura. El estado de disponibilidad permanece visible; «Ver stock» despliega especies y actualización debajo de la acción. Durante carga/error no se habilita el registro ni se representa el stock como cero. `ImpactoPlantacionProgress` reutiliza el resumen de dos cifras (plantación inicial y meta) en campaña y subcampaña; el detalle público conserva faltantes y seguimiento.

La meta pública de campaña suma `meta_inicial` de todas las subcampañas de la respuesta pública completa (RN-PLA-36), incluyendo zonas ajenas elegibles. No depende de «Mis subcampañas» ni de la página de registros; no usa la meta administrativa con borradores ni calcula faltantes agregados. El número plantado usa `indicadores.plantacion_inicial`, sin sumar reposiciones o restar bajas. Cada nueva página reemplaza los agregados como define `useImpactoConsulta`.

La proyección de Impacto entrega mapa, plantación inicial, meta, faltantes y avance por subcampaña. `useRegistroContext` entrega disponibilidad y saldo elegible por especie para una única selección autorizada; no se suman saldos como stock oficial de campaña ni se equipara fallo de lectura con cero. Cambiar ámbito desmonta esa lectura; cambiar cuenta/token también desmonta la vista. La URL conserva campaña y subcampaña para regresar de consulta/captura, y una zona pública ajena vuelve a abrir el alcance completo. Un enlace obsoleto ofrece una zona propia después de consultar.

El mismo mapa admite presentación compacta con altura de 32svh acotada a 14–18rem en móvil, ampliación voluntaria y leyenda desplegable. MapLibre usa gestos cooperativos: un dedo desplaza la página y dos dedos operan el mapa; botones, marcadores y controles mantienen objetivos de 44px. La instancia se conserva al ampliar/reducir. El formulario inicial conserva sus tres pasos y su footer usa `bottom-0` y área segura porque `BottomNav` se oculta en esa ruta.

Mis registros señala explícitamente que abarca todas las campañas. Su contrato sólo entrega `subcampania_id`, sin campaña, nombres ni coordenadas, y sólo acepta paginación. Un filtro histórico por campaña/mapa propio requiere ampliar ese contrato; cruzar capacidades actuales excluiría registros de accesos retirados. No se simula ese filtro en cliente.

La comprobación visual autenticada en teléfono y gestos táctiles reales sigue pendiente: el navegador local quedó desactivado en Work al preparar la vista móvil. Las pruebas de componentes no acreditan WebGL real ni escrituras contra backend. El registro inicial reutiliza el asistente existente; no se cambiaron comandos, permisos, cargas ni persistencia.

Verificación local de esta iteración: 51 archivos / 755 pruebas aprobadas, lint, TypeScript/build/PWA y `git diff --check`. Incluye ámbitos autorizados, selección/cambio de cuenta, stock cero/error, retorno a zona ajena, enlace obsoleto, ampliación del mapa y conservación/descarte de borrador con retorno contextual. La tercera pasada verifica metas públicas independientes del mapa/paginación, cifras por subcampaña, meta superada sin bloquear stock disponible, fallo de consulta pública sin bloquear el contexto operativo y reconsulta desde stock desplegable. El aviso de tamaño del chunk de MapLibre permanece.

## Organización

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `types.ts` | DTO INT05 con IDs BIGINT decimales como cadenas. |
| `api/impacto.contract.ts` | Validación runtime estricta de parámetros, envelopes, alcance, cantidades, relaciones y rutas de imágenes/enlaces. |
| `api/impacto.api.ts` | `ImpactoService`: consultas públicas sin Bearer y lectura propia con el transporte privado existente. |
| `hooks/useImpactoConsulta.ts` | Consulta cancelable por ámbito/filtro, paginación y descarte de respuestas obsoletas. |
| `pages/ImpactoConsultaScreen.tsx`, `pages/ImpactoRegistroScreen.tsx` | Global/campaña/subcampaña y detalle público reducido. |
| `pages/MisRegistrosScreen.tsx` | Historial propio separado por cuenta/token y paginado sin depender de capacidades. |
| `components/ImpactoMapPanel.tsx` | Mapa cargado de forma diferida; listas equivalentes accesibles fuera del mapa. |
| `components/ImpactoExplorer.tsx`, `hooks/useImpactoExplorer.ts` | Exploración de campañas/zonas, selección y navegación visual del carrusel; sin consultas adicionales al backend. |
| `components/ImpactoSummary.tsx` | Jerarquía visual de indicadores públicos, sin calcular supervivencia. |
| `map/` | Adaptación de coordenadas/GeoJSON, estilo OSM y ciclo de vida de MapLibre. No contiene acceso a datos del backend. |
| `components/ImpactoActions.tsx`, `components/ImpactoEntry.tsx` | Acciones de Participar y resolución de la entrada pública/interna. |
| `utils/consulta.ts`, `utils/lastCampaign.ts` | URL/filtros/retorno seguros y preferencia de campaña por cuenta. |

## Endpoints y filtros

Base configurada por `VITE_API_URL`, con `/api/v1` agregado por el cliente. Las cinco lecturas nuevas responden `{data: ...}`. No se envían headers de identidad/rol auxiliares ni se usan las URLs de API como destinos de navegación PWA.

| GET bajo `/api/v1` | Query admitido |
| --- | --- |
| `/impact/global` | `campania_id`, `subcampania_id`, `organizacion_id`, `planta_id`, `desde`, `hasta`, `cursor`, `limite` |
| `/impact/campanias/:id` | `subcampania_id`, `organizacion_id`, `planta_id`, `desde`, `hasta`, `cursor`, `limite` |
| `/impact/subcampanias/:id` | `organizacion_id`, `planta_id`, `desde`, `hasta`, `cursor`, `limite` |
| `/impact/registros/:id` | Ninguno. |
| `/plantaciones/mis-registros` | `cursor`, `limite`. Requiere Bearer vigente y cuenta activa. |

IDs y cursor son cadenas decimales canónicas positivas dentro de BIGINT; nunca convertirlos a `number`. `limite` admite 1–100, con 20 por omisión del backend. `desde`/`hasta` son días inclusivos de plantación, sin desplazar por zona horaria. Los parámetros repetidos, desconocidos o incompatibles con el nivel se rechazan. `seleccion=s:<id>` o `seleccion=r:<id>` sólo pertenece a la URL de presentación; no se envía al backend.

## Motor cartográfico

Impacto usa **MapLibre GL JS 6.15.0**, fijado en `package.json`/lockfile. La [integración ESM oficial](https://maplibre.org/maplibre-gl-js/docs/#esm) empaqueta el worker mediante Vite; no se descarga código desde un CDN. La librería, sus estilos y el worker se cargan con el mapa diferido. Leaflet continúa siendo dependencia de los mapas operativos de Plantación, Registro y Mapa interno; esta migración no altera esos formularios.

MapLibre es el motor de representación; OpenStreetMap sigue siendo la cartografía base. El estilo raster local usa `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, sin cuenta ni clave. La atribución permanece visible. Se respeta la [política de teselas de OSM](https://operations.osmfoundation.org/policies/tiles/): caché HTTP normal del navegador, sin descarga masiva, precarga de áreas ni almacenamiento offline de teselas en el service worker. La configuración del proveedor está centralizada para poder sustituirlo. El servicio público OSM no garantiza disponibilidad; si se requiere tráfico elevado/SLA, habrá que elegir un proveedor apropiado.

Las geometrías conservan el orden GeoJSON `[longitud, latitud]`, todos los anillos del polígono y los IDs como cadenas. Los registros con exactamente la misma coordenada se agrupan visualmente, conservando una opción por registro. Un marcador no equivale a una planta individual. La selección cambia el resaltado; el encuadre cambia al elegir una tarjeta, cambiar el alcance o pedir recentrado. Redimensionar la ventana no debe deshacer un desplazamiento manual.

MapLibre 6 requiere WebGL2. La indisponibilidad del motor muestra una alternativa legible y mantiene las listas accesibles. Un fallo de la cartografía base se comunica por separado de los hechos públicos. Las pruebas unitarias simulan el motor y no acreditan por sí solas el renderizado de GPU, la disponibilidad de OSM o el funcionamiento en todos los dispositivos.

La integración separa `ImpactoMap` (estado y controles React), `impactoMapController` (instancia, eventos y limpieza), `impactoMapData` (geometrías/grupos) e `impactoMapStyle` (proveedor y estilo). Los botones de los marcadores son navegables por teclado y sus detalles reutilizan `Button` mediante un portal React. El contenido no se inyecta como HTML. Las capas propias se preparan al cargar el estilo, sin esperar a las teselas externas. La pantalla conserva la consulta y la URL; `useImpactoExplorer` coordina la interacción compartida por mapa, tarjetas y listas.

Verificación de la migración, 23 de octubre de 2026: `npm run test` (50 archivos / 732 pruebas, 21 nuevas), `npm run lint`, `npm run build` (incluye TypeScript) y `git diff --check` aprobados. El estilo raster pasó el validador oficial de MapLibre. El worker se emitió como `.js` y quedó en el precache de la PWA; las teselas OSM no se precachean. El build advierte que el chunk diferido del mapa supera 1 MB minificado (aproximadamente 296 kB gzip), además del worker de 517 kB; no se elevó el umbral para ocultarlo. Pendiente medir carga/interacción en dispositivos de campo.

La página anterior se inspeccionó con datos públicos locales antes de la migración. La inspección visual del resultado en móvil/escritorio y el renderizado real WebGL2 no pudieron completarse: el navegador local quedó desactivado en los ajustes de Work. No se presenta la revisión anterior como validación del nuevo mapa. No hubo escrituras de negocio ni despliegue.

`organizacion_id` selecciona campañas asociadas, no afiliaciones personales. `planta_id` selecciona grupos que contienen esa especie y conserva las otras especies y participantes del grupo completo. Los filtros no conceden habilitación operativa. Las opciones de organización/especie visibles se obtienen de los registros cargados; no se consulta un catálogo privado para completarlas.

La elegibilidad pública proviene del backend: subcampañas `ACTIVA`, `COMPLETADA` y `FINALIZADA_PARCIAL`, con padres vigentes. Un recurso no público o inexistente produce el mismo 404. El plan técnico `/api/subcampanias/:id/plan` conserva su autenticación y su cliente independiente.

## Sesión, acciones y paginación

La consulta pública comienza sin esperar perfil/capacidades, omite credenciales y Bearer y usa `cache: 'no-store'`, cancelación y timeout de 40 segundos incluido el body. Un JWT vencido no cambia esa proyección. Las fotografías se construyen desde el ID validado hacia `/api/v1/impact/imagenes/:id`; no se abren buckets, rutas de originales ni URL arbitraria recibida. Los errores de imagen tienen un estado visible.

`ImpactoActions` monta el provider existente sólo para una cuenta verificada; si ya existe uno en el árbol, lo reutiliza. Las acciones se publican después de completar todas las páginas de capacidades. Se limitan al ámbito visible y ofrecen otra vía para elegir ámbitos donde iniciar una plantación. «Plantaciones en Borrador» se abre desde el detalle de subcampaña. Un fallo de capacidades no equivale a revocación ni interrumpe el contenido público. Los formularios INT04 y la gestión INT06 conservan sus propias comprobaciones del servidor.

En la consulta pública sólo se pagina `registros`, por ID descendente y cursor exclusivo. Cada página vuelve a incluir indicadores, campañas, subcampañas y mapa de todo el alcance filtrado: se reemplazan esos campos y se anexan únicamente registros deduplicados. No sumar indicadores por página. Si la proyección completa cambia al paginar, se retiran filas que dejaron de ser públicas y se muestra el cambio de alcance. Cambiar filtros/ámbito cancela la lectura anterior y oculta sus resultados hasta resolver la nueva.

Mis registros usa Bearer directamente, sin pedir capacidades operativas. La frontera de cuenta/token desmonta el contenido previo, cancela solicitudes pendientes y descarta respuestas tardías. La unión se deduplica por ID y conserva las etiquetas «Registré»/«Participé»; la cantidad sigue perteneciendo al grupo. El autor tiene acceso al detalle propio y, cuando existe, un enlace público separado. El participante prefiere el detalle público y usa el histórico permitido cuando el ámbito no es público. La lista no amplía observaciones privadas ni concede acceso a stock/equipo. 401/403 ofrecen recuperar sesión; error y vacío confirmado son estados distintos. Actualizar reinicia el recorrido de cursores.

## Última campaña

`saveLastCampaign(actorId, campaignId)` guarda sólo el ID bajo `r3foresta:impacto:last-campaign:v1:<actorId>`. No guarda tokens, perfil ni facultades. La selección explícita del registro INT04 también actualiza esa preferencia; `readLastCampaign` admite como respaldo la selección anterior `r3foresta:registro-scope:v1:<actorId>` de esa misma cuenta.

Desde el ajuste UX del 22 de octubre, `/` y `/impacto` permanecen globales para visitantes y participantes. La campaña se elige explícitamente. La preferencia por cuenta sigue disponible para el selector de registro; no debe redirigir la consulta pública. El código opcional de preferencia en `ImpactoActions` no se monta en las entradas actuales.

## Interpretación y verificación

Un punto representa un registro grupal; el polígono, una zona de trabajo. Plantación inicial, bajas reportadas y reposiciones se muestran separadas. La meta/faltantes corresponden a cada subcampaña: se presentan los valores del backend, incluido avance superior a 100%; sólo el ancho de la barra se limita. No sumar faltantes en global/campaña ni presentar supervivencia comprobada o composición viva por especie. Afiliación histórica y organizaciones de campaña permanecen separadas; «no declarada» e «histórica no disponible» son casos distintos.

Ejecutar `npm run test -- src/modules/impacto`, `npm run lint` y `npm run build` al cambiar estos recorridos. El [informe INT05](../../../docs/QA_IMPACTO_INT05.md) registra entorno, evidencia integrada y límites. Esta guía describe la implementación frontend; no acredita aplicación SQL remota, WebAuthn real, despliegue, revisión humana ni piloto. Las pruebas con mocks no demuestran por sí solas autorización o sanitización de archivos en el servicio real.

## Revisión UX/UI · 22 de octubre de 2026

Recomposición con componentes existentes: `AppLayout` en modo público (sin provider de capacidades), `BottomNav`, `ParticipantHomeScreen`, `ImpactoActions`, `Card`, `Button`, `PageHeader`, `PublicPhoto` y `ImpactoMapPanel/ImpactoMap`. No se añadieron componentes ni librerías UI.

La portada prioriza el total oficial de plantación inicial del alcance y el mapa OSM. El carrusel ordena campañas por plantas iniciales descendentes; al activar una tarjeta cambia las zonas/puntos representados, conservando el total global explícito. Deslizar permite explorar sin cambiar la selección. Pulsar la foto, el título o el cuerpo de la tarjeta la centra en el carrusel y selecciona su campaña, vuelve a encuadrar el mapa incluso si ya estaba seleccionada y lo lleva a la vista cuando quedó fuera de pantalla. El botón «Ver en el mapa» conserva la misma acción por teclado y cambia a «Viendo en el mapa» al seleccionarlo. «Conocer campaña» profundiza por ruta pública sin activar el desplazamiento del mapa. Las fotos proceden de evidencias públicas de los registros cargados; su ausencia no se sustituye por una fotografía ficticia. En zonas se prefiere la descripción territorial disponible. El detalle auditable y la consulta avanzada permanecen desplegables.

La navegación pública conserva Impacto / Participar / Mis registros; perfil en la esquina. Perfil y Mis registros invitan a entrar cuando falta sesión y conservan el destino privado. Participar ofrece crear perfil o entrar y explica la habilitación por el equipo; crear cuenta no otorga permiso para registrar. Sin destino previo, el login de un voluntario conduce a Participar. El registro guiado y sus permisos siguen usando los contratos existentes.

Criterios concretos de la revisión (12): jerarquía visual, tarea principal visible, lenguaje cotidiano, divulgación progresiva, consistencia de componentes, navegación predecible, reconocimiento mediante fotos/nombres, control explícito del usuario, respuesta visible al copiar/seleccionar, distinción carga/error/vacío, accesibilidad por teclado y objetivos táctiles, adaptación móvil. Son criterios aplicados a este recorrido; la aceptación visual humana sigue pendiente.

Verificación: lint y build aprobados; suite completa 48 archivos / 695 pruebas. Navegador local en 5173, visitante, móvil 390×844 y escritorio: lectura pública, copia directa, desplazamiento de tarjetas con selección de campaña, entrada a campaña y retorno. No hubo escritura de plantaciones ni pruebas de registro WebAuthn real. El portal de organizaciones/semillas corre en 5174 y se mantiene como producto separado; este cambio modifica únicamente la PWA.

Ajuste de selección directa de tarjetas: lint, build y suite de Impacto aprobados (8 archivos / 129 pruebas). Se cubren clics en foto, título y cuerpo, y el enlace independiente al detalle. En navegador se verificó selección desde el título y recentrado desde la foto después de mover manualmente el mapa.

El explorador global inicia en subcampañas. El selector superior permite cambiar a campañas con la misma proyección pública, sin nuevas llamadas. Si todas las tarjetas caben, se alinean al inicio y seleccionarlas no desplaza el carrusel. Cuando desbordan se repite la secuencia para recorrerla en ambos sentidos; el centrado y el mapa responden a la selección explícita. La cantidad oficial no suma las repeticiones visuales.

Seleccionar una zona o un registro desde el mapa activa la tarjeta de su subcampaña; en el modo campañas, activa la campaña a la que pertenece. Usa las relaciones de la proyección pública y conserva la selección del elemento en la URL. El centrado se omite si las tarjetas caben.

Verificación del ajuste (2026-10-22): 134 pruebas de Impacto aprobadas, incluidos ambos niveles, zona/registro y centrado condicionado al desbordamiento. El ciclo móvil y la tarjeta única alineada al inicio se comprobaron en navegador. La comprobación visual de la selección mapa → tarjeta queda pendiente: el navegador local se desactivó en Work durante esta última revisión.

## Revisión de recorridos — 23 de octubre de 2026

- **Exploración pública:** la zona conserva su nombre territorial y añade nombre de subcampaña/campaña para distinguir tarjetas similares. Si no hay tarjetas se muestra un vacío explícito.
- **Selección:** tocar el mapa selecciona la tarjeta sin desplazar verticalmente la página ni ocultar las otras ubicaciones que ya estaban visibles. Tocar una tarjeta sigue enfocando su ámbito y retira el resumen anterior; «Ver todas las ubicaciones» limpia también la selección de la URL. Un enlace con selección válida resalta la tarjeta correspondiente.
- **Carrusel:** anterior/siguiente reutilizan `Button`. Las copias del ciclo se ocultan a lectores y se excluyen del orden de tabulación; recorrer los controles con teclado no provoca saltos de ciclo. Las listas que caben siguen al inicio. No hay reproducción automática.
- **Participación:** mientras se verifica la sesión se muestra un estado de carga, sin sugerir otra cuenta. Las instrucciones reconocen a quien ya inició sesión; errores de consulta usan lenguaje de usuario. Enlaces y selectores principales tienen un área táctil de al menos 44 px.
- **Mis registros:** el vacío confirmado ofrece «Ver cómo participar». Fechas y cantidades reutilizan los formateadores del módulo. Se conserva la distinción de datos grupales y acceso propio/público.
- **Navegación:** barra pública/participante más compacta, margen de zona segura del dispositivo y espacio inferior para desplazar controles enfocados.

Validación: `npm test` (48 archivos / 707 pruebas), `npm run lint`, `npm run build` y `git diff --check`. Incluye regresión de selección obsoleta, enlace con selección, no desplazamiento vertical desde mapa, copias accesibles únicas, carga de sesión y salida del vacío. La revisión visual de esta iteración no se pudo ejecutar: abrir localhost fue rechazado por revisión automática debido al límite de uso. Permanecen pendientes aceptación móvil/escritorio y WebAuthn real. No se modificaron contratos ni se cerraron tareas INT07.

### Segunda pasada: detalle público y navegación

Las fotos aparecen inmediatamente después del resumen del registro. `PublicPhoto` reserva espacio durante carga/error y mantiene el reintento; no sustituye evidencias ausentes. La ubicación incluye un enlace a la subcampaña con el registro seleccionado y un retorno explícito al detalle. Las tarjetas de la subcampaña actual omiten enlaces al mismo destino. Se amplían objetivos táctiles y el encabezado compacto admite nombres largos.

Copiar enlace muestra espera, bloquea intentos simultáneos y confirma sólo cuando el portapapeles responde. Si no está disponible o falla, se enfoca y selecciona la URL pública para copia manual. No se comparte por servicios externos ni se cambia la URL por una privada.

Verificación de esta pasada: 48 archivos / 711 pruebas aprobadas, lint, build y `git diff --check`. Incluye registro → mapa → registro, ausencia de enlaces a la propia pantalla, reintento de foto y copia pendiente/fallida. La última comprobación del navegador indicó uso local desactivado en ajustes de Work; la apariencia móvil/escritorio sigue pendiente de inspección visual.

### Retorno al detalle compartido · 25 de octubre

La navegación desde el detalle participante acepta `/app/planting/subcampanias/:id` con pestaña/registro explícitamente permitidos mediante `safeParticipacionReturn`. Los enlaces antiguos de Participar siguen siendo compatibles. El mapa del detalle filtra registros por la subcampaña autorizada; compartir sigue generando la URL pública de Impacto. No se incluyen datos operativos privados en enlaces compartidos.
