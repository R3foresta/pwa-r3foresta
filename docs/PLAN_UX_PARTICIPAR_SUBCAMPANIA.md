# Plan UX — Inicio de participación y detalle de subcampaña

Actualización confirmada el 25 de octubre: conservar la estructura visual original del detalle interno y usar `/app/planting/subcampanias/:id` para todas las audiencias, con lecturas y acciones según autorización. Participar queda como inicio; sus enlaces antiguos redirigen al detalle del ámbito solicitado. Ver [restauración](QA_RESTAURACION_DETALLE_SUBCAMPANIA.md).

Fecha: 24 de octubre de 2026. Estado: **antecedente de planificación**. Los acuerdos se desarrollaron en el [paquete de specs UX](specs/participacion-ux/README.md), que es la referencia vigente para implementar. Este documento conserva el contexto de la llamada; sus preguntas iniciales no reabren decisiones confirmadas.

## Acuerdos confirmados al cerrar la llamada

- Inicio con tarjetas de subcampañas agrupadas por campaña y alternativa de mapa a pantalla completa; ambas permiten entrar al detalle de subcampaña.
- Gestionar equipo significa dar o quitar permisos para registrar en la subcampaña, incluyendo la gestión de administradores según las facultades vigentes. No significa modificar responsabilidades logísticas.
- Los plantadores pueden consultar **foto, nombre y rol** de las personas del equipo, sin datos de contacto. Si no hay foto, presentar un avatar neutro. La foto debe proceder de una lectura autorizada; el contrato administrativo consultado todavía no la incluye ni autoriza la lectura del equipo al plantador.
- Después de guardar un registro, volver a la misma subcampaña conservando filtros y contexto de navegación. Conservar los borradores pendientes que correspondan; un registro confirmado conserva su comprobante y no se reabre como borrador para volver a enviarlo.
- Estos acuerdos cierran las decisiones principales de UX. Quedan detalles de presentación y dependencias de contrato por resolver antes de implementar; no amplían permisos de backend por sí mismos.

## 1. Objetivo y lectura de las notas

Que una persona pueda reconocer dónde participa, entrar a una subcampaña y realizar su tarea con información y acciones acordes a sus permisos.

Las dos pantallas tendrán responsabilidades complementarias:

- **Pantalla 2 — Inicio de participación:** responde «¿En cuáles participo y a cuál quiero entrar?».
- **Pantalla 1 — Detalle de subcampaña:** responde «¿Qué está pasando aquí y qué puedo hacer?».

Recorrido propuesto: **Inicio → Elegir subcampaña → Consultar / Registrar plantación / Gestionar equipo → Volver a la misma subcampaña**.

La campaña agrupa subcampañas; el ámbito operativo y los permisos son de la subcampaña. Se representa mediante tarjetas de subcampañas agrupadas por campaña, según lo confirmado en la llamada.

### Pedidos explícitos de las notas

- Conservar como base el encabezado de la pantalla 1: foto, fechas y avance.
- Mantener las secciones Resumen, Equipo y Mapa, adaptando su contenido a quien consulta.
- Aprovechar el mapa de la pantalla 2 dentro del detalle de subcampaña.
- Convertir `/participar` en un inicio que permita acceder a las campañas/subcampañas de la persona.
- El plantador no necesita los indicadores de eventos, superficie ni lotes asignados.
- Cambiar «Mix de especies» por **«Especies de plantas»**.
- El administrador R3foresta necesita acceso a asignaciones y edición autorizada del plan.
- El administrador de subcampaña necesita gestionar su equipo; el plantador, consultarlo.
- Evaluar tarjetas y una vista alternativa de mapa para elegir dónde participar.

Estos pedidos expresan el objetivo de UX. Su traducción a permisos y operaciones debe respetar los contratos actuales o acordar expresamente su ampliación.

## 2. Specs propuestas

Los identificadores UX-01 a UX-05 organizan este borrador; no sustituyen los identificadores oficiales de Participación Aliada.

### UX-01 — Inicio «Mis campañas»

**Historia:** como participante, quiero reconocer mis lugares de trabajo y entrar rápido al que necesito.

