// Canonical motion gate. Returns true when animations should be suppressed —
// either because the OS "prefers reduced motion" media query is set, OR because
// the player enabled the in-app Reduced Motion setting. Other code should migrate
// to this hook rather than reading either source directly.

import { useReducedMotion } from 'framer-motion'
import { useGame } from '../../game/store'

/** True when motion should be reduced (OS preference OR the user's in-app override). */
export function useMotionSafe(): boolean {
  const osReduced = useReducedMotion()
  const userReduced = useGame(s => s.reducedMotion)
  return Boolean(osReduced) || userReduced
}
