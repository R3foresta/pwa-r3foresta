# Reutilización del formulario de meta y especies

Fecha: 2026-10-09.

## Pantallas identificadas

- Creación de subcampaña, paso 2: `CrearSubcampanaScreen` → `SubcampaniaEspeciesStep`.
- Revisión ADMIN en BORRADOR/ACTIVA: `DetalleSubcampanaScreen` → `EditarPlanSubcampania` → `EditarPlanSubcampaniaModal`.

Ambos usan `PlanMetaEspeciesForm`, `usePlanMetaEspeciesForm` y los validadores/adaptadores de `planMetaEspeciesForm.ts`. El formulario común contiene los incrementos de meta, tarjetas por especie, porcentajes editables y ±5%, equivalencias, selección del catálogo y errores por campo. No hace llamadas API. Cada flujo conserva su carga, permisos, borrador/confirmación y guardado.

## Comportamiento verificado

- Precarga del editor exacta, incluyendo cantidades independientes de porcentajes decimales persistidos. Consultar otra revisión conserva la propuesta local.
- Cambiar meta o porcentaje recalcula cantidades usando el mismo reparto que se envía. Meta 60 con 45%/55% muestra y propone 27/33.
- El catálogo distribuye únicamente el porcentaje restante, en centésimas, entre las especies nuevas; ±5% cambia la especie elegida. Los borradores conservan 33.33%/66.67% al reabrir.
- Meta 10 con 33%/33%/34% muestra y envía 3/3/4, corrigiendo la diferencia anterior entre equivalencia mostrada y payload.
- Cantidades manuales del editor continúan permitidas y deben sumar la meta. El resumen compara actual/propuesto y muestra especies agregadas/retiradas.
- Entradas inválidas se conservan y se explican. Los bloqueos por envío, permiso, estado, conflicto y retirada protegida continúan cubiertos.
- La referencia de stock de vivero solo se muestra cuando está disponible. Añadir una especie sin existencias permite planificar y no crea stock. Las regresiones de plantación mantienen el límite de stock y la posibilidad de superar la meta; el cierre manual permanece independiente.
- La revisión del plan sigue siendo un único request atómico con versión. Este refactor no cambia el contrato backend.

## Evidencia

- `npm run test`: **184 pruebas, 19 suites**, todas pasan; 35 casos añadidos en este cambio.
- `npm run lint`: pasa.
- `npm run build`: pasa TypeScript, Vite y generación PWA.
- `git diff --check`: pasa.
- Navegador local: componentes reales del asistente y editor con servicios simulados. Se ajustó meta 40→60 y porcentajes 50/50→45/55 en ambos; se revisó y confirmó el editor, verificando propuesta 60 y metas 27/33. Se completó el asistente; consola sin errores ni avisos.

La verificación visual no escribió datos remotos ni acredita una prueba integrada contra la base de datos desplegada. Las pruebas automatizadas existentes del editor/API, cierre y registro de plantación se ejecutaron nuevamente. El pendiente de integración backend señalado en AUD-015 permanece.