**Decisión confirmada en la llamada:** el inicio muestra tarjetas de subcampañas agrupadas por campaña. Cada tarjeta permite entrar al detalle de esa subcampaña, sin una pantalla intermedia de selección de campaña.

Contenido mínimo propuesto de la tarjeta:

- Nombre de la subcampaña y campaña a la que pertenece.
- Ubicación comprensible, si existe en la información disponible.
- Estado y vínculo de la persona con ese ámbito: plantador o administrador.
- Acción «Entrar a la subcampaña».
- Foto y avance como datos secundarios, si ayudan a reconocerla sin recargar el inicio.

**Decisión confirmada en la llamada:** además de las tarjetas, el inicio ofrece una vista alternativa de mapa que ocupa toda la pantalla. Desde ese mapa se puede seleccionar y acceder a la subcampaña en la que se quiere trabajar. No es un mapa pequeño junto a las tarjetas. Debe existir un control claro para volver a la vista de tarjetas. El gesto exacto de entrada (toque directo o selección y botón «Entrar») queda como detalle de diseño pendiente, sin bloquear este acuerdo.

Ambas vistas deben representar el mismo conjunto de subcampañas. Una zona sin geometría sigue disponible en tarjetas. El inicio debe funcionar sin GPS y sin esperar que cargue el mapa.

**Criterios de aceptación propuestos:**

1. La persona distingue dónde puede participar sin tener que explorar todas las campañas públicas.
2. Si solo tiene una subcampaña, puede entrar con una acción; no se propone redirección automática sin acordarla.
3. Si administra una zona y planta en otra, cada tarjeta refleja su relación con esa zona.
4. Volver desde el detalle conserva la vista y selección del inicio.
5. Carga, error de consulta y ausencia confirmada de asignaciones tienen mensajes distintos.
6. Sin asignaciones se explica cómo coordinar la habilitación y se ofrece explorar Impacto; no se promete autoinscripción.
7. Los pendientes propios de registro o gestión siguen siendo recuperables aunque ya no aparezca el ámbito como operable.

**Por decidir:** orden de las tarjetas; tratamiento de cerradas; inicio del administrador global, que tiene acceso a más ámbitos que un voluntario; entrada de visitantes sin sesión.

### UX-02 — Detalle compartido de subcampaña

**Historia:** como persona que participa en una subcampaña, quiero encontrar su contexto, avance y acciones en un único lugar reconocible.

Estructura propuesta:

1. Encabezado con campaña, nombre de subcampaña, foto, estado, fechas y avance.
2. Acción principal «Registrar plantación» cuando esté habilitada. Quien administra también puede plantar según sus capacidades actuales.
3. Pestañas **Resumen / Equipo / Mapa**.
4. Acciones administrativas dentro de su contexto, sin competir visualmente con el registro en campo.

**Resumen:** avance, especies de plantas y acceso al historial. Para administradores, datos operativos adicionales que se acuerden en UX-03.

**Especies de plantas:** conservar la distinción entre lo planificado, lo plantado y lo disponible. El nombre más sencillo no debe presentar la meta como stock disponible ni mezclar cantidades de fuentes distintas. Decidir qué cantidades ve cada perfil.

**Mapa:** abrir centrado en la subcampaña actual, con su polígono y plantaciones disponibles. Tocar un registro permite consultar su detalle y volver al mismo contexto. Ver toda la campaña, si se mantiene, debe ser una ampliación explícita del alcance.

**Historial:** conservar acceso a las plantaciones sin confundir cantidades grupales con aportes individuales. Ocultar el contador «Eventos» al plantador no significa ocultar los registros. Decidir si el historial queda dentro de Resumen o necesita una sección propia.

**Criterios de aceptación propuestos:**

1. El encabezado y la navegación son reconocibles para los tres perfiles.
2. El plantador encuentra cómo registrar sin recorrer indicadores administrativos.
3. Foto ausente, mapa no disponible y ausencia de plantaciones no dejan una pantalla vacía ni muestran datos inventados.
4. El fallo del mapa no impide leer el resumen o usar las acciones que sí estén verificadas.
5. Avance, fechas y estado conservan su significado actual; la meta no se convierte en límite artificial de registro.
6. Compartir dirige a la consulta pública correspondiente, sin exponer equipo privado, stock o borradores.

### UX-03 — Información y acciones según permisos

