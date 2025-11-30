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
}

export type FilterKey = 'Todos' | 'Semilla' | 'Esqueje' | 'Ambos'
