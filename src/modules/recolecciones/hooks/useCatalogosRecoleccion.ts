import { useEffect, useState } from 'react'
import type { MetodoRecoleccionCatalogo } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'

export function useCatalogosRecoleccion(formMetodoId?: number) {
  const [metodos, setMetodos] = useState<MetodoRecoleccionCatalogo[]>([])
  const [metodoId, setMetodoId] = useState<number | undefined>(formMetodoId)
  const [methodName, setMethodName] = useState<string>('')
  const [loadingMetodos, setLoadingMetodos] = useState(false)

  useEffect(() => {
    let mounted = true
    const cargarMetodos = async () => {
      try {
        setLoadingMetodos(true)
        const metodosBackend = await RecoleccionesService.getMetodos()
        if (!mounted) return
        setMetodos(metodosBackend)

        if (formMetodoId) {
          const metodoGuardado = metodosBackend.find((m) => m.id === formMetodoId)
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
    return () => { mounted = false }
  }, [formMetodoId])

  return {
    metodos,
    metodoId,
    setMetodoId,
    methodName,
    setMethodName,
    loadingMetodos
  }
}