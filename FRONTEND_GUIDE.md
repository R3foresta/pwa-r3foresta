# Guía de construcción frontend

Guía práctica del código actual. Arranque/comandos: [README](README.md). Reglas obligatorias: [AGENTS](AGENTS.md). Dominio: [índice y fuentes](DOMAIN_INDEX.md). Trabajo pendiente: [auditoría](FRONTEND_AUDIT.md).

## Arquitectura y puntos de entrada

| Responsabilidad | Dónde buscar |
| --- | --- |
| Rutas lazy y guards | `src/App.tsx`, `src/routes/` |
| Arranque/proveedores | `src/main.tsx`, `src/contexts/`, `src/layouts/AppLayout.tsx` |
| Features | `src/modules/<feature>/`: pantallas, componentes, hooks, contratos, mappers y utilidades |
| Transporte/casos de uso existentes | `src/api/`, `src/services/`; clientes v1 de perfil/participación dentro del módulo |
| UI compartida | `src/components/ui/`, `src/components/ConfirmDialog.tsx` |
| PWA | `src/pwa/`, `vite.config.ts`, `vercel.json` |

Seguir la estructura real del módulo: hay `screens/` y `pages/`, sin necesidad de renombrar carpetas para uniformarlas. Las rutas usan `React.lazy` con imports directos; las librerías de mapas y sus estilos se cargan donde se usan. Impacto utiliza MapLibre GL JS con su worker empaquetado por Vite; los mapas operativos conservan Leaflet e integran MapLibre para mostrar la base vectorial OpenFreeMap Liberty. La URL del estilo se comparte en `src/config/map.ts`. Configuración cartográfica, adaptación GeoJSON e interacción viven dentro de la feature; las capas compartidas no deben incorporar reglas de una feature.

`OpenFreeMapBaseLayer` aísla los fallos de WebGL/carga del fondo, limpia las capas incompletas y permite reintentar sólo la base, conservando las superposiciones y el formulario. Los minimapas pasivos usan `allowRetry={false}` para mostrar un aviso breve y conservar su acción de apertura sin anidar botones.

## Secuencia para un cambio

1. Leer `package.json`, la pantalla/contrato y sus consumidores; revisar el README del módulo si existe.
2. Si afecta dominio, abrir la fuente concreta del [índice](DOMAIN_INDEX.md). Si falta contrato, pedirlo; no inferir enums/endpoints nuevos.
3. Elegir el cambio mínimo y explicar el plan si abarca varios archivos.
4. Reutilizar UI, hooks y servicios existentes; mantener separados transporte, validación/mapeo y presentación.
5. Verificar el comportamiento afectado y los checks pertinentes. Registrar qué se ejecutó y qué sigue sin acreditar.

## Contratos y datos

- Conservar nombres de campos del backend y separar DTO de valores de formulario/view model cuando aporte claridad. Evitar `any`.
- Usar la configuración de URL existente. No colocar fetch en JSX ni crear otro cliente si el módulo ya resuelve el caso.
- Mantener la atomicidad del endpoint: no dividir un comando o una revisión de plan en varias escrituras.
- Cancelar/descartar respuestas obsoletas al cambiar filtros, persona, cuenta o desmontar. El spinner o botón deshabilitado no garantizan idempotencia.
- Mostrar `loading`, vacío válido, error recuperable y resultado confirmado por separado. Nunca convertir un error de lectura en «sin permisos» o saldo cero.
- Los datos calculados/snapshots son lectura. No recalcular saldo como verdad ni simular persistencia/cierre.
- Perfil y participación v1 validan respuestas en runtime; IDs/revisiones BIGINT son cadenas decimales. No convertirlos a `number`.
- Algunos clientes legados conservan headers de identidad/rol por compatibilidad. No copiarlos a rutas v1 ni retirarlos globalmente sin cotejar backend; esos headers no son fuente de autoridad.

## UI y formularios

