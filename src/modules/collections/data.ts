import type {
  CollectionMethod,
  CollectionRecord,
  Location,
  Nursery,
  Plant,
  User,
} from './types'

export const users: User[] = [
  { id: 'usr_1', fullName: 'María Quispe', email: 'maria@gmail.com' },
  { id: 'usr_2', fullName: 'Juan Mamani', email: 'juan@gmail.com' },
]

export const locations: Location[] = [
  {
    id: 'loc_1',
    country: 'Bolivia',
    department: 'La Paz',
    community: 'Coroico',
    zone: 'Yungas',
    latitude: -16.189,
    longitude: -67.728,
  },
  {
    id: 'loc_2',
    country: 'Bolivia',
    department: 'Santa Cruz',
    community: 'Samaipata',
    latitude: -18.176,
    longitude: -63.875,
  },
  {
    id: 'loc_3',
    country: 'Bolivia',
    department: 'La Paz',
    community: 'San Juan',
  },
]

export const nurseries: Nursery[] = [
  { id: 'nur_1', code: 'VIV-SJ', name: 'San Juan Nursery', locationId: 'loc_3' },
  { id: 'nur_2', code: 'VIV-SAM', name: 'Samaipata Nursery', locationId: 'loc_2' },
]

export const plants: Plant[] = [
  { id: 'pl_1', scientificName: 'Cedrela sp.', commonName: 'Cedro' },
  { id: 'pl_2', scientificName: 'Quercus sp.' },
  { id: 'pl_3', scientificName: 'Pinus sp.' },
]

export const methods: CollectionMethod[] = [
  { id: 'm_1', name: 'Manual collection' },
  { id: 'm_2', name: 'Post-harvest' },
  { id: 'm_3', name: 'Sampling' },
]

export const collectionRecords: CollectionRecord[] = [
  {
    id: 'rec_14',
    code: 'REC-2025-014',
    date: '2025-11-05',

    plantId: 'pl_1',
    collectorUserId: 'usr_1',

    collectionLocationId: 'loc_3',
    storageNurseryId: 'nur_1',

    methodId: 'm_1',

    materials: [
      { materialType: 'seed', quantity: { value: 2.88, unit: 'kg' } },
    ],

    status: 'stored',
    notes: 'Seeds cleaned and stored.',

    photos: [
      { id: 'ph_1', label: 'Collected seeds', url: '/img/rec014-1.jpg' },
    ],

    requiredPhotos: { total: 3, provided: 1 },

    traceCode: 'TRC-014-SJ',

    auditTrail: [],
  },

  {
    id: 'rec_12',
    code: 'REC-2025-012',
    date: '2025-11-01',

    plantId: 'pl_3',
    collectorUserId: 'usr_2',

    collectionLocationId: 'loc_1',
    storageNurseryId: 'nur_1',

    methodId: 'm_3',

    materials: [{ materialType: 'cutting', quantity: { value: 30, unit: 'units' } }],

    status: 'stored',
    notes: 'Cuttings batch stored.',

    photos: [],

    requiredPhotos: { total: 4, provided: 0 },

    traceCode: 'TRC-012-COR',

    auditTrail: [
      {
        at: '2025-11-02T10:30:00Z',
        byUserId: 'usr_1',
        description: 'Initial inspection completed.',
      },
    ],
  },
]

const indexById = <T extends { id: string }>(items: T[]) =>
  items.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})

export const usersById = indexById(users)
export const locationsById = indexById(locations)
export const nurseriesById = indexById(nurseries)
export const plantsById = indexById(plants)
export const methodsById = indexById(methods)

export const speciesOptions = plants.map(
  (plant) => plant.commonName ?? plant.scientificName,
)

export const methodOptions = methods.map((method) => method.name)

export const materialFilterOptions = [
  { key: 'all', label: 'Todos' },
  { key: 'seed', label: 'Semilla' },
  { key: 'cutting', label: 'Esqueje' },
] as const
