import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        // Las llamadas al backend deben conservar sus errores reales de red.
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      },
    }),
  ],
  base: '/',
  build: {
    chunkSizeWarningLimit: 1000, // Aumentar límite a 1000 KB
    rollupOptions: {
      output: {
        manualChunks: {
          // React forma parte del shell; las librerías de cada feature se
          // descubren desde sus rutas lazy para no volverlas dependencias iniciales.
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
