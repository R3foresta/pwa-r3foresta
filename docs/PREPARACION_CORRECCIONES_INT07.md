# INT07 — Cotejo frontend de componentes, contratos y bocetos

**Corte:** 20 de octubre de 2026, America/La_Paz. **Preparación documental; FE01–FE08 pendientes.** Este documento y los [bocetos estáticos](bocetos/INT07_CORRECCIONES.html) no implementan correcciones ni acreditan APIs, fixtures HTTP o QA de INT07.

Fuentes: [encargo INT07](../../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/pa-t-int07.md), [PA-S04 spec](../../r3foresta-docs/specs/plantacion/participacion-aliada/04-correccion-excepcional/spec.md), [plan](../../r3foresta-docs/specs/plantacion/participacion-aliada/04-correccion-excepcional/plan.md), [tareas](../../r3foresta-docs/specs/plantacion/participacion-aliada/04-correccion-excepcional/tasks.md) y [contrato backend INT07](../../Backend-r3foresta/docs/pa-int07-contrato.md), especialmente §§2–5.1 y 7–9. Los [ejemplos candidatos](../../Backend-r3foresta/docs/pa-int07-ejemplos-candidatos.json) ilustran diseño; no son respuestas verificadas de endpoints.

## 1. Base inspeccionada y frontera de esta entrega

| Repositorio | HEAD al iniciar | Estado observado |
| --- | --- | --- |
| PWA | `a3a4b28aa32e3c65584a107dfcfa53f11ca883ad` | Árbol limpio; INT04/05/06 existentes, sin superficies INT07. |
| Backend | `fbf25290f871e0a27ed8b077204f3dacd1320e51` | Árbol limpio; BE02 parcial, sin ejecutores/API de corrección. |
| Documentación | `9976541e8a9a7b242cced53ec4d08c9f07cd889b` | Cambios locales previos en estado/specs/tablero y ficha INT07 sin seguimiento Git. Se leyó el contenido de trabajo sin modificarlo. |

Stack comprobado: React 19, TypeScript 5.9, Vite 7, Tailwind 3, React Router 6 y Leaflet/React Leaflet. npm por `package-lock.json`; scripts `dev`, `build`, `lint`, `test`, `preview`. No existe `typecheck`; `build` incluye TypeScript.

El contrato backend §9 registra cotejos aportados del 20 de octubre y recuperación de 074/079/075/078 en desarrollo. Según ese corte, **081/082 siguen ausentes allí** y publicación/comprobación de Render de la reparación 083 sigue pendiente. Es evidencia documental de un entorno concreto, no una comprobación remota ejecutada por esta revisión frontend. La persistencia 082 aislada no demuestra motor, lecturas efectivas ni corrección operativa. T03 mantiene pendiente la frontera del escritor real de mortandad.

La integración comienza con backend verificado, APIs/OpenAPI definitivos, ejemplos completos y fixture sintético reproducible. Esta entrega no añade rutas PWA, clientes, DTO ejecutables, mocks o catálogos de corrección; no modifica SQL, backend, datos reales ni casillas del tablero.

## 2. Cotejo de componentes

Las ubicaciones siguientes existen en la revisión PWA indicada. Las responsabilidades nuevas son propuestas, no componentes implementados.

