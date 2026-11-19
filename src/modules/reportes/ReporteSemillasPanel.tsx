import { Button } from '../../components/ui'
import { formatearCantidad, formatearCorte, formatearFecha } from './reporte-plantaciones.presentacion'
import type { ReporteMovimientosSemillas, ReporteSaldoSemillas, UnidadSemilla } from './reporte-semillas.contract'
import { escalaMovimientosSemilla, formatearCantidadSemilla } from './reporte-semillas.presentacion'

const unidades = [
  { codigo: 'G', nombre: 'Gramos', sufijo: 'g' },
  { codigo: 'UNIDAD', nombre: 'Unidades', sufijo: 'u.' },
] as const
const tiposMovimiento = {
  RECEPCION_CONFORME: 'Recepción conforme',
  CONSUMO_A_VIVERO: 'Consumo hacia vivero',
  DESECHO: 'Descarte',
}
const categorias = [
  { clave: 'recibido', nombre: 'Recibidas' },
  { clave: 'consumido', nombre: 'Consumidas' },
  { clave: 'descartado', nombre: 'Descartadas' },
] as const
const panel = 'min-w-0 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-6'
const tableFrame = 'overflow-x-auto rounded-2xl border border-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
const tableHeader = 'bg-brand-50 text-brand-800'
const cell = 'px-3 py-3 text-left sm:px-4'
const numberCell = 'whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-4'

type Lectura<T> = { datos: T | null; cargando: boolean; error: string | null; reintentar: () => void }
type Props = {
  saldo: Lectura<ReporteSaldoSemillas>
  movimientos: Lectura<ReporteMovimientosSemillas>
  cambiarPagina: (pagina: number) => void
}

function cantidadConUnidad(cantidad: string, unidad: UnidadSemilla): string {
  return `${formatearCantidadSemilla(cantidad)} ${unidad === 'G' ? 'g' : 'u.'}`
}

