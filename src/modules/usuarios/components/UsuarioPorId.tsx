import { useEffect, useRef, useState } from 'react'
import { Button, inputClasses } from '../../../components/ui'
import { UsuariosService, ParticipacionApiError } from '../api/usuarios.api'
import { validarId } from '../../participacion/api/participacion.contract'
import type { UsuarioAdministracion } from '../types'
import type { UsuariosAccessIssue } from '../hooks/useUsuariosAdministracion'

// El directorio sólo lista cuentas activas; una vigencia conservada puede retirarse
// de una cuenta inactiva consultando su autoridad por ID conocido, sin inventar filtros.
export default function UsuarioPorId({ actorId, disabled, onSelect, onAccessIssue }: { actorId: string; disabled: boolean; onSelect: (person: UsuarioAdministracion) => void; onAccessIssue: (issue: UsuariosAccessIssue) => void }) {
  const [id, setId] = useState(''), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [actorId, disabled])
  async function read() {
    if (disabled || loading) return
    const controller = new AbortController(); request.current = controller
    setLoading(true); setError(null)
    try {
      const result = await UsuariosService.autoridad(actorId, validarId(id.trim()), controller.signal)
      if (!controller.signal.aborted) onSelect({ ...result.data, username: null })
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : 'No se pudo consultar la cuenta.')
        if (error instanceof ParticipacionApiError && (error.status === 401 || error.status === 403)) onAccessIssue({ status: error.status, message: error.message })
      }
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <details className="rounded-2xl bg-white p-4 text-sm"><summary className="cursor-pointer font-semibold">Consultar cuenta por ID, incluidas inactivas</summary><form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void read() }}><label className="block">ID de cuenta<input className={inputClasses(false)} inputMode="numeric" value={id} disabled={disabled || loading} onChange={event => setId(event.target.value)} /></label>{error && <p role="alert" className="text-danger-700">{error}</p>}<Button type="submit" disabled={disabled || !id.trim()} loading={loading}>Consultar cuenta</Button></form></details>
}
