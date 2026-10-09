# Análisis de implementación: participación por persona y subcampaña

Fecha: 9 de octubre de 2026. Estado: análisis local para elaborar el plan; no implementa la capacidad ni aprueba sus specs.

La base existente permite conservar el formulario de plantación, los controles de evidencia/GPS y el consumo de stock por subcampaña. El cambio principal está en la autorización contextual, las lecturas permitidas y la gestión de acceso. Renombrar COORDINADOR/OPERARIO no alcanza: sus restricciones y poderes actuales difieren de los roles aprobados.

El contraste abarca código local de PWA y backend, incluidos cambios aún sin commit, y la [ficha LCO](../../r3foresta-docs/03-plantacion-module/06-LCO_registro_plantacion_organizacion.md). No acredita migraciones aplicadas, despliegue, seguridad en producción ni prueba de campo. Los resultados de pruebas de uso del frontend se registran aparte; este documento separa lo observado estáticamente de las verificaciones futuras.

## 1. Acuerdos de producto y madurez

El LCO de este incremento está cerrado y autoriza Elaboración. La [carpeta de participación aliada](../../r3foresta-docs/specs/plantacion/participacion-aliada/README.md) ya contiene cuatro unidades: registro inicial, consulta, gestión de acceso y corrección excepcional. Sus specs siguen siendo borradores; PA-S04 está bloqueada hasta diseño y verificación. El cierre de LCO no convierte esas preguntas pendientes en contratos implementados.

| Acordado para el incremento | Consecuencia para la implementación |
|---|---|
| Permiso por persona y subcampaña; PLANTADOR y ADMINISTRADOR DE SUBCAMPAÑA. | Un rol puede variar entre subcampañas; no depende de afiliación ni hay permiso de campaña. |
| Varios administradores; no retirar al último. | Adaptar cardinalidad, transiciones y validación concurrente. Solo R3Foresta designa, cambia a plantador o retira administradores. |
| Administrador contextual planta y gestiona plantadores de su ámbito. | No recibe ADMIN global ni poderes de plan, cierre, campañas, entregas, Vivero o Recolección. |
| Incorporación directa de usuarios ya registrados. | Sin solicitud pendiente ni invitación que deba aceptarse en el MVP. |
| Asignación sobre subcampañas actuales expresamente seleccionadas. | Una subcampaña futura no hereda acceso; la campaña facilita selección, no autoriza. |
| Registro grupal directo, resumen revisable y participantes identificados. | Un registro físico con un responsable real; no multiplicar cantidades por personas u organizaciones. |
| Retiro inmediato y conservación de registros. | Aplicar los cuatro casos de autorización/guardado/retiro de LCO §2. Conservar lectura propia sin restaurar equipo/stock u operación. |
| Mapa común con resumen al tocar zona y detalle progresivo. | Polígono = zona de trabajo; punto = registro grupal. Consulta y registro tienen entradas independientes. |
| Corrección excepcional central, vinculada al original e historial. | Prepararla antes del piloto; no habilita un editor general ni devolución automática de stock. |

Fuentes: LCO §§2–7 y §10; [ADR-PLA-03/04/05](../../r3foresta-docs/decisiones/02_decisiones_plantacion.md).

Antes de construir cada comportamiento quedan por acordar: correspondencia/migración de roles y acceso interno, mecanismos de revocación/idempotencia, campos publicados, detalle propio, participantes históricos, default organizacional, «Mis contribuciones» y efectos de corrección. La [spec de consulta PA-S02](../../r3foresta-docs/specs/plantacion/participacion-aliada/02-consulta-impacto-y-registros/spec.md) conserva estos pendientes; tener un portal público anterior no los resuelve.

### Plan activo ya implementado localmente

