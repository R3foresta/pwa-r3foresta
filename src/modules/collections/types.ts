export type CollectionType = 'Semilla' | 'Esqueje'
export type CollectionEstado = 'Alamacenado' | 'Usado' | 'Vencido' | 'Perdidido' | 'Desechado'
export type CollectionRecord = {
  id: string
  locationRecolecion: string
  locationAlmacenado: string
  species: string
  quantity: string
  date: string
  types: CollectionType[]
  estado?: CollectionEstado[]
  imageUrl?: string
  detail?: CollectionDetail
}

export type FilterKey = 'Todos' | 'Semilla' | 'Esqueje' | 'Ambos'

export type CollectionDetail = {
  seedQuantity?: string
  cuttingQuantity?: string
  locationFull: {
    country: string
    region: string
    community: string
    zone?: string
  }
  mapSnapshot?: string
  photos: { label: string; url: string }[]
  requiredPhotos: {
    total: number
    provided: number
  }
  traceCode: string
  edits: { date: string; description: string }[]
}
