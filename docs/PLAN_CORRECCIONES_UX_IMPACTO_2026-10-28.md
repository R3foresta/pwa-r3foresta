# Correcciones UX/UI de Impacto

28 de octubre de 2026. Fuente: [revisión UX/UI](REVISION_UX_UI_IMPACTO_2026-10-28.md), UX-01–UX-10. Alcance: consulta pública de Impacto; sin escrituras de negocio, dependencias nuevas ni cambios de contratos.

## Plan y reparto

| Responsable | Trabajo | Criterio de revisión |
| --- | --- | --- |
| Agente Mapa | UX-01/05: detalle directo, límites del popup, foco, Escape y retorno al marcador. | Comportamiento con teclado, grupos y consumidores compartidos; 320/390 px. |
| Agente Exploración | UX-03/04/08/09/10: nombres específicos, nivel/foco compartibles, contraste, portadas y lenguaje. | Recarga y copia reproducen el ámbito visual; parámetros visuales fuera del backend; carrusel accesible. |
| Agente Filtros | UX-02: selección por nombre, IDs internos, fechas y opciones parciales. | Formulario único en español; conservar IDs de enlaces sin nombre disponible; sin catálogos privados. |
| Integración | UX-01/02/06/07/08/10: selección cerca del mapa, controles/lista visibles, resumen compacto y explícito, títulos. | Comprensión de la plantación inicial, acceso a resultados y navegación responsive. |
| Revisión cruzada | Revisores independientes de código y UX/UI tras integrar. | Corregir regresiones y registrar evidencia con límites reales. |

## Orden de ejecución

1. Leer guías, contratos y consumidores; conservar el informe previo y cambios documentales existentes.
2. Implementar en paralelo con propiedad de archivos, integrar y añadir regresiones de comportamiento.
3. Revisar código y recorrido; corregir hallazgos antes del cierre.
4. Ejecutar pruebas, lint, build (incluye TypeScript) y revisión de diferencias; comprobar navegador si está disponible.
5. Actualizar auditoría y guía del módulo con resultados y pendientes.

## Dependencias fuera del cambio

- Especies/organizaciones: las opciones proceden de registros cargados; un catálogo público completo necesita un contrato de facetas. No inventar endpoint ni consultar catálogos privados.
- Portadas: el DTO no acredita ausencia de fotos en toda una zona. Usar texto referido a la consulta.
- Datos de demostración: requieren revisión editorial en el flujo autorizado. No ocultar ni eliminar registros desde esta corrección.
- La verificación local no acredita dispositivos físicos, lector de pantalla, aceptación humana ni despliegue.

## Resultado implementado

| Hallazgo | Cambio |
| --- | --- |
| UX-01 | «Ver plantación» en popup; resumen antes del carrusel; dimensiones adaptables y popup por encima del zoom. |
| UX-02 | Un panel junto al mapa, nombres con IDs internos, filtros activos eliminables y respuesta con foco/anuncio. Se conservan etiquetas conocidas ante un resultado vacío. |
| UX-03 | Nombre específico como título y localidad/campaña como contexto. |
| UX-04 | `nivel`, `foco` y `seleccion` en URL, validados y separados del DTO backend. Cambiar de ámbito limpia parámetros visuales y conserva retorno. |
| UX-05 | Foco después del portal, Tab al cierre, Escape y devolución al marcador. |
| UX-06 | Resumen de 345 px a 390 px de viewport, frente a 425 px del informe inicial. Cifra, significado y «Explorar zonas» visibles en la primera pantalla. Escritorio conserva composición vertical. |
| UX-07 | Plantación inicial, alcance global/contextual y advertencia sobre plantas vivas visibles. El filtro de especie aclara que conserva grupos completos; no cambia cálculos. |
| UX-08 | Ayudas de 14 px en gris más oscuro, navegación pública de 12 px, títulos de pestaña y acceso directo a lista. |
| UX-09 | Ausencia de portada referida a la consulta y aviso de sugerencias parciales. Datos editoriales conservados. |
| UX-10 | Campañas/Zonas/Plantaciones en exploración, trazabilidad secundaria en detalle y singulares del resumen/popup/lista. |

## Revisiones cruzadas

