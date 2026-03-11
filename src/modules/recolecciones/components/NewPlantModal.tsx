import Icon from '../../../components/Icon'
import type { TipoPlantaCatalogo } from '../../../services/recolecciones.service'

type NewPlantData = {
  especie: string
  nombre_cientifico: string
  variedad: string
  tipo_planta_id: number
  nombre_comun_principal: string
  nombres_comunes: string
  imagen_url: string
  notas: string
}

type Props = {
  open: boolean
  tiposPlantas: TipoPlantaCatalogo[]
  data: NewPlantData
  imagePreview?: string
  errors: Record<string, boolean>
  submitting: boolean
  onClose: () => void
  onChange: (data: Partial<NewPlantData>) => void
  onSubmit: () => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function NewPlantModal({
  open,
  tiposPlantas,
  data,
  imagePreview,
  errors,
  submitting,
  onClose,
  onChange,
  onSubmit,
  onImageUpload,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md rounded-t-3xl bg-white pb-8 max-h-[90vh] flex flex-col">
        <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-extrabold text-brand-700">Añadir nueva planta</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 text-brand-600 shadow-soft">
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onImageUpload} />
              <Icon name="photo" className="h-6 w-6" />
            </label>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">Vista previa</p>
              {imagePreview ? (
                <img src={imagePreview} alt="Previsualización" className="mt-1 h-16 w-full rounded-xl object-cover" />
              ) : (
                <p className="text-sm font-semibold text-slate-500">Sin imagen</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <p className="text-sm font-semibold text-slate-600">Nombre común</p>
              <input
                value={data.nombre_comun_principal}
                onChange={(e) => onChange({ nombre_comun_principal: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${errors.nombre_comun_principal ? 'border-red-300' : 'border-slate-200'}`}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-sm font-semibold text-slate-600">Nombre científico</p>
              <input
                value={data.nombre_cientifico}
                onChange={(e) => onChange({ nombre_cientifico: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${errors.nombre_cientifico ? 'border-red-300' : 'border-slate-200'}`}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600">Especie</p>
              <input
                value={data.especie}
                onChange={(e) => onChange({ especie: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${errors.especie ? 'border-red-300' : 'border-slate-200'}`}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600">Variedad</p>
              <input
                value={data.variedad}
                onChange={(e) => onChange({ variedad: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600">Tipo planta</p>
              <select
                value={data.tipo_planta_id || ''}
                onChange={(e) => onChange({ tipo_planta_id: Number(e.target.value) })}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${errors.tipo_planta_id ? 'border-red-300' : 'border-slate-200'}`}
              >
                <option value="">Selecciona tipo</option>
                {tiposPlantas.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600">Nombres comunes</p>
              <input
                value={data.nombres_comunes}
                onChange={(e) => onChange({ nombres_comunes: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none border-slate-200"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-sm font-semibold text-slate-600">Notas</p>
              <textarea
                value={data.notas}
                onChange={(e) => onChange({ notas: e.target.value })}
                rows={3}
                className="w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none border-slate-200"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full rounded-2xl bg-brand-500 py-3 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-70"
          >
            {submitting ? 'Guardando...' : 'Guardar planta'}
          </button>
        </div>
      </div>
    </div>
  )
}

export type { NewPlantData }
export default NewPlantModal
