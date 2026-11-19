import { useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import DialogoReporte from './DialogoReporte'
import { consultarRegistrosPlantados, ReporteConsultaError } from './reporte-plantaciones.api'
import type { EspeciePlantada, ReportePlantaciones } from './reporte-plantaciones.contract'
import type { DetallePlantaciones } from './reporte-plantaciones-registros.contract'
import { filtrosAplicados, formatearCantidad, formatearCorte, formatearFecha, nombreEspecie } from './reporte-plantaciones.presentacion'

type Props = {
  reporte: ReportePlantaciones
  especie: EspeciePlantada
  token: string
  actualizar: () => void
  cerrar: () => void
}

function FichaPlantacion({ registro }: { registro: DetallePlantaciones['detalle'][number] }) {
  return <li className="min-w-0 rounded-2xl border border-brand-100 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="break-words font-bold">{registro.subcampania}</h3>
        <p className="text-sm text-neutral-700"><time dateTime={registro.fecha}>{formatearFecha(registro.fecha)}</time> · {registro.es_reposicion ? 'Reposición' : 'Plantación inicial'}</p>
      </div>
      <p className="text-sm text-neutral-700">Aporte a la fila <strong className="text-brand-900">{formatearCantidad(registro.cantidad)}</strong></p>
    </div>
    <details className="mt-2">
      <summary className="min-h-11 cursor-pointer content-center break-words text-sm font-bold text-brand-700 underline underline-offset-2">
        Ver ficha {registro.codigo_trazabilidad}
      </summary>
      <p className="text-sm font-semibold">Total del registro · {formatearCantidad(registro.cantidad_total)} plantas</p>
      <dl className="mt-1 divide-y divide-neutral-100 text-sm text-neutral-700">
        {registro.especies.map(parte => <div className="flex justify-between gap-4 py-1" key={parte.planta_id ?? 'sin_desglose'}>
          <dt className="min-w-0 break-words">{parte.nombre}</dt><dd className="font-semibold tabular-nums">{formatearCantidad(parte.cantidad)}</dd>
        </div>)}
      </dl>
    </details>
  </li>
}

type PaginaProps = Omit<Props, 'cerrar'> & {
  pagina: number
  irAPagina: (pagina: number) => void
  reintentar: () => void
}

function PaginaRegistros({ reporte, especie, token, actualizar, pagina, irAPagina, reintentar }: PaginaProps) {
  const [resultado, setResultado] = useState<DetallePlantaciones | Error | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void consultarRegistrosPlantados(reporte.filtros, especie, pagina, token, controller.signal)
      .then(datos => { if (!controller.signal.aborted) setResultado(datos) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResultado(error instanceof Error ? error : new Error('No pudimos consultar los registros.'))
      })
    return () => controller.abort()
  }, [reporte.filtros, especie, pagina, token])

  if (!resultado) return <p role="status" className="text-sm">Consultando los registros de la página {pagina}…</p>
  if (resultado instanceof Error) {
    const cambio = resultado instanceof ReporteConsultaError && resultado.status === 409
    return <div className="space-y-2">
      <p role="alert" className="rounded-xl bg-warning-50 p-3 text-sm text-warning-800">{resultado.message}</p>
      <Button variant="secondary" size="sm" onClick={cambio ? actualizar : reintentar}>{cambio ? 'Actualizar reporte' : 'Reintentar consulta'}</Button>
    </div>
  }
  if (!resultado.registros) return <p role="status" className="text-sm">Sin registros para esta especie en el período.</p>
  return <>
    <p className="text-sm font-bold">{formatearCantidad(resultado.registros)} {resultado.registros === 1 ? 'registro' : 'registros'}</p>
    <ul className="space-y-2">{resultado.detalle.map(registro => <FichaPlantacion key={registro.registro_id} registro={registro} />)}</ul>
    {resultado.paginas > 1 && <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Páginas de registros de plantación">
      <Button size="sm" variant="secondary" disabled={pagina === 1} onClick={() => irAPagina(pagina - 1)}>Página anterior</Button>
      <span className="text-sm">Página {pagina} de {formatearCantidad(resultado.paginas)}</span>
      <Button size="sm" variant="secondary" disabled={pagina === resultado.paginas} onClick={() => irAPagina(pagina + 1)}>Página siguiente</Button>
    </nav>}
  </>
}

export default function RegistrosPlantadosPorEspecie({ reporte, especie, cerrar, token, actualizar }: Props) {
  const [pagina, irAPagina] = useState(1)
  const [intento, setIntento] = useState(0)
  const nombre = nombreEspecie(especie)
  return <DialogoReporte titulo={`Registros de ${nombre}`} onClose={cerrar}>
    <div className="space-y-1 text-sm text-neutral-700">
      <p className="text-lg font-extrabold text-brand-900">{formatearCantidad(especie.total)} plantas</p>
      <p>{filtrosAplicados(reporte).filter(filtro => filtro.etiqueta !== 'Especie').map(filtro => filtro.valor).join(' · ')}</p>
      <p>Corte del reporte · <time dateTime={reporte.observado_en}>{formatearCorte(reporte.observado_en)}</time> (Bolivia)</p>
    </div>
    <PaginaRegistros key={`${pagina}-${intento}`} reporte={reporte} especie={especie} token={token} actualizar={actualizar}
      pagina={pagina} irAPagina={irAPagina} reintentar={() => setIntento(actual => actual + 1)} />
  </DialogoReporte>
}
