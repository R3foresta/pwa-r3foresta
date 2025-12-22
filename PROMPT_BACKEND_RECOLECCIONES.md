# 🚀 PROMPT BACKEND - Sistema de Registro de Recolecciones

## 📌 OBJETIVO
Implementar el módulo backend completo en NestJS para registrar recolecciones de material vegetal (semillas, estacas, plántulas, injertos) con integración a Supabase PostgreSQL.

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS (SUPABASE)

### Tabla Principal: `recoleccion`
```sql
CREATE TABLE recoleccion (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL CHECK (fecha >= CURRENT_DATE - INTERVAL '45 days' AND fecha <= CURRENT_DATE),
  nombre_cientifico TEXT,
  nombre_comercial TEXT,
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  unidad TEXT NOT NULL,
  tipo_material tipo_material NOT NULL,
  estado estado_recoleccion NOT NULL DEFAULT 'ALMACENADO',
  especie_nueva BOOLEAN NOT NULL DEFAULT false,
  observaciones TEXT CHECK (LENGTH(observaciones) <= 1000),
  usuario_id BIGINT NOT NULL REFERENCES usuario(id),
  ubicacion_id BIGINT NOT NULL REFERENCES ubicacion(id),
  vivero_id BIGINT REFERENCES vivero(id),
  metodo_id BIGINT NOT NULL REFERENCES metodo_recoleccion(id),
  planta_id BIGINT REFERENCES planta(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**ENUMs:**
```sql
-- tipo_material
'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO'

