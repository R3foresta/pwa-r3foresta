import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { RecoleccionesService } from '../../services/recolecciones.service'
import { MAX_FOTOS_POR_TIPO as MAX_FOTOS_FORM } from './validators/recoleccionForm'
import PhotoPicker from './components/PhotoPicker'
import type { RecoleccionPhoto } from './recoleccionFormTypes'
<<<<<<< HEAD
=======
import { revokePhotoPreviewUrls } from './utils/photoPreviewUrls'
>>>>>>> 39f969ba2faab6afc3e2bf961073b40254ecb13f

function RecoleccionNuevaEvidenciaScreen() {
  const navigate = useNavigate()
  const { id } = useParams()

  const recoleccionId = Number(id)

  const [titulo, setTitulo] = useState('Seguimiento de campo')
  const [descripcion, setDescripcion] = useState('')
  const [metadataText, setMetadataText] = useState('{"fuente":"frontend-v2"}')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [fotos, setFotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<RecoleccionPhoto[]>([])
<<<<<<< HEAD
=======
  const photoPreviewsRef = useRef(photoPreviews)
>>>>>>> 39f969ba2faab6afc3e2bf961073b40254ecb13f
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const MAX_FOTOS = MAX_FOTOS_FORM

  useEffect(() => {
    photoPreviewsRef.current = photoPreviews
  }, [photoPreviews])

  useEffect(() => {
    return () => {
      revokePhotoPreviewUrls(photoPreviewsRef.current)
    }
  }, [])

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!Number.isFinite(recoleccionId) || recoleccionId <= 0) {
      setError('ID de recolección inválido.')
      return
    }

    if (fotos.length < 1) {
      setError('Debes seleccionar al menos una foto.')
      return
    }

    let metadata: Record<string, unknown> | undefined
    if (metadataText.trim()) {
      try {
        const parsed = JSON.parse(metadataText)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          metadata = parsed as Record<string, unknown>
        } else {
          setError('Metadata debe ser un objeto JSON válido.')
          return
        }
      } catch {
        setError('Metadata JSON inválido.')
        return
      }
    }

    try {
      setSubmitting(true)

      await RecoleccionesService.addEvidenciasToRecoleccion(recoleccionId, {
        titulo,
        descripcion,
        metadata,
        es_principal: esPrincipal,
        fotos,
      })

      navigate(`/app/collections/${recoleccionId}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudieron subir las evidencias.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="px-5 pb-4 pt-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(`/app/collections/${recoleccionId}`)}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-extrabold text-brand-700">Agregar Evidencias</h1>
          <p className="text-sm font-semibold text-brand-500">Recolección #{Number.isFinite(recoleccionId) ? recoleccionId : 'N/A'}</p>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 px-5 pb-8">
          <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Título</span>
              <input
                type="text"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Descripción</span>
              <textarea
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
              <textarea
                value={metadataText}
                onChange={(event) => setMetadataText(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={esPrincipal}
                onChange={(event) => setEsPrincipal(event.target.checked)}
                className="h-4 w-4"
              />
              Marcar como evidencia principal
            </label>
          </section>

          <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Fotos</h2>
              <span className="text-xs font-semibold text-slate-500">{fotos.length}/{MAX_FOTOS}</span>
            </div>

            <PhotoPicker
              label="Evidencias"
              photos={photoPreviews}
              maxPhotos={MAX_FOTOS}
              onChange={(next) => setPhotoPreviews(next)}
              onFilesAccepted={(accepted) => {
                const remaining = Math.max(0, MAX_FOTOS - fotos.length)
                const trimmed = accepted.slice(0, remaining)
                if (trimmed.length === 0) return
                setFotos((prev) => [...prev, ...trimmed].slice(0, MAX_FOTOS))
                setError(null)
              }}
              onRemove={(index) => removeFoto(index)}
            />

            {error && (
              <p className="text-xs font-semibold text-red-500">{error}</p>
            )}
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-brand-500 py-4 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Subiendo evidencias...' : 'Subir evidencias'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RecoleccionNuevaEvidenciaScreen
