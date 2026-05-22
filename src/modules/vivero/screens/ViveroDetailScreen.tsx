import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import CollapsibleSection from '../components/CollapsibleSection'
import SaludCard from '../components/SaludCard'
import QuickActions from '../components/QuickActions'
import SubetapasBar from '../components/SubetapasBar'
import Timeline from '../components/Timeline'
import GalleryModal from '../components/GalleryModal'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha'
  const datePart = value.includes('T') ? value.split('T')[0] : value
  const parts = datePart.split('-').map(p => parseInt(p, 10))
  if (parts.length !== 3 || parts.some(isNaN)) return value
  
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-ES', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-brand-500">{label}</span>
      <span className="text-right text-xs font-bold text-brand-700">{value}</span>
    </div>
  )
}

function EvidenciaTab({
    events,
    onSelectPhoto
  }: {
    events: ViveroLotEventView[]
    onSelectPhoto: (photo: { url: string; titulo: string; fecha: string; autor: string } | null) => void
  }) {
    const photos = useMemo(() => {
      return events.reduce<{ url: string; titulo: string; fecha: string; autor: string }[]>((acc, event) => {
        // Usamos la interfaz directamente. Si viene en 'evidencias' (backend real) o 'fotos' (fallback), lo manejamos aquí:
        const listaEvidencias = event.evidencias || event.fotos || [];

        listaEvidencias.forEach((item) => {
          acc.push({
            url: 'public_url' in item ? (item as any).public_url : item.url, // Si es el modelo de evidencias, usamos public_url
            titulo: item.titulo,
            fecha: 'tomado_en' in item ? (item as any).tomado_en : item.fecha,
            autor: event.responsableNombre
          });
        });
        return acc;
      }, []);
    }, [events]);

    if (photos.length === 0) {
      return (
        <div className="rounded-3xl bg-white p-4 text-sm font-semibold text-brand-500 shadow-soft ring-1 ring-black/5">
          No hay evidencias fotográficas disponibles.
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <button
            key={`${photo.url}-${index}`}
            type="button"
            onClick={() => onSelectPhoto(photo)}
            className="overflow-hidden rounded-2xl bg-white text-left shadow-soft ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <img src={photo.url} alt={photo.titulo} className="h-28 w-full object-cover" />
            <div className="space-y-1 p-3">
              <p className="line-clamp-1 text-xs font-bold text-brand-700">{photo.titulo}</p>
              <p className="text-[10px] font-semibold text-brand-500">{photo.autor}</p>
              <p className="text-[10px] font-semibold text-brand-400">{photo.fecha || 'Sin fecha'}</p>
            </div>
          </button>
        ))}
      </div>
    )
}

function ViveroDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'evidencia'>('resumen')
  const [events, setEvents] = useState<ViveroLotEventView[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; titulo: string; fecha: string; autor: string } | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Lote de vivero no encontrado.')
      setLoading(false)
      return
    }
    const lotId = Number(id)
    if (!Number.isFinite(lotId) || lotId <= 0) {
      setError('ID de lote inválido.')
      setLoading(false)
      return
    }

    let isMounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const [dataDetail, dataEvents] = await Promise.all([
          LotesViveroService.getDetail(lotId),
          LotesViveroService.getEvents(lotId)
        ])

        if (isMounted) {
          setDetail(dataDetail)
          setEvents(dataEvents)
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Error al cargar el lote.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 pb-28">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-600">Cargando lote...</p>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 pb-28">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-red-500">{error ?? 'Lote no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        
        {/* Encabezado fijo común para todas las pestañas */}
        <header className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              {detail.codigo}
            </p>
            <h1 className="truncate text-2xl font-extrabold leading-tight text-brand-700">
              {detail.especie}
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              {detail.viveroNombre} · {detail.diasDesdeInicio}d
            </p>
          </div>
        </header>

        {/* CONTENEDOR PRINCIPAL CON SELECTOR DE PESTAÑAS Y VISTAS CONDICIONALES */}
        <div className="mt-5 space-y-4 px-5">
          
          {/* Selector Navegación de Pestañas */}
          <div className="sticky top-0 z-20 -mx-5 px-5 pt-3 pb-2 bg-[#eef2ed]/95 backdrop-blur-sm">
            <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
              {(['resumen', 'historial', 'evidencia'] as const).map((tab) => {
                const isSelected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-extrabold tracking-wide capitalize transition-all ${
                      isSelected
                        ? 'bg-brand-700 text-white shadow-soft'
                        : 'text-brand-700 hover:bg-brand-50'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── PESTAÑA: RESUMEN ─────────────────────────────────── */}
          {activeTab === 'resumen' && (
            <>
              <SaludCard detail={detail} />
              <QuickActions detail={detail} />
              <SubetapasBar detail={detail} />

              {/* SECCIÓN DE AUDITORÍA CENTRALIZADA */}
              <div className="pt-4 border-t border-slate-200/60 mt-6">
                <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3 px-1">
                  Detalle Técnico y Auditoría
                </p>
                
                <CollapsibleSection title="Datos de origen" defaultOpen={false}>
                  <div className="divide-y divide-brand-50">
                    <InfoRow
                      label="Recolección"
                      value={
                        detail.recoleccionFecha
                          ? `${detail.recoleccionCodigo} · ${formatDate(detail.recoleccionFecha)}`
                          : detail.recoleccionCodigo
                      }
                    />
                    <InfoRow label="Tipo material" value={detail.recoleccionTipoMaterial} />
                    <InfoRow label="Comunidad origen" value={detail.nombreComunidadOrigen ?? 'Sin registrar'} />
                    <InfoRow label="Vivero" value={`${detail.viveroNombre} (${detail.viveroCodigo})`} />
                    <InfoRow
                      label="Responsable"
                      value={
                        detail.responsableUsername
                          ? `${detail.responsableNombre} (@${detail.responsableUsername})`
                          : detail.responsableNombre
                      }
                    />
                    <InfoRow label="Fecha inicio" value={formatDate(detail.fechaInicio)} />
                    <InfoRow label="Actualizado" value={formatDateTime(detail.updatedAt)} />
                  </div>
                </CollapsibleSection>

                <div className="mt-2">
                  <CollapsibleSection title="Datos de planta" defaultOpen={false}>
                    {detail.plantaImagenUrl && (
                      <div className="mb-3 overflow-hidden rounded-2xl">
                        <img src={detail.plantaImagenUrl} alt={detail.especie} className="h-36 w-full object-cover" />
                      </div>
                    )}
                    <div className="divide-y divide-brand-50">
                      <InfoRow label="Especie" value={detail.especie} />
                      <InfoRow label="Nombre científico" value={detail.nombreCientifico} />
                      <InfoRow label="Nombre comercial" value={detail.nombreComercial} />
                      <InfoRow label="Variedad" value={detail.variedad ?? 'N/D'} />
                    </div>
                  </CollapsibleSection>
                </div>
                
                <p className="text-center text-[10px] font-bold text-slate-400 mt-4 tracking-wide">
                  Registros inmutables con soporte criptográfico · R3foresta
                </p>
              </div>
            </>
          )}

          {/* ─── PESTAÑA: HISTORIAL ───────────────────────────────── */}
          {activeTab === 'historial' && (
            <div className="space-y-4">
              <Timeline events={events} />
            </div>
          )}

          {/* ─── PESTAÑA: EVIDENCIA (Galería fotográfica dinámica) ─── */}
          {activeTab === 'evidencia' && (
            <EvidenciaTab events={events} onSelectPhoto={setSelectedPhoto} />
          )}
        </div>
      </div>
      {/* Visor Flotante de Evidencias */}
      {selectedPhoto && (
        <GalleryModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </div>
  )
}

export default ViveroDetailScreen