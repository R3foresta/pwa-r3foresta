# Revisión coordinadora de T4 · 6 de noviembre de 2026

**Implementación local revisada y corregida, sin hallazgos pendientes en esta revisión.**
La aplicación/cotejo de 096, conciliación y corte de cliente/servidor siguen separados.
Bases: Backend `032527a342d5e696e3cb15e5903355d04a91560a`, PWA
`fc48be2d1c317d004fd88fd0f4ca009a1c9cb47d`, más el árbol de T4.
[Evidencia independiente y huellas](../../Backend-r3foresta/docs/evidencia/t4-revision-coordinadora-2026-11-06.json).

## Hallazgos corregidos

| Caso | Corrección y prueba |
|---|---|
| P2 · 1,001 kg frente a 1001 g | La multiplicación binaria producía 1000,9999999999999 y bloqueaba una resolución conforme. Comparación decimal exacta con BigInt sobre el valor enviado, sin tolerancias ni redondeo. Mantiene diferencias reales de una millonésima de gramo, UNIDAD entera y unidades incompatibles. El mínimo del input también respeta la conversión kg/G. |
| P2 · Retiro de un vivero conservando otro | El permiso agregado seguía siendo verdadero y conservaba detalle/fotos del establecimiento retirado. La pantalla reconsulta y cancela la lectura al cambiar capacidades; filtra inmediatamente detalle y cola por los viveros actuales. La recuperación del recibo propio permanece independiente. |

Las dos pruebas de comportamiento fallaron antes de cambiar producción y pasaron
tras corregirlo. Se añadieron ocho casos de equivalencia/diferencia decimal;
la suite focal final tiene **22 pruebas**. Se conservaron los dos formularios
preexistentes, el resto del código de T4 y 092–096; no se cambió SQL al revisar.

## Comprobación independiente

Con Node **24.19.0** explícito y npm **12.0.2**:

| Comprobación | Resultado |
|---|---|
| Backend build y `test:unit -- --runInBand` | 89 suites / **1.268 pruebas** aprobadas. |
| PWA `npm test` | 92 archivos / **1.273 pruebas** aprobadas. |
| PWA `npm run lint` y `npm run build` | Aprobados; aviso previo de tamaño MapLibre conservado. |
| Runner PostgreSQL/PostGIS T4 | **69 grupos SQL**, **8 carreras observadas** y **7 HTTP/JWT** reales aprobados; clúster privado detenido/eliminado. |
| OpenAPI T4, T2, M1 y participación | Reproducibles: 6, 36, 5 y 41 rutas; participación conserva 86 schemas. |
| Diffs y conservación por SHA-256 | Sin errores de whitespace; migraciones y trabajo preexistente conservados. |

La revisión SQL cubre permisos M2 sin M1, veto de autorrecepción, incidencia y
resolución, atomicidad/replay/revisión, revocación/rol/baja, bypass del ledger,
conciliación del legado y continuidad M3 sin doble débito. La revisión de código
comprueba guard verificado, cliente privado, proyección mínima, evidencia contextual
y recuperación propia tras perder acceso. Los dos fallos iniciales de ejecución
por sandbox (memoria compartida PostgreSQL y sockets/caché locales) se resolvieron
repitiendo los comandos con permiso de ejecución; no eran fallos del producto.

Se cotejaron los 33 artefactos de entrega por hash y se inspeccionaron las capturas
originales de incidencia móvil y confirmación de escritorio. La QA previa conserva
**28 checks de Chrome/10 capturas** con API/Storage/cuentas sintéticas; no se repitió
el navegador en este cierre. Las nuevas regresiones UI se probaron en jsdom.
[Entrega inicial y límites del navegador](QA_T4_RECEPCION.md).

No se acredita Supabase/Storage/WebAuthn remoto, Pinata/mint, reconstrucción completa
001–096, SQL aplicado, commit de entrega, push, corte ni despliegue. VALIDADO antiguo
no prueba recepción: remanentes con movimientos o fuera de ventana requieren
conciliación real. T5 no se inició. El contrato vigente y procedimiento están en
[Backend T4](../../Backend-r3foresta/docs/t4-recepcion-semillas.md).
