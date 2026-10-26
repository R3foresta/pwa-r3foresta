import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button, StatusBadge } from '../../../components/ui'
import ImpactoMapPanel from '../../impacto/components/ImpactoMapPanel'
import { useParticipacionInicioMap } from '../hooks/useParticipacionInicioMap'
import type { CapacidadSubcampania } from '../types'
import { scopeRole } from './plantadorPresentation'

type Props = { scopes: CapacidadSubcampania[]; selectedId: string | null; onSelect: (id: string) => void; onEnter: (scope: CapacidadSubcampania) => void; onClose: () => void }

export default function ParticipacionInicioMap({ scopes, selectedId, onSelect, onEnter, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { zones, loading, failures, retry } = useParticipacionInicioMap(scopes)
  const selected = scopes.find(scope => scope.subcampania_id === selectedId)
  const missing = scopes.length - zones.length
  useEffect(() => {
    const element = dialog.current
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => { element?.close(); document.body.style.overflow = overflow; if (focus?.isConnected) focus.focus() }
  }, [])

  return createPortal(<dialog ref={dialog} aria-labelledby="inicio-mapa-title" onCancel={event => { event.preventDefault(); onClose() }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 text-neutral-800">
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="flex shrink-0 items-center justify-between gap-3 p-3"><h2 id="inicio-mapa-title" className="text-lg font-bold">Mis subcampañas</h2><Button variant="secondary" className="min-h-11" onClick={onClose}>Ver tarjetas</Button></header>
      <label className="block px-3 pb-3 text-sm font-semibold">Seleccionar subcampaña
        <select value={selected?.subcampania_id ?? ''} onChange={event => onSelect(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base">
          <option value="">Elige una zona del mapa o de esta lista</option>
          {scopes.map(scope => <option key={scope.subcampania_id} value={scope.subcampania_id}>{scope.campania_nombre} · {scope.nombre}</option>)}
        </select>
      </label>
      <div className="relative min-h-0 flex-1 overflow-auto">
        {loading ? <p role="status" className="p-4">Consultando ubicaciones disponibles…</p> : <ImpactoMapPanel fill subcampanias={zones} puntos={[]} seleccion={selected ? `s:${selected.subcampania_id}` : null} onSelect={value => { const zone = zones.find(item => `s:${item.id}` === value); if (zone) onSelect(zone.id) }} />}
      </div>
      <div className="max-h-[40dvh] shrink-0 space-y-2 overflow-y-auto border-t border-neutral-200 bg-white p-3">
        {failures.length > 0 && <div className="flex flex-wrap items-center gap-2"><p role="alert" className="text-sm text-danger-700">No pudimos consultar todas las ubicaciones. Puedes entrar desde las tarjetas.</p><Button size="sm" variant="secondary" onClick={retry}>Reintentar ubicaciones</Button></div>}
        {!loading && missing > 0 && <p role="status" className="text-sm text-neutral-600">{missing} {missing === 1 ? 'subcampaña sin ubicación disponible' : 'subcampañas sin ubicación disponible'}. Puedes elegirlas en la lista o ver las tarjetas.</p>}
        {selected ? <section aria-label="Zona elegida" className="space-y-2"><p className="text-xs text-neutral-600">{selected.campania_nombre}</p><div className="flex flex-wrap justify-between gap-2"><h3 className="break-words font-bold">{selected.nombre}</h3><StatusBadge status={selected.estado} /></div><p className="text-sm">{scopeRole(selected)}</p><Button fullWidth className="min-h-12" onClick={() => onEnter(selected)}>Entrar a la subcampaña</Button></section> : <p className="text-sm text-neutral-600">Selecciona una zona para consultar su ficha y entrar.</p>}
      </div>
    </div>
  </dialog>, document.body)
}
