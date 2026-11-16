# T5 · Procedencia de Plantación e historial de Vivero

## Recorrido verificado en Chrome

El 16 de noviembre de 2026, el usuario preparó la asignación y guardó una plantación en la subcampaña `SUB-001-CMP-2026-040` (104), campaña Cota Cota (91). El administrador abrió **Registros → Ver detalle del registro** en el frontend local.

| Dato observado | Valor |
| --- | --- |
| Plantación | `PLT-001-SUB-001-CMP-2026-040`, registro 20 |
| Cantidad utilizada | 1 unidad |
| Asignación | 53 |
| Lote de Vivero | 125, `VIV-INC-056f75d8f0ac4c7cb928c264b16bbb3c` |
| Origen del consumo | Saldo inicial · Producción propia |
| Historia anterior al conteo | Sin registro |

Desde **Ver historial del lote**, el despacho mostró la asignación 53 y el enlace a la subcampaña 104. El historial confirmó la carga de todos los eventos del corte. La pestaña Evidencia mostró la incorporación con acceso temporal y una imagen JPEG de 62.748 bytes, además de las fotos de adaptabilidad, merma y entrega. La ficha pública del registro 20 mostró la evidencia de plantación 788. La aplicación de las migraciones 109 y 110 fue confirmada por el usuario.

## Verificación automatizada

- `npm run test -- --maxWorkers=2` ejercita las lecturas privada propia y administrativa, el reintento, los consumos de una especie repartidos entre lotes, IDs vecinos mayores al entero seguro de JavaScript, los vínculos del despacho y el fallo parcial de consulta o firma.
- `npm run lint`, `npm run build` (TypeScript y PWA) y `git diff --check`. El build conserva el aviso conocido de tamaño del paquete MapLibre.

Los fallos de firma y consulta y la lectura propia con otra cuenta se probaron con respuestas simuladas. La verificación manual corresponde a Chrome de escritorio. Queda pendiente la aceptación en un teléfono físico.
