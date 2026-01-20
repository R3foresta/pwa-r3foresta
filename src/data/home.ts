import heroCanopy from '../assets/home/hero-canopy.jpg'
import recoleccionImg from '../assets/home/recoleccion.jpg'
import germinacionImg from '../assets/home/germinacion.jpg'
import plantacionImg from '../assets/home/plantacion.jpg'
import co2Img from '../assets/home/co2.jpg'
import type { Screen } from '../types/navigation'

export const hero = {
  title: 'Trazabilidad viva',
  subtitle: 'Monitorea cada fase y mantiene la sincronización al día.',
  badge: '82% sincronizado',
  image: heroCanopy,
}

export const syncNotice = {
  label: 'Elementos pendientes de sincronización',
  detail: '6 registros se cargarán cuando haya señal estable.',
}

export const metrics = [
  { label: 'Plantaciones activas', value: '12', helper: 'en 4 fincas' },
  { label: 'Listos para trasplantar', value: '120', helper: 'Semana 48' },
  { label: 'CO₂ estimado', value: '20,6 T', helper: '+1.4 T este mes' },
  { label: 'Superficie monitoreada', value: '86 ha', helper: 'Satélite al día' },
]

export const sections: {
  label: string
  target: Screen
  image: string
  stat: string
  detail: string
}[] = [
  {
    label: 'Recolección',
    target: 'collections',
    image: recoleccionImg,
    stat: '24 lotes',
    detail: 'Último ingreso hace 1h',
  },
  {
    label: 'Germinación',
    target: 'vivero',
    image: germinacionImg,
    stat: '120 plántulas',
    detail: '78% con riego hoy',
  },
  {
    label: 'Plantación',
    target: 'planting',
    image: plantacionImg,
    stat: '3 predios activos',
    detail: '42% de meta semanal',
  },
  {
    label: 'CO₂',
    target: 'co2',
    image: co2Img,
    stat: '20,6 T capturadas',
    detail: 'Actualizado cada 24h',
  },
]

export const recent = [
  { title: 'Trasplante programado', time: '09:30', meta: 'Lote Alto Verde · 36 plántulas' },
  { title: 'Riego completado', time: '08:10', meta: 'Germinación · Sector B' },
  { title: 'Captura de CO₂', time: 'Ayer', meta: ' +0,3 T estimadas' },
]
