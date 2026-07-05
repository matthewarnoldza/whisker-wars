import { useAnimationControls } from 'framer-motion'
import { useCallback } from 'react'

// ===== Stage-level screen shake =====
// Drives a transform-only (GPU) shake on the battle stage container. Replaces
// the old per-card x-jitter (shakeVariants). Two intensities:
//   - 'light' : heavy hits            → 4-6px translate, ~200ms, decaying
//   - 'heavy' : crits / boss abilities → 10-14px translate + tiny rotate, ~320ms
// Both decay to a resting transform so no layout is ever touched.
//
// Usage: spread `controls` onto a <motion.div animate={controls}> that wraps the
// arena layout (NOT the modals / damage-number portal — those live outside so
// they aren't dragged by the transform).

export type ShakeIntensity = 'light' | 'heavy'

export function useScreenShake() {
  const controls = useAnimationControls()

  const shake = useCallback(
    (intensity: ShakeIntensity = 'light', enabled = true) => {
      if (!enabled) return
      if (intensity === 'heavy') {
        void controls.start({
          x: [0, -12, 10, -8, 6, -3, 0],
          y: [0, 8, -6, 5, -3, 2, 0],
          rotate: [0, -0.4, 0.35, -0.25, 0.15, 0],
          transition: { duration: 0.32, ease: 'easeOut' },
        })
      } else {
        void controls.start({
          x: [0, -5, 5, -4, 3, 0],
          y: [0, 4, -3, 2, -1, 0],
          rotate: 0,
          transition: { duration: 0.2, ease: 'easeOut' },
        })
      }
    },
    [controls],
  )

  return { controls, shake }
}
