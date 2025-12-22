# 🌱 Integración Frontend - Backend Recolecciones

## ✅ Implementación Completada

Se ha integrado el formulario de recolecciones del frontend con el backend NestJS.

---

## 📁 Archivos Modificados/Creados

### Servicios
- ✅ `src/services/recoleccion.service.ts` - Servicio completo para conectar con backend

### Módulos de Collections
- ✅ `src/modules/collections/formTypes.ts` - Tipos actualizados con campos del backend
- ✅ `src/modules/collections/SummaryForm.tsx` - Integración con backend y envío de datos

### Configuración
- ✅ `.env` - Variable VITE_API_URL configurada
- ✅ `.env.example` - Ejemplo de configuración

---

## 🔄 Flujo Completo de Creación de Recolección

### 1️⃣ Usuario completa el formulario (3 pasos):
- **Paso 1 (NewCollectionForm)**: Datos generales del material
  - Fecha de recolección
  - Tipo de material (Semilla/Esqueje)
  - Especie
  - Método de recolección
  - Cantidad y unidad
  - Fotos del lugar y material
  - Notas/observaciones
  - ¿Es nuevo hallazgo?

- **Paso 2 (LocationForm)**: Datos de ubicación
  - País, Departamento, Provincia, Comunidad
  - Coordenadas (latitud, longitud)
  - Dirección/zona
  - Vivero de almacenamiento

- **Paso 3 (SummaryForm)**: Revisión y confirmación
  - Resumen de todos los datos
  - Muestra usuario logueado como recolector
  - Botón "Registrar Recolección"

### 2️⃣ Al hacer click en "Registrar Recolección":

```typescript
1. Se obtiene el usuario logueado del AuthContext
2. Se convierten las fotos de base64 a File
3. Se mapean los datos del formulario al formato del backend:
   {
     fecha: "YYYY-MM-DD",
     cantidad: number,
     unidad: "kg" | "unidades",
     tipo_material: "SEMILLA" | "ESTACA",
     especie_nueva: boolean,
     ubicacion: {
       pais, departamento, provincia, comunidad,
       latitud, longitud
     },
     metodo_id: number,
     vivero_id: number,
     fotos: File[]
   }
4. Se envía al backend via RecoleccionService.create()
5. Backend responde con la recolección creada
6. Se muestra modal de éxito
7. Se redirige a listado de recolecciones
```

---

## 🔑 Datos que se envían al Backend

### Mapeo de Campos Frontend → Backend

| Campo Frontend | Campo Backend | Transformación |
|---------------|---------------|----------------|
| `formData.date` | `fecha` | Directo (YYYY-MM-DD) |
| `formData.quantity` | `cantidad` | parseFloat() |
| `formData.unit` | `unidad` | "kg" o "unidades" |
| `formData.type` | `tipo_material` | "seed" → "SEMILLA", "cutting" → "ESTACA" |
| `formData.isNewFind` | `especie_nueva` | Directo (boolean) |
| `formData.notes` | `observaciones` | Directo |
| `formData.species` | `nombre_comercial` | Directo |
| `formData.latitud` | `ubicacion.latitud` | parseFloat() |
| `formData.longitud` | `ubicacion.longitud` | parseFloat() |
| `formData.pais` | `ubicacion.pais` | Directo |
| `formData.depto` | `ubicacion.departamento` | Directo |
| `formData.provincia` | `ubicacion.provincia` | Directo |
| `formData.comunidad` | `ubicacion.comunidad` | Directo |
| `formData.direccion` | `ubicacion.zona` | Directo |
| `formData.placePhotos` | `fotos[]` | base64 → File |
| `formData.totalPhotos` | `fotos[]` | base64 → File |
| `user.id` (del AuthContext) | `usuario_id` | Automático desde JWT |

### Usuario Logueado
El campo **"Recolector"** se obtiene automáticamente del `AuthContext`:
```typescript
const { user } = useAuth();
// Muestra: user.username || user.email || 'Usuario'
```

El backend extrae el `usuario_id` del token JWT, no se envía desde el frontend.

---

## 🎯 Ejemplo de Request al Backend

```typescript
// POST http://localhost:3000/api/recolecciones
// Content-Type: multipart/form-data
// Authorization: Bearer <token>

FormData {
  fecha: "2025-12-20",
  cantidad: "15.5",
  unidad: "kg",
  tipo_material: "SEMILLA",
  especie_nueva: "false",
  observaciones: "Material de buena calidad",
  ubicacion: '{"pais":"Bolivia","departamento":"La Paz",...}',
  metodo_id: "1",
  vivero_id: "1",
  planta_id: "1",
  nombre_cientifico: "Swietenia macrophylla",
  nombre_comercial: "Caoba",
  fotos: [File, File] // Archivos reales
}
```

---

## 📤 Respuesta del Backend