-- estado_recoleccion
'ALMACENADO' | 'EN_PROCESO' | 'UTILIZADO' | 'DESCARTADO'
```

### Tabla: `recoleccion_foto`
```sql
CREATE TABLE recoleccion_foto (
  id BIGSERIAL PRIMARY KEY,
  recoleccion_id BIGINT NOT NULL REFERENCES recoleccion(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  peso_bytes INTEGER CHECK (peso_bytes <= 5242880),
  formato TEXT CHECK (formato IN ('JPG', 'JPEG', 'PNG')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabla: `ubicacion`
```sql
CREATE TABLE ubicacion (
  id BIGSERIAL PRIMARY KEY,
  pais TEXT,
  departamento TEXT,
  provincia TEXT,
  comunidad TEXT,
  zona TEXT,
  latitud NUMERIC NOT NULL CHECK (latitud >= -90 AND latitud <= 90),
  longitud NUMERIC NOT NULL CHECK (longitud >= -180 AND longitud <= 180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabla: `planta` (si especie_nueva = true)
```sql
CREATE TABLE planta (
  id BIGSERIAL PRIMARY KEY,
  especie TEXT NOT NULL,
  nombre_cientifico TEXT NOT NULL,
  variedad TEXT NOT NULL,
  tipo_planta TEXT,
  tipo_planta_otro TEXT,
  fuente fuente_planta NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**ENUM:**
```sql
-- fuente_planta
'NATIVA' | 'INTRODUCIDA' | 'ENDEMICA'
```

### Tablas de Referencia (ya existen):
- `vivero`: (id, codigo, nombre, ubicacion_id)
- `metodo_recoleccion`: (id, nombre, descripcion)
- `usuario`: (id, nombre, username, correo, rol)

---

## 📥 DATOS QUE RECIBE EL ENDPOINT (del Frontend)

### POST /api/recolecciones

**Body (multipart/form-data):**

```typescript
{
  // ===== DATOS PRINCIPALES =====
  fecha: "2025-12-20",                    // DATE - Fecha de recolección
  cantidad: 15.5,                         // NUMERIC - Cantidad recolectada (> 0)
  unidad: "kg",                           // TEXT - Unidad (kg, unidades, gramos, etc.)
  tipo_material: "SEMILLA",               // ENUM - SEMILLA | ESTACA | PLANTULA | INJERTO
  estado: "ALMACENADO",                   // ENUM - (opcional, default ALMACENADO)
  especie_nueva: false,                   // BOOLEAN - ¿Es nueva especie?
  observaciones: "Material de buena...",  // TEXT - Max 1000 caracteres (opcional)
  
  // ===== UBICACIÓN (nested object) =====
  ubicacion: {
    pais: "Bolivia",                      // TEXT (opcional)
    departamento: "La Paz",               // TEXT (opcional)
    provincia: "Murillo",                 // TEXT (opcional)
    comunidad: "San Pedro",               // TEXT (opcional)
    zona: "Norte",                        // TEXT (opcional)
    latitud: -16.5000,                    // NUMERIC - Requerido, rango [-90, 90]
    longitud: -68.1500                    // NUMERIC - Requerido, rango [-180, 180]
  },
  
  // ===== RELACIONES CON OTRAS TABLAS =====
  vivero_id: 10,                          // BIGINT (opcional) - ID del vivero destino
  metodo_id: 1,                           // BIGINT (requerido) - ID método de recolección
  
  // ===== SI ESPECIE NUEVA = FALSE =====
  planta_id: 50,                          // BIGINT - ID de planta existente
  nombre_cientifico: "Swietenia...",      // TEXT - Del select de plantas
  nombre_comercial: "Caoba",              // TEXT - Del select de plantas
  
  // ===== SI ESPECIE NUEVA = TRUE =====
  nueva_planta: {
    especie: "Caoba",                     // TEXT (requerido si especie_nueva = true)
    nombre_cientifico: "Swietenia...",    // TEXT (requerido si especie_nueva = true)
    variedad: "Tipo A",                   // TEXT (requerido si especie_nueva = true)
    tipo_planta: "ARBOL",                 // TEXT (opcional)
    fuente: "NATIVA"                      // ENUM - NATIVA | INTRODUCIDA | ENDEMICA
  },
  
  // ===== FOTOS (archivos) =====
  fotos: [File, File, File]               // File[] - Máximo 5 archivos
                                          // Formatos: JPG, JPEG, PNG
                                          // Tamaño: Max 5MB por archivo
}
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

---

## ✅ LÓGICA DE NEGOCIO A IMPLEMENTAR

### 1. Validaciones Iniciales
```typescript
// ✅ Validar autenticación
- Extraer usuario_id del JWT token (NO permitir envío en body)
- Verificar que el token sea válido y no esté expirado

// ✅ Validar permisos
- Solo usuarios con rol ADMIN o TECNICO pueden crear recolecciones
- Roles GENERAL y CONSULTOR: retornar 403 Forbidden

// ✅ Validar fecha
- No puede ser futura (fecha > hoy)
- No puede ser mayor a 45 días atrás (fecha < hoy - 45 días)
- Formato: YYYY-MM-DD

// ✅ Validar cantidad
- Debe ser > 0
- Máximo 2 decimales permitidos

// ✅ Validar tipo_material
- Debe ser uno de: SEMILLA, ESTACA, PLANTULA, INJERTO

// ✅ Validar estado (si se envía)
- Debe ser uno de: ALMACENADO, EN_PROCESO, UTILIZADO, DESCARTADO

// ✅ Validar observaciones (si se envía)
- Máximo 1000 caracteres
```

### 2. Validar Relaciones con Otras Tablas
```typescript
// ✅ Validar vivero_id (si se envía)
const vivero = await supabase
  .from('vivero')
  .select('id')
  .eq('id', vivero_id)
  .single();
if (!vivero) throw new NotFoundException('Vivero no encontrado');

// ✅ Validar metodo_id (requerido)
const metodo = await supabase
  .from('metodo_recoleccion')
  .select('id')
  .eq('id', metodo_id)
  .single();
if (!metodo) throw new NotFoundException('Método de recolección no encontrado');

// ✅ SI especie_nueva = false: Validar planta_id
if (!especie_nueva) {
  if (!planta_id) throw new BadRequestException('planta_id es requerido cuando especie_nueva = false');
  
  const planta = await supabase
    .from('planta')
    .select('*')
    .eq('id', planta_id)
    .single();
  if (!planta) throw new NotFoundException('Planta no encontrada');
}

// ✅ SI especie_nueva = true: Validar campos de nueva_planta
if (especie_nueva) {
  if (!nueva_planta) throw new BadRequestException('nueva_planta es requerido cuando especie_nueva = true');
  if (!nueva_planta.especie) throw new BadRequestException('nueva_planta.especie es requerido');
  if (!nueva_planta.nombre_cientifico) throw new BadRequestException('nueva_planta.nombre_cientifico es requerido');
  if (!nueva_planta.variedad) throw new BadRequestException('nueva_planta.variedad es requerido');
  if (!nueva_planta.fuente) throw new BadRequestException('nueva_planta.fuente es requerido');
  if (!['NATIVA', 'INTRODUCIDA', 'ENDEMICA'].includes(nueva_planta.fuente)) {
    throw new BadRequestException('nueva_planta.fuente debe ser NATIVA, INTRODUCIDA o ENDEMICA');
  }
}
```

### 3. Validar Ubicación
```typescript
// ✅ Validar coordenadas
const { latitud, longitud } = ubicacion;

if (!latitud || !longitud) {
  throw new BadRequestException('latitud y longitud son requeridos');
}

if (latitud < -90 || latitud > 90) {
  throw new BadRequestException('latitud debe estar entre -90 y 90');
}

if (longitud < -180 || longitud > 180) {
  throw new BadRequestException('longitud debe estar entre -180 y 180');
}
```

### 4. Validar Fotos (si se envían)
```typescript
// ✅ Validar archivos
if (fotos && fotos.length > 0) {
  if (fotos.length > 5) {
    throw new BadRequestException('Máximo 5 fotos permitidas');
  }
  
  for (const foto of fotos) {
    // Validar formato
    const formato = foto.mimetype.split('/')[1].toUpperCase();
    if (!['JPG', 'JPEG', 'PNG'].includes(formato)) {
      throw new BadRequestException(`Formato ${formato} no permitido. Solo JPG, JPEG, PNG`);
    }
    
    // Validar tamaño (5MB = 5,242,880 bytes)
    if (foto.size > 5242880) {
      throw new BadRequestException(`Archivo ${foto.originalname} supera 5MB`);
    }
  }
}
```

---

## 🔄 FLUJO DE EJECUCIÓN (CON TRANSACCIÓN)

### Paso 1: Crear ubicación
```typescript
const { data: ubicacionCreada, error: ubicacionError } = await supabase
  .from('ubicacion')
  .insert({
    pais: ubicacion.pais,
    departamento: ubicacion.departamento,
    provincia: ubicacion.provincia,
    comunidad: ubicacion.comunidad,
    zona: ubicacion.zona,
    latitud: ubicacion.latitud,
    longitud: ubicacion.longitud
  })
  .select()
  .single();

if (ubicacionError) throw new InternalServerErrorException('Error al crear ubicación');

const ubicacion_id = ubicacionCreada.id;
```

### Paso 2: Crear planta (SI especie_nueva = true)
```typescript
let planta_id_final = planta_id;

if (especie_nueva) {
  const { data: plantaCreada, error: plantaError } = await supabase
    .from('planta')
    .insert({
      especie: nueva_planta.especie,
      nombre_cientifico: nueva_planta.nombre_cientifico,
      variedad: nueva_planta.variedad,
      tipo_planta: nueva_planta.tipo_planta,
      tipo_planta_otro: nueva_planta.tipo_planta_otro,
      fuente: nueva_planta.fuente
    })
    .select()
    .single();
  
  if (plantaError) {
    // Rollback: eliminar ubicación creada
    await supabase.from('ubicacion').delete().eq('id', ubicacion_id);
    throw new InternalServerErrorException('Error al crear planta');
  }
  
  planta_id_final = plantaCreada.id;
}
```

### Paso 3: Subir fotos a Supabase Storage (SI hay fotos)
```typescript
const fotosUrls: Array<{ url: string; peso_bytes: number; formato: string }> = [];

if (fotos && fotos.length > 0) {
  for (const foto of fotos) {
    const nombreArchivo = `${Date.now()}_${foto.originalname}`;
    const rutaStorage = `recolecciones/${nombreArchivo}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recolecciones') // Nombre del bucket en Supabase
      .upload(rutaStorage, foto.buffer, {
        contentType: foto.mimetype,
        upsert: false
      });
    
    if (uploadError) {
      // Rollback: eliminar ubicación y planta (si se creó)
      await supabase.from('ubicacion').delete().eq('id', ubicacion_id);
      if (especie_nueva) {
        await supabase.from('planta').delete().eq('id', planta_id_final);
      }
      throw new InternalServerErrorException('Error al subir foto');
    }
    
    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('recolecciones')
      .getPublicUrl(rutaStorage);
    
    const formato = foto.mimetype.split('/')[1].toUpperCase();
    
    fotosUrls.push({
      url: publicUrlData.publicUrl,
      peso_bytes: foto.size,
      formato: formato
    });
  }
}
```

### Paso 4: Crear recolección
```typescript
const { data: recoleccionCreada, error: recoleccionError } = await supabase
  .from('recoleccion')
  .insert({
    fecha,
    nombre_cientifico: especie_nueva 
      ? nueva_planta.nombre_cientifico 
      : nombre_cientifico,
    nombre_comercial,
    cantidad,
    unidad,
    tipo_material,
    estado: estado || 'ALMACENADO',
    especie_nueva,
    observaciones,
    usuario_id, // Extraído del JWT
    ubicacion_id,
    vivero_id,
    metodo_id,
    planta_id: planta_id_final
  })
  .select()
  .single();

if (recoleccionError) {
  // Rollback completo
  await supabase.from('ubicacion').delete().eq('id', ubicacion_id);
  if (especie_nueva) {
    await supabase.from('planta').delete().eq('id', planta_id_final);
  }
  // Eliminar fotos de storage
  for (const foto of fotosUrls) {
    const ruta = foto.url.split('/recolecciones/')[1];
    await supabase.storage.from('recolecciones').remove([`recolecciones/${ruta}`]);
  }
  throw new InternalServerErrorException('Error al crear recolección');
}

const recoleccion_id = recoleccionCreada.id;
```

### Paso 5: Crear registros en recoleccion_foto (SI hay fotos)
```typescript
if (fotosUrls.length > 0) {
  const fotosInsert = fotosUrls.map(foto => ({
    recoleccion_id,
    url: foto.url,
    peso_bytes: foto.peso_bytes,
    formato: foto.formato
  }));
  
  const { error: fotosError } = await supabase
    .from('recoleccion_foto')
    .insert(fotosInsert);
  
  if (fotosError) {
    // Rollback completo (incluye eliminar recolección)
    await supabase.from('recoleccion').delete().eq('id', recoleccion_id);
    await supabase.from('ubicacion').delete().eq('id', ubicacion_id);
    if (especie_nueva) {
      await supabase.from('planta').delete().eq('id', planta_id_final);
    }
    for (const foto of fotosUrls) {
      const ruta = foto.url.split('/recolecciones/')[1];
      await supabase.storage.from('recolecciones').remove([`recolecciones/${ruta}`]);
    }
    throw new InternalServerErrorException('Error al guardar fotos');
  }
}
```

---

## 📤 RESPUESTA DEL BACKEND

### Éxito (201 Created)
```json
{
  "success": true,
  "message": "Recolección registrada exitosamente",
  "data": {
    "id": 123,
    "fecha": "2025-12-20",
    "nombre_cientifico": "Swietenia macrophylla",
    "nombre_comercial": "Caoba",
    "cantidad": 15.5,
    "unidad": "kg",
    "tipo_material": "SEMILLA",
    "estado": "ALMACENADO",
    "especie_nueva": false,
    "observaciones": "Material de buena calidad, semillas secas",
    "usuario": {
      "id": 5,
      "nombre": "Juan Pérez",
      "username": "jperez",
      "correo": "juan@example.com"
    },
    "ubicacion": {
      "id": 456,
      "pais": "Bolivia",
      "departamento": "La Paz",
      "provincia": "Murillo",
      "comunidad": "San Pedro",
      "zona": "Norte",
      "latitud": -16.5000,
      "longitud": -68.1500
    },
    "vivero": {
      "id": 10,
      "codigo": "VIV001",
      "nombre": "VIVERO_CENTRAL"
    },
    "metodo": {
      "id": 1,
      "nombre": "DIRECTA_ARBOL",
      "descripcion": "Recolección directa del árbol madre"
    },
    "planta": {
      "id": 50,
      "especie": "Caoba",
      "nombre_cientifico": "Swietenia macrophylla",
      "variedad": "Tipo A",
      "tipo_planta": "ARBOL",
      "fuente": "NATIVA"
    },
    "fotos": [
      {
        "id": 1,
        "url": "https://abc123.supabase.co/storage/v1/object/public/recolecciones/1734700000_foto1.jpg",
        "peso_bytes": 2048576,
        "formato": "JPG"
      },
      {
        "id": 2,
        "url": "https://abc123.supabase.co/storage/v1/object/public/recolecciones/1734700001_foto2.jpg",
        "peso_bytes": 1524288,
        "formato": "JPG"
      }
    ],
    "created_at": "2025-12-20T10:30:00.000Z"
  }
}
```

### Error: Validación (400 Bad Request)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validación fallida",
  "errors": [
    {
      "field": "fecha",
      "message": "La fecha no puede ser mayor a 45 días atrás"
    },
    {
      "field": "cantidad",
      "message": "La cantidad debe ser mayor a 0"
    },
    {
      "field": "ubicacion.latitud",
      "message": "latitud debe estar entre -90 y 90"
    }
  ]
}
```

### Error: No autorizado (401 Unauthorized)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Token de autenticación inválido o expirado"
}
```

### Error: Sin permisos (403 Forbidden)
```json
{
  "success": false,
  "statusCode": 403,
  "message": "No tienes permisos para crear recolecciones. Solo usuarios con rol ADMIN o TECNICO pueden realizar esta acción."
}
```

### Error: Recurso no encontrado (404 Not Found)
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Vivero con ID 999 no encontrado"
}
```

### Error: Archivo muy grande (413 Payload Too Large)
```json
{
  "success": false,
  "statusCode": 413,
  "message": "El archivo 'foto3.jpg' supera el tamaño máximo de 5MB"
}
```

### Error: Formato no soportado (415 Unsupported Media Type)
```json
{
  "success": false,
  "statusCode": 415,
  "message": "Formato BMP no permitido. Solo se aceptan JPG, JPEG, PNG"
}
```

### Error: Servidor (500 Internal Server Error)
```json
{
  "success": false,
  "statusCode": 500,
  "message": "Error al crear recolección en la base de datos",
  "error": "Internal Server Error"
}
```

---

## 📍 ENDPOINTS ADICIONALES REQUERIDOS

### GET /api/viveros
Lista todos los viveros disponibles (para el select del formulario).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo": "VIV001",
      "nombre": "VIVERO_CENTRAL",
      "ubicacion": {
        "departamento": "La Paz",
        "comunidad": "San Pedro"
      }
    },
    {
      "id": 2,
      "codigo": "VIV002",
      "nombre": "VIVERO_NORTE",
      "ubicacion": {
        "departamento": "Beni",
        "comunidad": "Trinidad"
      }
    }
  ]
}
```

### GET /api/metodos-recoleccion
Lista todos los métodos de recolección (para el select del formulario).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "DIRECTA_ARBOL",
      "descripcion": "Recolección directa del árbol madre"
    },
    {
      "id": 2,
      "nombre": "DEL_SUELO",
      "descripcion": "Recolección del suelo bajo el árbol"
    },
    {
      "id": 3,
      "nombre": "COMPRA",
      "descripcion": "Material comprado a terceros"
    },
    {
      "id": 4,
      "nombre": "DONACION",
      "descripcion": "Material recibido como donación"
    }
  ]
}
```

### GET /api/plantas
Lista todas las plantas existentes (para el autocomplete del formulario).

**Query params:**
- `q` (opcional): término de búsqueda

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "especie": "Caoba",
      "nombre_cientifico": "Swietenia macrophylla",
      "variedad": "Tipo A",
      "tipo_planta": "ARBOL",
      "fuente": "NATIVA"
    },
    {
      "id": 2,
      "especie": "Cedro",
      "nombre_cientifico": "Cedrela odorata",
      "variedad": "Común",
      "tipo_planta": "ARBOL",
      "fuente": "NATIVA"
    }
  ]
}
```

### GET /api/plantas/search?q=caoba
Busca plantas por nombre científico o especie (para el autocomplete).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "especie": "Caoba",
      "nombre_cientifico": "Swietenia macrophylla",
      "variedad": "Tipo A",
      "tipo_planta": "ARBOL",
      "fuente": "NATIVA"
    }
  ]
}
```

### GET /api/recolecciones
Lista recolecciones con filtros (para historial/listado).

**Query params:**
- `usuario_id` (opcional): filtrar por usuario
- `fecha_inicio` (opcional): fecha desde
- `fecha_fin` (opcional): fecha hasta
- `estado` (opcional): filtrar por estado
- `vivero_id` (opcional): filtrar por vivero
- `tipo_material` (opcional): filtrar por tipo
- `page` (opcional): número de página (default 1)
- `limit` (opcional): items por página (default 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "fecha": "2025-12-20",
      "tipo_material": "SEMILLA",
      "cantidad": 15.5,
      "unidad": "kg",
      "estado": "ALMACENADO",
      "nombre_cientifico": "Swietenia macrophylla",
      "vivero": {
        "nombre": "VIVERO_CENTRAL"
      },
      "created_at": "2025-12-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### GET /api/recolecciones/:id
Obtiene detalle completo de una recolección (con todas las relaciones).

**Response:**
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
    "especie_nueva": false,
    "observaciones": "Material de buena calidad",
    "usuario": {
      "id": 5,
      "nombre": "Juan Pérez",
      "username": "jperez"
    },
    "ubicacion": {
      "id": 456,
      "latitud": -16.5000,
      "longitud": -68.1500,
      "comunidad": "San Pedro"
    },
    "vivero": {
      "id": 10,
      "codigo": "VIV001",
      "nombre": "VIVERO_CENTRAL"
    },
    "metodo": {
      "id": 1,
      "nombre": "DIRECTA_ARBOL",
      "descripcion": "Recolección directa del árbol madre"
    },
    "planta": {
      "id": 50,
      "especie": "Caoba",
      "nombre_cientifico": "Swietenia macrophylla",
      "variedad": "Tipo A",
      "fuente": "NATIVA"
    },
    "fotos": [
      {
        "id": 1,
        "url": "https://...",
        "formato": "JPG"
      }
    ],
    "created_at": "2025-12-20T10:30:00.000Z"
  }
}
```