- **Código:** detectó selección desde lista que conservaba un foco incompatible. Se limpia en una actualización de URL; enlaces antiguos incoherentes amplían el mapa para conservar visible la selección. Regresiones de pantalla/hook añadidas.
- **UX/UI:** detectó pérdida de nombres al filtrar hasta vacío y falta de desplazamiento/foco al ubicar desde listas. Se conservan sólo etiquetas ya conocidas para sus IDs; enlaces nuevos sin nombre siguen siendo neutrales. Las listas enfocan el mapa. La cabecera distingue selección y ámbito visual; el indicador identifica su alcance.
- **Revisión final de código:** sin nuevos bugs verificables en URL, filtros, async, retorno, lista, títulos y consumidores compartidos. No acreditó GPU ni navegador.
- **Navegador:** detectó zoom sobre enlaces del popup agrupado a 320 px. Se corrigió el apilamiento; `elementFromPoint` confirmó que ambos enlaces reciben clics en centro y borde derecho.

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| `npm run test` | Primera ejecución: 933/934. La espera de hidratación/redirección de Participar agotó su límite; no se modificó producto ni timeout para ocultarla. |
| `npm run test -- src/modules/home/ParticipantHomeScreen.test.tsx` | 33/33 aprobadas. |
| `npm run test -- --maxWorkers=2` | 65 archivos / 934 pruebas aprobadas. Saturación paralela es una hipótesis para la intermitencia anterior; no causa demostrada. |
| `npm run test -- src/modules/impacto` | Última ejecución tras apilamiento/singulares: 12 archivos / 202 pruebas aprobadas. |
| `npm run lint` | Aprobado. |
| `npm run build` | TypeScript/PWA aprobados tras los últimos ajustes. Aviso conocido del tamaño de MapLibre. No existe script `typecheck`. |
| `git diff --check` | Aprobado tras implementar y actualizar documentación. |

### Navegador local

Sesión existente en `localhost:5173`, backend público disponible. Sólo consultas, sin escrituras de negocio ni cambios de permisos. Viewports 320 × 740, 390 × 844 y 1440 × 1000; no emulación de hardware móvil.

- Sin desbordamiento horizontal del documento a 320/390/1440 px.
- Popup simple a 390/320 px y grupo de dos a 320 px dentro del mapa. Enter enfoca el enlace, Tab llega al cierre, Escape/clic en cerrar restauran el marcador. Apilamiento corregido y comprobado.
- Popup → detalle → Volver conserva ruta y selección. La pestaña cambia entre Impacto global y Plantación en la zona.
- Elegir campaña por nombre usa ID interno. Un vacío por fechas conserva su nombre, muestra chips y mantiene foco en una respuesta visible.
- La lista contiene las 16 plantaciones del entorno; «Ubicar registro» desplaza y enfoca el mapa.
- Campañas → Campaña Banex → mapa conserva `nivel=campania&foco=89` al recargar, con un marcador y total global 246. Copiar muestra confirmación; la herramienta de lectura del portapapeles devolvió vacío, por lo que no se acredita manualmente su contenido. Payload de copia y vista compartida cubiertos por pruebas.

Evidencia sin fotos de personas:

- [Portada móvil](evidence/ux-impacto-correcciones-2026-10-28/mobile-overview-390.jpg).
- [Popup simple](evidence/ux-impacto-correcciones-2026-10-28/mobile-popup-320.jpg).
- [Popup agrupado](evidence/ux-impacto-correcciones-2026-10-28/mobile-group-popup-320.jpg).
- [Vacío filtrado](evidence/ux-impacto-correcciones-2026-10-28/mobile-filter-empty-320.jpg).
- [Escritorio](evidence/ux-impacto-correcciones-2026-10-28/desktop-overview-1440.jpg).
- [Vista compartida restaurada](evidence/ux-impacto-correcciones-2026-10-28/desktop-shared-view-1440.jpg).

## Pendientes

`AUD-023` corregido localmente; pendiente aceptación humana y verificación externa. Faltan dispositivo físico, lector de pantalla, luz exterior y conectividad de campo. Catálogo público completo/portada explícita requieren contrato; datos de demostración requieren revisión editorial autorizada. No se desplegó ni se acredita piloto.

## Segunda revisión independiente · 28 de octubre

Se revisaron las diferencias de implementación, los componentes nuevos, las pruebas y las capturas guardadas en este informe contra UX-01–UX-10. No se identificó un nuevo fallo bloqueante en el código inspeccionado. Las correcciones principales están implementadas: enlace directo desde popup, foco/Escape/retorno, selección antes del carrusel, filtros por nombres, URL de vista, títulos específicos y definición visible del indicador.

Esta pasada **no repitió la interacción en navegador**: el acceso local estaba deshabilitado en los ajustes de Work. Las capturas visuales son las de la implementación anterior, no evidencia nueva. No se modificó código de producto ni datos de negocio.

Verificación ejecutada de nuevo: `npm run test -- src/modules/impacto --maxWorkers=2` (12 archivos/202 pruebas), `npm run lint`, `npm run build` (TypeScript/PWA) y `git diff --check`, todos aprobados. Continúa el aviso de tamaño de MapLibre. No se repitió la suite completa en esta pasada.