| Necesidad | Base existente | Reutilización y límite INT07 |
| --- | --- | --- |
| Entrada por registro/evento exacto | [App](../src/App.tsx), [ProtectedRoute](../src/routes/ProtectedRoute.tsx), [appAccess](../src/utils/appAccess.ts), [AppLayout](../src/layouts/AppLayout.tsx) | Sesión y árbol privado. No existe ruta de corrección; una entrada contextual necesitará excepción de navegación acotada y capacidades del servidor. No abrir todo Plantación por permiso contextual. Ruta PWA pendiente, distinta de API. |
| Cuenta y capacidades | [AuthContext](../src/contexts/AuthContext.tsx), [provider](../src/modules/participacion/components/ParticipacionCapabilitiesProvider.tsx) | Reutilizar frontera cuenta/token y cancelación. Recibir facultades exactas por caso; no deducirlas de autoría, afiliación o permiso para plantar, ni duplicar provider. |
| Transporte privado/público | [participacion.transport](../src/modules/participacion/api/participacion.transport.ts), [impacto.api](../src/modules/impacto/api/impacto.api.ts) | `requestPrivada`: Bearer, no-store, timeout de 40 s incluido body, cancelación/control de token. Lecturas públicas siguen sin Bearer/capacidades. Validadores nuevos por respuesta; 404 de objeto no equivale a 404 de recuperación. |
| Ciclo y pestañas | [commandLifecycle](../src/modules/participacion/commands/commandLifecycle.ts) | Reutilizar `CommandLifecycle` y `withPrivateCommandLock` mediante adaptador de corrección. Definir alcance de lock/pendientes entre operaciones; no crear otro motor de incertidumbre. |
| Persistencia y recuperación | [useAccessCommand](../src/modules/participacion/commands/useAccessCommand.ts), [accessCommandStore](../src/modules/participacion/commands/accessCommandStore.ts), [registrationCommandController](../src/modules/participacion/commands/registrationCommandController.ts), [registrationDraftStore](../src/modules/participacion/commands/registrationDraftStore.ts) | Referencias de comportamiento; sus esquemas solo admiten acceso o inicial. Adaptador privado tipado por actor/objeto, intención persistida antes de POST y fallo local bloqueante. Sin casts, tokens, URLs firmadas o caché pública. Sin preparación/carga de fotos ni segundo registro. |
| Revisión y confirmación | [useAccessReview](../src/modules/participacion/hooks/useAccessReview.ts), [AccessReviewSummary](../src/modules/participacion/components/AccessReviewSummary.tsx), [RegistroSummary](../src/modules/participacion/registro/components/RegistroSummary.tsx), [ConfirmDialog](../src/components/ConfirmDialog.tsx) | Reutilizar patrón de revisión y diálogo con foco/Escape; comparación nueva por caso. Cambiar objeto/caso/contenido invalida revisión/confirmación incluso si vuelve al valor anterior. Cancelar no escribe. |
| Estados de comando | [AccessCommandStatus](../src/modules/participacion/components/AccessCommandStatus.tsx), [RegistroCommandStatus](../src/modules/participacion/registro/components/RegistroCommandStatus.tsx) | Referencias visuales, props acopladas a sus dominios. Estado de corrección propio: incierto, confirmado, rechazo durable y SIN_CAMBIOS; pendiente recuperable tras retiro sin conceder nueva escritura. |
| Personas históricas | [RegistroParticipants](../src/modules/participacion/registro/components/RegistroParticipants.tsx), [AccessPersonSearch](../src/modules/participacion/components/AccessPersonSearch.tsx), [AccessPersonSelector](../src/modules/participacion/components/AccessPersonSelector.tsx) | Reutilizar presentación/cancelación, no consultas: registro exige permiso actual; acceso usa acciones de permisos y nombre/correo. Hace falta búsqueda histórica por ID/nombre, con inactivas admisibles, sin contactos/directorio abierto. |
| Formularios acotados | [RegistroSpeciesStep](../src/modules/participacion/registro/components/RegistroSpeciesStep.tsx), [UI compartida](../src/components/ui/index.ts) | Campos/tarjetas/badges, no reglas de alta. Cantidad con especies fijas, enteros positivos y confirmaciones; observaciones/participantes/reversiones separados. Sin selector de vivero/asignación o captura GPS/fecha/fotos. |
| Contexto e historial ajenos | [DetallePropioScreen](../src/modules/participacion/registro/pages/DetallePropioScreen.tsx), [registro.contract](../src/modules/participacion/api/registro.contract.ts) | Referencia de estados/snapshots; su contrato exige autoría/participación. No abrir detalle propio ajeno al administrador. Contexto/historial específico, append-only, sin editar/borrar original o auditoría. |
| Consultas/lectura propia | [ImpactoRegistroScreen](../src/modules/impacto/pages/ImpactoRegistroScreen.tsx), [ImpactoRegistroContent](../src/modules/impacto/components/ImpactoRegistroContent.tsx), [MisRegistrosScreen](../src/modules/impacto/pages/MisRegistrosScreen.tsx), [useImpactoConsulta](../src/modules/impacto/hooks/useImpactoConsulta.ts) | Conservar público independiente de sesión y filtros. Tras terminal reconsultar efectivo autorizado; no parchear saldos/agregados en PWA. P01 puede retirar filas/detalle propios. No rescatar original/fotos de revertido como fallback. |