---

## 🔐 SEGURIDAD Y VALIDACIONES

### Autenticación
```typescript
// ✅ Extraer usuario_id del JWT
const user = request.user; // Inyectado por AuthGuard
const usuario_id = user.id;

// ✅ Validar token
@UseGuards(JwtAuthGuard)
```

### Autorización
```typescript
// ✅ Validar rol
@UseGuards(RolesGuard)
@Roles('ADMIN', 'TECNICO')

// En el servicio:
if (!['ADMIN', 'TECNICO'].includes(user.rol)) {
  throw new ForbiddenException(
    'No tienes permisos para crear recolecciones. Solo usuarios con rol ADMIN o TECNICO pueden realizar esta acción.'
  );
}
```

### Sanitización
```typescript
// ✅ Sanitizar inputs de texto
import { sanitize } from 'class-sanitizer';

observaciones = observaciones?.trim();
nombre_comercial = nombre_comercial?.trim();

// ✅ Prevenir SQL Injection (Supabase ya lo hace, pero validar)
// No usar string concatenation, usar queries parametrizadas
```

### Rate Limiting
```typescript
// ✅ Limitar creaciones por usuario
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 3600 } }) // 10 recolecciones por hora
```

---

## 🛠️ ESTRUCTURA DE ARCHIVOS NESTJS

