import {
  actualizarOrganizacion,
  crearOrganizacion,
  desactivarOrganizacion,
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

  static async desactivarOrganizacion(id: number | string): Promise<void> {
    await desactivarOrganizacion(id)
  }

  static async reactivarOrganizacion(id: number | string): Promise<Organizacion> {
    const response = await actualizarOrganizacion(id, { activo: true })
    if (!response.data) {
      throw new Error('No se recibió la organización reactivada.')
    }
    return response.data
  }
}