**Historia:** como usuario, quiero ver lo que necesito para mi tarea sin confundir mi rol en una zona con mis permisos en todas las demás.

Matriz de intención de UX, pendiente de resolver las filas marcadas:

| Contenido / acción | Plantador | Administrador de subcampaña | Administrador R3foresta |
| --- | --- | --- | --- |
| Foto, fechas, estado y avance | Ver | Ver | Ver |
| Especies de plantas | Ver; cantidades por decidir | Ver | Ver y editar plan si está permitido |
| Mapa e historial visible del ámbito | Ver | Ver | Ver |
| Registrar plantación inicial | Según capacidad, estado y disponibilidad | Según capacidad, estado y disponibilidad | Según capacidad, estado y disponibilidad |
| Contador de eventos y superficie | Ocultar en resumen | Por decidir | Disponible según necesidad |
| Lotes asignados | Ocultar | Por decidir | Consultar según contrato |
| Acción de asignaciones | No | No por permiso contextual | Sí, con destino y contrato por verificar |
| Consultar equipo | Pedido; falta resolver lectura autorizada | Sí, según contrato de miembros | Sí, según contrato de miembros |
| Incorporar / retirar plantadores | No | Según capacidades vigentes | Según capacidades vigentes |
| Cambiar responsables logísticos | No por ser plantador | No se concede por permiso contextual | Flujo interno autorizado |
| Designar / reemplazar administradores | No | Según capacidades vigentes; UX por definir | Según capacidades vigentes |

El permiso contextual no abre Vivero, Recolección, asignaciones físicas, reposiciones ni edición del plan. El frontend usa capacidades vigentes por ámbito; ocultar botones no sustituye la autorización backend.

**Criterios de aceptación propuestos:** una misma persona puede tener experiencias distintas en dos subcampañas; un error al consultar permisos no se presenta como «no tienes permisos»; una restricción relevante para su tarea explica el motivo; las rutas directas también respetan el acceso.

### UX-04 — Equipo: consultar y gestionar

**Historia del plantador:** reconocer a las personas con las que participa mediante su foto, nombre y rol. **Contenido confirmado en la llamada**, sin datos de contacto.

**Historia del administrador contextual:** incorporar o retirar personas autorizadas para plantar en su subcampaña, entendiendo las consecuencias.

Hay dos conceptos actuales que el diseño debe hacer comprensibles:

- **Permiso de participación:** PLANTADOR / ADMINISTRADOR_SUBCAMPANIA.
- **Responsabilidad logística:** COORDINADOR / OPERARIO.

Una persona puede tener ambos. Administrar la subcampaña no la convierte automáticamente en coordinador; retirar permiso de participación no equivale a borrar su historia ni modificar su responsabilidad logística.

**Acuerdo confirmado:** lista de personas con foto, nombre y rol. Gestionar el equipo consiste en otorgar o retirar permisos de participación, incluyendo administradores según capacidades; no en cambiar responsabilidades logísticas. Usar etiquetas comprensibles. Acciones explícitas «Añadir plantador» y «Retirar acceso para plantar» para gestión contextual. La gestión logística conserva sus acciones y autorización propias. Evitar un botón genérico «Eliminar persona».

Recorrido propuesto para incorporar: **Equipo → Añadir plantador → Buscar persona existente → Revisar persona y subcampaña → Confirmar → Resultado confirmado → Lista actualizada**.

Recorrido para retirar: **Elegir persona → Revisar qué acceso se retira y en qué subcampaña → Confirmar → Resultado confirmado**. No se borra la cuenta ni sus plantaciones históricas. Si se gestionan administradores, conservar las protecciones del último administrador y el reemplazo atómico.

**Dependencia concreta:** el contrato consultado restringe `GET /api/v1/subcampanias/:id/miembros-participacion` a ADMIN global o administrador contextual. No usar esta lista administrativa para el plantador ni reconstruirla desde autores históricos. Antes de implementar su vista de Equipo hay que disponer de un contrato autorizado para la audiencia y los campos acordados: foto, nombre y rol. La respuesta administrativa actual tampoco incluye foto. El selector de participantes del formulario no se asume equivalente a un directorio del equipo.