## 3. Contratos candidatos que deben cotejarse con la entrega real

**Todas las rutas siguientes son candidatas del contrato backend §§4/5.1. Ninguna se declara disponible o autorizada para integrar.** Prefijo `/api/v1`; se registran para comparar la entrega definitiva.

| Método / ruta candidata | Contenido de diseño | Cotejo pendiente |
| --- | --- | --- |
| GET `/plantaciones/:id/contexto-correccion` | Objeto, ámbito/estado, original/efectivo, revisiones, dependencias y facultades por caso. | DTO/envelope cerrado completo y claves/razones exactas; ADMIN de registro ajeno por este contexto. |
| GET `/eventos-plantacion/:id/contexto-correccion` | Baja exacta y revisiones evento/grupo. | Forma final, tipo derivado y frontera T03 verificada. |
| GET `/plantaciones/:id/participantes-historicos-seleccionables` | `q`: ID exacto o nombre NFC/trim 3–100 caracteres; límite 20 por defecto/50 máximo, cursor firmado. | DTO/envelope, actividad y relación histórica; sin permiso operativo. No usar cursor decimal de INT05. |
| GET `/plantaciones/:id/historial-correcciones` y `/eventos-plantacion/:id/historial-correcciones` | Historial privado del ejecutor, por corrección ID DESC. | Paginación firmada y campos por audiencia; observaciones/motivo ocultos al contextual en ese caso. |
| POST `/plantaciones/:id/correcciones/observaciones` | `CORREGIR_OBSERVACIONES_PLANTACION`: `comando_id`, `revision_esperada`, `motivo`, `observaciones`. | Solo ADMIN global; null, límites/normalización y antes/después definitivos. |
| POST `/plantaciones/:id/correcciones/participantes` | `CORREGIR_PARTICIPANTES_PLANTACION`: comando, revisión, motivo y `coresponsable_ids`, set completo 0–100 sin responsable. | Altas/retiros/restauración, snapshots y efecto P01 comprobados. |
| POST `/plantaciones/:id/correcciones/cantidad` | `CORREGIR_CANTIDAD_PLANTACION`: comando, revisión registro, `revision_grupo_esperada`, motivo, `especies`, `confirmacion_error_registro`, `confirmacion_disponibilidad_fisica`. | Mismo conjunto 1–100 especies, cantidades positivas; ambos booleanos requeridos y true si reduce. Disponibilidad/distribución final del servidor. |
| POST `/plantaciones/:id/reversiones` | `REVERTIR_REGISTRO_PLANTACION`: comando, revisiones registro/grupo, motivo y causa `REGISTRO_ERRONEO` o `DUPLICADO`. | Duplicado añade `registro_vigente_id`, `revision_vigente_esperada`, `revision_grupo_vigente_esperada`; reposición exige `revision_origen_esperada`, sin causa DUPLICADO. Origen/tipo/ámbito derivados en backend; unión estricta definitiva pendiente. |
| POST `/eventos-plantacion/:id/reversiones` | `REVERTIR_BAJA_PLANTACION`: comando, `revision_esperada`, `revision_grupo_esperada`, motivo. | Solo MORTANDAD_REPORTADA; no libera stock. |
| GET `/participacion/comandos/:comando_id?operacion=...` | Recuperación común ampliada a las cinco operaciones anteriores. | Replay/terminal propios tras retiro; catálogo SQL/TS/discriminantes coordinados. Sin exigir contexto actual para reconstruir intento antiguo. |
| GET `/impact/registros/:id/estado` | Estado público mínimo separado de detalle INT05. | Sin sesión/fotos/actor/motivo/fechas de corrección; referencia solo si públicamente elegible. |
| GET `/plantaciones/mis-registros/estado`, `/plantaciones/:id/estado-propio`, `/plantaciones/:id/historial-propio` | Estado vigente/revertido e historia reducida por relación efectiva. | Schemas §5.1, cursor firmado 20/50, P01 por página y sin capacidades operativas. |
| GET `/eventos-plantacion/:id/estado-propio`, `/eventos-plantacion/:id/historial-propio` | Baja e historia propia exactas por relación con el grupo. | Revisiones evento/grupo; distinta del historial de ejecutor. |

