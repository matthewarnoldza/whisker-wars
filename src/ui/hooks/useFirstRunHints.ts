// ===== First-run hint sequence =====
// Contextual coach-marks shown at the moment of relevance — NOT an up-front tour.
// The hook owns the *sequencing* (one hint at a time, in order) and persistence
// (a dismissed hint never returns, via the store's `hintsSeen` list). The view
// supplies the anchor refs and renders whatever `activeHint` points at.
//
// Only the two baiting hints are wired now. Deeper-system hints (first merge,
// first equipment, jungle unlock) are intended to be added as new entries to the
// HINTS table + a matching anchor ref — the shape below is built to grow.

import { useEffect, useRef, type RefObject } from 'react'
import { useGame } from '../../game/store'

/** Anchor refs the hook can point a hint at. Extend as hints are added. */
export interface FirstRunHintAnchors {
  /** The "Buy Bait" panel — where you pick a tier. */
  buyBait: RefObject<HTMLElement | null>
  /** The "Use Bait" panel — where clicking a bait casts it. */
  useBait: RefObject<HTMLElement | null>
}

export interface ActiveHint {
  id: string
  caption: string
  anchorRef: RefObject<HTMLElement | null>
  placement: 'top' | 'bottom'
}

interface HintDef {
  id: string
  caption: string
  anchor: keyof FirstRunHintAnchors
  placement: 'top' | 'bottom'
}

// Ordered. A hint only shows once every hint before it has been seen.
const HINTS: HintDef[] = [
  {
    id: 'bait-select',
    caption: 'Pick a bait — better bait lures rarer cats.',
    anchor: 'buyBait',
    placement: 'top',
  },
  {
    id: 'bait-cast',
    caption: 'Cast! Every cat you catch joins your collection.',
    anchor: 'useBait',
    placement: 'top',
  },
]

const BAITING_HINT_IDS = HINTS.map(h => h.id)

/** Total bait quantity across the inventory record. */
const baitTotal = (baits: Record<string, number>) =>
  Object.values(baits).reduce((sum, n) => sum + n, 0)

export function useFirstRunHints(anchors: FirstRunHintAnchors): {
  activeHint: ActiveHint | null
  dismissActive: () => void
} {
  const ownedCount = useGame(s => s.owned.length)
  const baits = useGame(s => s.baits)
  const hintsSeen = useGame(s => s.hintsSeen)
  const markHintSeen = useGame(s => s.markHintSeen)

  // Auto-dismiss when the hinted action is actually performed — the hint is a
  // nudge, and doing the thing IS the acknowledgement. We compare against the
  // previous values to detect the transition.
  const prevOwned = useRef(ownedCount)
  const prevBaitTotal = useRef(baitTotal(baits))

  useEffect(() => {
    const owned = ownedCount
    const total = baitTotal(baits)
    const wasOwned = prevOwned.current
    const wasTotal = prevBaitTotal.current
    prevOwned.current = owned
    prevBaitTotal.current = total

    // First catch (0 -> 1): the celebration is the payoff. Retire ALL baiting
    // hints so nothing lingers, even if the player later releases every cat.
    if (wasOwned === 0 && owned > 0) {
      BAITING_HINT_IDS.forEach(markHintSeen)
      return
    }

    // Bought a bait: they've engaged with picking one → clear the "pick" hint.
    if (total > wasTotal) {
      markHintSeen('bait-select')
      return
    }

    // Used a bait (a cast): both concepts are now demonstrated → clear both.
    if (total < wasTotal) {
      markHintSeen('bait-select')
      markHintSeen('bait-cast')
    }
  }, [ownedCount, baits, markHintSeen])

  // Hints are a brand-new-player affordance: only while the collection is empty.
  const seen = new Set(hintsSeen)
  const def = ownedCount === 0 ? HINTS.find(h => !seen.has(h.id)) : undefined

  const activeHint: ActiveHint | null = def
    ? { id: def.id, caption: def.caption, anchorRef: anchors[def.anchor], placement: def.placement }
    : null

  const dismissActive = () => {
    if (activeHint) markHintSeen(activeHint.id)
  }

  return { activeHint, dismissActive }
}
