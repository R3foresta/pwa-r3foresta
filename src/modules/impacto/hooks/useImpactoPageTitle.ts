import { useEffect } from 'react'

/** Identifica la consulta pública en pestañas e historial del navegador. */
export function useImpactoPageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · R3foresta`
    return () => { document.title = previous }
  }, [title])
}
