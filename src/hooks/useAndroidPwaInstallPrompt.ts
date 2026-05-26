import { useCallback, useEffect, useState } from 'react'

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

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function getStoredNumber(key: string) {
  if (!canUseStorage()) return 0

  const rawValue = window.localStorage.getItem(key)
  if (!rawValue) return 0

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function setStoredNumber(key: string, value: number) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Si el navegador bloquea storage, la instalación sigue funcionando.
  }
}

function getStoredBoolean(key: string) {
  if (!canUseStorage()) return false
  return window.localStorage.getItem(key) === 'true'
}

function setStoredBoolean(key: string, value: boolean) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Si el navegador bloquea storage, la instalación sigue funcionando.
  }
}

function isAndroidBrowser() {
  return /Android/i.test(window.navigator.userAgent)
}

function isStandaloneDisplay() {
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isNavigatorStandalone = Boolean(
    (window.navigator as NavigatorWithStandalone).standalone,
  )

  return isDisplayModeStandalone || isNavigatorStandalone
}

function isDismissed() {
  return Date.now() < getStoredNumber(DISMISSED_UNTIL_KEY)
}

export function useAndroidPwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPrompting, setIsPrompting] = useState(false)

  useEffect(() => {
    if (!isAndroidBrowser() || isStandaloneDisplay() || getStoredBoolean(INSTALLED_KEY)) {
      return undefined
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()

      if (isDismissed()) {
        return
      }

      setInstallPrompt(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setStoredBoolean(INSTALLED_KEY, true)
      setInstallPrompt(null)
      setIsVisible(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    setStoredNumber(DISMISSED_UNTIL_KEY, Date.now() + DISMISS_DURATION_MS)
    setInstallPrompt(null)
    setIsVisible(false)
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt || isPrompting) return

    setIsPrompting(true)

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice

      if (choice.outcome === 'accepted') {
        setStoredBoolean(INSTALLED_KEY, true)
      } else {
        setStoredNumber(DISMISSED_UNTIL_KEY, Date.now() + DISMISS_DURATION_MS)
      }

      setInstallPrompt(null)
      setIsVisible(false)
    } finally {
      setIsPrompting(false)
    }
  }, [installPrompt, isPrompting])

  return {
    dismiss,
    install,
    isPrompting,
    isVisible: isVisible && !!installPrompt,
  }
}
