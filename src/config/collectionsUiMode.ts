export type CollectionsUiMode = 'legacy' | 'v2'

export const COLLECTIONS_UI_MODE_STORAGE_KEY = 'collections_ui_mode'

const ENV_MODE = import.meta.env.VITE_COLLECTIONS_UI_MODE

function isCollectionsUiMode(value: string | null | undefined): value is CollectionsUiMode {
  return value === 'legacy' || value === 'v2'
}

export function getDefaultCollectionsUiMode(): CollectionsUiMode {
  return isCollectionsUiMode(ENV_MODE) ? ENV_MODE : 'v2'
}

export function getCollectionsUiMode(): CollectionsUiMode {
  if (typeof window === 'undefined') {
    return getDefaultCollectionsUiMode()
  }

  const stored = window.localStorage.getItem(COLLECTIONS_UI_MODE_STORAGE_KEY)
  if (isCollectionsUiMode(stored)) {
    return stored
  }

  return getDefaultCollectionsUiMode()
}

export function setCollectionsUiMode(mode: CollectionsUiMode) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(COLLECTIONS_UI_MODE_STORAGE_KEY, mode)
}
