// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa' // <-- 1. Import du plugin

export default defineConfig({
  plugins: [
    vue(),
    // --- 2. CONFIGURATION DE L'APPLICATION MOBILE ---
    VitePWA({
      registerType: 'autoUpdate', // Met à jour l'app automatiquement en arrière-plan
      devOptions: {
        enabled: true // Permet de tester la PWA même en local (localhost)
      },
      manifest: {
        name: 'IK Zen',
        short_name: 'IK Zen',
        description: 'Le suivi de vos frais kilométriques, enfin simple.',
        theme_color: '#00334E', // Le bleu de ta charte graphique
        background_color: '#F8F9FA',
        display: 'standalone', // Masque la barre d'URL Safari/Chrome (mode App native)
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
})