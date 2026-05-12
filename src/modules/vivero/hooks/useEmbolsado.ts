import { useCallback, useState } from 'react'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { todayLocalISO } from '../../../utils/validations/date'
import type { EmbolsadoContextData, RegistrarEmbolsadoResult } from '../types/contracts'
import { computeMaxPlantasEmbolsado } from '../utils/validators'

type Step = 'loading' | 'blocked' | 'form' | 'submitting' | 'success' | 'error'

export type EmbolsadoFormValues = {
  plantasVivasIniciales: string
  fechaEvento: string
  foto: File | null
  observaciones: string
}

type UseEmbolsadoResult = {
  step: Step
  context: EmbolsadoContextData | null
  formValues: EmbolsadoFormValues
  submitError: string | null
  result: RegistrarEmbolsadoResult | null
  updateForm: (patch: Partial<EmbolsadoFormValues>) => void
  loadContext: (loteId: number) => Promise<void>
  submit: (loteId: number) => Promise<void>
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png']

export function useEmbolsado(): UseEmbolsadoResult {
  const [step, setStep] = useState<Step>('loading')
  const [context, setContext] = useState<EmbolsadoContextData | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<RegistrarEmbolsadoResult | null>(null)
  const [formValues, setFormValues] = useState<EmbolsadoFormValues>({
    plantasVivasIniciales: '',
    fechaEvento: todayLocalISO(),
    foto: null,
    observaciones: '',
  })

  const updateForm = useCallback((patch: Partial<EmbolsadoFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadContext = useCallback(async (loteId: number) => {
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
        setFormValues((prev) => ({
          ...prev,
          plantasVivasIniciales: prefillPlantas,
          fechaEvento: todayLocalISO(),
        }))
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al verificar el lote.')
      setStep('error')
    }
  }, [])

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
      if (!formValues.foto) {
        setSubmitError('La foto del embolsado es obligatoria.')
        return
      }
      if (!ALLOWED_MIME.includes(formValues.foto.type)) {
        setSubmitError('Solo se aceptan fotos JPG o PNG.')
        return
      }
      if (formValues.foto.size > MAX_PHOTO_BYTES) {
        setSubmitError('La foto no puede superar 5 MB.')
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
        const evidenciasResp = await LotesViveroService.uploadEvidenciasEmbolsado(loteId, {
          fotos: [formValues.foto],
        })
        const evidenciaIds = evidenciasResp.data.evidencia_ids

        const embolsadoResp = await LotesViveroService.registrarEmbolsado(loteId, {
          fecha_evento: formValues.fechaEvento,
          plantas_vivas_iniciales: plantasNum,
          evidencia_ids: evidenciaIds,
          observaciones: formValues.observaciones.trim() || undefined,
        })

        setResult(embolsadoResp.data)
        setStep('success')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Error al registrar el embolsado.')
        setStep('form')
      }
    },
    [context, formValues],
  )

  return { step, context, formValues, submitError, result, updateForm, loadContext, submit }
}
