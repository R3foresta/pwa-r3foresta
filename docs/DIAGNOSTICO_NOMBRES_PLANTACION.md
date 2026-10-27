# Diagnóstico de nombres de plantas en Plantación

Fecha: 27 de octubre de 2026. Hallazgo: **AUD-027**. El primer análisis fue documental; la continuación implementó la corrección de nombres en frontend/backend y cotejó el catálogo Supabase configurado. Estado: corregido localmente; aceptación visual autenticada y publicación externa pendientes.

## Fotos compartidas con voluntarios — continuación del 27 de octubre

El usuario aceptó con captura la tarjeta ADMIN y solicitó la misma presentación para voluntarios. Ambas pantallas ya utilizaban `src/modules/plantacion/components/SubcampaniaSpeciesCard.tsx`; la diferencia estaba en los datos recibidos:

| Audiencia | Pantalla | Fuente de especies |
| --- | --- | --- |
| Interna/ADMIN | `src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx`, sección Resumen | `GET /api/subcampanias/:id/plan`, que ya incluía nombres y `planta.imagen_url`. Pasa `onEdit` sólo si puede editar. |
| Voluntario/administrador contextual | `src/modules/participacion/components/ParticipacionSubcampaniaDetail.tsx`, sección Resumen | `GET /api/v1/subcampanias/:id/contexto-registro`; entregaba nombre/metas sin foto. Ahora admite y pasa `especies[].imagen_url` a la misma tarjeta, sin `onEdit`. |

`SubcampaniaDetailRoute.tsx` selecciona la pantalla según audiencia en la misma URL de detalle. No se creó otra tarjeta ni se duplicaron estilos. Se amplió el contexto v1 con `imagen_url` opcional/nullable y se coordinó `registroTypes.ts`, `registro.contract.ts`, el servicio backend y OpenAPI. Backend usa la foto que ya obtuvo al resolver los nombres, únicamente de las plantas del contexto autorizado; omite el campo cuando no hay foto. No se consulta el catálogo interno desde el navegador participante. Stock, permisos, revisión, payloads y snapshots conservan su comportamiento. La foto del catálogo es ilustrativa, no evidencia de plantación.

La tarjeta compartida ya maneja ausencia/error de foto conservando nombre y objetivos. Las regresiones nuevas cubren PLANTADOR y ADMINISTRADOR_SUBCAMPANIA con la tarjeta real, recepción de la foto, foto fallida/ausente/null, ausencia de edición, contexto no disponible y compatibilidad del validador con/sin imagen. Backend verifica nombre/foto para ADMIN y VOLUNTARIO sin lecturas adicionales de catálogo.

Verificación: frontend `npm run test -- --maxWorkers=2` (**64 archivos/888 pruebas**), `npm run lint`, `npm run build` (TypeScript/PWA); backend `npm run test:unit -- --runInBand` (**74 suites/1013 pruebas**), `npm run build`, lint focal de los dos TS modificados, generador OpenAPI y `--check` (**39 rutas/84 schemas**). Diff-check aprobado. El primer build backend falló con ENOTEMPTY al limpiar `dist`; la repetición pasó sin cambios de fuente. El build frontend conserva el aviso de tamaño de MapLibre.

Orden de publicación: frontend que acepta el campo opcional, después backend que lo emite y recarga de la PWA; no asumir que un cliente anterior con validación cerrada admite campos nuevos. Se recarga el backend local para servir la extensión, sin aplicar SQL ni registrar plantaciones. La revisión visual autenticada del voluntario sigue pendiente porque Work informa que el uso del navegador está deshabilitado. Esta continuación no acredita despliegue externo.

## Implementación y verificación de la continuación

