# Modulo 2 - Vivero (estructura base)

Este modulo usa organizacion **feature-first** con separacion por responsabilidad.

## Estructura

```txt
src/modules/vivero/
  components/        # UI reutilizable del modulo (cards, timeline, forms)
  hooks/             # Orquestacion de estado/side-effects por caso de uso
  mappers/           # Adaptadores backend -> modelos de UI
  screens/           # Paginas/rutas del modulo
  types/             # Tipos y contratos del dominio vivero
  utils/             # Helpers especificos del modulo (fechas, estados, saldo, filtros)
  index.ts           # Barrel publico del modulo

src/api/
  lotes-vivero.api.ts # Capa HTTP pura (sin reglas de negocio)

src/services/
  lotes-vivero.service.ts # Caso de uso (orquesta filtros, parseo y mappers)
```

## Reglas de mantenimiento

1. `screens/` no debe contener logica de negocio pesada.
2. Conversiones de payload/respuesta se centralizan en `mappers/`.
3. Tipos de dominio viven en `types/` y se exportan desde `index.ts`.
4. Componentes reutilizables se promueven a `src/components` solo si son cross-modulo.
5. El timeline completo se consume desde `GET /lotes-vivero/:id/timeline`; los formularios de evento usan evidencias pendientes antes del POST transaccional.
6. Los filtros por etapa se construyen en dos niveles: pre-filtro backend (`estado_lote`) y post-filtro local (`utils/stageFilters.ts`) para mantener consistencia de UX.
7. Los hooks no deben conocer detalles de consulta backend; consumen solo métodos de service y exponen `refetch`.

## Compatibilidad T1/T2 desde T3

Acceso efectivo mediante `OperationalAccessProvider` y capacidades por vivero; el catálogo no concede permisos. `api/origenes.api.ts` consume únicamente material mínimo paginado de `GET /api/v1/vivero/origenes?vivero_id=…`; el alta no consulta fichas/fotos M1 de otro recolector. `vivero_id` permanece como cadena exacta en selección y carga previa de fotos. Cambiar vivero invalida evidencias preparadas; un envío en curso congela su selección. Cambiar cuenta/desmontar impide que una subida tardía dispare el alta con otra sesión.

`/app/vivero/material` permite consultar material y registrar DESECHO con capacidad del almacenamiento, sin M1 ni permiso por autoría. El saldo procede del servidor. Ante incertidumbre se consulta de nuevo antes de preparar otra operación; las operaciones físicas siguen sin comando durable (AUD-007).

La entrega usa `/:lote/despacho/evidencias-pendientes`; INICIO usa la ruta genérica con `vivero_id`. `useM2Logistics` cruza operación M2 por vivero con COORDINADOR del equipo M3 leído del servidor; ADMIN deriva autoridad. El consumo M3 no incorpora un requisito de acceso al vivero. La revisión documental previa no acredita recepción física: T4/T5 no están implementadas aquí. [QA T3 y límites](../../../docs/QA_T3_ACCESOS.md).

## Estado actual

Las pantallas de `EMBOLSADO`, `ADAPTABILIDAD`, `MERMA`, `DESPACHO`, `DESCARTE_PRE_EMBOLSADO`, el timeline, las evidencias, las asignaciones físicas y las devoluciones ya están conectadas al service/API correspondiente.

El flujo principal de eventos reutiliza:

1. `types/contracts.ts` como fuente única de enums y DTOs.
2. `services/lotes-vivero.service.ts` para consumo HTTP.
3. `utils/validators.ts` para reglas de cantidad, unidad y fecha.

La ruta legacy de Embolsado ya redirige al formulario unificado (`AUD-006`, resuelto). Continúan la idempotencia durable/recuperación de eventos físicos y su QA integrado (`AUD-007`); no confundirla con el motor de comandos C04–C09 de Participación. Consultar la [auditoría vigente](../../../FRONTEND_AUDIT.md) antes de retomar pendientes.


T4 añade localmente [recepción de semillas y esquejes](../../../docs/QA_T4_RECEPCION.md) desde Vivero, con cola/detalle propios, confirmación e incidencia/resolución recuperables. Requiere096 y revisión/corte coordinados; M3 y plantas externas conservan su alcance separado.
