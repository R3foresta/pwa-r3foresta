import type {
  EstadoLoteVivero,
  MotivoCierreVivero,
  SubetapaAdaptabilidad,
  TipoMaterialVivero,
  UnidadMedidaVivero,
  OrigenLoteVivero,
} from './contracts'

export type OrigenLoteView =
  | { tipo: 'RECOLECCION'; recoleccion_id: string }
  | (Omit<Extract<OrigenLoteVivero, { tipo: 'INCORPORACION' }>, 'evento_id'> & { evento_id: string })

export interface ViveroLotCardData {
  id: string
  origen: OrigenLoteView | null
  codigo: string
  especie: string
  estadoLote: EstadoLoteVivero
  subetapaActual: SubetapaAdaptabilidad | null
  plantasVivasIniciales: number | null
  fechaInicio: string
  diasDesdeInicio: number
  cantidadInicial: number | null
  cantidadActual: number | null
  unidadMedida: UnidadMedidaVivero | null
  vivero: string
  /** Total entregado físicamente a subcampañas (informativo). */
  saldoAsignadoSubcampanias?: number | null
  cantidadAsignacionesActivas?: number | null
  puedeDescartarPreEmbolsado: boolean
}

export interface ViveroLotDetailView {
  viveroId?: string
  id: string
  origen: OrigenLoteView | null
  codigo: string
  estadoLote: EstadoLoteVivero
  subetapaActual: SubetapaAdaptabilidad | null
  motivoCierre: MotivoCierreVivero | null
  fechaInicio: string
  diasDesdeInicio: number
  cantidadInicialEnProceso: number | null
  unidadMedidaInicial: UnidadMedidaVivero | null
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
  recoleccionId: string | null
  recoleccionCodigo: string | null
  recoleccionFecha: string | null
  recoleccionTipoMaterial: TipoMaterialVivero | null
  nombreComunidadOrigen: string | null
  createdAt: string
  updatedAt: string
  /** Total entregado físicamente a subcampañas (informativo). */
  saldoAsignadoSubcampanias?: number | null
  cantidadAsignacionesActivas?: number | null
  puedeDescartarPreEmbolsado: boolean
}

export interface ViveroEventPhoto {
  id: string
  url: string | null
  titulo: string
  fecha: string
  expiraEn: number | null
  mimeType: string | null
  tamanoBytes: number | null
}

export interface ViveroLotEventView {
  id: string
  kind: string
  conocido: boolean
  label: string
  fecha: string
  fechaIso: string
  hora: string | null
  responsableEsSnapshot: boolean
  procedencia?: { modalidad: string | null; procedencia: string | null; tercero: string | null; referencia: string | null } | null
  responsableNombre: string
  cantidad?: number | null
  unidadMedidaEvento?: UnidadMedidaVivero | null
  saldoAntes?: number | null
  saldoDespues?: number | null
  observacion?: string | null
  fotos?: Array<ViveroEventPhoto> | null
  causa?: string | null
  subetapa?: string | null
  destino?: string | null
  referencia?: string | null
  comunidad?: string | null
  materialIngresado?: string | null
  sustrato?: string | null
}

export interface PhotoItem extends ViveroEventPhoto {
  autor: string
  etapa?: string
}
