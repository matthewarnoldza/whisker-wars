
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import './ui/index.css'
import { initTrackers } from './utils/trackers'
import { isNative } from './utils/platform'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Load GA4 + Meta Pixel after first paint, public web build only (self-gated).
initTrackers()

// Register the service worker on the public web build only. Same allowlist gate
// as the trackers: production mode (not DEV, not itchio), a real browser with SW
// support, and never under Capacitor native. The itch.io build never reaches
// this because MODE !== 'production' there (and the PWA plugin isn't even in its
// plugin array).
if (
  import.meta.env.MODE === 'production' &&
  !isNative() &&
  'serviceWorker' in navigator
) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
