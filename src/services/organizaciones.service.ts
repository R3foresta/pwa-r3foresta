import {
  actualizarOrganizacion,
  borrarOrganizacion,
  crearOrganizacion,
  eliminarLogoOrganizacion,
  listarOrganizaciones,
  obtenerOrganizacion,
  subirLogoOrganizacion,
} from '../api/organizaciones.api'
import type {
  ListOrganizacionesResponse,
  ListarOrganizacionesParams,
  Organizacion,
  OrganizacionDataInput,
  OrganizacionFormInput,
  TipoOrganizacion,
} from '../modules/organizaciones/types'
import { TIPOS_ORGANIZACION } from '../modules/organizaciones/types'

type ApiError = Error & { status?: number }

type BorrarOrganizacionResult = {
  metodo: 'hard_delete' | 'soft_delete'
  message: string
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function validateTipo(tipo: TipoOrganizacion): void {
  if (!TIPOS_ORGANIZACION.includes(tipo)) {
    throw new Error('Selecciona un tipo de organización válido.')
  }
}

function cleanInput(input: OrganizacionFormInput): OrganizacionFormInput {
  const nombre = normalizeText(input.nombre)

  if (nombre.length < 2) {
    throw new Error('El nombre de la organización debe tener al menos 2 caracteres.')
  }
  validateTipo(input.tipo)

  const payload: OrganizacionFormInput = {
    nombre,
    tipo: input.tipo,
  }

  if (typeof input.activo === 'boolean') {
    payload.activo = input.activo
  }
  if (input.logo instanceof File) {
    payload.logo = input.logo
  }
  if (input.removeLogo) {
    payload.removeLogo = true
  }

  return payload
}

function toDataInput(input: OrganizacionFormInput): OrganizacionDataInput {
  const clean = cleanInput(input)
  return {
    nombre: clean.nombre,
    tipo: clean.tipo,
    activo: clean.activo,
  }
}

function shouldFallbackToSoftDelete(error: unknown): boolean {
  const apiError = error as ApiError
  if (apiError?.status !== 422) return false

  const message = apiError.message.toLowerCase()
  return (
    message.includes('campaña') ||
    message.includes('campania') ||
    message.includes('desactiv')
  )
}

export class OrganizacionesService {
  static async listOrganizaciones(
    params: ListarOrganizacionesParams = { activo: true },
  ): Promise<ListOrganizacionesResponse> {
    return listarOrganizaciones(params)
  }

  static async getOrganizacion(id: number | string): Promise<Organizacion> {
    const response = await obtenerOrganizacion(id)
    if (!response.data) {
      throw new Error('Organización no encontrada.')
    }
    return response.data
  }

  static async createOrganizacion(input: OrganizacionFormInput): Promise<Organizacion> {
    const response = await crearOrganizacion(cleanInput(input))
    if (!response.data) {
      throw new Error('No se recibió la organización creada.')
    }
    return response.data
  }

  static async updateOrganizacion(
    id: number | string,
    input: OrganizacionFormInput,
  ): Promise<Organizacion> {
    const dataResponse = await actualizarOrganizacion(id, toDataInput(input))
    if (!dataResponse.data) {
      throw new Error('No se recibió la organización actualizada.')
    }

    if (input.logo instanceof File) {
      const logoResponse = await subirLogoOrganizacion(id, input.logo)
      return {
        ...dataResponse.data,
        logo_url: logoResponse.data?.logo_url ?? dataResponse.data.logo_url,
        updated_at: logoResponse.data?.updated_at ?? dataResponse.data.updated_at,
      }
    }

    if (input.removeLogo) {
      const logoResponse = await eliminarLogoOrganizacion(id)
      return {
        ...dataResponse.data,
        logo_url: logoResponse.data?.logo_url ?? null,
        updated_at: logoResponse.data?.updated_at ?? dataResponse.data.updated_at,
      }
    }

    return dataResponse.data
  }

  static async borrarOrganizacion(id: number | string): Promise<BorrarOrganizacionResult> {
    try {
      const response = await borrarOrganizacion(id)
      const metodo = response.data.metodo
      const fallbackMessage =
        metodo === 'hard_delete'
          ? 'Organización eliminada correctamente.'
          : 'Organización desactivada correctamente.'

      return {
        metodo,
        message: response.data.message || fallbackMessage,
      }
    } catch (error) {
      if (!shouldFallbackToSoftDelete(error)) {
        throw error
      }

      const response = await actualizarOrganizacion(id, { activo: false })
      if (!response.data) {
        throw new Error('No se recibió la organización desactivada.')
      }

      return {
        metodo: 'soft_delete',
        message: 'Organización desactivada correctamente porque tiene campañas asociadas.',
      }
    }
  }

  static async reactivarOrganizacion(id: number | string): Promise<Organizacion> {
    const response = await actualizarOrganizacion(id, { activo: true })
    if (!response.data) {
      throw new Error('No se recibió la organización reactivada.')
    }
    return response.data
  }
}