**Criterios de aceptación propuestos:** el plantador no recibe controles de edición; cada confirmación identifica persona, ámbito y consecuencia; los errores conservan la propuesta; una respuesta perdida se muestra como resultado por confirmar y permite recuperar el mismo intento, sin duplicar la operación.

### UX-05 — Registro, regreso y continuidad

**Historia:** después de elegir dónde plantar, quiero registrar y volver al mismo lugar sin perder contexto ni trabajo.

Recorrido confirmado en la llamada: **Detalle → Registrar plantación → Asistente existente → Confirmación y resultado → Volver a la misma subcampaña**, conservando filtros, contexto y borradores pendientes. Un registro ya confirmado no se vuelve a tratar como borrador reenviable.

Se conserva el asistente actual de ubicación/fotos, especies/cantidades y participantes/resumen. Esta planificación cambia su punto de entrada y regreso; cualquier rediseño de la captura requiere su propia discusión.

**Criterios de aceptación propuestos:**

1. La subcampaña elegida es inequívoca durante la captura y confirmación.
2. Salir conservando un borrador permite retomarlo con la misma cuenta y ámbito.
3. Después de un registro confirmado se actualizan los datos consultados; si falla esa lectura, se informa actualización pendiente sin repetir el registro.
4. Sin stock, sin permiso y sesión vencida tienen explicación y acciones diferentes.
5. Una operación enviada con resultado incierto ofrece recuperación, no una nueva plantación duplicada.
6. Cambiar de cuenta no muestra ni recupera borradores de otra persona.
7. Se mantienen «Mis registros» y las consultas históricas permitidas tras retirar acceso operativo.
8. Los enlaces existentes a `/participar?campania_id=…&subcampania_id=…` y los retornos del formulario se resuelven de forma coherente con el nuevo detalle. Si el destino no está disponible, se informa; no se sustituye silenciosamente por otra zona.

## 3. Preguntas iniciales y decisiones de la llamada

Registro histórico de la conversación. Los detalles restantes tienen criterios de diseño explícitos o dependencias en el paquete vigente; no requieren repetir la llamada.

### Primero: estructura y acceso rápido

1. **Cerrado:** tarjetas de subcampañas agrupadas por campaña; entrada directa al detalle de la subcampaña.
2. **¿Con una sola subcampaña mostramos el inicio o entramos directamente?** Propuesta: mantener el inicio con una tarjeta y un acceso claro; evita cambios inesperados de navegación.
3. **Cerrado:** el inicio incluye la alternativa de mapa a pantalla completa para acceder a las subcampañas. Falta precisar únicamente la interacción de selección y entrada.

### Después: significado de equipo y datos

4. **Cerrado:** gestionar permisos para registrar en la subcampaña, incluyendo administradores según capacidades. No se refiere a gestionar OPERARIO/COORDINADOR.
5. **Cerrado:** foto, nombre y rol del equipo, sin contacto. Queda pendiente habilitar la lectura autorizada para plantadores y el campo de foto en el contrato correspondiente.
6. **¿Qué cantidades necesita ver cada perfil en «Especies de plantas»?** Meta por especie, plantado y/o disponible. Propuesta para plantador: información para reconocer especies y disponibilidad útil para registrar, con etiquetas separadas.
7. **¿Qué indicadores sí necesita el administrador de subcampaña?** Decidir eventos, superficie y lotes por necesidad operativa, sin heredar automáticamente todo el panel R3foresta.

### Finalmente: continuidad y casos especiales

8. **¿Cómo consultamos qué se plantó y quién participó?** Definir lugar del historial y distinguir equipo actual de participantes históricos.
9. **¿Dónde aparecen subcampañas cerradas y cómo llega la persona sin asignación o sin sesión?** Propuesta: actividad actual primero, histórico accesible y orientación para obtener acceso; Impacto sigue público.
10. **¿Qué significa «Asignaciones» en esta pantalla?** Acordar si abre consulta, entrega/asignación física u otro flujo existente, y qué contexto debe conservar.

## 4. Hallazgos del proyecto que condicionan la implementación

Revisión de código y documentación local; **no se realizó QA visual del navegador ni validación contra backend en ejecución**.

