# Guía de contrato backend para QA del frontend

Actualizado: 2026-08-16

## 1. Propósito y límites

Esta guía describe el contrato HTTP que **el frontend actual intenta consumir**. Se infiere del código de `src/api`, `src/services`, los contratos TypeScript y las pantallas registradas en `src/App.tsx`.

No es documentación oficial del backend, no confirma que las rutas estén desplegadas y no define framework, base de datos, tablas ni arquitectura del servidor. El orden de verdad del dominio está descrito en [`DOMAIN_INDEX.md`](../DOMAIN_INDEX.md): si el backend oficial o la documentación fuente contradicen este archivo, se debe registrar la diferencia y corregir este documento o el frontend según corresponda.

Estados usados en las tablas:

- `CONFIRMADO EN FRONTEND`: existe una llamada literal y un consumidor o servicio en el repositorio.
- `POR CONFIRMAR`: el frontend presupone una forma de autenticación, respuesta o regla que debe validarse contra el backend real.
- `ENDPOINT REQUERIDO`: el frontend o el proceso de QA necesita una capacidad que no tiene contrato HTTP confirmado en este repositorio. No se propone una ruta definitiva sin acuerdo con backend.

Referencias principales: [`recolecciones.service.ts`](../src/services/recolecciones.service.ts), [`lotes-vivero.api.ts`](../src/api/lotes-vivero.api.ts), [`plantacion.api.ts`](../src/api/plantacion.api.ts), [`AuthContext.tsx`](../src/contexts/AuthContext.tsx) y [`App.tsx`](../src/App.tsx).

## 2. Configuración y URL base

La única variable pública documentada es:

```env
VITE_API_URL=http://localhost:3000
```

Fuente: [`.env.example`](../.env.example). Las capas HTTP agregan `/api`, por lo que el ejemplo consume `http://localhost:3000/api/...`. Algunas capas eliminan una barra final y otras concatenan directamente; se recomienda configurar `VITE_API_URL` sin `/` final y sin `/api`.

No hay variables frontend confirmadas para storage, CORS, cookies, tenant o ambiente. Vite expone cualquier variable `VITE_*` al navegador: nunca deben colocarse secretos allí.

## 3. Autenticación, sesión y roles visibles

### 3.1 Contrato observable

- WebAuthn obtiene un challenge y envía el objeto de registro/autenticación al backend; el frontend espera `{ success, user, token, auth_id, message? }`. Véanse [`webauthn.service.ts`](../src/services/webauthn.service.ts) y [`auth.types.ts`](../src/types/auth.types.ts).
- `authToken`, `auth_id` y `r3foresta:user` se guardan en `localStorage`.
- Las capas modernas envían `Authorization: Bearer <token>` cuando existe y `x-auth-id: <auth_id>` cuando existe; Vivero y Plantación requieren localmente `auth_id` antes de llamar.
- Perfil usa solamente `x-auth-id` en el código actual.
- Las transiciones de Recolección agregan `x-user-role`, obtenido de `r3foresta:user`. Este header es manipulable por el navegador y **no debe autorizar acciones por sí solo**; backend debe derivar identidad y rol de una credencial validada.
- No se usa `credentials: 'include'`; no hay contrato de cookies confirmado.

Roles visibles: `ADMIN`, `GENERAL`, `VALIDADOR`, `VOLUNTARIO`. La pantalla `/app/collections/validate` solo se muestra a `ADMIN` o `VALIDADOR`, pero el backend debe repetir esa autorización.

### 3.2 Discrepancias conocidas

- `/auth/login` usa WebAuthn real, pero `/auth/register` usa `AuthContext.login()` mock y crea una sesión local sin backend. No usar esa ruta mock como evidencia de autenticación válida. Fuente: [`RegisterScreen.tsx`](../src/modules/auth/RegisterScreen.tsx) y `AUD-011` en [`FRONTEND_AUDIT.md`](../FRONTEND_AUDIT.md).
- `AuthContext.logout()` limpia `r3foresta:user` y `auth_id`, pero no `authToken`; `WebAuthnService.logout()` sí limpia token y auth ID. No hay endpoint de revocación confirmado.
- El challenge devuelve también `sessionId`, pero registro/login reenvían `challenge` y no usan `sessionId`. La asociación, expiración y consumo único del challenge quedan `POR CONFIRMAR`.

