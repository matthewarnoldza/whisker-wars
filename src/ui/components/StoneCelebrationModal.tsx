import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './ParticleSystem'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { useState, useEffect } from 'react'
import type { Stone } from '../../game/items'
import { cx } from './ui'
import { GemIcon, StoneIcon } from '../icons'

const ELEMENT_COLORS: Record<string, { gradient: string; border: string; glow: string; particles: string[] }> = {
  FIRE:      { gradient: 'from-red-500 to-orange-500',    border: 'border-red-400',    glow: 'shadow-[0_0_60px_rgba(239,68,68,0.6)]', particles: ['#FF4444', '#FF8844', '#FFAA22'] },
  ICE:       { gradient: 'from-blue-400 to-cyan-400',     border: 'border-cyan-400',   glow: 'shadow-[0_0_60px_rgba(34,211,238,0.6)]', particles: ['#44CCFF', '#88EEFF', '#AAFFFF'] },
  EARTH:     { gradient: 'from-amber-600 to-yellow-700',  border: 'border-amber-400',  glow: 'shadow-[0_0_60px_rgba(217,119,6,0.6)]', particles: ['#DD8822', '#BBAA44', '#CCCC66'] },
  LIGHTNING: { gradient: 'from-yellow-400 to-amber-300',  border: 'border-yellow-400', glow: 'shadow-[0_0_60px_rgba(250,204,21,0.6)]', particles: ['#FFEE44', '#FFDD00', '#FFCC22'] },
  SHADOW:    { gradient: 'from-purple-500 to-violet-600', border: 'border-purple-400', glow: 'shadow-[0_0_60px_rgba(168,85,247,0.6)]', particles: ['#AA44FF', '#8844DD', '#CC66FF'] },
}

interface StoneCelebrationModalProps {
  stone: Stone | null
  isOpen: boolean
  onClose: () => void
}

export default function StoneCelebrationModal({ stone, isOpen, onClose }: StoneCelebrationModalProps) {
  const reduce = useMotionSafe()
  const [particleActive, setParticleActive] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({
    isOpen,
    onClose,
    closeOnAnyKey: true,
    lockScroll: true,
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])

  useEffect(() => {
    if (isOpen && stone && !reduce) {
      setParticleActive(true)
      const t = setTimeout(() => setParticleActive(false), 500)
      return () => clearTimeout(t)
    }
  }, [isOpen, stone, reduce])

  if (!stone) return null

  const colors = ELEMENT_COLORS[stone.element] || ELEMENT_COLORS.FIRE

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-celebration flex items-center justify-center bg-surface-deep/85 backdrop-blur-md overflow-hidden touch-none p-4"
        >
          {/* Celebration Particles */}
          {windowSize.width > 0 && !reduce && (
            <ParticleSystem
              x={windowSize.width / 2}
              y={windowSize.height / 2}
              active={particleActive}
              count={30}
              colors={colors.particles}
            />
          )}

          <motion.div
            ref={dialogRef}
            {...dialogProps}
            aria-labelledby="stone-celebration-title"
            initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, rotateY: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 20, stiffness: 200 }}
            className="relative w-full max-w-[320px] focus:outline-none"
          >
            {/* Header */}
            <motion.div
              initial={reduce ? false : { y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.2 }}
              className="text-center mb-6"
            >
              <GemIcon className={cx('mx-auto mb-2 text-accent-300', !reduce && 'animate-bounce')} size={56} />
              <h2
                id="stone-celebration-title"
                className="font-heading text-3xl font-black uppercase tracking-wider text-accent-300 [text-shadow:0_0_24px_rgba(245,183,10,0.5)]"
              >
                Stone Drop!
              </h2>
            </motion.div>

            {/* Stone Card */}
            <motion.div
              initial={reduce ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.3 }}
              className={cx('relative rounded-card overflow-hidden border-2', colors.glow, colors.border)}
            >
              {/* Stone Image */}
              <div className="relative w-full aspect-square bg-surface flex items-center justify-center p-8">
                {stone.iconUrl ? (
                  <img src={stone.iconUrl} alt={stone.name} className="w-full h-full object-contain drop-shadow-2xl" />
                ) : (
                  <StoneIcon className="text-ink-muted" size={96} />
                )}
                <div className={cx('absolute inset-0 bg-gradient-to-br opacity-10', colors.gradient)} />
              </div>

              {/* Stone Info */}
              <div className={cx('p-4 bg-gradient-to-br bg-opacity-20', colors.gradient)}>
                <h3 className="font-heading text-2xl font-black text-white text-center tracking-wider uppercase mb-2">
                  {stone.name}
                </h3>
                <p className="text-sm text-ink-muted text-center leading-relaxed">
                  {stone.effect}
                </p>
              </div>
            </motion.div>

            {/* Hint */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.6 }}
              className="mt-4 text-center"
            >
              <p className="text-ink-muted text-sm font-semibold mb-1">
                Added to your inventory!
              </p>
              <p className="text-ink-subtle text-xs">
                Equip stones to cats in Collection before battle
              </p>
              <p className="text-ink-faint text-xs mt-2">
                Press any key or tap to continue
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
