import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'

// ===== Anchored floating combat numbers =====
// Rendered into a portal on document.body (fixed positioning), so the shaking
// stage transform never drags them. Coords come from the struck card's live
// getBoundingClientRect (viewport space === fixed space). Styled by `kind`;
// size scales with magnitude. Springs + arc when juice is enabled, simple fade
// when reduced (the number is information, so it always shows).

export type DamageKind = 'normal' | 'crit' | 'heal' | 'poison' | 'burn' | 'miss'

export interface DamageNumberData {
  id: number
  /** Display text already composed (e.g. "-12", "+8", "MISS"). */
  text: string
  kind: DamageKind
  x: number
  y: number
  /** Font size in rem, pre-scaled by magnitude. */
  fontRem: number
}

// TODO(design-tokens): promote these to the shared palette when it lands.
const KIND_STYLE: Record<
  DamageKind,
  { color: string; shadow: string; weight: number }
> = {
  normal: { color: '#FF6B3C', shadow: '0 2px 6px rgba(0,0,0,0.85)', weight: 900 },
  crit: { color: '#FFC53D', shadow: '0 0 14px rgba(255,197,61,0.9), 0 2px 6px #000', weight: 900 },
  heal: { color: '#3DDC84', shadow: '0 0 12px rgba(61,220,132,0.7), 0 2px 5px #000', weight: 900 },
  poison: { color: '#9FB88F', shadow: '0 2px 5px rgba(0,0,0,0.8)', weight: 800 },
  burn: { color: '#E8975A', shadow: '0 0 8px rgba(232,151,90,0.6), 0 2px 5px #000', weight: 800 },
  miss: { color: '#CBD5E1', shadow: '0 2px 5px rgba(0,0,0,0.8)', weight: 800 },
}

interface DamageNumberProps {
  data: DamageNumberData
  juiceEnabled: boolean
}

export default function DamageNumber({ data, juiceEnabled }: DamageNumberProps) {
  const { text, kind, x, y, fontRem } = data
  const style = KIND_STYLE[kind]
  const isCrit = kind === 'crit'
  const isHeal = kind === 'heal'

  // Reduced motion: appear in place, fade out, no arc / spring / rotation.
  const reducedAnim = {
    initial: { opacity: 0, scale: 1 },
    animate: { opacity: [0, 1, 1, 0], y: -18 },
    transition: { duration: 0.9, times: [0, 0.15, 0.7, 1] },
  }

  // Full juice: pop in with overshoot, arc upward, drift + fade. Crits get a
  // bigger starburst pop and a slight rotation; heals rise gently.
  const rise = isHeal ? -70 : isCrit ? -64 : -52
  const juiceAnim = {
    initial: { opacity: 0, scale: 0.4, rotate: isCrit ? -8 : 0 },
    animate: {
      opacity: [0, 1, 1, 0],
      y: [0, rise * 0.55, rise],
      scale: isCrit ? [0.4, 1.5, 1.15, 1.05] : [0.4, 1.25, 1, 1],
      rotate: isCrit ? [-8, 4, -2, 0] : 0,
      transition: {
        duration: isHeal ? 1.15 : 1,
        times: [0, 0.2, 0.75, 1],
        ease: 'easeOut',
      },
    },
  }

  const anim = juiceEnabled ? juiceAnim : reducedAnim

  const node = (
    <motion.div
      initial={anim.initial}
      animate={anim.animate}
      transition={'transition' in anim ? anim.transition : undefined}
      className="pointer-events-none fixed z-[9999] font-heading select-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        color: style.color,
        textShadow: style.shadow,
        fontWeight: style.weight,
        fontSize: `${fontRem}rem`,
        lineHeight: 1,
        letterSpacing: kind === 'miss' ? '0.08em' : undefined,
        fontStyle: kind === 'miss' ? 'italic' : undefined,
        willChange: 'transform, opacity',
      }}
    >
      {/* Crit starburst backing */}
      {isCrit && juiceEnabled && (
        <motion.span
          className="absolute inset-0 -z-10 blur-md"
          style={{ color: '#FFE08A' }}
          initial={{ opacity: 0.9, scale: 0.6 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          aria-hidden
        >
          {text}
        </motion.span>
      )}
      {text}
    </motion.div>
  )

  return createPortal(node, document.body)
}
