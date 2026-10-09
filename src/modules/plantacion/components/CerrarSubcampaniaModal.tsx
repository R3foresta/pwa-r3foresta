import { useId, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Field, Input, Select, Textarea } from '../../../components/ui'
import { toLocalISODate } from '../../../utils/validations/date'
import {
  MOTIVO_CIERRE_PARCIAL_LABEL,
  type CerrarSubcampaniaInput,
  type MotivoCierreParcial,
  type Subcampania,
} from '../types/contracts'

type Props = {
  subcampania: Subcampania
  submitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (input: CerrarSubcampaniaInput) => void
}

function defaultMaintenanceEnd(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const lastDay = new Date(year + 3, month, 0).getDate()
  return toLocalISODate(new Date(year + 3, month - 1, Math.min(day, lastDay)))
}

function CerrarSubcampaniaModal({ subcampania, submitting, error, onClose, onConfirm }: Props) {
  const fieldId = useId()
  const [fechaCierre, setFechaCierre] = useState(() => toLocalISODate())
  const [fechaFin, setFechaFin] = useState(() => defaultMaintenanceEnd(toLocalISODate()))
  const [motivo, setMotivo] = useState<MotivoCierreParcial | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const plantados = subcampania.total_plantado_inicial ?? subcampania.plantados ?? 0
  const esParcial = plantados < subcampania.meta_total_arboles
  const estadoFinal = esParcial ? 'FINALIZADA_PARCIAL' : 'COMPLETADA'

  const handleConfirm = () => {
    if (submitting) return
    if (!fechaCierre || !fechaFin) {
      setValidationError('Indica la fecha de cierre y el fin de mantenimiento.')
      return
    }
    if (fechaFin < fechaCierre) {
      setValidationError('El fin de mantenimiento no puede ser anterior al cierre.')
      return
    }
    if (esParcial && !motivo) {
      setValidationError('Selecciona un motivo para el cierre parcial.')
      return
    }
    setValidationError(null)
    onConfirm({
      estado_final: estadoFinal,
      fecha_cierre_operativo: fechaCierre,
      fecha_fin_mantenimiento: fechaFin,
      ...(esParcial && motivo ? { motivo_cierre_parcial: motivo } : {}),
      ...(observaciones.trim() ? { observaciones_cierre: observaciones.trim() } : {}),
    })
  }

  return (
    <ConfirmDialog
      open
      title="Cerrar subcampaña"
      description="Termina la plantación inicial y comienza el mantenimiento. El cierre no se puede deshacer desde la aplicación."
      iconName="flag"
      confirmLabel={esParcial ? 'Confirmar cierre parcial' : 'Confirmar cierre completo'}
      cancelLabel="Seguir plantando"
      loading={submitting}
      errorMessage={validationError ?? error}
      onCancel={onClose}
      onConfirm={handleConfirm}
    >
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-700">
          <p className="font-extrabold">{subcampania.nombre}</p>
          <p>{plantados.toLocaleString('es-BO')} plantados / meta {subcampania.meta_total_arboles.toLocaleString('es-BO')}</p>
          <p className="mt-1">Estado final: {esParcial ? 'Finalizada parcial' : 'Completada'}.</p>
          <p className="mt-2 text-xs">El stock sin utilizar sigue asignado. Su devolución al vivero se registra por separado.</p>
        </div>

        <Field label="Fecha de cierre" required htmlFor={`${fieldId}-cierre`}>
          <Input id={`${fieldId}-cierre`} type="date" required value={fechaCierre} disabled={submitting}
            onChange={(event) => {
              const value = event.target.value
              setFechaCierre(value)
              if (value) setFechaFin(defaultMaintenanceEnd(value))
            }} />
        </Field>
        <Field label="Fin de mantenimiento" required htmlFor={`${fieldId}-fin`} hint="Se propone un período de tres años. Puedes ajustar la fecha.">
          <Input id={`${fieldId}-fin`} type="date" required min={fechaCierre} value={fechaFin}
            disabled={submitting} onChange={(event) => setFechaFin(event.target.value)} />
        </Field>

        {esParcial && (
          <Field label="Motivo del cierre parcial" required htmlFor={`${fieldId}-motivo`}>
            <Select id={`${fieldId}-motivo`} required value={motivo} disabled={submitting}
              onChange={(event) => setMotivo(event.target.value as MotivoCierreParcial | '')}>
              <option value="">Selecciona un motivo</option>
              {Object.entries(MOTIVO_CIERRE_PARCIAL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Observaciones" htmlFor={`${fieldId}-observaciones`}>
          <Textarea id={`${fieldId}-observaciones`} value={observaciones} maxLength={2000} rows={2}
            disabled={submitting} onChange={(event) => setObservaciones(event.target.value)} />
        </Field>
      </div>
    </ConfirmDialog>
  )
}

export default CerrarSubcampaniaModal
