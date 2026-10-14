import heroCanopy from '../assets/home/hero-canopy.webp'
import recoleccionImg from '../assets/home/recoleccion.webp'
import germinacionImg from '../assets/home/germinacion.webp'
import plantacionImg from '../assets/home/plantacion.webp'
import co2Img from '../assets/home/co2.webp'
import type { Screen } from '../types/navigation'

export const hero = {
  title: 'Trazabilidad viva',
  subtitle: 'Consulta y registra cada fase de la trazabilidad.',
  badge: 'Trazabilidad en campo',
  image: heroCanopy,
}

export const syncNotice = {
  label: 'Conexión necesaria para guardar',
  detail: 'Los registros y las fotos se envían mientras tienes conexión.',
}

export const sections: {
  label: string
  target: Screen
  image: string
  detail: string
  action: string
  disabled?: boolean
}[] = [
  {
    label: 'Recolección',
    target: 'collections',
    image: recoleccionImg,
    detail: 'Registra lotes y consulta su estado.',
    action: 'Ver recolecciones',
  },
  {
    label: 'Germinación',
    target: 'vivero',
    image: germinacionImg,
    detail: 'Revisa lotes y eventos del vivero.',
    action: 'Ver lotes',
  },
  {
    label: 'Plantación',
    target: 'planting',
    image: plantacionImg,
    detail: 'Consulta campañas y subcampañas.',
    action: 'Ver campañas',
  },
  {
    label: 'CO₂',
    target: 'co2',
    image: co2Img,
    detail: 'Seguimiento de captura de carbono.',
    action: 'Próximamente',
    disabled: true,
  },
]
