# Integracion Frontend/IA - Ubicacion V2

## Objetivo
Documento para que un agente de IA (o equipo frontend) implemente la migracion completa al nuevo contrato de ubicacion, sin compatibilidad legacy.

## Alcance de cambios (backend ya aplicado)
Modulos impactados:
1. `recolecciones`
2. `viveros`
3. `lotes-fase-vivero`

Regla global:
1. No usar ni enviar campos legacy de ubicacion (`pais`, `departamento`, `provincia`, `municipio`, `comunidad`, `zona`).
2. Usar solo contrato `ubicacion` nuevo.
3. No esperar respuestas duplicadas (legacy + nuevo). Solo existe el nuevo.

## Base URL y auth
1. Prefijo global API: `/api`
2. Header requerido:
   - `x-auth-id`: requerido en `POST /api/recolecciones` y `GET /api/recolecciones`
3. `GET /api/recolecciones/vivero/:viveroId` actualmente no exige `x-auth-id` en backend.

## Contrato unico de ubicacion (response)
Todas las entidades que exponen ubicacion devuelven:

```json
{
  "ubicacion": {
    "id": 123,
    "nombre": "Vivero Central",
    "referencia": "Zona Sur",
    "coordenadas": {
      "lat": -16.5,
      "lon": -68.1,
      "precision_m": 10,
      "fuente": "GPS_MOVIL"
    },
    "pais": {
      "id": 1,
      "codigo_iso2": "BO",
      "nombre": "Bolivia"
    },
    "division": {
      "id": 999,
      "ruta": [
        { "tipo": "Departamento", "nombre": "La Paz" },
        { "tipo": "Provincia", "nombre": "Murillo" },
        { "tipo": "Municipio", "nombre": "El Alto" }
      ]
    }
  }
}
```

Si no hay `division_id`:
1. `division` viene `null`
2. `coordenadas` se mantiene completa

### TypeScript sugerido para frontend
```ts
export type FuenteUbicacion = 'GPS_MOVIL' | 'MAPA' | 'MANUAL' | 'LEGACY';

export interface UbicacionRutaItem {
  tipo: string;
  nombre: string;
}

export interface UbicacionApi {
  id: number;
  nombre: string | null;
  referencia: string | null;
  coordenadas: {
    lat: number | null;
    lon: number | null;
    precision_m: number | null;
    fuente: FuenteUbicacion | null;
  };
  pais: {
    id: number | null;
    codigo_iso2: string | null;
    nombre: string | null;
  } | null;
  division: {
    id: number;
    ruta: UbicacionRutaItem[];
  } | null;
}
```

## Endpoint por endpoint

## 1) POST /api/recolecciones
Content-Type:
1. `multipart/form-data`

Request:
1. `ubicacion` en formato nuevo (sin legacy)
2. Campos clave:
   - `fecha: string (YYYY-MM-DD)`
   - `cantidad: number`
   - `unidad: string`
   - `tipo_material: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO'`
   - `especie_nueva: boolean`
   - `metodo_id: number`
   - `ubicacion[latitud]: number`
   - `ubicacion[longitud]: number`
3. Opcionales de ubicacion:
   - `ubicacion[pais_id]: number`
   - `ubicacion[division_id]: number`
   - `ubicacion[nombre]: string`
   - `ubicacion[referencia]: string`
   - `ubicacion[precision_m]: number (>0)`
   - `ubicacion[fuente]: 'GPS_MOVIL' | 'MAPA' | 'MANUAL' | 'LEGACY'`
4. Fotos:
   - `fotos`: hasta 5 archivos
   - formatos: JPG/JPEG/PNG
   - maximo: 5MB por archivo

Validaciones backend de ubicacion:
1. `latitud` en `[-90, 90]`
2. `longitud` en `[-180, 180]`
3. `precision_m` si llega debe ser `> 0`
4. `division_id` debe existir
5. `pais_id` debe existir (si llega)
6. Si llegan `pais_id` + `division_id`, deben ser consistentes
7. Si llega solo `division_id`, backend infiere `pais_id`

Errores especificos:
1. Si llega un campo legacy de ubicacion, retorna 400:
   - mensaje tipo: `El campo legacy ubicacion.departamento ya no se soporta...`

Response:
1. Retorna el mismo shape de `GET /api/recolecciones/:id` (`{ success: true, data: ... }`)

## 2) GET /api/recolecciones
Descripcion:
1. Lista recolecciones del usuario de `x-auth-id` con paginacion/filtros.

