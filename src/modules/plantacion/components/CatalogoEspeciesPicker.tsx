import { useEffect, useMemo, useState } from 'react'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { PlantasService } from '../../../services/plantas.service'
import {
  LotesViveroService,
  type EspecieStockVivero,
} from '../../../services/lotes-vivero.service'
import type { PlantaCatalogo } from '../../../types/plantas.types'

export type EspecieCatalogoItem = {
  planta_id: number
  especie: string
  nombre_cientifico: string
  nombre_comun_principal: string | null
  saldo_disponible: number
}

type Props = {
  open: boolean
  excludedPlantaIds: number[]
  onClose: () => void
  onConfirm: (items: EspecieCatalogoItem[]) => void
}

const CATALOG_LIMIT = 200

function CatalogoEspeciesPicker({ open, excludedPlantaIds, onClose, onConfirm }: Props) {
  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [stockByPlantaId, setStockByPlantaId] = useState<Map<number, EspecieStockVivero>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    if (!open) return

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)
    })

    Promise.allSettled([
      PlantasService.listPlantas({ limit: CATALOG_LIMIT, incluir_inactivas: false }),
      LotesViveroService.listStockEspecies(),
    ]).then(([plantasResult, stockResult]) => {
      if (cancelled) return

      if (plantasResult.status === 'rejected') {
        const reason = plantasResult.reason
        setError(
          reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo de especies.',
        )
        setPlantas([])
        setStockByPlantaId(new Map())
        setLoading(false)
        return
      }

      setPlantas(plantasResult.value.data ?? [])

      if (stockResult.status === 'fulfilled') {
        const nextStockMap = new Map<number, EspecieStockVivero>()
        for (const item of stockResult.value) {
          nextStockMap.set(item.planta_id, item)
        }
        setStockByPlantaId(nextStockMap)
      } else {
        console.error('Stock de vivero no disponible:', stockResult.reason)
        setStockByPlantaId(new Map())
      }

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open])

  const excludedSet = useMemo(() => new Set(excludedPlantaIds), [excludedPlantaIds])

  const items: EspecieCatalogoItem[] = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return plantas
      .filter((planta) => !excludedSet.has(planta.id))
      .map((planta) => {
        const stock = stockByPlantaId.get(planta.id)
        return {
          planta_id: planta.id,
          especie: planta.especie,
          nombre_cientifico: planta.nombre_cientifico,
          nombre_comun_principal: planta.nombre_comun_principal,
          // Modelo físico: el stock asignable/plantable es el saldo vivo actual
          // agregado (antes `saldo_disponible_total`, ya eliminado). El copy y el
          // resto de PLA-06 se migran en su ticket; esto es solo la fuente del dato.
          saldo_disponible: stock?.saldo_vivo_actual_total ?? 0,
        }
      })
      .filter((item) => {
        if (!normalized) return true
        const haystack = `${item.especie} ${item.nombre_cientifico} ${
          item.nombre_comun_principal ?? ''
        }`.toLowerCase()
        return haystack.includes(normalized)
      })
      .sort((a, b) => {
        if (a.saldo_disponible !== b.saldo_disponible) {
          return b.saldo_disponible - a.saldo_disponible
        }
        return a.especie.localeCompare(b.especie)
      })
  }, [plantas, stockByPlantaId, excludedSet, query])

  const handleToggle = (plantaId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(plantaId)) {
        next.delete(plantaId)
      } else {
        next.add(plantaId)
      }
      return next
    })
  }

  const resetPickerState = () => {
    setQuery('')
    setSelectedIds(new Set())
  }

  const handleClose = () => {
    resetPickerState()
    onClose()
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) return
    const selectedItems = items.filter((item) => selectedIds.has(item.planta_id))
    resetPickerState()
    onConfirm(selectedItems)
  }

  if (!open) return null

  const selectionCount = selectedIds.size

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="especies-picker-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:px-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 pb-3 pt-5">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Catálogo de especies
            </p>
            <h2 id="especies-picker-title" className="mt-1 text-lg font-extrabold text-brand-800">
              Agregar al mix
            </h2>
            <p className="mt-0.5 text-[11px] font-bold text-neutral-500">
              {selectionCount > 0
                ? `${selectionCount} ${selectionCount === 1 ? 'especie seleccionada' : 'especies seleccionadas'}`
                : 'Toca para seleccionar varias'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5">
            <Icon name="search" className="h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por especie o nombre científico..."
              className="w-full border-none bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && (
            <p className="rounded-2xl bg-neutral-50 px-4 py-6 text-center text-sm font-semibold text-neutral-500">
              Cargando catálogo...
            </p>
          )}

          {!loading && error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="rounded-2xl bg-neutral-50 px-4 py-6 text-center text-sm font-semibold text-neutral-500">
              {query.trim()
                ? 'Ninguna especie coincide con la búsqueda.'
                : 'No hay más especies disponibles en el catálogo.'}
            </p>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item) => {
                const isOutOfStock = item.saldo_disponible <= 0
                const isSelected = selectedIds.has(item.planta_id)
                return (
                  <li key={item.planta_id}>
                    <button
                      type="button"
                      onClick={() => handleToggle(item.planta_id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left shadow-soft transition ${
                        isSelected
                          ? 'bg-brand-50 ring-2 ring-brand-500'
                          : 'bg-white ring-1 ring-black/5 hover:ring-brand-300'
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-neutral-300 bg-white text-transparent'
                          }`}
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold leading-tight text-brand-800">
                            {item.nombre_comun_principal || item.especie}
                          </p>
                          <p className="text-[11px] italic text-neutral-500">
                            {item.nombre_cientifico}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider ring-1 ${
                          isOutOfStock
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-brand-50 text-brand-700 ring-brand-100'
                        }`}
                      >
                        {isOutOfStock
                          ? '0 disponibles'
                          : `${item.saldo_disponible.toLocaleString('es-BO')} disponibles`}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-neutral-100 px-5 pb-5 pt-3">
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth
            leftIcon="check"
            onClick={handleConfirm}
            disabled={selectionCount === 0}
          >
            Aceptar{selectionCount > 0 ? ` (${selectionCount})` : ''}
          </Button>
        </footer>
      </div>
    </div>
  )
}

export default CatalogoEspeciesPicker
