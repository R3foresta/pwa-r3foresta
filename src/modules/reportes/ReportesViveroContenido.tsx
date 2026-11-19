import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { formatearCantidad, formatearCorte, formatearFecha, formatearMes } from './reporte-plantaciones.presentacion'
import type { ReporteMermas, ReporteVivero } from './reporte-vivero.contract'
import { nombreCausaMerma } from './reporte-vivero.presentacion'

const panel = 'min-w-0 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-6'
const cell = 'px-3 py-3 text-left sm:px-4'
const numberCell = 'whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-4'
const tableFrame = 'mt-4 overflow-x-auto rounded-2xl border border-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
function Indicadores({ etiqueta, valores }: { etiqueta: string; valores: { nombre: string; valor: number }[] }) {
  return <dl aria-label={etiqueta} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
    {valores.map(({ nombre, valor }) => <div key={nombre} className="min-w-0 rounded-2xl border border-brand-100 bg-brand-50 p-3 sm:min-w-40 sm:p-4">
      <dt className="text-sm font-semibold text-brand-800">{nombre}</dt>
      <dd className="mt-1 break-words font-display text-2xl font-extrabold tabular-nums text-brand-900">{formatearCantidad(valor)}</dd>
    </div>)}
  </dl>
}

export function IndicadoresVivero({ totales }: Pick<ReporteVivero, 'totales'>) {
  return <Indicadores etiqueta="Indicadores de vivero" valores={[
    { nombre: 'Plantas vivas', valor: totales.plantas },
    { nombre: 'Especies con saldo', valor: totales.especies },
    { nombre: 'Viveros con saldo', valor: totales.viveros },
  ]} />
}

export function IndicadoresMermas({ totales }: Pick<ReporteMermas, 'totales'>) {
  const incompleto = totales.eventos_sin_cantidad
  return <>
    <Indicadores etiqueta="Indicadores de mermas" valores={[
      { nombre: incompleto > 0 ? 'Plantas con cantidad registrada' : 'Plantas afectadas', valor: totales.plantas },
      { nombre: 'Eventos de merma', valor: totales.eventos },
    ]} />
    {incompleto > 0 && <p role="status" className="rounded-2xl border border-warning-100 bg-warning-50 p-3 text-sm text-warning-800">
      {formatearCantidad(incompleto)} {incompleto === 1 ? 'evento carece' : 'eventos carecen'} de una cantidad válida en plantas. El total suma las cantidades disponibles.
    </p>}
  </>
}

type Barra = { id: string; nombre: string; plantas: number; detalle?: string }

function Barras({ titulo, datos, color = 'bg-brand-600' }: { titulo: string; datos: Barra[]; color?: string }) {
  const maximo = datos.reduce((mayor, fila) => Math.max(mayor, fila.plantas), 0)

  return <div className="min-w-0 rounded-2xl border border-brand-100 p-4">
    <h3 className="font-display text-base font-extrabold text-brand-900">{titulo}</h3>
    <ul className="mt-3 space-y-3">
      {datos.map(({ id, nombre, plantas, detalle }) => <li key={id}>
        <div className="flex min-w-0 items-start justify-between gap-3 text-sm text-neutral-700">
          <span className="min-w-0 break-words font-semibold text-brand-900">{nombre}</span>
          <span className="shrink-0 whitespace-nowrap text-right tabular-nums">
            {formatearCantidad(plantas)} plantas
            {detalle && <span className="block text-xs text-neutral-600">{detalle}</span>}
          </span>
        </div>
        <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-brand-50">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${maximo ? 100 * plantas / maximo : 0}%` }} />
        </div>
      </li>)}
    </ul>
  </div>
}

type EstadoLectura<T> = { datos: T | null; error: string | null; cargando: boolean; reintentar: () => void; abrirPdf?: () => void }