## 4. Inventario de endpoints consumidos

En “contrato relevante”, `Envelope<T>` significa que varias capas aceptan `{ success, data, message?, error? }`; algunas también toleran un `T` directo. Esa tolerancia no debe interpretarse como recomendación: backend y frontend deberían acordar una sola forma.

### 4.1 Auth

| Método y ruta | Consumidor | Objetivo y contrato relevante | Estado |
|---|---|---|---|
| `GET /api/auth/challenge` | `WebAuthnService.getChallenge` | Respuesta `{ challenge: string, sessionId: string }`. | `CONFIRMADO EN FRONTEND`; consumo/expiración del challenge `POR CONFIRMAR` |
| `POST /api/auth/register` | `WebAuthnService.register` | JSON `{ username, email?, registration, challenge }`; espera `AuthResponse`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/auth/login` | `WebAuthnService.login` | JSON `{ authentication, challenge }`; espera `AuthResponse`. | `CONFIRMADO EN FRONTEND` |
| Revocación/logout de servidor, ruta por acordar | Ningún consumidor actual | Invalidar token/sesión; hoy logout es solo local. | `ENDPOINT REQUERIDO` si los tokens son revocables |

### 4.2 Usuarios y perfil

| Método y ruta | Consumidor | Objetivo y contrato relevante | Estado |
|---|---|---|---|
| `GET /api/users/profile` | `AuthContext`, Perfil | Header `x-auth-id`; devuelve `UserProfileResponse`. | `CONFIRMADO EN FRONTEND`; auth solo por `x-auth-id` `POR CONFIRMAR` |
| `POST /api/users/register-form` | Completar perfil | JSON `nombre`, `apellido`, `doc_identidad`, opcionales `wallet_address`, `organizacion`, `contacto`, `rol`; espera `{ success, user, message? }`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/users/profile/photo` | `AvatarUpload` | Multipart, archivo en campo `file`; espera `{ foto_perfil_url }`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/users/rol/:rol?q=` | Selectores de equipo/coordinación | Lista directa o `Envelope<UsuarioResumen[]>`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/users?q=&rol=` | Selectores de usuarios | Lista directa o `Envelope<UsuarioResumen[]>`. | `CONFIRMADO EN FRONTEND` |

### 4.3 Plantas

| Método y ruta | Consumidor | Objetivo y contrato relevante | Estado |
|---|---|---|---|
| `GET /api/plantas?q=&page=&limit=&incluir_inactivas=&tipo_planta_id=` | Catálogo, Recolección, Plantación | `{ success, data: PlantaCatalogo[], pagination }`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/plantas/:id` | Edición | `{ success, data: PlantaCatalogo }`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/plantas` | Alta | Multipart: campos de planta y `imagen?`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/plantas/:id` | Edición/reactivación | Multipart parcial; `activo=true` reactiva. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/plantas/:id/desactivar` | Administración | Devuelve planta actualizada. | `CONFIRMADO EN FRONTEND` |
| `GET /api/plantas/tipos-planta` | Formularios de plantas | `{ success, data: TipoPlantaCatalogo[] }`. | `CONFIRMADO EN FRONTEND` |

### 4.4 Comunidades y ubicaciones

