import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ProfileService } from './profile.service'
import type { ProfileFormData, ProfileValidationErrors } from './types'
import { AvatarUpload } from './components/AvatarUpload'
import { Button } from '../../components/ui'
import { useNavigate, useLocation } from 'react-router-dom'

const COUNTRIES = [
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
] as const

type Country = (typeof COUNTRIES)[number]

export function CompleteProfileScreen() {
  const { user, updateUserFromBackend } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Detectar si estamos en modo edición
  const isEditing = location.pathname === '/app/edit-profile'

  // Países disponibles con sus códigos y banderas
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0])
  const [phoneNumber, setPhoneNumber] = useState('')

  const [formData, setFormData] = useState<ProfileFormData>({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    doc_identidad: user?.doc_identidad || '',
    wallet_address: user?.wallet_address || '',
    organizacion: user?.organizacion || '',
    contacto: user?.contacto || '',
    rol: user?.rol || 'GENERAL',
  })

  const [errors, setErrors] = useState<ProfileValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Inicializar país y número si ya existe contacto
  React.useEffect(() => {
    if (user?.contacto) {
      // Buscar si el contacto existente coincide con algún código de país
      const existingContact = user.contacto
      const foundCountry = COUNTRIES.find(country => existingContact.startsWith(country.code))

      if (foundCountry) {
        setSelectedCountry(foundCountry)
        setPhoneNumber(existingContact.replace(foundCountry.code, ''))
      } else {
        setPhoneNumber(existingContact)
      }
    }
  }, [user?.contacto])

  // Verificar si el usuario ya tiene perfil completo (solo si NO estamos editando)
  useEffect(() => {
    // Si estamos en modo edición, o guardando/mostrando éxito, no hacer esta verificación
    if (isEditing || isSubmitting || showSuccessModal) return

    console.log('🔍 CompleteProfileScreen - Verificando usuario:', user)

    if (user) {
      const isComplete = ProfileService.isProfileComplete(user)
      console.log('📋 Estado del perfil:', {
        user_id: user.id,
        auth_id: user.auth_id,
        tiene_nombre: !!user.nombre,
        tiene_apellido: !!user.apellido,
        tiene_doc_identidad: !!user.doc_identidad,
        perfil_completo: isComplete
      })

      if (isComplete) {
        console.log('✅ Usuario ya tiene perfil completo, redirigiendo al home')
        navigate('/app/home', { replace: true })
      }
    } else {
      console.log('⚠️ No hay usuario en el contexto')
    }
  }, [user, navigate, isEditing, isSubmitting, showSuccessModal])

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    let processedValue = value
    let fieldError = ''

    // Validaciones específicas por campo
    switch (field) {
      case 'nombre':
        // Solo letras y espacios, máximo 20 caracteres
        if (value.length > 20) {
          fieldError = 'Sobrepasó el límite de 20 caracteres'
          processedValue = value.substring(0, 20)
        } else if (!/^[a-zA-ZÀ-ÿ\s]*$/.test(value)) {
          fieldError = 'Solo se permiten letras'
          processedValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
        }
        break

      case 'apellido':
        // Solo letras y espacios, máximo 20 caracteres
        if (value.length > 20) {
          fieldError = 'Sobrepasó el límite de 20 caracteres'
          processedValue = value.substring(0, 20)
        } else if (!/^[a-zA-ZÀ-ÿ\s]*$/.test(value)) {
          fieldError = 'Solo se permiten letras'
          processedValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
        }
        break

      case 'doc_identidad':
        // Solo números, exactamente 8 caracteres
        if (!/^[0-9]*$/.test(value)) {
          fieldError = 'Solo se permiten números'
          processedValue = value.replace(/[^0-9]/g, '')
        }
        if (processedValue.length > 8) {
          fieldError = 'Debe tener exactamente 8 caracteres'
          processedValue = processedValue.substring(0, 8)
        }
        break

      case 'wallet_address':
        // Formato wallet Ethereum (42 caracteres, empieza con 0x)
        if (value.length > 42) {
          fieldError = 'Sobrepasó el límite de 42 caracteres'
          processedValue = value.substring(0, 42)
        } else if (value && !value.startsWith('0x')) {
          fieldError = 'Debe comenzar con 0x'
        } else if (value && value.toLowerCase() === '0x0000000000000000000000000000000000000000') {
          fieldError = 'Esta wallet no es válida'
        } else if (value && !/^0x[a-fA-F0-9]*$/.test(value)) {
          fieldError = 'Formato de wallet inválido'
          // Mantener solo caracteres válidos
          if (value.startsWith('0x')) {
            processedValue = '0x' + value.substring(2).replace(/[^a-fA-F0-9]/g, '')
          }
        }
        break

      case 'organizacion':
        // Máximo 25 caracteres para organización
        if (value.length > 25) {
          fieldError = 'Sobrepasó el límite de 25 caracteres'
          processedValue = value.substring(0, 25)
        }
        break
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))

    // Actualizar errores
    setErrors(prev => ({
      ...prev,
      [field]: fieldError || undefined
    }))
  }

  const handlePhoneChange = (value: string) => {
    let processedValue = value
    let phoneError = ''

    // Solo números, máximo 10 dígitos
    if (!/^[0-9]*$/.test(value)) {
      phoneError = 'Solo se permiten números'
      processedValue = value.replace(/[^0-9]/g, '')
    }
    if (processedValue.length > 10) {
      phoneError = 'Sobrepasó el límite de 10 números'
      processedValue = processedValue.substring(0, 10)
    }

    setPhoneNumber(processedValue)

    // Actualizar el contacto completo en formData
    const fullContact = processedValue.trim() ? `${selectedCountry.code}${processedValue}` : ''
    setFormData(prev => ({
      ...prev,
      contacto: fullContact
    }))

    // Actualizar errores
    setErrors(prev => ({
      ...prev,
      contacto: phoneError || undefined
    }))
  }

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country)
    // Actualizar el contacto completo en formData
    const fullContact = phoneNumber.trim() ? `${country.code}${phoneNumber}` : ''
    setFormData(prev => ({
      ...prev,
      contacto: fullContact
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    // Limpiar campos opcionales vacíos (convertir a undefined)
    const cleanedData: ProfileFormData = {
      ...formData,
      wallet_address: formData.wallet_address?.trim() || undefined,
      organizacion: formData.organizacion?.trim() || undefined,
      contacto: formData.contacto?.trim() || undefined,
    }

    // Validar datos
    const validation = ProfileService.validateProfileData(cleanedData)
    if (!validation.isValid) {
      setErrors(validation.errors as ProfileValidationErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      console.log('📤 Completando perfil...', cleanedData)
      const response = await ProfileService.completeProfile(cleanedData)
      console.log('📥 Respuesta del backend:', response)

      // Obtener los datos frescos del backend después de completar
      console.log('🔄 Obteniendo datos actualizados del backend...')
      const updatedUser = await updateUserFromBackend()

      // Verificar inmediatamente si el perfil está completo
      const isComplete = ProfileService.isProfileComplete(updatedUser)
      console.log('✅ Perfil completado. ¿Está completo?', isComplete)

      if (isComplete) {
        console.log('✅ Perfil completado con éxito, mostrando modal')
        setShowSuccessModal(true)

        // Cerrar el modal y navegar automáticamente
        setTimeout(() => {
          setShowSuccessModal(false)
          navigate(isEditing ? '/app/profile' : '/app/home', { replace: true })
        }, 2500)
      } else {
        console.error('⚠️ El perfil aún no está completo después de actualizar')
        setErrors({
          general: 'Error: El perfil no se completó correctamente. Inténtalo nuevamente.'
        })
      }

    } catch (error: unknown) {
      console.error('❌ Error al completar perfil:', error)

      const apiError = error instanceof Error
        ? (error as Error & { status?: number })
        : null
      const status = apiError?.status
      if (status === 409) {
        setErrors({
          general: 'El documento de identidad o la wallet ya están registrados en otra cuenta'
        })
      } else if (status === 400) {
        setErrors({
          general: 'Por favor revisa los datos ingresados'
        })
      } else {
        setErrors({
          general: apiError?.message || 'Error al completar el perfil'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-soft">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-6">
            {/* Botón de cerrar */}
            <button
              onClick={() => navigate(isEditing ? '/app/profile' : '/app/home', { replace: true })}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              type="button"
              title={isEditing ? "Volver al perfil" : "Ir al inicio"}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">
              {isEditing ? 'Editar datos' : 'Paso final'}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">
              {isEditing ? 'Actualizar perfil' : 'Completa tu perfil'}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {isEditing ? 'Modifica tus datos personales' : 'Necesitamos algunos datos para continuar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-5">

            {/* AVATAR */}
            <div className="mb-6 flex justify-center">
              <AvatarUpload 
                currentPhotoUrl={user?.foto_perfil_url} 
                onUploadSuccess={() => updateUserFromBackend()} 
              />
            </div>

            {/* Nombre */}
            <div className="space-y-1">
              <label htmlFor="nombre" className="text-sm font-semibold text-brand-700">
                Nombre <span className="text-danger-500">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                maxLength={20}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${errors.nombre ? 'border-danger-400' : 'border-neutral-200'
                  }`}
                placeholder="Tu nombre (máx. 20 letras)"
                disabled={isSubmitting}
              />
              {errors.nombre && (
                <p className="text-xs font-medium text-danger-500">{errors.nombre}</p>
              )}
              {formData.nombre && (
                <p className="text-xs text-neutral-500">{formData.nombre.length}/20 caracteres</p>
              )}
            </div>

            {/* Apellido */}
            <div className="space-y-1">
              <label htmlFor="apellido" className="text-sm font-semibold text-brand-700">
                Apellido <span className="text-danger-500">*</span>
              </label>
              <input
                id="apellido"
                type="text"
                value={formData.apellido}
                onChange={(e) => handleInputChange('apellido', e.target.value)}
                maxLength={20}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${errors.apellido ? 'border-danger-400' : 'border-neutral-200'
                  }`}
                placeholder="Tu apellido (máx. 20 letras)"
                disabled={isSubmitting}
              />
              {errors.apellido && (
                <p className="text-xs font-medium text-danger-500">{errors.apellido}</p>
              )}
              {formData.apellido && (
                <p className="text-xs text-neutral-500">{formData.apellido.length}/20 caracteres</p>
              )}
            </div>

            {/* Documento de identidad */}
            <div className="space-y-1">
              <label htmlFor="doc_identidad" className="text-sm font-semibold text-brand-700">
                Documento de identidad <span className="text-danger-500">*</span>
              </label>
              <input
                id="doc_identidad"
                type="text"
                value={formData.doc_identidad}
                onChange={(e) => handleInputChange('doc_identidad', e.target.value)}
                maxLength={8}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${errors.doc_identidad ? 'border-danger-400' : 'border-neutral-200'
                  }`}
                placeholder="DNI, Cédula, etc. (8 dígitos)"
                disabled={isSubmitting}
              />
              {errors.doc_identidad && (
                <p className="text-xs font-medium text-danger-500">{errors.doc_identidad}</p>
              )}
              {formData.doc_identidad && (
                <p className="text-xs text-neutral-500">
                  {formData.doc_identidad.length}/8 caracteres
                  {formData.doc_identidad.length === 8 && (
                    <span className="ml-1 text-success-600">✓</span>
                  )}
                </p>
              )}
            </div>

            {/* Organización */}
            <div className="space-y-1">
              <label htmlFor="organizacion" className="text-sm font-semibold text-brand-700">
                Organización
              </label>
              <input
                id="organizacion"
                type="text"
                value={formData.organizacion}
                onChange={(e) => handleInputChange('organizacion', e.target.value)}
                maxLength={25}
                className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                placeholder="Opcional (máx. 25 caracteres)"
                disabled={isSubmitting}
              />
              {formData.organizacion && (
                <p className="text-xs text-neutral-500">{formData.organizacion.length}/25 caracteres</p>
              )}
            </div>

            {/* Wallet Address */}
            <div className="space-y-1">
              <label htmlFor="wallet_address" className="text-sm font-semibold text-brand-700">
                Wallet Address
              </label>
              <input
                id="wallet_address"
                type="text"
                value={formData.wallet_address}
                onChange={(e) => handleInputChange('wallet_address', e.target.value)}
                maxLength={42}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${errors.wallet_address ? 'border-danger-400' : 'border-neutral-200'
                  }`}
                placeholder="0x... (42 caracteres)"
                disabled={isSubmitting}
              />
              {errors.wallet_address && (
                <p className="text-xs font-medium text-danger-500">{errors.wallet_address}</p>
              )}
              {formData.wallet_address && (
                <p className="text-xs text-neutral-500">{formData.wallet_address.length}/42 caracteres</p>
              )}
            </div>

            {/* Contacto */}
            <div className="space-y-1">
              <label htmlFor="contacto" className="text-sm font-semibold text-brand-700">
                Contacto
              </label>
              <div className="flex gap-2">
                {/* Selector de país */}
                <div className="relative">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const country = COUNTRIES.find(c => c.code === e.target.value)
                      if (country) handleCountryChange(country)
                    }}
                    className="appearance-none rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 pr-10 min-w-[120px]"
                    disabled={isSubmitting}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Campo de número */}
                <input
                  id="contacto"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={10}
                  className={`flex-1 rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${errors.contacto ? 'border-danger-400' : 'border-neutral-200'
                    }`}
                  placeholder={
                    selectedCountry.code === '+591' ? '12345678 (máx. 10 díg.)' :
                      selectedCountry.code === '+51' ? '87654321 (máx. 10 díg.)' :
                        '5512345678 (máx. 10 díg.)'
                  }
                  disabled={isSubmitting}
                />
              </div>
              {errors.contacto && (
                <p className="text-xs font-medium text-danger-500">{errors.contacto}</p>
              )}
              {phoneNumber && (
                <p className="text-xs text-neutral-500">{phoneNumber.length}/10 números</p>
              )}
            </div>

            {/* Error general */}
            {errors.general && (
              <div className="rounded-2xl border-l-4 border-danger-500 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700 shadow-soft">
                {errors.general}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting
                ? (isEditing ? 'Guardando...' : 'Guardando...')
                : (isEditing ? 'Actualizar perfil' : 'Completar perfil')
              }
            </Button>

            <p className="text-center text-[11px] text-neutral-400">
              Los campos con <span className="text-danger-500">*</span> son obligatorios
              {isEditing && <span className="block mt-1">Campos vacíos mantendrán su valor actual</span>}
            </p>
          </form>
        </div>
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center space-y-6">

              <h2 className="text-center text-2xl font-extrabold text-neutral-800">
                ¡Actualización Exitosa!
              </h2>

              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-success-100">
                <svg
                  className="h-20 w-20 text-success-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-base font-semibold text-neutral-700">
                  {isEditing
                    ? 'Tu perfil se ha actualizado exitosamente.'
                    : 'Tu perfil se ha completado exitosamente.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
