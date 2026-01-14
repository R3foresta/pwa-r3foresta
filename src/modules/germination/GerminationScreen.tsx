import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import GerminationLotCard, { type GerminationLotCardData } from './GerminationLotCard'
import { GerminacionService, type LoteFaseVivero } from '../../services/germinacion.service'

type ListLot = GerminationLotCardData & { comunidad: string }

function GerminationScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [lots, setLots] = useState<LoteFaseVivero[]>([])
  const [loadingLots, setLoadingLots] = useState(true)
  const [errorLots, setErrorLots] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadLots = async () => {
      try {
        setLoadingLots(true)
        setErrorLots(null)
        const response = await GerminacionService.list()
        if (isMounted) {
          setLots(response.data || [])
        }
      } catch (error) {
        if (isMounted) {
          setErrorLots(
            error instanceof Error ? error.message : 'Error al cargar lotes de germinacion',
          )
        }
      } finally {
        if (isMounted) {
          setLoadingLots(false)
        }
      }
    }

    loadLots()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredLots = useMemo<ListLot[]>(() => {
    const withDerived = lots.map((lot) => {
      const fechaInicio = lot.fecha_inicio ?? ''
      const cantidadInicio = lot.cantidad_inicio ?? 0

      const cantidadActual = (() => {
        switch (lot.estado) {
          case 'EMBOLSADO':
            return lot.cantidad_embolsadas ?? cantidadInicio
          case 'SOMBRA':
            return lot.cantidad_sombra ?? lot.cantidad_embolsadas ?? cantidadInicio
          case 'LISTA_PLANTAR':
          case 'SALIDA_VIVERO':
            return (
              lot.cantidad_lista_plantar ??
              lot.cantidad_sombra ??
              lot.cantidad_embolsadas ??
              cantidadInicio
            )
          case 'INICIO':
          default:
            return cantidadInicio
        }
      })()

      const germinadas = Math.max(cantidadActual, 0)
      const muertas = Math.max(cantidadInicio - germinadas, 0)

      return {
        id: String(lot.id),
        codigo: lot.codigo_trazabilidad || `LFV-${lot.id}`,
        especie: lot.planta?.especie || 'Sin especie',
        fuente: lot.tipo_material === 'ESQUEJE' ? 'ESQUEJE' : 'SEMILLA',
        estado: lot.estado,
        fechaInicio,
        diasDesdeInicio: fechaInicio
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24),
              ),
            )
          : 0,
        cantidadInicial: cantidadInicio,
        germinadas,
        muertas,
        vivero: lot.vivero?.nombre || 'Sin vivero',
        comunidad: lot.vivero?.ubicacion?.comunidad || 'Sin comunidad',
      }
    })

    const normalized = query.trim().toLowerCase()
    if (!normalized) return withDerived

    return withDerived.filter((lot) =>
      [lot.codigo, lot.especie, lot.comunidad, lot.vivero].some((field) =>
        field.toLowerCase().includes(normalized),
      ),
    )
  }, [lots, query])

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
            {loadingLots && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
                Cargando lotes de germinacion...
              </div>
            )}

            {errorLots && !loadingLots && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-red-500 shadow-soft ring-1 ring-black/5">
                {errorLots}
              </div>
            )}

            {!loadingLots &&
              !errorLots &&
              filteredLots.map((lot) => (
                <GerminationLotCard
                  key={lot.id}
                  lot={lot}
                  onClick={() => navigate(`/app/germination/${lot.id}`)}
                />
              ))}

            {!loadingLots && !errorLots && filteredLots.length === 0 && (
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