| Método y ruta | Consumidor | Objetivo y contrato relevante | Estado |
|---|---|---|---|
| `GET /api/comunidades?pais_id=&q=&page=&limit=&incluir_inactivas=` | CRUD y selectores | `{ success, data, pagination }`; `pais_id` siempre se envía. | `CONFIRMADO EN FRONTEND` |
| `GET /api/comunidades/:id` | Edición/selección | `{ success, data: ComunidadCard | null }`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/comunidades` | Alta | JSON `{ pais_id, municipio_id, nombre, activo? }`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/comunidades/:id` | Edición | JSON parcial `{ nombre?, municipio_id?, activo? }`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/comunidades/:id/desactivar` | Administración | Devuelve comunidad o confirmación. | `CONFIRMADO EN FRONTEND` |
| `GET /api/ubicaciones/paises` | Recolección y CRUD | Array o `Envelope<PaisCatalogo[]>`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/ubicaciones/divisiones?pais_id=&parent_id=` | Selectores jerárquicos | Array o `Envelope<DivisionCatalogo[]>`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/ubicaciones/divisiones/flexible` | Alta flexible | JSON `{ pais_id, parent_id, nombre }`; el frontend tolera varias envolturas y normaliza a `{ success, data, created }`. | `CONFIRMADO EN FRONTEND`; forma única de respuesta `POR CONFIRMAR` |

La geocodificación inversa de la pantalla de Recolección llama directamente a Nominatim/OpenStreetMap; no es endpoint del backend R3foresta.

### 4.5 Organizaciones

| Método y ruta | Consumidor | Objetivo y contrato relevante | Estado |
|---|---|---|---|
| `GET /api/organizaciones?tipo=&activo=` | CRUD, campañas | `{ success, data, pagination? }`. El API actual no envía `q`, `page`, `limit` aunque los tipos los declaran. | `CONFIRMADO EN FRONTEND`; filtros extra `POR CONFIRMAR` |
| `GET /api/organizaciones/:id` | Edición | `{ success, data: Organizacion | null }`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/organizaciones` | Alta | JSON o multipart cuando hay `logo`; campos `nombre`, `tipo`, `activo?`, `logo?`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/organizaciones/:id` | Edición/reactivación | JSON `{ nombre?, tipo?, activo? }`. | `CONFIRMADO EN FRONTEND` |
| `DELETE /api/organizaciones/:id` | Baja | Espera `data.metodo = hard_delete | soft_delete`; ante `422` relacionado con campañas, el frontend intenta `PATCH activo=false`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/organizaciones/:id/logo` | Logo | Multipart `logo`; espera `logo_url`. | `CONFIRMADO EN FRONTEND` |
| `DELETE /api/organizaciones/:id/logo` | Logo | Espera `logo_url: null`. | `CONFIRMADO EN FRONTEND` |

### 4.6 Recolecciones

Tipos y payloads completos: [`recolecciones.service.ts`](../src/services/recolecciones.service.ts) y [`recoleccionForm.ts`](../src/modules/recolecciones/validators/recoleccionForm.ts).

