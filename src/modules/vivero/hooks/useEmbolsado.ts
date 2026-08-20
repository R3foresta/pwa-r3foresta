import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { todayLocalISO } from '../../../utils/validations/date'
import type { Photo } from '../../../components/evidence/PhotoUploader'
import type { EmbolsadoContextData, RegistrarEmbolsadoResult } from '../types/contracts'
import { computeMaxPlantasEmbolsado } from '../utils/validators'

type Step = 'loading' | 'blocked' | 'form' | 'submitting' | 'success' | 'error'

const MAX_PHOTOS = 5

export type EmbolsadoFormValues = {
  plantasVivasIniciales: string
  fechaEvento: string
  observaciones: string
}

type UseEmbolsadoResult = {
  step: Step
  context: EmbolsadoContextData | null
  formValues: EmbolsadoFormValues
  photos: Photo[]
  submitError: string | null
  result: RegistrarEmbolsadoResult | null
  updateForm: (patch: Partial<EmbolsadoFormValues>) => void
  addPhotos: (files: File[]) => void
  removePhoto: (index: number) => void
  loadContext: (loteId: number) => Promise<void>
  submit: (loteId: number) => Promise<void>
}

export function useEmbolsado(): UseEmbolsadoResult {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const [step, setStep] = useState<Step>('loading')
  const [context, setContext] = useState<EmbolsadoContextData | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<RegistrarEmbolsadoResult | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [formValues, setFormValues] = useState<EmbolsadoFormValues>({
    plantasVivasIniciales: '',
    fechaEvento: todayLocalISO(),
    observaciones: '',
  })

  // Mantener un ref al último photos[] para poder revocar previewUrls al desmontar
  // el consumidor sin meter `photos` en el deps del cleanup effect.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    },
    [],
  )

  const updateForm = useCallback((patch: Partial<EmbolsadoFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...patch }))
  }, [])

  const addPhotos = useCallback((files: File[]) => {
    setPhotos((prev) => {
      const available = MAX_PHOTOS - prev.length
      if (available <= 0) return prev
      const next = files
        .slice(0, available)
        .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
      return [...prev, ...next]
    })
  }, [])

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
  }, [])

  const clearPhotos = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
  }, [])

  const loadContext = useCallback(
    async (loteId: number) => {
      setStep('loading')
      setSubmitError(null)
      setResult(null)
      try {
        const ctx = await LotesViveroService.getEmbolsadoContext(loteId)
        setContext(ctx)
        if (!ctx.puede_registrar_embolsado) {
          setStep('blocked')
        } else {
          setStep('form')
          // Solo prefilleamos 1:1 cuando la unidad origen es UNIDAD (semilla o esqueje
          // contado por piezas). Para G no hay traducción literal a plantas, así que
          // dejamos el input vacío para que el usuario declare el conteo real.
          const prefillPlantas =
            ctx.unidad_medida_inicial === 'UNIDAD' ? String(ctx.cantidad_inicial_en_proceso) : ''
          setFormValues({
            plantasVivasIniciales: prefillPlantas,
            fechaEvento: todayLocalISO(),
            observaciones: '',
          })
          clearPhotos()
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Error al verificar el lote.')
        setStep('error')
      }
    },
    [clearPhotos],
  )

  const submit = useCallback(
    async (loteId: number) => {
      setSubmitError(null)

      const plantasNum = parseInt(formValues.plantasVivasIniciales, 10)
      if (!Number.isFinite(plantasNum) || plantasNum < 1) {
        setSubmitError('Ingresá una cantidad de plantas vivas válida (mínimo 1).')
        return
      }
      if (context) {
        const maxPlantas = computeMaxPlantasEmbolsado(
          context.cantidad_inicial_en_proceso,
          context.unidad_medida_inicial,
        )
        if (plantasNum > maxPlantas) {
          const mensajeTope =
            context.unidad_medida_inicial === 'G'
              ? `Las plantas embolsadas no pueden superar el tope orientativo de ${maxPlantas} plantas para ${context.cantidad_inicial_en_proceso} gr de semilla.`
              : `Las plantas embolsadas no pueden superar la cantidad inicial (${maxPlantas}).`
          setSubmitError(mensajeTope)
          return
        }
      }
      if (photos.length < 1) {
        setSubmitError('La evidencia fotográfica del embolsado es obligatoria.')
        return
      }
      if (!formValues.fechaEvento) {
        setSubmitError('La fecha del evento es obligatoria.')
        return
      }
      if (context && formValues.fechaEvento < context.fecha_inicio) {
        setSubmitError('La fecha no puede ser anterior al inicio del lote.')
        return
      }

      setStep('submitting')
      try {
        const evidenciasResp = await LotesViveroService.uploadEvidenciasEvento(
          loteId,
          'EMBOLSADO',
          {
            fotos: photos.map((p) => p.file),
            titulo: 'Embolsado de lote vivero',
            descripcion: formValues.observaciones.trim() || 'Evidencia de embolsado',
            metadata: { fuente: 'pwa-r3foresta', modulo: 'vivero', etapa: 'EMBOLSADO' },
            tomado_en: new Date().toISOString(),
          },
          authId,
        )
        const evidenciaIds = evidenciasResp.data.evidencia_ids

        const embolsadoResp = await LotesViveroService.registrarEmbolsado(
          loteId,
          {
            fecha_evento: formValues.fechaEvento,
            plantas_vivas_iniciales: plantasNum,
            evidencia_ids: evidenciaIds,
            observaciones: formValues.observaciones.trim() || undefined,
          },
          authId,
        )

        setResult(embolsadoResp.data)
        setStep('success')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Error al registrar el embolsado.')
        setStep('form')
      }
    },
    [authId, context, formValues, photos],
  )

  return {
    step,
    context,
    formValues,
    photos,
    submitError,
    result,
    updateForm,
    addPhotos,
    removePhoto,
    loadContext,
    submit,
  }
}
