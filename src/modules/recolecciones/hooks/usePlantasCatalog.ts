import { useEffect, useState, useCallback } from 'react'
import type { PlantaCatalogo, TipoPlantaCatalogo } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'

export function usePlantasCatalog(formPlantaId?: number) {
  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [tiposPlantas, setTiposPlantas] = useState<TipoPlantaCatalogo[]>([])
  const [selectedPlanta, setSelectedPlanta] = useState<PlantaCatalogo | null>(null)
  const [loading, setLoading] = useState(false)

  // 1. Cargar Catálogo de Plantas
  const cargarPlantas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await RecoleccionesService.getPlantas()
      
      // ✅ AJUSTE: Si el servicio devuelve el array directo, lo usamos tal cual.
      // Si el servicio devolviera un objeto con 'data', usaríamos: (res as any).data || res
      const lista = Array.isArray(res) ? res : (res as any).data || []
      setPlantas(lista)

      if (formPlantaId) {
        const found = lista.find((p: PlantaCatalogo) => p.id === formPlantaId)
        if (found) setSelectedPlanta(found)
      }
    } catch (error) {
      console.error("Error al cargar catálogo botánico:", error)
    } finally {
      setLoading(false)
    }
  }, [formPlantaId])

  // 2. Cargar Tipos de Plantas (Árbol, Arbusto, etc.)
  useEffect(() => {
    const cargarTipos = async () => {
      try {
        const res = await RecoleccionesService.getTiposPlantas()
        
        // ✅ CORRECCIÓN DEL ERROR: res ya es el array 'TipoPlantaCatalogo[]'
        // No entres a res.data, usa res directamente.
        setTiposPlantas(Array.isArray(res) ? res : (res as any).data || [])
      } catch (error) {
        console.error("Error cargando tipos de plantas", error)
      }
    }
    void cargarTipos()
  }, [])

  // 3. Registrar Planta (Tu backend devuelve {success: boolean, data: PlantaCatalogo})
  const registrarPlanta = async (dto: any) => {
    try {
      setLoading(true)
      const res = await RecoleccionesService.createPlanta(dto)
      // Aquí sí usamos .success porque tu método createPlanta lo devuelve así
      if (res.success) {
        await cargarPlantas()
        return { success: true, data: res.data }
      }
      return { success: false, error: 'Error al procesar respuesta' }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarPlantas()
  }, [cargarPlantas])

  return { 
    plantas, 
    tiposPlantas, 
    selectedPlanta, 
    setSelectedPlanta, 
    loading,
    registrarPlanta,
    refresh: cargarPlantas
  }
}