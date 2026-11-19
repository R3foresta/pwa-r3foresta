import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Button } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { WebAuthnService } from '../../services/webauthn.service'
import { ParticipacionApiError } from '../participacion/api/participacion.transport'
import FiltrosImpactoReportes, { type FiltrosTablero } from './FiltrosImpactoReportes'
import ReportePlantacionesContenido from './ReportePlantacionesContenido'
import RegistrosPlantadosPorEspecie from './RegistrosPlantadosPorEspecie'
import ReporteSemillasPanel from './ReporteSemillasPanel'
import { ReporteMermasPanel, ReporteViveroPanel } from './ReportesViveroContenido'
import VistaPreviaPlantaciones from './VistaPreviaPlantaciones'
import VistaPreviaSemillas from './VistaPreviaSemillas'
import { VistaPreviaInventario, VistaPreviaMermas } from './VistaPreviaVivero'
import { consultarPlantaciones, ReporteConsultaError } from './reporte-plantaciones.api'
import { mismosFiltros, type EspeciePlantada, type FiltrosReportePlantaciones, type OpcionReporte, type ReportePlantaciones } from './reporte-plantaciones.contract'
import { filtrosAplicados, formatearCorte, periodoInicial } from './reporte-plantaciones.presentacion'
import { consultarMovimientosSemillas, consultarSaldoSemillas } from './reporte-semillas.api'
import type { ReporteMovimientosSemillas, ReporteSaldoSemillas } from './reporte-semillas.contract'
import { consultarMermas, consultarVivero } from './reporte-vivero.api'
import type { FiltrosVivero, ReporteMermas, ReporteVivero } from './reporte-vivero.contract'
import { useLecturaVivero } from './useLecturaVivero'

type Consulta = { filtros: FiltrosReportePlantaciones }
type Resultado = { token: string; consulta: Consulta; reporte: ReportePlantaciones | null; error: string | null }
type VistaPrevia = { token: string } & (
  | { tipo: 'plantaciones'; reporte: ReportePlantaciones }
  | { tipo: 'vivero'; reporte: ReporteVivero }
  | { tipo: 'mermas'; reporte: ReporteMermas }
  | { tipo: 'semillas'; saldo: ReporteSaldoSemillas; movimientos: ReporteMovimientosSemillas }
)

const secciones = [
  { id: 'reporte-plantaciones', nombre: 'Plantaciones' },
  { id: 'reporte-vivero', nombre: 'Vivero' },
  { id: 'reporte-mermas', nombre: 'Mermas' },
  { id: 'reporte-semillas', nombre: 'Semillas' },
] as const

const collator = new Intl.Collator('es-BO')

function unirOpciones(...catalogos: (OpcionReporte[] | undefined)[]): OpcionReporte[] {
  const opciones = new Map<string, OpcionReporte>()
  for (const catalogo of catalogos) {
    for (const opcion of catalogo ?? []) {
      if (!opciones.has(opcion.id)) opciones.set(opcion.id, opcion)
    }
  }
  return [...opciones.values()].sort((a, b) => collator.compare(a.nombre, b.nombre))
}

function VolverInicio() {
  return <Link to="/app/home" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
    <Icon name="arrow-left" className="h-4 w-4" /> Inicio
  </Link>
}

export default function ImpactoReportesScreen() {
  const { user } = useAuth()
  const token = WebAuthnService.getToken()?.trim()
  if (user?.rol !== 'ADMIN' || !token) return <main className="mx-auto max-w-lg space-y-3 px-4 pb-10 pt-6">
    <VolverInicio />
    <section className="rounded-3xl border border-brand-100 bg-white p-6">
      <h1 className="font-display text-2xl font-extrabold text-brand-900">Impacto y reportes</h1>
      <p className="mt-2 text-sm text-neutral-700">Esta sección requiere una cuenta de administración de R3foresta.</p>
    </section>
  </main>
  return <TableroReportes key={user.id} token={token} />
}

