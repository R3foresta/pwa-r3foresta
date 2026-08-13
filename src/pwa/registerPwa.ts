import { registerSW } from 'virtual:pwa-register'
import { setPwaInitializationStatus } from './pwaStatus'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000
const UPDATE_MESSAGE_DELAY_MS = 500
const LEGACY_CACHE_PREFIX = 'r3foresta-'
const WORKBOX_PRECACHE_PREFIX = 'workbox-precache'

async function requestServiceWorkerUpdate(registration: ServiceWorkerRegistration | undefined) {
  if (!registration || !navigator.onLine || document.visibilityState !== 'visible') return

  await registration.update()
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
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  registerSW({
    // Esperar al evento load evita que el registro y el precache compitan con
    // la primera pantalla en conexiones o dispositivos lentos.
    immediate: false,
    onNeedReload: () => {
      setPwaInitializationStatus('updating')
      window.setTimeout(() => window.location.reload(), UPDATE_MESSAGE_DELAY_MS)
    },
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      void cleanupLegacyCaches().catch((error: unknown) => {
        console.error('No se pudieron limpiar los cachés antiguos:', error)
      })

      void requestServiceWorkerUpdate(registration)
        .catch((error: unknown) => {
          console.error('No se pudo comprobar una actualización de la aplicación:', error)
        })

      window.setInterval(() => {
        void requestServiceWorkerUpdate(registration).catch((error: unknown) => {
          console.error('No se pudo comprobar una actualización de la aplicación:', error)
        })
      }, UPDATE_CHECK_INTERVAL_MS)

      window.addEventListener('online', () => {
        void requestServiceWorkerUpdate(registration).catch((error: unknown) => {
          console.error('No se pudo comprobar una actualización de la aplicación:', error)
        })
      })

      document.addEventListener('visibilitychange', () => {
        void requestServiceWorkerUpdate(registration).catch((error: unknown) => {
          console.error('No se pudo comprobar una actualización de la aplicación:', error)
        })
      })
    },
    onRegisterError: (error) => {
      console.error('Falló el registro del service worker:', error)
    },
  })
}
