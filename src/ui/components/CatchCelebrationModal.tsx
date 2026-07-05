import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Cat } from '../../game/data'
import { useHolographicCard } from '../hooks/useHolographicCard'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { isWeb } from '../../utils/platform'
import ParticleSystem from './ParticleSystem'
import { useState, useEffect } from 'react'
import { useGame } from '../../game/store'
import { rarityStyle } from '../constants/rarity'
import { RarityBadge, StatPill, cx } from './ui'
import { SparkleIcon, SwordIcon, HeartIcon, StarIcon } from '../icons'

interface CatchCelebrationModalProps {
  cat: Cat | null
  isOpen: boolean
  onClose: () => void
}

export default function CatchCelebrationModal({ cat, isOpen, onClose }: CatchCelebrationModalProps) {
  const reduce = useMotionSafe()
  const colorblindMode = useGame(s => s.colorblindMode)
  const [particleActive, setParticleActive] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  // role=dialog + focus trap + Escape + "press any key or tap" + focus restore.
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
    if (isOpen && cat && !reduce) {
      setParticleActive(true)
      const t = setTimeout(() => setParticleActive(false), 500)
      return () => clearTimeout(t)
    }
  }, [isOpen, cat, reduce])

  // Enhanced holographic effect — MUST be called before any conditional returns.
  const holographic = useHolographicCard({
    mode: 'full',
    maxRotation: 25,
    shineIntensity: 0.9,
  })

  if (!cat) return null

  const rs = rarityStyle(cat.rarity)
  const holoOn = holographic.isSupported && !reduce

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
          {/* Celebration burst */}
          {windowSize.width > 0 && !reduce && (
            <ParticleSystem
              x={windowSize.width / 2}
              y={windowSize.height / 2}
              active={particleActive}
              count={30}
              colors={[rs.hex, '#fcd34d', '#f5b70a']}
            />
          )}

          <motion.div
            ref={dialogRef}
            {...dialogProps}
            aria-labelledby="catch-celebration-title"
            initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, rotateY: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 20, stiffness: 200 }}
            className="relative w-full max-w-[100vw] sm:max-w-[320px] lg:max-w-[360px] holographic-card touch-auto focus:outline-none"
            style={holographic.style}
            {...(holoOn ? (isWeb() ? {
              onMouseMove: holographic.handlers.onMouseMove,
              onMouseLeave: holographic.handlers.onMouseLeave,
            } : {
              onTouchMove: holographic.handlers.onTouchMove,
              onTouchEnd: holographic.handlers.onTouchEnd,
            }) : {})}
          >
            {/* Celebration Header */}
            <motion.div
              initial={reduce ? false : { y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.2 }}
              className="text-center mb-4"
            >
              <SparkleIcon
                className={cx('mx-auto mb-2 text-accent-300', !reduce && 'animate-bounce')}
                size={56}
              />
              <h2
                id="catch-celebration-title"
                className="font-heading text-4xl font-black uppercase tracking-[0.12em] text-accent-300 [text-shadow:0_0_28px_rgba(245,183,10,0.55)]"
              >
                Cat Caught!
              </h2>
            </motion.div>

            {/* Card Container */}
            <div className={cx('relative w-full rounded-card overflow-hidden shadow-2xl', rs.glow)}>
              {/* Holographic Overlay */}
              {holoOn && (
                <div
                  className={cx('holographic-overlay full', holographic.isActive && 'active', `rarity-${cat.rarity.toLowerCase()}`)}
                />
              )}

              {/* Mythical Particles */}
              {cat.rarity === 'Mythical' && !reduce && (
                <>
                  <div className="absolute top-4 left-4 w-2 h-2 bg-danger-500 rounded-full mythical-particle" style={{ animationDelay: '0s', zIndex: 30 }} />
                  <div className="absolute top-8 right-6 w-2 h-2 bg-danger-400 rounded-full mythical-particle" style={{ animationDelay: '0.5s', zIndex: 30 }} />
                  <div className="absolute bottom-12 left-8 w-2 h-2 bg-danger-500 rounded-full mythical-particle" style={{ animationDelay: '1s', zIndex: 30 }} />
                  <div className="absolute bottom-6 right-4 w-2 h-2 bg-danger-600 rounded-full mythical-particle" style={{ animationDelay: '1.5s', zIndex: 30 }} />
                </>
              )}

              {/* Full-Screen Character Art */}
              <div className="relative w-full aspect-[3/4] rounded-card overflow-hidden">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-surface-raised via-surface to-surface-deep" />
                )}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              </div>

              {/* Card Content Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
                <div className="flex flex-col items-center gap-2">
                  <div className={cx('px-6 py-3 rounded-card bg-gradient-to-br shadow-2xl border-[3px] border-white/40 backdrop-blur-sm', rs.gradient)}>
                    <h3 className="font-heading font-black text-2xl sm:text-3xl tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="px-4 py-2 rounded-btn bg-black/80 backdrop-blur-md border-2 border-white/30 shadow-xl">
                    <span className="text-sm text-ink-muted uppercase tracking-widest font-bold">
                      {cat.breed}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {cat.ability && (
                    <div className="px-4 py-3 bg-black/85 backdrop-blur-md rounded-card border-[3px] border-white/30 shadow-2xl">
                      <div className="font-heading text-base font-black text-accent-300 tracking-wider uppercase text-center leading-tight drop-shadow-lg mb-1">
                        {cat.ability.name}
                      </div>
                      <p className="text-xs sm:text-sm text-ink-muted leading-snug text-center">
                        {cat.ability.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rarity & Stats */}
            <motion.div
              initial={reduce ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.3 }}
              className="mt-4"
            >
              {/* Rarity — the colorblind-critical study moment: shape + label + tier color. */}
              <div className="flex items-center justify-center mb-3">
                <span className={cx('inline-flex items-center rounded-pill border bg-surface-raised/90 px-5 py-2', rs.border, rs.boxShadow)}>
                  <RarityBadge rarity={cat.rarity} size={22} colorblindMode={colorblindMode} />
                </span>
              </div>

              <div className="flex items-center justify-center gap-2.5">
                <StatPill tone="attack" icon={<SwordIcon />} label="ATK" value={cat.attack} />
                <StatPill tone="health" icon={<HeartIcon />} label="HP" value={cat.health} />
                <StatPill tone="arcane" icon={<StarIcon />} label="LVL" value={1} />
              </div>
            </motion.div>

            {/* Hint Text */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.5 }}
              className="mt-4 text-center"
            >
              <p className="text-ink-muted text-sm sm:text-base font-semibold mb-1">
                Added to your collection!
              </p>
              <p className="text-ink-faint text-xs">
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
