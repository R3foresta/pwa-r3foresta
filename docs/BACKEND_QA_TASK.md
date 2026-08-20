# TASK — Habilitar backend para QA E2E de Recolección

## 1. Contexto

El frontend R3foresta consume un backend configurado mediante `VITE_API_URL` y agrega `/api`. El QA de la Iteración UI 2 (`Card` en listado y detalle de Recolección) quedó bloqueado porque el navegador no pudo alcanzar el backend (`Failed to fetch`).

Esta tarea se entrega al agente/equipo que trabaje en el **repositorio backend real**. El contrato base fue inferido del frontend y está inventariado en [`BACKEND_QA_GUIDE.md`](BACKEND_QA_GUIDE.md). Antes de implementar, contrastarlo con la documentación oficial y registrar discrepancias.

No asumir framework, base de datos, ORM, storage, proveedor de identidad ni comandos del backend hasta inspeccionar ese repositorio.

## 2. Objetivo

Dejar disponible un ambiente backend local o QA que permita ejecutar, con datos reales controlados, este vertical slice:

```text
autenticación válida
→ listado de Recolecciones
→ detalle y evidencias
→ edición de un BORRADOR
→ envío a validación
→ recarga como PENDIENTE_VALIDACION
→ bandeja de Validador
```

La Iteración Card es presentacional; no cambiar reglas de dominio ni diseñar nuevos endpoints para adaptar estilos.

## 3. Trabajo previo obligatorio en el repo backend

1. Leer sus instrucciones de agentes, README, configuración, migraciones/esquema y documentación del dominio.
2. Detectar package manager/runtime y comandos reales; no inventarlos.
3. Identificar cómo se configuran origen CORS, storage, autenticación y datos seed.
4. Mapear las rutas existentes contra esta tarea.
5. Clasificar cada ruta como `YA EXISTE`, `REQUIERE AJUSTE`, `FALTA` o `CONTRATO EN CONFLICTO`.
6. Proponer un plan corto antes de modificar varios archivos.

## 4. Alcance exacto: Recolección primero

### 4.1 Endpoints mínimos

| Prioridad | Método y ruta exacta esperada por frontend | Criterio mínimo |
|---|---|---|
| P0 | `GET /api/auth/challenge` | Challenge WebAuthn válido y de un solo uso según contrato oficial. |
| P0 | `POST /api/auth/login` | Verifica autenticación y devuelve `success`, `user`, `token` y `auth_id`. |
| P0 | `GET /api/users/profile` | Devuelve perfil y rol del actor autenticado para restaurar la sesión. |
| P0 | `GET /api/recolecciones` | Lista paginada con filtros; datos suficientes para cards. |
| P0 | `GET /api/recolecciones/:id` | Detalle con relaciones, estados, saldos y permisos. |
| P0 | `GET /api/evidencias-trazabilidad/recolecciones/:id` | Metadatos y URL segura de preview. |
| P0 | `PATCH /api/recolecciones/:id/submit` | Transición autorizada y atómica a `PENDIENTE_VALIDACION`. |
| P0 | `GET /api/plantas` | Catálogo activo para formulario. |
| P0 | `GET /api/metodos-recoleccion` | Catálogo para formulario. |
| P0 | `GET /api/viveros` | Catálogo para formulario. |
| P0 | `GET /api/ubicaciones/paises` | Países para ubicación. |
| P0 | `GET /api/ubicaciones/divisiones` | Jerarquía por `pais_id` y `parent_id?`. |
| P1 | `PATCH /api/recolecciones/:id/draft` | Edición JSON parcial o multipart con fotos/ubicación. |
| P1 | `POST /api/recolecciones` | Creación multipart de borrador con ubicación y fotos. |
| P1 | `POST /api/evidencias-trazabilidad/recolecciones/:id` | Agregar 1–5 evidencias multipart. |
| P1 | `GET /api/recolecciones/pending-validation` | Bandeja restringida. |
| P1 | `PATCH /api/recolecciones/:id/approve` | Aprobación restringida. |
| P1 | `PATCH /api/recolecciones/:id/reject` | Rechazo restringido con `{ motivo_rechazo }`. |
| P2 | `POST /api/auth/register` | Alta WebAuthn; no bloquea si las cuentas QA se provisionan mediante el mecanismo oficial del backend. |

Si una ruta oficial difiere, **no crear un alias silencioso**. Registrar el conflicto y coordinar si debe cambiar backend o frontend.

### 4.2 Contrato de lista

Filtros que el frontend puede enviar:

```text
page, limit, q, search, tipo_material, planta_id, vivero_id,
fecha_inicio, fecha_fin
```

Elegir y documentar una única respuesta canónica. La forma preferida por los tipos actuales es:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

No depender de la tolerancia temporal del frontend a arrays directos o `data.items`.

### 4.3 Contrato mínimo de una Recolección

Confirmar y devolver los nombres exactos usados por frontend:

```text
id, fecha, codigo_trazabilidad, tipo_material,
estado_registro, estado_operativo,
unidad_canonica, cantidad_inicial_canonica, saldo_actual,
created_at, fecha_validacion,
nombre_cientifico, nombre_comercial, nombre_comun_principal,
observaciones, especie_nueva,
usuario, planta, metodo, vivero, ubicacion,
fotos, evidencias,
can_edit, can_submit_for_validation, can_approve, can_reject
```

Los flags `can_*`, si se mantienen, deben calcularse en backend usando identidad, rol, propiedad y estado. No confiar en el rol enviado por el navegador.

Estados de registro: `BORRADOR`, `PENDIENTE_VALIDACION`, `VALIDADO`, `RECHAZADO`. Estados operativos: `ABIERTO`, `CERRADO`. Unidades persistidas: `UNIDAD`, `G`.

### 4.4 Creación/edición multipart

`POST /api/recolecciones` recibe:

```text
fecha
cantidad_inicial_canonica
unidad_canonica
tipo_material
planta_id
metodo_id
vivero_id
observaciones?
ubicacion[latitud]
ubicacion[longitud]
ubicacion[pais_id]
ubicacion[division_id]
ubicacion[nombre]?
ubicacion[referencia]?
ubicacion[precision_m]?
ubicacion[fuente]?
fotos (repetido por archivo)
```

`PATCH /api/recolecciones/:id/draft` debe aceptar JSON parcial cuando no hay ubicación/fotos y multipart cuando sí las hay. Validar en backend, como mínimo, IDs de catálogo, coordenadas, fecha, cantidad, unidad/material, formato/tamaño de archivos y autorización.

### 4.5 Submit

`PATCH /api/recolecciones/:id/submit` no lleva body en el frontend actual. Debe:

- autenticar y autorizar;
- rechazar estados no elegibles;
- validar datos y evidencia mínimos según contrato oficial;
- ejecutar la transición en una sola operación consistente;
- devolver la Recolección actualizada;
- permitir que el `GET /:id` inmediatamente posterior observe `PENDIENTE_VALIDACION`;
- no devolver éxito si la transición no persistió.

Confirmar con dominio si `RECHAZADO` corregido también puede reenviarse; la documentación lo permite, pero la UI actual no ofrece ese camino.

## 5. Autenticación y autorización

El frontend puede enviar:

```http
Authorization: Bearer <token>
x-auth-id: <auth-id>
x-user-role: <rol-cacheado-en-el-cliente>
```

Requisitos:

- definir qué credencial es canónica y documentarlo;
- validar token/sesión en backend;
- comprobar que `x-auth-id`, si se acepta, coincide con la identidad autenticada;
- ignorar `x-user-role` como fuente de autoridad;
- responder `401` por sesión inválida y `403` por permiso insuficiente;
- impedir que `GENERAL`/`VOLUNTARIO` aprueben o rechacen aunque invoquen la ruta manualmente;
- no registrar tokens, challenges WebAuthn ni datos biométricos en logs.

Si QA depende de WebAuthn, entregar instrucciones seguras para enrolar passkeys de las cuentas QA. No agregar contraseñas reales o tokens estáticos al repositorio.

## 6. CORS, errores y evidencias

### CORS

- Permitir el origen exacto del frontend local/QA.
- Permitir `GET, POST, PATCH, PUT, DELETE, OPTIONS`.
- Permitir `Authorization`, `Content-Type`, `x-auth-id` y, mientras exista en frontend, `x-user-role`.
- Responder correctamente el preflight `OPTIONS`.
- No asumir cookies: el frontend no usa `credentials: include`.

### Errores

Usar status HTTP correcto y JSON consistente:

```json
{
  "success": false,
  "message": "Mensaje operativo y accionable"
}
```

Cubrir al menos `400/422` validación, `401` autenticación, `403` autorización, `404` recurso, `409` transición/conflicto y `500` inesperado. No devolver stack traces, HTML del proxy ni secretos.

### Evidencias

- En Recolección el campo multipart es `fotos`.
- Devolver `public_url` o `fotos[].url` navegable y segura para preview.
- No presentar `bucket` ni `ruta_archivo` como URL pública.
- Devolver metadatos observables: `id`, `mime_type`, `tamano_bytes`, `titulo`, `descripcion`, `es_principal`, `orden`, `tomado_en`, `creado_en` cuando existan.
- Definir limpieza/rollback de archivos si una operación falla; no dejar evidencia obligatoria huérfana sin trazabilidad.

## 7. Seed mínimo reproducible

Crear mediante el mecanismo nativo del backend, con nombres no sensibles y sin credenciales versionadas:

### Actores

- un usuario `GENERAL` con perfil completo;
- un `VALIDADOR` con perfil completo;
- un `ADMIN` con perfil completo;
- un `VOLUNTARIO` con perfil completo.

Entregar al responsable QA el procedimiento de enrolamiento/autenticación por un canal seguro.

### Catálogos

- país + divisiones/comunidad seleccionable;
- planta activa para Semilla y opcionalmente otra para Esqueje;
- método de recolección activo;
- vivero activo.

### Fixtures de Recolección

- dos `BORRADOR` editables y abiertos con al menos 2 fotos;
- un `PENDIENTE_VALIDACION`;
- un `VALIDADO + ABIERTO` con snapshots;
- un `RECHAZADO` con motivo;
- opcional `VALIDADO + CERRADO`.

Los fixtures deben tener códigos/IDs estables o un comando que imprima únicamente sus identificadores no sensibles.

## 8. Escenarios de aceptación E2E

### A. Disponibilidad y sesión

1. Levantar backend con sus comandos documentados.
2. Configurar `VITE_API_URL=<origen-backend-sin-/api>` y reiniciar Vite.
3. Autenticarse como General sin manipular `localStorage` manualmente.
4. Confirmar que perfil y lista responden sin CORS ni `Failed to fetch`.

### B. Lista y cards

1. Entrar a `/app/collections`.
2. Ver al menos los cuatro estados de fixture.
3. Confirmar código, planta, cantidad/unidad, fecha, estado e imagen.
4. Probar búsqueda/filtros que ya envía el frontend.

### C. Detalle

1. Abrir cada estado.
2. Confirmar Material, Ubicación, Evidencias y Auditoría.
3. Confirmar que `PENDIENTE_VALIDACION` y `VALIDADO` no se editan.
4. Confirmar que URLs de evidencia abren y no son bucket/ruta internos.

### D. Edición de borrador

1. Editar un fixture `BORRADOR`.
2. Guardar campos JSON y luego un caso multipart con ubicación/foto.
3. Recargar detalle y comprobar persistencia real.
4. Verificar rechazo backend de ID de catálogo, coordenada o archivo inválido.

### E. Submit

