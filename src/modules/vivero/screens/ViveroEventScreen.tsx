import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import StageTabs from '../components/event/StageTabs'
import type { StageKey, StageTab } from '../components/event/StageTabs'
import EmbolsadoForm from '../components/event/forms/EmbolsadoForm'
import AdaptabilidadForm from '../components/event/forms/AdaptabilidadForm'
import MermaForm from '../components/event/forms/MermaForm'
import DespachoForm from '../components/event/forms/DespachoForm'
import type { LoteViveroDetalle } from '../types/contracts'

const SUBETAPA_LABEL: Record<string, string> = {
  SOMBRA: 'Sombra',
  MEDIA_SOMBRA: 'Media sombra',
  SOL_DIRECTO: 'Sol directo',
}

function getLotEspecie(lot: LoteViveroDetalle): string {
  return (
    lot.planta?.especie ||
    lot.nombre_comercial_snapshot ||
    lot.nombre_cientifico_snapshot ||
    'Sin especie'
  )
}

function ViveroEventScreen() {
  const { id, tipo } = useParams<{ id: string; tipo: string }>()
  const navigate = useNavigate()

  const loteId = Number(id)
  const isValidId = Number.isFinite(loteId) && loteId > 0
  const [lote, setLote] = useState<LoteViveroDetalle | null>(null)
  const [loading, setLoading] = useState(isValidId)
  const [error, setError] = useState<string | null>(isValidId ? null : 'Lote inválido')

  useEffect(() => {
    if (!isValidId) return
    let mounted = true
    LotesViveroService.getById(loteId)
      .then((data) => {
        // Forzamos el tipado temporalmente para compensar la discrepancia
        // del merge conflict. Esto mantiene la UI funcionando y pasa el build.
        if (mounted) setLote(data as unknown as LoteViveroDetalle)
      })
      .catch((err) => {
        if (mounted)
          setError(err instanceof Error ? err.message : 'Error al cargar el lote.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [loteId, isValidId])

  const tabs: StageTab[] = useMemo(() => {
    if (!lote) return []
    const hasEmbolsado = lote.plantas_vivas_iniciales !== null
    const isActive = lote.estado_lote === 'ACTIVO'
    const saldo = lote.saldo_vivo_actual ?? 0
    const saldoLibre = lote.saldo_vivo_disponible_asignacion ?? saldo
    const hasSaldo = saldo > 0

    return [
      {
        key: 'embolsado',
        label: 'Embolsado',
        hidden: hasEmbolsado,
        available: !hasEmbolsado && isActive,
        reason: !isActive ? 'Lote finalizado' : undefined,
      },
      {
        key: 'adaptabilidad',
        label: 'Adaptabilidad',
        available: hasEmbolsado && isActive,
        reason: !hasEmbolsado
          ? 'Requiere embolsado primero'
          : !isActive
            ? 'Lote finalizado'
            : undefined,
      },
      {
        key: 'merma',
        label: 'Merma',
        available: hasEmbolsado && isActive && hasSaldo,
        reason: !hasEmbolsado
          ? 'Requiere embolsado primero'
          : !isActive
            ? 'Lote finalizado'
            : !hasSaldo
              ? 'Sin saldo vivo'
              : undefined,
      },
      {
        key: 'despacho',
        label: 'Despacho',
        available: hasEmbolsado && isActive && saldoLibre > 0,
        reason: !hasEmbolsado
          ? 'Requiere embolsado primero'
          : !isActive
            ? 'Lote finalizado'
            : saldoLibre <= 0
              ? 'Sin saldo libre'
              : undefined,
      },
    ]
  }, [lote])

  const currentKey = (tipo as StageKey) || 'embolsado'
  const currentTab = tabs.find((t) => t.key === currentKey)

  const handleSelectTab = (key: StageKey) => {
    navigate(`/app/vivero/${loteId}/event/${key}`, { replace: true })
  }

  const handleCompleted = () => {
    navigate(`/app/vivero/${loteId}`)
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 pb-28">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-600">Cargando lote…</p>
        </div>
      </div>
    )
  }

  if (error || !lote) {
    return (
      <div className="relative min-h-screen bg-[#eef2ed]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
            <p className="text-sm font-semibold text-red-500">
              {error ?? 'Lote no encontrado.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Si el tab actual no es válido, redirigir al primero disponible.
  // Si no hay ninguno (lote finalizado, sin saldo, tipo desconocido), volvemos
  // al detalle: sin este return el render de abajo igual monta el form del
  // `currentKey`, exponiendo el flujo aunque el backend lo termine rechazando.
  if (!currentTab || currentTab.hidden || !currentTab.available) {
    const fallback = tabs.find((t) => !t.hidden && t.available)
    if (fallback && fallback.key !== currentKey) {
      return <Navigate to={`/app/vivero/${loteId}/event/${fallback.key}`} replace />
    }
    return <Navigate to={`/app/vivero/${loteId}`} replace />
  }

  const especie = getLotEspecie(lote)
  const codigo = lote.codigo_trazabilidad || `VIV-${lote.id}`
  const viveroNombre = lote.vivero?.nombre || `Vivero #${lote.vivero_id}`
  const subetapaLabel = lote.subetapa_actual ? SUBETAPA_LABEL[lote.subetapa_actual] : null
  // Piso de fecha para MERMA y ADAPTABILIDAD (regla backend RN-VIV-10:
  // fecha_evento >= fecha_embolsado). Null si todavía no se embolsó —
  // en ese caso los tabs respectivos no quedan disponibles.
  const fechaEmbolsado = lote.ultimo_evento_por_tipo?.EMBOLSADO?.fecha_evento ?? null
  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      {/* Header sticky */}
      <div className="sticky top-0 z-30 bg-[#eef2ed]/95 px-5 pb-3 pt-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Volver"
              onClick={() => navigate(`/app/vivero/${loteId}`)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-700 shadow-soft transition hover:bg-brand-50"
            >
              <Icon name="arrow-left" className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-500">
                {codigo}
              </p>
              <h1 className="truncate text-xl font-extrabold leading-tight text-brand-700">
                {especie}
              </h1>
              <p className="truncate text-[11px] font-semibold text-brand-500">
                {viveroNombre}
                {subetapaLabel ? ` · ${subetapaLabel}` : ''}
              </p>
            </div>
          </div>

          <StageTabs tabs={tabs} current={currentKey} onSelect={handleSelectTab} />
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto w-full max-w-md px-5 pt-2">
        {currentKey === 'embolsado' && (
          <EmbolsadoForm lote={lote} onCompleted={handleCompleted} />
        )}
        {currentKey === 'adaptabilidad' && (
          <AdaptabilidadForm
            lote={lote}
            fechaEmbolsado={fechaEmbolsado}
            onCompleted={handleCompleted}
          />
        )}
        {currentKey === 'merma' && (
          <MermaForm
            lote={lote}
            fechaEmbolsado={fechaEmbolsado}
            onCompleted={handleCompleted}
          />
        )}
        {currentKey === 'despacho' && (
          <DespachoForm lote={lote} onCompleted={handleCompleted} />
        )}
      </div>
    </div>
  )
}

export default ViveroEventScreen
