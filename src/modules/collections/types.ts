export type CollectionType = 'seed' | 'cutting'

export type CollectionRecord = {
  id: string
  location: string
  species: string
  quantity: string
  date: string
  types: CollectionType[]
}

export type FilterKey = 'Todos' | 'Semilla' | 'Esqueje' | 'Ambos'
