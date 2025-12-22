# 📋 Especificación Backend - Listar Recolecciones del Usuario

## 🎯 Objetivo
Endpoint para obtener todas las recolecciones realizadas por el usuario autenticado.

---

## 🔗 Endpoint

```
GET /api/recolecciones
```

### Headers requeridos
```
Authorization: Bearer {JWT_TOKEN}
```

El backend debe **extraer el `usuario_id` del token JWT** automáticamente. El frontend NO debe enviar el `usuario_id` como parámetro.

---

## 📊 Query Parameters (Opcionales)

```typescript
{
  page?: number;           // Página actual (default: 1)
  limit?: number;          // Registros por página (default: 10, max: 50)
  fecha_inicio?: string;   // Filtrar desde fecha (YYYY-MM-DD)
  fecha_fin?: string;      // Filtrar hasta fecha (YYYY-MM-DD)
  estado?: string;         // Filtrar por estado: ALMACENADO | EN_PROCESO | UTILIZADO | DESCARTADO
  tipo_material?: string;  // Filtrar por tipo: SEMILLA | ESTACA | PLANTULA | INJERTO
  vivero_id?: number;      // Filtrar por vivero específico
  search?: string;         // Buscar por nombre de planta (especie o nombre científico)
}
```

### Ejemplo de llamada con filtros:
```
GET /api/recolecciones?page=1&limit=10&estado=ALMACENADO&tipo_material=SEMILLA
```

---

## ✅ Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fecha": "2025-12-21",
      "cantidad": 10,
      "unidad": "kg",
      "tipo_material": "SEMILLA",
      "estado": "ALMACENADO",
      "especie_nueva": false,
      "observaciones": "Recolección en buen estado",
      
      // PLANTA (si especie_nueva = false)
      "planta": {
        "id": 1,
        "especie": "Mara",
        "nombre_cientifico": "Swietenia macrophylla",
        "variedad": "Común",
        "fuente": "NATIVA"
      },
      
      // O NUEVA PLANTA (si especie_nueva = true)
      "nombre_cientifico": "Nueva especie descubierta",
      "nombre_comercial": "Planta nueva",
      
      // UBICACIÓN
      "ubicacion": {
        "id": 1,
        "pais": "Bolivia",
        "departamento": "La Paz",
        "provincia": "Murillo",
        "comunidad": "San Pedro",
        "zona": "Norte",
        "latitud": -16.5,
        "longitud": -68.15
      },
      
      // MÉTODO DE RECOLECCIÓN
      "metodo": {
        "id": 1,
        "nombre": "Manual",
        "descripcion": "Recolección manual directa del árbol"
      },
      
      // VIVERO (opcional)
      "vivero": {
        "id": 1,
        "codigo": "VIV-001",
        "nombre": "Vivero Central La Paz",
        "ubicacion": {
          "departamento": "La Paz",
          "comunidad": "Sopocachi"
        }
      },
      
      // USUARIO (quien hizo la recolección)
      "usuario": {
        "id": 1,
        "nombre": "Juan Pérez",
        "username": "juanperez"
      },
      
      // FOTOS (array, puede estar vacío)
      "fotos": [
        {
          "id": 1,
          "url": "https://storage.supabase.co/bucket/fotos/foto1.jpg",
          "formato": "image/jpeg",
          "peso_bytes": 524288
        },
        {
          "id": 2,
          "url": "https://storage.supabase.co/bucket/fotos/foto2.jpg",
          "formato": "image/jpeg",
          "peso_bytes": 612352
        }
      ],
      
      // TIMESTAMPS
      "created_at": "2025-12-21T10:30:00.000Z",
      "updated_at": "2025-12-21T10:30:00.000Z"
    }
    // ... más recolecciones
  ],
  
  // PAGINACIÓN
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,           // Total de recolecciones del usuario
    "totalPages": 5,       // Total de páginas
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🔒 Seguridad y Filtrado

### ⚠️ IMPORTANTE: El backend DEBE:

1. **Extraer `usuario_id` del token JWT** - NO confiar en parámetros del cliente
2. **Filtrar automáticamente por usuario** - Solo devolver las recolecciones del usuario autenticado
3. **Validar que el token sea válido** antes de procesar la petición

### Ejemplo en NestJS:

