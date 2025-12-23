import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import PlaceholderScreen from '../PlaceholderScreen'
import GerminationLotCard, { type GerminationLotCardData } from './GerminationLotCard'
import { germinationLotsById } from './data'
import type { GerminationPhase } from './data'

const phases: { key: GerminationPhase; label: string }[] = [
  { key: 'INICIO', label: 'Inicio' },
  { key: 'EMBOLSADO', label: 'Embolsado' },
  { key: 'SOMBRA', label: 'Sombra' },
  { key: 'LISTA_PLANTAR', label: 'Lista para plantar' },
  { key: 'SALIDA_VIVERO', label: 'Salida vivero' },
]

const phaseOrder: Record<GerminationPhase, number> = {
  INICIO: 0,
  EMBOLSADO: 1,
  SOMBRA: 2,
  LISTA_PLANTAR: 3,
  SALIDA_VIVERO: 4,
}

function daysBetween(start?: string, end: Date = new Date()) {
  if (!start) return 0
  const startDate = new Date(start)
  return Math.max(0, Math.round((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function GerminationDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const lot = id ? germinationLotsById[id] : undefined

  const derived = useMemo(() => {
    if (!lot) return null

    const lastEvent = [...lot.eventos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )[0]

    const currentPhaseEvent = [...lot.eventos]
      .filter((evt) => evt.fase === lot.estado)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]

    const currentPhoto = currentPhaseEvent?.fotoUrl ?? lastEvent?.fotoUrl

    return {
      diasTotales: daysBetween(lot.fechas.INICIO),
      diasFaseActual: currentPhaseEvent ? daysBetween(currentPhaseEvent.fecha) : 0,
      currentPhoto,
    }
  }, [lot])

  if (!lot || !derived) {
    return <PlaceholderScreen title="Lote de germinación no encontrado" />
  }

  const currentPhaseIndex = phaseOrder[lot.estado]
  const explorerUrl = lot.blockchainHash
    ? `https://etherscan.io/tx/${lot.blockchainHash}`
    : undefined
  const summaryLot: GerminationLotCardData = {
    id: lot.id,
    codigo: lot.codigo,
    especie: lot.planta.especie,
    fuente: lot.planta.fuente,
    estado: lot.estado,
    fechaInicio: lot.fechas.INICIO,
    diasDesdeInicio: derived.diasTotales,
    cantidadInicial: lot.cantidadInicio,
    germinadas: lot.germinadas,
    muertas: lot.muertas,
    vivero: lot.vivero.nombre,
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <header className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Lote {lot.codigo}
            </p>
            <h1 className="text-2xl font-extrabold leading-tight text-brand-700">
              {lot.planta.especie}
            </h1>
            <p className="text-sm font-semibold text-brand-500">Seguimiento y eventos</p>
          </div>
        </header>

        <div className="mt-6 space-y-5 px-5">
          <GerminationLotCard lot={summaryLot} />

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-semibold text-brand-700">Estado del lote</span>
            </div>

            <div className="mt-4 grid grid-cols-[1.1fr,0.9fr] gap-4">
              <div className="relative">
                <div className="space-y-4">
                  {phases.map((phase, index) => {
                    const isCompleted = index <= currentPhaseIndex
                    const isCurrent = index === currentPhaseIndex
                    return (
                      <div key={phase.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white ${
                              isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Icon name="check" className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div>
                          <p
                            className={`text-base font-extrabold ${
                              isCompleted ? 'text-brand-700' : 'text-brand-400'
                            }`}
                          >
                            {phase.label}
                          </p>
                          <p className="text-xs font-semibold text-brand-500">
                            {lot.fechas[phase.key] ? formatDate(lot.fechas[phase.key]) : '--'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {derived.currentPhoto ? (
                  <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
                    <img
                      src={derived.currentPhoto}
                      alt="Último registro del lote"
                      className="h-36 w-full object-cover"
                    />
                    <div className="flex items-center gap-2 bg-white px-3 py-2 text-xs font-semibold text-brand-600">
                      <Icon name="photo" className="h-4 w-4 text-brand-600" />
                      <span>Última foto del estado actual</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-500 ring-1 ring-dashed ring-brand-200">
                    Sin foto aún
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/germination/${lot.id}/event/new`)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-brand-200 transition hover:ring-brand-300 active:scale-[0.99]"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Registrar evento
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/germination/${lot.id}/update`)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-brand-200 transition hover:ring-brand-300 active:scale-[0.99]"
                  >
                    <Icon name="photo" className="h-4 w-4" />
                    Subir imagen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-2">
            <div className="flex items-center gap-2">
              <Icon name="info" className="h-5 w-5 text-brand-600" />
              <p className="text-sm font-semibold text-brand-700">Datos de la planta</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Especie</p>
                <p className="text-brand-700">{lot.planta.especie}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Nombre científico</p>
                <p className="text-brand-700">{lot.planta.nombreCientifico}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Tipo de planta</p>
                <p className="text-brand-700">{lot.planta.tipoPlanta}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Variedad</p>
                <p className="text-brand-700">{lot.planta.variedad ?? 'N/D'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <p className="text-sm font-semibold text-brand-700">Acciones del lote</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate(`/app/germination/${lot.id}/update`)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-brand-200 transition hover:ring-brand-300 active:scale-[0.99]"
              >
                <Icon name="balance" className="h-4 w-4" />
                Cambiar fase
              </button>
              <button
                type="button"
                onClick={() => explorerUrl && window.open(explorerUrl, '_blank')}
                disabled={!explorerUrl}
                className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-3 py-3 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-emerald-200 transition hover:bg-emerald-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
              >
                <Icon name="qr" className="h-4 w-4 text-brand-700" />
                Hash en Blockchains
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="pin" className="h-5 w-5 text-brand-600" />
              <p className="text-sm font-semibold text-brand-700">Información general</p>
            </div>
            <div className="space-y-2 text-sm font-semibold text-brand-600">
              <p>
                <span className="text-brand-500">Comunidad: </span>
                {lot.vivero.ubicacion.comunidad} ({lot.vivero.ubicacion.zona})
              </p>
              <p>
                <span className="text-brand-500">Ubicación: </span>
                {lot.vivero.ubicacion.provincia}, {lot.vivero.ubicacion.departamento},{' '}
                {lot.vivero.ubicacion.pais}
              </p>
              <p>
                <span className="text-brand-500">Coordenadas: </span>
                {lot.vivero.ubicacion.latitud.toFixed(4)}, {lot.vivero.ubicacion.longitud.toFixed(4)}
              </p>
              <p>
                <span className="text-brand-500">Vivero: </span>
                {lot.vivero.nombre} ({lot.vivero.codigo})
              </p>
              <p>
                <span className="text-brand-500">Responsable: </span>
                {lot.responsable}
              </p>
              <p>
                <span className="text-brand-500">Código: </span>
                {lot.codigo}
              </p>
              {lot.alturaPromSombraCm && (
                <p>
                  <span className="text-brand-500">Altura prom. sombra: </span>
                  {lot.alturaPromSombraCm} cm
                </p>
              )}
              {lot.alturaPromSalidaCm && (
                <p>
                  <span className="text-brand-500">Altura prom. salida: </span>
                  {lot.alturaPromSalidaCm} cm
                </p>
              )}
              {lot.blockchainHash && (
                <p className="break-all">
                  <span className="text-brand-500">Hash: </span>
                  {lot.blockchainHash}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <p className="text-sm font-semibold text-brand-700">Historial de eventos</p>
            <div className="space-y-3">
              {lot.eventos
                .slice()
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-brand-100 bg-brand-50 px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-brand-600">
                      <span>{formatDate(event.fecha)}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] uppercase tracking-wide text-brand-700 shadow-sm ring-1 ring-brand-100">
                        {event.fase}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-brand-700">{event.accion}</p>
                    {event.notas && (
                      <p className="text-xs font-medium text-brand-500">{event.notas}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-brand-700">
                      {event.vivas !== undefined && (
                        <span className="rounded-full bg-white px-2 py-1 ring-1 ring-brand-100">
                          Vivas: {event.vivas}
                        </span>
                      )}
                      {event.muertas !== undefined && (
                        <span className="rounded-full bg-white px-2 py-1 ring-1 ring-brand-100">
                          Muertas: {event.muertas}
                        </span>
                      )}
                      {event.alturaPromCm !== undefined && (
                        <span className="rounded-full bg-white px-2 py-1 ring-1 ring-brand-100">
                          Altura prom: {event.alturaPromCm} cm
                        </span>
                      )}
                      <span className="rounded-full bg-white px-2 py-1 ring-1 ring-brand-100">
                        Responsable: {event.responsable}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GerminationDetailScreen