```
src/
├── recolecciones/
│   ├── recolecciones.module.ts
│   ├── recolecciones.controller.ts
│   ├── recolecciones.service.ts
│   ├── dto/
│   │   ├── create-recoleccion.dto.ts
│   │   ├── create-ubicacion.dto.ts
│   │   ├── create-planta.dto.ts
│   │   └── filters-recoleccion.dto.ts
│   ├── entities/
│   │   ├── recoleccion.entity.ts
│   │   ├── recoleccion-foto.entity.ts
│   │   └── ubicacion.entity.ts
│   └── enums/
│       ├── tipo-material.enum.ts
│       ├── estado-recoleccion.enum.ts
│       └── fuente-planta.enum.ts
├── viveros/
│   ├── viveros.controller.ts
│   └── viveros.service.ts
├── metodos-recoleccion/
│   ├── metodos-recoleccion.controller.ts
│   └── metodos-recoleccion.service.ts
├── plantas/
│   ├── plantas.controller.ts
│   └── plantas.service.ts
└── common/
    ├── guards/
    │   ├── jwt-auth.guard.ts
    │   └── roles.guard.ts
    ├── decorators/
    │   └── roles.decorator.ts
    └── filters/
        └── http-exception.filter.ts
```

---

## 📝 DTOs COMPLETOS