Datos transversales a confirmar: IDs/revisiones BIGINT como cadenas canónicas (revisión admite `0`), UUID v4 minúscula, objetos cerrados, conjuntos únicos ordenados numéricamente y cantidades INT positivas. Motivo 3–1000 y observaciones null/máximo 2000 siguen como decisiones técnicas candidatas, sin fijar validación ejecutable ahora. Privado: Bearer, `private, no-store`, `Vary: Authorization`; público sin identidad y no-store.

Recibo candidato: discriminantes `CORRECCION_PLANTACION` / `CORRECCION_BAJA_PLANTACION`, IDs, caso, revisiones, cambio, estado lógico y referencia admitida. Sin motivos, observaciones, personas, fotos, asignaciones o saldos. `SIN_CAMBIOS`: `correccion_id:null`, versiones iguales y sin historia nueva. El recibo inicial conserva lo confirmado entonces, aunque el efectivo cambie después.

### Incompatibilidades del runtime actual

| Archivo / contrato | Forma cerrada actual | Tratamiento futuro |
| --- | --- | --- |
| [participacion.contract](../src/modules/participacion/api/participacion.contract.ts), `validarCapacidades` | Exactamente ocho acciones y tres capacidades globales; sin INT07. | Confirmar si facultades vienen en contexto o amplían DTO coordinadamente. Añadir campos solo desde backend rompería validación e identidad usada por INT04/06. |
| [types](../src/modules/participacion/types.ts), `OperacionAcceso` / `IntentoAcceso` / `ReciboAcceso`; `validarReciboAcceso` | C04–C09 y resultado `ACCESO`. | Adaptador/tipos/validador propios y recuperación ampliada; no cast o fallback a acceso. |
| [registro.contract](../src/modules/participacion/api/registro.contract.ts), [registroTypes](../src/modules/participacion/registroTypes.ts) | Operación fija `REGISTRAR_PLANTACION_INICIAL`, preparación/fotos; detalle exige actor relacionado. | No reutilizar recibo, almacén, preparación o detalle para autorizar corrección administrativa. |
| [impacto.contract](../src/modules/impacto/api/impacto.contract.ts) | Objetos exactos, cantidad/especies positivas y cursor decimal; sin estado/historia/procedencia nueva. | T04 conserva v1 efectivo de vigentes, excluye revertidos y añade schemas separados. No introducir cero/campos extra al DTO actual ni castear snapshots nuevos. |

Con T04, detalle público/propio v1 de revertido responde 404. Ese 404 no demuestra por sí solo una reversión: la futura PWA resuelve su estado con la lectura específica autorizada. Sin estado válido muestra no disponible/error, sin inventar causa o rescatar evidencia privada.

## 4. Casos, audiencias y límites para los bocetos

Toda escritura requiere cuenta activa, facultad vigente y subcampaña **ACTIVA**, también ADMIN global. Leer contexto no reserva revisión/saldo/autoridad. Corregir no concede alta de baja/reposición ni acceso interno general.

| Caso | Autoridad | Presentación y límite |
| --- | --- | --- |
| Observaciones | ADMIN global | Texto efectivo/propuesto y motivo; sin otros textos, fecha/GPS, responsable, cantidades o stock. |
| Participantes | ADMIN global o administrador de esa subcampaña | Responsable fijo, listas anterior/propuesta y altas/retiros/restauración. No exigir permiso actual del participante ni ausencia de bajas/reposiciones. |
| Cantidad | Ambas autoridades | Solo inicial sin bajas/reposiciones históricas, incluso revertidas. Especies fijas, efectiva/propuesta/diferencia y dos confirmaciones si reduce; sin FIFO/LIFO, saldo persistido o distribución calculados en PWA. |
| Duplicado | Ambas autoridades | Objeto que se revierte y registro que permanece, revisiones de ambos/grupos. T02 exige misma subcampaña/fecha/especies/cantidades efectivas; sin cadenas/referencia revertida. No deducir duplicidad por GPS/personas. |
| Plantación no ocurrida | Ambas autoridades | Reversión lógica y compensación efectiva una vez; conserva originales/fotos y hechos reales. No usar cero como ajuste simple. |
| Baja errónea | Ambas autoridades | Revierte mortalidad efectiva y recalcula grupo; no libera stock ni anula muerte real. T03 pendiente. |
| Reposición errónea | Ambas autoridades | Revierte aporte y consumo pendiente a REPOSICION, preserva origen; no traslada saldo al propósito inicial o Vivero. |

