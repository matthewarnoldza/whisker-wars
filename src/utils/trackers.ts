// Runtime loader for third-party analytics/marketing trackers.
//
// GA4 (gtag.js) and the Meta Pixel used to be hardcoded in index.html's
// <head>, shipping on every build and sitting on the critical path. They
// now load here — after first paint, and ONLY on the public web target.
//
// Gating is an allowlist: trackers inject only when this is a production
// build (`MODE === 'production'`, i.e. the default web/Vercel build) running
// in a browser context. Everything else is excluded — DEV, the itch.io
// offline build (`MODE === 'itchio'`), Capacitor native (iOS/Android), and
// any future non-web mode (e.g. steam) — because none of them match
// 'production'.

import { isNative } from './platform'

const GA4_ID = 'G-ZF8L92R0LS'
const META_PIXEL_ID = '26784686711114732'

declare global {
  interface Window {
    dataLayer: unknown[]
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

function shouldLoadTrackers(): boolean {
  try {
    if (typeof window === 'undefined') return false
    if (import.meta.env.DEV) return false
    // Allowlist: only the public web build (default Vercel build) qualifies.
    if (import.meta.env.MODE !== 'production') return false
    if (isNative()) return false
    return true
  } catch {
    return false
  }
}

function loadGA4(): void {
  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }
  // Expose the same gtag shim index.html used, so analytics.ts calls land in
  // dataLayer even before gtag.js finishes downloading.
  window.gtag = gtag as unknown as Window['gtag']
  gtag('js', new Date())
  gtag('config', GA4_ID)

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
  document.head.appendChild(script)
}

function loadMetaPixel(): void {
  /* eslint-disable */
  ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */
  window.fbq!('init', META_PIXEL_ID)
  window.fbq!('track', 'PageView')
}

/**
 * Inject GA4 + Meta Pixel after first paint, on the public web build only.
 * Safe to call unconditionally — it self-gates and never throws.
 */
export function initTrackers(): void {
  if (!shouldLoadTrackers()) return

  const load = () => {
    try {
      loadGA4()
      loadMetaPixel()
    } catch {
      // Analytics must never break the game.
    }
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(load)
  } else {
    setTimeout(load, 0)
  }
}
