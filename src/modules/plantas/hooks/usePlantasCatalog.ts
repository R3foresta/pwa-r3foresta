import { useCallback, useEffect, useState } from 'react'
import { PlantasService } from '../../../services/plantas.service'
import type { PlantaCatalogo, TipoPlantaCatalogo } from '../../../types/plantas.types'

const SELECTOR_LIMIT = 200

/**
 * Carga el catálogo de plantas activas + tipos. Pensado para selectores
 * (p. ej. en el flujo de recolecciones). Para administración usar el
 * servicio directamente con paginación.
 */
export function usePlantasCatalog() {
  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [tiposPlantas, setTiposPlantas] = useState<TipoPlantaCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [listResponse, tipos] = await Promise.all([
        PlantasService.listPlantas({ limit: SELECTOR_LIMIT, incluir_inactivas: false }),
        PlantasService.getTiposPlantas(),
      ])
      setPlantas(listResponse.data ?? [])
      setTiposPlantas(tipos ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando catálogo de plantas.'
      setError(message)
      setPlantas([])
      setTiposPlantas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  return { plantas, tiposPlantas, loading, error, refresh: cargarDatos }
}
