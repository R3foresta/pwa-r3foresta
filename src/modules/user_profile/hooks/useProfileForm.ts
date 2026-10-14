import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { ParticipacionProfileService, type CambioPerfil, type OrganizacionSeleccionable, type PerfilParticipacion } from '../participacion.service'

type AffiliationType = 'NINGUNA' | 'ORGANIZACION_REGISTRADA' | 'OTRA'
type FieldName = 'nombre' | 'apellido' | 'afiliacion'
type FieldErrors = Partial<Record<FieldName, string>>
const normalize = (value: string) => value.normalize('NFC').trim()

export function useProfileForm() {
  const { updateUserFromBackend } = useAuth()
  const [perfil, setPerfil] = useState<PerfilParticipacion | null>(null)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [tipo, setTipo] = useState<AffiliationType>('NINGUNA')
  const [organizacion, setOrganizacion] = useState<OrganizacionSeleccionable | null>(null)
  const [otra, setOtra] = useState('')
  const [afiliacionEditada, setAfiliacionEditada] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const submitting = useRef(false)
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const current = await ParticipacionProfileService.leer(controller.signal)
        if (controller.signal.aborted) return
        setPerfil(current)
        setNombre(current.nombre)
        setApellido(current.apellido || '')
        setTipo(current.afiliacion?.tipo || 'NINGUNA')
        setOrganizacion(current.afiliacion?.tipo === 'ORGANIZACION_REGISTRADA'
          ? { organizacion_id: current.afiliacion.organizacion_id, nombre: current.afiliacion.nombre } : null)
        setOtra(current.afiliacion?.tipo === 'OTRA' ? current.afiliacion.nombre : '')
        setAfiliacionEditada(false)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo leer el perfil.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => { active.current = false; controller.abort() }
  }, [attempt])

  const dirty = Boolean(perfil && (
    normalize(nombre) !== perfil.nombre || normalize(apellido) !== (perfil.apellido || '') || afiliacionEditada
  ))
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const errors: FieldErrors = {}
  if (!normalize(nombre)) errors.nombre = 'Escribe el nombre con el que te identificas.'
  else if ([...normalize(nombre)].length > 100) errors.nombre = 'El nombre admite hasta 100 caracteres.'
  if ([...normalize(apellido)].length > 30) errors.apellido = 'El apellido admite hasta 30 caracteres.'
  if (afiliacionEditada && tipo === 'ORGANIZACION_REGISTRADA' && !organizacion) errors.afiliacion = 'Selecciona una organización de los resultados.'
  if (afiliacionEditada && tipo === 'OTRA' && (!normalize(otra) || [...normalize(otra)].length > 150)) errors.afiliacion = 'Escribe entre 1 y 150 caracteres para otra organización.'
  const visibleErrors = Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field as FieldName])) as FieldErrors
  const touch = (field: FieldName) => setTouched(previous => ({ ...previous, [field]: true }))

  async function save(): Promise<boolean> {
    if (submitting.current || loading || !perfil) return false
    setTouched({ nombre: true, apellido: true, afiliacion: true })
    if (Object.keys(errors).length) {
      const field = errors.nombre ? 'nombre' : errors.apellido ? 'apellido' : tipo === 'OTRA' ? 'otra-organizacion' : null
      if (field) document.getElementById(field)?.focus()
      else document.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
      return false
    }
    const change: CambioPerfil = { nombre: normalize(nombre), apellido: normalize(apellido) || null }
    if (afiliacionEditada) {
      change.afiliacion = tipo === 'ORGANIZACION_REGISTRADA' && organizacion
        ? { tipo, organizacion_id: organizacion.organizacion_id }
        : tipo === 'OTRA' ? { tipo, nombre: normalize(otra) } : null
    }
    submitting.current = true
    setSaving(true)
    setError('')
    let confirmed = false
    try {
      await ParticipacionProfileService.actualizar(change)
      confirmed = true
      if (!active.current) return false
      await updateUserFromBackend()
      return active.current
    } catch (cause) {
      if (active.current) setError(confirmed
        ? 'Tu perfil se guardó, pero no pudimos actualizar la sesión. Revisa tu conexión y vuelve a ingresar.'
        : cause instanceof Error ? cause.message : 'No se pudo guardar el perfil. Tus cambios siguen aquí.')
      return false
    } finally {
      submitting.current = false
      if (active.current) setSaving(false)
    }
  }

  return {
    perfil, nombre, apellido, tipo, organizacion, otra, loading, saving, error, dirty,
    errors: visibleErrors, disabled: loading || saving || !perfil, touch, save,
    retry: () => setAttempt(previous => previous + 1), setNombre, setApellido,
    setTipo: (value: AffiliationType) => {
      setTipo(value); setAfiliacionEditada(true)
      // No ofrecer una afiliación guardada inactiva para reselección.
      if (value === 'ORGANIZACION_REGISTRADA') setOrganizacion(null)
      setTouched(previous => ({ ...previous, afiliacion: false }))
    },
    setOrganizacion: (value: OrganizacionSeleccionable) => { setOrganizacion(value); setAfiliacionEditada(true); touch('afiliacion') },
    setOtra: (value: string) => { setOtra(value); setAfiliacionEditada(true) },
  }
}
