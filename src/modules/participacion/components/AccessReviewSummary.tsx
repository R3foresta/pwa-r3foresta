import type { CapacidadSubcampania, OperacionAcceso, RevisionLectura } from '../types'
import type { AccessReview } from '../hooks/useAccessReview'
import { actionDefinition, nextPermission, permissionLabel } from './accessPresentation'

type Props = { review: AccessReview; scopes: CapacidadSubcampania[]; operation: OperacionAcceso; treatment: 'PLANTADOR' | 'SIN_ACCESO' }

function PersonSummary({ reading, scopes, newPermission, label }: { reading: RevisionLectura; scopes: CapacidadSubcampania[]; newPermission: ReturnType<typeof nextPermission>; label: string }) {
  return <div className="space-y-2 rounded-2xl bg-neutral-50 p-3 text-sm">
    <p className="font-bold text-brand-800">{label}: {reading.data.usuario.nombre}</p>
    <p className="text-neutral-600">{reading.data.usuario.organizacion ?? 'Sin afiliación declarada'} · Cuenta {reading.data.usuario.usuario_id}</p>
    {reading.data.ambitos.map((scope) => <div key={scope.subcampania_id} className="border-t border-neutral-200 pt-2">
      <p className="font-bold text-neutral-800">{scopes.find((item) => item.subcampania_id === scope.subcampania_id)?.nombre ?? `Subcampaña ${scope.subcampania_id}`} · ID {scope.subcampania_id}</p>
      <p>Anterior: {permissionLabel(scope.permiso_contextual)}</p><p>Solicitado: {permissionLabel(newPermission)}</p>
      <p className="text-xs text-neutral-500">Revisión consultada: {scope.revision_permiso}</p>
      {scope.acceso_global && <p className="mt-1 font-semibold text-warning-800">Conserva acceso global de administrador. Este cambio contextual no revoca su autoridad global.</p>}
    </div>)}
  </div>
}

export default function AccessReviewSummary({ review, scopes, operation, treatment }: Props) {
  return <div className="mt-3 space-y-3">
    <p className="text-sm text-neutral-700">{actionDefinition(operation).consequence}</p>
    <PersonSummary reading={review.target} scopes={scopes} newPermission={nextPermission(operation, treatment)} label={operation === 'REEMPLAZAR_ADMINISTRADOR' ? 'Persona saliente' : 'Persona'} />
    {operation === 'REEMPLAZAR_ADMINISTRADOR' && review.replacement && <>
      <p className="text-sm font-semibold text-brand-800">Saliente: {treatment === 'PLANTADOR' ? 'conservar como plantador' : 'retirar todo acceso contextual'}.</p>
      <PersonSummary reading={review.replacement} scopes={scopes} newPermission="ADMINISTRADOR_SUBCAMPANIA" label="Persona entrante" />
    </>}
    <p className="text-xs font-semibold text-neutral-600">Se conserva el historial. La selección es todo-o-nada y no cambia rol global, logística, stock ni estado de las subcampañas. El servidor verifica nuevamente autoridad, revisiones y continuidad.</p>
  </div>
}
