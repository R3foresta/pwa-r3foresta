import { usePwaInstall } from '../contexts/PwaInstallContext'

export function useAndroidPwaInstallPrompt() {
  const { dismissBanner, install, isBannerVisible, isPrompting } = usePwaInstall()

  return {
    dismiss: dismissBanner,
    install,
    isPrompting,
    isVisible: isBannerVisible,
  }
}
