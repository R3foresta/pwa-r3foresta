import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog'
import SuccessModal from '../../../components/SuccessModal'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { RecoleccionesService, type Recoleccion } from '../../../services/recolecciones.service'

type Props = {
  recoleccion: Recoleccion
  disabled: boolean
  onLockedChange: (locked: boolean) => void
  onReload: () => void
}

export default function RecoleccionDeleteAction({ recoleccion, disabled, onLockedChange, onReload }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useRef(true)
  const pending = useRef(false)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      onLockedChange(false)
    }
  }, [onLockedChange])

  const role = String(user?.rol ?? '').toUpperCase()
  const isOwner = user?.id != null && String(user.id) === String(recoleccion.usuario_id)
  // Exigir el estado explícito del servidor: no inferir BORRADOR si falta.
  const canDelete = recoleccion.estado_registro === 'BORRADOR' && (
    role === 'ADMIN' || (isOwner && (role === 'GENERAL' || role === 'VALIDADOR'))
  )

  const confirmDelete = async () => {
    if (!canDelete || disabled || pending.current || error || deleted) return

    pending.current = true
    setDeleting(true)
    onLockedChange(true)
    try {
      await RecoleccionesService.deleteDraft(recoleccion.id)
      if (!active.current) return
      setOpen(false)
      setDeleted(true)
    } catch (requestError) {
      if (!active.current) return
      setOpen(false)
      setError(requestError instanceof Error ? requestError.message : 'No se pudo confirmar la eliminación.')
      // Incluso un fallo de red puede ocurrir después de persistir. Releer antes de repetir.
    } finally {
      pending.current = false
      if (active.current) setDeleting(false)
    }
  }

  if (!canDelete) return null

  if (deleted) {
    return <SuccessModal
      title="Borrador eliminado"
      summaryText={recoleccion.codigo_trazabilidad}
      description="La recolección se eliminó del listado. Su ficha, fotos e historial se conservan para trazabilidad."
      primaryLabel="Volver a recolecciones"
      onPrimaryAction={() => navigate('/app/collections', { replace: true })}
    />
  }

  return (
    <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
      <Button
        variant="danger"
        fullWidth
        leftIcon="trash"
        disabled={disabled || deleting || Boolean(error)}
        onClick={() => setOpen(true)}
      >
        Eliminar borrador
      </Button>
      <p className="text-xs font-medium text-neutral-500">
        Solo se pueden eliminar borradores. Se conservarán los datos y evidencias para trazabilidad.
      </p>
      {error && (
        <div role="alert" className="space-y-3 rounded-2xl bg-danger-50 p-3 text-sm font-semibold text-danger-700">
          <p>No se confirmó la eliminación: {error}</p>
          <p>Actualiza el detalle para comprobar el estado antes de volver a intentar.</p>
          <Button variant="secondary" fullWidth onClick={onReload}>Actualizar detalle</Button>
        </div>
      )}
      <ConfirmDialog
        open={open}
        title="Eliminar borrador de recolección"
        description="El borrador dejará de aparecer en las consultas. Se conservarán la ficha, las fotos y el historial. Esta acción no tiene opción de restauración."
        confirmLabel="Confirmar eliminación"
        variant="danger"
        iconName="trash"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => { if (!pending.current) setOpen(false) }}
      >
        <p className="mt-3 text-sm font-bold text-neutral-700">
          Recolección: {recoleccion.codigo_trazabilidad} · BORRADOR
        </p>
      </ConfirmDialog>
    </div>
  )
}