La PWA y el backend local ya incluyen la revisión atómica ADR-PLA-05: ADMIN global ajusta meta total y especies en BORRADOR/ACTIVA mediante `PUT /subcampanias/:id/plan`, con `revision_esperada`, `plan_revision` y auditoría. La [migración 062](../../Backend-r3foresta/migrations/062_subcampania_revision_plan_atomica.sql) escribe plan/meta/versión/historial juntos y comparte el bloqueo de subcampaña usado por asignación y plantación. Protege retiradas con plantación inicial o stock inicial disponible. Ver el [contrato backend de revisión](../../Backend-r3foresta/documentacion/tareas/subcampanias-revision-plan-atomica.md) y [FRONTEND_GUIDE §16.6](../FRONTEND_GUIDE.md).

Ese avance conserva metas orientativas, especies iniciales limitadas al plan, stock como límite y cierre manual por ADMIN global. Añadir una especie no crea stock; revisar la meta no cambia plantas, saldos físicos ni ACTIVA. Es una base que la nueva participación debe conservar.

Hay documentación desfasada: [DEPENDENCIAS.md, apartado ADR-PLA-05](../../r3foresta-docs/specs/plantacion/participacion-aliada/diagramas/DEPENDENCIAS.md) aún afirma en su línea 128 que el backend local solo edita BORRADOR. La ficha LCO también conserva implementación pendiente y algunas frases de «meta suficiente» en §§2/6 pese a su alineación con metas orientativas en la línea 14. La [spec PA-S01](../../r3foresta-docs/specs/plantacion/participacion-aliada/01-registro-plantacion-inicial/spec.md) ya expresa el límite por stock. Actualizar esas referencias con evidencia de versión al elaborar el plan; su antigüedad no justifica reintroducir topes ni presentar despliegue como confirmado.

## 2. Matriz de reutilización

