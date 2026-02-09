import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ProfileService } from './profile.service'
import type { ProfileFormData, ProfileValidationErrors } from './types'
import { useNavigate } from 'react-router-dom'

export function CompleteProfileScreen() {
  const { user, updateUserFromBackend } = useAuth()
  const navigate = useNavigate()
  
  // Países disponibles con sus códigos y banderas
  const countries = [
    { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
    { code: '+51', name: 'Perú', flag: '🇵🇪' },
    { code: '+52', name: 'México', flag: '🇲🇽' }
  ]
  
  const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Bolivia por defecto
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

  // Inicializar país y número si ya existe contacto
  React.useEffect(() => {
    if (user?.contacto) {
      // Buscar si el contacto existente coincide con algún código de país
      const existingContact = user.contacto
      const foundCountry = countries.find(country => existingContact.startsWith(country.code))
      
      if (foundCountry) {
        setSelectedCountry(foundCountry)
        setPhoneNumber(existingContact.replace(foundCountry.code, ''))
      } else {
        setPhoneNumber(existingContact)
      }
    }
  }, [user?.contacto])

  // Verificar si el usuario ya tiene perfil completo
  useEffect(() => {
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
  }, [user, navigate])

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof ProfileValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value)
    // Actualizar el contacto completo en formData
    const fullContact = value.trim() ? `${selectedCountry.code}${value}` : ''
    setFormData(prev => ({
      ...prev,
      contacto: fullContact
    }))
    
    // Limpiar error si existe
    if (errors.contacto) {
      setErrors(prev => ({
        ...prev,
        contacto: undefined
      }))
    }
  }

  const handleCountryChange = (country: typeof countries[0]) => {
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
        console.log('🏠 Navegando al home...')
        navigate('/app/home', { replace: true })
      } else {
        console.error('⚠️ El perfil aún no está completo después de actualizar')
        setErrors({
          general: 'Error: El perfil no se completó correctamente. Inténtalo nuevamente.'
        })
      }
      
    } catch (error: any) {
      console.error('❌ Error al completar perfil:', error)
      
      const status = error?.status
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
          general: error?.message || 'Error al completar el perfil'
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
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">Paso final</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Completa tu perfil</h1>
            <p className="mt-1 text-sm text-white/70">
              Necesitamos algunos datos para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-5">
            {/* Nombre */}
            <div className="space-y-1">
              <label htmlFor="nombre" className="text-sm font-semibold text-brand-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${
                  errors.nombre ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="Tu nombre"
                disabled={isSubmitting}
              />
              {errors.nombre && (
                <p className="text-xs font-medium text-red-500">{errors.nombre}</p>
              )}
            </div>

            {/* Apellido */}
            <div className="space-y-1">
              <label htmlFor="apellido" className="text-sm font-semibold text-brand-700">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                id="apellido"
                type="text"
                value={formData.apellido}
                onChange={(e) => handleInputChange('apellido', e.target.value)}
                maxLength={30}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${
                  errors.apellido ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="Tu apellido"
                disabled={isSubmitting}
              />
              {errors.apellido && (
                <p className="text-xs font-medium text-red-500">{errors.apellido}</p>
              )}
            </div>

            {/* Documento de identidad */}
            <div className="space-y-1">
              <label htmlFor="doc_identidad" className="text-sm font-semibold text-brand-700">
                Documento de identidad <span className="text-red-500">*</span>
              </label>
              <input
                id="doc_identidad"
                type="text"
                value={formData.doc_identidad}
                onChange={(e) => handleInputChange('doc_identidad', e.target.value)}
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${
                  errors.doc_identidad ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="DNI, Cédula, etc."
                disabled={isSubmitting}
              />
              {errors.doc_identidad && (
                <p className="text-xs font-medium text-red-500">{errors.doc_identidad}</p>
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
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                placeholder="Opcional"
                disabled={isSubmitting}
              />
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
                className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${
                  errors.wallet_address ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="0x... (opcional)"
                disabled={isSubmitting}
              />
              {errors.wallet_address && (
                <p className="text-xs font-medium text-red-500">{errors.wallet_address}</p>
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
                      const country = countries.find(c => c.code === e.target.value)
                      if (country) handleCountryChange(country)
                    }}
                    className="appearance-none rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 pr-10 min-w-[120px]"
                    disabled={isSubmitting}
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
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
                  className={`flex-1 rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 ${
                    errors.contacto ? 'border-red-400' : 'border-slate-200'
                  }`}
                  placeholder={
                    selectedCountry.code === '+591' ? '12345678 (8 dígitos)' :
                    selectedCountry.code === '+51' ? '87654321 (8-9 dígitos)' :
                    '5512345678 (10 dígitos)'
                  }
                  disabled={isSubmitting}
                />
              </div>
              {errors.contacto && (
                <p className="text-xs font-medium text-red-500">{errors.contacto}</p>
              )}
            </div>

            {/* Error general */}
            {errors.general && (
              <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-soft">
                {errors.general}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 text-center text-lg font-extrabold text-white shadow-soft transition hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : 'Completar perfil'}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Los campos con <span className="text-red-500">*</span> son obligatorios
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}