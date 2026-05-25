import type {
  EstadoLoteVivero,
  MotivoCierreVivero,
  SubetapaAdaptabilidad,
  TipoMaterialVivero,
  UnidadMedidaVivero,
  TipoEventoVivero,
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

export interface ViveroEventPhoto {
  id: number
  url: string
  titulo: string
  fecha: string
}

export interface ViveroLotEventView {
  id: number
  kind: TipoEventoVivero
  label: string
  fecha: string
  fechaIso: string
  hora?: string | null
  responsableNombre: string
  cantidad?: number | null
  saldoAntes?: number | null
  saldoDespues?: number | null
  observacion?: string | null
  fotos?: Array<ViveroEventPhoto> | null
  evidencias?: Array<{ id: number; public_url: string; titulo: string; tomado_en: string }> | null
  
  causa?: string | null
  subetapa?: string | null
  destino?: string | null
  referencia?: string | null
  comunidad?: string | null
  materialIngresado?: string | null
  sustrato?: string | null
}

export interface PhotoItem {
  url: string;
  titulo: string;
  fecha: string;
  autor: string;
  etapa?: string;
}