| Pieza | Tratamiento | Ventaja | Límite o adaptación |
|---|---|---|---|
| [RegistrarPlantacionScreen](../src/modules/plantacion/screens/RegistrarPlantacionScreen.tsx), desde línea 22. | Reutilizar recorrido y adaptar orquestación. | Tres pasos, cantidades por especie, fecha, observaciones, corresponsables, resumen y comprobante; conserva campos ante rechazo. | Pantalla grande; extraer guardado/secciones al cambiar responsabilidades. Necesita resultado incierto, revalidación y detalle persistente. |
| [usePlantacionContext](../src/modules/plantacion/hooks/usePlantacionContext.ts), línea 15. | Reutilizar y ampliar contrato. | Loading/error/reintento y descarte de respuestas antiguas; formulario consume `usuario.puede_registrar`. | Consulta al montar/reintentar; acordar revalidación con formulario abierto y capacidades por acción. |
| [SpeciesCounterRow](../src/modules/plantacion/components/registro/SpeciesCounterRow.tsx) y [resolverDetallesAsignacion](../src/modules/plantacion/utils/resolverDetallesAsignacion.ts), línea 37. | Reutilizar. | Muestran objetivo/stock y distribuyen automáticamente por fecha/id; evita seleccionar lotes manualmente. | La lectura no reserva stock. Elegibilidad, propósito y consumo concurrente siguen bajo backend. |
| [PhotoUploader](../src/components/evidence/PhotoUploader.tsx), [GpsStatusCard](../src/modules/plantacion/components/registro/GpsStatusCard.tsx), `WizardHeader`, `StepFooter` y `SummaryRow`. | Reutilizar controles. | Piezas móviles enfocadas y sin dependencias nuevas; fotos locales hasta confirmar. | Alinear GPS y requisitos con contrato final; fotos seleccionadas no implican publicación común. |
| [SuccessOverlay](../src/modules/plantacion/components/registro/SuccessOverlay.tsx), línea 55. | Reutilizar comprobante y extender navegación. | Código, cantidades, evidencia y consumo confirmado; trazabilidad técnica plegada. | Solo vuelve a subcampaña. No sustituye un detalle persistente propio/colectivo. |
| [SubcampaniasOperativasSheet](../src/modules/plantacion/components/SubcampaniasOperativasSheet.tsx), línea 22. | Adaptar fuente de datos y labels. | Selector rápido ya conectado a BottomNav; mapa no obligatorio para registrar. | Depende de `equipo[]` y roles antiguos. Requiere lista autorizada con información mínima y ámbito explícito. |
| [SubcampaniaEquipoManager](../src/modules/plantacion/components/SubcampaniaEquipoManager.tsx), línea 65, y [UsersService](../src/services/users.service.ts). | Reutilizar piezas de búsqueda/listado, adaptar mutaciones. | Debounce, avatars, exclusión de duplicados y feedback por acción. | Un coordinador, operarios y gestión global ADMIN. La búsqueda/contexto deben devolver solo datos permitidos. Preferir confirmación real del cambio de acceso. |
| [DetalleSubcampanaScreen](../src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx), helpers de mapa desde línea 326. | Extraer presentación concreta cuando se necesite. | Leaflet, encuadre, polígono, estados, metas/progreso real y aislamiento de z-index. | No reutilizar la carga completa para consulta propia tras revocación: obtiene equipo y plan; faltan registros/grupos y resumen al tocar área. |
| [Organizacion](../src/modules/organizaciones/types.ts), servicios y asociación a campañas. | Reutilizar como catálogo/filtros. | Campaña ya admite varias organizaciones. | No representan membresías múltiples ni atribución histórica. No son fuente de permiso ni reparto de cantidades. |
| [PlantacionService](../src/services/plantacion.service.ts) y [plantacion.api](../src/api/plantacion.api.ts). | Conservar capas y ampliar contratos entregados. | Requests tipados, errores y acceso HTTP centralizados; revisión del plan ya preserva 409. | Evitar más lógica transversal dentro del servicio grande; separar casos de uso al agregar nuevas responsabilidades. |
| Backend [PlantacionCreationService](../../Backend-r3foresta/src/plantaciones/application/plantacion-creation.service.ts), línea 82, y [RPC 061](../../Backend-r3foresta/migrations/061_plantacion_meta_especie_orientativa.sql). | Conservar transacción y adaptar autorización/intento. | Registro, detalles, corresponsables, evidencias y consumo de asignaciones en una operación; stock compartido independiente de organización. | Los roles vigentes no representan el LCO; falta intento idempotente y orden común con revocación. |
| Backend [SubcampaniasPlantacionContextService](../../Backend-r3foresta/src/subcampanias/application/subcampanias-plantacion-context.service.ts). | Reutilizar snapshot/stock y adaptar proyección. | Plan coherente, permiso actual y FIFO; no exige organización para consumo. | Capacidad contextual nueva y lectura mínima deben especificarse. |
| Backend [ImpactService](../../Backend-r3foresta/src/impact/impact.service.ts), líneas 227/266. | Reutilizar consultas/mappers tras revisar contrato. | Ya agrega polígonos, punto por registro, especies, cantidades e impacto. | API organizada obligatoriamente por organización; DTO sin responsable/corresponsables y evidencias con publicación actual diferente del pendiente LCO. |
| Gestión masiva contextual, lectura propia tras retiro y corrección excepcional. | Pendiente de contrato e implementación. | Completa las condiciones del piloto. | No aparecen como capacidades completas en las capas frontend/backend revisadas. No simularlas con llamadas antiguas o datos locales. |

## 3. Pros y contras de la base

**Pros:** el modelo de stock por subcampaña ya permite equipos mixtos sin repartir plantas por afiliación. El registro grupal, selección de especies del plan, fotos/GPS, resumen y consumo por asignación existen. React/TypeScript/Leaflet y componentes móviles cubren el recorrido sin otra librería. La revisión 062 conserva el plan activo de forma coherente y sirve como ejemplo de conflictos/versiones para acciones que lo requieran.

**Contras:** varias pantallas y servicios concentran mucha lógica; la gestión antigua de equipo asume un coordinador único. La navegación autenticada muestra áreas internas sin capacidades contextuales. Registro tiene comprobante, pero no detalle persistente; la consulta común exige una proyección distinta del detalle operativo. La identidad y los reintentos tienen brechas que una mejora visual no corrige. El bloqueo por subcampaña ordena operaciones de stock/plan, pero serializa guardados de ese ámbito; medir concurrencia del caso real antes de decidir otro mecanismo.