function ErrorLectura({ error, reintentar, etiqueta }: { error: string; reintentar: () => void; etiqueta: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger-50 p-4">
    <p role="alert" className="text-sm font-semibold text-danger-700">{error}</p>
    <Button variant="secondary" leftIcon="refresh" onClick={reintentar}>{etiqueta}</Button>
  </div>
}

export function ReporteViveroPanel({ datos, error, cargando, reintentar, abrirPdf }: EstadoLectura<ReporteVivero>) {
  return <section id="reporte-vivero" tabIndex={-1} aria-labelledby="titulo-reporte-vivero" className={`${panel} scroll-mt-4 space-y-4`}>
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        <h2 id="titulo-reporte-vivero" className="font-display text-xl font-extrabold text-brand-900">Vivero al corte</h2>
        <p className="mt-1 text-sm text-neutral-700">Saldo actual de plantas vivas en vivero.</p>
        {datos && <p className="mt-1 text-sm text-neutral-600">Datos al <time dateTime={datos.observado_en}>{formatearCorte(datos.observado_en)}</time> (Bolivia)</p>}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {datos && <Button variant="secondary" size="sm" leftIcon="refresh" className="min-h-11" onClick={reintentar}>Actualizar saldo</Button>}
        <Button variant="secondary" size="sm" leftIcon="file" className="min-h-11" disabled={!abrirPdf} onClick={abrirPdf}>Generar PDF de vivero</Button>
      </div>
    </div>
    {cargando && <p role="status" className="text-sm text-neutral-600">Consultando saldo de vivero…</p>}
    {error && <ErrorLectura error={error} reintentar={reintentar} etiqueta="Reintentar consulta de vivero" />}
    {datos && <>
      <IndicadoresVivero totales={datos.totales} />
      {datos.filas.length === 0 ? <p className="text-sm text-neutral-700">No hay plantas vivas con los filtros aplicados.</p> : <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Barras titulo="Saldo por vivero" datos={datos.por_vivero.map(({ vivero_id, vivero, plantas }) => ({ id: vivero_id, nombre: vivero, plantas }))} />
        <div className="min-w-0 rounded-2xl border border-brand-100 p-4">
          <h3 id="inventario-por-especie" className="font-display text-base font-extrabold text-brand-900">Inventario por especie y vivero</h3>
          <div className={tableFrame} role="region" aria-labelledby="inventario-por-especie" tabIndex={0}>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-brand-50 text-brand-800"><tr>
                <th scope="col" className={cell}>Especie</th>
                <th scope="col" className={cell}>Vivero</th>
                <th scope="col" className={numberCell}>Plantas</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {datos.filas.map(({ planta_id, especie, vivero_id, vivero, plantas }) => <tr key={`${vivero_id}:${planta_id}`}>
                  <th scope="row" className={`${cell} break-words font-semibold text-brand-900`}>{especie}</th>
                  <td className={`${cell} break-words`}>{vivero}</td>
                  <td className={`${numberCell} font-semibold text-brand-900`}>{formatearCantidad(plantas)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>}
    </>}
  </section>
}

function DetalleMermas({ datos, cambiarPagina }: { datos: ReporteMermas; cambiarPagina: (pagina: number) => void }) {
  const pagina = datos.filtros.pagina
  const paginas = Math.ceil(datos.totales.eventos / datos.tamano_pagina)

  return <div className="min-w-0 rounded-2xl border border-brand-100 p-4">
    <h3 id="historial-mermas" className="font-display text-base font-extrabold text-brand-900">Historial de eventos de merma</h3>
    <div className={tableFrame} role="region" aria-labelledby="historial-mermas" tabIndex={0}>
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <thead className="bg-brand-50 text-brand-800"><tr>
          <th scope="col" className={cell}>Fecha</th>
          <th scope="col" className={cell}>Lote</th>
          <th scope="col" className={cell}>Especie</th>
          <th scope="col" className={cell}>Vivero</th>
          <th scope="col" className={cell}>Causa</th>
          <th scope="col" className={numberCell}>Plantas</th>
        </tr></thead>
        <tbody className="divide-y divide-neutral-100 text-neutral-700">
          {datos.detalle.map(({ id, fecha, lote_id, codigo_lote, especie, vivero, causa, cantidad }) => <tr key={id}>
            <td className={`${cell} whitespace-nowrap`}><time dateTime={fecha}>{formatearFecha(fecha)}</time></td>
            <th scope="row" className={`${cell} break-words font-semibold text-brand-900`}>
              <Link className="underline decoration-brand-300 underline-offset-2 hover:text-brand-500 focus-visible:outline-brand-500" to={`/app/vivero/${lote_id}?tab=historial`}>{codigo_lote}</Link>
            </th>
            <td className={cell}>{especie}</td>
            <td className={cell}>{vivero}</td>
            <td className={cell}>{nombreCausaMerma(causa)}</td>
            <td className={`${numberCell} font-semibold text-brand-900`}>{cantidad === null ? 'Sin cantidad válida' : formatearCantidad(cantidad)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {paginas > 1 && <nav aria-label="Páginas del historial de mermas" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" size="sm" className="min-h-11" disabled={pagina === 1} onClick={() => cambiarPagina(pagina - 1)}>Página anterior</Button>
      <span className="text-sm font-semibold text-neutral-700">Página {formatearCantidad(pagina)} de {formatearCantidad(paginas)}</span>
      <Button variant="secondary" size="sm" className="min-h-11" disabled={pagina >= paginas} onClick={() => cambiarPagina(pagina + 1)}>Página siguiente</Button>
    </nav>}
  </div>
}

export function ReporteMermasPanel({ datos, error, cargando, reintentar, cambiarPagina, abrirPdf }: EstadoLectura<ReporteMermas> & { cambiarPagina: (pagina: number) => void }) {
  return <section id="reporte-mermas" tabIndex={-1} aria-labelledby="titulo-reporte-mermas" className={`${panel} scroll-mt-4 space-y-4`}>
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        <h2 id="titulo-reporte-mermas" className="font-display text-xl font-extrabold text-brand-900">Mermas en vivero</h2>
        <p className="mt-1 text-sm text-neutral-700">Pérdidas registradas en lotes de vivero durante el período.</p>
        {datos && <p className="mt-1 text-sm text-neutral-600"><time dateTime={datos.filtros.desde}>{formatearFecha(datos.filtros.desde)}</time> a <time dateTime={datos.filtros.hasta}>{formatearFecha(datos.filtros.hasta)}</time></p>}
      </div>
      <Button variant="secondary" size="sm" leftIcon="file" className="min-h-11 self-start" disabled={!abrirPdf} onClick={abrirPdf}>Generar PDF de mermas</Button>
    </div>
    {cargando && <p role="status" className="text-sm text-neutral-600">Consultando mermas de vivero…</p>}
    {error && <ErrorLectura error={error} reintentar={reintentar} etiqueta="Reintentar consulta de mermas" />}
    {datos && <>
      <IndicadoresMermas totales={datos.totales} />
      {datos.totales.eventos === 0 ? <p className="text-sm text-neutral-700">No hay mermas registradas con los filtros aplicados.</p> : <>
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Mermas por causa" color="bg-[#a16a35]" datos={datos.por_causa.map(({ causa, plantas, eventos }) => ({
            id: causa ?? 'sin-causa', nombre: nombreCausaMerma(causa), plantas, detalle: `${formatearCantidad(eventos)} ${eventos === 1 ? 'evento' : 'eventos'}`,
          }))} />
          {datos.meses.length > 1 && <Barras titulo="Mermas por mes" color="bg-[#a16a35]" datos={datos.meses.map(({ mes, plantas }) => ({ id: mes, nombre: formatearMes(mes), plantas }))} />}
        </div>
        <DetalleMermas datos={datos} cambiarPagina={cambiarPagina} />
      </>}
    </>}
  </section>
}
