import { useEffect, useReducer, useState } from 'react'
import { ReporteViveroConsultaError } from './reporte-vivero.api'
import type { FiltrosVivero, ReporteVivero } from './reporte-vivero.contract'

type OpcionesVivero = ReporteVivero['opciones']

export function useLecturaVivero<F extends FiltrosVivero, T extends { opciones: OpcionesVivero }>(
  consultar: (filtros: F, token: string, signal: AbortSignal) => Promise<T>,
  filtros: F,
  token: string,
) {
  const [intento, reintentar] = useReducer((actual: number) => actual + 1, 0)
  const [resultado, setResultado] = useState<{
    filtros: F
    token: string
    intento: number
    datos: T | null
    error: string | null
  } | null>(null)
  const [catalogo, setCatalogo] = useState<{ token: string; opciones: OpcionesVivero } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void consultar(filtros, token, controller.signal).then((datos) => {
      if (controller.signal.aborted) return
      setCatalogo({ token, opciones: datos.opciones })
      setResultado({ filtros, token, intento, datos, error: null })
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      if (cause instanceof ReporteViveroConsultaError && (cause.status === 401 || cause.status === 403)) setCatalogo(null)
      const error = cause instanceof Error ? cause.message : 'No pudimos completar la consulta. Intenta de nuevo.'
      setResultado({ filtros, token, intento, datos: null, error })
    })
    return () => controller.abort()
  }, [consultar, filtros, token, intento])

  const actual = resultado?.token === token && resultado.filtros === filtros && resultado.intento === intento ? resultado : null
  return {
    datos: actual?.datos ?? null,
    error: actual?.error ?? null,
    cargando: actual === null,
    opciones: catalogo?.token === token ? catalogo.opciones : null,
    reintentar,
  }
}