Extender las piezas existentes reduce riesgo y mantiene UX conocida. Reutilizar pantallas enteras sin revisar datos/permisos acoplaría la consulta pública al equipo/stock y trasladaría reglas antiguas. Recomiendo reutilización de controles y casos de uso comprobados, con cambios pequeños de autorización y composición, evitando un refactor total previo.

## 4. Riesgos y dependencias de implementación

### 4.1 Identidad validada y acceso a módulos

El frontend envía Bearer cuando hay token y exige `x-auth-id` en [plantacion.api.ts, líneas 22–49](../src/api/plantacion.api.ts). El [controller de plantaciones](../../Backend-r3foresta/src/plantaciones/api/plantaciones.controller.ts), líneas 44–75, comprueba presencia/formato de ese header; [PlantacionAuthService](../../Backend-r3foresta/src/plantaciones/application/plantacion-auth.service.ts), línea 18, busca el usuario por ese valor. En el contraste estático no se encontró una guarda JWT general que convierta ese header en identidad autenticada para ese recorrido. Es una brecha del código local revisado, no una explotación ejecutada ni una afirmación sobre producción.

El plan debe asegurar que actor, autor, subcampaña y evidencias se autoricen desde una identidad validada del servidor. Manipular IDs o esconder botones no debe permitir operar como otra persona. El requisito de autoría actual se conserva: el frontend no ofrece responsable editable y backend resuelve responsable antes de llamar la RPC.

[ProtectedRoute](../src/routes/ProtectedRoute.tsx) solo exige sesión; [App.tsx, línea 169](../src/App.tsx) reúne módulos internos en ese árbol. [BottomNav, línea 31](../src/components/BottomNav.tsx) ofrece Recolección/Vivero/Plantación y Home muestra secciones generales. Implementar capacidades de navegación y rechazo de rutas directas según contrato; ocultar menú es UX, autorización backend es protección. Pertenencia interna o rol global no deben convertirse por inferencia en permiso universal para plantar.

### 4.2 Roles antiguos y poderes que no deben heredarse

[contracts.ts, línea 151](../src/modules/plantacion/types/contracts.ts) todavía declara `COORDINADOR | OPERARIO`; [PlantacionService, línea 1240](../src/services/plantacion.service.ts) rechaza varios coordinadores. Backend conserva índice único de coordinador en [migración 029, línea 149](../../Backend-r3foresta/migrations/029_m3_subcampania.sql) y activación usa un coordinador único en [SubcampaniasActivacionService, línea 118](../../Backend-r3foresta/src/subcampanias/application/subcampanias-activacion.service.ts). Además [PlantacionAuthService, línea 35](../../Backend-r3foresta/src/plantaciones/application/plantacion-auth.service.ts) admite ADMIN/VALIDADOR/GENERAL y excluye VOLUNTARIO, aunque el LCO contempla participación independiente/voluntaria contextual.

No mapear automáticamente administrador contextual a COORDINADOR. La [RPC de asignación 060, línea 193](../../Backend-r3foresta/migrations/060_vivero_asignacion_validar_plan_especie.sql) permite facultades físicas a ADMIN/COORDINADOR; el nuevo administrador no las obtiene según LCO §3. Migrar nombres sin separar capacidades ampliaría poderes inadvertidamente. La correspondencia, transición de registros existentes y protección del último administrador requieren diseño backend y UI.

