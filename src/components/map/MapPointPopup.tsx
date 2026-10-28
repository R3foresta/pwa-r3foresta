import type { ReactNode } from 'react'
import './mapPointPopup.css'

type Props = { title: ReactNode; children: ReactNode }

/** Tarjeta compartida; cada mapa aporta su contenido y sus acciones. */
export default function MapPointPopup({ title, children }: Props) {
  return <div className="space-y-3 text-neutral-800">
    <p className="pr-8 text-sm font-bold">{title}</p>
    <div className="map-point-popup-list space-y-2 overflow-y-auto">{children}</div>
  </div>
}
