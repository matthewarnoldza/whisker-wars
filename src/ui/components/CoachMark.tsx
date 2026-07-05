import { useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui'
import { CloseIcon } from '../icons'
import { useMotionSafe } from '../hooks/useMotionSafe'

// ===== First-run coach mark =====
// A small, anchored hint: a softly-pulsing gold ring around a target element plus
// a short caption card with a dismiss ✕ and a "Got it" button. Rendered into a
// portal on document.body (fixed positioning) so page scroll/transforms never
// drag it — coords come from the anchor's live getBoundingClientRect, exactly like
// DamageNumber. Only one is ever mounted at a time (the caller owns sequencing).
// Motion-safe: the ring glows statically when reduced motion is on.

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

interface CoachMarkProps {
  /** The element to highlight. Position is read live from its rect. */
  anchorRef: RefObject<HTMLElement | null>
  /** Short, playful caption. Keep it to a sentence. */
  caption: string
  /** Called when the player dismisses (✕ or "Got it"). */
  onDismiss: () => void
  /** Which side of the anchor the caption card sits. @default 'bottom' */
  placement?: 'top' | 'bottom'
}

/** Breathing room (px) the ring adds around the anchor. */
const RING_PAD = 8
/** Gap (px) between the ring and the caption card. */
const CARD_GAP = 14
const CARD_WIDTH = 260

export default function CoachMark({ anchorRef, caption, onDismiss, placement = 'bottom' }: CoachMarkProps) {
  const reduceMotion = useMotionSafe()
  const [rect, setRect] = useState<AnchorRect | null>(null)

  // Track the anchor's live viewport rect. Recompute on mount, resize and scroll
  // (capture phase catches nested scroll containers too).
  useLayoutEffect(() => {
    const el = anchorRef.current
    if (!el) return

    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // Track element size changes (fonts/images loading, layout shifts).
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      ro?.disconnect()
    }
  }, [anchorRef])

  if (!rect) return null

  const ringTop = rect.top - RING_PAD
  const ringLeft = rect.left - RING_PAD
  const ringW = rect.width + RING_PAD * 2
  const ringH = rect.height + RING_PAD * 2

  // Caption card sits below (or above) the anchor, horizontally centered on it and
  // clamped to stay on-screen.
  const rawCardLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2
  const cardLeft = Math.max(12, Math.min(rawCardLeft, window.innerWidth - CARD_WIDTH - 12))
  const cardTop =
    placement === 'top'
      ? ringTop - CARD_GAP // card's bottom edge; translated up via transform below
      : ringTop + ringH + CARD_GAP

  const node = (
    <div className="pointer-events-none fixed inset-0 z-[9998]" aria-live="polite">
      {/* Pulsing gold ring over the anchor */}
      <motion.div
        className="pointer-events-none absolute rounded-xl"
        style={{ top: ringTop, left: ringLeft, width: ringW, height: ringH }}
        initial={{ opacity: 0 }}
        animate={
          reduceMotion
            ? { opacity: 1, boxShadow: '0 0 0 2px rgba(245,183,10,0.9), 0 0 22px 4px rgba(245,183,10,0.45)' }
            : {
                opacity: 1,
                boxShadow: [
                  '0 0 0 2px rgba(245,183,10,0.9), 0 0 12px 2px rgba(245,183,10,0.35)',
                  '0 0 0 3px rgba(245,183,10,1), 0 0 28px 8px rgba(245,183,10,0.55)',
                  '0 0 0 2px rgba(245,183,10,0.9), 0 0 12px 2px rgba(245,183,10,0.35)',
                ],
              }
        }
        transition={reduceMotion ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Caption card */}
      <AnimatePresence>
        <motion.div
          key="coach-card"
          className="pointer-events-auto absolute rounded-card border border-accent-400/50 bg-surface-overlay/95 p-3 pr-8 shadow-glow-gold-sm backdrop-blur-sm"
          style={{
            top: cardTop,
            left: cardLeft,
            width: CARD_WIDTH,
            transform: placement === 'top' ? 'translateY(-100%)' : undefined,
          }}
          initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          role="dialog"
          aria-label={caption}
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss hint"
            className="absolute right-1.5 top-1.5 rounded-md p-1 text-ink-subtle transition-colors hover:bg-surface-raised hover:text-ink focus-visible:shadow-focus-gold focus-visible:outline-none"
          >
            <CloseIcon className="text-sm" />
          </button>
          <p className="mb-2.5 text-sm font-medium leading-snug text-ink">{caption}</p>
          <Button variant="primary" size="sm" onClick={onDismiss}>
            Got it
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  )

  return createPortal(node, document.body)
}