### create-recoleccion.dto.ts
```typescript
import { IsNotEmpty, IsDate, IsNumber, IsString, IsEnum, IsBoolean, IsOptional, MaxLength, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUbicacionDto } from './create-ubicacion.dto';
import { CreatePlantaDto } from './create-planta.dto';

export enum TipoMaterial {
  SEMILLA = 'SEMILLA',
  ESTACA = 'ESTACA',
  PLANTULA = 'PLANTULA',
  INJERTO = 'INJERTO'
}

export enum EstadoRecoleccion {
  ALMACENADO = 'ALMACENADO',
  EN_PROCESO = 'EN_PROCESO',
  UTILIZADO = 'UTILIZADO',
  DESCARTADO = 'DESCARTADO'
}

export class CreateRecoleccionDto {
  @IsNotEmpty({ message: 'La fecha es requerida' })
  @IsDate({ message: 'La fecha debe ser válida' })
  @Type(() => Date)
  fecha: Date;

  @IsOptional()
  @IsString()
  nombre_cientifico?: string;

  @IsOptional()
  @IsString()
  nombre_comercial?: string;

  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;

  @IsNotEmpty({ message: 'La unidad es requerida' })
  @IsString()
  unidad: string;

  @IsNotEmpty({ message: 'El tipo de material es requerido' })
  @IsEnum(TipoMaterial, { message: 'El tipo de material debe ser SEMILLA, ESTACA, PLANTULA o INJERTO' })
  tipo_material: TipoMaterial;

  @IsOptional()
  @IsEnum(EstadoRecoleccion, { message: 'El estado debe ser ALMACENADO, EN_PROCESO, UTILIZADO o DESCARTADO' })
  estado?: EstadoRecoleccion;

  @IsNotEmpty({ message: 'El campo especie_nueva es requerido' })
  @IsBoolean({ message: 'especie_nueva debe ser verdadero o falso' })
  especie_nueva: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Las observaciones no pueden superar 1000 caracteres' })
  observaciones?: string;

  @IsNotEmpty({ message: 'La ubicación es requerida' })
  @ValidateNested()
  @Type(() => CreateUbicacionDto)
  ubicacion: CreateUbicacionDto;

  @IsOptional()
  @IsNumber()
  vivero_id?: number;

  @IsNotEmpty({ message: 'El método de recolección es requerido' })
  @IsNumber()
  metodo_id: number;

  @IsOptional()
  @IsNumber()
  planta_id?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePlantaDto)
  nueva_planta?: CreatePlantaDto;

  @IsOptional()
  @IsArray()
  fotos?: any[]; // Express.Multer.File[]
}
```

