# Recepción única — primera iteración frontend

Fecha: 12 de noviembre de 2026. Rama: `codex/refactoring-recollection-screen`.
Contrato: [recepción única backend 100](../../Backend-r3foresta/docs/t4-recepcion-semillas.md), commit backend `6e5e756` de `recollection-refactoring`.

## Alcance

- Bandeja `/app/collections/validate`, con detalle por ID y compatibilidad de enlaces anteriores.
- Cards del diseño de validación y `PhotoUploader` compartido; mini pantalla al pulsar Recepcionar.
- Cantidad/unidad declaradas de solo lectura, fecha física y 1–5 fotos nuevas de hasta 15 MiB.
- Recepción + validación o rechazo con motivo para corregir la misma ficha. Las decisiones requieren revisión vigente, confirmación explícita e intención recuperable.
- ADMIN global o VALIDADOR asignado al vivero; no se exige M1 ni se permite autorrecepción. La asignación M2 sigue habilitando operación de Vivero.
- Recuperación propia disponible tras perder acceso/rol, sin autorizar nuevas lecturas ni decisiones.
- Retiro de aprobación documental autónoma, incidencia/resolución y pantallas de conciliación; actualización de consumidores de permisos, material y auditoría.
- La ficha recibida conserva consulta de fotos, fecha física, instante de registro e historial auditable, sin acciones para modificar eventos. Los nombres de vivero/método se completan con catálogos existentes; la bandeja enriquece su página con hasta tres detalles simultáneos.

No se modifica backend ni se aplican migraciones, reinicios de datos, cambios de permisos reales o despliegues desde esta entrega.

## Verificación

Ejecutado sobre el workspace final de esta rama:

| Comando | Resultado |
| --- | --- |
| `npm run test -- --maxWorkers=2` | 96 archivos y 1.335 pruebas aprobadas. |
| `npm run lint` | Aprobado, sin errores ni advertencias. |
| `npm run build` | Aprobado: TypeScript, Vite y PWA. Persiste el aviso conocido de tamaño del chunk MapLibre. |
| `git diff --check` | Aprobado. |

Las pruebas de recepción cubren semillas/esquejes, confirmación explícita, rechazo con revisión fresca sin fotos, declaración de solo lectura, límite/fecha de fotos, conservación tras fallo de subida, recuperación sin permiso actual, aislamiento por cuenta y Web Locks entre pestañas, persistencia/limpieza fallida, respuestas tardías, snapshots rechazados, consulta histórica de recibidos y redirecciones con cursor. El contrato/API verifica las dos acciones, recibos incompatibles y precisión de IDs/revisiones; las regresiones existentes cubren Material/INICIO, navegación y acceso M1/M2.

Los dos archivos con cambios locales previos (`RecoleccionFormDatosScreen.tsx` y `recoleccionFormTypes.ts`) permanecieron intactos durante la verificación y se excluyen del commit de esta iteración. Los tests se ejecutaron con esos cambios presentes en el workspace. No se instalaron dependencias.

### Confirmación manual y cierre

El 12 de noviembre Pablo confirmó en este chat que funcionaron creación/envío/recepción/uso en Vivero y borrador/envío/rechazo/corrección/reenvío/recepción/uso. También confirmó los accesos con otros roles. Es validación manual reportada por el usuario; no se adjuntaron logs, actores ni IDs para reproducirla. Pérdida de respuesta y recepción simultánea mantienen su cobertura simulada y su comprobación manual pendiente.

Al autorizar commit y merge a main, se incorporan también los dos ajustes de captura antes preservados: Unidades como selección inicial y opciones Unidades/G/kg con estado accesible y distribución uniforme. Su contenido coincide con el workspace sobre el que pasaron los checks anteriores.

## Límites y corte

Se releyeron las actualizaciones del chat «Analizar flujo de recolección» durante el cierre. Pablo confirmó allí el reinicio operativo y la ejecución exitosa de 100; el backend quedó en el commit local `6e5e756`, sin push según ese chat. Esta entrega toma esa aplicación como reportada por el usuario: no vuelve a ejecutar el reinicio ni acredita por sí sola catálogo remoto, publicación de API/PWA o limpieza física de Storage. Los informes T4/096/097 anteriores permanecen históricos.

La revisión inicial del navegador local indicó que el uso estaba deshabilitado en Work. Las pruebas con respuestas simuladas no acreditan JWT, Storage, PostgreSQL, blockchain ni el recorrido autenticado en el destino. La aceptación visual en móvil y el corte externo permanecen en AUD-035.

Blockchain se intenta después de confirmar recepción y no determina su persistencia. El contrato no ofrece reintento externo durable; una subida de fotos tampoco confirma la recepción.

El cotejo de fuentes encontró una discrepancia: OpenAPI tipa `historial.fecha` como día, mientras 100 proyecta `h.created_at` y 014 define esa columna como `TIMESTAMPTZ`. El adaptador admite día o instante explícitos; la presentación conserva la hora en Bolivia para los instantes y evita desplazar los días. Queda pendiente alinear la documentación backend con SQL.

Los comandos locales del contrato T4 anterior no se convierten ni se borran automáticamente. Deben revisarse antes del corte; el cliente bloquea nuevas decisiones si encuentra una intención incompatible, conservando su contenido.

El formulario legado de captura/corrección conserva su validación de 45 días también en edición. La recepción nueva permite una fecha de origen antigua, pero corregir esa ficha puede bloquearse previamente en captura; ese ajuste separado queda registrado en AUD-036. No se cambian los ajustes de unidades que ya estaban sin commit al comenzar esta tarea.
