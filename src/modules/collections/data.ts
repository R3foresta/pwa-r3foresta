import type { CollectionRecord, FilterKey } from './types'

export const collectionFilters: FilterKey[] = ['Todos', 'Semilla', 'Esqueje', 'Ambos']

export const collectionRecords: CollectionRecord[] = [
  {
    id: 'REC-2025-014',
    location: 'San Juan',
    species: 'Cedrela sp.',
    quantity: '2.88 kg',
    date: '2025-11-05',
    types: ['seed'],
  },
  {
    id: 'REC-2025-013',
    location: 'Samaipata',
    species: 'Quercus sp.',
    quantity: '50 unidades',
    date: '2025-11-03',
    types: ['cutting'],
  },
  {
    id: 'REC-2025-012',
    location: 'Coroico',
    species: 'Pinus sp.',
    quantity: '1.2 kg + 30 unidades',
    date: '2025-11-01',
    types: ['seed', 'cutting'],
  },
  {
    id: 'REC-2025-015',
    location: 'San Juan',
    species: 'Cedrela sp.',
    quantity: '2.88 kg',
    date: '2025-11-05',
    types: ['seed'],
  },
  {
    id: 'REC-2025-016',
    location: 'Samaipata',
    species: 'Quercus sp.',
    quantity: '50 unidades',
    date: '2025-11-03',
    types: ['cutting'],
  },
  {
    id: 'REC-2025-017',
    location: 'Coroico',
    species: 'Pinus sp.',
    quantity: '1.2 kg + 30 unidades',
    date: '2025-11-01',
    types: ['seed', 'cutting'],
  },
]

export const speciesOptions = ['Cedrela sp.', 'Quercus sp.', 'Pinus sp.']
export const methodOptions = ['Recolección manual', 'Post-cosecha', 'Muestreo']
