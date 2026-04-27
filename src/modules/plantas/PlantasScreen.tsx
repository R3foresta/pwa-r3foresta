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
    // Agregamos pb-32 para que el listado no quede tapado por el botón flotante o el menú
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
        {loading ? (
          <p className="text-center py-10 text-brand-400 italic">Cargando catálogo...</p>
        ) : plantasFiltradas.length > 0 ? (
          plantasFiltradas.map(planta => (
            <div key={planta.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
              
              {/* 🖼️ BLOQUE DEL AVATAR (IMAGEN) ACTUALIZADO */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-brand-50 flex items-center justify-center">
                {planta.imagen_url ? (
                  <img 
                    src={planta.imagen_url} 
                    alt={planta.nombre_comun_principal || 'Planta'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-brand-500 font-bold text-xl">
                    {planta.nombre_comun_principal?.[0] || '?'}
                  </span>
                )}
              </div>

              <div className="flex flex-col flex-1">
                <span className="font-semibold text-brand-800 leading-tight">
                  {planta.nombre_comun_principal || 'Sin nombre común'}
                </span>
                <span className="text-xs italic text-brand-400">
                  {planta.nombre_cientifico}
                </span>
              </div>
              
              <Icon name="arrow-left" className="ml-auto h-5 w-5 rotate-180 text-brand-200" />
            </div>
          ))
        ) : (
          <p className="text-center py-10 text-brand-400">No se encontraron especies.</p>
        )}
      </section>

      {/* ➕ BOTÓN FLOTANTE CON Z-INDEX PARA QUE NO SE OCULTE */}
      <button 
        className="fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-2xl transition-transform active:scale-95 hover:bg-brand-600"
        onClick={() => alert("Próximamente: Formulario de creación")}
      >
        <Icon name="plus" className="h-8 w-8" />
      </button>
    </div>
  )
}

export default PlantasScreen