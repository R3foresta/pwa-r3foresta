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
5. Mientras backend no habilite timeline/eventos completos, mantener placeholders en UI pero no acoplar mocks dentro de `screens/`.
6. Los filtros por etapa se construyen en dos niveles: pre-filtro backend (`estado_lote`) y post-filtro local (`utils/stageFilters.ts`) para mantener consistencia de UX.
7. Los hooks no deben conocer detalles de consulta backend; consumen solo métodos de service y exponen `refetch`.

## Siguiente paso recomendado

Implementar pantallas por evento (`EMBOLSADO`, `ADAPTABILIDAD`, `MERMA`, `DESPACHO`) reutilizando:

1. `types/contracts.ts` como fuente única de enums y DTOs.
2. `services/lotes-vivero.service.ts` para consumo HTTP.
3. `utils/validators.ts` para reglas de cantidad, unidad y fecha.