Query params:
1. `page?: number` (default 1)
2. `limit?: number` (default 10, max 50)
3. `fecha_inicio?: YYYY-MM-DD`
4. `fecha_fin?: YYYY-MM-DD`
5. `estado?: 'ALMACENADO' | 'EN_PROCESO' | 'UTILIZADO' | 'DESCARTADO'`
6. `tipo_material?: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO'`
7. `vivero_id?: number`
8. `search?: string`
9. `q?: string` (alias de search)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo_trazabilidad": "REC-2026-001",
      "ubicacion": { "...": "UbicacionApi" },
      "vivero": {
        "id": 3,
        "codigo": "VIV-001",
        "nombre": "Vivero Central",
        "ubicacion": { "...": "UbicacionApi" }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

Notas:
1. `ubicacion_id` ya no se usa para pintar UI; usar `ubicacion` objeto enriquecido.
2. `vivero` puede ser `null`.

## 3) GET /api/recolecciones/vivero/:viveroId
Descripcion:
1. Lista recolecciones por vivero, con mismos filtros y paginacion que el endpoint anterior.

Response:
1. Mismo contrato de `GET /api/recolecciones`.

## 4) GET /api/recolecciones/:id
Descripcion:
1. Detalle de una recoleccion.

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "codigo_trazabilidad": "REC-2026-001",
    "ubicacion": { "...": "UbicacionApi" },
    "vivero": {
      "id": 3,
      "codigo": "VIV-001",
      "nombre": "Vivero Central",
      "ubicacion": { "...": "UbicacionApi" }
    }
  }
}
```

## 5) GET /api/viveros
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "codigo": "VIV-001",
      "nombre": "Vivero Central",
      "ubicacion": { "...": "UbicacionApi" }
    }
  ]
}
```

## 6) GET /api/lotes-fase-vivero
Query params:
1. `estado?: 'INICIO' | 'EMBOLSADO' | 'SOMBRA' | 'LISTA_PLANTAR' | 'SALIDA_VIVERO'`
2. `vivero_id?: number`
3. `planta_id?: number`
4. `responsable_id?: number`
5. `page?: number` (default 1)
6. `limit?: number` (default 10, max 50)
7. `search?: string` (filtra por `codigo_trazabilidad`)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "codigo_trazabilidad": "LTV-2026-010",
      "vivero": {
        "id": 3,
        "codigo": "VIV-001",
        "nombre": "Vivero Central",
        "ubicacion": { "...": "UbicacionApi" }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

## 7) GET /api/lotes-fase-vivero/:id
Response:
```json
{
  "success": true,
  "data": {
    "id": 50,
    "codigo_trazabilidad": "LTV-2026-010",
    "vivero": {
      "id": 3,
      "codigo": "VIV-001",
      "nombre": "Vivero Central",
      "ubicacion": { "...": "UbicacionApi" }
    }
  }
}
```

## Breaking changes para frontend (obligatorio)
1. Eliminar de formularios/estado/tipos los campos legacy de ubicacion:
   - `pais`, `departamento`, `provincia`, `municipio`, `comunidad`, `zona`
2. No parsear ni renderizar esas claves desde response.
3. Migrar todo a:
   - `ubicacion.nombre`
   - `ubicacion.referencia`
   - `ubicacion.coordenadas.*`
   - `ubicacion.pais.*`
   - `ubicacion.division.ruta[]`
4. Manejar `division: null` sin romper UI.
5. El payload de creacion de recoleccion debe usar solo formato nuevo.

## Recomendacion de render de ubicacion en UI
Texto administrativo sugerido:
1. `ubicacion.division?.ruta.map(x => x.nombre).join(', ')`

Titulo sugerido:
1. `[ubicacion.nombre, ubicacion.referencia].filter(Boolean).join(' - ')`

Fallback:
1. Si no hay texto administrativo, mostrar coordenadas.

## Errores backend a contemplar en frontend
1. `400 Bad Request` por validaciones o por campos legacy en payload.
2. `401 Unauthorized` si falta `x-auth-id` en endpoints que lo requieren.
3. `404` para recursos inexistentes (`recoleccion`, `vivero`, `pais`, `division`).
4. `500` si hay error interno o si falla la vista de enriquecimiento de ubicacion.

## Nota tecnica de backend (solo contexto)
La ubicacion enriquecida se obtiene desde vista DB configurable:
1. ENV: `UBICACION_VIEW_NAME`
2. Default: `v_ubicacion_enriquecida`

No hay fallback legacy.
