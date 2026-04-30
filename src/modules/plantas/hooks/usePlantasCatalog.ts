import { useEffect, useState, useCallback } from 'react'
import { PlantasService } from '../../../services/plantas.service' // Cambiado
import type { PlantaCatalogo, TipoPlantaCatalogo } from '../../../types/plantas.types'

export function usePlantasCatalog() {
  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [tiposPlantas, setTiposPlantas] = useState<TipoPlantaCatalogo[]>([])
  const [loading, setLoading] = useState(false)

  const cargarDatos = useCallback(async () => {
  try {
    setLoading(true)
    const [resPlantas, resTipos] = await Promise.all([
      PlantasService.getPlantas(),
      PlantasService.getTiposPlantas()
    ])

    // ✅ CORRECCIÓN: Extraemos el array del campo .data
    const arrayPlantas = (resPlantas as any).data || (Array.isArray(resPlantas) ? resPlantas : []);
    const arrayTipos = (resTipos as any).data || (Array.isArray(resTipos) ? resTipos : []);

    setPlantas(arrayPlantas);
    setTiposPlantas(arrayTipos);

    console.log("🌱 Plantas cargadas:", arrayPlantas); // Agrega esto para estar seguro
  } catch (error) {
    console.error("Error al cargar datos botánicos:", error)
  } finally {
    setLoading(false)
  }
}, [])

  useEffect(() => { void cargarDatos() }, [cargarDatos])

  const registrarPlanta = async (dto: any) => {
    const res = await PlantasService.createPlanta(dto)
    if (res) await cargarDatos()
    return res
  }

  const actualizarPlanta = async (id: number, dto: any) => {
    const res = await PlantasService.updatePlanta(id, dto)
    if (res) await cargarDatos()
    return res
  }

  const eliminarPlanta = async (id: number) => {
  try {
    const ok = await PlantasService.deletePlanta(id);
    if (ok) await cargarDatos();
    return ok; // Esto devuelve true o false
  } catch (error) {
    console.error(error);
    return false;
  }
};

  return { plantas, tiposPlantas, loading, registrarPlanta, actualizarPlanta, eliminarPlanta, refresh: cargarDatos }
}