```typescript
@Get()
@UseGuards(JwtAuthGuard)
async listarRecolecciones(
  @Request() req,  // req.user.id viene del token JWT
  @Query() filtros: RecoleccionFiltrosDto
) {
  // Extraer usuario_id del token decodificado
  const usuario_id = req.user.id;
  
  // Buscar SOLO las recolecciones de este usuario
  return this.recoleccionesService.listarPorUsuario(usuario_id, filtros);
}
```

---

## ❌ Respuestas de Error

### 401 Unauthorized - Token inválido o expirado
```json
{
  "success": false,
  "message": "Token no válido o expirado",
  "statusCode": 401
}
```

### 400 Bad Request - Parámetros inválidos
```json
{
  "success": false,
  "message": "Parámetros de consulta inválidos",
  "errors": [
    "page debe ser un número positivo",
    "fecha_inicio debe tener formato YYYY-MM-DD"
  ],
  "statusCode": 400
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error al obtener recolecciones",
  "statusCode": 500
}
```

---

## 📌 Casos Especiales

### Usuario sin recolecciones
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Recolección sin fotos
```json
{
  "id": 1,
  // ... otros campos
  "fotos": [],  // Array vacío, NO null
  // ...
}
```

### Recolección sin vivero
```json
{
  "id": 1,
  // ... otros campos
  "vivero": null,  // null si no se asignó vivero
  // ...
}
```

---

## 🎨 Campos Mínimos para Vista de Lista (para optimización)

Si el frontend solo necesita mostrar una lista (sin detalle completo), el backend puede devolver una versión simplificada:

```json
{
  "id": 1,
  "fecha": "2025-12-21",
  "cantidad": 10,
  "unidad": "kg",
  "tipo_material": "SEMILLA",
  "estado": "ALMACENADO",
  "planta": {
    "especie": "Mara",
    "nombre_cientifico": "Swietenia macrophylla"
  },
  "ubicacion": {
    "comunidad": "San Pedro",
    "departamento": "La Paz"
  },
  "fotos": [
    {
      "url": "https://..."  // Solo la primera foto
    }
  ],
  "created_at": "2025-12-21T10:30:00.000Z"
}
```

---

## 🧪 Ejemplos de Prueba

### 1. Obtener todas las recolecciones del usuario (paginado)
```bash
curl -X GET "http://localhost:3000/api/recolecciones?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Filtrar por estado ALMACENADO
```bash
curl -X GET "http://localhost:3000/api/recolecciones?estado=ALMACENADO" \
  -H "Authorization: Bearer ..."
```

### 3. Filtrar por rango de fechas
```bash
curl -X GET "http://localhost:3000/api/recolecciones?fecha_inicio=2025-01-01&fecha_fin=2025-12-31" \
  -H "Authorization: Bearer ..."
```

### 4. Buscar por nombre de planta
```bash
curl -X GET "http://localhost:3000/api/recolecciones?search=Mara" \
  -H "Authorization: Bearer ..."
```

---

## 📝 Notas Importantes

1. **Ordenamiento por defecto**: Las recolecciones deben venir ordenadas por `fecha DESC` (más recientes primero) y luego por `created_at DESC`

2. **Relaciones incluidas**: Incluir siempre `planta`, `ubicacion`, `metodo`, `usuario`, `vivero`, `fotos` en la respuesta (usar eager loading)

3. **Performance**: Si hay muchas fotos grandes, considerar devolver solo las URLs en miniatura o thumbnails

4. **Timezone**: Las fechas deben estar en formato ISO 8601 UTC

5. **Soft Delete**: Si implementas soft delete, NO devolver recolecciones eliminadas

---

## ✅ Checklist de Implementación

- [ ] Endpoint GET /api/recolecciones creado
- [ ] Guard JWT aplicado (solo usuarios autenticados)
- [ ] Extracción automática de `usuario_id` desde token
- [ ] Filtrado automático por usuario
- [ ] Query parameters opcionales implementados
- [ ] Paginación funcionando correctamente
- [ ] Relaciones (planta, ubicacion, metodo, etc.) incluidas
- [ ] Manejo de errores (401, 400, 500)
- [ ] Respuesta vacía cuando no hay recolecciones
- [ ] Ordenamiento por fecha descendente
- [ ] Tests unitarios escritos
- [ ] Probado con Postman/Insomnia

---

**¿Listo para implementar? Responde "OK" cuando el endpoint esté funcionando y pruébalo con estos ejemplos.**
