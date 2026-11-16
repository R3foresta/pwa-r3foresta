import { useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import HeroHeader from '../components/HeroHeader'
import SaludCard from '../components/SaludCard'
import QuickActions from '../components/QuickActions'
import SubetapasBar from '../components/SubetapasBar'
import IndicadoresRapidos from '../components/IndicadoresRapidos'
import UltimosEventos from '../components/UltimosEventos'
import Timeline from '../components/Timeline'
import EvidenciaTab from '../components/EvidenciaTab'
import OrigenCard from '../components/OrigenCard'
import FiltersRow from '../components/FiltersRow'
import AuditoriaSection from '../components/AuditoriaSection'
import GalleryModal from '../components/GalleryModal'
import CierreLoteCard from '../components/CierreLoteCard'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { isExactId } from '../../accesos/accessPolicy'
import { Button } from '../../../components/ui'
import { useViveroDetail } from '../hooks/useViveroDetail'
import type { PhotoItem, ViveroLotEventView } from '../types/view-models'
import { useViveroStats } from '../hooks/useViveroStats'
import ViveroLotAsignacionesCollapsible from '../components/ViveroLotAsignacionesCollapsible'
import ViveroLotAsignacionesTab from '../components/ViveroLotAsignacionesTab'
import DispatchFlowCard from '../components/DispatchFlowCard'

const DETAIL_TABS = ['resumen', 'asignaciones', 'historial', 'evidencia'] as const
type DetailTab = (typeof DETAIL_TABS)[number]

export default function ViveroDetailScreen() {
  const { id } = useParams()
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const scope = JSON.stringify([id, user?.id, localStorage.getItem('authToken'), m2.status, m2.data])
  return <ViveroDetail key={scope} />
}

function ViveroDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const lotId = id ?? ''
  const isInvalidId = !isExactId(lotId)

  const { detail, events, loading, error, refetch, eventsLoading, eventsError, eventsReady, refetchEvents, detailRefreshing, detailRefreshError } = useViveroDetail(lotId, isInvalidId)

  const stats = useViveroStats(detail, events, eventsReady)

  // Lectura defensiva de `?tab=`: solo aceptamos una pestaña conocida (p. ej.
  // AsignacionForm vuelve con `?tab=asignaciones`); cualquier otro valor cae a
  // `resumen`. Solo aplica al primer render.
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    const requested = searchParams.get('tab')
    return DETAIL_TABS.includes(requested as DetailTab) ? (requested as DetailTab) : 'resumen'
  })
  const [filter, setFilter] = useState('TODOS')
  // Se conserva selección y metadatos dentro del ámbito, nunca una firma vieja.
  const [gallery, setGallery] = useState<{ photos: PhotoItem[]; selectedId: string } | null>(null)
  const allPhotos: PhotoItem[] = events.flatMap(event => (event.fotos ?? []).map(photo => ({ ...photo, autor: event.responsableNombre, etapa: event.kind })))
  const selectedPhotos = gallery?.photos.map(metadata => allPhotos.find(photo => photo.id === metadata.id) ?? metadata) ?? []
  const openGallery = (photos: PhotoItem[]) => {
    if (!photos.length) return
    setGallery({ selectedId: photos[0].id, photos: photos.map(photo => ({ ...photo, url: null, expiraEn: null })) })
  }
  const readingsCurrent = !detailRefreshing && !detailRefreshError

  const baseFilteredEvents = useMemo(() => {
    const filterUpper = filter.toUpperCase()
    if (filterUpper === 'TODOS') return events
    return events.filter(e => e.kind.toUpperCase() === filterUpper)
  }, [events, filter])

  const counts = useMemo(() => {
    return events.reduce((acc, event) => {
      const kind = event.kind.toUpperCase()
      acc[kind] = (acc[kind] || 0) + 1
      return acc
    }, { TODOS: events.length } as Record<string, number>)
  }, [events])

  const handleOpenGalleryFromEvent = (event: ViveroLotEventView) => {
    openGallery((event.fotos ?? []).map(photo => ({ ...photo, autor: event.responsableNombre, etapa: event.kind })))
  }
  const historyStatus = eventsLoading ? <p role="status" className="rounded-2xl bg-white p-4 text-sm text-neutral-600">Cargando historial y evidencias…</p>
    : eventsError ? <div role="alert" className="rounded-2xl bg-danger-50 p-4 text-sm text-danger-700">
      <p>No se pudo consultar el historial: {eventsError}</p>
      <Button variant="secondary" size="sm" onClick={refetchEvents}>Reintentar historial</Button>
    </div> : null


  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-100">
        <div className="rounded-3xl bg-white p-6 text-center shadow-2xl max-w-sm">
          <p className="text-danger-500 font-bold mb-2">Error</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button variant="secondary" onClick={refetch}>Reintentar ficha</Button>
        </div>
      </div>
    )
  }

  if (loading || !detail) {
    return (
      <div className="flex justify-center min-h-screen bg-brand-100">
        <div className="w-full max-w-md bg-brand-50 min-h-screen flex flex-col items-center justify-center shadow-2xl relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft ring-1 ring-black/5 mb-4 animate-pulse">
            <Icon name="leaf" className="h-7 w-7 text-brand-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 animate-pulse">
            Cargando lote...
          </p>
        </div>
      </div>
    )
  }

  return (
      <div className="flex justify-center min-h-screen bg-brand-100">
        <div className="w-full max-w-md bg-brand-50 min-h-screen shadow-2xl relative overflow-y-auto">
          <HeroHeader detail={detail} />
          {detailRefreshing && <p role="status" className="mx-5 mt-4 rounded-2xl bg-white p-4 text-sm text-neutral-600">Actualizando los saldos de la ficha…</p>}
          {detailRefreshError && <div role="alert" className="mx-5 mt-4 rounded-2xl bg-warning-50 p-4 text-sm text-neutral-700">
            <p>No se pudieron actualizar los saldos. Se muestra la última ficha consultada; actualízala antes de otra operación.</p>
            <Button variant="secondary" size="sm" onClick={refetch}>Reintentar ficha</Button>
          </div>}

          <div className="sticky top-0 z-20 px-5 pt-4 pb-2 bg-brand-50/95 backdrop-blur-sm">
            {/* Control segmentado de pestañas (a medida, no calza en <Button>): tokens migrados. */}
            <div className="flex rounded-full bg-white p-1 ring-1 ring-neutral-200">
              {DETAIL_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-full text-xs font-black capitalize transition-colors ${activeTab === tab ? 'bg-brand-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-28 space-y-6">
            {activeTab === 'resumen' && (
              <div className="space-y-6 transition-opacity duration-300">
                {historyStatus}
                <QuickActions detail={detail} operationsDisabled={!readingsCurrent} onJumpEvidencia={() => setActiveTab('evidencia')} />
                {detail.estadoLote === 'FINALIZADO' ? (
                  <CierreLoteCard detail={detail} events={events} stats={stats} />
                ) : (
                  <SaludCard detail={detail} />
                )}
                <DispatchFlowCard detail={detail} />
                <IndicadoresRapidos detail={detail} events={events} stats={stats} />
                {eventsReady && <SubetapasBar detail={detail} events={events} />}
                <ViveroLotAsignacionesCollapsible
                  loteId={detail.id}
                  cantidadAsignacionesActivas={detail.cantidadAsignacionesActivas}
                  className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5"
                />
                {eventsReady && <UltimosEventos events={events} onJumpHistorial={() => setActiveTab('historial')} />}
              </div>
            )}

            {activeTab === 'historial' && (
              <div className="space-y-4 transition-opacity duration-300">
                <OrigenCard detail={detail} />
                <FiltersRow active={filter} onChange={setFilter} counts={counts} />
                {historyStatus}
                {eventsReady && <Timeline events={baseFilteredEvents} onOpenGallery={handleOpenGalleryFromEvent} onRenewPhotos={refetchEvents} />}
                <p className="text-xs text-neutral-500">Se muestran los registros que pudieron consultarse. Si falta un registro o una foto, vuelve a consultar.</p>
                <Button variant="secondary" size="sm" onClick={refetchEvents} disabled={eventsLoading}>Actualizar historial y fotos</Button>
                <AuditoriaSection detail={detail} />
              </div>
            )}

            {activeTab === 'evidencia' && (
              <div className="transition-opacity duration-300">
                {historyStatus}
                {eventsReady && <EvidenciaTab
                  events={events}
                  onSelectPhoto={(photo) => openGallery([photo])}
                  onRenew={refetchEvents}
                />}
                <p className="mt-3 text-xs text-neutral-500">Se muestran las fotos que pudieron consultarse. Si falta alguna, vuelve a consultar.</p>
                <Button variant="secondary" size="sm" onClick={refetchEvents} disabled={eventsLoading}>Actualizar fotos</Button>
              </div>
            )}
            {activeTab === 'asignaciones' && (
              <div className="transition-opacity duration-300">
                <ViveroLotAsignacionesTab lote={detail} readingsCurrent={readingsCurrent} onLoteChanged={refetch} />
              </div>
            )}
          </div>
        </div>

        {gallery && <GalleryModal photos={selectedPhotos} selectedPhotoId={gallery.selectedId}
          onSelectPhotoId={selectedId => setGallery(previous => previous ? { ...previous, selectedId } : null)}
          onClose={() => setGallery(null)} onRenew={refetchEvents} renewing={eventsLoading} error={eventsError} />}
      </div>
  )
}