### create-ubicacion.dto.ts
```typescript
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateUbicacionDto {
  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  comunidad?: string;

  @IsOptional()
  @IsString()
  zona?: string;

  @IsNotEmpty({ message: 'La latitud es requerida' })
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitud: number;

  @IsNotEmpty({ message: 'La longitud es requerida' })
  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitud: number;
}
```

### create-planta.dto.ts
```typescript
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum FuentePlanta {
  NATIVA = 'NATIVA',
  INTRODUCIDA = 'INTRODUCIDA',
  ENDEMICA = 'ENDEMICA'
}

export class CreatePlantaDto {
  @IsNotEmpty({ message: 'La especie es requerida' })
  @IsString()
  especie: string;

  @IsNotEmpty({ message: 'El nombre científico es requerido' })
  @IsString()
  nombre_cientifico: string;

  @IsNotEmpty({ message: 'La variedad es requerida' })
  @IsString()
  variedad: string;

  @IsOptional()
  @IsString()
  tipo_planta?: string;

  @IsOptional()
  @IsString()
  tipo_planta_otro?: string;

  @IsNotEmpty({ message: 'La fuente es requerida' })
  @IsEnum(FuentePlanta, { message: 'La fuente debe ser NATIVA, INTRODUCIDA o ENDEMICA' })
  fuente: FuentePlanta;
}
```

