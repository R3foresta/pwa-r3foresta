# Revisión UX/UI de Impacto

28 de octubre de 2026 · `http://localhost:5173/impacto` · Código revisado: `d3aa3a3`.

## Diagnóstico

La identidad visual es consistente: verdes, tarjetas, fotos públicas y una cifra principal reconocible. La mayor oportunidad está en la continuidad de las tareas. Entender el indicador, encontrar una zona y abrir una plantación exige descubrir controles demasiado separados o conocer identificadores internos.

Evaluación experta con navegador y código; no es un estudio con usuarios ni una certificación de accesibilidad. No se modificó código de producto, contratos, permisos ni datos de negocio.

## Alcance

- Viewports 390 × 844, 320 × 740 y 1440 × 1000; no se emuló hardware móvil. La barra de desplazamiento resta ancho al contenido.
- Portada, tarjetas, puntos, Campañas/Subcampañas, copia de enlace, campaña, registro, retorno, filtros y vacío.
- Teclado: Enter, Tab, Escape y cierre del popup.
- Lectura de guías, componentes, hooks, contratos y pruebas. La sesión existente estaba autenticada; se evaluó la consulta pública sin operaciones privadas.
- Datos observados: 246 plantas iniciales y 16 registros grupales. Son una fotografía del entorno.
- Capturas de portada y filtros sin conservar fotos de personas, tokens ni detalles personales.

## Hallazgos

### UX-01 · Alta · Selección del mapa desconectada del detalle

**Navegador y código.** El popup «Registro 12: 38 iniciales» vuelve a seleccionar el registro, sin abrir su historia. «Abrir detalle público» aparece después de todo el carrusel. En móvil, el resumen comenzaba a 1237 px del borde superior de un viewport de 844 px: no era visible tras la acción.

Al seleccionar el mismo marcador cerca del borde derecho del mapa global, el popup quedó recortado y coincidió con el zoom. DOM: borde derecho del popup 447 px; borde del mapa 366 px. Validar también en dispositivo físico.

**Mejora:** «Ver plantación» directo en el popup, resumen junto al mapa y posicionamiento que mantenga contenido/cierre visibles. **Aceptación:** abrir detalle sin buscar bajo el carrusel y sin recortes a 320/390 px.

Código: `src/modules/impacto/components/ImpactoMap.tsx:99`, `src/modules/impacto/pages/ImpactoConsultaScreen.tsx:130`, `src/modules/impacto/map/impactoMapController.ts:44`.

### UX-02 · Alta · Filtros técnicos y difíciles de encontrar

**Navegador y código.** Exigen IDs numéricos. Escribir «Reforestacion Cotacota» produjo «Please match the requested format.»; el idioma nativo depende del navegador. Están al final y requieren abrir «Consulta avanzada» y después «Filtrar impacto público». Aplicar fechas actualizó resultados arriba mientras el viewport permanecía en el formulario. El aviso superior no identifica los filtros activos.

**Mejora:** entrada «Filtrar» junto al mapa, un solo panel, selección por nombre, chips de filtros activos y respuesta visible/anunciada. Conservar IDs internamente y errores en español.

**Dependencia:** especies y organizaciones se deducen de registros paginados. Presentarlas como sugerencias de registros cargados mientras no exista un contrato público de facetas completo. Solicitarlo si se necesita búsqueda completa; no inventar endpoint ni usar catálogos privados.

**Aceptación:** consultar por un nombre reconocible, entender los filtros aplicados y localizar el resultado sin manejar IDs.

Código: `ImpactoFilters.tsx:18,35`; `ImpactoConsultaScreen.tsx:32,72,191` dentro de `src/modules/impacto/`.

### UX-03 · Media · Nombres que no distinguen zonas

**Navegador y código.** Calle 32, Laguna, Mercado y Plaza comparten el título «Cota Cota». El nombre específico queda en texto secundario; mapa y botones accesibles repiten el nombre genérico.

**Mejora:** título específico y zona/campaña como contexto; botones «Ver Calle 32 en el mapa». **Aceptación:** distinguir tarjetas y controles sin leer todo el texto secundario.

