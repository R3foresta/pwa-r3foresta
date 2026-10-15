# Participación: gestión de acceso

Este módulo implementa la interfaz PA-T-INT06 para permisos por persona y subcampaña. La ruta es `/app/participacion/accesos`. El permiso `ADMINISTRADOR_SUBCAMPANIA` incluye participación; `COORDINADOR` y `OPERARIO` siguen siendo responsabilidades logísticas independientes. Ninguna acción cambia roles globales, plan, stock o registros históricos.

## Organización

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `types.ts` | DTO v1 y unión discriminada de intentos/recibos C04–C09. |
| `api/participacion.api.ts` | Cliente privado, Bearer, aislamiento de sesión y timeout. |
| `api/participacion.contract.ts` | Validación estricta de entradas, lecturas y semántica del recibo. |
| `components/ParticipacionCapabilitiesProvider.tsx` | Consulta compartida de capacidades por cuenta y paginación completa. |
| `hooks/useParticipacionCapabilities.ts` | Acceso al estado compartido y a `refresh()`. |
| `hooks/useAccessReview.ts` | Lectura de revisiones para la selección y construcción del resumen. |
| `commands/accessCommandStore.ts` | Persistencia por actor y exclusión entre pestañas. |
| `commands/useAccessCommand.ts` | Envío, recuperación, reintento y estados del comando. |
| `components/` y `pages/` | Selección, miembros/búsqueda, consecuencias, confirmación y resultados. |

## Sesión, capacidades y lecturas

`AuthContext` conserva la sesión de la aplicación. `ParticipacionService` obtiene su Bearer mediante `WebAuthnService.getToken()`; los datos auxiliares de usuario y `auth_id` no acreditan autoridad. Antes de enviar o recuperar un intento, vincula su `actor_id` local con el actor devuelto por capacidades para ese mismo token. El actor nunca se transmite en el body.

Las peticiones usan `/api/v1`, `cache: 'no-store'` y `credentials: 'omit'`. Las respuestas privadas no se incorporan al caché del service worker. El cliente descarta respuestas cuando cambia el token, admite cancelación y limita a 40 segundos la espera completa, incluida la lectura del body. Un timeout conserva la incertidumbre sobre una escritura.

El provider se monta bajo `AppLayout`, separa su estado por cuenta/token y consulta nuevamente al recuperar foco o mostrar la página. Completa la paginación antes de publicar una lista seleccionable y rechaza cursores repetidos, ámbitos duplicados o cambios de identidad/autoridad entre páginas. Sus estados son `loading`, `ready`, `error` y `sessionExpired`. Un error puede conservar el último dato para informar, pero bloquea acciones nuevas; una respuesta vacía válida se representa por separado.

Para integrar otra pantalla, consumir `useParticipacionCapabilities()` dentro del provider existente. Usar las acciones del DTO, sin derivarlas de afiliación o logística ni crear un segundo cliente de capacidades. La consulta pública de Impacto debe permanecer independiente de esta sesión y de sus fallos.

| Método de `ParticipacionService` | Uso |
| --- | --- |
| `capacidades(options?, signal?)` | Página de capacidades propias; acepta campaña, cursor y límite hasta 100. |
| `miembros(subcampaniaId, options?, signal?)` | Miembros autorizados, sin duplicar la presencia global. |
| `buscar(input, signal?)` | POST privado por nombre o correo exacto; máximo 20 resultados por página. |
| `revisar(input, signal?)` | Permiso y revisión de una persona en los ámbitos exactos solicitados. |
| `enviar(intento, signal?)` | Un POST atómico C04–C09 para toda la selección. |
| `recuperar(intento, signal?)` | GET del recibo propio por UUID y operación. |

Los IDs BIGINT y revisiones son cadenas decimales canónicas, incluidas las revisiones `"0"`; no convertirlos a `number`. Los validadores rechazan campos desconocidos, correos/contactos en proyecciones mínimas, enums ajenos y resultados incompletos. La revisión debe corresponder a la persona y al conjunto exacto de ámbitos pedidos. Cambiar persona, acción, tratamiento del saliente o selección invalida el resumen anterior.

## Confirmación y recuperación

Las operaciones son `OTORGAR_PLANTADOR`, `RETIRAR_PLANTADOR`, `DESIGNAR_ADMINISTRADOR`, `CAMBIAR_ADMINISTRADOR_A_PLANTADOR`, `RETIRAR_ADMINISTRADOR` y `REEMPLAZAR_ADMINISTRADOR`. Las acciones sobre administradores requieren las capacidades centrales correspondientes. La selección admite hasta 100 ámbitos actuales; «todas» fija sus IDs y no incluye ámbitos futuros. No dividirla en un POST por subcampaña ni actualizar revisiones para reenviar silenciosamente.