| Método y ruta | Consumidor | Objetivo y contrato relevante | Estado |
|---|---|---|---|
| `GET /api/recolecciones?page=&limit=&q=&search=&tipo_material=&planta_id=&vivero_id=&fecha_inicio=&fecha_fin=` | Listado, mapa, selector de origen Vivero | Array, `Envelope<Recoleccion[]>` o `data.items`; debe exponer paginación y campos de tarjeta. | `CONFIRMADO EN FRONTEND`; respuesta múltiple tolerada `POR CONFIRMAR` |
| `GET /api/recolecciones/:id` | Detalle, edición | Recolección directa o `Envelope<Recoleccion>` con relaciones, estados, saldos y permisos. | `CONFIRMADO EN FRONTEND` |
| `POST /api/recolecciones` | Crear borrador | Multipart: `fecha`, `cantidad_inicial_canonica`, `unidad_canonica`, `tipo_material`, `planta_id`, `metodo_id`, `vivero_id`, `observaciones?`, `ubicacion[...]`, múltiples `fotos`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/recolecciones/:id/draft` | Editar borrador | JSON parcial si no hay ubicación/fotos; si existen, multipart con los mismos nombres y múltiples `fotos`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/recolecciones/:id/submit` | Detalle y resumen | Sin body; transición autorizada a `PENDIENTE_VALIDACION`. La pantalla recarga `GET /:id` después. | `CONFIRMADO EN FRONTEND` |
| `GET /api/recolecciones/pending-validation?page=&limit=&fecha_inicio=&fecha_fin=&search=` | Bandeja de validación | Lista paginada; solo `ADMIN`/`VALIDADOR`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/recolecciones/:id/approve` | Bandeja de validación | Sin body; devuelve recolección aprobada. La UI dice que se acuña NFT, pero el resultado blockchain exacto no está tipado. | `CONFIRMADO EN FRONTEND`; blockchain `POR CONFIRMAR` |
| `PATCH /api/recolecciones/:id/reject` | Bandeja de validación | JSON `{ motivo_rechazo }`; devuelve recolección rechazada. | `CONFIRMADO EN FRONTEND` |
| `GET /api/evidencias-trazabilidad/recolecciones/:id` | Detalle | Array o `Envelope<EvidenciaTrazabilidad[]>`; debe incluir `public_url` segura para preview. | `CONFIRMADO EN FRONTEND` |
| `POST /api/evidencias-trazabilidad/recolecciones/:id` | Agregar evidencias | Multipart con 1–5 `fotos` y opcionales `titulo`, `descripcion`, `metadata` JSON, `es_principal`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/metodos-recoleccion` | Catálogo de formulario | Array o `Envelope<MetodoRecoleccionCatalogo[]>`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/viveros` | Catálogo de formulario | Array o `Envelope<ViveroCatalogo[]>`. | `CONFIRMADO EN FRONTEND` |

Campos mínimos que el listado/detalle realmente renderiza: `id`, `fecha`, `codigo_trazabilidad`, `tipo_material`, `estado_registro`, `unidad_canonica`, `cantidad_inicial_canonica`, `saldo_actual`, `estado_operativo`, `created_at`; nombres de planta/snapshot; `usuario`, `metodo`, `vivero`, `ubicacion`; `fotos` y/o `evidencias`; `fecha_validacion`; y permisos `can_edit`, `can_submit_for_validation`, `can_approve`, `can_reject` cuando backend los provea.

### 4.7 Vivero y evidencias

| Método y ruta | Consumidor | Objetivo, payload/params y respuesta esperada | Estado |
|---|---|---|---|
| `GET /api/lotes-vivero` | `LotesViveroService.list/listForUi` | Filtros `ListLotesViveroQuery`; espera `ListLotesViveroResponse`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/lotes-vivero/:id` | `LotesViveroService.getById/getDetail` | Obtener lote, relaciones y `ultimo_evento_por_tipo`; espera `LoteViveroDetalle`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/lotes-vivero/:id/timeline` | `LotesViveroService.getEvents/listAdaptabilidadTimeline` | Query opcional `LoteTimelineQuery`; espera timeline con responsable, payload y evidencias. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/evidencias-pendientes` | `uploadEvidenciasPendientes` | Multipart de fotos/metadatos para INICIO; espera `UploadEvidenciasPendientesResponse` con `evidencia_ids`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero` | `createLote` | JSON `CreateLoteViveroInput`; espera IDs de lote, evento y movimiento, código, saldos y evidencias vinculadas. | `CONFIRMADO EN FRONTEND` |
| `GET /api/lotes-vivero/:id/embolsado/context` | `getEmbolsadoContext` | Obtener restricciones previas; espera `EmbolsadoContextResponse`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/{tipo}/evidencias-pendientes` | `uploadEvidenciasEvento` | `{tipo}` se mapea a `embolsado`, `descarte-pre-embolsado`, `adaptabilidad`, `merma` o `despacho`; multipart; espera `UploadEvidenciasEventoResponse`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/embolsado` | `registrarEmbolsado` | JSON con fecha, plantas vivas observadas, `evidencia_ids` y observaciones; espera saldo antes/después e IDs vinculados. | `CONFIRMADO EN FRONTEND` |
| `GET /api/lotes-vivero/:id/embolsado` | `getEmbolsado` | Espera unión registrado/no registrado, con evento, lote y evidencias cuando exista. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/adaptabilidad` | `registrarAdaptabilidad` | JSON fecha, subetapa, observaciones y evidencias opcionales; espera evento creado sin cambio de saldo. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/merma` | `registrarMerma` | JSON cantidad, causa, fecha y evidencias; espera evento, saldos y posible cierre calculado por backend. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/descarte-pre-embolsado` | `registrarDescartePreEmbolsado` | JSON causa, fecha, evidencia y observaciones; espera evento y finalización según contrato. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/despacho` | `registrarDespacho` | JSON cantidad, destino estructurado, fecha y evidencia; espera evento, saldos y posible cierre backend. | `CONFIRMADO EN FRONTEND` |
| `GET /api/lotes-vivero/stock/especies` | `listStockEspecies` | Sin params; espera `EspecieStockVivero[]`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/subcampanias` | `LotesViveroService.listSubcampanias` | Sin filtros en este consumidor; espera `SubcampaniaResumen[]`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/lotes-vivero/:id/asignaciones` | `listAsignaciones` | Lista física del lote; espera `AsignacionViveroResumen[]`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/asignaciones` | `crearAsignacion` | JSON `CrearAsignacionViveroRequest`; espera asignación creada y saldos devueltos por contrato. | `CONFIRMADO EN FRONTEND` |
| `POST /api/lotes-vivero/:id/asignaciones/:asignacionId/devolucion` | `devolverAsignacion` | JSON `DevolucionAsignacionRequest`; espera devolución física y estado/saldo resultante; puede reabrir lote. | `CONFIRMADO EN FRONTEND` |
| Idempotencia de eventos append-only, mecanismo/ruta por acordar | Reintentos de eventos | Una misma clave debe devolver el evento original sin duplicarlo. | `ENDPOINT REQUERIDO`; `AUD-007` |

