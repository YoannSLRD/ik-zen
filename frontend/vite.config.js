// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // --- AJOUTEZ CETTE SECTION ---
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
  // ----------------------------
})