import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { RecoleccionesV2Service } from '../../services/recolecciones-v2.service'

const MAX_FOTOS = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

function NuevaEvidenciaRecoleccionV2Screen() {
  const navigate = useNavigate()
  const { id } = useParams()

  const recoleccionId = Number(id)

  const [titulo, setTitulo] = useState('Seguimiento de campo')
  const [descripcion, setDescripcion] = useState('')
  const [metadataText, setMetadataText] = useState('{"fuente":"frontend-v2"}')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [fotos, setFotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urls = fotos.map((foto) => URL.createObjectURL(foto))
    setPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [fotos])

  const handleFotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      return
    }

    const accepted: File[] = []

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(`Formato inválido: ${file.name}. Solo JPG/PNG.`)
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(`Imagen demasiado grande: ${file.name}. Máximo 5MB.`)
        continue
      }

      accepted.push(file)
    }

    setFotos((prev) => [...prev, ...accepted].slice(0, MAX_FOTOS))
    event.target.value = ''
  }

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

      await RecoleccionesV2Service.addEvidenciasToRecoleccion(recoleccionId, {
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

            <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-5 text-center text-sm font-bold text-brand-700 transition hover:bg-brand-100">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFotos}
                className="hidden"
              />
              <span>Seleccionar fotos</span>
            </label>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="space-y-1">
                    <div className="h-24 overflow-hidden rounded-2xl bg-slate-100">
                      <img src={url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="w-full rounded-lg bg-slate-100 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
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

export default NuevaEvidenciaRecoleccionV2Screen
