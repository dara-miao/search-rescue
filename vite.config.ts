import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '3d-tiles-renderer/r3f', '3d-tiles-renderer/plugins'],
  },
  server: {
    host: '0.0.0.0',
    port: 43147,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/v1/3dtiles': {
        target: 'https://tile.googleapis.com',
        changeOrigin: true,
        secure: true,
      },
      '/maps/api': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 43147,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/v1/3dtiles': {
        target: 'https://tile.googleapis.com',
        changeOrigin: true,
        secure: true,
      },
      '/maps/api': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