T01 define liberación por créditos/asignación en backend; no trasladar esa política al formulario ni asumir que LIFO de inicial aprueba reversión. Cualquier dependencia/conciliación inválida rechaza el conjunto. Fecha/GPS, especies/responsable, editor libre, reapertura, borrado/cascada y tickets quedan fuera.

| Audiencia | Información permitida y navegación |
| --- | --- |
| Público | Listas/mapa/agregados efectivos. Revertido: ficha mínima «Registro revertido», referencia vigente solo si públicamente elegible. Sin actor, motivo, fecha/revisiones de corrección, cantidades anteriores, fotos del revertido, observaciones o saldos. |
| Autor/participante efectivo | Original/efectivo e historia reducida de caso/fecha/actor snapshot mínimo; observaciones actuales solo del autor. P01 retira lista/detalle/historia al participante erróneo salvo autoría u otra relación válida. |
| Ejecutor vigente | Contexto exacto y auditoría acotada; sin perfiles/fotos privadas ajenas. En observaciones, contextual recibe `observaciones_visibles:false`, ambos textos y motivo null. Puede leer tras cierre con autoridad; escribir sigue bloqueado fuera de ACTIVA. |
| Actor recuperando | Solo recibo propio histórico tras retiro de facultad, sin contexto ajeno o nueva escritura. Requiere cuenta activa; otra cuenta no ve/recupera ese pendiente. |

P02 admite cuentas registradas hoy inactivas como participantes históricos; no reactiva cuentas/permisos. Alta nueva: nombre capturado al corregir, fecha y `ALTA_CORRECCION`; nombre histórico desconocido sigue null, afiliación `HISTORICA_NO_DISPONIBLE`. Restituir conserva snapshot histórico. No copiar perfil actual como snapshot del día del trabajo.

## 5. Guion de bocetos y estados

[Abrir bocetos HTML](bocetos/INT07_CORRECCIONES.html). Documento local con datos sintéticos, sin scripts/servicios/escritura y controles deshabilitados. La leyenda de preparación pertenece al artefacto de revisión, no al futuro flujo de campo.

| Boceto | Contenido a cotejar |
| --- | --- |
| 01 · Contexto | Objeto exacto, ámbito, responsable, original/efectivo, revisiones, dependencias e historial; acciones desde servidor. No directorio general privado. |
| 02 · Cantidad | 12→10, diferencia2 y declaraciones separadas de error/disponibilidad física; aumento independiente 10→12. Sin asignación/vivero elegidos. |
| 03/04 · Observaciones/participantes | Formularios separados; autoridad distinta, motivo, anterior/propuesta; búsqueda ID/nombre, inactiva histórica, retiro/restauración y responsable fijo. |
| 05/06 · Reversiones | Duplicado identifica quién permanece; plantación no ocurrida, baja y reposición explican efectos distintos. Dependencia rechazada no ofrece cascada. |
| 07 · Confirmación | Objeto/caso/ámbito/revisiones, responsable/actor, antes/propuesta, motivo y efecto; cancelar no escribe. |
| 08 · Recuperación | Mismo actor/clave/contenido; terminal confirmado, rechazo y SIN_CAMBIOS. Refresco efectivo fallido separado del POST confirmado. |
| 09 · Audiencias | Público mínimo y propio autorizado; conservar evidencia no autoriza mostrar fotos privadas. |
| 10 · Estados | Carga, vacío válido, error, no visible y caso no soportado separados. |

| Estado / respuesta candidata | Comportamiento futuro exigido |
| --- | --- |
| Cargando | Acciones bloqueadas y respuestas tardías descartadas al cambiar cuenta/objeto. No reutilizar facultades anteriores. |
| Vacío válido | Sin correcciones/coincidencias tras lectura exitosa; distinto de error/no visible. |
| Error/sesión vencida | Reconsultar/recuperar sesión, conservando propuesta privada. Error no significa saldo cero/sin permisos. |
| 404 `RECURSO_NO_VISIBLE` | Recurso no disponible uniforme para inexistente/ámbito ajeno. |
| Caso no soportado | Sigue sin resolver; comunicar por canal humano acordado sin ticket o mutación ficticios. |
| `CONFIRMADO` / `SIN_CAMBIOS` validados | Consultar efectivo/contextos/lecturas afectadas. SIN_CAMBIOS no fabrica historia. Fallo de refresco: actualización pendiente, sin repetir POST confirmado. |
| `RECHAZADO` durable válido | Causa y propuesta conservada, sin efecto parcial. Nueva intención exige revisión/confirmación nuevas; no sustituir revisión silenciosamente en reenvío antiguo. |
| Timeout/red/5xx/503, body/recibo inválido, GET 202 o 404 `COMANDO_NO_CONFIRMADO` | Resultado no confirmado: misma clave/actor/operación/objeto/revisiones/payload. Bloquear nueva intención/edición; consultar o reenviar intento exacto. 202 respeta `Retry-After`. |
| 422 temprano `ENTRADA_INVALIDA`/`CAMPO_NO_PERMITIDO` | Envelope externo inconcluso; no confundirlo con 422 de negocio durable `CASO_NO_SOPORTADO`/`CONTEXTO_INCOMPLETO`. Validar recibo y vínculo al intento. |
| 409 `COMANDO_REUTILIZADO` | No sobrescribir recibo/intento ni generar otra clave automáticamente; conciliar identidad/contenido originales. |
| Recarga/cuenta/pestaña/retiro | Solo pendiente del actor verificado; lock compartido y persistencia previa a POST. Tras retiro recuperar sin exigir facultad nueva. Logout no libera intención incierta. |

## 6. Entrega backend requerida para iniciar integración

| ID | Salida requerida |
| --- | --- |
| H01 | Revisión backend/DB y BE08 identificadas, APIs/OpenAPI definitivos, alcance verificado y compatibilidad/entorno. Separar aislado, destino externo, Render y evidencia histórica. |
| H02 | DTO completos de contexto/dependencias/disponibilidad/capacidades por caso, búsqueda histórica/paginación y schemas por audiencia. No basta la descripción mínima de §4. |
| H03 | Request/response HTTP completos de cinco operaciones/siete casos, revisiones/confirmaciones/causas; confirmado, SIN_CAMBIOS, rechazo, replay, recuperación tras retiro, envelope externo/202/404/503 y headers. Sin datos personales reales. |
| H04 | Fixture sintético sin servicios externos, arranque/reset reproducibles, cuentas global/contextual propio/ajeno/autor/participante/inactiva; IDs, revisiones y saldos por asignación/grupo antes/después. 082 aislada/JSON candidato no lo sustituyen. |
| H05 | Evidencia de compensaciones sucesivas y carreras con escritores reales; T03 explícita. Retiro/rol/inactivación, cierre, plan, consumo/devolución y duplicado en ambos órdenes, rechazo sin efecto parcial. |
| H06 | BE07: lecturas/aliases/bytes de fotos efectivos y P01/P02/P03, snapshots/procedencia, ACL y compatibilidad INT04/05/06; conservación de originales/recibos. |

P01–P03, ACTIVA, exclusión de cero y autoridades ya están acordados: no requieren repetición de preguntas de producto. Faltan su contrato ejecutable y evidencia. Un caso crítico sin cobertura permanece como entrega parcial sin habilitación por mocks.

## 7. Secuencia posterior y verificación prevista

| Estado | ID | Preparación disponible / ejecución pendiente |
| --- | --- | --- |
| [ ] PENDIENTE | FE01 | Inventario preparado; falta cotejar APIs/DTO runtime/errores/capacidades y fixtures HTTP reales entregados. |
| [ ] PENDIENTE | FE02 | Boceto01; faltan entrada, contexto/historial específicos autorizados. |
| [ ] PENDIENTE | FE03 | Primitivas identificadas; faltan adaptador durable, almacenamiento, recuperación y aislamiento de operaciones nuevas. |
| [ ] PENDIENTE | FE04 | Bocetos03/04; faltan formularios/búsqueda histórica sobre API verificada. |
| [ ] PENDIENTE | FE05 | Boceto02; falta cantidad y compensaciones reales BE04. |
| [ ] PENDIENTE | FE06 | Bocetos05/06/07; faltan confirmaciones/reversiones reales BE05/06. |
| [ ] PENDIENTE | FE07 | Boceto09 y T04; faltan estados/historia/agregados efectivos BE07. |
| [ ] PENDIENTE | FE08 | Matriz siguiente preparada; falta recorrido navegador → API → datos con fixture backend identificado. |

