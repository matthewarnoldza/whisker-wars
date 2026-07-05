
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Trackers (GA4 + Meta Pixel) are no longer in index.html — they load at
// runtime and are gated to the public web build in src/utils/trackers.ts.
// No build-time stripping is needed for itch.io / native / other modes.

/**
 * Rewrite absolute asset paths to relative in bundled JS output.
 *
 * Vite's `base: './'` handles paths in HTML and CSS, but hardcoded
 * string literals like "/images/cats/Whiskers.png" in .ts files pass
 * through bundling unchanged. This catches those 100+ occurrences.
 */
function rewriteAssetPathsPlugin(): Plugin {
  return {
    name: 'rewrite-asset-paths',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          chunk.code = chunk.code
            .replace(/"\/(images|sounds)\//g, '"./$1/')
            .replace(/'\/(images|sounds)\//g, "'./$1/")
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'itchio' ? [rewriteAssetPathsPlugin()] : []),
    // Service worker for web builds only. The itch.io offline build ships a
    // relative-path zip and never talks to a server, so it gets no SW at all.
    // Native (Capacitor) consumes the default build but the runtime
    // registration in src/main.tsx is gated so the SW never registers there.
    ...(mode === 'itchio'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            // We register manually in src/main.tsx (production web, non-native).
            injectRegister: false,
            manifest: {
              name: 'Whisker Wars',
              short_name: 'Whisker Wars',
              theme_color: '#0f172a',
              // No square icon exists in public/images/logos (all logos are
              // non-square), so the icons array is intentionally omitted.
            },
            workbox: {
              // Precache the app shell only: JS/CSS/HTML + self-hosted fonts.
              // The ~12MB of images/sounds are handled at runtime below.
              globPatterns: ['**/*.{js,css,html,woff2}'],
              runtimeCaching: [
                {
                  urlPattern: ({ url, sameOrigin }) =>
                    sameOrigin && url.pathname.startsWith('/images/'),
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'ww-images',
                    expiration: {
                      maxEntries: 200,
                      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                    },
                  },
                },
                {
                  urlPattern: ({ url, sameOrigin }) =>
                    sameOrigin && url.pathname.startsWith('/sounds/'),
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'ww-sounds',
                    expiration: {
                      maxEntries: 200,
                      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                    },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  base: mode === 'itchio' ? './' : '/',
  build: {
    ...(mode === 'itchio' ? { outDir: 'dist-itchio' } : {}),
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-framer': ['framer-motion'],
          // Firebase SDK — only reached via dynamic import in utils/firebase.ts,
          // so it stays out of the main chunk; this just gives it a stable name.
          'vendor-firebase': ['firebase/app', 'firebase/database'],
        }
      }
    }
  }
}))
