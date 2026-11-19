import { useId } from 'react'
import Icon, { type IconName } from '../../components/Icon'
import { Button } from '../../components/ui'
import type { EspeciePlantada, ReportePlantaciones } from './reporte-plantaciones.contract'
import { formatearCantidad, formatearMes, formatearProporcion, nombreEspecie } from './reporte-plantaciones.presentacion'

const panel = 'min-w-0 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-6'
const dot = 'h-2.5 w-2.5 shrink-0 rounded-full'
const colours = ['#164d2f', '#5f9a78', '#355c80', '#97632f', '#7c5272', '#80914c']

const metrics: { key: keyof ReportePlantaciones['totales']; label: string; icon: IconName }[] = [
  { key: 'total', label: 'Total plantado', icon: 'trees' },
  { key: 'iniciales', label: 'Plantación inicial', icon: 'planting' },
  { key: 'reposiciones', label: 'Reposiciones', icon: 'refresh' },
  { key: 'registros', label: 'Registros de plantación', icon: 'report' },
]

export function IndicadoresPlantaciones({ totales }: { totales: ReportePlantaciones['totales'] }) {
  return <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores del período">
    {metrics.map(({ key, label, icon }) => {
      const primary = key === 'total'
      return <div key={key} className={`flex min-w-0 flex-col rounded-3xl border p-4 sm:p-5 ${primary ? 'border-brand-800 bg-brand-800 text-white' : 'border-brand-100 bg-white text-brand-800'}`}>
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${primary ? 'bg-white/10 text-brand-100' : 'bg-brand-50 text-brand-600'}`} aria-hidden="true">
          <Icon name={icon} className="h-5 w-5" />
        </div>
        <dt className={`text-sm font-semibold ${primary ? 'text-brand-100' : 'text-neutral-600'}`}>{label}</dt>
        <dd className="mt-1 break-words font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{formatearCantidad(totales[key])}</dd>
      </div>
    })}
  </dl>
}

export function PlantacionMensual({ meses }: { meses: ReportePlantaciones['meses'] }) {
  const title = useId()
  const peak = meses.reduce((highest, item) => Math.max(highest, item.iniciales + item.reposiciones), 0)
  const scale = Math.max(peak, 1)

  return <section className={panel} aria-labelledby={title}>
    <h2 id={title} className="font-display text-lg font-extrabold text-brand-900">Plantación mensual</h2>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-700">
      <span className="flex items-center gap-2"><span className={`${dot} bg-brand-600`} />Iniciales</span>
      <span className="flex items-center gap-2"><span className={`${dot} bg-[#a16a35]`} />Reposiciones</span>
    </div>
    {peak === 0 ? <p className="mt-7 text-sm text-neutral-600">Sin actividad en este período.</p> : <div className="mt-5 flex gap-2">
      <div className="relative mt-1 h-32 w-12 shrink-0 text-right text-[11px] font-medium tabular-nums text-neutral-500 sm:h-40 sm:w-16" aria-hidden="true">
        <span className="absolute right-0 top-0 -translate-y-1/2">{formatearCantidad(peak)}</span>
        {peak >= 2 && <span className="absolute right-0 top-1/2 -translate-y-1/2">{formatearCantidad(peak / 2)}</span>}
        <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" tabIndex={0} role="region" aria-label="Plantas por mes. Desliza para ver más meses.">
        <ul className="relative flex w-max min-w-full gap-1.5 px-1 pt-1">
          <li aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1 h-32 border-y border-neutral-200 sm:h-40"><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-200" /></li>
          {meses.map(({ mes, iniciales, reposiciones }) => {
            const label = formatearMes(mes)
            const summary = `${label}: ${formatearCantidad(iniciales)} iniciales y ${formatearCantidad(reposiciones)} reposiciones.`
            return <li key={mes} title={summary} className="relative min-w-[3.1rem] flex-1 text-center">
              <span className="sr-only">{summary}</span>
              <div aria-hidden="true" className="mx-auto flex h-32 max-w-9 flex-col justify-end overflow-hidden rounded-t-md sm:h-40">
                <div className="bg-[#a16a35]" style={{ height: `${100 * reposiciones / scale}%` }} />
                <div className="bg-brand-600" style={{ height: `${100 * iniciales / scale}%` }} />
              </div>
              <span aria-hidden="true" className="block py-2 text-[11px] font-semibold leading-tight text-neutral-600">{label}</span>
            </li>
          })}
        </ul>
      </div>
    </div>}
  </section>
}

function MezclaEspecies({ especies, total, tablaId }: { especies: EspeciePlantada[]; total: number; tablaId: string }) {
  const title = useId()
  const conocidas = especies.filter(especie => especie.planta_id !== null)
  const sinDesglose = especies.find(especie => especie.planta_id === null)
  const espacio = colours.length - Number(Boolean(sinDesglose))
  const principales = conocidas.length > espacio ? conocidas.slice(0, espacio - 1) : conocidas
  const visibles = sinDesglose ? [...principales, sinDesglose] : principales
  const porciones = visibles.map(especie => ({ valor: especie.total, nombre: nombreEspecie(especie), key: especie.planta_id ?? 'sin-desglose', id: especie.planta_id }))
  if (principales.length < conocidas.length) {
    const otras = conocidas.slice(principales.length).reduce((sum, item) => sum + item.total, 0)
    porciones.push({ valor: otras, nombre: 'Otras especies', key: 'otras', id: null })
  }
  let acumulado = 0
  const stops = porciones.map(({ valor }, index) => {
    const from = acumulado
    acumulado += valor
    return `${colours[index]} ${100 * from / total}% ${100 * acumulado / total}%`
  })

  return <section className={panel} aria-labelledby={title}>
    <h2 id={title} className="font-display text-lg font-extrabold text-brand-900">Mezcla de especies</h2>
    {total === 0 ? <p className="mt-7 text-sm text-neutral-600">Sin especies plantadas en este período.</p> : <div className="mt-5 grid items-center gap-5 sm:grid-cols-[9rem_1fr] md:grid-cols-[8rem_1fr] lg:grid-cols-[10rem_1fr]">
      <div className="relative mx-auto grid aspect-square w-36 max-w-full place-items-center rounded-full sm:w-full" style={{ background: porciones.length === 1 ? colours[0] : `conic-gradient(${stops.join(', ')})` }} aria-hidden="true">
        <div className="flex h-[69%] w-[69%] flex-col items-center justify-center rounded-full bg-white px-2 text-center">
          <strong className="max-w-full break-words font-display text-base font-extrabold tabular-nums text-brand-900 sm:text-lg">{formatearCantidad(total)}</strong>
          <span className="text-xs text-neutral-600">plantas</span>
        </div>
      </div>
      <ul className="min-w-0 divide-y divide-neutral-100" aria-label="Cantidades y proporciones por especie">
        {porciones.map(({ key, nombre, valor, id }, index) => <li key={key} className="flex min-w-0 items-start gap-2 py-2 text-sm">
          <span className={`${dot} mt-1.5`} style={{ backgroundColor: colours[index] }} aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words font-semibold text-brand-800">
            {id || key === 'otras' ? <a href={`#${id ? `${tablaId}-${id}` : tablaId}`} className="underline decoration-brand-300 underline-offset-2 hover:text-brand-500">{nombre}</a> : nombre}
          </span>
          <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-neutral-600">{formatearCantidad(valor)}<span className="ml-2 text-neutral-500">{formatearProporcion(valor / total)}</span></span>
        </li>)}
      </ul>
    </div>}
  </section>
}

type AccionRegistros = { verRegistros?: (especie: EspeciePlantada) => void; filtrosPendientes?: boolean }

export function TablaEspecies({ especies, tablaId, verRegistros, filtrosPendientes }: {
  especies: EspeciePlantada[]; tablaId: string
} & AccionRegistros) {
  const title = useId()
  return <section id={tablaId} className={panel} aria-labelledby={title}>
    <h2 id={title} className="font-display text-lg font-extrabold text-brand-900">Plantado por especie</h2>
    {especies.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No hay registros para los filtros aplicados.</p> : <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" role="region" aria-labelledby={title} tabIndex={0}>
      <table className="w-full min-w-[26rem] border-collapse text-sm">
        <thead className="bg-brand-50 text-brand-800">
          <tr>
            <th scope="col" className="px-3 py-3 text-left sm:px-4">Especie</th>
            <th scope="col" className="px-3 py-3 text-right">Iniciales</th>
            <th scope="col" className="px-3 py-3 text-right">Reposiciones</th>
            <th scope="col" className="px-3 py-3 text-right sm:px-4">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {especies.map(especie => <tr key={especie.planta_id ?? 'sin-desglose'} id={especie.planta_id ? `${tablaId}-${especie.planta_id}` : undefined} tabIndex={-1} className="scroll-mt-4 target:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400">
            <th scope="row" className="px-3 py-3 text-left font-semibold text-brand-900 sm:px-4">
              {nombreEspecie(especie)}
              {especie.nombre_comun && especie.nombre_cientifico && <span className="block text-xs font-normal italic text-neutral-600">{especie.nombre_cientifico}</span>}
              {verRegistros && especie.version_detalle && <Button variant="ghost" size="sm" className="mt-1 block min-h-11"
                disabled={filtrosPendientes} aria-haspopup="dialog" aria-label={`Ver registros de ${nombreEspecie(especie)}`}
                onClick={() => verRegistros(especie)}>Ver registros</Button>}
            </th>
            <td className="px-3 py-3 text-right tabular-nums text-neutral-700">{formatearCantidad(especie.iniciales)}</td>
            <td className="px-3 py-3 text-right tabular-nums text-neutral-700">{formatearCantidad(especie.reposiciones)}</td>
            <td className="px-3 py-3 text-right font-semibold tabular-nums text-brand-900 sm:px-4">{formatearCantidad(especie.total)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </section>
}

export default function ReportePlantacionesContenido({ reporte, verRegistros, filtrosPendientes }: { reporte: ReportePlantaciones } & AccionRegistros) {
  const especies = [...reporte.especies].sort((a, b) => b.total - a.total)
  const tablaId = 'especies-plantadas'
  return <>
    <IndicadoresPlantaciones totales={reporte.totales} />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr]">
      <PlantacionMensual meses={reporte.meses} />
      <MezclaEspecies especies={especies} total={reporte.totales.total} tablaId={tablaId} />
    </div>
    <TablaEspecies especies={especies} tablaId={tablaId} verRegistros={verRegistros} filtrosPendientes={filtrosPendientes} />
  </>
}
