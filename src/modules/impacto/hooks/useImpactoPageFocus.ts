import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Orienta al abrir una página, sin interrumpir filtros, mapa ni cargas posteriores. */
export function useImpactoPageFocus() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const heading = mainRef.current?.querySelector<HTMLHeadingElement>('h1')
    if (!heading) return
    // PageHeader también se usa fuera de Impacto; limitar el foco a esta página.
    heading.tabIndex = -1
    heading.focus()
  }, [pathname])

  return mainRef
}
