
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El SW se actualiza solo en cuanto hay una versión nueva disponible.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Habit Tracker — Rastreo de hábitos',
        short_name: 'HabitTracker',
        description:
          'Rastreador de hábitos y gestión de tiempo personal: agenda actividades, marca tu progreso diario y sigue tu racha.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0b0f19',
        theme_color: '#0b0f19',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precachea todo el build (JS/CSS/HTML/íconos): la app abre sin conexión.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        // Navegaciones sin conexión sirven el shell de la SPA (React Router toma el control).
        navigateFallback: '/index.html',
        // Las llamadas a la API NUNCA caen al fallback del shell.
        navigateFallbackDenylist: [/^\/api\//],
        // Handler de notificationclick para las alertas nativas de hábitos:
        // al hacer clic, enfoca la app abierta (o abre /dashboard). En dev el SW
        // lo gestiona el plugin (solo falta esta mejora de enfoque, no las alertas).
        importScripts: ['notify-sw.js'],
        // No cachear el SW complementario (se sirve fresco desde /public).
        globIgnores: ['**/notify-sw.js'],
      },
      // SW activo también en desarrollo (npm run dev) para poder probar la PWA.
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
