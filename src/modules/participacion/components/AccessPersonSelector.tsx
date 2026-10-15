import { useState } from 'react'
import { Button, Card, inputClasses } from '../../../components/ui'
import type { AccionBusqueda, CapacidadSubcampania, OperacionAcceso, PersonaMinima } from '../types'
import AccessMembers from './AccessMembers'
import AccessPersonSearch from './AccessPersonSearch'

type Props = {
  operation: OperacionAcceso
  scopes: CapacidadSubcampania[]
  person: PersonaMinima | null
  replacement: PersonaMinima | null
  disabled: boolean
  memberVersion: number
  treatment: 'PLANTADOR' | 'SIN_ACCESO'
  onPerson: (person: PersonaMinima | null) => void
  onReplacement: (person: PersonaMinima | null) => void
  onTreatment: (value: 'PLANTADOR' | 'SIN_ACCESO') => void
}

function SelectedPerson({ person, label, disabled, onClear }: { person: PersonaMinima; label: string; disabled: boolean; onClear: () => void }) {
  return <div className="rounded-2xl bg-brand-50 p-3 text-sm"><p className="font-bold text-brand-800">{label}: {person.nombre}</p><p className="text-neutral-600">{person.organizacion ?? 'Sin afiliación declarada'} · Cuenta {person.usuario_id}</p><Button size="sm" variant="ghost" disabled={disabled} onClick={onClear}>Cambiar {label.toLowerCase()}</Button></div>
}

export default function AccessPersonSelector({ operation, scopes, person, replacement, disabled, memberVersion, treatment, onPerson, onReplacement, onTreatment }: Props) {
  const [browseId, setBrowseId] = useState(scopes[0]?.subcampania_id ?? '')
  const currentId = scopes.some((scope) => scope.subcampania_id === browseId) ? browseId : scopes[0]?.subcampania_id
  const scopeIds = scopes.map((scope) => scope.subcampania_id)
  const key = JSON.stringify([operation, scopeIds])
  const searchAction: AccionBusqueda | null = operation === 'OTORGAR_PLANTADOR' || operation === 'DESIGNAR_ADMINISTRADOR' ? operation : null

  return <Card as="section" className="space-y-4">
    <h2 className="font-bold text-brand-800">3. Persona y responsabilidad</h2>
    {person ? <SelectedPerson person={person} label={operation === 'REEMPLAZAR_ADMINISTRADOR' ? 'Persona saliente' : 'Persona'} disabled={disabled} onClear={() => onPerson(null)} /> : <>
      {scopes.length > 1 && <label className="block text-sm font-semibold text-brand-800">Consultar miembros de<select value={currentId} onChange={(event) => setBrowseId(event.target.value)} disabled={disabled} className={inputClasses(false)}>{scopes.map((scope) => <option key={scope.subcampania_id} value={scope.subcampania_id}>{scope.campania_nombre} · {scope.nombre}</option>)}</select></label>}
      {currentId && <AccessMembers key={`${currentId}:${memberVersion}`} scopeId={currentId} disabled={disabled} onSelect={onPerson} />}
      {searchAction && <div className="border-t border-neutral-200 pt-3"><h3 className="mb-2 text-sm font-bold text-brand-800">Localizar otra persona registrada</h3><AccessPersonSearch key={key} action={searchAction} scopeIds={scopeIds} disabled={disabled} onSelect={onPerson} /></div>}
    </>}
    {operation === 'REEMPLAZAR_ADMINISTRADOR' && person && <div className="space-y-3 border-t border-neutral-200 pt-3">
      <h3 className="font-bold text-brand-800">Persona entrante</h3>
      {replacement ? <SelectedPerson person={replacement} label="Persona entrante" disabled={disabled} onClear={() => onReplacement(null)} /> : <AccessPersonSearch key={`${key}:${person.usuario_id}`} action="REEMPLAZAR_ADMINISTRADOR" scopeIds={scopeIds} disabled={disabled} onSelect={onReplacement} excludeId={person.usuario_id} />}
      <label className="block text-sm font-semibold text-brand-800">Tratamiento de la persona saliente<select value={treatment} disabled={disabled} onChange={(event) => onTreatment(event.target.value as typeof treatment)} className={inputClasses(false)}><option value="SIN_ACCESO">Retirar todo acceso contextual</option><option value="PLANTADOR">Conservar como plantador</option></select></label>
    </div>}
  </Card>
}