UI en español, Tailwind y primitivas de `src/components/ui/`. Componentes enfocados; la pantalla compone y delega datos/validaciones a hooks/servicios. No introducir otra librería UI para resolver un caso cubierto.

- Formularios largos por bloques: datos base, cantidad/unidad, ubicación, evidencia, observaciones y resumen.
- Errores por campo cuando el contrato los ofrece; conservar propuestas ante rechazo o incertidumbre.
- Estados/saldos/restricciones visibles. Diferenciar material en proceso, plantas vivas, campos editables, calculados e historial.
- Antes de una operación definitiva, `ConfirmDialog`: persona/lote, ámbitos/evento, cantidad/unidad si aplica, fecha, responsable, evidencia y consecuencia. Cancelar el diálogo no escribe.
- El diálogo existente contiene foco, admite Escape y devuelve foco al cerrar. Reutilizarlo.
- Tras una operación confirmada por el servidor, `SuccessModal` presenta el resultado breve y las siguientes acciones. No mostrarlo durante un resultado incierto o rechazado.
- En evidencias mostrar preview seguro y metadatos recibidos; `bucket`/`ruta_archivo` no son URLs públicas.
- Eventos/movimientos append-only: historial completo, sin editar/borrar; filtros sólo visuales.

## Sesión, rutas y capacidades

`AuthContext` es la fuente de sesión; `useWebAuthn` delega en él. El arranque verifica perfil con Bearer antes de abrir privados. `r3foresta:user` y `auth_id` son datos auxiliares, nunca autoridad.

El perfil visible está ligado al token que lo verificó. Al cambiar token por login, otra pestaña o recuperar foco se oculta la cuenta anterior hasta verificar la nueva. Reconsultar el mismo token no desmonta formularios. Las respuestas tardías no restauran una sesión cerrada ni borran la nueva.

- `ProtectedRoute` verifica sesión y audiencia de navegación; el backend decide cada operación.
- `appAccess.ts` conserva la entrada interna de ADMIN/GENERAL/VALIDADOR. Ser administrador contextual no abre esos módulos.
- Perfil mínimo: nombre. Apellido, documento, wallet y afiliación no deben convertirse en requisitos nuevos de este recorrido.
- `AppLayout` aporta el provider compartido de capacidades. No reemplazar todas las facultades internas por este DTO limitado al recorrido participante.
- `src/modules/impacto/` implementa la consulta pública sin esperar sesión/capacidades. `AppLayout publicMode` y `BottomNav` conservan navegación pública; `ParticipantHomeScreen` en `/participar` monta `PlantadorWorkspace` con el provider existente (o uno local en la entrada pública autenticada). La portada de Impacto permanece global. Participar muestra tarjetas de todos los ámbitos devueltos por capacidades, agrupadas por campaña y estado activo/otras. No selecciona una zona automáticamente. El mapa de inicio es un diálogo de pantalla completa con geometría pública opcional filtrada por esos ámbitos, sin registros individuales ni GPS; `vista=mapa` y `seleccion` conservan su vista. Los enlaces antiguos con campaña/subcampaña validan el ámbito y redirigen a `/app/planting/subcampanias/:id`; el retorno al inicio conserva modo por estado de navegación ligado al actor. Los enlaces no disponibles no seleccionan otra zona. El stock se consulta sólo dentro del ámbito elegido y autorizado. Mis registros/detalle histórico usan Bearer sin exigir capacidad operativa; su historial sigue siendo de todas las campañas. Rutas, filtros y paginación: [módulo Impacto](src/modules/impacto/README.md). Evidencia y límites: [QA INT05](docs/QA_IMPACTO_INT05.md).

## Plan de Plantación

Reutilizar `PlanMetaEspeciesForm`, `usePlanMetaEspeciesForm` y utilidades del módulo. Asistente y detalle conservan su propia carga, autorización, confirmación y persistencia.

Nombres operativos del catálogo: `getPlantaNombre` prioriza `nombre_comun_principal` y sólo recurre a `nombre_cientifico` si falta/está vacío. `especie` puede contener una familia o clasificación y no sirve como nombre legible alternativo. El GET del plan entrega común/foto opcional; contexto v1 resuelve su `nombre` en backend para plan participante, stock y captura, y admite `especies[].imagen_url` opcional/nullable. ADMIN y participantes usan la misma `SubcampaniaSpeciesCard`, con foto si existe y texto conservado ante fallo; sólo la composición interna autorizada recibe `onEdit`. No consultar el catálogo interno desde la pantalla participante para completar fotos. Al recuperar una propuesta del editor se actualizan únicamente los nombres desde el plan consultado, conservando cantidades y porcentajes exactos. Los históricos conservan sus snapshots; no completar sus nombres desde el catálogo vivo.

- GET/PUT del plan requieren Bearer; no usan `x-auth-id`. Sin token no enviar petición. El detalle ofrece edición a ADMIN global en BORRADOR/ACTIVA.
- Una revisión usa un único PUT con `meta_total_arboles`, `metas`, `revision_esperada`; `plan_revision` procede de GET, incluido `0`. Sin versión no habilitar guardado ni hacer fallback por PATCH.
- El asistente y el detalle usan `revisarSubcampaniaPlan`; se retiró el cliente anterior de solo metas, su validador y sus DTO sin consumidores. El catálogo de tipos procede de `TIPO_CAMPANIA_VALUES`; el formulario conserva Arborización primero.
- Mantener la propuesta exacta al abrir/reconsultar. Cambiar meta o porcentajes usa `buildPlanMetasPayload`; el ajuste de cantidades es explícito. Cantidades/meta enteras positivas hasta `2147483647`; porcentajes en centésimas. Un 0% del borrador se omite del plan remoto; el editor requiere objetivos positivos y retirada explícita.
- 401 pide recuperar sesión, 403 bloquea edición sin inventar autorización y 404 indica recurso no disponible. Un 409 exige consultar y revisar otra vez.
- Red/5xx/confirmación incompleta: consultar antes de otra escritura, conservar propuesta, invalidar la comparación anterior y exigir confirmación nueva. No asumir que no guardó ni reintentar automáticamente.
- Antes de recuperar sesión, el borrador temporal de `sessionStorage` se vincula a subcampaña/`auth_id` verificado. No guarda token/versión para reenviar; sólo se restaura al mismo actor después de consultar el plan.
- Tras éxito actualizar detalle/plan/indicadores/contexto. Si falla esa lectura, informar actualización pendiente; no repetir el PUT confirmado.
- Meta orientativa: el avance puede superar 100%; sólo se limita el ancho de barra. Revisar plan no cambia stock, hechos, estado ni ejecuta el cierre.

Contrato/evidencia y límites: [QA del editor](docs/QA_EDITOR_PLAN_USO.md), `AUD-015` y `AUD-016`.

## Capacidades y comandos de participación

`src/modules/participacion/` centraliza acceso INT06 y registro inicial INT04. `api/participacion.transport.ts` comparte Bearer, `no-store`, cancelación y timeout de 40 s incluido el body; comandos y lecturas operativas verifican actor con capacidades del mismo token. El detalle histórico usa Bearer sin esa dependencia operativa y valida al actor en su respuesta. Multipart deja el boundary al navegador. [Detalle del módulo](src/modules/participacion/README.md).