| Acción futura | Plantador autorizado | Administrador contextual autorizado | Administración central |
|---|---|---|---|
| Plantar dentro de condiciones vigentes. | Sí. | Sí. | Acceso operativo según contrato; sin presumir permiso universal. |
| Incorporar/retirar plantadores. | No. | Solo en su subcampaña autorizada. | Según facultad central acordada. |
| Designar/cambiar/retirar administradores. | No. | No. | Sí; conservar al menos otro al cambiar/retirar uno. |
| Revisar meta/especies o cerrar subcampaña. | No por rol contextual. | No por rol contextual. | ADMIN global según ADR-PLA-05 y contrato de cierre. |
| Entregas y operaciones de Vivero/Recolección. | No por rol contextual. | No por rol contextual. | Según permisos internos existentes. |
| Leer detalle propio guardado tras retiro. | Sí, lectura propia conservada. | Aplicar contrato de lectura propia si pierde operación. | Según consulta autorizada. |

La selección masiva debe señalar persona, rol y subcampañas actuales exactas, con resultado confirmado por ámbito. Definir atomicidad o resultados parciales del contrato antes de componer una secuencia de altas; no crear rol de campaña ni herencia futura.

### 4.3 Revocación y operaciones abiertas

La [RPC 061](../../Backend-r3foresta/migrations/061_plantacion_meta_especie_orientativa.sql), desde línea 128, bloquea la subcampaña para ordenar stock/estado. El retiro actual en [SubcampaniasEquipoService, líneas 198–208](../../Backend-r3foresta/src/subcampanias/application/subcampanias-equipo.service.ts) elimina membresía con una operación independiente; no comparte un orden de bloqueo demostrado con autorización/guardado. Conservar una comprobación en la RPC no basta para acreditar los cuatro resultados exigidos por LCO §2.

Especificar punto de autorización y orden con retiro: antes de autorización rechazar sin registro ni consumo; después de autorización, terminar con validaciones normales y sin habilitar otro envío. Probar ese orden en base de datos, incluyendo retirada del último administrador y transiciones simultáneas.

El [hook de contexto](../src/modules/plantacion/hooks/usePlantacionContext.ts) consulta al entrar/reintentar. El formulario puede conservar un contexto anterior; [RegistrarPlantacionScreen, línea 337](../src/modules/plantacion/screens/RegistrarPlantacionScreen.tsx) no vuelve a consultarlo durante el guardado y ante rechazo mantiene datos. Acordar revalidación/recuperación comprensible sin borrar trabajo ni prometer permiso reservado por abrir formulario o pulsar Enviar. El backend sigue verificando permiso vigente.

### 4.4 Idempotencia, stock y resultado incierto

El [DTO de registro](../../Backend-r3foresta/src/plantaciones/api/dto/registrar-plantacion.dto.ts), la [llamada RPC](../../Backend-r3foresta/src/plantaciones/application/plantacion-creation.service.ts) y el [POST frontend](../src/api/plantacion.api.ts) no representan un intento idempotente. `saving` reduce repetición desde la pantalla, pero no recupera un resultado perdido ni evita duplicación con stock sobrante después de volver a subir fotos. Reutilizar una evidencia ya vinculada puede rechazar un nuevo POST; no devuelve por sí mismo el comprobante original.

Definir un intento estable y cómo consultar/recuperar su resultado. Distinguir error definitivo de respuesta incierta; no reenviar automáticamente un evento físico ni descartar evidencia potencialmente vinculada como si el rechazo estuviera confirmado. El cleanup actual conserva archivos locales y descarta pendientes ante error ([Registrar, líneas 396–415](../src/modules/plantacion/screens/RegistrarPlantacionScreen.tsx)); adaptarlo al contrato de resultado incierto. Ver también [tarea de seguridad/idempotencia existente](BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md).

Conservar la transacción de registro/detalles/corresponsables/evidencias/stock, stock por especie/asignación/propósito y límite duro de disponibilidad. Plantar no genera un segundo descuento de Vivero. Las metas permanecen orientativas según contexto y ADR vigentes. Idempotencia de un intento no identifica dos envíos independientes sobre el mismo trabajo físico: acordar operativamente quién registra cada grupo.

### 4.5 Consulta común, lectura propia y organizaciones

