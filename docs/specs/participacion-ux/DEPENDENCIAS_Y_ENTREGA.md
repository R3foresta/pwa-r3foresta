# Dependencias, implementación y validación

## Contratos que deben resolverse

| ID | Necesidad | Evidencia local | Resolución necesaria |
| --- | --- | --- | --- |
| B01 | Equipo legible por plantador con foto | La consulta de miembros actual es administrativa y no devuelve foto | Backend debe definir audiencia, composición de miembros, campos mínimos, paginación y acceso autorizado a foto. No usar proyección administrativa completa como fallback |
| B02 | Detalle y geometría para todos los ámbitos autorizados | Capacidades no incluyen geometría; Impacto solo cubre recursos públicos y detalle actual es interno | Cotejar lecturas existentes por perfil/estado. Si falta lectura para una zona autorizada, pedir contrato mínimo de resumen/geometría; no abrir endpoints internos |
| B03 | Botón Asignaciones para ADMIN | El detalle tiene un TODO de asignaciones y no una navegación funcional verificada | Identificar flujo, ruta y contrato de asignaciones físicas con ámbito seleccionado. Si no existe, especificarlo por separado antes de habilitar el botón |

B01 y B02 no cambian la decisión UX; son condiciones para entregar esa experiencia. B03 conserva el pedido original y no se considera resuelto por añadir un botón sin destino. No se declara completo el conjunto mientras falte una función requerida.

## Decisiones técnicas adoptadas para preparar implementación

- Composición de detalle compartida con lecturas diferenciadas por audiencia. Misma URL `/app/planting/subcampanias/:id` con selección de composición antes de consultar datos, compatible con capacidades; conservar rutas públicas legítimas.
- Reutilizar AuthContext y provider de capacidades, servicios y mapas existentes.
- Reutilizar comandos de gestión y registro; frontend solo cambia presentación, ámbito seleccionado y navegación.
- IDs v1 y revisiones siguen siendo cadenas; no adaptarlos mediante conversión a números para encajar en componentes legados.
- Confirmación explícita con componentes existentes antes de mutaciones; no modificar estados operativos como consecuencia de navegar.
- Cargar secciones según necesidad y autoridad; nunca consultar datos internos para filtrarlos luego en la UI.

## Secuencia de entrega

1. **Cotejo de contratos:** resolver B01–B03 con evidencia de las lecturas y audiencias; preparar escenarios representativos.
2. **Detalle y acceso:** extraer composición visual, resolver ruta participante y conservar herramientas internas. Verificar plantador, administrador contextual y roles internos.
3. **Inicio y navegación:** tarjetas agrupadas, mapa a pantalla completa, entradas al detalle y enlaces antiguos. Se entrega junto al detalle accesible.
4. **Equipo:** lectura autorizada con fotos y gestión contextual dentro de la zona mediante comandos existentes.
5. **Registro y continuidad:** adaptar retornos, conservación de contexto, borradores y recuperación.
6. **QA integrado:** ejecutar la matriz y registrar evidencia, limitaciones y pendientes reales.

Las etapas son unidades de trabajo, no promesas de que una parte incompleta satisfaga toda la entrega.

## Matriz mínima de QA

| Caso | Resultado esperado |
| --- | --- |
| Visitante y cuenta sin ámbitos | Orientación clara e Impacto público accesible |
| Una zona y varias campañas | Entradas inequívocas sin pantalla intermedia de campaña |
| Mapa, zona sin geometría y fallo de carga | Acceso alternativo por tarjetas siempre disponible |
| Plantador en A, administrador en B | Roles y acciones por ámbito sin contaminación entre zonas |
| ADMIN, GENERAL y VALIDADOR | Se conservan sus flujos internos legítimos |
| Borrador, activa y cerrada | Se representa estado real y solo acciones concedidas |
| Equipo sin foto y listado paginado | Avatar, continuidad del listado y ausencia de contacto |
| Alta, retiro y reemplazo | Confirmación explícita y resultado coherente, sin borrar historia |
| Último administrador | Rechazo o reemplazo atómico según contrato |
| Sin stock frente a fallo de stock | Mensajes y acciones distintos |
| Registro confirmado y refresco fallido | Comprobante conservado, sin segunda escritura |
| Respuesta perdida o permiso retirado | Recuperación del mismo intento e historial permitido |
| Cambio de cuenta | Sin datos, selección privada ni borradores ajenos |
| Enlace directo/antiguo, Atrás y recarga | Destino coherente o explicación de indisponibilidad |

Verificar móvil y escritorio, teclado/foco, nombres accesibles, contraste, controles táctiles y salida del mapa. Probar el recorrido operativo sin depender del GPS y con fallos de red. No prometer registro offline.

## Evidencia necesaria al implementar

- Pruebas de comportamiento correspondientes a los criterios UX01–UX05.
- `npm run lint`, `npm run test` y `npm run build`. El build incluye TypeScript; no existe script separado typecheck.
- QA visual con los tres perfiles UX y regresión de accesos internos.
- Cotejo real de permisos y endpoints para acreditar B01–B03: los mocks no prueban autorización backend.
- Documentación de convenciones solo si efectivamente cambian. Registrar deuda nueva en FRONTEND_AUDIT cuando se detecte; estas dependencias de una función futura no se presentan como defectos implementados.

## Estado de esta entrega documental

Specs escritas a partir de código, documentación y acuerdos de la llamada. No se modificó la aplicación ni se ejecutó QA visual o backend. Los checks documentales verifican enlaces y estructura, no comportamiento de producto.
