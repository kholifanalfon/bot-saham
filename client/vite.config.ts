import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env dari root project (satu level di atas client/)
  const env = loadEnv(mode, '../', '')

  // Gunakan VITE_BASE_PATH dari .env, default ke '/'
  const basePath = env.VITE_BASE_PATH || '/'

  return {
    base: basePath,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Bot Saham Premium',
          short_name: 'BotSaham',
          description: 'Analisis & BTST Screener Saham Bursa Efek Indonesia',
          theme_color: '#0a0e21',
          background_color: '#0a0e21',
          display: 'standalone',
          orientation: 'portrait',
          start_url: basePath,
          scope: basePath,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
  }
})
