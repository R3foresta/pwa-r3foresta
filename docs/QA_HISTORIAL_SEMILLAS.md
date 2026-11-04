# Historial administrativo de semillas por especie

Fecha de revisión: 4 de noviembre de 2026. Implementación local coordinada entre dos agentes GPT-6.1 con esfuerzo extra alto y revisión de integración.

## Alcance entregado

ADMIN global puede abrir una especie desde Inicio o Stock de semillas y consultar las recolecciones SEMILLA/VALIDADO de todos los recolectores, incluidas las cerradas y agotadas. La lista muestra snapshot del recolector, fecha operativa, cantidad original, saldo actual y código; abre el detalle existente y conserva especie/página al volver. G y UNIDAD permanecen separados.

La ruta frontend es `/app/collections/stock/:plantaId?page=…`. Consume `GET /api/recolecciones/stock-summary/:plantaId/historial?page=…&limit=10`. La disponibilidad utiliza la lectura existente de stock por separado, sin calcular saldos ni totales desde una página. Consultar [contrato backend](../../Backend-r3foresta/documentacion/frontend/recolecciones.md).

La nueva consulta exige ADMIN desde el actor Bearer verificado; conserva el listado propio anterior. Filtra especie, material, validación y eliminación lógica antes de paginar, con orden fecha/created_at/id descendente. No requiere migración ni modifica registros.

## Evidencia de navegador

Chrome, PWA `localhost:5173`, backend local `localhost:3000`, sesión ADMIN iniciada por el usuario y datos del entorno configurado. Únicamente consultas, sin crear ni modificar recolecciones.

- Stock mostró 15 especies y enlaces al historial.
- Especie 42: dos registros de recolectores distintos; cantidades originales y saldos diferentes visibles.
- Historial → detalle 256: ficha y dos fotografías disponibles. Volver conservó `/app/collections/stock/42?page=1`.
- Especie 50: cantidad original y saldo en UNIDAD, sin mezclar con G.
- Especie 48: disponibilidad cero y vacío confirmado, total 0. [Captura móvil](qa/stock-historial/vacio-320.jpg).
- A 320 px, historial sin desbordamiento horizontal: `scrollWidth=305`, `innerWidth=320`. Se revisó también en el viewport de escritorio habitual.
- Se detectó fecha operativa un día anterior en el detalle. Se corrigió el formato UTC del campo fecha; los timestamps conservan su presentación local. La regresión automatizada comprueba coincidencia entre historial y detalle.
- Se ajustó la paginación estrecha a etiqueta superior y dos botones alineados; se separaron los reintentos de stock e historial.

Durante la edición en caliente hubo un error transitorio de orden de hooks al extraer el hook. Se solicitó recarga completa. Después el navegador local quedó deshabilitado en Work: no se pudo repetir visualmente la versión final ni restablecer el viewport temporal. No confundir esa limitación con una prueba final de navegador aprobada.

## Pruebas automatizadas

Backend: 85 suites/1.207 pruebas aprobadas; posteriormente se añadieron tres casos y la suite focal final aprobó 20/20. Guard/controller/consulta reales con Supabase en memoria, sin DB real en esas pruebas. Build aprobado y typecheck posterior aprobado. Lint focal aprobado excepto deuda previa del servicio de consultas (36 errores y una advertencia, fuera del bloque añadido).

Frontend: pruebas de roles y URL directa, contrato/ámbito, paginación, cerrados, unidades, snapshots, retorno normal/error, respuestas tardías por especie/página/actor/token, disponibilidad independiente, sesión expirada y reintentos. Los resultados finales de suite, lint y build se registran en la auditoría.

## Límites

- Segunda página, registros cerrados y roles no ADMIN se acreditan mediante pruebas controladas; no se crearon datos reales para forzar esos escenarios.
- Paginación por offset: nuevas validaciones entre lecturas pueden desplazar registros de página. Cada lectura representa el estado vigente, no una instantánea transaccional entre páginas.
- La barra de navegación compartida recorta el acceso Mapa en 320 px; hallazgo preexistente, independiente de esta pantalla.
- Al cierre de este QA aún no había commit, push ni despliegue; no se requirieron migraciones. Pendiente aceptación visual final y dispositivo físico.
