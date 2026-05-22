import type {
  EstadoLoteVivero,
  MotivoCierreVivero,
  SubetapaAdaptabilidad,
  TipoMaterialVivero,
  UnidadMedidaVivero,
} from './contracts'

export interface ViveroLotCardData {
  id: number
  codigo: string
  especie: string
  estadoLote: EstadoLoteVivero
  subetapaActual: SubetapaAdaptabilidad | null
  plantasVivasIniciales: number | null
  fechaInicio: string
  diasDesdeInicio: number
  cantidadInicial: number
  cantidadActual: number | null
  unidadMedida: UnidadMedidaVivero
  vivero: string
}

export interface ViveroLotDetailView {
  id: number
  codigo: string
  estadoLote: EstadoLoteVivero
  subetapaActual: SubetapaAdaptabilidad | null
  motivoCierre: MotivoCierreVivero | null
  fechaInicio: string
  diasDesdeInicio: number
  cantidadInicialEnProceso: number
  unidadMedidaInicial: UnidadMedidaVivero
  plantasVivasIniciales: number | null
  saldoVivoActual: number | null
  stockVivoActual: number | null
  especie: string
  nombreCientifico: string
  nombreComercial: string
  variedad: string | null
  plantaImagenUrl: string | null
  viveroNombre: string
  viveroCodigo: string
  responsableNombre: string
  responsableUsername: string | null
  recoleccionCodigo: string
  recoleccionFecha: string | null
  recoleccionTipoMaterial: TipoMaterialVivero
  nombreComunidadOrigen: string | null
  createdAt: string
  updatedAt: string
}

export interface ViveroLotEventView {
  id: number
  kind: 'INICIO' | 'EMBOLSADO' | 'MERMA' | 'ADAPTABILIDAD' | 'DESPACHO' | 'CIERRE_AUTOMATICO'
  label: string
  fecha: string         // Fecha del evento operativo (YYYY-MM-DD)
  hora?: string | null  // Hora opcional
  responsableNombre: string
  cantidad?: number | null
  saldoAntes?: number | null
  saldoDespues?: number | null
  observacion?: string | null
  fotos?: Array<{
    id: number
    url: string
    titulo: string
    fecha: string
  }> | null
}