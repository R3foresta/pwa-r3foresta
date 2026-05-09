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
  // TODO(p0.2 — código zombi): `fuente` se popula en lote.mapper.ts pero
  // ViveroLotCard.tsx nunca lo renderiza. Decisión pendiente:
  //   a) borrar este campo + su línea en el mapper, o
  //   b) renderizarlo como chip "SEMILLA"/"ESQUEJE" en la card.
  fuente: TipoMaterialVivero
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
  // TODO(p0.2 — código zombi): este campo está declarado pero ningún mapper lo
  // popula y ningún screen lo lee. Su shape (`{id, url, fecha}`) tampoco
  // coincide con lo que devolverá el backend (`ObtenerEmbolsadoEvidencia` ya
  // existe en contracts: `{id, ruta_archivo, mime_type, public_url, ...}`).
  // Cuando conectemos `getEmbolsado` o `getTimeline` en ViveroDetailScreen,
  // borrar esta declaración y reemplazar por la real (`ObtenerEmbolsadoEvidencia[]`).
  evidencias?: Array<{
    id: number;
    url: string;
    fecha: string;
  }>;
}