- El catálogo real confirma: ID 42 `especie=Buddlejaceae`, común **Kiswara**; 49 `Azollaceae`, **Helecho de agua**; 50 `Araceae`, **Lechuga de agua**; 55 `Magnoliopsida`, **Ruda**. Las cuatro tienen `imagen_url`. Consulta de sólo lectura por el endpoint local de plantas y por el nuevo lector contra Supabase; no se inventaron equivalencias ni cambiaron datos de catálogo.
- `Backend-r3foresta/src/plantas/planta-presentacion.ts` centraliza una consulta privada limitada a los IDs del plan/contexto ya autorizado. Normaliza nulos/vacíos/espacios y elige común, luego científico, luego ID si faltan ambos. El fallo de catálogo mantiene error recuperable y no se convierte en saldo cero o plan vacío. No filtra plantas inactivas referenciadas por el plan.
- `SubcampaniasPlanService.obtener` adjunta común, científico y foto a cada planta después de la RPC de lectura. Meta, revisión y objetivos siguen procediendo de su mismo snapshot. La escritura del plan no depende de una consulta extra de catálogo ni cambia su confirmación.
- `ParticipacionRegistroService.contexto` conserva la autorización/validación de la RPC y sustituye sólo `especies[].nombre` por el nombre operativo del catálogo. El DTO v1 conserva exactamente su forma y alimenta subcampaña participante, stock ADMIN/voluntario, contadores y resumen de registro. No se cambian payloads, saldos ni histórico. Se alineó la descripción OpenAPI y se regeneraron sus dos artefactos.
- `getPlantaNombre` unifica presentación en catálogo/selector de plantas, detalle ADMIN, selector/asistente/resumen de creación y editor. `createPlanFormFromPlan` conserva el común remoto; `withPlanSpeciesNames` actualiza sólo nombres al recuperar/reconsultar una propuesta sin recalcular cantidades/porcentajes. El plan operativo no repite el científico como segunda línea cuando existe común. El catálogo de mantenimiento conserva su segunda línea taxonómica.
- `SubcampaniaSpeciesCard` admite la foto del GET del plan interno. Sin foto o ante error conserva el nombre y objetivo. El contexto v1 sigue entregando sólo el nombre; no se añadieron fotos al stock/registro ni a la tarjeta participante, dado que ese DTO no las expone.
- Frontend: `npm run test -- --maxWorkers=2`, **63 archivos/874 pruebas**; `npm run lint`; `npm run build` (incluye TypeScript/PWA); `git diff --check`, aprobados. El build conserva el aviso conocido de tamaño del chunk MapLibre. Se adaptaron fixtures antiguos que confundían `especie` con nombre común y se añadieron regresiones de prioridad, vacíos, recuperación de propuesta y foto fallida.
- Backend: `npm run build`; lint sin `--fix` sobre los siete archivos TypeScript corregidos; `npm run test:unit -- --runInBand`, **74 suites/1013 pruebas**; `node scripts/qa/pa-int02c-openapi.cjs --check`, **39 rutas/84 schemas**; `git diff --check`, aprobados. Los HTTP tests cubren GET del plan y autorización; el contexto usa mocks de RPC/catálogo para ADMIN y VOLUNTARIO. No equivalen a HTTP autenticado real con las dos cuentas.
- Se recargó el proceso local en el puerto 3000 con la compilación verificada. No se aplicó SQL, no se cambió stock, no se registró plantación y no hubo despliegue externo.
- Límite visual: el navegador permitió observar la sesión ADMIN antes de recargar backend, pero luego respondió «Local browser use is disabled in Work settings». No se acredita captura final ni recorrido autenticado real de ambas audiencias. Pendiente aceptación con recarga de las páginas abiertas. Historial/detalle propio conservan sus snapshots/IDs y el alcance contractual previo.

El diagnóstico siguiente conserva la causa anterior al arreglo, para trazabilidad.

## Diagnóstico inicial

La regla solicitada es mostrar **nombre común y, sólo cuando falte, nombre científico**. El código actual no la aplica de forma uniforme. La fuente operativa oficial del catálogo es `PLANTA.nombre_comun_principal`, según [RN-GEN-13](../../r3foresta-docs/00-general-module/01_reglas_de_negocio_general.md). No debe suponerse que `especie` equivale a ese campo.

Las dos capturas corresponden a componentes que reciben nombres por caminos distintos. En el código local el título puede proceder de `especie`, aunque visualmente parezca un nombre científico. Sin las respuestas del entorno de las capturas no se puede atribuir cada texto a un campo real ni afirmar que su nombre común está vacío.

La tarjeta **«Especies de plantas» muestra el plan** (`cantidad_objetivo` y `porcentaje_objetivo`), no las cantidades efectivamente plantadas. **«Disponibles para registrar» muestra saldo elegible**. Cambiar el nombre de presentación no debe modificar esos valores ni mezclar los dos conceptos.

## Lugares afectados y origen

| Pantalla o paso | Consumidor frontend | Origen y comportamiento actual |
| --- | --- | --- |
| Subcampaña interna/ADMIN: especies del plan | `DetalleSubcampanaScreen.tsx`, composición de `SubcampaniaSpeciesCard` | Usa `meta.planta.especie` como título y `nombre_cientifico` como segunda línea. `GET /api/subcampanias/:id/plan` no entrega `nombre_comun_principal` en la RPC local. |
| Subcampaña de voluntario/administrador contextual: especies del plan | `ParticipacionSubcampaniaDetail.tsx` → `SubcampaniaSpeciesCard` | Usa `context.especies[].nombre`, recibido de `GET /api/v1/subcampanias/:id/contexto-registro`. |
| Stock de subcampaña: ADMIN y participantes habilitados | `SubcampaniaAdminStock.tsx` / `PlantadorScopePanel.tsx` → `SubcampaniaStockDisponible.tsx` | Usa el mismo `context.especies[].nombre`; el componente no recibe los dos nombres por separado. |
| Registro inicial: especies y contadores | `RegistroSpeciesStep.tsx` → `RegistroSpeciesCounterRow.tsx` | Usa `species.nombre` del contexto de registro. Afecta también a ADMIN: `RegistrarPlantacionScreen.tsx` redirige al formulario v1 compartido. |
| Registro inicial: resumen previo a confirmar | `RegistroSummary.tsx` | Busca la especie por `planta_id` en el contexto y muestra su `nombre`. Hereda el mismo problema del paso anterior. |
| Edición de plan y recuperación del asistente | `planMetaEspeciesForm.ts`, `SubcampaniaEspeciesStep.tsx`, `PlanMetaEspeciesForm.tsx` | El formulario permite nombre común, pero `createPlanFormFromPlan` no lo obtiene del plan remoto. El asistente sólo conserva el nombre común del borrador local cuando existe. El fallback actual usa `especie`, no `nombre_cientifico`. |
| Selección de especies y resumen de creación | `CatalogoEspeciesPicker.tsx`, `SubcampaniaResumenStep.tsx` | Ya priorizan `nombre_comun_principal`; cuando falta recurren a `especie`. El selector muestra además el científico como segunda línea. No cumple todavía la regla solicitada de científico sólo en ausencia de común. |
| Historial de participante, ficha pública y filtros de Impacto | `ParticipacionDetalleHistorial.tsx`, `ImpactoRegistroContent.tsx`, `ImpactoConsultaScreen.tsx` | Muestran `nombre` de la proyección histórica. El backend usa snapshots: comercial primero, científico como alternativa. No es la misma causa del contexto operativo; falta comprobar sus valores históricos reales. |
| Detalle propio privado | `DetallePropioScreen.tsx` | Muestra `Especie {planta_id}`: el contrato `detalle-propio` sólo entrega ID y cantidad por especie. Para mostrar nombres necesita una ampliación coordinada de la lectura histórica. |