Existe una base backend de impacto: [ImpactController](../../Backend-r3foresta/src/impact/impact.controller.ts) expone dashboard, campaña, evidencia y seguimiento por organización; [ImpactService](../../Backend-r3foresta/src/impact/impact.service.ts), líneas 227/266, devuelve áreas y puntos por registro. Puede reutilizarse la consulta y agregación, pero las rutas existentes hacen obligatoria una organización, mientras el nuevo LCO la trata como filtro opcional/cambiable.

[ImpactPlantingRecord](../../Backend-r3foresta/src/impact/impact.types.ts), línea 112, contiene cantidades, especies, GPS y evidencia, pero no responsable/corresponsables. [loadEvidence, líneas 677–709](../../Backend-r3foresta/src/impact/impact.service.ts) recoge evidencias no eliminadas y construye URLs públicas; esto no equivale a una política revisada de publicación de fotos para PA-S02. Acordar la proyección antes de extenderla: campos comunes, identidades/participantes realmente registrados, fotos, GPS y acceso propio conservado.

El [controller de registros](../../Backend-r3foresta/src/plantaciones/api/plantaciones.controller.ts) no ofrece GET de detalle propio. El [GET equipo existente](../../Backend-r3foresta/src/subcampanias/api/subcampanias.controller.ts), desde línea 187, tampoco sustituye esa lectura. El detalle PWA carga subcampaña/equipo/plan juntos ([Detalle, línea 1113](../src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx)); reutilizarlo íntegro tras revocación expondría o exigiría datos operativos que el LCO no concede por historial propio.

En frontend, [MapScreen, línea 249](../src/modules/map/MapScreen.tsx) muestra Recolecciones, no impacto Plantación. [CoverageMapPreview, línea 699](../src/modules/plantacion/screens/CampaniaAdminDashboardScreen.tsx) usa SVG con posiciones ilustrativas. Reutilizar patrones Leaflet del detalle para una composición de consulta Plantación con datos reales; no trasladar la carga de Recolección ni esos puntos ficticios. El [dashboard global](../src/modules/plantacion/screens/PlantacionDashboardScreen.tsx), línea 31, también contiene actividad demo que no sirve como historial del nuevo incremento.

El filtro organizacional no debe esconder otras subcampañas autorizadas en el selector de registro. `User.organizacion` es una cadena ([auth.types.ts](../src/types/auth.types.ts)); no acredita membresías múltiples, permisos ni aportes históricos. Mantener autoría del registro y participantes históricos aparte del equipo actual y de crédito/financiación. No sumar varias veces el mismo registro si una campaña pertenece a varias organizaciones.

En resumen, sustituir «Solo tú» cuando no se declararon corresponsables merece revisión: ausencia de participantes registrados no demuestra plantación física individual. Presentar composición inicial por especie y vivos totales reportados; el modelo actual no deriva vivos por especie ni superficie ya plantada desde el polígono.

### 4.6 Corrección excepcional y preparación del piloto

La [spec PA-S04](../../r3foresta-docs/specs/plantacion/participacion-aliada/04-correccion-excepcional/spec.md) está bloqueada hasta definir casos, campos, límites, original/historial y efectos sobre cantidades/saldos/seguimientos. No se encontró una capacidad backend correspondiente en el recorrido revisado. Un botón de contacto o una edición directa de datos no acredita esa operación.

Debe ser una unidad específica de R3Foresta con revisión del administrador, actor/fecha/motivo, vínculo al original y verificación de efectos. No habilitar correcciones generales, borrado de participantes ni retorno automático de stock. Es condición del piloto operativo acordado, aunque seguimiento y edición general sean recorridos posteriores.

## 5. Contratos existentes y entregables necesarios

