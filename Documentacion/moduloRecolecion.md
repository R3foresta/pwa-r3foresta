# 📚 Documentacion - Módulo de Recolecciones

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura del Módulo](#estructura-del-módulo)
3. [Servicio de Recolección](#servicio-de-recolección)
4. [Componentes del Módulo](#componentes-del-módulo)
5. [Contexto y Estado Global](#contexto-y-estado-global)
6. [Tipos y Interfaces](#tipos-y-interfaces)
7. [Flujo de Datos](#flujo-de-datos)
8. [Integración con Backend](#integración-con-backend)

---

## 🎯 Visión General

El **Módulo de Recolecciones** es el sistema central de la aplicación PWA-R3foresta que permite a los usuarios registrar, gestionar y visualizar recolecciones de material forestal (semillas, esquejes, plántulas e injertos). Este módulo implementa un flujo completo desde la creación hasta el almacenamiento en blockchain.

### Características Principales

- ✅ Registro de recolecciones en 3 pasos
- ✅ Geolocalización automática
- ✅ Captura de fotografías (lugar y total recolectado)
- ✅ Selección de especies desde base de datos
- ✅ Creación de nuevas especies
- ✅ Trazabilidad con códigos únicos
- ✅ Integración con blockchain
- ✅ Filtrado y búsqueda de recolecciones
- ✅ Gestión de viveros y métodos de recolección

---

## 📁 Estructura del Módulo

```
src/modules/collections/
├── CollectionCard.tsx           # Tarjeta de visualización de recolección
├── CollectionDetailScreen.tsx   # Pantalla de detalle completo
├── CollectionFormContext.tsx    # Context API para estado del formulario
├── CollectionFormLayout.tsx     # Layout wrapper con Provider
├── CollectionsScreen.tsx        # Pantalla principal con lista
├── data.ts                      # Datos mock y opciones de filtros
├── formTypes.ts                 # Tipos e interfaces del formulario
├── LocationForm.tsx             # Formulario paso 2: Ubicación
├── NewCollectionForm.tsx        # Formulario paso 1: Datos generales
├── SuccessModal.tsx             # Modal de confirmación de éxito
├── SummaryForm.tsx              # Formulario paso 3: Resumen
└── types.ts                     # Tipos del dominio

src/services/
└── recoleccion.service.ts       # Servicio HTTP para API
```

---

## 🔧 Servicio de Recolección

### Archivo: `recoleccion.service.ts`

Este servicio maneja **todas las operaciones HTTP** relacionadas con recolecciones, plantas, viveros y métodos de recolección.

#### 📡 Configuración

```typescript
const API_URL = import.meta.env.VITE_API_URL
```

- Variable de entorno que define la URL base del backend
- Ejemplo: `http://localhost:3000` o `https://api.r3foresta.com`

---

### 🌐 Interfaces y Tipos

#### `CreateRecoleccionDto`

DTO para crear una nueva recolección.

```typescript
interface CreateRecoleccionDto {
  fecha: string                    // Formato: YYYY-MM-DD
  cantidad: number                 // Cantidad numérica
  unidad: string                   // 'kg' o 'unidades'
  tipo_material: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO'
  estado?: 'ALMACENADO' | 'EN_PROCESO' | 'UTILIZADO' | 'DESCARTADO'
  especie_nueva: boolean           // true si es un nuevo hallazgo
  observaciones?: string           // Notas adicionales
  ubicacion: {
    pais?: string
    departamento?: string
    provincia?: string
    comunidad?: string
    zona?: string                  // Dirección específica
    latitud: number
    longitud: number
  }
  vivero_id?: number              // ID del vivero de almacenamiento
  metodo_id: number               // ID del método de recolección
  planta_id?: number              // ID de planta existente (si no es nueva)
  nombre_cientifico?: string
  nombre_comercial?: string
  nueva_planta?: {                // Solo si especie_nueva = true
    especie: string
    nombre_cientifico: string
    variedad: string
    tipo_planta?: string
    fuente: 'NATIVA' | 'INTRODUCIDA' | 'ENDEMICA'
  }
  fotos?: File[]                  // Archivos de imagen (máximo 5)
}
```

**Variables que recibe:**
- `fecha`: Fecha de recolección
- `cantidad`: Cantidad del material recolectado
- `unidad`: Unidad de medida ('kg' para semillas, 'unidades' para esquejes)
- `tipo_material`: Tipo de material forestal
- `especie_nueva`: Booleano que indica si es un nuevo registro botánico
- `ubicacion`: Objeto con datos de geolocalización
- `metodo_id`: Referencia al método de recolección utilizado
- `fotos`: Array de archivos de imagen

#### `Recoleccion`

Interfaz completa de una recolección con todas sus relaciones.

```typescript
interface Recoleccion {
  id: number
  fecha: string
  nombre_cientifico?: string
  nombre_comercial?: string
  cantidad: number
  unidad: string
  tipo_material: string
  estado: string
  especie_nueva: boolean
  observaciones?: string
  codigo_trazabilidad: string      // Código único QR
  usuario: {                        // Usuario que realizó la recolección
    id: number
    nombre: string
    username: string
  }
  ubicacion: {                      // Ubicación completa
    id: number
    pais?: string
    departamento?: string
    provincia?: string
    comunidad?: string
    zona?: string
    latitud: number
    longitud: number
  }
  vivero?: {                        // Vivero de almacenamiento (opcional)
    id: number
    codigo: string
    nombre: string
    ubicacion?: {
      departamento?: string
      comunidad?: string
    }
  }
  metodo: {                         // Método de recolección
    id: number
    nombre: string
    descripcion?: string
  }
  planta?: {                        // Información de la especie
    id: number
    especie: string
    nombre_cientifico: string
    variedad: string
    fuente: string
  }
  fotos: Array<{                    // Fotografías almacenadas
    id: number
    url: string                     // URL de IPFS/Pinata
    formato: string
    peso_bytes: number
  }>
  blockchain_url?: string           // URL del NFT en blockchain
  token_id?: string                 // ID del token NFT
  transaction_hash?: string         // Hash de la transacción
  created_at: string
  updated_at: string
}
```

#### `Planta`

```typescript
interface Planta {
  id: number
  especie: string                  // Nombre común
  nombre_cientifico: string        // Nombre científico en latín
  variedad: string
  tipo_planta?: string            // Tipo: 'Árbol', 'Arbusto', etc.
  fuente: string                   // 'NATIVA', 'INTRODUCIDA', 'ENDEMICA'
  imagen_url?: string              // URL de imagen de la planta
  nombres_comunes?: string         // Otros nombres comunes
}
```

#### `Vivero`

```typescript
interface Vivero {
  id: number
  codigo: string                   // Código alfanumérico único
  nombre: string
  ubicacion?: {
    departamento?: string
    comunidad?: string
  }
}
```

#### `MetodoRecoleccion`

```typescript
interface MetodoRecoleccion {
  id: number
  nombre: string
  descripcion?: string
}
```

---

### 🔐 Métodos del Servicio

#### `getAuthHeaders(includeContentType: boolean): HeadersInit`

**Función:** Genera headers de autenticación para peticiones HTTP.

**Parámetros:**
- `includeContentType`: Si debe incluir 'Content-Type: application/json'

**Retorna:** Objeto con headers:
```javascript
{
  'Authorization': 'Bearer <token>',
  'x-auth-id': '<auth_id>',
  'Content-Type': 'application/json' // si includeContentType = true
}
```

**Lógica:**
1. Lee `authToken` de localStorage
2. Lee `auth_id` de localStorage
3. Construye headers con validación
4. Registra logs detallados para debugging

---

#### `create(data: CreateRecoleccionDto): Promise<{success: boolean, data: Recoleccion}>`

**Función:** Crea una nueva recolección con fotos.

**Parámetros:**
- `data`: DTO con todos los datos de la recolección

**Retorna:** Promise con resultado:
```javascript
{
  success: true,
  data: Recoleccion // Objeto completo de la recolección creada
}
```

**Proceso:**
1. **Validación de autenticación**
   - Verifica token y auth_id en localStorage
   - Lanza error si no hay auth_id

2. **Construcción de FormData**
   ```javascript
   // Datos básicos
   formData.append('fecha', data.fecha)
   formData.append('cantidad', String(data.cantidad))
   formData.append('tipo_material', data.tipo_material)
   
   // Ubicación (notación de corchetes)
   formData.append('ubicacion[latitud]', String(data.ubicacion.latitud))
   formData.append('ubicacion[longitud]', String(data.ubicacion.longitud))
   
   // Fotos (máximo 5)
   data.fotos.forEach(foto => formData.append('fotos', foto))
   ```

3. **Envío HTTP POST**
   - URL: `${API_URL}/api/recolecciones`
   - Método: POST
   - Headers: Authorization y x-auth-id
   - Body: FormData con archivos

4. **Manejo de respuesta**
   - Valida status code
   - Parsea JSON de respuesta
   - Retorna objeto con success y data

**Errores comunes:**
- `No se encontró auth_id`: Usuario no autenticado
- `No se puede conectar con el servidor`: Backend apagado o CORS mal configurado
- `La solicitud tardó demasiado`: Timeout en subida a Pinata/Blockchain

---

#### `list(filters?: RecoleccionFilters): Promise<{success, data, pagination}>`

**Función:** Lista recolecciones con filtros y paginación.

**Parámetros:**
- `filters`: Objeto con filtros opcionales
  ```typescript
  {
    usuario_id?: number
    fecha_inicio?: string     // YYYY-MM-DD
    fecha_fin?: string
    estado?: string
    vivero_id?: number
    tipo_material?: string
    page?: number            // Página actual
    limit?: number           // Items por página
  }
  ```

**Retorna:**
```javascript
{
  success: true,
  data: Recoleccion[],       // Array de recolecciones
  pagination: {
    page: 1,
    limit: 20,
    total: 45,               // Total de registros
    totalPages: 3,
    hasNextPage: true,
    hasPrevPage: false
  }
}
```

**Proceso:**
1. Construye query params desde filters
2. Hace GET a `/api/recolecciones?params`
3. Valida Content-Type de respuesta
4. Normaliza estructura si es necesario
5. Retorna datos con paginación

---

#### `getById(id: number): Promise<{success, data}>`

**Función:** Obtiene detalle completo de una recolección.

**Parámetros:**
- `id`: ID numérico de la recolección

**Retorna:**
```javascript
{
  success: true,
  data: Recoleccion  // Objeto completo con todas las relaciones
}
```

---

#### `getPlantas(): Promise<Planta[]>`

**Función:** Lista todas las plantas disponibles en la base de datos.

**Parámetros:** Ninguno

**Retorna:** Array de plantas
```javascript
[
  {
    id: 1,
    especie: 'Mara',
    nombre_cientifico: 'Swietenia macrophylla',
    variedad: 'Común',
    tipo_planta: 'Árbol',
    fuente: 'NATIVA',
    imagen_url: 'https://...'
  },
  // ...más plantas
]
```

**Logs:**
- Total recibido
- Estructura completa
- Primeras 3 plantas (para debugging)

---

#### `searchPlantas(query: string): Promise<Planta[]>`

**Función:** Busca plantas por nombre (común o científico).

**Parámetros:**
- `query`: Término de búsqueda

**Retorna:** Array de plantas que coinciden con la búsqueda

---

#### `createPlanta(data: CreatePlantaDto): Promise<{success, data}>`

**Función:** Crea una nueva especie de planta en la base de datos.

**Parámetros:**
```typescript
{
  especie: string              // Nombre común
  nombre_cientifico: string    // Nombre en latín
  tipo_planta: string          // Tipo de planta
  fuente?: 'SEMILLA' | 'ESQUEJE'
  nombres_comunes: string      // Otros nombres
  imagen_url?: string          // URL de imagen
}
```

**Retorna:**
```javascript
{
  success: true,
  data: Planta  // Planta recién creada con ID
}
```

---

#### `getViveros(): Promise<{success, data: Vivero[]}>`

**Función:** Lista todos los viveros disponibles.

**Parámetros:** Ninguno

**Retorna:**
```javascript
{
  success: true,
  data: [
    {
      id: 1,
      codigo: 'VIV-001',
      nombre: 'Vivero San Juan',
      ubicacion: {
        departamento: 'La Paz',
        comunidad: 'San Juan'
      }
    }
  ]
}
```

---

#### `getMetodos(): Promise<{success, data: MetodoRecoleccion[]}>`

**Función:** Lista métodos de recolección disponibles.

**Parámetros:** Ninguno

**Retorna:**
```javascript
{
  success: true,
  data: [
    {
      id: 1,
      nombre: 'Recolección manual',
      descripcion: 'Recolección directa del árbol'
    }
  ]
}
```

---

#### `base64ToFile(base64: string, filename: string): File`

**Función:** Convierte una imagen base64 a objeto File.

**Parámetros:**
- `base64`: String en formato base64 (`data:image/jpeg;base64,...`)
- `filename`: Nombre para el archivo

**Retorna:** Objeto File

**Proceso:**
1. Separa header y datos base64
2. Extrae mime type
3. Decodifica base64 a bytes
4. Crea Uint8Array
5. Construye objeto File

---

## 🧩 Componentes del Módulo

### 1. `CollectionCard.tsx`

**Función:** Tarjeta visual compacta que muestra un resumen de una recolección.

**Props:**
```typescript
{
  recoleccion: Recoleccion  // Objeto completo de recolección
}
```

**Variables de estado:** Ninguna (componente sin estado)

**Renderiza:**
- Foto principal (si existe)
- Nombre de la especie
- Nombre científico
- Cantidad y unidad
- Ubicación (comunidad/provincia/departamento)
- Fecha formateada
- Vivero (si existe)
- Badges de tipo de material, estado
- Badge de "Nuevo hallazgo" si aplica
- Contador de fotos

**Funciones auxiliares:**
- `getTypeStyles(type)`: Retorna clases CSS según tipo de material
- `getStatusStyles(status)`: Retorna clases CSS según estado
- `getTipoMaterialLabel(tipo)`: Traduce tipo a español
- `getEstadoLabel(estado)`: Traduce estado a español
- `formatFecha(fecha)`: Formatea fecha a dd/mm/yyyy

**Uso:**
```tsx
<CollectionCard recoleccion={recoleccion} />
```

---

### 2. `CollectionDetailScreen.tsx`

**Función:** Pantalla completa con todos los detalles de una recolección.

**Props:** Ninguna (usa `useParams` de react-router)

**Variables de estado:**
```typescript
const [recoleccion, setRecoleccion] = useState<Recoleccion | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

**Hooks utilizados:**
- `useParams()`: Extrae `id` de la URL
- `useNavigate()`: Navegación programática
- `useEffect()`: Carga datos al montar

**Proceso de carga:**
1. Extrae ID desde URL params
2. Llama a `RecoleccionService.getById(id)`
3. Actualiza estado con datos recibidos
4. Maneja estados de loading y error

**Secciones renderizadas:**
- **Material recolectado**: Especie, tipo, cantidad, método, estado
- **Ubicación**: Coordenadas, país, departamento, provincia, comunidad, mapa
- **Vivero**: Información del vivero de almacenamiento
- **Galería de fotos**: Grid con todas las fotos
- **Blockchain**: Token ID, hash de transacción, enlace
- **Trazabilidad**: Código QR único

**Funciones auxiliares:**
```typescript
formatFecha(fecha: string): string        // dd de mes de yyyy
formatFechaHora(fecha: string): string    // fecha + hora
getTipoMaterialLabel(tipo: string): string
getEstadoLabel(estado: string): string
```

---

### 3. `CollectionFormContext.tsx`

**Función:** Context API para mantener el estado compartido del formulario multi-paso.

**Estado:**
```typescript
const [formData, setFormData] = useState<CollectionFormData>(initialFormData)
```

**Métodos expuestos:**
```typescript
{
  formData: CollectionFormData,      // Estado actual del formulario
  updateForm: (data: Partial<CollectionFormData>) => void,  // Actualiza campos
  resetForm: () => void              // Reinicia a valores iniciales
}
```

**Implementación:**
```typescript
const updateForm = (data: Partial<CollectionFormData>) => {
  setFormData((prev) => ({ ...prev, ...data }))
}
```

**Hook personalizado:**
```typescript
export function useCollectionForm() {
  const ctx = useContext(CollectionFormContext)
  if (!ctx) {
    throw new Error('useCollectionForm must be used within CollectionFormProvider')
  }
  return ctx
}
```

**Uso:**
```tsx
// En componentes hijos
const { formData, updateForm } = useCollectionForm()

// Actualizar campo
updateForm({ quantity: '5' })
```

---

### 4. `CollectionFormLayout.tsx`

**Función:** Layout wrapper que provee el contexto del formulario a sus hijos.

**Props:** Ninguna

**Renderiza:**
```tsx
<CollectionFormProvider>
  <Outlet />  {/* React Router renderiza rutas hijas aquí */}
</CollectionFormProvider>
```

**Rutas hijas:**
- `/app/collections/new` → NewCollectionForm
- `/app/collections/new/location` → LocationForm
- `/app/collections/new/summary` → SummaryForm

---

### 5. `CollectionsScreen.tsx`

**Función:** Pantalla principal que lista todas las recolecciones con filtros.

**Props:** Ninguna

**Variables de estado:**
```typescript
const [filter, setFilter] = useState<MaterialFilterKey>('all')
const [query, setQuery] = useState('')
const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [page, setPage] = useState(1)
```

**Hooks:**
- `useNavigate()`: Navegación
- `useEffect()`: Carga datos cuando cambian page o filter
- `useEffect()`: Debounce de búsqueda (500ms)

**Función principal:**
```typescript
const cargarRecolecciones = async () => {
  setLoading(true)
  const tipo_material = filter === 'all' ? undefined :
    filter === 'seed' ? 'SEMILLA' : 'ESTACA'
  
  const response = await RecoleccionService.list({
    page,
    limit: 20,
    tipo_material,
  })
  
  setRecolecciones(response.data || [])
  setLoading(false)
}
```

**Filtros disponibles:**
```typescript
const materialFilterOptions = [
  { key: 'all', label: 'Todos' },
  { key: 'seed', label: 'Semillas' },
  { key: 'cutting', label: 'Esquejes' },
]
```

**Renderiza:**
- Header con título
- Barra de búsqueda
- Pills de filtrado
- Lista de CollectionCard
- Estados de loading/error/vacío
- Botón flotante "Nueva recolección"

---

### 6. `NewCollectionForm.tsx`

**Función:** Primer paso del formulario - Captura datos generales de la recolección.

**Props:** Ninguna

**Variables de estado:**
```typescript
const [date, setDate] = useState(formData?.date || new Date().toISOString().slice(0, 10))
const [type, setType] = useState<MaterialType>(formData?.type || "seed")
const [species, setSpecies] = useState(formData?.species || "")
const [method, setMethod] = useState(formData?.method || "")
const [quantity, setQuantity] = useState(formData?.quantity || "0")
const [unit, setUnit] = useState<Unit>(formData?.unit || "kg")
const [notes, setNotes] = useState(formData?.notes || "")
const [isNewFind, setIsNewFind] = useState(formData?.isNewFind || false)
const [placePhotos, setPlacePhotos] = useState<string[]>(formData?.placePhotos || [])
const [totalPhotos, setTotalPhotos] = useState<string[]>(formData?.totalPhotos || [])
const [showPhotoModal, setShowPhotoModal] = useState(false)
const [modalType, setModalType] = useState<'place' | 'total'>('place')
const [showSpeciesModal, setShowSpeciesModal] = useState(false)
const [searchTerm, setSearchTerm] = useState("")
const [showNewPlantForm, setShowNewPlantForm] = useState(false)
const [newPlantData, setNewPlantData] = useState({...})
const [plantas, setPlantas] = useState<Planta[]>([])
const [loadingPlantas, setLoadingPlantas] = useState(false)
const [selectedPlanta, setSelectedPlanta] = useState<Planta | null>(null)
const [errors, setErrors] = useState({...})
```

**Hooks:**
- `useCollectionForm()`: Accede al contexto del formulario
- `useNavigate()`: Navegación entre pasos
- `useEffect()`: Carga plantas desde backend al montar
- `useMemo()`: Filtra plantas según búsqueda

**Función de carga de plantas:**
```typescript
useEffect(() => {
  const cargarPlantas = async () => {
    setLoadingPlantas(true)
    const plantasBackend = await RecoleccionService.getPlantas()
    setPlantas(plantasBackend)
    console.log('✅ Plantas cargadas:', plantasBackend)
    setLoadingPlantas(false)
  }
  cargarPlantas()
}, [])
```

**Filtrado de plantas:**
```typescript
const filteredPlantas = useMemo(() => {
  if (!searchTerm.trim()) return plantas
  const term = searchTerm.toLowerCase()
  return plantas.filter(planta => 
    (planta.especie?.toLowerCase().includes(term)) ||
    (planta.nombre_cientifico?.toLowerCase().includes(term))
  )
}, [plantas, searchTerm])
```

**Manejo de tipo de material:**
```typescript
const handleTypeChange = (newType: MaterialType) => {
  setType(newType)
  if (newType === "cutting") {
    setUnit("units")  // Esquejes siempre en unidades
  } else if (unit === "units") {
    setUnit("kg")     // Semillas default en kg
  }
}
```

**Manejo de cantidad:**
```typescript
const changeQuantity = (delta: number) => {
  setQuantity((value) => {
    const numValue = parseFloat(value) || 0
    const newValue = Math.max(0, numValue + delta)
    return newValue.toString()
  })
}

const handleQuantityChange = (value: string) => {
  if (value === "" || value === "0") {
    setQuantity("0")
    return
  }
  const cleanValue = value.replace(/^0+(?=\d)/, "")  // Quita ceros a la izquierda
  if (/^\d*\.?\d*$/.test(cleanValue)) {              // Valida formato decimal
    setQuantity(cleanValue)
  }
}
```

**Captura de fotos:**
```typescript
const handlePhotoUpload = (type: 'place' | 'total', event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files
  if (files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (type === 'place') {
          setPlacePhotos(prev => [...prev, result])
        } else {
          setTotalPhotos(prev => [...prev, result])
        }
      }
      reader.readAsDataURL(file)
    })
  }
}
```

**Validación y continuación:**
```typescript
const handleContinue = () => {
  const newErrors = {
    date: !date,
    quantity: !quantity || parseFloat(quantity) <= 0,
    photos: placePhotos.length === 0 || totalPhotos.length === 0,
    method: !method,
  }
  
  setErrors(newErrors)
  
  if (Object.values(newErrors).some(error => error)) {
    return  // Hay errores, no continuar
  }
  
  // Guardar en contexto
  updateForm({
    date,
    type,
    species,
    method,
    quantity,
    unit,
    notes,
    isNewFind,
    placePhotos,
    totalPhotos,
    metodo_id: selectedMethod?.id,
    planta_id: selectedPlanta?.id,
    nombre_cientifico: selectedPlanta?.nombre_cientifico,
    nombre_comercial: species,
  })
  
  navigate('/app/collections/new/location')
}
```

**Modales:**
1. **Modal de selección de especie:**
   - Barra de búsqueda
   - Lista filtrada de plantas
   - Botón "Añadir planta"

2. **Modal de nueva planta:**
   - Formulario completo
   - Subida de imagen
   - Validación de campos
   - Guarda nueva planta en backend

3. **Modal de fotos:**
   - Grid de fotos capturadas
   - Botón para eliminar
   - Diferencia entre fotos de lugar y total

**Campos del formulario:**
- Fecha (input date)
- Tipo (Semilla/Esqueje - buttons)
- Especie (modal de selección)
- Método (select cargado desde backend)
- Cantidad (input numérico con botones +/-)
- Unidad (kg/unidades - buttons)
- Fotos lugar (mínimo 1)
- Fotos total (mínimo 1)
- Notas (textarea opcional)
- ¿Nuevo hallazgo? (checkbox)

---

### 7. `LocationForm.tsx`

**Función:** Segundo paso del formulario - Captura ubicación y vivero de almacenamiento.

**Props:** Ninguna

**Variables de estado:**
```typescript
const [direccion, setDireccion] = useState(formData?.direccion || "")
const [latitud, setLatitud] = useState(formData?.latitud || "")
const [longitud, setLongitud] = useState(formData?.longitud || "")
const [pais, setPais] = useState(formData?.pais || "Bolivia")
const [depto, setDepto] = useState(formData?.depto || "La Paz")
const [provincia, setProvincia] = useState(formData?.provincia || "Bolivia")
const [comunidad, setComunidad] = useState(formData?.comunidad || "La Paz")
const [selectedViveroId, setSelectedViveroId] = useState<number | null>(formData?.vivero_id ?? null)
const [loadingLocation, setLoadingLocation] = useState(false)
const [errors, setErrors] = useState({...})
```

**Hooks:**
- `useCollectionForm()`: Contexto del formulario
- `useViveros()`: Custom hook para cargar viveros
- `useNavigate()`: Navegación
- `useEffect()`: Geolocalización automática al montar
- `useRef()`: Control de sincronización

**Geolocalización automática:**
```typescript
const getLocation = () => {
  setLoadingLocation(true)
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude.toFixed(6)
      const lng = position.coords.longitude.toFixed(6)
      
      setLatitud(lat)
      setLongitud(lng)
      
      // Geocodificación inversa con Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`
      )
      const data = await response.json()
      
      if (data.address) {
        const addressParts = []
        if (data.address.road) addressParts.push(data.address.road)
        if (data.address.house_number) addressParts.push(data.address.house_number)
        if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood)
        
        setDireccion(addressParts.join(', '))
      }
      
      setLoadingLocation(false)
    },
    (error) => {
      console.error('Error:', error)
      alert('No se pudo obtener tu ubicación. Verifica los permisos.')
      setLoadingLocation(false)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}
```

**Geolocalización al montar:**
```typescript
useEffect(() => {
  if (!direccion && !latitud && !longitud) {
    const timer = setTimeout(() => {
      getLocation()
    }, 0)
    return () => clearTimeout(timer)
  }
}, [])
```

**Validación y continuación:**
```typescript
const handleContinue = () => {
  const newErrors = {
    direccion: !direccion.trim(),
    coordinates: !latitud.trim() || !longitud.trim(),
    vivero: !selectedViveroId,
  }
  
  setErrors(newErrors)
  
  if (Object.values(newErrors).some(error => error)) {
    return
  }
  
  const viveroSeleccionado = viveros.find(v => v.id === selectedViveroId)
  
  updateForm({
    direccion,
    latitud,
    longitud,
    pais,
    depto,
    provincia,
    comunidad,
    vivero_id: selectedViveroId,
    almacenamiento: viveroSeleccionado?.nombre || '',
  })
  
  navigate('/app/collections/new/summary')
}
```

**Campos del formulario:**
- Dirección (input text + botón "Map" para geolocalización)
- Latitud (input numérico)
- Longitud (input numérico)
- País (select)
- Departamento (select)
- Provincia (select)
- Comunidad (select)
- Vivero de almacenamiento (grid de cards seleccionables)

**Renderizado de viveros:**
```tsx
<div className="grid grid-cols-2 gap-3">
  {viveros.map((vivero) => (
    <button
      key={vivero.id}
      onClick={() => setSelectedViveroId(vivero.id)}
      className={`rounded-2xl border p-4 ${
        selectedViveroId === vivero.id
          ? 'border-brand-500 bg-brand-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <p className="font-bold">{vivero.nombre}</p>
      <p className="text-xs">{vivero.codigo}</p>
    </button>
  ))}
</div>
```

---

### 8. `SummaryForm.tsx`

**Función:** Tercer y último paso - Muestra resumen completo y envía datos al backend.

**Props:** Ninguna

**Variables de estado:**
```typescript
const [showSuccess, setShowSuccess] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [traceabilityCode] = useState(() => 
  `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
)
```

**Hooks:**
- `useCollectionForm()`: Contexto con todos los datos
- `useAuth()`: Usuario actual
- `useNavigate()`: Navegación

**Proceso de envío:**
```typescript
const handleSubmit = async () => {
  setLoading(true)
  setError(null)
  
  try {
    // 1. Convertir fotos base64 a File
    const fotos: File[] = []
    
    formData.placePhotos.forEach((base64, index) => {
      const file = RecoleccionService.base64ToFile(base64, `lugar_${index + 1}.jpg`)
      fotos.push(file)
    })
    
    formData.totalPhotos.forEach((base64, index) => {
      const file = RecoleccionService.base64ToFile(base64, `total_${index + 1}.jpg`)
      fotos.push(file)
    })
    
    // 2. Mapear tipo de material
    let tipo_material: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO'
    if (formData.type === 'seed') {
      tipo_material = 'SEMILLA'
    } else if (formData.type === 'cutting') {
      tipo_material = 'ESTACA'
    } else {
      tipo_material = 'SEMILLA'
    }
    
    // 3. Construir DTO
    const dto: CreateRecoleccionDto = {
      fecha: formData.date,
      cantidad: parseFloat(formData.quantity) || 0,
      unidad: formData.unit === 'kg' ? 'kg' : 'unidades',
      tipo_material,
      estado: 'ALMACENADO',
      especie_nueva: Boolean(formData.isNewFind),
      observaciones: formData.notes || undefined,
      ubicacion: {
        pais: formData.pais || undefined,
        departamento: formData.depto || undefined,
        provincia: formData.provincia || undefined,
        comunidad: formData.comunidad || undefined,
        zona: formData.direccion || undefined,
        latitud: parseFloat(formData.latitud) || 0,
        longitud: parseFloat(formData.longitud) || 0,
      },
      metodo_id: parseInt(String(formData.metodo_id)) || 1,
      vivero_id: formData.vivero_id ? parseInt(String(formData.vivero_id)) : undefined,
      fotos: fotos.length > 0 ? fotos : undefined,
    }
    
    // 4. Si NO es especie nueva, enviar planta existente
    if (!formData.isNewFind && formData.planta_id) {
      dto.planta_id = parseInt(String(formData.planta_id))
      dto.nombre_cientifico = formData.nombre_cientifico
      dto.nombre_comercial = formData.species
    }
    
    // 5. Si ES especie nueva, enviar datos de nueva planta
    if (formData.isNewFind && formData.species) {
      dto.nueva_planta = {
        especie: formData.species,
        nombre_cientifico: formData.nombre_cientifico || formData.species,
        variedad: 'Común',
        fuente: 'NATIVA',
      }
    }
    
    // 6. Enviar al backend
    const response = await RecoleccionService.create(dto)
    
    if (response.success) {
      setShowSuccess(true)
    } else {
      throw new Error('Error al crear recolección')
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
    setError(err instanceof Error ? err.message : 'Error desconocido')
  } finally {
    setLoading(false)
  }
}
```

**Finalización:**
```typescript
const finalize = () => {
  resetForm()                          // Limpia formulario
  navigate('/app/collections')         // Vuelve a lista
}
```

**Secciones renderizadas:**
- **Fecha y Recolector**
  - Fecha de recolección
  - Nombre del usuario

- **Material Recolectado**
  - Tipo (Semilla/Esqueje)
  - Especie
  - Cantidad + unidad
  - Método de recolección

- **Evidencia Fotográfica**
  - Grid con preview de fotos (máximo 4)
  - Contador de fotos de cada tipo

- **Ubicación**
  - Dirección
  - País, Depto, Provincia, Comunidad
  - Coordenadas
  - Vivero de almacenamiento

- **Código de Trazabilidad**
  - Código QR único generado
  - Botón para copiar

- **Notas** (si existen)

- **Badge "Nuevo hallazgo"** (si aplica)

**Botón de envío:**
```tsx
<button
  onClick={handleSubmit}
  disabled={loading}
  className="..."
>
  {loading ? (
    <>
      <Spinner />
      <span>Guardando recolección...</span>
    </>
  ) : (
    'Registrar Recolección'
  )}
</button>
```

---

### 9. `SuccessModal.tsx`

**Función:** Modal de confirmación que aparece tras registro exitoso.

**Props:**
```typescript
{
  onViewBlockchain: () => void,    // Handler para ver en blockchain
  onBackToMenu: () => void,        // Handler para volver al menú
  summaryText?: string             // Texto resumen: "X kg de Especie"
}
```

**Variables de estado:** Ninguna

**Renderiza:**
- ✅ Icono de éxito
- Título "Registro Exitoso"
- Mensaje "Se recolectó: {summaryText}"
- Botón "Ver registro en cadena de bloques"
- Botón "Volver al menú"

---

## 📊 Contexto y Estado Global

### `CollectionFormContext`

**Propósito:** Mantener el estado del formulario multi-paso compartido entre 3 pantallas.

**Patrón:** Context API de React

**Estructura:**
```typescript
type ContextValue = {
  formData: CollectionFormData      // Estado completo del formulario
  updateForm: (data: Partial<CollectionFormData>) => void
  resetForm: () => void
}
```

**Flujo:**
1. `CollectionFormLayout` envuelve rutas con Provider
2. Componentes hijos usan `useCollectionForm()` hook
3. Cada paso actualiza su sección con `updateForm()`
4. `SummaryForm` lee todo `formData` para enviar
5. Tras éxito, `resetForm()` limpia el estado

**Ventajas:**
- ✅ Estado persistente entre navegaciones
- ✅ No se pierde info al ir atrás
- ✅ Validación centralizada
- ✅ Fácil debugging del estado completo

---

## 🔤 Tipos y Interfaces

### `formTypes.ts`

#### `CollectionFormData`

```typescript
interface CollectionFormData {
  // ===== PASO 1: Datos generales =====
  date: string                     // YYYY-MM-DD
  type: MaterialType               // 'seed' | 'cutting'
  species: string                  // Nombre de la especie seleccionada
  method: string                   // Nombre del método
  quantity: string                 // Cantidad como string para input
  unit: Unit                       // 'kg' | 'units'
  notes: string                    // Observaciones
  isNewFind: boolean               // Checkbox nuevo hallazgo
  placePhotos: string[]            // Array de base64 (fotos del lugar)
  totalPhotos: string[]            // Array de base64 (fotos del total)
  
  // ===== PASO 2: Ubicación =====
  direccion: string                // Dirección textual
  latitud: string                  // Latitud como string
  longitud: string                 // Longitud como string
  pais: string                     // País seleccionado
  depto: string                    // Departamento
  provincia: string                // Provincia
  comunidad: string                // Comunidad
  almacenamiento: string           // Nombre del vivero
  
  // ===== Campos adicionales para backend =====
  metodo_id?: number               // ID del método de recolección
  vivero_id?: number               // ID del vivero
  planta_id?: number               // ID de la planta (si no es nueva)
  nombre_cientifico?: string       // Nombre científico
  nombre_comercial?: string        // Nombre comercial/común
}
```

#### `initialFormData`

Valores iniciales del formulario:
```typescript
{
  date: new Date().toISOString().slice(0, 10),  // Hoy
  type: "seed",
  species: "",
  method: "",
  quantity: "0",
  unit: "kg",
  notes: "",
  isNewFind: false,
  placePhotos: [],
  totalPhotos: [],
  direccion: "",
  latitud: "",
  longitud: "",
  pais: "Bolivia",
  depto: "La Paz",
  provincia: "Bolivia",
  comunidad: "La Paz",
  almacenamiento: "",
}
```

### `types.ts`

Tipos del dominio (legacy, algunos no se usan activamente):

```typescript
type UUID = string
type ISODate = `${number}-${number}-${number}`
type ISODateTime = string

type MaterialType = 'seed' | 'cutting'
type RecordStatus = 'stored' | 'used' | 'discarded'
type Unit = 'kg' | 'units'

type Quantity = {
  value: number
  unit: Unit
}

type MaterialBatch = {
  materialType: MaterialType
  quantity: Quantity
}

// ... más tipos
```

### `data.ts`

Datos mock y configuraciones estáticas:

```typescript
// Opciones de filtro de materiales
export const materialFilterOptions = [
  { key: 'all', label: 'Todos' },
  { key: 'seed', label: 'Semillas' },
  { key: 'cutting', label: 'Esquejes' },
] as const

// Opciones de métodos (usado en formulario)
export const methodOptions: CollectionMethod[] = [
  { id: 'm_1', name: 'Manual collection' },
  { id: 'm_2', name: 'Post-harvest' },
  { id: 'm_3', name: 'Sampling' },
]

// Datos mock de usuarios, plantas, viveros (para desarrollo)
export const users: User[] = [...]
export const locations: Location[] = [...]
export const nurseries: Nursery[] = [...]
export const plants: Plant[] = [...]
export const collectionRecords: CollectionRecord[] = [...]
```

---

## 🔄 Flujo de Datos

### Flujo de Creación de Recolección

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO INICIA                           │
│         Haz clic en "Nueva Recolección"                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: NewCollectionForm.tsx                             │
├─────────────────────────────────────────────────────────────┤
│  1. Carga plantas desde backend                            │
│     - GET /api/plantas                                      │
│     - Almacena en estado local                             │
│                                                             │
│  2. Usuario completa formulario:                           │
│     - Selecciona fecha                                     │
│     - Elige tipo (Semilla/Esqueje)                        │
│     - Busca y selecciona especie (modal)                  │
│     - O marca "Nuevo hallazgo"                             │
│     - Selecciona método de recolección                    │
│     - Ingresa cantidad y unidad                           │
│     - Captura fotos (lugar y total) mínimo 1 de cada      │
│     - Opcionalmente agrega notas                          │
│                                                             │
│  3. Valida campos requeridos                               │
│  4. Guarda en Context API                                  │
│  5. Navega a LocationForm                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: LocationForm.tsx                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Obtiene geolocalización automática                     │
│     - navigator.geolocation.getCurrentPosition()           │
│     - Geocodificación inversa con Nominatim               │
│                                                             │
│  2. Carga viveros disponibles                              │
│     - Hook useViveros()                                    │
│     - GET /api/viveros                                     │
│                                                             │
│  3. Usuario completa:                                      │
│     - Verifica/corrige dirección                           │
│     - Verifica coordenadas                                 │
│     - Selecciona país, depto, provincia, comunidad        │
│     - Selecciona vivero de almacenamiento                 │
│                                                             │
│  4. Valida campos requeridos                               │
│  5. Actualiza Context API                                  │
│  6. Navega a SummaryForm                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: SummaryForm.tsx                                   │
├─────────────────────────────────────────────────────────────┤
│  1. Lee TODOS los datos del Context API                   │
│  2. Muestra resumen completo                               │
│  3. Usuario revisa y confirma                              │
│  4. Al hacer clic en "Registrar":                          │
│                                                             │
│     a) Convierte fotos base64 a File                       │
│        - RecoleccionService.base64ToFile()                 │
│                                                             │
│     b) Construye CreateRecoleccionDto                      │
│        - Mapea tipos de frontend a backend                 │
│        - Parsea strings a números                          │
│        - Estructura objeto ubicación                       │
│                                                             │
│     c) Envía al backend                                    │
│        - POST /api/recolecciones                           │
│        - FormData con archivos                             │
│        - Headers de autenticación                          │
│                                                             │
│     d) Backend procesa:                                    │
│        - Valida datos                                      │
│        - Sube fotos a Pinata (IPFS)                       │
│        - Crea registro en DB                               │
│        - Genera NFT en blockchain                          │
│        - Retorna recolección creada                        │
│                                                             │
│  5. Muestra modal de éxito                                 │
│  6. Limpia formulario (resetForm)                          │
│  7. Navega a lista de recolecciones                        │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Listado de Recolecciones

```
┌─────────────────────────────────────────────────────────────┐
│           Usuario accede a CollectionsScreen                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  useEffect(() => cargarRecolecciones(), [page, filter])    │
├─────────────────────────────────────────────────────────────┤
│  1. Construye filtros:                                     │
│     - page: número de página                               │
│     - limit: 20 items                                      │
│     - tipo_material: según filtro seleccionado            │
│                                                             │
│  2. Llama a servicio:                                      │
│     GET /api/recolecciones?page=1&limit=20&tipo_material=X │
│                                                             │
│  3. Backend retorna:                                       │
│     {                                                      │
│       success: true,                                       │
│       data: Recoleccion[],                                 │
│       pagination: {...}                                    │
│     }                                                      │
│                                                             │
│  4. Actualiza estado:                                      │
│     setRecolecciones(response.data)                        │
│                                                             │
│  5. Renderiza lista con CollectionCard                     │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Detalle de Recolección

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario hace clic en una tarjeta de recolección           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  navigate(`/app/collections/${recoleccion.id}`)            │
│                                                             │
│  CollectionDetailScreen.tsx se monta                       │
├─────────────────────────────────────────────────────────────┤
│  1. useParams() extrae ID desde URL                        │
│                                                             │
│  2. useEffect(() => cargarDetalle(), [id])                 │
│                                                             │
│  3. GET /api/recolecciones/{id}                            │
│                                                             │
│  4. Backend retorna recolección completa con:              │
│     - Todos los datos                                      │
│     - Relaciones (usuario, ubicación, planta, vivero)     │
│     - Fotos con URLs de IPFS                              │
│     - Datos de blockchain (si existen)                     │
│                                                             │
│  5. Actualiza estado: setRecoleccion(data)                 │
│                                                             │
│  6. Renderiza vista detallada con todas las secciones      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 Integración con Backend

### Autenticación

Todas las peticiones autenticadas incluyen:

```javascript
Headers: {
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-auth-id': '<USER_AUTH_ID>',
  'Content-Type': 'application/json'  // excepto FormData
}
```

**Tokens almacenados en localStorage:**
- `authToken`: JWT token
- `auth_id`: ID de autenticación del usuario

### Endpoints Utilizados

#### **POST** `/api/recolecciones`

Crea nueva recolección.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData con campos y archivos

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "fecha": "2025-01-15",
    // ... resto de campos
  }
}
```

---

#### **GET** `/api/recolecciones`

Lista recolecciones con paginación.

**Query params:**
- `page`: Número de página
- `limit`: Items por página
- `tipo_material`: Filtro por tipo
- `usuario_id`: Filtro por usuario
- `fecha_inicio`, `fecha_fin`: Rango de fechas

**Response:**
```json
{
  "success": true,
  "data": [ /* array de recolecciones */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### **GET** `/api/recolecciones/:id`

Obtiene detalle completo.

**Response:**
```json
{
  "success": true,
  "data": { /* recolección completa con relaciones */ }
}
```

---

#### **GET** `/api/plantas`

Lista todas las plantas disponibles.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "especie": "Mara",
      "nombre_cientifico": "Swietenia macrophylla",
      "variedad": "Común",
      "tipo_planta": "Árbol",
      "fuente": "NATIVA",
      "imagen_url": "https://..."
    }
  ]
}
```

---

#### **POST** `/api/plantas`

Crea nueva planta.

**Request:**
```json
{
  "especie": "Cedro",
  "nombre_cientifico": "Cedrela sp.",
  "tipo_planta": "Árbol",
  "fuente": "SEMILLA",
  "nombres_comunes": "Cedro, Cedar",
  "imagen_url": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* planta creada con ID */ }
}
```

---

#### **GET** `/api/viveros`

Lista viveros disponibles.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo": "VIV-001",
      "nombre": "Vivero San Juan",
      "ubicacion": {
        "departamento": "La Paz",
        "comunidad": "San Juan"
      }
    }
  ]
}
```

---

#### **GET** `/api/metodos-recoleccion`

Lista métodos de recolección.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Recolección manual",
      "descripcion": "Recolección directa del árbol"
    }
  ]
}
```

---

### Manejo de Errores

El servicio implementa logging exhaustivo:

```typescript
try {
  // Operación HTTP
} catch (error) {
  console.error('❌ Error:', error)
  
  // Error de red
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new Error('No se puede conectar con el servidor')
  }
  
  // Error de timeout
  if (error instanceof Error && error.message.includes('timeout')) {
    throw new Error('La solicitud tardó demasiado')
  }
  
  throw error
}
```

**Logs implementados:**
- ✅ Datos que se envían
- ✅ URLs completas
- ✅ Headers generados
- ✅ Respuestas recibidas
- ✅ Errores con contexto
- ✅ Estado de autenticación

---

## 📝 Resumen de Variables y Props

### NewCollectionForm

**Estado local:**
- `date`, `type`, `species`, `method`, `quantity`, `unit`, `notes`
- `isNewFind`, `placePhotos`, `totalPhotos`
- `showPhotoModal`, `modalType`, `showSpeciesModal`, `searchTerm`
- `showNewPlantForm`, `newPlantData`, `newPlantImagePreview`
- `plantas`, `loadingPlantas`, `selectedPlanta`
- `errors`

**No recibe props** (usa Context API)

### LocationForm

**Estado local:**
- `direccion`, `latitud`, `longitud`
- `pais`, `depto`, `provincia`, `comunidad`
- `selectedViveroId`
- `loadingLocation`
- `errors`

**No recibe props** (usa Context API)

### SummaryForm

**Estado local:**
- `showSuccess`
- `loading`
- `error`
- `traceabilityCode`

**No recibe props** (usa Context API)

### CollectionCard

**Props:**
```typescript
{
  recoleccion: Recoleccion
}
```

### CollectionDetailScreen

**No recibe props** (usa useParams)

### SuccessModal

**Props:**
```typescript
{
  onViewBlockchain: () => void
  onBackToMenu: () => void
  summaryText?: string
}
```

---

## 🎨 Estilos y UI

El módulo utiliza **Tailwind CSS** con clases personalizadas:

- `brand-500`, `brand-600`, `brand-700`: Colores verdes del tema
- `shadow-soft`: Sombra suave personalizada
- `rounded-2xl`, `rounded-3xl`: Bordes redondeados
- `backdrop-blur-md`: Efecto blur en headers sticky
- Animaciones con `transition`, `hover:`, `active:`

---

## 🔍 Debugging

### Logs implementados

Todos los componentes y servicios tienen logs detallados:

```javascript
console.log('✅ Éxito:', data)
console.log('📤 Enviando:', payload)
console.log('📥 Respuesta:', response)
console.error('❌ Error:', error)
console.log('🔍 Verificando:', condition)
console.log('📊 Estado:', state)
```

**Emojis para identificar rápido:**
- ✅ Operación exitosa
- ❌ Error
- 📤 Envío de datos
- 📥 Recepción de datos
- 🔍 Verificación/validación
- 📊 Estado/info
- 🌱 Plantas
- 📸 Fotos
- 🔑 Autenticación
- 🔗 URLs
- 📦 Objetos/estructuras

### Herramientas recomendadas

1. **React DevTools**: Ver estado de Context API
2. **Network tab**: Ver peticiones HTTP completas
3. **Console**: Seguir flujo con logs
4. **localStorage inspector**: Ver tokens de auth

---

## 🚀 Mejoras Futuras

1. **Optimización de imágenes**
   - Comprimir antes de enviar
   - Lazy loading en galerías

2. **Offline mode**
   - Service Worker para cache
   - Queue de recolecciones pendientes

3. **Validación mejorada**
   - Zod o Yup para schemas
   - Validación en tiempo real

4. **Búsqueda avanzada**
   - Filtros combinados
   - Búsqueda por rango de fechas
   - Exportar resultados

5. **Geolocalización mejorada**
   - Mapa interactivo
   - Selector de ubicación en mapa
   - Tracking de ruta de recolección

---

## 📌 Conclusión

El Módulo de Recolecciones es un sistema completo y robusto que maneja:

- ✅ Formulario multi-paso con validación
- ✅ Geolocalización automática
- ✅ Gestión de fotografías
- ✅ Integración con backend REST API
- ✅ Autenticación y autorización
- ✅ Context API para estado global
- ✅ Navegación fluida con React Router
- ✅ UI responsive y moderna con Tailwind
- ✅ Logging exhaustivo para debugging
- ✅ Manejo de errores robusto

**Total de archivos:** 12 (10 componentes + 1 servicio + 1 types)

**Total de líneas:** ~3,500 líneas de código

**Tecnologías:** React, TypeScript, React Router, Context API, Tailwind CSS

---

*Documentación generada: Febrero 2026*
*Versión: 1.0*
