# Tarea para backend: avance previo por especie en el contexto de registro inicial

**Estado:** backend local candidato entregado el 26 de octubre de 2026; integración compatible en PWA. Pendientes el cotejo y despliegue por entorno.

**Destino:** equipo de backend de R3foresta.

**Prioridad:** necesaria para recuperar el avance acumulado en el paso 2 del registro de plantación.

## Problema y antecedente

El paso 2 del formulario actual (`/app/participacion/subcampanias/:id/registrar`) ya recuperó el contador `− / +` por especie del commit frontend [`20157dc`](https://github.com/R3foresta/pwa-r3foresta/tree/20157dca78b739d9e93a19ebe5c228acedf160f1). Falta el dato oficial de cuánto se había plantado **antes de este registro** para volver a mostrar el avance acumulado de cada especie. `saldo_elegible` indica disponibilidad de stock y no equivale a plantas ya registradas.

Esto existía en el flujo anterior y funcionaba en su implementación: `GET /api/subcampanias/:id/plantacion/context` devolvía `plan_por_especie[].plantado_inicial` y `pendiente_meta`; el componente `SpeciesCounterRow` los mostraba junto con la cantidad propuesta. El servicio backend anterior (revisión `2e7e7af`) calculaba el plantado desde los detalles de registros iniciales y tenía pruebas para avance parcial, meta cubierta y meta excedida. Al migrar al contrato v1 se retiró ese endpoint y su reemplazo `GET /api/v1/subcampanias/:id/contexto-registro` sólo incluye, por especie, `planta_id`, `nombre`, `porcentaje_objetivo`, `cantidad_objetivo` y `saldo_elegible`. No se pide reactivar el endpoint legado.

## Petición concreta

Ampliar **`GET /api/v1/subcampanias/:id/contexto-registro`**, en cada objeto de `data.especies`, con:

1. **`plantado_inicial`**: número entero no negativo de plantas de esa especie registradas como plantación **inicial** en esa subcampaña antes de la nueva intención. Debe ser el acumulado efectivo oficial, no el del usuario actual ni una deducción del stock.
2. **`pendiente_meta`**: número entero no negativo de plantas pendientes para la meta orientativa de esa especie, calculado por backend con el mismo estado efectivo y sin usarlo como límite de registro. Si el equipo prefiere otro nombre canónico, acordarlo en el contrato antes de desplegar.

Ejemplo de la parte ampliada de una respuesta válida:

```json
{
  "data": {
    "especies": [
      {
        "planta_id": "8",
        "nombre": "Especie A",
        "porcentaje_objetivo": 40,
        "cantidad_objetivo": 80,
        "saldo_elegible": 70,
        "plantado_inicial": 30,
        "pendiente_meta": 50
      }
    ]
  },
  "observado_en": "2026-10-26T12:00:00Z"
}
```

Este fragmento muestra sólo los campos relevantes; la respuesta completa conserva `subcampania`, `actor`, `disponibilidad` y `reglas` actuales. Con 30 plantadas previamente y 10 propuestas, la UI puede representar `40 / 80` como avance **propuesto** sin afirmar que ya quedó guardado. La meta sigue siendo orientativa: una propuesta puede superarla si hay `saldo_elegible`, y el backend revalida stock y plan al confirmar.

## Semántica por confirmar en backend

- Contar los hechos iniciales de la misma subcampaña y especie; excluir reposiciones. Una especie sin registros previos devuelve `plantado_inicial = 0` y `pendiente_meta = cantidad_objetivo`.
- Definir y documentar cómo afectan las correcciones INT07 al acumulado efectivo; evitar sumar cantidades originales anuladas o reemplazadas. La lectura debe concordar con las cantidades efectivas que el backend usa en sus demás proyecciones.
- `pendiente_meta` debe ser `max(0, cantidad_objetivo - plantado_inicial)` según la meta vigente. Puede ser `0` aunque `saldo_elegible` sea positivo.
- Obtener plan, acumulado y saldo en una lectura coherente. Mantener autorización, errores, envelope y privacidad del contexto v1; no exponer IDs de lotes, asignaciones ni datos de otros participantes.

## Criterios de aceptación

- Para cada especie del plan, el contexto devuelve ambos enteros; probar sin registros, con varias plantaciones iniciales, meta cubierta/excedida y stock cero.
- Probar que una reposición no incrementa `plantado_inicial` y que una corrección efectiva se refleja según la semántica acordada.
- Tras una plantación inicial confirmada, la siguiente lectura del contexto muestra el acumulado actualizado; un intento rechazado o no confirmado no se suma como hecho.
- El contrato OpenAPI, los validadores de respuesta, las pruebas del servicio/RPC y un fixture de ejemplo quedan actualizados.
- Se coordina el despliegue con frontend: el validador anterior de `data.especies[]` rechazaba campos desconocidos (`src/modules/participacion/api/registro.contract.ts`). La PWA local ya acepta ambos campos opcionales y muestra la barra cuando llegan completos; publicar esta versión antes de que backend los emita. Exigirlos en frontend sólo tras verificar el contrato ampliado en el entorno destino.

## Referencias verificables

- Frontend anterior: `git show 20157dc:src/modules/plantacion/types/contracts.ts` (`PlanEspecieContext`) y `git show 20157dc:src/modules/plantacion/components/registro/SpeciesCounterRow.tsx`.
- Backend anterior: `git show 2e7e7af:src/subcampanias/application/subcampanias-plantacion-context.service.ts` y su prueba homóloga.
- Backend actual: `migrations/075_pa_int03a_registro.sql`, función `pa_registro_contexto_leer`, y `docs/pa-int02d-compatibilidad.md`.
- Frontend actual: `src/modules/participacion/registroTypes.ts`, `src/modules/participacion/api/registro.contract.ts` y `src/modules/participacion/README.md`.

**Entrega esperada:** confirmación de nombres y semántica, cambio backend probado, contrato actualizado y coordinación del orden de despliegue con frontend.
