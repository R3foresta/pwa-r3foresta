import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
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
import type { PhotoItem, ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'
import CierreLoteCard from '../components/CierreLoteCard'
import Icon from '../../../components/Icon'
import { NowContext } from '../hooks/nowContext' 

export default function ViveroDetailScreen() {
  const { id } = useParams()

  const lotId = Number(id)
  const isInvalidId = !Number.isFinite(lotId) || lotId <= 0

  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [events, setEvents] = useState<ViveroLotEventView[]>([])
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'evidencia'>('resumen')
  const [filter, setFilter] = useState('TODOS')
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoItem[] | null>(null)

  // 2. Inicializamos error y loading basados en la validación previa
  const [loading, setLoading] = useState(!isInvalidId)
  const [error, setError] = useState<string | null>(isInvalidId ? 'ID de lote inválido.' : null)

  // 3. Inicializamos 'now' directamente con el tiempo actual para evitar el setNow síncrono
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (isInvalidId) return

    let isMounted = true

    const fetchDetailData = async () => {
      setLoading(true)
      setError(null)
      
      const [detailResult, eventsResult] = await Promise.allSettled([
        LotesViveroService.getDetail(lotId),
        LotesViveroService.getEvents(lotId),
      ])

      if (!isMounted) return

      if (detailResult.status === 'rejected') {
        setError('No se pudo cargar la información del lote. Verifica tu conexión.')
        setLoading(false)
        return
      }

      setDetail(detailResult.value)
      setEvents(eventsResult.status === 'fulfilled' ? eventsResult.value : [])
      setLoading(false)
    }

    fetchDetailData()

    return () => { isMounted = false }
  }, [lotId, isInvalidId]) 

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const filteredEvents = useMemo(() => {
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
    const photoItem: PhotoItem = {
      url: event.fotos?.[0]?.url || '',
      titulo: event.fotos?.[0]?.titulo || 'Evidencia',
      fecha: event.fecha,
      autor: event.responsableNombre,
      etapa: event.kind
    };
    setSelectedPhotos([photoItem]); 
  }

  const ultimaFotoLote = useMemo(() => {
    const eventoConFoto = [...events].reverse().find(e => e.fotos && e.fotos.length > 0);
    return eventoConFoto?.fotos?.[0]?.url || detail?.plantaImagenUrl;
  }, [events, detail?.plantaImagenUrl]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#d8e0d3]">
        <div className="rounded-3xl bg-white p-6 text-center shadow-2xl max-w-sm">
          <p className="text-red-500 font-bold mb-2">Error</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (loading || !detail) {
    return (
      <div className="flex justify-center min-h-screen bg-[#d8e0d3]">
        <div className="w-full max-w-md bg-[#eef2ed] min-h-screen flex flex-col items-center justify-center shadow-2xl relative">
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
    <NowContext.Provider value={now}>
      <div className="flex justify-center min-h-screen bg-[#d8e0d3]">
        <div className="w-full max-w-md bg-[#eef2ed] min-h-screen shadow-2xl relative overflow-y-auto">
          <HeroHeader detail={detail} customImage={ultimaFotoLote} />

          <div className="sticky top-0 z-20 px-5 pt-4 pb-2 bg-[#eef2ed]/95 backdrop-blur-sm">
            <div className="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
              {(['resumen', 'historial', 'evidencia'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-full text-xs font-black capitalize ${
                    activeTab === tab ? 'bg-brand-700 text-white' : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-28 space-y-6">
            {activeTab === 'resumen' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {detail.estadoLote === 'FINALIZADO' ? (
                  <CierreLoteCard detail={detail} events={events} />
                ) : (
                  <SaludCard detail={detail} events={events} />
                )}
                <QuickActions detail={detail} onJumpEvidencia={() => setActiveTab('evidencia')} />
                <IndicadoresRapidos detail={detail} events={events} />
                <SubetapasBar detail={detail} events={events} />
                <UltimosEventos events={events} onJumpHistorial={() => setActiveTab('historial')} />
              </div>
            )}

            {activeTab === 'historial' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <OrigenCard detail={detail} />
                <FiltersRow active={filter} onChange={setFilter} counts={counts} />
                <Timeline events={filteredEvents} onOpenGallery={handleOpenGalleryFromEvent} />
                <AuditoriaSection detail={detail} />
              </div>
            )}

            {activeTab === 'evidencia' && (
              <EvidenciaTab 
                events={events} 
                onSelectPhoto={(photo) => setSelectedPhotos(photo ? [photo] : null)} 
              />
            )}
          </div>
        </div>

        <GalleryModal photos={selectedPhotos} onClose={() => setSelectedPhotos(null)} />
      </div>
    </NowContext.Provider>
  )
}