### 4.8 Plantación

Los payloads y respuestas están tipados en [`contracts.ts`](../src/modules/plantacion/types/contracts.ts).

| Método y ruta | Consumidor | Objetivo, payload/params y respuesta esperada | Estado |
|---|---|---|---|
| `GET /api/campanias` | `PlantacionService.listCampanias` | Listar campañas; espera `Envelope<Campania[]>`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/campanias` | `createCampania` | JSON `CreateCampaniaInput`; espera campaña creada. | `CONFIRMADO EN FRONTEND` |
| `GET /api/campanias/resumen` | `getCampaniasResumen` | Resumen global; espera `CampaniaResumen`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/campanias/:id` | `getCampania` | Detalle; espera `Campania`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/campanias/:id` | `updateCampania` | JSON `UpdateCampaniaInput`; espera campaña actualizada. | `CONFIRMADO EN FRONTEND` |
| `DELETE /api/campanias/:id` | `deleteCampania` | Baja; espera ID/mensaje en `DeleteCampaniaData`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/campanias/:id/subcampanias?estados=BORRADOR,ACTIVA,COMPLETADA` | `listSubcampaniasByCampania` | Espera `Subcampania[]`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/campanias/:id/metrics` | `getCampaniaMetrics` | Espera `CampaniaMetrics`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/campanias/:id/activity?limit=` | `getCampaniaActivity` | `limit` se restringe a 1–50; espera `Envelope<CampaniaActivityItem[]>`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/campanias/:id/desactivacion/preview` | `previewDesactivacionCampania` | Espera `PreviewDesactivacionCampania`; un caso no elegible puede responder `200` con bloqueos. | `CONFIRMADO EN FRONTEND` |
| `POST /api/campanias/:id/desactivar` | `desactivarCampaniaMasiva` | JSON `{ motivo }`; espera `ResultadoDesactivacionCampania` de operación atómica. | `CONFIRMADO EN FRONTEND` |
| `POST /api/campanias/:id/organizaciones` | `addCampaniaOrganizaciones` | JSON `{ organizacion_ids }`; exige respuesta JSON exitosa, sin shape de `data` confirmada. | `CONFIRMADO EN FRONTEND`; respuesta `POR CONFIRMAR` |
| `DELETE /api/campanias/:id/organizaciones/:organizacionId` | `removeCampaniaOrganizacion` | Sin body; exige respuesta JSON exitosa, sin shape de `data` confirmada. | `CONFIRMADO EN FRONTEND`; respuesta `POR CONFIRMAR` |
| `GET /api/subcampanias?estado=` | `listSubcampanias/listSubcampaniasOperativas` | `estado` opcional; espera `Subcampania[]`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/subcampanias` | `createSubcampania` | JSON `CreateSubcampaniaInput`; espera `Subcampania`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/subcampanias/:id` | `getSubcampania` | Espera `Subcampania`. | `CONFIRMADO EN FRONTEND` |
| `PATCH /api/subcampanias/:id` | `updateSubcampania` | JSON `UpdateSubcampaniaInput`; espera `Subcampania` actualizada. | `CONFIRMADO EN FRONTEND` |
| `POST /api/subcampanias/:id/poligono` | `setSubcampaniaPoligono` | JSON `{ poligono: GeoJsonPolygon }`; espera `SetSubcampaniaPoligonoData`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/subcampanias/:id/equipo` | `getSubcampaniaEquipo` | Espera miembros `EquipoMember[]`. | `CONFIRMADO EN FRONTEND` |
| `POST /api/subcampanias/:id/equipo` | `setSubcampaniaEquipo` | JSON array `{ usuario_id, rol }[]`; espera `SetEquipoData`. | `CONFIRMADO EN FRONTEND` |
| `DELETE /api/subcampanias/:id/equipo/:usuarioId` | `removeSubcampaniaEquipoMember` | Sin body; exige respuesta JSON exitosa, sin shape de `data` confirmada. | `CONFIRMADO EN FRONTEND`; respuesta `POR CONFIRMAR` |
| `POST /api/subcampanias/:id/activar` | `activarSubcampania` | Sin body; espera `ActivarSubcampaniaData`, snapshots y composición asignada. | `CONFIRMADO EN FRONTEND` |
| `POST /api/subcampanias/:id/cancelar` | `cancelarSubcampania` | JSON `{ motivo }`; espera `CancelarSubcampaniaData`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/subcampanias/:id/plan` | `getSubcampaniaPlan` | Espera `GetPlanData`. | `CONFIRMADO EN FRONTEND` |
| `PUT /api/subcampanias/:id/plan` | `putSubcampaniaPlan` | JSON `{ metas }`; espera `PutPlanData`. | `CONFIRMADO EN FRONTEND` |
| `GET /api/subcampanias/:id/plantacion/context` | `getPlantacionContext` | Espera `PlantacionContext`: permisos, reglas, plan y stock asignado. | `CONFIRMADO EN FRONTEND` |
| `POST /api/registros-plantacion/evidencias-pendientes` | `uploadEvidenciasPendientesPlantacion` | Multipart de fotos/metadatos; normaliza a `{ evidencia_ids }`. | `CONFIRMADO EN FRONTEND` |
| `DELETE /api/registros-plantacion/evidencias-pendientes` | `descartarEvidenciasPendientesPlantacion` | JSON `{ evidencia_ids }`; espera IDs descartados/ignorados. | `CONFIRMADO EN FRONTEND` |
| `POST /api/registros-plantacion` | `registrarPlantacion` | JSON `CreateRegistroPlantacionInput`; espera código, total, GPS, consumos y evidencias vinculadas en `RegistroPlantacionData`. | `CONFIRMADO EN FRONTEND` |

## 5. Errores, CORS, uploads e imágenes

### Errores

- Para respuestas no `2xx`, la mayoría de capas intenta JSON y prioriza `message`, luego `error`, luego texto crudo o `HTTP <status>`.
- `message` puede ser `string` o `string[]` en Usuarios, Organizaciones y Plantación; Recolección espera principalmente string.
- Una respuesta exitosa vacía se considera error en Recolección, Usuarios y Ubicaciones.
- `fetch` muestra `Failed to fetch` cuando no existe respuesta accesible: backend caído, URL incorrecta, CORS, TLS, DNS o bloqueo de red. No equivale a un `4xx/5xx` del backend.
- Backend debería responder JSON consistente, por ejemplo `{ "success": false, "message": "..." }`, conservar status HTTP y no devolver HTML de proxy para rutas API.

### CORS

Para desarrollo local, backend debe permitir explícitamente el origen real mostrado por Vite (no asumir siempre un puerto), métodos `GET, POST, PATCH, PUT, DELETE, OPTIONS` y headers `Authorization`, `Content-Type`, `x-auth-id` y temporalmente `x-user-role`. Debe responder preflight `OPTIONS`. No se observan cookies cross-origin.

### Multipart y evidencias

- No fijar manualmente `Content-Type` al enviar `FormData`; el navegador agrega el boundary.
- Recolección usa el campo plural `fotos`; perfil usa `file`; plantas usa `imagen`; organizaciones usa `logo`.
- Metadatos de evidencias viajan como JSON serializado en un campo multipart `metadata`.
- En Vivero y Plantación se envía `es_principal=false` explícitamente para evidencias pendientes con `entidad_id=0`; el comentario del frontend indica que esto evita colisiones de unicidad temporal. Confirmar este comportamiento en backend.

### URLs de imagen

El navegador renderiza directamente `public_url`, `url`, `imagen_url`, `logo_url` y `foto_perfil_url`. Esos valores deben ser URLs navegables desde el origen del frontend (absolutas o relativas válidas) y con CORS/storage adecuados cuando corresponda. `bucket` y `ruta_archivo` son metadatos, no URLs públicas. Para Recolección, `public_url` es necesaria para el detalle y `fotos[].url` puede servir de fallback en tarjetas.

## 6. Dataset mínimo de QA

No incluir credenciales reales en seed, commits ni documentos. El repo backend debe proporcionar un mecanismo seguro y documentado para crear estos actores en ambiente QA:

| Actor | Rol | Perfil | Uso |
|---|---|---|---|
| `qa_general` | `GENERAL` | Completo (`nombre`, `apellido`, `doc_identidad`) | Listar, ver, crear/editar y enviar borradores según permisos. |
| `qa_validador` | `VALIDADOR` | Completo | Bandeja, aprobar y rechazar. |
| `qa_admin` | `ADMIN` | Completo | Verificar autorización administrativa y recuperación operativa. |
| `qa_voluntario` | `VOLUNTARIO` | Completo | Comprobar denegación de validación. |

Catálogos mínimos activos:

- 1 país y una jerarquía de divisiones que termine en una comunidad/localidad seleccionable;
- 1 planta activa para `SEMILLA` y, preferiblemente, otra apta para `ESQUEJE`;
- 1 método de recolección;
- 1 vivero activo;
- imágenes pequeñas válidas JPG/PNG/WebP accesibles al navegador.

Recolecciones mínimas, con IDs/códigos estables comunicados al equipo QA:

1. `BORRADOR` editable, `ABIERTO`, saldo positivo, ubicación completa y al menos 2 evidencias; reservado para probar `submit`.
2. `BORRADOR` adicional para repetir pruebas sin restaurar datos manualmente.
3. `PENDIENTE_VALIDACION`, congelado, visible a Validador.
4. `VALIDADO + ABIERTO`, con snapshots y `fecha_validacion`.
5. `RECHAZADO`, con motivo de rechazo; el frontend actual no ofrece corrección en detalle (`AUD-009`).
6. Opcional `VALIDADO + CERRADO` para comprobar estado operativo derivado.

Cada registro debe devolver relaciones de planta, usuario, vivero, método, ubicación y evidencia necesarias para renderizar las cards sin placeholders accidentales.

## 7. Matriz E2E: Iteración Card/Recolección

| Escenario | Actor/dato | Pasos | Resultado esperado |
|---|---|---|---|
| Lista con datos | General | Entrar a `/app/collections`. | `GET /recolecciones` responde; cards muestran código, planta, cantidad/unidad, fecha, estados e imagen cuando existe. |
| Detalle `BORRADOR` | General propietario/autorizado | Abrir card. | Material, Ubicación, Evidencias y Auditoría cargan; aparecen Editar y Validar conforme a la política actual. |
| Detalle `PENDIENTE_VALIDACION` | General | Abrir registro. | Datos visibles, acciones de borrador ausentes; estado congelado. |
| Detalle `VALIDADO` | General | Abrir registro. | Snapshot, saldo y fecha de validación visibles; no edición. |
| Detalle `RECHAZADO` | General | Abrir registro. | Estado y datos visibles; documentar que hoy la UI no ofrece corrección aunque dominio la permite. |
| Evidencias | General | Abrir detalle con fotos. | `GET /evidencias...` devuelve metadatos y `public_url`; previews abren sin exponer bucket/ruta como URL. |
| Error controlado | General | Pedir ID inexistente o detener backend en un ambiente local. | Un `404` JSON muestra mensaje recuperable; sin respuesta se identifica `Failed to fetch`; Volver al listado funciona. |
| Submit | General autorizado | Abrir borrador, presionar Validar. | Un solo `PATCH /submit`; estado loading; respuesta exitosa; posterior `GET /:id` devuelve `PENDIENTE_VALIDACION`; no popup falso ante error. |
| Permiso de validación | Validador y Voluntario | Abrir `/app/collections/validate`. | Validador obtiene pendientes; Voluntario recibe denegación backend aunque intente llamar directamente. |

La migración de `Card` es presentacional: el backend no debe cambiar el contrato para soportarla.

## 8. Comandos seguros y ejemplos curl

Frontend:

```bash
npm install
cp .env.example .env.local
npm run dev
npm run lint
npm run build
```

No existen scripts `test`, `typecheck` independiente ni E2E en `package.json`; `npm run build` ejecuta `tsc -b`.

Consultas de solo lectura respaldadas por el código (usar valores locales; nunca pegar secretos en documentos o logs):

```bash
QA_API_BASE="http://localhost:3000/api"
QA_AUTH_ID="<qa-auth-id>"
QA_TOKEN="<qa-bearer-token>"