| Contrato verificado localmente | Uso que se puede conservar | Definición requerida para el LCO |
|---|---|---|
| `GET /subcampanias/:id/plantacion/context`. | Plan persistido, stock, reglas y elegibilidad de registro. | Identidad validada, rol/capacidades contextuales y datos mínimos permitidos. |
| `POST /registros-plantacion`. | Registro/consumo transaccional, responsable real y participantes. | Intento idempotente, recuperación del resultado y orden de permiso/retiro. |
| `POST/DELETE /registros-plantacion/evidencias-pendientes`. | Evidencia antes del guardado y descarte de pendientes. | Pertenencia de evidencia, resultado incierto, cleanup y datos publicados. |
| `GET /subcampanias` y `GET/POST/DELETE` de equipo existentes. | Catálogo operativo y mecánica vigente de gestión. | Lista autorizada mínima, roles/transiciones nuevos, varios administradores y selección masiva. No asumir compatibilidad del contrato antiguo. |
| `GET/PUT /subcampanias/:id/plan` revisado con 062. | Plan atómico, versión y protección de retiradas para ADMIN global. | Mantener este permiso separado; verificar backend/migraciones en el entorno objetivo. |
| Lecturas públicas de `v1/impact` por organización. | Mappers/agregación de áreas, registros y cantidades. | Consulta común con filtros opcionales y proyección acordada; autoría/participantes sin duplicar total. |
| Detalle propio persistente y corrección excepcional. | No disponibles como capacidad completa en los archivos revisados. | Contratos específicos antes de implementarlos; no se inventan rutas en este análisis. |

## 6. Fases recomendadas

1. **Resolver contratos y matriz contextual.** Contrastar identidad, migración de roles, facultades internas, varios administradores/último protegido, retiro, idempotencia y proyecciones de consulta. Alinear documentación desfasada con la revisión 062 local y mantener explícito despliegue pendiente. Resultado: PA-S01 y plan implementable para el comportamiento definido; borradores de las unidades relacionadas con preguntas concretas.
2. **Adaptar acceso y recorrido de registro.** Conservar wizard, controles, stock y resumen. Usar selector de subcampañas autorizadas independiente del filtro del mapa, navegación por capacidades y rechazo de rutas directas. Separar el caso de uso de guardado si aporta claridad; añadir resultado incierto/reconciliación sin refactor general.
3. **Implementar gestión contextual.** Reutilizar búsqueda/listado, con alta/retiro confirmado y transiciones centrales separadas. Incorporar selección explícita de subcampañas actuales y resultado por ámbito según atomicidad acordada. Probar varios administradores y revocación en curso.
4. **Implementar consulta común y propia.** Reutilizar geometrías/mappers backend y piezas Leaflet PWA sobre proyecciones revisadas. Mapa → resumen en la misma vista → registros/detalle; polígono y punto con significado correcto. La lectura propia revocada funciona sin consultar equipo/stock. Publicación de fotos y «Mis» se implementan solo con decisiones adoptadas.
5. **Preparar corrección excepcional e integración.** Concretar PA-S04 y verificar original/historial/efectos. Probar una versión identificada con backend y migraciones objetivo; observar acceso/registro sin guía y reconocimiento del resultado. La fecha de campo no sustituye controles preparados. Mortandad/reposición/merma y editor general mantienen sus unidades posteriores.

No se estima duración ni esfuerzo numérico sin contratos y contraste de las adaptaciones. Las fases son unidades revisables, no una aprobación de desplegar ni un requisito de construir toda la estética antes del primer recorrido.

## 7. Pruebas futuras que deciden aceptación

Las pruebas frontend con servicios simulados verifican UX; integración y base de datos deben comprobar autorización, orden concurrente y persistencia. Los escenarios siguientes son una propuesta de verificación, no resultados ejecutados para este nuevo LCO.

