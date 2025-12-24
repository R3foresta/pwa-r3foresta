import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    chunkSizeWarningLimit: 1000, // Aumentar límite a 1000 KB
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar librerías grandes en chunks independientes
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
