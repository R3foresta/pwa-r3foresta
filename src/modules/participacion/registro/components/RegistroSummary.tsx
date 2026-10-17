import { Card } from '../../../../components/ui'
import SummaryRow from '../../../plantacion/components/registro/SummaryRow'
import type { RegistroDraft } from '../../commands/registrationDraftStore'
import type { ContextoRegistro } from '../../registroTypes'
import type { PersonaMinima } from '../../types'

type Props = { context: ContextoRegistro; draft: RegistroDraft; photoCount: number; responsible: string; people: Record<string, PersonaMinima> }

export default function RegistroSummary({ context, draft, photoCount, responsible, people }: Props) {
  return <Card as="section" padding="none" className="overflow-hidden divide-y divide-neutral-100">
    <h2 className="px-4 py-3 font-bold text-brand-800">Resumen de la plantación</h2>
    <SummaryRow icon="trees" label="Campaña y subcampaña" value={`${context.subcampania.campania_nombre} · ${context.subcampania.nombre}`} />
    <SummaryRow icon="pin" label="Ubicación confirmada" value={`${draft.latitud}, ${draft.longitud}`} />
    <SummaryRow icon="date" label="Fecha del trabajo" value={draft.fecha_plantacion} />
    <SummaryRow icon="photo" label="Evidencia" value={`${photoCount} foto(s) disponible(s) en el servidor`} />
    <SummaryRow icon="planting" label="Especies y cantidades" value={<div className="space-y-1">{draft.especies.map((species) => <p key={species.planta_id}>{context.especies.find((item) => item.planta_id === species.planta_id)?.nombre ?? `Especie ${species.planta_id}`}: {species.cantidad}</p>)}<p className="pt-1">Total: {draft.especies.reduce((sum, species) => sum + species.cantidad, 0)} plantas</p></div>} />
    <SummaryRow icon="users" label="Personas" value={<div><p>Responsable: {responsible} (tu cuenta)</p>{draft.coresponsable_ids.map((id) => <p key={id}>Participante: {people[id]?.nombre ?? `Cuenta ${id}`}</p>)}</div>} />
    {draft.observaciones?.trim() && <SummaryRow icon="note" label="Observaciones" value={<p className="whitespace-pre-wrap break-words">{draft.observaciones}</p>} />}
  </Card>
}