### Éxito (201 Created)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "fecha": "2025-12-20",
    "nombre_cientifico": "Swietenia macrophylla",
    "nombre_comercial": "Caoba",
    "cantidad": 15.5,
    "unidad": "kg",
    "tipo_material": "SEMILLA",
    "estado": "ALMACENADO",
    "usuario": {
      "id": 5,
      "nombre": "Juan Pérez",
      "username": "jperez"
    },
    "ubicacion": {
      "id": 456,
      "latitud": -16.5,
      "longitud": -68.15,
      "comunidad": "San Pedro"
    },
    "vivero": {
      "id": 10,
      "nombre": "VIVERO_CENTRAL"
    },
    "metodo": {
      "id": 1,
      "nombre": "DIRECTA_ARBOL"
    },
    "fotos": [
      {
        "id": 1,
        "url": "https://supabase.../recolecciones/foto1.jpg",
        "formato": "JPG"
      }
    ],
    "created_at": "2025-12-20T10:30:00.000Z"
  }
}
```

### Error (400 Bad Request)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validación fallida",
  "errors": [
    {
      "field": "cantidad",
      "message": "La cantidad debe ser mayor a 0"
    }
  ]
}
```

---

## 🔐 Autenticación

El servicio usa el token JWT almacenado en `localStorage`:

```typescript
const token = localStorage.getItem('authToken');

headers: {
  'Authorization': token ? `Bearer ${token}` : '',
}
```

Si el usuario no está autenticado, el backend retornará **401 Unauthorized**.

---

## 🎨 UI/UX Implementado

### Loading State
Cuando se está enviando la recolección:
```
[Spinner] Guardando recolección...
```

### Error State
Si falla el envío, se muestra un banner rojo con el mensaje:
```
❌ Error al crear recolección
[Mensaje detallado del error]
```

### Success State
Al completar exitosamente, se muestra el `SuccessModal` y se navega al listado.

---

## 🧪 Testing

### Probar desde el frontend:

1. **Iniciar backend**:
```bash
cd backend
npm run start:dev
```

2. **Iniciar frontend**:
```bash
cd pwa-r3foresta
npm run dev
```

3. **Flujo completo**:
   - Navegar a `/app/collections/new`
   - Completar formulario (3 pasos)
   - Click en "Registrar Recolección"
   - Verificar en consola los logs
   - Verificar que se muestre modal de éxito
   - Verificar en Supabase que se creó el registro

### Ver logs:

**Frontend (navegador)**:
```
📤 Preparando datos para enviar al backend...
📦 DTO preparado: {...}
📤 Enviando recolección al backend...
✅ Respuesta del backend: {...}
```

**Backend (consola)**:
```
🌱 ============ CREANDO RECOLECCIÓN ============
📥 Datos recibidos: {...}
📍 Paso 1: Creando ubicación...
✅ Ubicación creada con ID: 456
📸 Paso 3: Subiendo 2 fotos...
✅ Fotos subidas correctamente
📦 Paso 4: Creando registro de recolección...
✅ Recolección creada con ID: 123
🎉 ✅ RECOLECCIÓN CREADA EXITOSAMENTE
```

---

## ⚙️ Configuración Necesaria

### 1. Variable de entorno (`.env`)
```env
VITE_API_URL=http://localhost:3000
```

Para producción:
```env
VITE_API_URL=https://tu-backend.com
```

### 2. Backend debe estar corriendo
El servicio asume que el backend está disponible en `VITE_API_URL`.

### 3. Usuario debe estar autenticado
Debe haber un token JWT válido en `localStorage.authToken`.

### 4. Backend debe tener:
- Bucket `recolecciones` en Supabase Storage
- Tablas creadas en la base de datos
- Al menos un método de recolección y un vivero

---

## 📋 Pendientes/Mejoras

### Funcionalidades
- [ ] Agregar autocomplete de plantas existentes
- [ ] Permitir seleccionar método de recolección desde UI
- [ ] Permitir seleccionar vivero desde UI
- [ ] Agregar campo "variedad" y "fuente" para especie nueva
- [ ] Implementar draft (guardar borrador en localStorage)

### UX
- [ ] Validación de coordenadas antes de enviar
- [ ] Validación de fotos (tamaño, formato)
- [ ] Preview de imagen antes de subir
- [ ] Comprimir imágenes antes de enviar
- [ ] Retry automático en caso de error de red
- [ ] Toast notifications en lugar de alert

### Seguridad
- [ ] Validar que el token no esté expirado antes de enviar
- [ ] Refrescar token automáticamente si está por expirar
- [ ] No exponer datos sensibles en logs de consola

---

## 🎯 Estado de Integración

✅ **Frontend → Backend**: Implementado y funcional  
✅ **Autenticación JWT**: Implementado  
✅ **Usuario logueado**: Se muestra correctamente  
✅ **Envío de fotos**: Implementado (base64 → File)  
✅ **Manejo de errores**: Implementado  
✅ **Loading states**: Implementado  
✅ **Modal de éxito**: Implementado  

---

**¡Integración completada! 🚀**

El formulario de recolecciones ya está conectado con el backend y listo para crear registros en Supabase.
