import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { OwnedCat } from '../../game/store'
import GameCard from './GameCard'
import ParticleSystem from './ParticleSystem'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { useState, useEffect } from 'react'
import { StatPill, cx } from './ui'
import { GemIcon, BoltIcon, SwordIcon, HeartIcon, StarIcon } from '../icons'

interface MergeCelebrationModalProps {
  eliteCat: OwnedCat | null
  isOpen: boolean
  onClose: () => void
}

export default function MergeCelebrationModal({ eliteCat, isOpen, onClose }: MergeCelebrationModalProps) {
  const reduce = useMotionSafe()
  const [particleActive, setParticleActive] = useState(false)
  const [showCard, setShowCard] = useState(false)
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
    if (isOpen && eliteCat) {
      if (reduce) {
        // No white-flash build-up under reduced motion — reveal immediately.
        setShowCard(true)
        return
      }
      setShowCard(false)
      const timer = setTimeout(() => {
        setShowCard(true)
        setParticleActive(true)
        setTimeout(() => setParticleActive(false), 500)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isOpen, eliteCat, reduce])

  if (!eliteCat) return null

  const isPrismatic = (eliteCat.eliteTier || 0) >= 2
  const title = isPrismatic ? 'Prismatic Forged!' : 'Elite Forged!'

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
          {/* White Flash Effect — the forge spark (skipped when motion reduced) */}
          {!reduce && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, times: [0, 0.3, 1] }}
              className="absolute inset-0 bg-white/80 pointer-events-none"
            />
          )}

          {/* Celebration Particles */}
          {windowSize.width > 0 && !reduce && (
            <ParticleSystem
              x={windowSize.width / 2}
              y={windowSize.height / 2}
              active={particleActive}
              count={40}
              colors={isPrismatic
                ? ['#FFD700', '#00FFFF', '#FF69B4', '#8B5CF6']
                : ['#FFD700', '#FFA500', '#00FFFF']}
            />
          )}

          <motion.div
            ref={dialogRef}
            {...dialogProps}
            aria-labelledby="merge-celebration-title"
            initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            animate={showCard ? { scale: 1, opacity: 1 } : (reduce ? { opacity: 0 } : { scale: 0, opacity: 0 })}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 15, stiffness: 200 }}
            className="relative flex flex-col items-center touch-auto focus:outline-none"
          >
            {/* Title */}
            <motion.div
              initial={reduce ? false : { y: -30, opacity: 0 }}
              animate={showCard ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: reduce ? 0 : 0.2 }}
              className="text-center mb-4"
            >
              {isPrismatic
                ? <GemIcon className={cx('mx-auto mb-2 text-accent-300', !reduce && 'animate-bounce')} size={56} />
                : <BoltIcon className={cx('mx-auto mb-2 text-accent-300', !reduce && 'animate-bounce')} size={56} />}
              <h2
                id="merge-celebration-title"
                className={cx(
                  'font-heading text-4xl font-black uppercase tracking-[0.1em]',
                  isPrismatic
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-cyan-400 to-arcane-400'
                    : 'text-accent-300 [text-shadow:0_0_28px_rgba(245,183,10,0.55)]',
                )}
              >
                {title}
              </h2>
            </motion.div>

            {/* The Elite Card */}
            <GameCard character={eliteCat} holographicMode="full" animate={!reduce} />

            {/* Stats Summary */}
            <motion.div
              initial={reduce ? false : { y: 20, opacity: 0 }}
              animate={showCard ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: reduce ? 0 : 0.4 }}
              className="mt-4 flex items-center gap-2.5"
            >
              <StatPill tone="attack" icon={<SwordIcon />} label="ATK" value={eliteCat.currentAttack} />
              <StatPill tone="health" icon={<HeartIcon />} label="HP" value={eliteCat.maxHp} />
              <StatPill tone="arcane" icon={<StarIcon />} label="LVL" value={eliteCat.level} />
            </motion.div>

            {/* Bonus Info */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={showCard ? { opacity: 1 } : {}}
              transition={{ delay: reduce ? 0 : 0.5 }}
              className="mt-3 text-center"
            >
              <p className="text-arcane-300 text-sm font-bold">
                +{isPrismatic ? '35' : '20'}% Stats &bull; Enhanced Abilities &bull; Stellar Resilience
              </p>
            </motion.div>

            {/* Hint */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={showCard ? { opacity: 1 } : {}}
              transition={{ delay: reduce ? 0 : 0.7 }}
              className="mt-4 text-center"
            >
              <p className="text-ink-faint text-xs">Press any key or tap to continue</p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
