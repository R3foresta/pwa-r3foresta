import type { CollectionRecord, FilterKey } from './types'

export const collectionFilters: FilterKey[] = ['Todos', 'Semilla', 'Esqueje', 'Ambos']

export const collectionRecords: CollectionRecord[] = [
  {
    id: 'REC-2025-014',
    locationRecolecion: 'San Juan',
    locationAlmacenado: 'San martin',
    species: 'Cedrela sp.',
    quantity: '2.88 kg',
    date: '2025-11-05',
    types: ['Semilla'],
    estado: ['Alamacenado'],
  },
  {
    id: 'REC-2025-013',
    locationRecolecion: 'Samaipata',
    locationAlmacenado: 'Samaipata',
    species: 'Quercus sp.',
    quantity: '50 unidades',
    date: '2025-11-03',
    types: ['Esqueje'],
    estado: ['Usado'],
  },
  {
    id: 'REC-2025-012',
    locationRecolecion: 'Coroico',
    locationAlmacenado: 'Coroico',
    species: 'Pinus sp.',
    quantity: '1.2 kg + 30 unidades',
    date: '2025-11-01',
    types: ['Semilla', 'Esqueje'],
    estado: ['Alamacenado'],
  },
  {
    id: 'REC-2025-015',
    locationRecolecion: 'San Juan',
    locationAlmacenado: 'San Juan',
    species: 'Cedrela sp.',
    quantity: '2.88 kg',
    date: '2025-11-05',
    types: ['Semilla'],
    estado: ['Alamacenado'],
  },
  {
    id: 'REC-2025-016',
    locationRecolecion: 'Samaipata',
    locationAlmacenado: 'Samaipata',
    species: 'Quercus sp.',
    quantity: '50 unidades',
    date: '2025-11-03',
    types: ['Esqueje'],
    estado: ['Alamacenado'],
  },
  {
    id: 'REC-2025-017',
    locationRecolecion: 'Coroico',
    locationAlmacenado: 'Coroico',
    species: 'Pinus sp.',
    quantity: '1.2 kg + 30 unidades',
    date: '2025-11-01',
    types: ['Semilla', 'Esqueje'],
    estado: ['Alamacenado'],
  },
]

export const speciesOptions = ['Cedrela sp.', 'Quercus sp.', 'Pinus sp.']
export const methodOptions = ['Recolección manual', 'Post-cosecha', 'Muestreo']
