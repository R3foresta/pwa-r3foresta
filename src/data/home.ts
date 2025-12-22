import type { Screen } from '../types/navigation'

export const metrics = [
  { label: 'Plantaciones', value: '3', helper: '' },
  { label: 'Listos para trasplantar', value: '120', helper: '' },
  { label: 'T CO₂', value: '20,6', helper: '' },
]

export const actions: { label: string; target: Screen }[] = [
  { label: 'Recolección', target: 'collections' },
  { label: 'Germinación', target: 'germination' },
  { label: 'Plantación', target: 'planting' },
  { label: 'CO₂', target: 'co2' },
]