La ruta compartida decide la audiencia en `SubcampaniaDetailRoute.tsx`; compartir tarjeta visual no implica compartir la fuente de datos del plan.

## Causa en backend

1. **Contexto de registro**: `migrations/086_pa_contexto_registro_avance_especie.sql`, función `pa_registro_contexto_leer`, construye `nombre` con:

   ```sql
   coalesce(nullif(p.especie, ''), p.nombre_cientifico)
   ```

   Omite `nombre_comun_principal`. La definición anterior de `075_pa_int03a_registro.sql` tiene la misma prioridad. Esta lectura explica conjuntamente stock, plan de participantes, contadores y resumen de registro.

2. **Plan interno**: `migrations/062_subcampania_revision_plan_atomica.sql`, función `fn_subcampania_obtener_plan`, devuelve `planta.id`, `planta.especie` y `planta.nombre_cientifico`. Falta `nombre_comun_principal` también en `PlanEspecieMeta` del frontend.

3. **Historial**: `migrations/081_pa_int05_consulta.sql`, función `pa_i_registro`, usa `max(coalesce(nombre_comercial_snapshot, nombre_cientifico_snapshot))` al agrupar por especie. Ya prioriza el nombre comercial histórico, pero no trata cadenas vacías/espacios como ausentes. En `075`, la escritura inicial copia ambos snapshots del lote de vivero: cambiar el nombre visible en el contexto no reescribe esos snapshots.

## Corrección propuesta para una implementación posterior

1. En el contexto v1, resolver `nombre` desde `nombre_comun_principal` y después `nombre_cientifico`, considerando nulos, vacíos y espacios. Puede conservarse la forma actual del DTO: no hace falta crear otro endpoint ni descargar un catálogo privado desde las pantallas de voluntarios.
2. Ampliar la lectura del plan interno con `nombre_comun_principal`; adaptar el tipo, el mapeo al formulario y la tarjeta. Unificar la prioridad de presentación también en el selector y el resumen de creación. Mostrar el científico sólo cuando falte el común en estas vistas operativas.
3. Mantener IDs, cantidades, stock, revisión, permisos y payloads de registro. Las plantaciones se envían por ID/cantidad; los nombres son presentación. No cambiar identidad taxonómica ni rellenar nombres comunes por deducción.
4. Para históricos, usar `nombre_comercial_snapshot` y, si falta, `nombre_cientifico_snapshot`, sin completar desde el catálogo vivo. Revisar vacíos y acordar la ampliación de `detalle-propio` con los nombres históricos disponibles. No reescribir evidencia ni snapshots existentes.
5. Si se elige añadir campos al contexto v1 o al detalle propio, coordinar primero tipos y validadores: `registro.contract.ts` rechaza propiedades desconocidas. Corregir sólo el contenido de `nombre` evita ese cambio contractual en el contexto.

## Verificación y pendientes

- Inspección estática de componentes, rutas, tipos, clientes HTTP, RPC SQL y regla oficial de naming operativo. Se revisó el árbol de trabajo actual, que ya contenía cambios de otras tareas; no se alteraron esos archivos.
- No se consultaron respuestas autenticadas ni el catálogo de la base del entorno de las capturas. Pendiente contrastar `planta_id`, `especie`, `nombre_comun_principal` y `nombre_cientifico` de las cuatro plantas y los snapshots de sus registros. Si el común falta en catálogo, debe completarse mediante el flujo autorizado de mantenimiento; mientras tanto corresponde el científico.
- No se implementó la corrección ni se ejecutaron lint/tests/build por este diagnóstico documental. Su cierre requiere pruebas de nombre común presente, nulo, vacío y con espacios; mismo resultado en ADMIN y voluntarios; recarga/recuperación del plan; stock y captura; histórico conservado aunque cambie el catálogo.
- Comprobación documental: `git diff --check` y revisión de enlaces locales. No acredita integración ni despliegue.
