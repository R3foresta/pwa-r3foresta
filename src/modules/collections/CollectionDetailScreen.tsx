import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { RecoleccionService } from '../../services/recoleccion.service'
import type { Recoleccion } from '../../services/recoleccion.service'

function CollectionDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recoleccion, setRecoleccion] = useState<Recoleccion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarDetalle = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        const response = await RecoleccionService.getById(Number(id))
        setRecoleccion(response.data)
        
        // Log para debugging - ver qué fotos recibimos
        console.log('📸 Fotos recibidas del backend:', response.data.fotos)
        if (response.data.fotos.length > 0) {
          console.log('🔗 Primera URL de foto:', response.data.fotos[0].url)
        }
      } catch (err) {
        console.error('Error cargando detalle:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar la recolección')
      } finally {
        setLoading(false)
      }
    }

    cargarDetalle()
  }, [id])

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatFechaHora = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const getTipoMaterialLabel = (tipo: string) => {
    switch (tipo) {
      case 'SEMILLA': return 'Semilla'
      case 'ESTACA': return 'Esqueje'
      case 'PLANTULA': return 'Plántula'
      case 'INJERTO': return 'Injerto'
      default: return tipo
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'ALMACENADO': return 'Almacenado'
      case 'EN_PROCESO': return 'En Proceso'
      case 'UTILIZADO': return 'Utilizado'
      case 'DESCARTADO': return 'Descartado'
      default: return estado
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <p className="mt-4 text-sm font-semibold text-brand-700">Cargando recolección...</p>
        </div>
      </div>
    )
  }

  if (error || !recoleccion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Icon name="x" className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Recolección no encontrada</h2>
          <p className="mt-2 text-sm text-slate-600">{error || 'No se pudo cargar la información'}</p>
          <button
            onClick={() => navigate('/app/collections')}
            className="mt-4 rounded-xl bg-brand-500 px-6 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            Volver a recolecciones
          </button>
        </div>
      </div>
    )
  }

  const nombrePlanta = recoleccion.planta?.especie || recoleccion.nombre_comercial || 'Sin especie'
  const nombreCientifico = recoleccion.planta?.nombre_cientifico || recoleccion.nombre_cientifico

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="relative flex items-center justify-center px-5 pb-4 pt-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections')}
            className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              ID #{recoleccion.id}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">
              Detalle de Recolección
            </h1>
            <p className="text-sm font-semibold text-brand-500">{formatFecha(recoleccion.fecha)}</p>
          </div>
        </header>

        <div className="flex-1 space-y-6 px-5">
          {/* Material recolectado */}
          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Material recolectado</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="mt-3 space-y-3 text-sm font-semibold text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Especie</span>
                <span className="text-right">{nombrePlanta}</span>
              </div>
              {nombreCientifico && (
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>Nombre científico</span>
                  <span className="text-right italic">{nombreCientifico}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Tipo de material</span>
                <span>{getTipoMaterialLabel(recoleccion.tipo_material)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Cantidad</span>
                <span>{recoleccion.cantidad} {recoleccion.unidad}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Método</span>
                <span>{recoleccion.metodo.nombre}</span>
              </div>
              {recoleccion.metodo.descripcion && (
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-xs text-slate-500">Descripción del método</p>
                  <p className="mt-1 text-sm">{recoleccion.metodo.descripcion}</p>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Recolector</span>
                <span>{recoleccion.usuario.nombre}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Estado</span>
                <span>{getEstadoLabel(recoleccion.estado)}</span>
              </div>
              {recoleccion.especie_nueva && (
                <div className="rounded-xl bg-amber-50 px-3 py-2 border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <div>
                      <p className="text-xs font-bold text-amber-700">Nuevo Hallazgo</p>
                      <p className="text-xs text-amber-600">Esta es una especie nueva registrada</p>
                    </div>
                  </div>
                </div>
              )}
              {recoleccion.observaciones && (
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-xs text-slate-500">Observaciones</p>
                  <p className="mt-1 text-sm text-slate-800">{recoleccion.observaciones}</p>
                </div>
              )}
            </div>
          </section>

          {/* Ubicación */}
          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Ubicación</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="mt-3 space-y-3 text-sm font-semibold text-slate-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Recolección</p>
                <p className="mt-1">
                  {[
                    recoleccion.ubicacion.comunidad,
                    recoleccion.ubicacion.provincia,
                    recoleccion.ubicacion.departamento,
                    recoleccion.ubicacion.pais
                  ].filter(Boolean).join(', ')}
                </p>
                {recoleccion.ubicacion.zona && (
                  <p className="text-slate-600">Zona: {recoleccion.ubicacion.zona}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  📍 {recoleccion.ubicacion.latitud.toFixed(6)}, {recoleccion.ubicacion.longitud.toFixed(6)}
                </p>
              </div>
              {recoleccion.vivero && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Almacenamiento</p>
                  <p className="mt-1">{recoleccion.vivero.nombre}</p>
                  <p className="text-xs text-slate-600">Código: {recoleccion.vivero.codigo}</p>
                  {recoleccion.vivero.ubicacion && (
                    <p className="text-sm text-slate-600">
                      {recoleccion.vivero.ubicacion.comunidad}, {recoleccion.vivero.ubicacion.departamento}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Evidencia fotográfica */}
          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Evidencia fotográfica</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            {recoleccion.fotos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {recoleccion.fotos.map((foto) => (
                  <div key={foto.id} className="space-y-1">
                    <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100 bg-slate-50">
                      <img
                        src={foto.url}
                        alt={`Foto ${foto.id}`}
                        className="h-24 w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('❌ Error cargando imagen:', foto.url)
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div class="flex flex-col items-center justify-center h-24 bg-red-50 p-2">
                                <svg class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p class="text-xs text-red-600 mt-1 text-center">Error al cargar</p>
                              </div>
                            `
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-500 text-center">
                      {foto.formato} • {(foto.peso_bytes / 1024).toFixed(0)}KB
                    </p>
                    {/* URL para debugging - remover en producción */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-slate-400 hover:text-slate-600">Ver URL</summary>
                      <p className="mt-1 break-all text-slate-500">{foto.url}</p>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-center py-6">
                <Icon name="photo" className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">Sin fotos</p>
              </div>
            )}
          </section>

          {/* Información adicional */}
          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <h2 className="text-lg font-extrabold text-brand-700">Información del registro</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Fecha de registro</span>
                <span>{formatFechaHora(recoleccion.created_at)}</span>
              </div>
              {recoleccion.updated_at !== recoleccion.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Última actualización</span>
                  <span>{formatFechaHora(recoleccion.updated_at)}</span>
                </div>
              )}
              {recoleccion.planta && (
                <>
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Información de la planta</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Variedad</span>
                        <span>{recoleccion.planta.variedad}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Fuente</span>
                        <span>{recoleccion.planta.fuente}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Detalles de Blockchain */}
              {recoleccion.blockchain_url && (
                <div className="border-t border-slate-100 pt-2 mt-2 pb-9">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Detalles de Blockchain</p>
                  <div className="space-y-2">
                    {recoleccion.token_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Token ID</span>
                        <span className="font-mono text-xs">{recoleccion.token_id}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-600 text-sm">Blockchain Explorer</span>
                      <a 
                        href={recoleccion.blockchain_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition"
                      >
                        <Icon name="arrow-left" className="h-4 w-4 rotate-180" />
                        Ver NFT en Explorer
                      </a>
                    </div>
                    {recoleccion.transaction_hash && (
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-600 text-sm">Transaction Hash</span>
                        <code className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                          {recoleccion.transaction_hash}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CollectionDetailScreen
