import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Chat App',
        short_name: 'Chat',
        description: 'Real-time chat application',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/chat-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/chat-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        related_applications: [],
        prefer_related_applications: false,
        gcm_sender_id: "428936093091"
      },
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectRegister: 'auto',
      injectManifest: {
        injectionPoint: null
      },
      workbox: {
        sourcemap: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      },
      includeAssets: ['chat-icon.png'],
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
});
