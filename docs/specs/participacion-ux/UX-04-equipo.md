# UX-04 — Equipo y permisos de participación

## Acuerdos

El plantador ve **foto, nombre y rol** del equipo, sin datos de contacto. Gestionar equipo significa habilitar o retirar participación, incluyendo administradores según las facultades vigentes. No significa editar OPERARIO/COORDINADOR ni borrar cuentas.

## Consulta

Una fila por persona, sin duplicarla cuando tenga más de una relación. Mostrar foto autorizada, nombre y etiquetas de permiso reales: Plantador, Administrador de subcampaña o Administrador · Acceso global según corresponda. La responsabilidad logística, si se muestra a una audiencia autorizada, lleva una etiqueta independiente y nunca reemplaza el permiso.

Foto ausente o fallida: avatar neutro accesible. No buscar fotos en redes ni deducir direcciones públicas a partir de bucket/ruta. La lista no muestra correo, teléfono, revisiones técnicas ni identificadores internos como información principal.

La composición del equipo legible por plantadores —incluida la presencia de administradores globales y logística— debe quedar explícita en el contrato. No copiar automáticamente toda la proyección administrativa a su vista.

## Gestión desde la subcampaña

1. Entrar a Equipo y elegir una acción disponible.
2. Buscar una persona existente cuando la acción lo requiera, usando la búsqueda autorizada actual.
3. Mantener la subcampaña actual como único ámbito de esta operación; no añadir otras zonas por pertenecer a la misma campaña.
4. Consultar la revisión vigente y presentar persona, acción, subcampaña y consecuencia.
5. Confirmar con el mecanismo existente de comandos.
6. Mostrar resultado confirmado y actualizar miembros/capacidades. Si solo falla la actualización, informar y reintentar la lectura, no el cambio ya confirmado.

| Acción visible | Consecuencia |
| --- | --- |
| Habilitar plantador | Otorga permiso para registrar cuando las condiciones operativas lo permiten |
| Retirar plantador | Retira permiso contextual; conserva historia y cuenta |
| Designar administrador | Concede administración contextual; no rol global ni logística |
| Cambiar administrador a plantador | Retira administración y conserva permiso para plantar |
| Retirar administrador | Retira acceso contextual completo; conserva historia |
| Reemplazar administrador | Reemplazo y tratamiento del saliente en una sola operación |

Mostrar únicamente acciones concedidas. No usar «Eliminar persona». Un ADMIN global no pierde su rol global mediante retiro contextual. La protección del último administrador depende del backend; ante rechazo se explica y se ofrece el reemplazo si está autorizado. No ejecutar designación y retiro como dos escrituras separadas para simular reemplazo.

## Estados

Carga, lista vacía confirmada, error recuperable y sesión vencida son distintos. Durante una confirmación en curso impedir otra intención incompatible. Si se pierde la respuesta, presentar «Estamos comprobando si se aplicó el cambio» y recuperación del mismo comando. Cambiar persona o acción invalida la confirmación anterior.

## Dependencia bloqueante de lectura

La consulta actual de miembros de participación solo autoriza administradores y no devuelve foto. Se necesita confirmar con backend una proyección para plantadores con foto, nombre y rol, y el mecanismo autorizado de entrega de fotos. No se define una URL nueva en esta spec. No usar participantes seleccionables ni autores históricos como sustitutos del equipo.

Esta dependencia bloquea declarar completa la consulta de Equipo para plantadores; no bloquea documentar o implementar de forma aislada los componentes visuales. Ver [B01](DEPENDENCIAS_Y_ENTREGA.md).

## Aceptación

- UX04-CA01: un plantador ve foto, nombre y rol autorizados, sin acciones de gestión ni contacto.
- UX04-CA02: foto ausente o fallida produce avatar sin romper la fila.
- UX04-CA03: un administrador habilita a alguien solo en la subcampaña revisada y confirmada.
- UX04-CA04: retirar acceso no borra registros ni modifica responsabilidades logísticas.
- UX04-CA05: último administrador y reemplazo respetan respuestas y atomicidad del backend.
- UX04-CA06: respuesta perdida conserva intento y permite recuperar sin duplicar la operación.
- UX04-CA07: los roles mostrados corresponden a permisos actuales; historial conserva sus snapshots.
