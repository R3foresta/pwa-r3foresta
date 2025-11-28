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
    detail: {
      seedQuantity: '2880 gr',
      cuttingQuantity: '—',
      locationFull: {
        country: 'Bolivia',
        region: 'La Paz, Nor Yungas',
        community: 'San Juan',
        zone: '-',
      },
      mapSnapshot:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60',
      photos: [
        {
          label: 'Lugar',
          url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=600&q=60',
        },
        {
          label: 'Total recolectado',
          url: 'https://images.unsplash.com/photo-1610465299996-30f240ac2baf?auto=format&fit=crop&w=600&q=60',
        },
        {
          label: 'Detalle',
          url: 'https://images.unsplash.com/photo-1582719478248-54e9f2af9b1c?auto=format&fit=crop&w=600&q=60',
        },
      ],
      requiredPhotos: { total: 2, provided: 2 },
      traceCode: 'REC-2025-014',
      edits: [
        { date: '15/10/2025', description: 'Ana editó cantidad de semillas' },
        { date: '14/10/2025', description: 'Carlos creó registro' },
      ],
    },
  },
  {
    id: 'REC-2025-013',
    location: 'Samaipata',
    species: 'Quercus sp.',
    quantity: '50 unidades',
    date: '2025-11-03',
    types: ['cutting'],
    detail: {
      seedQuantity: '—',
      cuttingQuantity: '50 unidades',
      locationFull: {
        country: 'Bolivia',
        region: 'Santa Cruz, Florida',
        community: 'Samaipata',
        zone: 'Norte',
      },
      mapSnapshot:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=60',
      photos: [
        {
          label: 'Lugar',
          url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60',
        },
        {
          label: 'Total recolectado',
          url: 'https://images.unsplash.com/photo-1525235237958-79c5dc2f2723?auto=format&fit=crop&w=600&q=60',
        },
      ],
      requiredPhotos: { total: 2, provided: 2 },
      traceCode: 'REC-2025-013',
      edits: [
        { date: '10/10/2025', description: 'María subió evidencia' },
        { date: '09/10/2025', description: 'José creó registro' },
      ],
    },
  },
  {
    id: 'REC-2025-012',
    location: 'Coroico',
    species: 'Pinus sp.',
    quantity: '1.2 kg + 30 unidades',
    date: '2025-11-01',
    types: ['seed', 'cutting'],
    detail: {
      seedQuantity: '1.2 kg',
      cuttingQuantity: '30 unidades',
      locationFull: {
        country: 'Bolivia',
        region: 'La Paz, Yungas',
        community: 'Coroico',
        zone: 'Bosque de nubes',
      },
      mapSnapshot:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60',
      photos: [
        {
          label: 'Lugar',
          url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=60',
        },
        {
          label: 'Total recolectado',
          url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=60',
        },
        {
          label: 'Detalle',
          url: 'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=600&q=60',
        },
      ],
      requiredPhotos: { total: 2, provided: 3 },
      traceCode: 'REC-2025-012',
      edits: [
        { date: '05/10/2025', description: 'Actualización de notas' },
        { date: '03/10/2025', description: 'Registro inicial' },
      ],
    },
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
