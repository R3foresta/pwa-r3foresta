import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  TIPO_CAMPANIA_LABEL,
  type Campania,
  type TipoCampania,
} from '../types/contracts'
import { formatDate as formatFullDate } from '../utils/subcampaniaFormatters'

function formatDate(value?: string | null): string {
  return formatFullDate(value, { fallback: 'Sin fecha' })
}

function getTipoTone(tipo: TipoCampania): string {
  if (tipo === 'ARBORIZACION') return 'bg-sky-50 text-sky-800 ring-sky-100'
  if (tipo === 'FORESTACION') return 'bg-emerald-50 text-emerald-800 ring-emerald-100'
  return 'bg-brand-50 text-brand-700 ring-brand-100'
}

function TipoCampaniaBadge({ tipo }: { tipo: TipoCampania }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${getTipoTone(tipo)}`}>
      {TIPO_CAMPANIA_LABEL[tipo]}
    </span>
  )
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold leading-none text-brand-800 tabular-nums">
        {value}
      </p>
      {helper && <p className="mt-2 text-[11px] font-semibold text-slate-500">{helper}</p>}
    </div>
  )
}

function CampaniaCard({
  campania,
  onClick,
}: {
  campania: Campania
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300 active:scale-[0.995]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon name="planting" className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <TipoCampaniaBadge tipo={campania.tipo} />
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-100">
              {campania.codigo_trazabilidad}
            </span>
          </div>
          <p className="mt-2 text-base font-extrabold leading-tight text-brand-800">
            {campania.nombre}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">
            {campania.descripcion || 'Sin descripción registrada.'}
          </p>
        </div>
        <Icon name="chevron-right" className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#f8fbf7] px-3 py-2.5 ring-1 ring-brand-100">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Inicio estimado
          </p>
          <p className="mt-1 text-xs font-extrabold text-brand-800">
            {formatDate(campania.fecha_estimada_inicio)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f8fbf7] px-3 py-2.5 ring-1 ring-brand-100">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Cierre estimado
          </p>
          <p className="mt-1 text-xs font-extrabold text-brand-800">
            {formatDate(campania.fecha_estimada_fin)}
          </p>
        </div>
      </div>
    </button>
  )
}

function PlantacionDashboardScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campanias, setCampanias] = useState<Campania[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = (user?.rol ?? '').toUpperCase() === 'ADMIN'

  const loadCampanias = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PlantacionService.listCampanias()
      setCampanias(data)
    } catch (loadError) {
      setCampanias([])
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar campañas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCampanias()
  }, [])

  const stats = useMemo(() => {
    const byTipo = campanias.reduce<Record<TipoCampania, number>>(
      (acc, campania) => {
        acc[campania.tipo] += 1
        return acc
      },
      { REFORESTACION: 0, ARBORIZACION: 0, FORESTACION: 0 },
    )
    return {
      total: campanias.length,
      byTipo,
    }
  }, [campanias])

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-700 via-brand-700 to-brand-600" />
          <div className="relative px-5 pb-6 pt-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/app/home')}
                aria-label="Volver"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Icon name="arrow-left" className="h-5 w-5" />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ring-white/25">
                <Icon name="planting" className="h-3.5 w-3.5" />
                Plantación
              </span>
            </div>

            <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              Módulo 3
            </p>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight">
              Campañas y sub-campañas
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
              Crea campañas estratégicas y continúa con la configuración operativa por sub-campaña.
            </p>
          </div>
        </header>

        <main className="-mt-3 space-y-4 px-5">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Campañas" value={stats.total} helper="Total" />
            <StatCard label="Arbor." value={stats.byTipo.ARBORIZACION} helper="Urbano" />
            <StatCard label="Refor." value={stats.byTipo.REFORESTACION} helper="Natural" />
          </div>

          <button
            type="button"
            onClick={() => navigate('/app/planting/campanias/new')}
            disabled={!canCreate}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-soft ring-1 transition ${
              canCreate
                ? 'bg-emerald-50 text-emerald-900 ring-emerald-200 hover:bg-emerald-100'
                : 'cursor-not-allowed bg-slate-100 text-slate-500 ring-slate-200'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="plus" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold">Nueva campaña</span>
              <span className="block text-xs font-semibold opacity-75">
                {canCreate
                  ? 'Crea el contenedor estratégico y luego agrega sub-campañas.'
                  : 'Solo usuarios ADMIN pueden crear campañas.'}
              </span>
            </span>
          </button>

          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="info" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-brand-800">Sub-campañas</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  La configuración operativa vive en sub-campañas: zona, meta, coordinador,
                  equipo y asignación de lotes. Ese flujo queda encadenado después de crear
                  una campaña.
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between px-1">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Campañas registradas
            </p>
            {!loading && !error && (
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                {campanias.length}
              </p>
            )}
          </div>

          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando campañas...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadCampanias()}
                className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && campanias.length === 0 && (
            <div className="rounded-3xl border border-dashed border-brand-100 bg-white px-4 py-8 text-center shadow-soft">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon name="planting" className="h-7 w-7" />
              </div>
              <p className="mt-3 text-base font-extrabold text-brand-800">
                Aún no hay campañas
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                Crea una campaña para luego agregar sub-campañas operativas.
              </p>
            </div>
          )}

          {!loading && !error && campanias.length > 0 && (
            <div className="space-y-3">
              {campanias.map((campania) => (
                <CampaniaCard
                  key={campania.id}
                  campania={campania}
                  onClick={() =>
                    navigate(`/app/planting/campanias/${campania.id}`, {
                      state: { campania },
                    })
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default PlantacionDashboardScreen
