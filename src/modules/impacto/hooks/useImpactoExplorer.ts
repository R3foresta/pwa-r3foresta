import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImpactoConsulta, ImpactoScope } from '../types'

export type ImpactoExplorerLevel = 'campania' | 'subcampania'
export type ImpactoExplorerView = { level: ImpactoExplorerLevel; focusId: string | null }
export type ImpactoExplorerChoice = {
  id: string
  nombre: string
  context: string
  count: number
  photo?: string
}

type Options = {
  data: ImpactoConsulta | null
  scope: ImpactoScope
  queryKey: string
  selected: string | null
  view: ImpactoExplorerView
  onViewChange: (view: ImpactoExplorerView) => void
  onSelectionChange: (value: string | null) => void
}

// El carrusel usa gap-4. Mantener su separación y la medición en sincronía.
const CARD_GAP = 16

function buildChoices(data: ImpactoConsulta | null, campaigns: boolean): ImpactoExplorerChoice[] {
  if (!data) return []
  const choices = campaigns
    ? data.campanias.map(campaign => ({
      id: campaign.id,
      nombre: campaign.nombre,
      context: '',
      count: campaign.plantacion_inicial,
      photo: data.registros.find(record => record.campania_id === campaign.id && record.fotos.length)?.fotos[0]?.id,
    }))
    : data.subcampanias.map(zone => ({
      id: zone.id,
      nombre: zone.nombre,
      context: [
        zone.zona && zone.nombre !== zone.zona ? zone.zona : '',
        data.campanias.find(campaign => campaign.id === zone.campania_id)?.nombre,
      ].filter(Boolean).join(' · '),
      count: zone.plantacion_inicial,
      photo: data.registros.find(record => record.subcampania_id === zone.id && record.fotos.length)?.fotos[0]?.id,
    }))
  return choices.sort((a, b) => b.count - a.count)
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** Coordina únicamente la exploración visual; consulta y selección en URL pertenecen a la pantalla. */
export function useImpactoExplorer({ data, scope, queryKey, selected, view, onViewChange, onSelectionChange }: Options) {
  const campaigns = scope.tipo === 'global' && view.level === 'campania'
  const viewKey = queryKey + campaigns
  const [focusRevision, setFocusRevision] = useState(0)
  const [loops, setLoops] = useState(false)
  const mapSection = useRef<HTMLElement>(null)
  const carousel = useRef<HTMLDivElement>(null)
  const keyboardCarousel = useRef(false)
  const selectedPoint = data?.mapa.find(point => `r:${point.registro_id}` === selected)
  const selectedZone = data?.subcampanias.find(zone => `s:${zone.id}` === selected || zone.id === selectedPoint?.subcampania_id)
  const focused = selectedZone ? (campaigns ? selectedZone.campania_id : selectedZone.id) : view.focusId
  const choices = useMemo(() => buildChoices(data, campaigns), [data, campaigns])
  const choice = choices.find(item => item.id === focused)
  const requestedMapChoice = choices.find(item => item.id === view.focusId)
  // Los enlaces antiguos pueden combinar foco y selección incompatibles.
  // La selección debe seguir visible, aunque haya que ampliar el mapa completo.
  const incompatibleFocus = Boolean(requestedMapChoice && selectedZone && requestedMapChoice.id !== (campaigns ? selectedZone.campania_id : selectedZone.id))
  const mapChoice = incompatibleFocus ? undefined : requestedMapChoice
  const zones = data?.subcampanias.filter(zone => !mapChoice || (campaigns ? zone.campania_id === mapChoice.id : zone.id === mapChoice.id)) ?? []
  const zoneIds = new Set(zones.map(zone => zone.id))
  const points = data?.mapa.filter(point => !mapChoice || zoneIds.has(point.subcampania_id)) ?? []
  const choicesKey = choices.map(item => item.id).join(',')
  const choiceCount = choices.length

  useEffect(() => {
    const rail = carousel.current
    if (!rail) return
    const measure = () => {
      const card = rail.querySelector<HTMLElement>('[data-campaign]')
      setLoops(Boolean(card && card.offsetWidth > 0 && rail.clientWidth > 0 && choiceCount > 1 && (card.offsetWidth + CARD_GAP) * choiceCount - CARD_GAP > rail.clientWidth - 8))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [choicesKey, choiceCount, viewKey])

  useEffect(() => {
    const rail = carousel.current
    const card = rail?.querySelector<HTMLElement>('[data-campaign]')
    if (rail) rail.scrollLeft = loops && card ? (card.offsetWidth + CARD_GAP) * choiceCount : 0
  }, [loops, choicesKey, choiceCount, viewKey])

  function wrapCarousel() {
    const rail = carousel.current
    const card = rail?.querySelector<HTMLElement>('[data-campaign]')
    if (!loops || !rail || !card || (keyboardCarousel.current && rail.contains(document.activeElement))) return
    const cycle = (card.offsetWidth + CARD_GAP) * choiceCount
    const shift = rail.scrollLeft < cycle / 2 ? cycle : rail.scrollLeft > cycle * 1.5 ? -cycle : 0
    if (!shift) return
    // Un gesto táctil puede dejar foco en una copia que sale de la vista.
    if (document.activeElement instanceof HTMLElement && rail.contains(document.activeElement)) document.activeElement.blur()
    rail.scrollTo({ left: rail.scrollLeft + shift, behavior: 'instant' })
  }

  function focusCard(id: string, source: 'map' | 'card' = 'card') {
    if (source === 'card') {
      onViewChange({ level: campaigns ? 'campania' : 'subcampania', focusId: id })
      setFocusRevision(revision => revision + 1)
    }
    const rail = carousel.current
    if (loops && rail) {
      const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2
      const distance = (card: HTMLElement) => Math.abs(card.getBoundingClientRect().left + card.offsetWidth / 2 - railCenter)
      const card = [...rail.querySelectorAll<HTMLElement>('[data-campaign]')]
        .filter(item => item.dataset.campaign === id)
        .sort((a, b) => distance(a) - distance(b))[0]
      if (card) rail.scrollTo?.({ left: rail.scrollLeft + card.getBoundingClientRect().left + card.offsetWidth / 2 - railCenter, behavior: scrollBehavior() })
    }
    const section = mapSection.current
    const rect = section?.getBoundingClientRect()
    if (source === 'card' && rect && (rect.top < 0 || rect.top > window.innerHeight / 2)) {
      section?.scrollIntoView?.({ block: 'start', behavior: scrollBehavior() })
    }
  }

  function select(value: string) {
    const zoneId = value.startsWith('s:') ? value.slice(2) : data?.mapa.find(point => `r:${point.registro_id}` === value)?.subcampania_id
    const zone = data?.subcampanias.find(item => item.id === zoneId)
    if (zone) focusCard(campaigns ? zone.campania_id : zone.id, 'map')
    onSelectionChange(value)
  }

  function showAll() {
    onViewChange({ level: campaigns ? 'campania' : 'subcampania', focusId: null })
    setFocusRevision(revision => revision + 1)
  }

  function setBrowseLevel(level: ImpactoExplorerLevel) {
    onViewChange({ level, focusId: null })
    setFocusRevision(revision => revision + 1)
  }

  function stepCard(direction: number) {
    if (!choiceCount) return
    const index = choices.findIndex(item => item.id === focused)
    const nextIndex = index < 0 ? (direction > 0 ? 0 : choiceCount - 1) : (index + direction + choiceCount) % choiceCount
    focusCard(choices[nextIndex].id)
  }

  function beginKeyboardNavigation() { keyboardCarousel.current = true }
  function beginPointerNavigation() { keyboardCarousel.current = false }

  return {
    campaigns, choices, choice, mapChoice, zones, points, loops, focusRevision,
    unavailableFocus: Boolean(data && view.focusId && !requestedMapChoice),
    incompatibleFocus,
    mapSection, carousel, beginKeyboardNavigation, beginPointerNavigation,
    setBrowseLevel, focusCard, select, showAll, stepCard, wrapCarousel,
  }
}

export type ImpactoExplorerState = ReturnType<typeof useImpactoExplorer>
