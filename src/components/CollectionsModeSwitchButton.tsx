import {
  getCollectionsUiMode,
  setCollectionsUiMode,
  type CollectionsUiMode,
} from '../config/collectionsUiMode'

type Props = {
  className?: string
}

function CollectionsModeSwitchButton({ className }: Props) {
  const currentMode = getCollectionsUiMode()
  const nextMode: CollectionsUiMode = currentMode === 'v2' ? 'legacy' : 'v2'

  const handleSwitch = () => {
    setCollectionsUiMode(nextMode)
    window.location.assign('/app/collections')
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className={className}
      title={`Cambiar a modo ${nextMode.toUpperCase()}`}
    >
      Modo {nextMode.toUpperCase()}
    </button>
  )
}

export default CollectionsModeSwitchButton