curl -sS \
  -H "Authorization: Bearer ${QA_TOKEN}" \
  -H "x-auth-id: ${QA_AUTH_ID}" \
  "${QA_API_BASE}/recolecciones?page=1&limit=20"

curl -sS \
  -H "Authorization: Bearer ${QA_TOKEN}" \
  -H "x-auth-id: ${QA_AUTH_ID}" \
  "${QA_API_BASE}/recolecciones/<recoleccion-id>"

curl -sS \
  -H "Authorization: Bearer ${QA_TOKEN}" \
  -H "x-auth-id: ${QA_AUTH_ID}" \
  "${QA_API_BASE}/evidencias-trazabilidad/recolecciones/<recoleccion-id>"
```

Mutación destructiva del estado de un borrador; ejecutar solo sobre un fixture descartable:

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer ${QA_TOKEN}" \
  -H "x-auth-id: ${QA_AUTH_ID}" \
  "${QA_API_BASE}/recolecciones/<qa-draft-id>/submit"
```

## 9. Diagnóstico de `Failed to fetch`

1. Confirmar que `.env.local` contiene `VITE_API_URL` sin `/api` y reiniciar Vite después de cambiarla.
2. En DevTools > Network, verificar URL final, método y si aparece un preflight `OPTIONS`.
3. Comprobar desde el mismo equipo que una ruta GET confirmada responde con `curl`; no usar una ruta `/health` inventada.
4. Si `curl` responde y el navegador no, revisar CORS: origen exacto, headers permitidos y respuesta de `OPTIONS`.
5. Verificar que el frontend tenga `auth_id` y, cuando corresponda, `authToken`; distinguir `401/403` de error de red.
6. Revisar protocolo: un frontend HTTPS no puede llamar HTTP por mixed content.
7. Revisar DNS/host, puerto, contenedor y binding del backend (`localhost` dentro de un contenedor no siempre es el host).
8. Confirmar que proxy/firewall no transforma la respuesta API en HTML ni elimina headers.
9. Para imágenes, abrir `public_url` directamente; una API saludable no garantiza storage accesible.
10. Capturar status, response body y request ID si existe; no capturar tokens ni contenido biométrico.

