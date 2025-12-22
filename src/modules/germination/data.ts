export type GerminationPhase = 'INICIO' | 'EMBOLSADO' | 'SOMBRA' | 'LISTA_PLANTAR' | 'SALIDA_VIVERO'

export type GerminationEvent = {
  id: string
  fecha: string
  fase: GerminationPhase
  accion: 'INICIO' | 'EMBOLSADO' | 'SOMBRA' | 'LISTA_PLANTAR' | 'SALIDA' | 'AJUSTE'
  responsable: string
  notas?: string
  fotoUrl?: string
  vivas?: number
  muertas?: number
  alturaPromCm?: number
}

export type GerminationLot = {
  id: string
  codigo: string
  planta: {
    especie: string
    nombreCientifico: string
    variedad?: string
    tipoPlanta: string
    tipoPlantaOtro?: string
    fuente: 'SEMILLA' | 'ESQUEJE'
  }
  vivero: {
    codigo: string
    nombre: string
    ubicacion: {
      pais: string
      departamento: string
      provincia: string
      comunidad: string
      zona: string
      latitud: number
      longitud: number
    }
  }
  responsable: string
  estado: GerminationPhase
  fechas: Partial<Record<GerminationPhase, string>>
  cantidadInicio: number
  germinadas: number
  muertas: number
  alturaPromSombraCm?: number
  alturaPromSalidaCm?: number
  blockchainHash?: string
  eventos: GerminationEvent[]
}

export const germinationLots: GerminationLot[] = [
  {
    id: 'lot-1',
    codigo: 'GER-2025-001',
    planta: {
      especie: 'Cedrela odorata',
      nombreCientifico: 'Cedrela odorata',
      variedad: 'M-12',
      tipoPlanta: 'Árbol',
      fuente: 'SEMILLA',
    },
    vivero: {
      codigo: 'VIV-001',
      nombre: 'Vivero 1',
      ubicacion: {
        pais: 'Bolivia',
        departamento: 'Santa Cruz',
        provincia: 'Andrés Ibáñez',
        comunidad: 'Comunidad A',
        zona: 'Zona Verde',
        latitud: -17.7832,
        longitud: -63.1821,
      },
    },
    responsable: 'Ana Laura (userid: ana)',
    estado: 'INICIO',
    fechas: {
      INICIO: '2025-09-21',
      EMBOLSADO: '2025-10-05',
    },
    cantidadInicio: 200,
    germinadas: 165,
    muertas: 35,
    alturaPromSombraCm: 18,
    blockchainHash: '0x17e06c9dbb4a2ef2c3451fa7d8aa11b34d9b0c45',
    eventos: [
      {
        id: 'evt-1',
        fecha: '2025-09-21',
        fase: 'INICIO',
        accion: 'INICIO',
        responsable: 'Ana Laura',
        notas: 'Semilla seleccionada y preparada.',
        vivas: 200,
        muertas: 0,
        fotoUrl:
          'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'evt-2',
        fecha: '2025-10-05',
        fase: 'EMBOLSADO',
        accion: 'EMBOLSADO',
        responsable: 'Ana Laura',
        notas: 'Embolsado parcial, humedad estable.',
        vivas: 180,
        muertas: 20,
        fotoUrl:
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  {
    id: 'lot-2',
    codigo: 'GER-2025-002',
    planta: {
      especie: 'Cedrela odorata',
      nombreCientifico: 'Cedrela odorata',
      variedad: 'M-08',
      tipoPlanta: 'Árbol',
      fuente: 'SEMILLA',
    },
    vivero: {
      codigo: 'VIV-002',
      nombre: 'Vivero 2',
      ubicacion: {
        pais: 'Bolivia',
        departamento: 'Santa Cruz',
        provincia: 'Ichilo',
        comunidad: 'Comunidad B',
        zona: 'Zona Norte',
        latitud: -17.3401,
        longitud: -63.2503,
      },
    },
    responsable: 'Carlos Vega (userid: carlos)',
    estado: 'LISTA_PLANTAR',
    fechas: {
      INICIO: '2025-08-21',
      EMBOLSADO: '2025-08-30',
      SOMBRA: '2025-09-07',
      LISTA_PLANTAR: '2025-09-18',
    },
    cantidadInicio: 200,
    germinadas: 100,
    muertas: 100,
    alturaPromSombraCm: 22,
    alturaPromSalidaCm: 28,
    blockchainHash: '0x6a92e1c2b01aa48c2d5b0fa6d6471c96a57230f1',
    eventos: [
      {
        id: 'evt-3',
        fecha: '2025-08-21',
        fase: 'INICIO',
        accion: 'INICIO',
        responsable: 'Carlos Vega',
        notas: 'Inicio de bandejas con sustrato nuevo.',
        vivas: 200,
        muertas: 0,
        fotoUrl:
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'evt-4',
        fecha: '2025-08-30',
        fase: 'EMBOLSADO',
        accion: 'EMBOLSADO',
        responsable: 'Carlos Vega',
        notas: '80% embolsado, se completará mañana.',
        vivas: 190,
        muertas: 10,
      },
      {
        id: 'evt-5',
        fecha: '2025-09-07',
        fase: 'SOMBRA',
        accion: 'SOMBRA',
        responsable: 'Carlos Vega',
        notas: 'Primer paso a sombra, buena humedad.',
        vivas: 150,
        muertas: 50,
        alturaPromCm: 20,
        fotoUrl:
          'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'evt-6',
        fecha: '2025-09-18',
        fase: 'LISTA_PLANTAR',
        accion: 'LISTA_PLANTAR',
        responsable: 'Carlos Vega',
        notas: 'Listo para plantar, consolidando lotes.',
        vivas: 100,
        muertas: 100,
        alturaPromCm: 28,
      },
    ],
  },
]

export const germinationLotsById = Object.fromEntries(
  germinationLots.map((lot) => [lot.id, lot]),
)
