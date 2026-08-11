import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000
const LEGACY_CACHE_PREFIX = 'r3foresta-'
const WORKBOX_PRECACHE_PREFIX = 'workbox-precache'

function requestServiceWorkerUpdate(registration: ServiceWorkerRegistration | undefined) {
  if (!registration || !navigator.onLine || document.visibilityState !== 'visible') return

  void registration.update().catch((error: unknown) => {
    console.error('No se pudo comprobar una actualización de la aplicación:', error)
  })
}

async function cleanupLegacyCaches() {
  if (!('caches' in window)) return

  const cacheNames = await caches.keys()
  const newPrecacheIsReady = cacheNames.some((cacheName) =>
    cacheName.startsWith(WORKBOX_PRECACHE_PREFIX),
  )

  // No borrar el caché anterior hasta que Workbox haya terminado el precache nuevo.
  if (!newPrecacheIsReady) return

  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(LEGACY_CACHE_PREFIX))
      .map((cacheName) => caches.delete(cacheName)),
  )
}

export function registerPwa() {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      void cleanupLegacyCaches().catch((error: unknown) => {
        console.error('No se pudieron limpiar los cachés antiguos:', error)
      })

      requestServiceWorkerUpdate(registration)

      window.setInterval(() => {
        requestServiceWorkerUpdate(registration)
      }, UPDATE_CHECK_INTERVAL_MS)

      window.addEventListener('online', () => {
        requestServiceWorkerUpdate(registration)
      })

      document.addEventListener('visibilitychange', () => {
        requestServiceWorkerUpdate(registration)
      })
    },
    onRegisterError: (error) => {
      console.error('Falló el registro del service worker:', error)
    },
  })
}
