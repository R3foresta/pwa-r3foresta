import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { usePlantasCatalog } from '../recolecciones/hooks/usePlantasCatalog'
import { useState } from 'react'

function PlantasScreen() {
  const navigate = useNavigate()
  const { plantas, tiposPlantas, loading, registrarPlanta } = usePlantasCatalog()
  const [search, setSearch] = useState('')
  
  // --- ESTADOS PARA REGISTRO ---
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    especie: '',
    nombre_cientifico: '',
    nombre_comun_principal: '',
    tipo_planta_id: 0,
    variedad: 'ESTÁNDAR',
    notas: ''
  })

  // Filtrado de búsqueda
  const plantasFiltradas = plantas.filter(p => 
    (p.nombre_comun_principal?.toLowerCase() || p.especie?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.nombre_cientifico?.toLowerCase() || '').includes(search.toLowerCase())
  )

  // --- LÓGICA DE IMAGEN (Base64) ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // --- ENVIAR AL BACKEND ---
  const handleSubmit = async () => {
    if (!formData.nombre_cientifico || !formData.tipo_planta_id) {
      alert("Nombre científico y Tipo son obligatorios")
      return
    }
    setIsSubmitting(true)
    const result = await registrarPlanta({
      ...formData,
      imagen_url: imagePreview // El backend lo procesará como Base64
    })
    
    if (result.success) {
      setShowModal(false)
      resetForm()
    } else {
      alert("Error: " + result.error)
    }
    setIsSubmitting(false)
  }

  const resetForm = () => {
    setFormData({ especie: '', nombre_cientifico: '', nombre_comun_principal: '', tipo_planta_id: 0, variedad: 'ESTÁNDAR', notas: '' })
    setImagePreview(null)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6 text-brand-700">
      <header className="relative mb-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft">
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-widest text-brand-500">Gestión</p>
          <div className="text-2xl font-semibold text-brand-700">Catálogo Botánico</div>
        </div>
      </header>

      <div className="mt-4 relative">
        <input 
          type="text"
          placeholder="Buscar especie..."
          className="w-full rounded-2xl border-none bg-white px-5 py-3 shadow-soft ring-1 ring-black/5 focus:ring-brand-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="mt-6 flex flex-col gap-3">
        {loading && plantas.length === 0 ? (
          <p className="text-center py-10 text-brand-400 italic">Cargando catálogo...</p>
        ) : plantasFiltradas.length > 0 ? (
          plantasFiltradas.map(planta => (
            <div key={planta.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-brand-50 flex items-center justify-center">
                {planta.imagen_url ? (
                  <img src={planta.imagen_url} alt="Planta" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-brand-500 font-bold text-xl">{planta.nombre_comun_principal?.[0] || '?'}</span>
                )}
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-brand-800 leading-tight">{planta.nombre_comun_principal || planta.especie}</span>
                <span className="text-xs italic text-brand-400">{planta.nombre_cientifico}</span>
              </div>
              <Icon name="arrow-left" className="ml-auto h-5 w-5 rotate-180 text-brand-200" />
            </div>
          ))
        ) : (
          <p className="text-center py-10 text-brand-400">No se encontraron especies.</p>
        )}
      </section>

      {/* BOTÓN FLOTANTE */}
      <button 
        className="fixed bottom-8 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-2xl active:scale-95 transition-transform"
        onClick={() => setShowModal(true)}
      >
        <Icon name="plus" className="h-8 w-8" />
      </button>

      {/* --- MODAL DE REGISTRO --- */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-700">Nueva Especie</h2>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full"><Icon name="x" className="h-5 w-5"/></button>
            </div>

            <div className="space-y-4">
              {/* Foto */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-24 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center overflow-hidden">
                  {imagePreview ? <img src={imagePreview} className="h-full w-full object-cover"/> : <Icon name="photo" className="h-8 w-8 text-brand-300"/>}
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-brand-500"/>
              </div>

              <input placeholder="Nombre Común" className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5" 
                value={formData.nombre_comun_principal} onChange={e => setFormData({...formData, nombre_comun_principal: e.target.value, especie: e.target.value})}/>
              
              <input placeholder="Nombre Científico *" className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5" 
                value={formData.nombre_cientifico} onChange={e => setFormData({...formData, nombre_cientifico: e.target.value})}/>

              <select className="w-full p-3 rounded-xl bg-slate-50 border-none ring-1 ring-black/5"
                onChange={e => setFormData({...formData, tipo_planta_id: Number(e.target.value)})}>
                <option value="0">Seleccionar Tipo *</option>
                {tiposPlantas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>

              <button 
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? "Registrando..." : "Guardar en Catálogo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlantasScreen