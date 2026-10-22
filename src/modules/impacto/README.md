# Impacto público y Mis registros — INT05

El módulo presenta la proyección de consulta PA-S02 sin reutilizar respuestas administrativas de Plantación. Visitante y cuenta autenticada consultan los mismos hechos públicos; las capacidades sólo añaden acciones de participación. No crea registros ni recalcula stock, permisos o cierre de subcampañas.

## Rutas PWA

| Ruta | Uso |
| --- | --- |
| `/` | Impacto global estable, sin redirección automática a otra campaña. ADMIN/GENERAL/VALIDADOR conservan `/app/home`. |
| `/participar` | Orientación pública para comenzar; cuenta verificada ve sus acciones y zonas habilitadas. Reutiliza `ParticipantHomeScreen`. |
| `/impacto` | Global público explícito, sin redirección por preferencia. |
| `/impacto/campanias/:campaniaId` | Resumen público de campaña y sus subcampañas elegibles. |
| `/impacto/subcampanias/:subcampaniaId` | Zona, meta vigente, avance inicial y registros del ámbito. |
| `/impacto/registros/:registroId` | Detalle público compartible, fotografías elegibles e historia de seguimiento. |
| `/app/participacion/mis-registros` | Lista autenticada del autor o participante histórico, bajo `ProtectedRoute`. |

El detalle propio conserva `/app/participacion/registros/:registroId` y su contrato en [participación](../participacion/README.md). Un enlace compartido usa las rutas públicas, nunca ese comprobante privado. El retorno interno de navegación `impactoReturnTo` acepta rutas de Impacto o la ruta exacta de Mis registros; no acepta destinos externos. Los filtros y la selección del mapa se conservan en la URL pública al profundizar.

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

`organizacion_id` selecciona campañas asociadas, no afiliaciones personales. `planta_id` selecciona grupos que contienen esa especie y conserva las otras especies y participantes del grupo completo. Los filtros no conceden habilitación operativa. Las opciones de organización/especie visibles se obtienen de los registros cargados; no se consulta un catálogo privado para completarlas.

La elegibilidad pública proviene del backend: subcampañas `ACTIVA`, `COMPLETADA` y `FINALIZADA_PARCIAL`, con padres vigentes. Un recurso no público o inexistente produce el mismo 404. El plan técnico `/api/subcampanias/:id/plan` conserva su autenticación y su cliente independiente.

## Sesión, acciones y paginación

La consulta pública comienza sin esperar perfil/capacidades, omite credenciales y Bearer y usa `cache: 'no-store'`, cancelación y timeout de 40 segundos incluido el body. Un JWT vencido no cambia esa proyección. Las fotografías se construyen desde el ID validado hacia `/api/v1/impact/imagenes/:id`; no se abren buckets, rutas de originales ni URL arbitraria recibida. Los errores de imagen tienen un estado visible.

`ImpactoActions` monta el provider existente sólo para una cuenta verificada; si ya existe uno en el árbol, lo reutiliza. Las acciones se publican después de completar todas las páginas de capacidades. Se limitan al ámbito visible y ofrecen otra vía para elegir ámbitos o recuperar borradores. Un fallo de capacidades no equivale a revocación ni interrumpe el contenido público. Los formularios INT04 y la gestión INT06 conservan sus propias comprobaciones del servidor.

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

La portada prioriza el total oficial de plantación inicial del alcance y el mapa OSM. El carrusel ordena campañas por plantas iniciales descendentes; al deslizar o activar «Ver en el mapa» cambia las zonas/puntos representados, conservando el total global explícito. «Conocer campaña» profundiza por ruta pública. Las fotos proceden de evidencias públicas de los registros cargados; su ausencia no se sustituye por una fotografía ficticia. En zonas se prefiere la descripción territorial disponible. El detalle auditable y la consulta avanzada permanecen desplegables.

La navegación pública conserva Impacto / Participar / Mis registros; perfil en la esquina. Perfil y Mis registros invitan a entrar cuando falta sesión y conservan el destino privado. Participar ofrece crear perfil o entrar y explica la habilitación por el equipo; crear cuenta no otorga permiso para registrar. Sin destino previo, el login de un voluntario conduce a Participar. El registro guiado y sus permisos siguen usando los contratos existentes.

Criterios concretos de la revisión (12): jerarquía visual, tarea principal visible, lenguaje cotidiano, divulgación progresiva, consistencia de componentes, navegación predecible, reconocimiento mediante fotos/nombres, control explícito del usuario, respuesta visible al copiar/seleccionar, distinción carga/error/vacío, accesibilidad por teclado y objetivos táctiles, adaptación móvil. Son criterios aplicados a este recorrido; la aceptación visual humana sigue pendiente.

Verificación: lint y build aprobados; suite completa 48 archivos / 695 pruebas. Navegador local en 5173, visitante, móvil 390×844 y escritorio: lectura pública, copia directa, desplazamiento de tarjetas con selección de campaña, entrada a campaña y retorno. No hubo escritura de plantaciones ni pruebas de registro WebAuthn real. El portal de organizaciones/semillas corre en 5174 y se mantiene como producto separado; este cambio modifica únicamente la PWA.