---

## 🧪 CASOS DE PRUEBA

### Test 1: Crear recolección exitosa con todos los campos
```typescript
POST /api/recolecciones
Authorization: Bearer <token_admin>
Body: {
  fecha: "2025-12-20",
  cantidad: 15.5,
  unidad: "kg",
  tipo_material: "SEMILLA",
  especie_nueva: false,
  planta_id: 1,
  nombre_cientifico: "Swietenia macrophylla",
  nombre_comercial: "Caoba",
  ubicacion: { latitud: -16.5, longitud: -68.15 },
  vivero_id: 1,
  metodo_id: 1,
  observaciones: "Buena calidad"
}
Expected: 201 Created
```

### Test 2: Crear recolección con especie nueva
```typescript
POST /api/recolecciones
Body: {
  especie_nueva: true,
  nueva_planta: {
    especie: "Nueva Especie",
    nombre_cientifico: "Plantus novus",
    variedad: "Tipo 1",
    fuente: "NATIVA"
  },
  // ... otros campos
}
Expected: 201 Created (debe crear planta primero)
```

### Test 3: Rechazar fecha futura
```typescript
POST /api/recolecciones
Body: { fecha: "2026-01-01", ... }
Expected: 400 Bad Request
Message: "La fecha no puede ser futura"
```

