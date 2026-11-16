import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { validarId } from '../../participacion/api/participacion.contract'
import { requestPrivada, sessionError } from '../../participacion/api/participacion.transport'
import { validarProcedencia } from './procedencia.contract'

export type AudienciaProcedencia = 'propia' | 'administrativa'
const errors: Record<number, string> = {
  401: 'La sesión no está disponible. Ingresa nuevamente para consultar la procedencia.',
  403: 'Tu cuenta no está autorizada para consultar esta procedencia.',
  404: 'La procedencia de este registro no está disponible para esta consulta.',
}
export const ProcedenciaApi = {
  async leer(actor: string, registroId: string, audiencia: AudienciaProcedencia, token: string, signal?: AbortSignal) {
    const id = validarId(registroId)
    const verified = await verificarActorParticipacion(validarId(actor), signal)
    if (verified !== token) throw sessionError('La sesión cambió antes de consultar la procedencia.')
    const response = await requestPrivada(`/plantaciones/${id}/procedencia-${audiencia}`, { signal }, token)
    if (response.status !== 200) throw Object.assign(new Error(errors[response.status] ?? 'No se pudo consultar la procedencia. Vuelve a intentar.'), { status: response.status })
    return validarProcedencia(response.body, id)
  },
}