function ErrorSemillas({ error, reintentar, etiqueta }: { error: string; reintentar: () => void; etiqueta: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger-50 p-4">
    <p role="alert" className="text-sm font-semibold text-danger-700">{error}</p>
    <Button variant="secondary" leftIcon="refresh" onClick={reintentar}>{etiqueta}</Button>
  </div>
}

function CorteSemillas({ observado }: { observado: string }) {
  return <p className="text-sm text-neutral-600">Datos al <time dateTime={observado}>{formatearCorte(observado)}</time> (Bolivia)</p>
}

function SaldoSemillas({ datos, cargando, error, reintentar }: Lectura<ReporteSaldoSemillas>) {
  return <section aria-labelledby="titulo-saldo-semillas" className={`${panel} space-y-4`}>
    <div className="flex flex-wrap justify-between gap-3">
      <div className="space-y-1">
        <h3 id="titulo-saldo-semillas" className="font-display text-xl font-extrabold text-brand-900">Saldo actual de semillas</h3>
        <p className="text-sm text-neutral-700">Semillas con recepción conforme y saldo disponible.</p>
        {datos && <CorteSemillas observado={datos.observado_en} />}
      </div>
      {datos && <Button variant="secondary" size="sm" leftIcon="refresh" className="min-h-11 self-start" onClick={reintentar}>Actualizar saldo de semillas</Button>}
    </div>
    {cargando && <p role="status" className="text-sm text-neutral-600">Consultando el saldo de semillas…</p>}
    {error && <ErrorSemillas error={error} reintentar={reintentar} etiqueta="Reintentar saldo de semillas" />}
    {datos && <>
      <dl aria-label="Saldo de semillas por unidad" className="grid grid-cols-2 gap-3">
        {unidades.map(({ codigo, nombre, sufijo }) => <div key={codigo} className="min-w-0 rounded-2xl border border-brand-100 bg-brand-50 p-3 sm:p-4">
          <dt className="text-sm font-semibold text-brand-800">{nombre} disponibles</dt>
          <dd className="mt-1 break-words font-display text-xl font-extrabold tabular-nums text-brand-900 sm:text-2xl">
            {formatearCantidadSemilla(datos.totales[codigo])} <span className="text-sm">{sufijo}</span>
          </dd>
        </div>)}
      </dl>
      {datos.filas.length === 0 ? <p className="text-sm text-neutral-700">No hay semillas con saldo disponible para los filtros aplicados.</p>
        : <div className={tableFrame} role="region" aria-label="Saldo por especie y vivero de custodia" tabIndex={0}>
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <thead className={tableHeader}><tr>
              <th scope="col" className={cell}>Especie</th>
              <th scope="col" className={cell}>Vivero de custodia</th>
              <th scope="col" className={numberCell}>Saldo</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {datos.filas.map(({ planta_id, especie, vivero_id, vivero, unidad, saldo }) => <tr key={`${planta_id}:${vivero_id}:${unidad}`}>
                <th scope="row" className={`${cell} break-words font-semibold text-brand-900`}>{especie}</th>
                <td className={`${cell} break-words`}>{vivero}</td>
                <td className={`${numberCell} font-semibold text-brand-900`}>{cantidadConUnidad(saldo, unidad)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </>}
  </section>
}

function TablaMovimientos({ datos, cambiarPagina }: { datos: ReporteMovimientosSemillas; cambiarPagina: Props['cambiarPagina'] }) {
  const { pagina } = datos.filtros
  const paginas = Math.ceil(datos.totales.eventos / datos.tamano_pagina)
  return <>
    <p className="text-xs text-neutral-600 sm:hidden">Desliza la tabla para ver los viveros y las cantidades.</p>
    <div className={tableFrame} role="region" aria-label="Detalle de movimientos de semillas" tabIndex={0}>
      <table className="w-full min-w-[48rem] border-collapse text-sm">
        <thead className={tableHeader}><tr>
          <th scope="col" className={cell}>Fecha</th>
          <th scope="col" className={cell}>Movimiento</th>
          <th scope="col" className={cell}>Recolección</th>
          <th scope="col" className={cell}>Especie</th>
          <th scope="col" className={cell}>Vivero de custodia</th>
          <th scope="col" className={cell}>Vivero de destino</th>
          <th scope="col" className={numberCell}>Cantidad</th>
        </tr></thead>
        <tbody className="divide-y divide-neutral-100 text-neutral-700">
          {datos.detalle.map(({ id, tipo, fecha, recoleccion_id, codigo_recoleccion, especie, vivero, vivero_destino, unidad, cantidad }) => <tr key={`${tipo}:${id}`}>
            <td className={`${cell} whitespace-nowrap`}><time dateTime={fecha}>{formatearFecha(fecha)}</time></td>
            <th scope="row" className={`${cell} font-semibold text-brand-900`}>{tiposMovimiento[tipo]}</th>
            <td className={`${cell} break-words`}>{codigo_recoleccion ?? `ID ${recoleccion_id}`}</td>
            <td className={`${cell} break-words`}>{especie}</td>
            <td className={`${cell} break-words`}>{vivero ?? 'Sin dato'}</td>
            <td className={`${cell} break-words`}>{vivero_destino ?? (tipo === 'CONSUMO_A_VIVERO' ? 'Sin dato' : '—')}</td>
            <td className={`${numberCell} font-semibold text-brand-900`}>{cantidad !== null && unidad ? cantidadConUnidad(cantidad, unidad) : 'Cantidad no disponible'}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {paginas > 1 && <nav aria-label="Páginas del historial de semillas" className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" size="sm" className="min-h-11" disabled={pagina === 1} onClick={() => cambiarPagina(pagina - 1)}>Página anterior</Button>
      <span className="text-sm font-semibold text-neutral-700">Página {formatearCantidad(pagina)} de {formatearCantidad(paginas)}</span>
      <Button variant="secondary" size="sm" className="min-h-11" disabled={pagina >= paginas} onClick={() => cambiarPagina(pagina + 1)}>Página siguiente</Button>
    </nav>}
  </>
}

function MovimientosSemillas({ datos, cargando, error, reintentar, cambiarPagina }: Lectura<ReporteMovimientosSemillas> & Pick<Props, 'cambiarPagina'>) {
  return <section aria-labelledby="titulo-movimientos-semillas" className={`${panel} space-y-4`}>
    <div className="space-y-1">
      <h3 id="titulo-movimientos-semillas" className="font-display text-xl font-extrabold text-brand-900">Movimientos de semillas</h3>
      <p className="text-sm text-neutral-700">Las recepciones usan la fecha de entrega. Los consumos y descartes usan la fecha de registro.</p>
      {datos && <>
        <p className="text-sm text-neutral-600"><time dateTime={datos.filtros.desde}>{formatearFecha(datos.filtros.desde)}</time> a <time dateTime={datos.filtros.hasta}>{formatearFecha(datos.filtros.hasta)}</time></p>
        <CorteSemillas observado={datos.observado_en} />
      </>}
    </div>
    {cargando && <p role="status" className="text-sm text-neutral-600">Consultando movimientos de semillas…</p>}
    {error && <ErrorSemillas error={error} reintentar={reintentar} etiqueta="Reintentar movimientos de semillas" />}
    {datos && <>
      <div className="grid gap-3 md:grid-cols-2">
        {unidades.map(({ codigo, nombre }) => {
          const resumen = datos.totales[codigo]
          const proporciones = escalaMovimientosSemilla(categorias.map(({ clave }) => resumen[clave]))
          return <div key={codigo} className="min-w-0 rounded-2xl border border-brand-100 bg-brand-50 p-3 sm:p-4">
            <h4 className="font-semibold text-brand-900">{nombre}</h4>
            <dl aria-label={`${nombre} por movimiento`} className="mt-2 grid grid-cols-3 gap-2 text-neutral-700">
              {categorias.map(({ clave, nombre }, indice) => <div key={clave} className="min-w-0">
                <dt className="text-sm">{nombre}</dt>
                <dd className="mt-1 break-words text-base font-bold tabular-nums text-brand-900">
                  {formatearCantidadSemilla(resumen[clave])}
                  <div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-brand-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${proporciones[indice]}%` }} />
                  </div>
                </dd>
              </div>)}
            </dl>
          </div>
        })}
      </div>
      {datos.totales.eventos_sin_cantidad > 0 && <p role="status" className="rounded-2xl border border-warning-100 bg-warning-50 p-3 text-sm text-warning-800">
        Movimientos sin cantidad verificable · {formatearCantidad(datos.totales.eventos_sin_cantidad)}. Los totales suman las cantidades disponibles.
      </p>}
      {datos.totales.eventos > 0 ? <TablaMovimientos datos={datos} cambiarPagina={cambiarPagina} />
        : <p className="text-sm text-neutral-700">No hay movimientos de semillas para los filtros aplicados.</p>}
    </>}
  </section>
}

export default function ReporteSemillasPanel({ saldo, movimientos, cambiarPagina }: Props) {
  return <section id="reporte-semillas" tabIndex={-1} aria-labelledby="titulo-reporte-semillas" className="min-w-0 scroll-mt-4 space-y-4">
    <h2 id="titulo-reporte-semillas" className="font-display text-xl font-extrabold text-brand-900">Semillas</h2>
    <SaldoSemillas {...saldo} />
    <MovimientosSemillas {...movimientos} cambiarPagina={cambiarPagina} />
  </section>
}