La evidencia futura se guarda separada de INT04/05/06. Estos son escenarios esperados, no pruebas ejecutadas de INT07:

| Trazabilidad | Escenario y comprobación requerida |
| --- | --- |
| CA01–03/11/18 · autoridad | Global/contextual propio/ajeno, autor/plantador sin facultad, visitante, ACTIVA/cerrada; campos extra/fecha/GPS/especies/responsable prohibidos. Contexto administrativo sin abrir detalle propio ajeno. |
| CA05/09–13 · cantidad | 10→12 con saldo5 deja3; 12→10 libera2 con ambas confirmaciones. Multiespecie/asignaciones, cambios sucesivos, insuficiencia y fecha/propósito/devolución incompatibles; entrega/Vivero intactos. Sin bajas/reposiciones históricas. |
| Participantes · P01/P02 | Alta/retiro/restauración, inactiva histórica, responsable/stock/permisos intactos y procedencia. Retirada de lectura propia por página; restauración permite leer solo con cuenta activa. |
| CA14/15 · duplicado/inexistente | Entrega100 y dos registros30: reversión deja total30/disponible70; repetición no libera otra vez. Referencia ajena/revertida/circular/cambiada y compensaciones previas; sin cascada. |
| CA06/16–18 · baja/reposición | Baja4 errónea no libera stock; reposición5 libera consumo pendiente solo a REPOSICION. Carrera contra escritor real, sin sustituirlo por UPDATE fixture. |
| CA04/08/12 · incertidumbre/carreras | Misma clave/contenido, clave reutilizada, correcciones simultáneas, respuesta perdida tras commit, cuenta/pestañas/sesión/retiro, cierre y devolución. SQL aislado con barreras/locks observados y sin doble efecto. |
| CA07 · consulta/regresión | Global/campaña/subcampaña/mapa/listas/propio efectivos; personas/organizaciones sin multiplicación; ficha revertida y bytes de fotos; público sin motivo/observaciones/actor/stock. Recibo original conservado. Regresión INT04/05/06, plan/cierre y reposición interna. |

## 8. Verificación de esta preparación

Ejecutada el 20 de octubre de 2026 sobre la revisión PWA indicada y estos cambios documentales:

| Comprobación | Resultado / alcance |
| --- | --- |
| `npm run lint` | Aprobado, salida 0. |
| `npm run build` | Aprobado, salida 0; TypeScript, Vite y generación PWA. |
| `npm run test` | 48 suites y 691 pruebas aprobadas; base existente, sin pruebas nuevas de corrección. |
| `git diff --check` | Aprobado. Cambios limitados a este documento, bocetos, índice y auditoría; sin cambios en `src/`. |
| Inspección Python de enlaces/HTML | 43 enlaces locales resueltos; diez secciones/anclas y 16 botones deshabilitados. IDs únicos, labels válidos, controles readonly/disabled, sin scripts, formularios, recursos remotos o envíos. Ocho filas FE01–FE08 pendientes. |
| Revisión de contrato/audiencias | Cotejo estático contra fuentes INT07, incluidos P01/P02/P03 y T04; sin afirmaciones de integración o cierre. |
| Vista previa en navegador | No ejecutada: el control de seguridad del navegador rechazó abrir el archivo por el protocolo `file://`. Revisión visual de escritorio/móvil pendiente; no se buscó eludir el bloqueo. |

Estos checks verifican documentación y base PWA existente, no autorización, atomicidad, recuperación o lecturas de INT07. No se enviaron peticiones candidatas, no se ejecutaron correcciones y no hay recorrido integrado de INT07 acreditado. WebAuthn real, revisión humana, remoto, despliegue/corte y piloto INT08 siguen separados.
