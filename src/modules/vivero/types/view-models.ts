import type {
  EstadoLoteVivero,
  SubetapaAdaptabilidad,
  TipoMaterialVivero,
  UnidadMedidaVivero,
} from './contracts'

export interface ViveroLotCardData {
  id: number
  codigo: string
  especie: string
  fuente: TipoMaterialVivero
  estadoLote: EstadoLoteVivero
  subetapaActual: SubetapaAdaptabilidad | null
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
  motivoCierre: string | null
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
  recoleccionTipoMaterial: TipoMaterialVivero
  createdAt: string
  updatedAt: string
  // AGREGA ESTO:
  evidencias?: Array<{
    id: number;
    url: string;
    fecha: string;
  }>;
  
}
