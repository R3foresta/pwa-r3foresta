// ============================================================================
// types.ts
// ============================================================================
// Tipos del dominio para el módulo de recolecciones
// Define las estructuras de datos principales (legacy)
// Nota: Algunos tipos no se usan activamente, se mantienen para compatibilidad
// ============================================================================

// Tipos base
export type UUID = string                                    // Identificador único (string)
export type ISODate = `${number}-${number}-${number}`       // Fecha formato ISO: YYYY-MM-DD
export type ISODateTime = string                             // Fecha y hora completa ISO

// Enums y tipos específicos del dominio
export type MaterialType = 'seed' | 'cutting'                 // Tipo de material: semilla o esqueje
export type RecordStatus = 'stored' | 'used' | 'discarded'    // Estado del registro
export type Unit = 'kg' | 'units'                             // Unidades de medida

export type Quantity = {
  value: number
  unit: Unit
}

export type MaterialBatch = {
  materialType: MaterialType
  quantity: Quantity
}

export type User = {
  id: UUID
  fullName: string
  email?: string
}

export type Location = {
  id: UUID
  country: string
  department: string
  province?: string
  community: string
  zone?: string
  latitude?: number
  longitude?: number
}

export type Nursery = {
  id: UUID
  code: string
  name: string
  locationId: UUID
}

export type Plant = {
  id: UUID
  commonName?: string
  scientificName: string
  variety?: string
  plantType?: string
  source?: string
}

export type CollectionMethod = {
  id: UUID
  name: string
  description?: string
}

export type Photo = {
  id: UUID
  label: string
  url: string
  sizeBytes?: number
  format?: 'jpg' | 'png' | 'webp' | 'heic'
  createdAt?: ISODateTime
}

export type AuditEdit = {
  at: ISODateTime
  byUserId: UUID
  description: string
}

export type CollectionRecord = {
  id: UUID

  // human-friendly code like "REC-2025-014"
  code: string

  date: ISODate

  plantId: UUID
  collectorUserId: UUID

  collectionLocationId: UUID
  storageNurseryId: UUID

  methodId?: UUID

  materials: MaterialBatch[] // seed, cutting, or both

  status: RecordStatus
  notes?: string

  photos: Photo[]

  requiredPhotos: {
    total: number
    provided: number
  }

  traceCode: string

  auditTrail: AuditEdit[]
}

export type CollectionFilters = {
  materialType?: MaterialType | 'all'
  status?: RecordStatus | 'all'
  plantId?: UUID | 'all'
  nurseryId?: UUID | 'all'
  locationId?: UUID | 'all'
}
