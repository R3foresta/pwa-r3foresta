import { useEffect, useState } from 'react'
import type { PlantaCatalogo, TipoPlantaCatalogo } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'

export function usePlantasCatalog(formPlantaId?: number) {
  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [tiposPlantas, setTiposPlantas] = useState<TipoPlantaCatalogo[]>([])
  const [selectedPlanta, setSelectedPlanta] = useState<PlantaCatalogo | null>(null)
  const [loading, setLoading] = useState(false)

  // Cargar Catálogo de Plantas
  useEffect(() => {
    let mounted = true
    const cargarPlantas = async () => {
      try {
        setLoading(true)
        const data = await RecoleccionesService.getPlantas()
        if (!mounted) return
        setPlantas(data)
        if (formPlantaId) {
          const found = data.find((p) => p.id === formPlantaId)
          if (found) setSelectedPlanta(found)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void cargarPlantas()
    return () => { mounted = false }
  }, [formPlantaId])

  // Cargar Tipos de Plantas (Árbol, Arbusto, etc.)
  useEffect(() => {
    let mounted = true
    const cargarTipos = async () => {
      try {
        const tipos = await RecoleccionesService.getTiposPlantas()
        if (mounted) setTiposPlantas(tipos)
      } catch (error) {
        console.error("Error cargando tipos de plantas", error)
      }
    }
    void cargarTipos()
    return () => { mounted = false }
  }, [])

  return { 
    plantas, 
    tiposPlantas, 
    selectedPlanta, 
    setSelectedPlanta, 
    loading 
  }
}