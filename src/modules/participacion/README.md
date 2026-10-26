# Participación: acceso y registro inicial

El módulo reúne gestión de permisos C04–C09 (INT06) y registro participante recuperable (INT04). El permiso `ADMINISTRADOR_SUBCAMPANIA` incluye plantar; `COORDINADOR`/`OPERARIO` siguen siendo responsabilidades logísticas independientes. La afiliación no concede autoridad.

## Puntos de entrada

| Ruta PWA | Uso |
| --- | --- |
| `/app/planting/subcampanias/:subcampaniaId` | Detalle común con lecturas autorizadas según audiencia. |
| `/app/participacion/accesos` | Gestión contextual por persona y ámbitos actuales. |
| `/app/participacion/registrar` | Selector autorizado y borradores propios conservados. |
| `/app/participacion/subcampanias/:subcampaniaId/registrar` | Captura de tres pasos y recuperación del mismo comando. |
| `/app/participacion/registros/:registroId` | Detalle propio persistido, incluso tras retirar acceso operativo. |

Las entradas de registro inicial del módulo interno redirigen al formulario v1. Reposición conserva su cliente interno con `es_reposicion:true`, origen del mismo ámbito y stock REPOSICION; el permiso contextual de inicial no habilita ese recorrido.

`/participar` abre el inicio UX-01: tarjetas agrupadas por campaña, activas primero y otras después, con estado y rol del DTO. Una sola zona también requiere elegirla. `ParticipacionInicioCards` y `ParticipacionInicioMap` comparten ese conjunto completo, incluidos los ámbitos globales sin escrituras. El mapa se abre como diálogo nativo a pantalla completa, con Escape, retorno de foco y selector accesible; no pide GPS. `useParticipacionInicioMap` consulta geometrías públicas por campaña con hasta cuatro lecturas simultáneas y cancelación; los cursores de Impacto paginan registros, no las geometrías. Omite puntos individuales y nunca incorpora zonas públicas ajenas. Ausencia/no publicación de geometría conserva la tarjeta; errores permiten reintentar. No se consultan stock ni miembros desde el inicio.

Los enlaces antiguos `/participar?campania_id=…&subcampania_id=…` validan ambos IDs en capacidades y redirigen a `/app/planting/subcampanias/:id`. Una zona no disponible informa el problema sin sustituirla. Tarjetas y mapa llevan directamente a esa misma ruta. `vista=mapa`/`seleccion` representan el inicio; el regreso usa estado de navegación validado por actor. Cambiar cuenta descarta el contexto anterior desde `AppLayout`, fuera del provider de capacidades.

`SubcampaniaDetailRoute` separa las lecturas antes de montar el detalle. Roles internos conservan su pantalla; el participante usa `ParticipacionSubcampaniaDetail` tras verificar actor y capacidades completas. Ambos reutilizan encabezado fotográfico original, pestañas redondas y tarjeta de especies. Resumen, Equipo y Mapa ajustan contenido y acciones a la autorización. Equipo lee miembros solo para administrador contextual; el plantador ve la limitación pendiente de contrato. Las fechas y fotos de miembros no se inventan. Impacto aporta avance/historial público y el contexto autorizado aporta plan, saldo y polígono. Ausencia pública no significa inexistencia ni habilita consultas internas.

El formulario acepta `state.participacionReturnTo` con la ruta de detalle y sus parámetros permitidos, además del formato antiguo. Conservar/salir y descarte confirmado regresan a ese destino validado. Sin retorno válido se mantiene el selector anterior. No se modifica el envío transaccional ni se acredita con este ajuste toda UX-05.

En móvil, la subcampaña elegida presenta plantación inicial/meta y el acceso al registro antes del mapa. Disponibilidad visible, especies desplegables: la lista de stock no desplaza la acción principal. Cambiar de ámbito descarta el contexto anterior; actualizar stock suspende el acceso hasta confirmar disponibilidad. El resumen de campaña agrega solo metas públicas y se mantiene independiente del stock privado y del alcance visual del mapa.

## Organización y transporte compartido

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `types.ts`, `registroTypes.ts` | DTO v1; BIGINT y revisiones como cadenas canónicas. |
| `api/participacion.transport.ts` | Bearer, `no-store`, cancelación, timeout y errores fuera de recibo. |
| `api/participacion.api.ts`, `api/registro.api.ts` | Clientes de acceso y `RegistroParticipacionService`. |
| `api/*.contract.ts` | Validación runtime de entradas, proyecciones y recibos ligados al intento. |
| `components/ParticipacionCapabilitiesProvider.tsx` | Capacidades compartidas bajo `AppLayout`, separadas por cuenta/token. |
| `commands/commandLifecycle.ts` | `CommandLifecycle` y exclusión Web Locks compartidos por acceso/registro. |
| `commands/useAccessCommand.ts`, `commands/accessCommandStore.ts` | Envío/recuperación de acceso y metadatos en localStorage por actor. |
| `commands/useRegistroCommand.ts`, `commands/registrationCommandController.ts` | Adaptador React y `RegistrationCommandController`: captura, cargas, confirmación y conciliación. |
| `commands/registrationDraftStore.ts` | Transacciones IndexedDB de borrador, fotos, identidades y terminal. |
| `registro/` | Pantallas, componentes y contexto del registro participante. |

`AuthContext` mantiene la sesión. Ambos clientes obtienen el Bearer de `WebAuthnService.getToken()`; los comandos, su recuperación y las lecturas operativas verifican el actor mediante capacidades del mismo token. La lectura histórica `detalle-propio` usa el transporte Bearer directamente sin exigir capacidades: el backend deriva la identidad del token y la respuesta debe incluir al actor como autor o participante. `actor_id` es metadato local y no se envía como autoridad. Los datos auxiliares de usuario/`auth_id` no autentican. Las respuestas tardías de otra sesión se descartan.

El transporte usa `/api/v1`, `cache: 'no-store'`, `credentials: 'omit'` y timeout de 40 segundos que incluye el body. JSON declara su tipo; multipart deja el boundary al navegador. No incorporar API, recibos, fotos privadas ni URLs firmadas al caché público/service worker.

Consumir `useParticipacionCapabilities()` bajo el provider existente. Completa páginas y distingue `loading`, `ready`, `error` y `sessionExpired`; errores o listas parciales no habilitan acciones ni equivalen a ausencia de permisos. Una nueva captura exige capacidad `registrar_inicial`, ACTIVA y contexto vigente; `SIN_STOCK` es una respuesta válida separada de falta de permiso. Recuperar un comando propio no exige conservar permiso operativo.

## Contratos usados

| Cliente / rutas `/api/v1` | Uso |
| --- | --- |
| `ParticipacionService`: capacidades, miembros, búsqueda/revisión y C04–C09 | Gestión contextual; selección de hasta 100 ámbitos con revisiones exactas y un comando atómico. |
| `GET /subcampanias/:id/contexto-registro` | Actor/ámbito, plan y revisión, polígono, especies/saldo elegible y fechas del servidor. |
| `GET /subcampanias/:id/participantes-seleccionables` | Personas opcionales del mismo ámbito; búsqueda/paginación mínima, sin actor duplicado. |
| `POST /participacion/comandos/preparaciones` | Fija UUID/ámbito; devuelve PREPARADO o un recibo terminal histórico. |
| `PUT /participacion/comandos/:comando/cargas/:carga` | Una `foto` multipart, con `?operacion=REGISTRAR_PLANTACION_INICIAL`. |
| `GET /participacion/comandos/:comando/cargas`, `GET /participacion/cargas/:carga/preview` | Conciliar cargas propias y obtener preview temporal del derivado. El listado usa la misma query de operación. |
| `POST /participacion/comandos/:comando/descarte-preparacion` | Clausura preparación; no reabre un terminal ni elimina evidencias vinculadas. |
| `POST /plantaciones/iniciales`, `GET /participacion/comandos/:comando?operacion=REGISTRAR_PLANTACION_INICIAL` | Confirmar intención congelada y recuperar recibo propio. |
| `GET /plantaciones/:id/detalle-propio`, `GET /impact/imagenes/:evidenciaId` | Detalle privado histórico; fotografía binaria pública elegible sin Bearer, nunca original/pendiente. |

Los validadores rechazan campos desconocidos, IDs numéricos, proyecciones privadas adicionales y conjuntos duplicados/incompletos. El recibo de inicial debe coincidir con UUID, operación, actor, ámbito, fecha, especies/cantidades, total y revisión inicial `"0"`; sin payload final local, la recuperación valida identidad y consistencia interna del resultado histórico.

## Captura y almacenamiento

El recorrido conserva tres pasos: **fotos/ubicación → especies/cantidades/fecha/observaciones → participantes/resumen/confirmación**. «Hoy» procede del contexto de servidor (`America/La_Paz`); coordenadas admiten seis decimales y entrada manual. Exterior es permitido con evaluación del backend. La meta orienta: el límite de cantidad es el saldo elegible. El cliente no reparte lotes/asignaciones ni calcula LIFO; envía especies/cantidades en un solo POST.

El segundo paso recupera el contador visual `− / +` de `20157dc` y conserva entrada numérica directa. `+` se detiene en `saldo_elegible`; `−` resta de una en una incluso si una propuesta anterior supera un saldo actualizado. El valor no se recorta automáticamente. El contexto v1 no trae plantado previo ni pendiente, por lo que la tarjeta no presenta la antigua barra de avance acumulado.

El primer paso solicita GPS automáticamente cuando no existe un punto conservado. Puede corregirse en el mapa o con coordenadas; una corrección manual invalida respuestas GPS tardías. Si el GPS responde durante una carga, el componente conserva el punto hasta poder persistirlo. El navegador sigue gestionando el permiso de ubicación.

Seleccionar fotos inicia preparación/subida automáticamente, también al retomar archivos locales pendientes. Se cargan hasta dos archivos independientes por tanda, con persistencia serial de sus resultados y las mismas claves/bytes. Ante una respuesta perdida se consulta el listado una vez sin repetir el PUT; si sigue incierta, se detiene la cola y se ofrece reintento explícito. Nunca se envía automáticamente el registro final. Miniaturas locales inmediatas, progreso conjunto y metadatos desplegables; el derivado remoto sólo se solicita si el navegador no puede mostrar el original. La miniatura no acredita disponibilidad: «Lista» requiere confirmación del servidor.

Tras un envío final incierto, «Comprobar guardado» sólo hace GET. «Reintentar envío» consulta primero el mismo comando: muestra su terminal si existe, o repite una vez el payload congelado cuando el error permite `MISMA_CLAVE`. No repite ante sesión/permisos inválidos ni respuestas incompatibles. Un GET202 válido se explica como ausencia de resultado confirmado, sin interpretarlo como rechazo, guardado ni permiso para otra clave. El mensaje de pausa503 procede del servidor; las fotos disponibles no acreditan que la escritura inicial esté habilitada. Diagnóstico local y límites: [guardado en subcampaña51](../../../docs/QA_REGISTRO_GUARDADO_51.md).

`useRegistroCommand(actorId, scopeId)` expone `updateDraft`, `addFiles`, `removeFile`, `prepare`, `upload`, `recover`, `confirm`, `retrySame`, `cancel` y `newIntent`. El controlador comparte lifecycle/exclusión con INT06 y añade etapas de preparación/carga, sin un segundo mecanismo de identidad.

IndexedDB `r3foresta-participacion`, store `registro_commands`, conserva el borrador por `actor_id:subcampania_id`: campos, archivos privados, UUID de comando/carga, estado de cargas y payload/terminal cuando existen. No guarda tokens ni URLs firmadas. Cada modificación se confirma en una transacción local antes de la petición dependiente; Web Locks coordina pestañas de la misma cuenta/ámbito y la revisión local detecta propuestas obsoletas. Falta de soporte, cuota, registro incompatible o conflicto bloquean escrituras nuevas. Es recuperación local, no una outbox offline.

