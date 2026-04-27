import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { usePlantasCatalog } from '../recolecciones/hooks/usePlantasCatalog'
import { useState } from 'react'

function PlantasScreen() {
  const navigate = useNavigate()
  const { plantas, loading } = usePlantasCatalog()
  const [search, setSearch] = useState('')

  // Filtrado simple por nombre común o científico
  const plantasFiltradas = plantas.filter(p => 
    (p.nombre_comun_principal?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.nombre_cientifico?.toLowerCase() || '').includes(search.toLowerCase())
  )

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      {/* Header (El que ya tenías) */}
      <header className="relative mb-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft">
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-widest text-brand-500">Gestión</p>
          <div className="text-2xl font-semibold text-brand-700">Catálogo Botánico</div>
        </div>
      </header>

      {/* Buscador */}
      <div className="mt-4 relative">
        <input 
          type="text"
          placeholder="Buscar especie..."
          className="w-full rounded-2xl border-none bg-white px-5 py-3 shadow-soft ring-1 ring-black/5 focus:ring-brand-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Listado de Especies */}
      <section className="mt-6 flex flex-col gap-3">
        {loading ? (
          <p className="text-center py-10 text-brand-400 italic">Cargando catálogo...</p>
        ) : plantasFiltradas.length > 0 ? (
          plantasFiltradas.map(planta => (
            <div key={planta.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
              <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 font-bold">
                {planta.nombre_comun_principal?.[0] || '?'}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-brand-800">
                  {planta.nombre_comun_principal || 'Sin nombre común'}
                </span>
                <span className="text-xs italic text-brand-400">
                  {planta.nombre_cientifico || 'Sin nombre científico'}
                </span>
              </div>
              <Icon name="arrow-left" className="ml-auto h-5 w-5 rotate-180 text-brand-200" />
            </div>
          ))
        ) : (
          <p className="text-center py-10 text-brand-400">No se encontraron especies.</p>
        )}
      </section>

      {/* Botón Flotante para Nueva Planta (Solo Admin debería verlo después) */}
      <button 
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform active:scale-95"
        onClick={() => alert("Aquí abriremos el formulario de nueva planta")}
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>
    </div>
  )
}

export default PlantasScreen