1. Presionar Validar una sola vez.
2. Comprobar un `PATCH /submit` y posterior `GET /:id`.
3. Ver `PENDIENTE_VALIDACION` persistido y acciones de borrador ausentes.
4. Repetir `submit` y esperar conflicto/validación, nunca otra transición silenciosa.
5. Forzar un error legítimo y confirmar que no aparece éxito en frontend.

### F. Roles

1. Como Validador, listar pendientes y aprobar/rechazar fixtures descartables.
2. Como Voluntario o General sin permiso, invocar las mismas rutas y recibir `403`.
3. Alterar `x-user-role` en una petición manual y confirmar que no eleva permisos.

### G. Error recuperable

1. Pedir un ID inexistente y confirmar `404` JSON.
2. Detener backend localmente y confirmar que frontend distingue fallo de red.
3. Restaurar backend y reintentar sin limpiar datos válidos de sesión innecesariamente.

## 9. Verificación esperada

Ejecutar los comandos reales del repo backend para lint, typecheck/build y tests. Si no existen, reportarlo; no inventarlos. Añadir o ejecutar pruebas de integración de las rutas P0/P1 según el patrón existente.

Smoke tests externos, sustituyendo placeholders y sin imprimir secretos:

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
```

Ejecutar `submit` solamente contra un fixture descartable:

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer ${QA_TOKEN}" \
  -H "x-auth-id: ${QA_AUTH_ID}" \
  "${QA_API_BASE}/recolecciones/<qa-draft-id>/submit"
```

No usar una ruta `/health` hasta confirmar que existe oficialmente.

## 10. Fuera de alcance

- Cambiar componentes o estilos frontend.
- Implementar todos los endpoints de Vivero/Plantación.
- Definir una nueva arquitectura, DB o proveedor de auth sin evidencia del repo backend.
- Corregir el flujo mock `/auth/register` desde esta tarea backend.
- Crear conversión de gramos a plantas.
- Recalcular saldos o estados desde frontend.
- Editar/borrar eventos append-only.
- Convertir `bucket`/`ruta_archivo` en URLs públicas.
- Implementar offline/outbox, blockchain nuevo o idempotencia de todos los módulos dentro de este alcance.
- Añadir credenciales, tokens, llaves o secretos al repositorio.

## 11. Definición de hecho

- [ ] Se inspeccionó el repo backend y se documentaron sus comandos reales.
- [ ] Cada endpoint mínimo está clasificado y los P0 funcionan.
- [ ] Contratos y discrepancias están documentados sin aliases silenciosos.
- [ ] CORS funciona desde el origen real del frontend.
- [ ] Autenticación es real y `x-user-role` no eleva permisos.
- [ ] El seed reproducible contiene actores, catálogos y fixtures solicitados.
- [ ] Lista, detalle y evidencias funcionan con datos reales.
- [ ] Edición de borrador persiste.
- [ ] `submit` es consistente y la recarga devuelve `PENDIENTE_VALIDACION`.
- [ ] Errores `401/403/404/409/422` son JSON operativos.
- [ ] URLs de imagen son accesibles y no exponen rutas internas como URL.
- [ ] Pruebas del backend pasan o se reporta cada bloqueo con evidencia.
- [ ] Se completó QA manual E2E del vertical slice.
- [ ] No se versionaron secretos ni datos personales reales.

## 12. Formato de reporte final

```md
## Cambios realizados
- Endpoints implementados o ajustados: ...
- Contratos confirmados: ...
- Seed/fixtures creados: ...
- Configuración CORS/auth/evidencias: ...

## Verificación
- Comandos ejecutados: ...
- Tests de integración: ...
- Curl/smoke tests: ...
- Escenarios E2E completados: ...

## Discrepancias y decisiones
- Frontend esperaba: ...
- Backend oficial define: ...
- Resolución acordada: ...

## Riesgos o pendientes
- ...

## Archivos modificados
- ...
```
