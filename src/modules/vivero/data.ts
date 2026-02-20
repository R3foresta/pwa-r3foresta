import type { UbicacionApi } from '../../types/ubicacion'

export type ViveroPhase = 'INICIO' | 'EMBOLSADO' | 'SOMBRA' | 'LISTA_PLANTAR' | 'SALIDA_VIVERO'

export type ViveroEvent = {
  id: string
  fecha: string
  fase: ViveroPhase
  accion: 'INICIO' | 'EMBOLSADO' | 'SOMBRA' | 'LISTA_PLANTAR' | 'SALIDA' | 'AJUSTE'
  responsable: string
  notas?: string
  fotoUrl?: string
  vivas?: number
  muertas?: number
  alturaPromCm?: number
}

export type ViveroLot = {
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
    ubicacion: UbicacionApi | null
  }
  responsable: string
  estado: ViveroPhase
  fechas: Partial<Record<ViveroPhase, string>>
  cantidadInicio: number
  germinadas: number
  muertas: number
  alturaPromSombraCm?: number
  alturaPromSalidaCm?: number
  blockchainHash?: string
  eventos: ViveroEvent[]
}
