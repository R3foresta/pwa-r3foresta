# UX-01 — Inicio de participación

## Propósito y acuerdos

Como participante quiero reconocer mis subcampañas y entrar a la que necesito. El inicio muestra tarjetas agrupadas por campaña y permite cambiar a un mapa a pantalla completa. Ambos accesos llevan al mismo detalle.

## Comportamiento

1. Al entrar a Participar se comprueba la sesión y se consultan las capacidades de la cuenta actual.
2. Se muestran las subcampañas devueltas para esa persona con su relación actual. No inferir pertenencia por organización, equipo logístico o autoría histórica.
3. Cada grupo lleva el nombre de la campaña. Cada tarjeta muestra nombre de subcampaña, estado, rol y «Entrar a la subcampaña». Ubicación, foto y avance se muestran si existe una lectura autorizada; su ausencia no impide entrar.
4. La tarjeta conduce al detalle sin una pantalla intermedia de campaña.
5. «Ver mapa» sustituye la lista por un mapa que ocupa el área disponible de la pantalla, incluidos los espacios seguros del dispositivo. No requiere la API de pantalla completa del navegador.
6. «Ver tarjetas» permite regresar. Ambos modos preservan el ámbito seleccionado.

## Criterios de diseño adoptados

- Tarjetas como vista inicial; una sola tarjeta no produce redirección automática.
- En el mapa, tocar una zona abre una ficha breve con nombre, campaña y botón «Entrar». Evita entrar por accidente al mover el mapa. No añadir registros individuales al mapa del inicio: este sirve para elegir subcampaña.
- Mantener el orden del servidor, sin inventar un ranking por proximidad. No pedir GPS para abrir esta pantalla.
- Mostrar ámbitos activos primero y los restantes en un grupo secundario «Otras subcampañas», conservando el estado exacto. No ocultar borradores administrables ni asumir que todos los estados no activos son históricos.
- ADMIN global ve sus ámbitos autorizados, con etiqueta de acceso global; no se lo describe como miembro contextual de cada zona. El diseño debe soportar listas largas sin truncamiento silencioso.

## Estados

| Situación | Respuesta UX |
| --- | --- |
| Sin sesión | Orientación para participar, acceso a autenticación y a Impacto público |
| Consultando | Estado de carga, sin mostrar datos de otra cuenta |
| Sin ámbitos confirmados | «Todavía no tienes subcampañas asignadas», orientación para coordinar habilitación e Impacto |
| Error de capacidades | «No pudimos consultar tus subcampañas» y Reintentar; no mostrar vacío de asignaciones |
| Zona sin geometría | Sigue en tarjetas; en mapa indicar que hay zonas sin ubicación y permitir verlas en lista |
| Error de mapa | Explicación, Reintentar y Ver tarjetas; no bloquear entrada por tarjetas |
| Pendiente propio | Acceso a recuperación aunque el ámbito ya no sea operable |

El mapa representa el mismo conjunto autorizado que las tarjetas, limitado únicamente por geometrías disponibles. No sustituir ese conjunto por todas las zonas públicas de la campaña. Cambiar de cuenta descarta selección privada anterior.

## Aceptación

- UX01-CA01: con dos campañas y tres zonas, las tarjetas se agrupan correctamente y cada entrada abre su zona.
- UX01-CA02: con una zona, la persona ve una tarjeta y entra con una acción.
- UX01-CA03: cambiar a mapa permite entrar a esas mismas zonas y regresar a tarjetas con contexto preservado.
- UX01-CA04: una geometría ausente no hace desaparecer la zona del recorrido.
- UX01-CA05: error, carga y ausencia confirmada de ámbitos tienen estados distintos.
- UX01-CA06: tras cambiar de cuenta no queda visible información privada de la cuenta anterior.
- UX01-CA07: el modo mapa permite salir, seleccionar con controles accesibles y usar la lista sin GPS.

## Implementación orientativa

Reorganizar ParticipantHomeScreen y PlantadorWorkspace. Reutilizar las capacidades y los componentes cartográficos existentes; no reconstruir permisos desde Impacto. La lectura de geometrías de ámbitos no públicos requiere cotejo de contrato. Ver [dependencias](DEPENDENCIAS_Y_ENTREGA.md).

## Estado de implementación · 24 de octubre de 2026

Inicio implementado con tarjetas, mapa completo, roles/estados, selección explícita y recuperación propia. Tarjetas/mapa llevan al detalle compartido `/app/planting/subcampanias/:id`; los parámetros antiguos de Participar redirigen después de validar el ámbito. Geometrías proceden únicamente de Impacto público; los ámbitos no publicados conservan entrada por tarjeta/lista, sin usar endpoints internos. B02 no se considera cerrado.

Ver [evidencia local y límites](../../QA_PARTICIPACION_UX01.md).
