import { useEffect, useState } from 'react'
import type { MetodoRecoleccionCatalogo, PlantaCatalogo, TipoPlantaCatalogo } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'

export function useCatalogosRecoleccion(formPlantaId?: number, formMetodoId?: number) {
  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [tiposPlantas, setTiposPlantas] = useState<TipoPlantaCatalogo[]>([])
  const [metodos, setMetodos] = useState<MetodoRecoleccionCatalogo[]>([])

  const [selectedPlanta, setSelectedPlanta] = useState<PlantaCatalogo | null>(null)
  const [metodoId, setMetodoId] = useState<number | undefined>(formMetodoId)
  const [methodName, setMethodName] = useState<string>('')

  const [loadingPlantas, setLoadingPlantas] = useState(false)
  const [loadingTiposPlantas, setLoadingTiposPlantas] = useState(false)
  const [loadingMetodos, setLoadingMetodos] = useState(false)

  useEffect(() => {
    let mounted = true
    const cargarPlantas = async () => {
      try {
        setLoadingPlantas(true)
        const plantasBackend = await RecoleccionesService.getPlantas()
        if (!mounted) return
        setPlantas(plantasBackend)
        if (formPlantaId) {
          const plantaGuardada = plantasBackend.find((p: PlantaCatalogo) => p.id === formPlantaId)
          if (plantaGuardada) setSelectedPlanta(plantaGuardada)
        }
      } finally {
        if (mounted) setLoadingPlantas(false)
      }
    }
    void cargarPlantas()
    return () => {
      mounted = false
    }
  }, [formPlantaId])

  useEffect(() => {
    let mounted = true
    const cargarTiposPlantas = async () => {
      try {
        setLoadingTiposPlantas(true)
        const tipos = await RecoleccionesService.getTiposPlantas()
        if (!mounted) return
        setTiposPlantas(tipos)
      } finally {
        if (mounted) setLoadingTiposPlantas(false)
      }
    }
    void cargarTiposPlantas()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const cargarMetodos = async () => {
      try {
        setLoadingMetodos(true)
        const metodosBackend = await RecoleccionesService.getMetodos()
        if (!mounted) return
        setMetodos(metodosBackend)

        if (formMetodoId) {
          const metodoGuardado = metodosBackend.find((m: MetodoRecoleccionCatalogo) => m.id === formMetodoId)
          if (metodoGuardado) {
            setMetodoId(metodoGuardado.id)
            setMethodName(metodoGuardado.nombre)
          }
        }
      } finally {
        if (mounted) setLoadingMetodos(false)
      }
    }
    void cargarMetodos()
    return () => {
      mounted = false
    }
  }, [formMetodoId])

  return {
    plantas,
    tiposPlantas,
    metodos,
    setPlantas,
    setTiposPlantas,
    selectedPlanta,
    setSelectedPlanta,
    metodoId,
    setMetodoId,
    methodName,
    setMethodName,
    loadingPlantas,
    loadingTiposPlantas,
    loadingMetodos,
  }
}