Pendientes menores de la revisión:

- **Nombres accesibles de enlaces:** los botones «Ver en el mapa» ya identifican la zona, pero los enlaces del carrusel siguen llamándose únicamente «Conocer zona»/«Conocer campaña» (`ImpactoExplorer.tsx:129–135`). Añadir el nombre del destino facilitaría el recorrido por lista de enlaces de un lector de pantalla; no se afirma que la navegación normal esté bloqueada.
- **Foco al cambiar de página:** `useImpactoPageTitle` actualiza el título de documento, pero no hay gestión explícita del foco al encabezado al abrir el detalle público. El foco del popup y el de resultados/lista sí están tratados. Completar y probar la transición de ruta con teclado/lector; el efecto real tras navegar no se reprodujo en esta pasada.
- **Composición:** la portada móvil es más compacta y muestra acciones de exploración; conserva bastante texto y el mapa sigue parcialmente bajo el primer pliegue. El escritorio conserva la composición vertical. Son oportunidades de una siguiente iteración visual, no regresiones funcionales acreditadas.

Las facetas/portadas completas, revisión editorial y pruebas de dispositivo/lector real siguen con los límites ya declarados arriba. No cerrar toda la aceptación UX a partir de pruebas automatizadas y capturas.

## Ajustes de accesibilidad · 28 de octubre

Se resolvieron los dos pendientes de accesibilidad de la segunda revisión:

- `ImpactoExplorer` e `ImpactoSubcampaniaCard` incluyen el destino mediante `aria-label`: «Conocer zona: Laguna de Cotacota» / «Conocer campaña: Campaña Banex». Se conserva el texto visible, los destinos, el retorno y la exclusión de duplicados del teclado/árbol accesible.
- Nuevo `useImpactoPageFocus` en las pantallas de consulta y registro público: enfoca el primer `h1` de su `main`, con `tabIndex=-1`, al montar/cambiar `pathname`. Cubre rutas reutilizadas con otro ID y retorno. No depende de query, datos ni título: no interrumpe mapa, filtros o copia cuando se actualiza la misma página. El encabezado está disponible también en carga/error y sólo se enfoca una vez por apertura.

Revisión independiente de código: sin fallos nuevos identificados; alcance limitado a Impacto. Cuatro regresiones nuevas verifican nombres/destinos, campaña y retorno, cambios entre plantaciones, datos tardíos y selección del mapa. Las pruebas existentes conservan foco de resultados/lista/portapapeles.

Verificación de este ajuste: `npm run test -- src/modules/impacto --maxWorkers=2`, **12 archivos / 206 pruebas aprobadas**; `npm run lint`, `npm run build` (TypeScript/PWA) y `git diff --check` aprobados. Se conserva el aviso de tamaño de MapLibre. No se repitió la suite completa.

El navegador local estuvo disponible en esta pasada: Enter sobre un enlace de zona/campaña enfoca el `h1`, el nombre final conserva ese foco al llegar datos, abrir plantación espera al montaje lazy y enfoca «Registro público», y Volver enfoca el encabezado de la zona. Cambiar Campañas/Zonas conserva el foco del control. [Captura del encabezado enfocado](evidence/ux-impacto-correcciones-2026-10-28/page-heading-focus.jpg). Sin escrituras de negocio. No acredita lector de pantalla, dispositivo físico ni aceptación humana.

## Archivos de implementación

Rutas relativas a `src/modules/impacto/`, salvo indicación:

- `components/ImpactoMap.tsx`, `map/impactoMapController.ts`, `map/impactoMap.css`: popup, foco y apilamiento.
- `hooks/useImpactoExplorer.ts`, `components/ImpactoExplorer.tsx`: nombres y vista compartible.
- `components/ImpactoFilters.tsx`: formulario y conservación de propuesta.
- `pages/ImpactoConsultaScreen.tsx`, `components/ImpactoSummary.tsx`, nuevos `ImpactoSelectionSummary.tsx` y `ImpactoPointList.tsx`: composición y resultados.
- Nuevo `hooks/useImpactoPageTitle.ts`, `pages/ImpactoRegistroScreen.tsx`, `components/ImpactoRegistroContent.tsx`, `components/ImpactoSubcampaniaCard.tsx`, `utils/consulta.ts`: títulos, lenguaje y URL.
- Nuevo `hooks/useImpactoPageFocus.ts`: foco al encabezado de páginas públicas.
- `src/components/BottomNav.tsx`: tamaño de texto público.
- Pruebas de mapa/pantallas y nuevas pruebas de filtros/exploración.
- README del módulo, auditoría e índice documental. Se conserva la revisión anterior como antecedente.