Código: `src/modules/impacto/hooks/useImpactoExplorer.ts:36`; `src/modules/impacto/components/ImpactoExplorer.tsx:113`.

### UX-04 · Media · Compartir pierde el ámbito visual

**Navegador y código.** Campañas → Campaña Banex → «Ver en el mapa» mantiene `/impacto`. Copiar enlace copia esa URL global. Recargar vuelve a Subcampañas y todas las ubicaciones. Los puntos sí usan `seleccion` en URL.

**Matiz:** entrar a «Conocer campaña» y volver conservó nivel y foco en la sesión probada; no se considera fallido ese retorno concreto.

**Mejora:** serializar nivel y foco visual sin enviarlos como filtros backend, o distinguir «Compartir impacto global» de «Compartir esta vista». **Aceptación:** nueva visita/recarga reproduce lo que el enlace promete.

Código: `src/modules/impacto/hooks/useImpactoExplorer.ts:53,107`; `src/modules/impacto/components/ImpactoShare.tsx:10`.

### UX-05 · Alta · Orden y recuperación de foco del popup

**Navegador y código.** Enter sobre «Ver registro 12» enfocó Cerrar. Tab pasó a Centrar mapa, saltándose el botón del registro. Escape no cerró. Tras cerrar, foco en `body`, sin retorno al marcador.

**Mejora:** enfocar tras montar contenido React, permitir Escape y restaurar foco al disparador. **Aceptación:** marcador → contenido → cierre, sin saltos; comprobar también con lector. No hace falta convertir el popup en modal.

Referencia: el foco debe preservar significado y operabilidad ([W3C, Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)). Código: `src/modules/impacto/map/impactoMapController.ts:50`; `src/modules/impacto/components/ImpactoMap.tsx:99`.

### UX-06 · Media · Resumen móvil demasiado alto

**Medición y observación.** La tarjeta del indicador mide 425 px a 390 px de ancho. La primera pantalla muestra el total y apenas el comienzo del mapa; las tarjetas quedan más abajo. A 320 px Copiar enlace agrega una fila. En escritorio la composición es limpia, pero sigue apilando grandes bloques y la navegación flotante se superpone a parte del mapa visible.

**Mejora:** compactar icono/espaciado/explicación móvil y ofrecer «Explorar zonas». En escritorio evaluar mapa y lista en columnas, con resultado junto a selección. **Aceptación:** cifra, significado y acción de exploración visibles a 390 × 844 sin perder legibilidad. No hubo desbordamiento horizontal del documento a 320 px.

Código: `src/modules/impacto/components/ImpactoSummary.tsx:9`; `src/components/BottomNav.tsx:99`.

### UX-07 · Media · Significado del total demasiado alejado

**Código y observación.** «Plantas registradas» representa plantación inicial, no saldo vivo. La separación de bajas/reposiciones es correcta, pero está desplegada bajo «Qué cuenta este número». Un filtro por especie conserva grupos completos, por lo que el total puede incluir otras especies; la explicación queda en el formulario.

**Mejora:** etiqueta explícita de plantación inicial y aclaración visible del alcance. Con especie: «Registros que incluyen [especie]; el total reúne todas las especies de esos registros». **Aceptación:** entender el total con filtros cerrados, sin alterar cálculos ni atribuir supervivencia.

Código: `src/modules/impacto/components/ImpactoSummary.tsx:14`; `src/modules/impacto/components/ImpactoFilters.tsx:24`.

### UX-08 · Media · Legibilidad y acceso a la lista

**Estilos renderizados y código.** La ayuda del carrusel usa 12 px, `#64748b` sobre `#f0f6f2`: contraste 4.344:1, inferior a 4.5:1 para texto normal ([W3C, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). Sobre blanco el mismo gris da 4.759:1: no generalizar el problema. La navegación usa 11 px.

La alternativa textual al mapa está dentro de dos desplegables y después del carrusel. El título del documento permanece «R3foresta» entre portada, campaña y registro.

**Mejora:** ayuda más oscura, evaluar 14 px en instrucciones, «Ver como lista» junto al mapa y títulos por página. **Aceptación:** contraste suficiente, alternativa localizable y navegación identificable. Falta lector y prueba bajo luz exterior.

Código: `ImpactoExplorer.tsx:50`, `ImpactoConsultaScreen.tsx:138,155`, `src/layouts/AppLayout.tsx:11`, `src/components/BottomNav.tsx:110`, `index.html:14`.

### UX-09 · Media · Fotos ausentes y contenido de demostración

**Código y navegador.** Las portadas se buscan solo en los registros cargados. «Sin foto pública disponible» no demuestra ausencia en toda la zona. El filtro vacío dejó sin fotos tarjetas que antes sí tenían. El entorno contiene «Campaña de Prueba», «Ejemplo de Campaña» y «sdf».

**Mejora:** texto neutral/referido a la consulta actual, o portada pública explícita en el contrato. Revisar editorialmente datos de demostración antes de presentación pública mediante el flujo autorizado; no ocultarlos arbitrariamente ni eliminarlos desde esta revisión.

Código: `src/modules/impacto/hooks/useImpactoExplorer.ts:32,42`; `src/modules/impacto/components/ImpactoExplorer.tsx:101`.

### UX-10 · Baja · Lenguaje y detalles de presentación

Conviven Subcampañas, zonas, registros grupales, jornadas y alcance consultado. El código de trazabilidad domina el detalle. Se observó «1 registros grupales» y en escritorio la instrucción «Usa dos dedos».

**Mejora:** Campañas → Zonas → Plantaciones como vocabulario público; conservar términos técnicos/código en detalle auditable. Ajustar plurales y ayuda al dispositivo. No renombrar DTOs ni asumir que cada registro equivale a una jornada única.

## Dirección propuesta y orden de trabajo

1. Resolver mapa → detalle, recortes y foco. Mantener alternativa textual y verificar consumidores compartidos del mapa.
2. Simplificar filtros por nombre, hacer visible su estado y anunciar resultados. Coordinar contrato de facetas si se requiere catálogo completo.
3. Dar títulos específicos a zonas, conservar contexto compartible y compactar el resumen con significado claro.
4. Corregir contraste, acceso a lista, títulos de página y textos; revisar contenido de demostración por separado.

Composición sugerida: resumen breve → controles de exploración/filtrado → mapa y resultado próximo → tarjetas específicas → explicación metodológica e historial ampliable. En escritorio evaluar dos columnas; en móvil mantener lectura vertical y acciones cercanas.

Conservar paleta, componentes existentes, fotos reales, estados diferenciados, gestos cooperativos y áreas táctiles principales de 44 px. No añadir dependencias UI ni alterar saldos, snapshots, permisos, evidencias o reglas de Recolección/Vivero.

## Verificación y límites

| Comando | Resultado |
| --- | --- |
| `npm run test -- src/modules/impacto` | 10 archivos / 172 pruebas aprobadas. |
| `npm run lint` | Aprobado. |
| `npm run build` | Aprobado; incluye TypeScript/PWA. Advertencia por MapLibre: 1066.75 kB minificado, 292.31 kB gzip; worker 516.71 kB. No demuestra lentitud de campo. |

No hay script `typecheck`; TypeScript se comprueba en build. No se ejecutó suite completa, Lighthouse, red lenta/offline, fallo real de API/fotos, lector de pantalla, WebAuthn ni dispositivo físico. Los errores se revisaron en código y pruebas existentes; no se acredita QA manual de fallos reales. No hubo escrituras de negocio.

La restauración del tamaño original del navegador no pudo completarse al final porque el uso local quedó deshabilitado en ajustes. Las comprobaciones descritas ya se habían ejecutado.

## Evidencia visual

- [Portada móvil](evidence/ux-impacto-2026-10-28/mobile-overview.png).
- [Portada de escritorio](evidence/ux-impacto-2026-10-28/desktop-overview.png).
- [Filtros móviles](evidence/ux-impacto-2026-10-28/mobile-filters.png).
- [Resultado vacío](evidence/ux-impacto-2026-10-28/mobile-empty.png).

`AUD-023` permanece abierto. Esta revisión aporta evidencia y prioridades; no acredita corrección, aceptación humana ni despliegue.
