import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import HeroHeader from '../components/HeroHeader' // Ahora importará bien
import SaludCard from '../components/SaludCard'
import QuickActions from '../components/QuickActions'
import SubetapasBar from '../components/SubetapasBar'
import IndicadoresRapidos from '../components/IndicadoresRapidos' // Asegúrate de tener este
import UltimosEventos from '../components/UltimosEventos'     // Asegúrate de tener este
import Timeline from '../components/Timeline'
import EvidenciaTab from '../components/EvidenciaTab'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'
import OrigenCard from '../components/OrigenCard'
import FiltersRow from '../components/FiltersRow'
import AuditoriaSection from '../components/AuditoriaSection'

export default function ViveroDetailScreen() {
  const { id } = useParams()
  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [events, setEvents] = useState<ViveroLotEventView[]>([])
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'evidencia'>('resumen')
  const [filter, setFilter] = useState('todos')
  const counts: Record<string, number> = { todos: events.length }
  const filteredEvents = events

  useEffect(() => {
    if (!id) return
    LotesViveroService.getDetail(Number(id)).then(setDetail)
    LotesViveroService.getEvents(Number(id)).then(setEvents)
  }, [id])

  if (!detail) return <div>Cargando...</div>

  return (
    <div className="flex justify-center min-h-screen bg-[#d8e0d3]">
      {/* 'max-w-md w-full bg-[#eef2ed]' es el contenedor real del celular */}
      <div className="w-full max-w-md bg-[#eef2ed] min-h-screen shadow-2xl relative overflow-y-auto">
        <HeroHeader detail={detail} />
      
        {/* Pestañas */}
        <div className="sticky top-0 z-20 px-5 pt-4 pb-2 bg-[#eef2ed]/95 backdrop-blur-sm">
          <div className="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
            {(['resumen', 'historial', 'evidencia'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-full text-xs font-black capitalize ${activeTab === tab ? 'bg-brand-700 text-white' : 'text-slate-500'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENIDO: Se añadió pb-28 para evitar que la barra inferior tape el scroll */}
        <div className="px-5 pb-28 space-y-6">
          {activeTab === 'resumen' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <SaludCard detail={detail} />
              <IndicadoresRapidos detail={detail} events={events} />
              <SubetapasBar detail={detail} />
              <QuickActions detail={detail} />
              <UltimosEventos events={events} onJumpHistorial={() => setActiveTab('historial')} />
            </div>
          )}
          
          {activeTab === 'historial' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <OrigenCard detail={detail} />
              <FiltersRow active={filter} onChange={setFilter} counts={counts} />
              <Timeline events={filteredEvents} />
              <AuditoriaSection detail={detail} />
            </div>
          )}
          {activeTab === 'evidencia' && <EvidenciaTab events={events} onSelectPhoto={() => {}} />}
        </div>
      </div>
    </div>
  )
}