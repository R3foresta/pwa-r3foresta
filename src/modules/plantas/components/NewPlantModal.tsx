import Icon from '../../../components/Icon'
import type { TipoPlantaCatalogo } from '../../../types/plantas.types'

type Props = {
  open: boolean
  mode: 'create' | 'edit' | 'view' // Añadimos modo para reutilizarlo
  tiposPlantas: TipoPlantaCatalogo[]
  data: any
  imagePreview?: string | null
  submitting: boolean
  onClose: () => void
  onChange: (data: any) => void
  onSubmit: () => void
  onDelete?: () => void // Para cumplir lo que pidió Pablo
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function NewPlantModal({
  open,
  mode,
  tiposPlantas,
  data,
  imagePreview,
  submitting,
  onClose,
  onChange,
  onSubmit,
  onDelete,
  onImageUpload,
}: Props) {
  if (!open) return null

  const isView = mode === 'view'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-brand-700">
            {mode === 'create' ? 'Nueva Especie' : mode === 'edit' ? 'Editar Especie' : 'Detalles de Especie'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Foto */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-32 w-32 rounded-3xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} className="h-full w-full object-cover" alt="Planta" />
              ) : (
                <Icon name="photo" className="h-10 w-10 text-brand-200" />
              )}
            </div>
            {!isView && (
              <label className="cursor-pointer text-xs font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-lg">
                SUBIR FOTO
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-brand-500 uppercase ml-1">Nombre Común</label>
              <input
                readOnly={isView}
                placeholder="Ej. Caoba"
                value={data.nombre_comun_principal}
                onChange={(e) => onChange({ ...data, nombre_comun_principal: e.target.value, especie: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-brand-500 uppercase ml-1">Nombre Científico *</label>
              <input
                readOnly={isView}
                placeholder="Ej. Swietenia macrophylla"
                value={data.nombre_cientifico}
                onChange={(e) => onChange({ ...data, nombre_cientifico: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-brand-500 uppercase ml-1">Tipo de Planta *</label>
              <select
                disabled={isView}
                value={data.tipo_planta_id || ''}
                onChange={(e) => onChange({ ...data, tipo_planta_id: Number(e.target.value) })}
                className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5 focus:ring-brand-500 outline-none"
              >
                <option value="">Seleccionar tipo...</option>
                {tiposPlantas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-brand-500 uppercase ml-1">Notas</label>
              <textarea
                readOnly={isView}
                placeholder="Información adicional..."
                value={data.notas || ''}
                onChange={(e) => onChange({ ...data, notas: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5 min-h-[80px] outline-none"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-4 flex flex-col gap-3">
            {isView ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onChange({ mode: 'edit' })} // Esto lo manejaremos en la Screen
                  className="flex-1 py-3 bg-brand-50 text-brand-600 rounded-2xl font-bold border border-brand-100"
                >
                  EDITAR
                </button>
                <button
                  onClick={onDelete}
                  className="p-3 bg-red-50 text-red-500 rounded-2xl active:bg-red-100"
                >
                  <Icon name="trash" className="h-6 w-6" />
                </button>
              </div>
            ) : (
              <button
                disabled={submitting}
                onClick={onSubmit}
                className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {submitting ? 'PROCESANDO...' : mode === 'create' ? 'GUARDAR ESPECIE' : 'ACTUALIZAR CAMBIOS'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewPlantModal