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
import type { PhotoItem } from '../components/GalleryModal'
import CierreLoteCard from '../components/CierreLoteCard'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

export default function ViveroDetailScreen() {
  const { id } = useParams()
  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [events, setEvents] = useState<ViveroLotEventView[]>([])
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'evidencia'>('resumen')
  
  const [filter, setFilter] = useState('TODOS')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)

  useEffect(() => {
    if (!id) return
    LotesViveroService.getDetail(Number(id)).then(setDetail)
    LotesViveroService.getEvents(Number(id)).then(setEvents)
  }, [id])

  const counts = useMemo(() => {
    return events.reduce((acc, event) => {
      const kind = event.kind.toUpperCase()
      acc[kind] = (acc[kind] || 0) + 1
      return acc
    }, { TODOS: events.length } as Record<string, number>)
  }, [events])

  const filteredEvents = useMemo(() => {
    const filterUpper = filter.toUpperCase()
    if (filterUpper === 'TODOS') return events
    return events.filter(e => e.kind.toUpperCase() === filterUpper)
  }, [events, filter])

  // Función para adaptar la foto del Timeline al formato que espera el Modal
  const handleOpenGalleryFromEvent = (event: ViveroLotEventView) => {
    // SOLUCIÓN OBS 19 PABLO: Limpiamos la lógica paralela
    const imagenes = event.fotos && event.fotos.length > 0 ? event.fotos : []

    if (imagenes.length > 0) {
      setSelectedPhoto({
        url: imagenes[0].url,
        titulo: imagenes[0].titulo,
        fecha: event.fecha,
        autor: event.responsableNombre,
        etapa: event.kind
      })
    }
  }
  
  if (!detail) {
    return (
      <div className="flex justify-center min-h-screen bg-[#d8e0d3]">
        <div className="w-full max-w-md bg-[#eef2ed] min-h-screen flex flex-col items-center justify-center shadow-2xl relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft ring-1 ring-black/5 mb-4 animate-pulse">
            <span className="text-3xl text-brand-600">🌿</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 animate-pulse">
            Cargando lote...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center min-h-screen bg-[#d8e0d3]">
      <div className="w-full max-w-md bg-[#eef2ed] min-h-screen shadow-2xl relative overflow-y-auto">
        <HeroHeader detail={detail} />
      
        <div className="sticky top-0 z-20 px-5 pt-4 pb-2 bg-[#eef2ed]/95 backdrop-blur-sm">
          <div className="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
            {(['resumen', 'historial', 'evidencia'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-full text-xs font-black capitalize ${activeTab === tab ? 'bg-brand-700 text-white' : 'text-slate-500'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-28 space-y-6">
          {activeTab === 'resumen' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* FIX: Usamos estadoLote oficial del view-model */}
              {detail.estadoLote === 'FINALIZADO' 
                ? <CierreLoteCard detail={detail} events={events} /> 
                : <SaludCard detail={detail} events={events} />
              }
              
              {/* FIX (Obs 16): QuickActions sube al 2do lugar */}
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
              {/* Le pasamos la lista filtrada y la función para abrir la galería */}
              <Timeline events={filteredEvents} onOpenGallery={handleOpenGalleryFromEvent} />
              <AuditoriaSection detail={detail} />
            </div>
          )}
          
          {/* Le pasamos setSelectedPhoto para que la pestaña también pueda abrir el modal */}
          {activeTab === 'evidencia' && (
            <EvidenciaTab events={events} onSelectPhoto={setSelectedPhoto} />
          )}
        </div>
      </div>

      {/* Renderizado condicional del Modal de Galería al más alto nivel */}
      <GalleryModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  )
}