### Test 4: Rechazar fecha > 45 días atrás
```typescript
POST /api/recolecciones
Body: { fecha: "2025-10-01", ... }
Expected: 400 Bad Request
Message: "La fecha no puede ser mayor a 45 días atrás"
```

### Test 5: Rechazar cantidad <= 0
```typescript
POST /api/recolecciones
Body: { cantidad: 0, ... }
Expected: 400 Bad Request
Message: "La cantidad debe ser mayor a 0"
```

### Test 6: Rechazar coordenadas inválidas
```typescript
POST /api/recolecciones
Body: { ubicacion: { latitud: 100, longitud: 200 }, ... }
Expected: 400 Bad Request
```

### Test 7: Rechazar foto > 5MB
```typescript
POST /api/recolecciones
Files: [foto_6mb.jpg]
Expected: 413 Payload Too Large
```

### Test 8: Rechazar formato de foto inválido
```typescript
POST /api/recolecciones
Files: [documento.pdf]
Expected: 415 Unsupported Media Type
```

### Test 9: Rechazar sin autenticación
```typescript
POST /api/recolecciones
Authorization: (sin token)
Expected: 401 Unauthorized
```

### Test 10: Rechazar usuario sin permisos (rol CONSULTOR)
```typescript
POST /api/recolecciones
Authorization: Bearer <token_consultor>
Expected: 403 Forbidden
```

---

## 🎯 CRITERIOS DE ACEPTACIÓN

### Backend Completado ✅
- [ ] Módulo recolecciones creado con controlador y servicio
- [ ] DTOs con validaciones completas (class-validator)
- [ ] Endpoint POST /api/recolecciones funcional
- [ ] Validación de fecha (últimos 45 días)
- [ ] Validación de cantidad (> 0)
- [ ] Validación de coordenadas (rangos válidos)
- [ ] Creación de ubicación en base de datos
- [ ] Creación de planta si especie_nueva = true
- [ ] Upload de fotos a Supabase Storage
- [ ] Guardado de fotos en tabla recoleccion_foto
- [ ] Transacciones implementadas (rollback en caso de error)
- [ ] Autenticación JWT funcionando
- [ ] Autorización por roles (solo ADMIN y TECNICO)
- [ ] Endpoints auxiliares: viveros, métodos, plantas
- [ ] Endpoint GET /api/recolecciones con filtros
- [ ] Endpoint GET /api/recolecciones/:id con relaciones
- [ ] Manejo de errores con códigos HTTP apropiados
- [ ] Mensajes de error claros y específicos
- [ ] Rate limiting implementado (10 por hora)
- [ ] Tests unitarios de validaciones
- [ ] Tests de integración de endpoints

---

## 📚 TECNOLOGÍAS Y LIBRERÍAS

- **Framework:** NestJS
- **Base de Datos:** Supabase (PostgreSQL)
- **ORM:** @supabase/supabase-js
- **Validación:** class-validator, class-transformer
- **Upload:** @nestjs/platform-express, multer
- **Autenticación:** @nestjs/jwt, @nestjs/passport
- **Documentación:** @nestjs/swagger (opcional)

---

## 🚀 COMANDO PARA EMPEZAR

```bash
# Crear módulo
nest g module recolecciones
nest g controller recolecciones
nest g service recolecciones

# Instalar dependencias
npm install @supabase/supabase-js class-validator class-transformer

# Configurar Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
SUPABASE_STORAGE_BUCKET=recolecciones
```

---

**¡IMPLEMENTA ESTE BACKEND SIGUIENDO ESTAS ESPECIFICACIONES Y ESTARÁ LISTO PARA CONECTARSE CON EL FRONTEND!** 🎯