function TableroReportes({ token }: { token: string }) {
  const [consulta, setConsulta] = useState<Consulta>(() => ({ filtros: periodoInicial() }))
  const [filtros, setFiltros] = useState<FiltrosTablero>(() => ({ ...consulta.filtros, vivero_id: null }))
  const [filtrosVivero, setFiltrosVivero] = useState<FiltrosVivero>({ planta_id: null, vivero_id: null })
  const [pagina, setPagina] = useState(1)
  const [paginaSemillas, setPaginaSemillas] = useState(1)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [catalogo, setCatalogo] = useState<{ token: string; opciones: ReportePlantaciones['opciones'] } | null>(null)
  const [seleccionPdf, setSeleccionPdf] = useState<VistaPrevia | null>(null)
  const [detalleEspecie, setDetalleEspecie] = useState<EspeciePlantada | null>(null)
  const [errorFechas, setErrorFechas] = useState<string | null>(null)

  if (seleccionPdf && seleccionPdf.token !== token) setSeleccionPdf(null)

  const { desde, hasta } = consulta.filtros
  const filtrosMermas = useMemo(() => ({ desde, hasta, ...filtrosVivero, pagina }), [desde, hasta, filtrosVivero, pagina])
  const filtrosMovimientos = useMemo(() => ({ desde, hasta, ...filtrosVivero, pagina: paginaSemillas }), [desde, hasta, filtrosVivero, paginaSemillas])
  const vivero = useLecturaVivero(consultarVivero, filtrosVivero, token)
  const mermas = useLecturaVivero(consultarMermas, filtrosMermas, token)
  const saldoSemillas = useLecturaVivero(consultarSaldoSemillas, filtrosVivero, token)
  const movimientosSemillas = useLecturaVivero(consultarMovimientosSemillas, filtrosMovimientos, token)
  const lectura = resultado?.token === token && resultado.consulta === consulta ? resultado : null
  const opciones = catalogo?.token === token ? catalogo.opciones : null
  const especies = unirOpciones(opciones?.especies, vivero.opciones?.especies, mermas.opciones?.especies, saldoSemillas.opciones?.especies, movimientosSemillas.opciones?.especies)
  const viveros = unirOpciones(vivero.opciones?.viveros, mermas.opciones?.viveros, saldoSemillas.opciones?.viveros, movimientosSemillas.opciones?.viveros)
  const lecturaPlantaciones = lectura?.reporte
  const nombreEspecie = especies.find(opcion => opcion.id === lecturaPlantaciones?.filtros.planta_id)?.nombre
  const reporte = useMemo(() => {
    const especieId = lecturaPlantaciones?.filtros.planta_id
    if (!lecturaPlantaciones || !especieId || !nombreEspecie || lecturaPlantaciones.opciones.especies.some(opcion => opcion.id === especieId)) return lecturaPlantaciones
    return {
      ...lecturaPlantaciones,
      opciones: { ...lecturaPlantaciones.opciones, especies: [...lecturaPlantaciones.opciones.especies, { id: especieId, nombre: nombreEspecie }] },
    }
  }, [lecturaPlantaciones, nombreEspecie])
  const cargando = !lectura
  const plantacionesPendientes = !mismosFiltros(consulta.filtros, filtros)
  const cambioVivero = filtros.vivero_id !== filtrosVivero.vivero_id
  const inventarioActual = vivero.datos
  const mermasActuales = mermas.datos
  const saldoSemillasActual = saldoSemillas.datos
  const movimientosSemillasActuales = movimientosSemillas.datos
  const viveroPendiente = cambioVivero || filtros.planta_id !== filtrosVivero.planta_id
  const movimientosPendientes = viveroPendiente || filtros.desde !== desde || filtros.hasta !== hasta
  const vistaPrevia = seleccionPdf?.token === token ? seleccionPdf : null

  useEffect(() => {
    const controller = new AbortController()
    void consultarPlantaciones(consulta.filtros, token, controller.signal).then((reporte) => {
      if (controller.signal.aborted) return
      setCatalogo({ token, opciones: reporte.opciones })
      setResultado({ token, consulta, reporte, error: null })
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      const error = cause instanceof ParticipacionApiError ? new ReporteConsultaError(cause.status) : cause
      if (error instanceof ReporteConsultaError && (error.status === 401 || error.status === 403)) setCatalogo(null)
      setResultado({ token, consulta, reporte: null, error: error instanceof Error ? error.message : 'No pudimos consultar las plantaciones. Intenta de nuevo.' })
    })
    return () => controller.abort()
  }, [consulta, token])

  function actualizar(patch: Partial<FiltrosTablero>) {
    setSeleccionPdf(null)
    setDetalleEspecie(null)
    setFiltros(anteriores => ({ ...anteriores, ...patch }))
    if (patch.desde !== undefined || patch.hasta !== undefined) setErrorFechas(null)
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!filtros.desde || !filtros.hasta || filtros.desde > filtros.hasta) {
      setErrorFechas('Elige un período con la fecha Desde igual o anterior a Hasta.')
      return
    }
    setErrorFechas(null)
    const { vivero_id, ...plantaciones } = filtros
    if (plantacionesPendientes || !cambioVivero) setConsulta({ filtros: plantaciones })
    if (viveroPendiente) setFiltrosVivero({ vivero_id, planta_id: filtros.planta_id })
    if (movimientosPendientes) {
      setPagina(1)
      setPaginaSemillas(1)
    }
  }

  const cerrarVistaPrevia = () => setSeleccionPdf(null)

  return <main className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:space-y-5 lg:px-8 lg:pt-6">
    <VolverInicio />
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-200 pb-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">Impacto y reportes</h1>
      </div>
      <Button leftIcon="file" className="min-h-11" disabled={!reporte || plantacionesPendientes} onClick={() => reporte && setSeleccionPdf({ tipo: 'plantaciones', reporte, token })}>Generar PDF</Button>
    </header>
    <nav aria-label="Secciones de reportes" className="flex flex-wrap gap-2">
      {secciones.map(({ id, nombre }) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">{nombre}</a>)}
    </nav>

    <FiltrosImpactoReportes
      filtros={filtros}
      opciones={{ organizaciones: opciones?.organizaciones ?? [], campanias: opciones?.campanias ?? [], especies, viveros }}
      errorFechas={errorFechas}
      pendientes={plantacionesPendientes || cambioVivero}
      cargando={cargando}
      actualizar={actualizar}
      enviar={enviar}
    />

    <section id="reporte-plantaciones" tabIndex={-1} aria-labelledby="titulo-reporte-plantaciones" className="scroll-mt-4 space-y-4">
      <h2 id="titulo-reporte-plantaciones" className="font-display text-xl font-extrabold text-brand-900">Plantaciones</h2>
      {cargando && <div role="status" className="rounded-3xl border border-brand-100 bg-white p-6 text-sm font-semibold text-brand-700">Consultando plantaciones…</div>}
      {lectura?.error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-danger-200 bg-white p-4 sm:p-6">
        <p role="alert" className="text-sm font-semibold text-danger-700">{lectura.error}</p>
        <Button variant="secondary" leftIcon="refresh" onClick={() => setConsulta({ filtros: consulta.filtros })}>Reintentar</Button>
      </div>}
      {reporte && <>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 px-1 text-sm text-neutral-700">
          <p className="font-medium">{filtrosAplicados(reporte).map(({ etiqueta, valor }) => etiqueta === 'Período' ? valor : `${etiqueta} ${valor}`).join(' · ')}</p>
          <p className="text-neutral-600">Datos al <time dateTime={reporte.observado_en}>{formatearCorte(reporte.observado_en)}</time> (Bolivia)</p>
        </div>
        {reporte.filtros.organizacion_id && <p className="rounded-xl bg-brand-100 px-4 py-2 text-sm text-brand-800">Plantaciones asociadas. Las campañas compartidas pueden figurar en los reportes de otras empresas.</p>}
        <ReportePlantacionesContenido reporte={reporte} verRegistros={setDetalleEspecie} filtrosPendientes={plantacionesPendientes} />
        {detalleEspecie && reporte.especies.includes(detalleEspecie) && !plantacionesPendientes &&
          <RegistrosPlantadosPorEspecie reporte={reporte} especie={detalleEspecie} token={token} cerrar={() => setDetalleEspecie(null)}
            actualizar={() => {
              setDetalleEspecie(null)
              setConsulta({ filtros: reporte.filtros })
            }} />}
      </>}
    </section>
    <ReporteViveroPanel {...vivero} abrirPdf={inventarioActual && !viveroPendiente ? () => setSeleccionPdf({ tipo: 'vivero', reporte: inventarioActual, token }) : undefined} />
    <ReporteMermasPanel {...mermas} cambiarPagina={setPagina} abrirPdf={mermasActuales && !movimientosPendientes ? () => setSeleccionPdf({ tipo: 'mermas', reporte: mermasActuales, token }) : undefined} />
    <ReporteSemillasPanel
      saldo={saldoSemillas}
      movimientos={movimientosSemillas}
      cambiarPagina={setPaginaSemillas}
      abrirPdf={saldoSemillasActual && movimientosSemillasActuales && !movimientosPendientes
        ? () => setSeleccionPdf({ tipo: 'semillas', saldo: saldoSemillasActual, movimientos: movimientosSemillasActuales, token })
        : undefined}
    />
    {vistaPrevia?.tipo === 'plantaciones' && vistaPrevia.reporte === reporte && !plantacionesPendientes && <VistaPreviaPlantaciones reporte={vistaPrevia.reporte} token={token} onClose={cerrarVistaPrevia} />}
    {vistaPrevia?.tipo === 'vivero' && vistaPrevia.reporte === inventarioActual && !viveroPendiente && <VistaPreviaInventario reporte={vistaPrevia.reporte} token={token} onClose={cerrarVistaPrevia} />}
    {vistaPrevia?.tipo === 'mermas' && vistaPrevia.reporte === mermasActuales && !movimientosPendientes && <VistaPreviaMermas origen={vistaPrevia.reporte} token={token} onClose={cerrarVistaPrevia} />}
    {vistaPrevia?.tipo === 'semillas' && vistaPrevia.saldo === saldoSemillasActual && vistaPrevia.movimientos === movimientosSemillasActuales && !movimientosPendientes &&
      <VistaPreviaSemillas saldo={vistaPrevia.saldo} filtros={vistaPrevia.movimientos.filtros} token={token} onClose={cerrarVistaPrevia} />}
  </main>
}