`useAccessCommand(actorId)` recibe un `AccessCommandDraft` después de la confirmación explícita y expone `confirm`, `recover`, `retrySame` y `resetTerminal`. Sus estados son `idle`, `sending`, `unconfirmed`, `confirmed`, `rejected` y `sessionExpired`; `busy` distingue una consulta/envío activo. Al montar, un intento conservado inicia una consulta de recuperación.

El store genera `crypto.randomUUID()` una sola vez y guarda el intento antes de cualquier POST en `r3foresta:participacion:acceso:v1:<actor_id>`. Ese registro contiene versión, actor, operación, personas/ámbitos, revisiones y UUID. No guarda tokens, nombres, consultas de búsqueda ni fotos. Es información privada local para conciliar la operación; no acredita permisos ni que el servidor haya recibido el comando.

`navigator.locks` coordina la reserva, el envío y la liberación del comando entre pestañas de la misma cuenta. El intento queda congelado en memoria. Si ya existe un comando incierto, falla la persistencia, el registro local está dañado o falta Web Locks, se bloquean nuevas confirmaciones. Sin Web Locks todavía puede consultarse un recibo, pero no se libera el almacenamiento mediante una escritura sin coordinación. Deshabilitar el botón no sustituye estas protecciones ni la idempotencia del backend.

| Resultado | Comportamiento |
| --- | --- |
| `CONFIRMADO` validado | Mostrar lo ocurrido, incluidos `SIN_CAMBIOS`; liberar el intento local y actualizar las lecturas vigentes. |
| `RECHAZADO` validado | Informar rechazo de toda la selección; otra intención exige lectura y confirmación nuevas. |
| Red, timeout, 5xx, recibo incompatible o GET 202/404 | Mantener `unconfirmed`, conservar UUID/payload y ofrecer consulta o reenvío idéntico. |
| 401 | Solicitar sesión del actor original; mantener la identidad pendiente. |
| Recarga o cierre de pantalla | Restaurar el intento de esa cuenta y consultar su resultado antes de una nueva confirmación. |
| Cambio de cuenta | Desmontar consultas/estado anteriores; la nueva cuenta no muestra ni recupera el intento de la anterior. |

El cliente valida comando, operación, fecha terminal, ámbitos/personas exactos, transiciones permitidas y revisiones anteriores/nuevas. `SIN_CAMBIOS` exige conservar permiso y revisión; un cambio real incrementa la revisión una vez. En reemplazo se verifican saliente y entrante. Un error fuera del recibo mantiene `resultado_concluyente: false`, incluso con HTTP 409/422; sólo el recibo durable válido acredita rechazo. No generar otro UUID por un fallo de transporte, logout o ausencia del resultado.

Un recibo es histórico: acredita lo ocurrido al ejecutar ese comando. Después se consultan capacidades y miembros, y se exige una revisión nueva antes de otra confirmación. Recuperar un éxito anterior no restaura permisos retirados después. Si falla la limpieza local tras recibir un terminal, se conserva el aviso y su identidad hasta poder liberar el almacenamiento de forma coordinada.

## Reutilización por INT04 y límites

INT04 debe reutilizar el provider/cliente de capacidades y las reglas de identidad, validación y recuperación. El hook/store actual está tipado para comandos de acceso C04–C09. Para incorporar `REGISTRAR_PLANTACION_INICIAL`, extender o extraer las primitivas compartidas con su DTO, recibo, preparación y evidencias propios; no enviar un registro usando el contrato de acceso ni construir una recuperación paralela con otra clave.

Las pruebas del módulo cubren contratos, aislamiento, selección/confirmación y conservación del comando con servicios simulados. Ejecutar `npm run test -- src/modules/participacion`, además de `npm run lint` y `npm run build`, para verificar cambios. Los mocks y ejemplos HTTP no acreditan por sí solos el recorrido navegador → API → DB.

Esta documentación no declara cerrado el QA integrado de INT06 ni habilitado el piloto. Permanecen fuera de ese cierre la regresión compartida de INT02-D, el recorrido completo de Impacto y WebAuthn, y la verificación en un entorno externo identificado. El formulario participante, las evidencias de plantación y las acciones administrativas de rol/baja tienen sus entregas independientes.
