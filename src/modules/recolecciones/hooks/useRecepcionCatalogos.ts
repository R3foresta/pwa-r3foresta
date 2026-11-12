import { useEffect, useState } from 'react'
import { exactId } from '../../accesos/accessPolicy'
import { RecoleccionesService } from '../../../services/recolecciones.service'

type Catalogo = Record<string, string>
type Catalogos = { actor: string; viveros: Catalogo; metodos: Catalogo; warning: string | null }

function nombresPorId(rows: readonly { id: number | string; nombre: string }[]): Catalogo {
  return Object.fromEntries(rows.map(row => {
    const id = exactId(row.id)
    if (typeof row.nombre !== 'string' || !row.nombre.trim()) throw new Error('Nombre de catálogo no disponible.')
    return [id, row.nombre]
  }))
}

/** Etiquetas públicas de presentación: no completan snapshots ni conceden permisos. */
export function useRecepcionCatalogos(actor: string, enabled: boolean) {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    void Promise.allSettled([
      RecoleccionesService.getViveros().then(nombresPorId),
      RecoleccionesService.getMetodos().then(nombresPorId),
    ]).then(([viveros, metodos]) => {
      if (!active) return
      const fallidos = [viveros.status === 'rejected' ? 'viveros' : '', metodos.status === 'rejected' ? 'métodos' : ''].filter(Boolean)
      setCatalogos({
        actor,
        viveros: viveros.status === 'fulfilled' ? viveros.value : {},
        metodos: metodos.status === 'fulfilled' ? metodos.value : {},
        warning: fallidos.length ? `No se pudieron cargar los nombres de ${fallidos.join(' y ')}. Puedes continuar con sus identificadores.` : null,
      })
    })
    return () => { active = false }
  }, [actor, enabled])

  const actual = enabled && catalogos?.actor === actor ? catalogos : null
  return {
    viveros: actual?.viveros ?? {},
    metodos: actual?.metodos ?? {},
    loading: enabled && !actual,
    warning: actual?.warning ?? null,
  }
}
