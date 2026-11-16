import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import type { ViveroLotDetailView } from '../types/view-models'
import { formatViveroDate, formatViveroNumber, origenLabel } from '../utils/presentation'
import CollapsibleSection from './CollapsibleSection'

export default function OrigenCard({ detail }: { detail: ViveroLotDetailView }) {
  const navigate = useNavigate()
  const { m1 } = useOperationalAccess()
  const origen = detail.origen
  // La ficha M1 legada aún sólo admite IDs numéricos seguros. El DTO no entrega
  // autoría para decidir si un VALIDADOR puede abrir la recepción ajena.
  const canOpenOrigin = origen?.tipo === 'RECOLECCION' && detail.recoleccionId &&
    BigInt(detail.recoleccionId) <= BigInt(Number.MAX_SAFE_INTEGER) &&
    m1.status === 'ready' && m1.data?.origen === 'ADMIN'
  const rows = [
    ['Nombre registrado', detail.nombreComercial], ['Nombre científico registrado', detail.nombreCientifico],
    ['Variedad registrada', detail.variedad ?? 'No registrada'], ['Responsable inicial registrado', detail.responsableNombre],
    ['Vivero', detail.viveroNombre],
    ...(origen?.tipo === 'INCORPORACION' ? [
      ['Fecha de recepción o conteo', formatViveroDate(origen.fecha_evento)],
      ['Cantidad incorporada', `${formatViveroNumber(origen.cantidad)} UNIDAD`],
      ['Tercero declarado', origen.tercero_origen ?? 'No registrado'],
      ['Referencia documental', origen.referencia_documental ?? 'No registrada'],
      ['Observaciones de ingreso', origen.observaciones ?? 'No registradas'],
    ] : origen?.tipo === 'RECOLECCION' ? [
      ['Recolección', detail.recoleccionCodigo ?? `ID ${detail.recoleccionId}`],
      ['Fecha de recolección', formatViveroDate(detail.recoleccionFecha)],
      ['Comunidad registrada', detail.nombreComunidadOrigen ?? 'No registrada'],
      ['Tipo de material', detail.recoleccionTipoMaterial ?? 'No registrado'],
      ['Material consumido en INICIO', `${formatViveroNumber(detail.cantidadInicialEnProceso)} ${detail.unidadMedidaInicial ?? ''}`],
    ] : []),
  ]
  return (
    <CollapsibleSection title="Origen del lote">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-brand-700">{origenLabel(origen)}</p>
        {canOpenOrigin && <Button variant="secondary" size="sm" rightIcon="chevron-right" onClick={() => navigate(`/app/collections/${detail.recoleccionId}`)}>Ver ficha</Button>}
      </div>
      {origen?.tipo === 'INCORPORACION' && <p className="mt-2 text-xs text-neutral-600">
        {origen.historia_previa_no_registrada ? 'Historia previa no registrada. ' : ''}La procedencia declarada no acredita el origen biológico ni la supervivencia anterior.
      </p>}
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => <div key={label} className="text-xs"><dt className="font-semibold text-neutral-500">{label}</dt><dd className="break-words text-brand-900">{value}</dd></div>)}
      </dl>
    </CollapsibleSection>
  )
}