1. Conservar identidad/ámbito antes de preparar y UUID/bytes de cada archivo antes de su PUT. Admitir 1–10 fotos de hasta 10 MiB; una miniatura no acredita carga válida.
2. Tras recarga, consultar el comando/listado antes de reenviar. PREPARADO/202 sin POST final permite retomar captura con la misma clave; un 404 conserva esa clave para conciliar o repetir preparación. Una preparación terminal se muestra sin habilitar cargas nuevas.
3. Al confirmar, persistir y congelar payload completo antes del POST. Desde entonces, resultado incierto bloquea edición/nueva intención; recuperar o repetir conserva UUID, fecha, revisiones, cantidades, personas y fotos exactas.
4. La sesión original puede recuperar el comando después de logout/recarga; otra cuenta no abre ese borrador ni sus fotos. Nunca eliminar una identidad incierta por tiempo transcurrido.

En acceso, `useAccessCommand` conserva sólo metadatos en `r3foresta:participacion:acceso:v1:<actor_id>`, sin fotos/nombres/búsquedas/tokens. Cambiar persona/acción/selección/tratamiento invalida su revisión. Confirmar genera un UUID y guarda la intención antes del POST.

## Terminales, descarte y nueva intención

| Respuesta | Consecuencia |
| --- | --- |
| `CONFIRMADO` válido | Mostrar código/ID reales y detalle persistido; el recibo es histórico. Consultar capacidades/contexto para nuevas operaciones. |
| `RECHAZADO` durable válido | Sin efectos de ese comando; conservar propuesta permitida y exigir revisión explícita, sin reducir cantidades ni retirar personas automáticamente. |
| 503 `RECHAZADO` / `EVALUADOR_NO_DISPONIBLE` válido | Rechazo terminal exclusivo del contrato de inicial; permite revisar otra intención. El HTTP por sí solo no basta. |
| Timeout, red, otros 5xx, recibo incompatible o GET 202/404 tras POST final | Resultado no confirmado; conservar identidad/payload y consultar o repetir exactamente. La pausa de escritura también conserva esa incertidumbre. |
| `PREPARACION_CANCELADA` terminal | Mantener resultado de clausura; no reabrir esa clave ni tratarla como conflicto genérico de contenido. |
| 401 | Recuperar sesión del actor original sin borrar identidad pendiente. |

Después de un terminal, `newIntent` requiere acción explícita. Un rechazo ordinario conserva datos/fotos permitidos y reinicia revisión; genera otras identidades de comando/carga y vuelve a subir los bytes. No existe transferencia de cargas entre preparaciones. El descarte clausura por API antes de liberar fotos locales; si hubo POST incierto, primero concilia. Un confirmado o cancelación terminal libera bytes locales conservando su comprobante; las cargas omitidas se limpian mediante backend.

`detalle-propio` representa snapshots, nunca perfiles actuales reconstruidos: autor/participante histórico puede consultar tras retirar permiso operativo; observaciones sólo para autor. Su frontera visual incluye cuenta, token y registro para ocultar respuestas de la sesión anterior. [Impacto y Mis registros INT05](../impacto/README.md) agregan consulta pública independiente de sesión/capacidades y una lista propia autenticada, sin cambiar los contratos de los comandos INT04/INT06. El selector de registro conserva borradores tras retirar la habilitación y actualiza la última campaña usada por la misma cuenta.

## Verificación y límites

Ejecutar `npm run test -- src/modules/participacion`, `npm run lint` y `npm run build` al cambiar estos flujos. Los mocks no acreditan autorización, Storage ni consumo real. El [informe INT06](../../../docs/QA_GESTION_ACCESOS_INT06.md) y el [informe INT04](../../../docs/QA_REGISTRO_PARTICIPANTE_INT04.md) registran versiones, entorno, pruebas y pendientes; esta guía no declara cerrado el QA.

La aplicación/cotejo SQL y Storage remotos, WebAuthn real, revisión humana y despliegue/piloto INT08 conservan su evidencia separada; la integración pública/propia INT05 se documenta en su [informe de QA](../../../docs/QA_IMPACTO_INT05.md). El launcher D local usa datos/PostGIS/objetos sintéticos y no habilita participantes reales.