- Consumir `useParticipacionCapabilities()` dentro del provider de `AppLayout`, sin otro cliente/provider paralelo. Completar paginación antes de publicar selección; distinguir carga, vacío, error y sesión vencida.
- C04–C09: una selección de hasta 100 IDs actuales, revisiones consultadas y confirmación explícita. Cambiar persona/acción/selección/tratamiento invalida revisión, incluso al volver a una selección anterior.
- `useAccessCommand`: un UUID por confirmación, guardado antes del POST con actor/operación/payload. `localStorage` por actor, sin tokens/nombres/búsquedas/fotos. Web Locks coordina pestañas; fallo de almacenamiento, falta de soporte o pendiente incierto bloquean nuevas confirmaciones.
- Timeout/5xx/recibo inválido/GET 202 o 404 tras envío final mantienen resultado no confirmado. Recuperar o reenviar usa exactamente UUID/payload/revisiones originales. Logout/recarga no autorizan otra clave. Inicial admite la excepción 503 `RECHAZADO` durable por `EVALUADOR_NO_DISPONIBLE`, sólo tras validar el recibo completo; una pausa/503 fuera de recibo conserva incertidumbre.
- Sólo un terminal validado acredita éxito/rechazo y permite liberar el intento. El recibo es histórico: después se consultan capacidades/miembros y nuevas revisiones.
- Inicio debe ofrecer recuperar un pendiente propio aunque se pierda la capacidad de gestión; otra cuenta no lo muestra ni recupera.
- `CommandLifecycle`/Web Locks son primitivas compartidas. `useRegistroCommand` adapta `RegistrationCommandController`: preparación/cargas, payload final inmutable y conciliación, reutilizando identidad y exclusión de INT06.
- `registrationDraftStore.ts` guarda campos/fotos/UUID/terminal en IndexedDB privado por actor y subcampaña, sin tokens ni URLs firmadas. Confirmar la transacción local antes de preparar/PUT/POST; fallo de almacenamiento o conflicto entre pestañas bloquea otra escritura. No es outbox offline ni caché pública.
- Registro inicial: `/api/v1/subcampanias/:id/contexto-registro` y participantes seleccionables; preparar/cargar con la misma identidad antes de `POST /plantaciones/iniciales`. PREPARADO/202 sin POST final permite reanudar captura; no acredita guardado. Congelar payload antes del POST; mientras sea incierto bloquear edición/intención nueva. Después de rechazo terminal y revisión explícita, otra intención genera UUID nuevos de comando/carga y vuelve a subir las fotos conservadas. Descartar clausura preparación antes de liberar bytes; no limpiar evidencias por un fallo de red.
- La captura mantiene tres pasos y confirmación final: GPS/manual, fotos propias, cantidades por especie, fecha de servidor, observaciones y participantes opcionales del ámbito. No calcular FIFO/LIFO ni enviar lotes/asignaciones; metas orientativas y saldo elegible del servidor. El detalle propio muestra snapshots y observaciones sólo del autor. Impacto público usa `/api/v1/impact/imagenes/:id` sin Bearer; Mis registros y el detalle propio cargan sus fotos históricas por `/api/v1/plantaciones/:registroId/imagenes/:evidenciaId` con Bearer, sin poner el token en URL/DOM ni abrir bucket/ruta de Storage. Una foto fallida no oculta el registro.
- Las entradas internas de inicial dirigen al formulario v1; reposición conserva su contrato interno autorizado con `es_reposicion:true`, origen del mismo ámbito y fotos con ámbito explícito. No heredar reposición por permiso contextual. Evidencia/pendientes: [informe INT04](docs/QA_REGISTRO_PARTICIPANTE_INT04.md) e [informe INT05](docs/QA_IMPACTO_INT05.md); esta guía no acredita QA completo, entorno externo ni piloto INT08.
- Para registrar, `/participar` muestra las campañas y sus subcampañas autorizadas; desde el detalle se abre la captura de ese ámbito. La página antigua `/app/participacion/registrar` redirige a `/participar`; la acción rápida interna conserva su selector dentro del panel inferior. Al conservar o descartar, el formulario vuelve al detalle de la misma subcampaña. El descarte elimina el borrador local solo después de confirmar la cancelación remota si hubo preparación. La ubicación actual se captura en `RegistroLocation`; la antigua tarjeta GPS de Plantación ya no forma parte del código activo.

## PWA y verificación

El SW se genera con Workbox en `npm run build`; no versionar `public/sw.js`. Precachear shell/assets no equivale a una outbox. No añadir caché pública de API/recibos ni sync offline sin su contrato.

`registerPwa.ts` controla actualización del shell; el estado de instalación se comparte por `PwaInstallContext`. No duplicar listeners de instalación. Cerrar la sugerencia conserva el acceso del menú; reconciliar instalación después de desinstalar. `sw.js`, HTML y manifest deben revalidarse; sólo assets con hash son inmutables.

```bash
npm run test
npm run lint
npm run build
```

El build incluye TypeScript; no hay script `typecheck`. Los tests coexisten con código en `src/**/*.test.ts(x)` y normalmente simulan servicios/HTTP. Añadir pruebas de comportamiento cuando el cambio lo requiera, no pruebas espejo para texto/estilos reversibles.

Para QA real, seguir el [índice de evidencia](docs/README.md) y el runner correspondiente. Registrar revisión, entorno, actor, peticiones, persistencia y límites. Una captura no demuestra atomicidad, un mock no demuestra autorización y un push no demuestra despliegue. Revisar estado, restricciones, cancelación, error, cuenta cambiada y respuesta perdida según el flujo.

### Detalle de subcampaña compartido (25 de octubre de 2026)

`SubcampaniaDetailRoute` resuelve esa URL exacta por audiencia: roles internos conservan `DetalleSubcampanaScreen`; participantes requieren capacidades completas del actor y ámbito antes de montar `ParticipacionSubcampaniaDetail`. El guard admite solamente el detalle, no todo Plantación. Encabezado fotográfico, pestañas redondas y tarjeta de especies reutilizan el diseño interno original. Equipo reutiliza las tarjetas, avatares, badges y buscador visual del componente logístico antiguo; sus servicios permanecen separados. El ADMIN global ve logística y participación; el administrador contextual ve participación y puede incorporar plantadores desde esa pestaña. Designar administradores sigue reservado al ADMIN global. Buscar, revisar y confirmar fija únicamente la subcampaña abierta y usa los comandos recuperables de participación; el gestor largo conserva retiros/cambios. Los participantes consumen Impacto público, contexto de registro autorizado y miembros v1 según su permiso; nunca el servicio interno como fallback. El equipo logístico interno conserva fotos cuando su respuesta las entrega; miembros v1 no entrega foto y usa iniciales. Fechas o lecturas no autorizadas se indican como no disponibles. `useParticipacionAccountNavigation` vive en `AppLayout`, fuera del provider que remonta por cuenta/token, para descartar la selección anterior. Retornos al detalle se validan con `safeParticipacionReturn`.

El detalle interno de ADMIN añade consulta de stock inicial con el mismo `useRegistroContext` y `SubcampaniaStockDisponible` del participante. Solo se consulta en ACTIVA; fuera de ese estado se informa que la lectura no está disponible, sin inventar saldo cero. El botón «Asignar stock» es visible y está deshabilitado, sin operación asociada. El contexto se comparte entre stock y mapa para conservar el polígono autorizado cuando el detalle interno no lo entrega. La revisión confirmada del plan actualiza también ese contexto.

`SubcampaniaAdminActividad` comparte una consulta paginada de Impacto entre resumen, historial y mapa. Solo el ADMIN interno tiene la pestaña **Registros**, donde `SubcampaniaAdminHistorial` ofrece responsables y detalle desplegable con `ImpactoRegistroContent` (especies, GPS, participantes históricos, fotos y seguimiento). Resumen muestra únicamente los agregados de la subcampaña (registros, plantación inicial y reposiciones), independientes de la página cargada, y un acceso a Registros. Cambiar de pestaña conserva la consulta y la paginación. El mapa reutiliza `ImpactoMapPanel`, sin habilitar edición, y prioriza polígono interno/contexto autorizado antes de la geometría pública del mismo ámbito. `pestana` y `registro` conservan sección/selección al volver de la ficha pública. Son registros publicados, no un listado administrativo completo: no usar detalle propio ni consultas internas como bypass. GENERAL/VALIDADOR y participantes mantienen su recorrido anterior. El contrato pendiente de historial privado y stock administrativo fuera de ACTIVA se registra en AUD-028.
