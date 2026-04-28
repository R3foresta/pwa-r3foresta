import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { usePlantasCatalog } from './hooks/usePlantasCatalog'
import type { PlantaCatalogo } from '../../types/plantas.types'

function PlantasScreen() {
  const navigate = useNavigate()
  const { plantas, tiposPlantas, loading, registrarPlanta, actualizarPlanta, eliminarPlanta } = usePlantasCatalog()
  const [search, setSearch] = useState('')
  
  // --- ESTADOS DE UI ---
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null)
  const [selectedPlanta, setSelectedPlanta] = useState<PlantaCatalogo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // --- NUEVOS ESTADOS PARA PROFESIONALIZAR ---
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false) // 👈 Sustituye al alert()

  const initialState = {
    especie: '',
    nombre_cientifico: '',
    nombre_comun_principal: '',
    nombres_comunes: '',
    tipo_planta_id: 0,
    variedad: '',
    notas: ''
  }
  const [formData, setFormData] = useState(initialState)

  const listaSegura = Array.isArray(plantas) ? plantas : [];
  const plantasFiltradas = listaSegura.filter(p => 
    (p.nombre_comun_principal?.toLowerCase() || p.especie?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.nombre_cientifico?.toLowerCase() || '').includes(search.toLowerCase())
  )

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const openModal = (mode: 'create' | 'edit' | 'view', planta?: PlantaCatalogo) => {
    setModalMode(mode)
    setFormErrors({})
    setIsDeletingConfirm(false) // Resetear confirmación
    if (planta) {
      setSelectedPlanta(planta)
      setFormData({
        especie: planta.especie || '',
        nombre_cientifico: planta.nombre_cientifico || '',
        nombre_comun_principal: planta.nombre_comun_principal || '',
        nombres_comunes: planta.nombres_comunes || '',
        tipo_planta_id: planta.tipo_planta_id || 0,
        variedad: planta.variedad || '',
        notas: planta.notas || ''
      })
      setImagePreview(planta.imagen_url || null)
    } else {
      setFormData(initialState)
      setImagePreview(null)
    }
    setShowModal(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.nombre_comun_principal.trim()) errors.nombre_comun_principal = "Obligatorio"
    if (!formData.especie.trim()) errors.especie = "La especie es necesaria"
    if (!formData.nombre_cientifico.trim()) errors.nombre_cientifico = "Obligatorio"
    if (!formData.variedad.trim()) errors.variedad = "La variedad es obligatoria"
    if (formData.tipo_planta_id === 0) errors.tipo_planta_id = "Selecciona un tipo"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const dataToSend = { ...formData, imagen_url: imagePreview }
      const res = modalMode === 'create' 
        ? await registrarPlanta(dataToSend)
        : await actualizarPlanta(selectedPlanta!.id, dataToSend)
      if (res) setShowModal(false)
    } catch (e: any) {
      setFormErrors({ general: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmAndExecuteDelete = async () => {
    if (!selectedPlanta) return
    setIsSubmitting(true)
    
    // Llamamos a la función. Según el error, res es un boolean (true/false)
    const res = await eliminarPlanta(selectedPlanta.id)
    
    if (res) { // Si res es true (se eliminó con éxito)
      setShowModal(false)
    } else {
      // Si res es false, mostramos un error genérico
      setFormErrors({ general: "No se pudo eliminar la especie. Verifique si tiene registros asociados." })
      setIsDeletingConfirm(false)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6 text-brand-700">
      <header className="relative mb-4 flex items-center justify-between font-bold">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft active:scale-90 transition-transform">
                <Icon name="arrow-left" className="h-5 w-5" />
            </button>
            <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-widest text-brand-400 font-black">Admin</p>
                <div className="text-xl text-brand-700">Botánica</div>
            </div>
        </div>
        <button onClick={() => openModal('create')} className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg active:scale-90 transition-transform">
            <Icon name="plus" className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-2 relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input type="text" placeholder="Buscar especie..." className="w-full rounded-2xl border-none bg-white pl-12 pr-4 py-3 shadow-soft ring-1 ring-black/5 focus:ring-brand-500 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="mt-6 flex flex-col gap-3">
        {loading && listaSegura.length === 0 ? (
          <div className="flex flex-col items-center py-20 opacity-40 italic font-bold text-sm">
            <Icon name="search" className="animate-spin h-6 w-6 mb-2"/> 
            Cargando catálogo...
          </div>
        ) : plantasFiltradas.map(planta => (
          <div key={planta.id} onClick={() => openModal('view', planta)} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 active:scale-[0.98] transition-all cursor-pointer">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100">
              {planta.imagen_url ? <img src={planta.imagen_url} className="h-full w-full object-cover" /> : <span className="text-brand-500 font-bold text-xl">{planta.nombre_comun_principal?.[0]}</span>}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="font-bold text-brand-800 leading-tight truncate">{planta.nombre_comun_principal || planta.especie}</span>
              <span className="text-[11px] italic text-brand-400 font-medium truncate">{planta.nombre_cientifico}</span>
            </div>
            <Icon name="arrow-left" className="ml-auto h-4 w-4 rotate-180 text-brand-200" />
          </div>
        ))}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            
            {/* VISTA DE CONFIRMACIÓN DE ELIMINAR (Sustituye al Alert) */}
            {isDeletingConfirm ? (
              <div className="py-6 text-center space-y-6">
                <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Icon name="trash" className="h-10 w-10"/>
                </div>
                <div>
                  <h3 className="text-xl font-black text-brand-700">¿Estás seguro?</h3>
                  <p className="text-sm text-brand-400 font-medium mt-2 px-4">Esta acción eliminará a <span className="text-brand-700 font-bold">"{selectedPlanta?.nombre_comun_principal}"</span> permanentemente del catálogo.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button disabled={isSubmitting} onClick={confirmAndExecuteDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-transform uppercase tracking-widest">
                    {isSubmitting ? "ELIMINANDO..." : "SÍ, ELIMINAR"}
                  </button>
                  <button onClick={() => setIsDeletingConfirm(false)} className="w-full py-3 text-brand-400 font-bold uppercase text-xs tracking-widest">CANCELAR</button>
                </div>
              </div>
            ) : (
              // VISTA NORMAL (FORMULARIO)
              <div className="space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-brand-700">{modalMode === 'create' ? 'Nueva Especie' : modalMode === 'edit' ? 'Editar Especie' : 'Detalles'}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full"><Icon name="x" className="h-5 w-5"/></button>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="h-40 w-40 rounded-3xl bg-brand-50 border-4 border-white shadow-soft flex items-center justify-center overflow-hidden">
                    {imagePreview ? <img src={imagePreview} className="h-full w-full object-cover"/> : <Icon name="photo" className="h-12 w-12 text-brand-200"/>}
                  </div>
                  {modalMode !== 'view' && (
                    <label className="cursor-pointer bg-brand-50 text-brand-600 px-6 py-2 rounded-xl text-xs font-bold border border-brand-100 active:scale-95 transition-transform">
                      {imagePreview ? 'CAMBIAR IMAGEN' : 'SUBIR IMAGEN'}
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden"/>
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                    {/* Campos con validación en rojo debajo */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Nombre Común*</label>
                            <input readOnly={modalMode === 'view'} className={`w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 font-bold ${formErrors.nombre_comun_principal ? 'ring-red-500' : 'ring-black/5'} outline-none focus:ring-brand-500`} 
                            value={formData.nombre_comun_principal} onChange={e => setFormData({...formData, nombre_comun_principal: e.target.value, especie: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Especie (ID)*</label>
                            <input readOnly={modalMode === 'view'} className={`w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 font-bold ${formErrors.especie ? 'ring-red-500' : 'ring-black/5'} outline-none focus:ring-brand-500`} 
                            value={formData.especie} onChange={e => setFormData({...formData, especie: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Nombre Científico*</label>
                            <input readOnly={modalMode === 'view'} className={`w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 font-bold italic ${formErrors.nombre_cientifico ? 'ring-red-500' : 'ring-black/5'} outline-none focus:ring-brand-500`} 
                            value={formData.nombre_cientifico} onChange={e => setFormData({...formData, nombre_cientifico: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Variedad / Raza*</label>
                            <input readOnly={modalMode === 'view'} placeholder="Ej. Criolla, Seleccionada" className={`w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 font-bold ${formErrors.variedad ? 'ring-red-500' : 'ring-black/5'} outline-none focus:ring-brand-500`} 
                            value={formData.variedad} onChange={e => setFormData({...formData, variedad: e.target.value})}/>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Tipo de Planta*</label>
                            <select disabled={modalMode === 'view'} className={`w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 font-bold ${formErrors.tipo_planta_id ? 'ring-red-500' : 'ring-black/5'} outline-none focus:ring-brand-500 appearance-none`}
                            value={formData.tipo_planta_id} onChange={e => setFormData({...formData, tipo_planta_id: Number(e.target.value)})}>
                            <option value="0">Seleccionar...</option>
                            {tiposPlantas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Otros Nombres Comunes</label>
                        <input readOnly={modalMode === 'view'} placeholder="Ej. Roble, Cedro Real" className="w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 ring-black/5 outline-none font-medium" 
                        value={formData.nombres_comunes} onChange={e => setFormData({...formData, nombres_comunes: e.target.value})}/>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-brand-400 uppercase ml-1">Notas</label>
                        <textarea readOnly={modalMode === 'view'} className="w-full p-3.5 rounded-2xl bg-slate-50 border-none ring-1 ring-black/5 min-h-[80px] outline-none font-medium" 
                        value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})}/>
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  {modalMode === 'view' ? (
                    <div className="flex gap-3">
                      <button onClick={() => setModalMode('edit')} className="flex-1 py-4 bg-brand-50 text-brand-600 rounded-2xl font-black border border-brand-100 active:scale-95 transition-transform uppercase tracking-tighter">EDITAR</button>
                      <button onClick={() => setIsDeletingConfirm(true)} className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 active:scale-90 transition-all"><Icon name="trash" className="h-6 w-6"/></button>
                    </div>
                  ) : (
                    <button disabled={isSubmitting} onClick={handleSubmit} className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black shadow-lg shadow-brand-100 disabled:opacity-50 active:scale-95 transition-all uppercase tracking-widest">
                      {isSubmitting ? "PROCESANDO..." : "GUARDAR CAMBIOS"}
                    </button>
                  )}
                  {formErrors.general && <p className="text-red-600 text-center text-[10px] font-black uppercase">{formErrors.general}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlantasScreen