import { useEffect, useState } from 'react'
import { RecoleccionesService, type ViveroCatalogo } from '../../../services/recolecciones.service'
import { PlantasService } from '../../../services/plantas.service'
import { exactId } from '../../accesos/accessPolicy'
import type { PlantaSeleccionable } from '../../plantas/components/PlantSelector'

type Catalogos = { viveros: (ViveroCatalogo & { id: string })[]; plantas: (PlantaSeleccionable & { id: string })[] }
export function useIncorporacionCatalogos(token: string) {
  const [data, setData] = useState<Catalogos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const current = () => active && localStorage.getItem('authToken') === token
    const plantas = async () => {
      const all: Catalogos['plantas'] = []
      let page = 1
      do {
        if (!current()) return []
        const response = await PlantasService.listPlantas({ page, limit: 200, incluir_inactivas: false })
        if (!Array.isArray(response.data) || response.pagination?.page !== page) throw new Error('No se pudo comprobar el catálogo completo de especies.')
        all.push(...response.data.map(item => ({ ...item, id: exactId(item.id) })))
        if (!response.pagination.hasNextPage) break
        page += 1
      } while (page <= 1000)
      if (page > 1000 || new Set(all.map(item => item.id)).size !== all.length) throw new Error('No se pudo comprobar el catálogo de especies. Vuelve a consultar.')
      return all
    }
    Promise.all([RecoleccionesService.getViveros(), plantas()]).then(([viveros, plantas]) => {
      if (current()) { setData({ viveros: viveros.map(item => ({ ...item, id: exactId(item.id) })), plantas }); setError(null) }
    }, error => { if (current()) { setError(error instanceof Error ? error.message : 'No se pudieron cargar los catálogos.'); setData(null) } })
    return () => { active = false }
  }, [attempt, token])
  return { data, error, loading: data === null && error === null, retry: () => { setData(null); setError(null); setAttempt(value => value + 1) } }
}
