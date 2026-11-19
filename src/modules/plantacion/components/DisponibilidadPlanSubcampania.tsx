import { useId, useState } from 'react'
import { Button } from '../../../components/ui'
import { formatearCantidad, formatearCorte } from '../../reportes/reporte-plantaciones.presentacion'
import { consultarVivero } from '../../reportes/reporte-vivero.api'
import type { FilaVivero, FiltrosVivero, OpcionesVivero, ReporteVivero } from '../../reportes/reporte-vivero.contract'
import { useLecturaVivero } from '../../reportes/useLecturaVivero'

type Necesidad = { planta_id: string; nombre: string; cantidad: number }
type Props = { token: string; necesidades: readonly Necesidad[] }
type Vivero = OpcionesVivero['viveros'][number]

const filtros: FiltrosVivero = { planta_id: null, vivero_id: null }

function Comparacion({ datos, necesidades, vivero, setVivero }: {
  datos: ReporteVivero
  necesidades: readonly Necesidad[]
  vivero: Vivero | null
  setVivero: (vivero: Vivero | null) => void
}) {
  const selectorId = useId()
  const viveros = datos.opciones.viveros
  const saldos = new Map<string, FilaVivero[]>()
  for (const fila of datos.filas) {
    if (vivero && fila.vivero_id !== vivero.id) continue
    const filas = saldos.get(fila.planta_id)
    if (filas) filas.push(fila)
    else saldos.set(fila.planta_id, [fila])
  }

  return <div className="mt-3 space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 grow sm:max-w-xs">
        <label className="text-xs font-semibold text-neutral-700" htmlFor={selectorId}>Vivero para la comparación</label>
        <select id={selectorId} value={vivero?.id ?? ''} onChange={event => {
          setVivero(viveros.find(opcion => opcion.id === event.target.value) ?? null)
        }} className="mt-1 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-brand-900 focus-visible:outline-brand-500">
          <option value="">Todos los viveros</option>
          {viveros.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          {vivero && !viveros.some(opcion => opcion.id === vivero.id) && <option value={vivero.id}>{vivero.nombre}</option>}
        </select>
      </div>
      <p className="text-xs text-neutral-600">Saldo al <time dateTime={datos.observado_en}>{formatearCorte(datos.observado_en)}</time> (Bolivia)</p>
    </div>
    <ul className="space-y-2" aria-label="Disponibilidad por especie">
      {necesidades.map(({ planta_id, nombre, cantidad }) => {
        const filas = saldos.get(planta_id) ?? []
        const disponible = filas.reduce((total, fila) => total + fila.plantas, 0)
        const faltante = Math.max(0, cantidad - disponible)
        return <li key={planta_id} className="space-y-2 rounded-2xl border border-neutral-100 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="min-w-0 break-words text-sm font-extrabold text-brand-900">{nombre}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${faltante ? 'bg-warning-50 text-warning-800' : 'bg-success-50 text-success-800'}`}>
              {faltante ? `Faltan ${formatearCantidad(faltante)}` : 'Suficiente'}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
            <div className="min-w-0">
              <dt>Necesarias</dt>
              <dd className="break-words text-sm font-bold tabular-nums text-brand-900">{formatearCantidad(cantidad)}</dd>
            </div>
            <div className="min-w-0">
              <dt>En vivero</dt>
              <dd className="break-words text-sm font-bold tabular-nums text-brand-900">{formatearCantidad(disponible)}</dd>
            </div>
          </dl>
          {!vivero && filas.length > 0 && <ul className="space-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-700" aria-label={`Saldo por vivero de ${nombre}`}>
            {filas.map(fila => <li key={fila.vivero_id} className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 break-words">{fila.vivero}</span>
              <span className="font-semibold tabular-nums">{formatearCantidad(fila.plantas)} {fila.plantas === 1 ? 'planta' : 'plantas'}</span>
            </li>)}
          </ul>}
        </li>
      })}
    </ul>
  </div>
}

function LecturaDisponibilidad({ token, necesidades }: Props) {
  const [vivero, setVivero] = useState<Vivero | null>(null)
  const { datos, error, cargando, reintentar } = useLecturaVivero(consultarVivero, filtros, token)
  if (necesidades.length === 0) return null
  return <div className="mt-3">
    <Button variant="secondary" size="sm" className="min-h-11" leftIcon="refresh" loading={cargando} onClick={reintentar}>
      {cargando ? 'Consultando saldo…' : error ? 'Reintentar consulta' : 'Actualizar saldo'}
    </Button>
    {cargando && <span role="status" className="sr-only">Consultando saldo de plantas en vivero.</span>}
    {error && <p role="alert" className="mt-2 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">
      Disponibilidad sin confirmar. {error}
    </p>}
    {datos && <Comparacion datos={datos} necesidades={necesidades} vivero={vivero} setVivero={setVivero} />}
  </div>
}

export default function DisponibilidadPlanSubcampania({ token, necesidades }: Props) {
  const [consultado, setConsultado] = useState(false)
  const tituloId = useId()
  const hayNecesidades = necesidades.length > 0
  return <section aria-labelledby={tituloId} className="min-w-0 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
    <h2 id={tituloId} className="text-sm font-extrabold text-brand-900">Disponibilidad de plantas</h2>
    <p className="mt-1 text-xs leading-relaxed text-neutral-700">La comprobación es informativa. El stock se confirma al asignar.</p>
    {!hayNecesidades && <p className="mt-2 text-xs text-neutral-600">Completa la meta y la distribución por especie para comprobar el saldo.</p>}
    {!consultado && <Button variant="secondary" size="sm" className="mt-3 min-h-11" leftIcon="search" disabled={!hayNecesidades}
      onClick={() => setConsultado(true)}>Comprobar disponibilidad</Button>}
    {consultado && <LecturaDisponibilidad token={token} necesidades={necesidades} />}
  </section>
}
