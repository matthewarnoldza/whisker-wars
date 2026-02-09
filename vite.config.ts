
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Strip Google Analytics 4 script tags from index.html.
 * Only used for itch.io builds. The game's analytics.ts safely
 * no-ops when window.gtag is undefined.
 */
function stripGA4Plugin(): Plugin {
  return {
    name: 'strip-ga4',
    transformIndexHtml(html) {
      return html
        .replace(/\s*<!--\s*Google tag \(gtag\.js\)\s*-->\s*\n?/, '\n')
        .replace(/\s*<script\s+async\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]*"><\/script>\s*\n?/, '\n')
        .replace(/\s*<script>\s*\n?\s*window\.dataLayer[\s\S]*?<\/script>\s*\n?/, '\n')
    },
  }
}

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
    ...(mode === 'itchio' ? [stripGA4Plugin(), rewriteAssetPathsPlugin()] : []),
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
        }
      }
    }
  }
}))
