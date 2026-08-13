/* eslint-disable react-refresh/only-export-components -- Contexto y hook se exportan juntos por contrato público. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const DISMISSED_UNTIL_KEY = 'r3foresta:pwa-install:dismissed-until'
const INSTALLED_KEY = 'r3foresta:pwa-install:installed'
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type RelatedApplication = {
  id?: string
  platform: string
  url?: string
}

type NavigatorWithPwaCapabilities = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>
  standalone?: boolean
}

export type PwaInstallPlatform = 'android' | 'ios' | 'other'
export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

type PwaInstallContextValue = {
  canInstall: boolean
  dismissBanner: () => void
  install: () => Promise<PwaInstallOutcome>
  isBannerVisible: boolean
  isInstalled: boolean
  isPrompting: boolean
  platform: PwaInstallPlatform
  shouldShowMenuInstall: boolean
}

const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined)

function getStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Si el navegador bloquea storage, la instalación sigue funcionando.
  }
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Si el navegador bloquea storage, la instalación sigue funcionando.
  }
}

function getStoredNumber(key: string) {
  const rawValue = getStoredValue(key)
  if (!rawValue) return 0

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function getPlatform(): PwaInstallPlatform {
  const userAgent = window.navigator.userAgent

  if (/Android/i.test(userAgent)) return 'android'

  const isIosDevice = /iPad|iPhone|iPod/i.test(userAgent)
  const isIpadDesktopMode =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1

  return isIosDevice || isIpadDesktopMode ? 'ios' : 'other'
}

function isStandaloneDisplay() {
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isNavigatorStandalone = Boolean(
    (window.navigator as NavigatorWithPwaCapabilities).standalone,
  )

  return isDisplayModeStandalone || isNavigatorStandalone
}

function isDismissed() {
  return Date.now() < getStoredNumber(DISMISSED_UNTIL_KEY)
}

function isStoredAsInstalled() {
  return getStoredValue(INSTALLED_KEY) === 'true'
}

async function detectRelatedPwaInstallation() {
  if (isStandaloneDisplay()) return true

  const navigatorWithPwaCapabilities = window.navigator as NavigatorWithPwaCapabilities
  const getInstalledRelatedApps = navigatorWithPwaCapabilities.getInstalledRelatedApps

  if (!getInstalledRelatedApps) return null

  try {
    const relatedApplications = await getInstalledRelatedApps.call(window.navigator)
    return relatedApplications.some((application) => application.platform === 'webapp')
  } catch {
    // La API es complementaria; beforeinstallprompt sigue siendo el fallback.
    return null
  }
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext)

  if (!context) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider')
  }

  return context
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [platform] = useState<PwaInstallPlatform>(getPlatform)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isBannerVisible, setIsBannerVisible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(
    () => isStandaloneDisplay() || isStoredAsInstalled(),
  )
  const [isPrompting, setIsPrompting] = useState(false)

  useEffect(() => {
    if (platform !== 'android') return undefined

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()

      // Este evento no se emite si la PWA sigue instalada. Si reaparece,
      // cualquier marcador anterior quedó obsoleto tras una desinstalación.
      removeStoredValue(INSTALLED_KEY)
      setIsInstalled(false)
      setInstallPrompt(event as BeforeInstallPromptEvent)

      if (!isDismissed()) {
        setIsBannerVisible(true)
      }
    }

    const handleAppInstalled = () => {
      setStoredValue(INSTALLED_KEY, 'true')
      setInstallPrompt(null)
      setIsBannerVisible(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [platform])

  useEffect(() => {
    if (platform !== 'android') return undefined

    let isActive = true

    const reconcileInstalledState = async () => {
      const detectedInstallation = await detectRelatedPwaInstallation()
      if (!isActive || detectedInstallation === null) return

      if (detectedInstallation) {
        setStoredValue(INSTALLED_KEY, 'true')
        setIsInstalled(true)
        return
      }

      removeStoredValue(INSTALLED_KEY)
      setIsInstalled(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcileInstalledState()
      }
    }

    void reconcileInstalledState()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isActive = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [platform])

  const dismissBanner = useCallback(() => {
    setStoredValue(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_DURATION_MS))
    setIsBannerVisible(false)
  }, [])

  const install = useCallback(async (): Promise<PwaInstallOutcome> => {
    if (!installPrompt || isPrompting) return 'unavailable'

    setIsPrompting(true)

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice

      setInstallPrompt(null)
      setIsBannerVisible(false)

      if (choice.outcome === 'accepted') {
        setStoredValue(INSTALLED_KEY, 'true')
        setIsInstalled(true)
        return 'accepted'
      }

      setStoredValue(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_DURATION_MS))
      return 'dismissed'
    } catch {
      setInstallPrompt(null)
      setIsBannerVisible(false)
      return 'unavailable'
    } finally {
      setIsPrompting(false)
    }
  }, [installPrompt, isPrompting])

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: Boolean(installPrompt),
      dismissBanner,
      install,
      isBannerVisible: isBannerVisible && Boolean(installPrompt),
      isInstalled,
      isPrompting,
      platform,
      shouldShowMenuInstall: platform !== 'other' && !isInstalled,
    }),
    [dismissBanner, install, installPrompt, isBannerVisible, isInstalled, isPrompting, platform],
  )

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
}
