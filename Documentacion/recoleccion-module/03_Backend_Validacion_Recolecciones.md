# Backend – Flujo de Validación de Recolecciones

## Contexto

El frontend ya implementa el flujo completo de validación por roles. Se necesita que el backend exponga los siguientes endpoints con exactamente estas rutas, comportamientos y estructura de respuesta.

---

## Flujo de estados

```
BORRADOR
  └─(submit)──► PENDIENTE_VALIDACION
                  ├─(approve)──► VALIDADO
                  └─(reject)───► RECHAZADO
                                   └─(submit)──► PENDIENTE_VALIDACION
```

---

## Endpoints requeridos

### 1. `GET /api/recolecciones/pending-validation`

Lista todas las recolecciones con `estado_registro = 'PENDIENTE_VALIDACION'`.

**Headers:**
```
Authorization: Bearer <token>
x-auth-id: <auth_id>
```

**Query params opcionales:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| `page` | number | Página (default: 1) |
| `limit` | number | Registros por página (default: 20) |
| `fecha_inicio` | YYYY-MM-DD | Filtro desde fecha |
| `fecha_fin` | YYYY-MM-DD | Filtro hasta fecha |
| `search` | string | Búsqueda por código o especie |

**Respuesta `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo_trazabilidad": "REC-2026-001",
      "fecha": "2026-03-10",
      "cantidad": 30,
      "unidad": "unidades",
      "tipo_material": "SEMILLA",
      "estado_registro": "PENDIENTE_VALIDACION",
      "nombre_comun_principal": "Achachairú",
      "nombre_cientifico": "Garcinia humilis",
      "nombre_comercial": null,
      "observaciones": null,
      "usuario": {
        "id": 5,
        "nombre": "Juan Pérez",
        "correo": "juan@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

**Autorización:** solo roles `GENERAL` y `ADMIN`. Devolver `403` para cualquier otro rol.

---

### 2. `PATCH /api/recolecciones/:id/submit`

El recolector envía su recolección a validación.  
Transición de estado: `BORRADOR` → `PENDIENTE_VALIDACION`.

**Headers:**
```
Authorization: Bearer <token>
x-auth-id: <auth_id>
```

**Body:** vacío.

**Respuesta `200`:**
```json
{
  "success": true,
  "data": { /* objeto RecoleccionV2 completo con estado_registro actualizado */ }
}
```

**Validaciones:**
- El usuario autenticado debe ser el dueño de la recolección (o `ADMIN`).
- Solo se puede hacer `submit` si el estado actual es `BORRADOR` o `RECHAZADO`.
- Devolver `400` si el estado no es válido para esta transición.
- Devolver `404` si la recolección no existe.

---

### 3. `PATCH /api/recolecciones/:id/approve`

El validador aprueba la recolección.  
Transición de estado: `PENDIENTE_VALIDACION` → `VALIDADO`.  
Debe disparar la generación del NFT en blockchain (puede ser asíncrona).

**Headers:**
```
Authorization: Bearer <token>
x-auth-id: <auth_id>
```

**Body:** vacío.

**Respuesta `200`:**
```json
{
  "success": true,
  "data": {
    /* objeto RecoleccionV2 completo */
    /* idealmente con blockchain_url, token_id y transaction_hash populados si la operación es síncrona */
  }
}
```

**Validaciones:**
- Solo roles `GENERAL` y `ADMIN`. Devolver `403` para otros roles.
- Solo se puede aprobar si el estado actual es `PENDIENTE_VALIDACION`.
- Registrar `usuario_validacion_id` y `fecha_validacion` en la recolección.

---

### 4. `PATCH /api/recolecciones/:id/reject`

El validador rechaza la recolección.  
Transición de estado: `PENDIENTE_VALIDACION` → `RECHAZADO`.

**Headers:**
```
Authorization: Bearer <token>
x-auth-id: <auth_id>
Content-Type: application/json
```

**Body:**
```json
{
  "motivo_rechazo": "Las fotos no son legibles. Por favor volver a subir con mejor iluminación."
}
```

**Validaciones del body:**
- `motivo_rechazo` es **obligatorio** y debe tener al menos 10 caracteres.

**Respuesta `200`:**
```json
{
  "success": true,
  "data": { /* objeto RecoleccionV2 completo con estado_registro: "RECHAZADO" */ }
}
```

**Validaciones:**
- Solo roles `GENERAL` y `ADMIN`. Devolver `403` para otros roles.
- Solo se puede rechazar si el estado actual es `PENDIENTE_VALIDACION`.
- Registrar `usuario_validacion_id`, `fecha_validacion` y `motivo_rechazo` en la recolección.

---

## CORS – importante

El frontend corre en `http://localhost:5173` (producción en el dominio configurado en Vercel).

Los únicos headers custom que el frontend envía son:

```
Authorization
x-auth-id
Content-Type
```

El `Access-Control-Allow-Headers` del backend **debe incluir exactamente esos tres**. No se envía ningún otro header custom desde el frontend.

Configuración mínima de CORS necesaria:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, x-auth-id, Content-Type
```

---

## Estructura del objeto `RecoleccionV2` (referencia)

```typescript
interface RecoleccionV2 {
  id: number
  fecha: string
  nombre_cientifico: string | null
  nombre_comercial: string | null
  nombre_comun_principal?: string | null
  cantidad: number
  unidad: string
  tipo_material: 'SEMILLA' | 'ESQUEJE'
  estado_registro: 'BORRADOR' | 'PENDIENTE_VALIDACION' | 'VALIDADO' | 'RECHAZADO' | null
  observaciones: string | null
  usuario_id: number
  vivero_id: number | null
  metodo_id: number
  planta_id: number | null
  created_at: string
  codigo_trazabilidad: string
  blockchain_url: string | null
  token_id: string | null
  transaction_hash: string | null
  usuario_validacion_id: number | null
  fecha_validacion: string | null
  motivo_rechazo?: string | null
  usuario?: {
    id: number
    correo?: string | null
    nombre?: string | null
    username?: string | null
  }
}
```