| Caso | Resultado esperado |
|---|---|
| Carlos afiliado a Scouts, plantador solo en Palca Norte. | Registra en Norte sin afiliación artificial; Sur rechaza y no consume stock. |
| Ana administra Norte y planta en Sur. | Gestiona plantadores solo en Norte; no designa administradores, edita plan/cierra por rol contextual ni opera Vivero. |
| Asignación masiva Norte/Sur y creación posterior de Este. | Permisos exactos en las actuales seleccionadas; Este sin herencia. |
| Cambio/retiro de administrador con dos y con uno, también simultáneamente. | Solo actor central autorizado; nunca quedan cero administradores. |
| Retiro con formulario sin enviar o envío antes de autorización. | Se rechaza sin registro/consumo; se conserva el trabajo para entender el rechazo. |
| Retiro después de autorización o tras registro guardado. | Operación autorizada termina normalmente según validaciones; no habilita nuevos envíos; original/historial se conservan. |
| Persona revocada consulta registro propio mediante URL directa. | Lee detalle propio autorizado, sin recuperar equipo, stock ni acciones operativas. |
| Header/IDs/evidencia de otra persona y rutas internas directas. | Identidad y autoridad validadas en servidor; rechazo sin efectos. |
| Doble confirmación y respuesta perdida seguida de reintento del mismo intento. | Un registro/consumo; resultado recuperable; evidencia vinculada conservada. |
| Dos personas consumen stock simultáneamente. | Solo cantidades disponibles y stock nunca negativo; errores mantienen formulario y contexto se recupera. |
| Meta 40, plantado 50; ADMIN global revisa a 60; agrega especie. | 50/60, ACTIVA, mismo stock; nueva especie sin stock hasta entrega real. Cierre manual conserva autoridad y condiciones. |
| Foto inválida, GPS dentro/fuera/no evaluable y stock cambiante. | Rechazos/advertencias según contrato final; no guardado aparente ni consumo parcial. |
| Un registro con responsable y varios participantes históricos. | Total físico único; detalle no reconstruye participantes desde roster actual ni afirma que autor plantó solo. |
| Mapa con filtro de otra organización y zona con varios registros. | Registro autorizado sigue accesible; un punto por registro y resumen en la misma vista; superficie de trabajo sin afirmación de superficie plantada. |
| Campaña asociada a varias organizaciones. | Consulta y agregación no duplican total físico ni infieren crédito de afiliaciones actuales. |
| Corrección excepcional central concurrente. | Original y autor preservados; actor/fecha/motivo/vínculo visibles; efectos acordados sobre saldos, sin devolución automática. |
| Persona de campo autorizada recorre sin guía paso a paso. | Encuentra registro, revisa datos, reconoce guardado y se comprueba cantidad/stock una sola vez; dificultades observadas quedan registradas. |

La primera prueba de campo requiere versión identificada, datos consistentes, preparación de permisos y corrección excepcional. El análisis y los tests simulados del editor de plan no acreditan por sí solos esa preparación.

## 8. Referencias de trabajo

- [AGENTS.md](../AGENTS.md), [FRONTEND_GUIDE.md](../FRONTEND_GUIDE.md) y [FRONTEND_AUDIT.md](../FRONTEND_AUDIT.md).
- [LCO de participación](../../r3foresta-docs/03-plantacion-module/06-LCO_registro_plantacion_organizacion.md), [decisiones de Plantación](../../r3foresta-docs/decisiones/02_decisiones_plantacion.md) y [handoff inicial](../../r3foresta-docs/03-plantacion-module/05_handoff_registro_plantacion_inicial.md).
- [Specs y plan inicial de participación aliada](../../r3foresta-docs/specs/plantacion/participacion-aliada/README.md) y [análisis previo de dependencias](../../r3foresta-docs/specs/plantacion/participacion-aliada/diagramas/DEPENDENCIAS.md), con el desfase de 062 descrito arriba.
- [Contrato de revisión atómica local](../../Backend-r3foresta/documentacion/tareas/subcampanias-revision-plan-atomica.md), [migración 062](../../Backend-r3foresta/migrations/062_subcampania_revision_plan_atomica.sql) y [tarea backend de seguridad/idempotencia](BACKEND_SECURITY_AND_IDEMPOTENCY_TASK.md).

Las referencias a repos hermanos requieren conservar `pwa-r3foresta`, `Backend-r3foresta` y `r3foresta-docs` juntos. Los números de línea citados corresponden al código local del análisis y pueden moverse con nuevos commits.
