import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Transformar el adaptador real permite simular solo la GPU y probar la
    // limpieza de capas/listeners de Leaflet ante un fallo de inicialización.
    server: { deps: { inline: ['@maplibre/maplibre-gl-leaflet'] } },
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
})
