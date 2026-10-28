import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import Icon from '../../../components/Icon'
import { Button, Card, Chip } from '../../../components/ui'
import type { ImpactoExplorerLevel, ImpactoExplorerState } from '../hooks/useImpactoExplorer'
import { formatImpactoNumber } from '../utils/consulta'
import ImpactoMapPanel from './ImpactoMapPanel'
import { PublicPhoto } from './ImpactoRegistroContent'

type Props = {
  explorer: ImpactoExplorerState
  global: boolean
  currentSubcampaniaId?: string
  selected: string | null
  returnTo: string
  scopeHref: (path: string, level: ImpactoExplorerLevel) => string
  selectedSummary?: ReactNode
}

export default function ImpactoExplorer({ explorer, global, currentSubcampaniaId, selected, returnTo, scopeHref, selectedSummary }: Props) {
  const {
    campaigns, choices, choice, mapChoice, zones, points, loops, focusRevision,
    mapSection, carousel, beginKeyboardNavigation, beginPointerNavigation,
    setBrowseLevel, focusCard, select, showAll, stepCard, wrapCarousel,
  } = explorer

  return (
    <section ref={mapSection} aria-labelledby="impacto-mapa-title" className="scroll-mt-4 space-y-5">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon name="map" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="impacto-mapa-title" tabIndex={-1} className="scroll-mt-4 rounded-lg text-lg font-bold tracking-tight text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400">Aquí estamos plantando</h2>
              <p className="mt-1 break-words text-sm text-neutral-600" aria-live="polite">
                {mapChoice ? `Mapa de ${mapChoice.nombre}` : 'Todas las ubicaciones públicas'}
                {selected && choice && <span className="mt-1 block">Selección: {choice.nombre}</span>}
              </p>
            </div>
          </div>
          {choice && <Button variant="secondary" size="sm" className="min-h-11" onClick={showAll}>Ver todas las ubicaciones</Button>}
        </div>
        {explorer.unavailableFocus && <p role="status" className="px-4 pb-4 text-sm text-neutral-700 sm:px-5">La ubicación del enlace no está disponible en esta consulta. Se muestran todas las ubicaciones públicas disponibles.</p>}
        {explorer.incompatibleFocus && <p role="status" className="px-4 pb-4 text-sm text-neutral-700 sm:px-5">La selección está fuera de la ubicación del enlace. Se muestran todas las ubicaciones para mantenerla visible.</p>}
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          <ImpactoMapPanel subcampanias={zones} puntos={points} seleccion={selected} onSelect={select} focusRevision={focusRevision} recordReturnTo={returnTo} />
        </div>
        <p className="px-4 pb-4 text-sm leading-5 text-neutral-600 sm:px-5">Cada punto reúne una plantación realizada en equipo. Selecciona un punto para conocer su historia.</p>
      </Card>
      {selectedSummary}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-brand-800">{campaigns ? 'Campañas' : 'Zonas'}</h3>
            <p className="mt-1 text-sm leading-5 text-neutral-600">Elige una tarjeta para verla en el mapa</p>
          </div>
          {global && (
            <div className="flex gap-1 rounded-full bg-brand-100/60 p-1" role="group" aria-label="Mostrar en el carrusel">
              <Chip className="min-h-11" selected={!campaigns} onClick={() => setBrowseLevel('subcampania')}>Zonas</Chip>
              <Chip className="min-h-11" selected={campaigns} onClick={() => setBrowseLevel('campania')}>Campañas</Chip>
            </div>
          )}
          {loops && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" className="min-h-11 min-w-11" aria-label="Tarjeta anterior" onClick={() => stepCard(-1)}>
                <Icon name="arrow-left" className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" className="min-h-11 min-w-11" aria-label="Tarjeta siguiente" onClick={() => stepCard(1)}>
                <Icon name="arrow-left" className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}
        </div>
        {!choices.length && <p role="status" className="rounded-2xl bg-white p-4 text-sm text-neutral-600">No hay {campaigns ? 'campañas' : 'zonas'} públicas en esta consulta.</p>}
        <div
          ref={carousel}
          onKeyDownCapture={beginKeyboardNavigation}
          onPointerDownCapture={beginPointerNavigation}
          onScroll={wrapCarousel}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 pt-1"
          aria-label="Explorar campañas y zonas"
        >
          {(loops ? [0, 1, 2] : [0]).flatMap(copy => choices.map(item => {
            const duplicate = loops && copy !== 1
            const active = choice?.id === item.id
            return (
              <Card
                as="article"
                padding="none"
                key={`${copy}:${item.id}`}
                aria-hidden={duplicate ? true : undefined}
                onMouseDown={event => { if (duplicate) event.preventDefault() }}
                data-campaign={item.id}
                onClick={event => {
                  // Enlaces y botones conservan su acción propia dentro de la tarjeta.
                  if (event.target instanceof Element && event.target.closest('a, button')) return
                  focusCard(item.id)
                }}
                className={`flex w-[78%] max-w-72 shrink-0 cursor-pointer snap-center flex-col overflow-hidden transition hover:ring-brand-400 ${active ? 'ring-2 ring-brand-500' : ''}`}
              >
                {item.photo ? (
                  <PublicPhoto key={item.photo} id={item.photo} cover decorative={duplicate} />
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 bg-brand-50 px-4 text-center text-brand-700">
                    <span aria-hidden="true"><Icon name="leaf" className="h-8 w-8" /></span>
                    <span className="text-sm">Portada no incluida en esta consulta</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h4 className="break-words font-bold leading-6 text-brand-800">{item.nombre}</h4>
                  {item.context && <p className="mt-1 break-words text-sm leading-5 text-neutral-600">{item.context}</p>}
                  <p className="mb-4 mt-3 text-sm text-neutral-600"><strong className="text-xl font-bold tracking-tight text-brand-700">{formatImpactoNumber(item.count)}</strong> plantas iniciales</p>
                  <Button
                    variant={active ? 'primary' : 'secondary'}
                    size="sm"
                    className="mt-auto min-h-11 w-full"
                    tabIndex={duplicate ? -1 : undefined}
                    aria-label={`Ver en el mapa: ${item.nombre}`}
                    aria-pressed={active}
                    leftIcon={active ? 'check' : 'pin'}
                    onClick={() => focusCard(item.id)}
                  >
                    {active ? 'Viendo en el mapa' : 'Ver en el mapa'}
                  </Button>
                  {item.id !== currentSubcampaniaId && (
                    <Link
                      tabIndex={duplicate ? -1 : undefined}
                      aria-label={`${campaigns ? 'Conocer campaña' : 'Conocer zona'}: ${item.nombre}`}
                      to={scopeHref(`/impacto/${campaigns ? 'campanias' : 'subcampanias'}/${item.id}`, campaigns ? 'campania' : 'subcampania')}
                      state={{ impactoReturnTo: returnTo }}
                      className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-xl px-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      {campaigns ? 'Conocer campaña' : 'Conocer zona'}
                      <Icon name="chevron-right" className="h-4 w-4 shrink-0" />
                    </Link>
                  )}
                </div>
              </Card>
            )
          }))}
        </div>
      </div>
    </section>
  )
}