## 10. Preguntas abiertas y capacidades requeridas

1. ¿Cuál es el backend/repo y ambiente que constituye la fuente oficial del contrato?
2. ¿`Authorization` es la autoridad de identidad y `x-auth-id` un identificador auxiliar, o ambos son obligatorios? Backend no debe confiar en `x-user-role`.
3. ¿Qué status codes y envelope serán canónicos para `400`, `401`, `403`, `404`, `409`, `422` y `500`?
4. ¿`GET /recolecciones` devuelve `data[]`, `data.items[]` o array directo? El frontend tolera tres formas, pero QA debe fijar una.
5. ¿Quién puede crear/editar/enviar `BORRADOR` y corregir `RECHAZADO`? ¿Los flags `can_*` son autoritativos?
6. ¿`submit` acepta también `RECHAZADO` tras corrección? El dominio lo indica; la UI actual no lo implementa.
7. ¿Las evidencias de Recolección se guardan atómicamente con la creación y qué ocurre con archivos huérfanos tras error?
8. ¿Cuánto duran las URLs firmadas y existe estrategia de refresco? El frontend no tiene endpoint explícito para renovar una URL expirada.
9. ¿La aprobación blockchain es sincrónica, asíncrona o eventual? ¿Cómo se reporta fallo parcial?
10. Capacidad de revocación/logout: `ENDPOINT REQUERIDO` si se emiten tokens revocables; ruta y semántica por acordar.
11. Idempotencia para eventos append-only de Vivero/Plantación: `ENDPOINT REQUERIDO`; mecanismo por acordar antes de automatizar reintentos.
12. Endpoint de readiness/health: útil para QA, pero **no existe en el frontend**. Si backend decide ofrecerlo, documentar su ruta oficial antes de usarlo.