| Hallazgo | Consecuencia para la spec |
| --- | --- |
| `/participar` monta `PlantadorWorkspace`, que combina campaña, subcampaña, mapa, registros y acceso a captura. | Separar selección de ámbito y detalle operativo requiere reorganizar responsabilidades y retornos. |
| `DetalleSubcampanaScreen` contiene encabezado, Resumen/Equipo/Mapa y edición del plan para ADMIN. | Es la referencia de estructura visual; verificar fuentes de datos y audiencia antes de reutilizarla completa. |
| `appAccess.ts` no habilita `/app/planting/...` a voluntarios por permiso contextual. | Una experiencia compartida necesita resolver ruta y acceso específicos; no basta con dirigir al plantador a la URL actual. No abrir todo el módulo interno. |
| `SubcampaniaEquipoManager` gestiona el equipo logístico; Participación tiene comandos separados para accesos. | Definir «equipo» antes de elegir qué flujo reutilizar. |
| La consulta de miembros de participación es administrativa. | La lectura de equipo para plantadores depende de un contrato autorizado. |
| Impacto es público; capacidades, stock y borradores son privados. | Unificar la experiencia visual no unifica audiencias ni vuelve públicos los datos operativos. |
| Retornos actuales del registro validan explícitamente `/participar` y sus parámetros. | Añadir el nuevo destino y probar regreso, enlaces anteriores y recuperación. |
| El detalle incluye un TODO sobre asignaciones desde esa pantalla. | Verificar destino/servicio real antes de especificar una acción funcional; no inventar endpoint. |

**Alcance de dominio:** afecta Plantación, Participación, acceso/autenticación y navegación hacia registro con evidencias. No propone cambios en reglas de Recolección/Vivero, stock, evidencias, comandos atómicos ni historial.

Fuentes locales revisadas:

- [Guía frontend](../FRONTEND_GUIDE.md), [índice de dominio](../DOMAIN_INDEX.md) y [reglas de agentes](../AGENTS.md).
- [Inicio participante](../src/modules/home/ParticipantHomeScreen.tsx) y [espacio actual](../src/modules/participacion/components/PlantadorWorkspace.tsx).
- [Detalle de subcampaña](../src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx) y [equipo logístico](../src/modules/plantacion/components/SubcampaniaEquipoManager.tsx).
- [Módulo Participación](../src/modules/participacion/README.md), [capacidades y miembros](../src/modules/participacion/types.ts) y [acceso de navegación](../src/utils/appAccess.ts).
- [Contrato de identidad y permisos, especialmente §4 y miembros](../../r3foresta-docs/specs/plantacion/participacion-aliada/contrato-identidad-permisos-backend-propuesta.md).

## 5. Orden de trabajo después de la llamada

1. Conservar la unidad de tarjeta y alternativa de mapa ya confirmadas; aplicar las specs de contenido mínimo, Equipo y matriz por perfil.
2. Dibujar inicio y detalle en móvil para plantador y administrador; recorrer los mismos casos con ambos perfiles.
3. Resolver contratos faltantes: lectura de equipo para plantador, datos del detalle por audiencia y destino de asignaciones. Verificar disponibilidad de geometría para el mapa de selección confirmado.
4. Implementar el detalle compartido y su acceso autorizado junto al inicio y los retornos. No liberar tarjetas que lleven a una ruta todavía inaccesible para participantes.
5. Integrar equipo según los acuerdos y contratos; conservar los comandos y recuperación existentes.
6. Implementar el mapa alternativo de inicio a pantalla completa, incluido en el alcance confirmado, con acceso a subcampañas y regreso a tarjetas.
7. Verificar en móvil: cero/una/varias zonas, persona con roles distintos por ámbito, estado cerrado, falta de stock, fallo de mapa, sesión vencida, permiso retirado, enlace directo y operación pendiente.

Al implementar: pruebas de comportamiento del recorrido, `npm run lint`, `npm run test` y `npm run build` (incluye TypeScript; no existe script separado `typecheck`). La validación de UX incluirá recorrer tareas reales; los checks de código no la sustituyen.

**Resultado de la llamada:** decisiones principales registradas y desarrolladas en las specs enlazadas. Las dependencias de backend y la secuencia de entrega están documentadas allí. No estimar ni dar por aprobado un permiso nuevo solo a partir del diseño.
