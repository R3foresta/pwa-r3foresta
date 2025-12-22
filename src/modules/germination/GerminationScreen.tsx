import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'

type GerminationLot = {
  id: string
  codigo: string
  especie: string
  fuente: 'SEMILLA' | 'ESQUEJE'
  estado: 'INICIO' | 'EMBOLSADO' | 'SOMBRA' | 'LISTA_PLANTAR' | 'SALIDA_VIVERO'
  fechaInicio: string
  diasDesdeInicio: number
  cantidadInicial: number
  germinadas: number
  muertas: number
  vivero: string
  comunidad: string
}

const germinationLots: GerminationLot[] = [
  {
    id: 'lot-1',
    codigo: 'GER-2025-001',
    especie: 'Cedrela odorata',
    fuente: 'SEMILLA',
    estado: 'INICIO',
    fechaInicio: '2025-09-21',
    diasDesdeInicio: 12,
    cantidadInicial: 200,
    germinadas: 165,
    muertas: 35,
    vivero: 'Vivero 1',
    comunidad: 'Comunidad A',
  },
  {
    id: 'lot-2',
    codigo: 'GER-2025-002',
    especie: 'Cedrela odorata',
    fuente: 'SEMILLA',
    estado: 'LISTA_PLANTAR',
    fechaInicio: '2025-08-21',
    diasDesdeInicio: 14,
    cantidadInicial: 200,
    germinadas: 100,
    muertas: 100,
    vivero: 'Vivero 2',
    comunidad: 'Comunidad B',
  },
]

const estadoLabel: Record<GerminationLot['estado'], string> = {
  INICIO: 'Germinación',
  EMBOLSADO: 'Embolsado',
  SOMBRA: 'Sombra',
  LISTA_PLANTAR: 'Listo para plantar',
  SALIDA_VIVERO: 'Salida vivero',
}

const estadoBadgeStyle: Record<
  GerminationLot['estado'],
  { bg: string; text: string; border: string }
> = {
  INICIO: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  EMBOLSADO: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  SOMBRA: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  LISTA_PLANTAR: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SALIDA_VIVERO: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
}

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function GerminationScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filteredLots = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return germinationLots

    return germinationLots.filter((lot) =>
      [lot.codigo, lot.especie, lot.comunidad, lot.vivero].some((field) =>
        field.toLowerCase().includes(normalized),
      ),
    )
  }, [query])

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <div className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/home')}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Módulo germinación
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-brand-700">
              Lotes de germinaciones
            </h1>
            <p className="text-sm font-semibold text-brand-500">Registro y seguimiento</p>
          </div>
        </div>

        <div className="mt-6 space-y-5 px-5">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
            <Icon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ID, especie o comunidad..."
              className="w-full border-none bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
              type="search"
            />
          </label>

          <button
            type="button"
            onClick={() => navigate('/app/germination/new')}
            className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-emerald-800 shadow-soft transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="plus" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold">Nuevo lote de germinación</p>
              <p className="text-sm font-semibold text-emerald-700/80">
                Registrar nueva germinación de esquejes o semillas
              </p>
            </div>
          </button>

          <div className="space-y-4">
            {filteredLots.map((lot) => {
              const supervivencia = Math.max(
                0,
                Math.round(((lot.cantidadInicial - lot.muertas) / lot.cantidadInicial) * 100),
              )
              const supervivenciaLabel =
                lot.estado === 'LISTA_PLANTAR' || lot.estado === 'SALIDA_VIVERO'
                  ? 'final'
                  : 'parcial'
              const badgeTone = estadoBadgeStyle[lot.estado]

              return (
                <article
                  key={lot.id}
                  className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-xl font-extrabold leading-tight">{lot.especie}</h2>
                      <p className="text-sm font-semibold text-brand-500">{lot.codigo}</p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold ${badgeTone.bg} ${badgeTone.text} ${badgeTone.border}`}
                    >
                      {estadoLabel[lot.estado]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
                    <div className="rounded-2xl bg-brand-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-brand-500">
                        Cantidad inicial
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-brand-700">
                        {lot.cantidadInicial}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-brand-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-brand-500">
                        Días desde inicio
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-brand-700">
                        {lot.diasDesdeInicio}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-brand-100">
                      <p className="text-xs uppercase tracking-wide text-brand-500">Germinadas</p>
                      <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.germinadas}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-brand-100">
                      <p className="text-xs uppercase tracking-wide text-brand-500">Muertas</p>
                      <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.muertas}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-brand-700">
                      Supervivencia {supervivenciaLabel} ({supervivencia}%):
                    </p>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-brand-50 ring-1 ring-black/5">
                      <div
                        className="h-full bg-[#9ed0ff]"
                        style={{ width: `${Math.min(supervivencia, 100)}%` }}
                      />
                      <div
                        className="h-full bg-slate-200"
                        style={{ width: `${Math.max(0, 100 - supervivencia)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-brand-700">
                    <span className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
                      {lot.fuente === 'SEMILLA' ? 'Semilla' : 'Esqueje'}
                    </span>
                    <span className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
                      {formatDate(lot.fechaInicio)}
                    </span>
                    <span className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
                      {lot.vivero}
                    </span>
                  </div>
                </article>
              )
            })}

            {filteredLots.length === 0 && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
                No se encontraron lotes con ese criterio de búsqueda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GerminationScreen
