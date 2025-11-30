export type CollectionType = 'seed' | 'cutting'

export type CollectionRecord = {
  id: string
  locationRecolecion: string
  locationAlmacenado: string
  species: string
  quantity: string
  date: string
  types: CollectionType[]
  imageUrl?: string
}

export type FilterKey = 'Todos' | 'Semilla' | 'Esqueje' | 'Ambos'
