import { useState, useEffect, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './ParticleSystem'
import { useGame } from '../../game/store'
import {
  getActiveElement, getFrenzyDetails, ELEMENT_ROTATION, ELEMENT_THEMES,
} from '../../game/events'
import { FRENZY_BASE_COINS, FRENZY_BASE_MULTIPLIER, FRENZY_STREAK_REWARDS, FRENZY_STREAK_LENGTH } from '../../game/constants'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { Button, cx } from './ui'
import type { IconProps } from '../icons'
import {
  FlameIcon, FrostIcon, StoneIcon, BoltIcon, PoisonIcon,
  CoinIcon, GemIcon, SparkleIcon, ShieldIcon,
} from '../icons'

// Element identity → icon (keyed by FrenzyElement so it never depends on emoji).
const ELEMENT_ICON: Record<string, ComponentType<IconProps>> = {
  FIRE: FlameIcon,
  ICE: FrostIcon,
  EARTH: StoneIcon,
  LIGHTNING: BoltIcon,
  SHADOW: PoisonIcon,
}

const ELEMENT_COLORS: Record<string, { gradient: string; border: string; glow: string; particles: string[] }> = {
  FIRE:      { gradient: 'from-red-500 to-orange-500',    border: 'border-red-400',    glow: 'shadow-[0_0_60px_rgba(239,68,68,0.6)]', particles: ['#FF4444', '#FF8844', '#FFAA22'] },
  ICE:       { gradient: 'from-blue-400 to-cyan-400',     border: 'border-cyan-400',   glow: 'shadow-[0_0_60px_rgba(34,211,238,0.6)]', particles: ['#44CCFF', '#88EEFF', '#AAFFFF'] },
  EARTH:     { gradient: 'from-amber-600 to-yellow-700',  border: 'border-amber-400',  glow: 'shadow-[0_0_60px_rgba(217,119,6,0.6)]', particles: ['#DD8822', '#BBAA44', '#CCCC66'] },
  LIGHTNING: { gradient: 'from-yellow-400 to-amber-300',  border: 'border-yellow-400', glow: 'shadow-[0_0_60px_rgba(250,204,21,0.6)]', particles: ['#FFEE44', '#FFDD00', '#FFCC22'] },
  SHADOW:    { gradient: 'from-purple-500 to-violet-600', border: 'border-purple-400', glow: 'shadow-[0_0_60px_rgba(168,85,247,0.6)]', particles: ['#AA44FF', '#8844DD', '#CC66FF'] },
}

interface FrenzyFridayModalProps {
  isOpen: boolean
  onClose: () => void
  onFightNow: () => void
}

export default function FrenzyFridayModal({ isOpen, onClose, onFightNow }: FrenzyFridayModalProps) {
  const reduce = useMotionSafe()
  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({ isOpen, onClose, lockScroll: true })
  const frenzyStreak = useGame(s => s.frenzyStreak)
  const inventory = useGame(s => s.inventory)
  const [particleActive, setParticleActive] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  const element = getActiveElement()
  const { dog, stone } = getFrenzyDetails(element)
  const colors = ELEMENT_COLORS[element] || ELEMENT_COLORS.FIRE
  const ElementIcon = ELEMENT_ICON[element] ?? FlameIcon

  const streakIdx = Math.min(Math.max(frenzyStreak, 0), FRENZY_STREAK_LENGTH - 1)
  const streakReward = FRENZY_STREAK_REWARDS[streakIdx]
  const totalCoins = Math.floor(FRENZY_BASE_COINS * streakReward.coinMultiplier)
  const shieldCount = inventory['streak-shield'] || 0

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])

  useEffect(() => {
    if (isOpen && !reduce) {
      setParticleActive(true)
      const t = setTimeout(() => setParticleActive(false), 500)
      return () => clearTimeout(t)
    }
  }, [isOpen, reduce])

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
            aria-labelledby="frenzy-title"
            initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, rotateY: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 20, stiffness: 200 }}
            className="relative w-full max-w-[320px] focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <motion.div
              initial={reduce ? false : { y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.2 }}
              className="text-center mb-4"
            >
              <ElementIcon className={cx('mx-auto mb-2 text-accent-300', !reduce && 'animate-bounce')} size={56} />
              <h2 id="frenzy-title" className="font-heading text-3xl font-black uppercase text-accent-300 drop-shadow-lg tracking-wider">
                Feline Frenzy Friday
              </h2>
              <p className="text-ink font-bold mt-1">{element} Week</p>
            </motion.div>

            {/* Boss Card */}
            <motion.div
              initial={reduce ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.3 }}
              className={`relative rounded-card overflow-hidden ${colors.glow} border-2 ${colors.border} mb-4`}
            >
              <div className="relative w-full aspect-square bg-surface flex items-center justify-center">
                <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-10`} />
              </div>
              <div className={`p-4 bg-gradient-to-br ${colors.gradient} bg-opacity-20`}>
                <h3 className="font-heading text-2xl font-black text-white text-center tracking-wider uppercase mb-1">
                  {dog.name}
                </h3>
                {dog.ability && (
                  <p className="text-sm text-ink-muted text-center leading-relaxed">
                    {dog.ability.name}: {dog.ability.description}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Rewards Grid */}
            <motion.div
              initial={reduce ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.35 }}
              className="grid grid-cols-3 gap-2 mb-4"
            >
              <div className="text-center p-3 bg-surface-raised/70 rounded-card border border-surface-border">
                <CoinIcon className="mx-auto mb-1 text-accent-300" size={20} />
                <div className="text-accent-300 font-black text-sm tabular-nums">{totalCoins}</div>
                <div className="text-[10px] text-ink-faint uppercase tracking-wider">Coins</div>
              </div>
              <div className="text-center p-3 bg-surface-raised/70 rounded-card border border-surface-border">
                <GemIcon className="mx-auto mb-1 text-success-400" size={20} />
                <div className="text-success-400 font-black text-sm">{stone.name}</div>
                <div className="text-[10px] text-ink-faint uppercase tracking-wider">Stone Drop</div>
              </div>
              <div className="text-center p-3 bg-surface-raised/70 rounded-card border border-surface-border">
                <SparkleIcon className="mx-auto mb-1 text-arcane-300" size={20} />
                <div className="text-arcane-300 font-black text-sm tabular-nums">x{FRENZY_BASE_MULTIPLIER}</div>
                <div className="text-[10px] text-ink-faint uppercase tracking-wider">Multiplier</div>
              </div>
            </motion.div>

            {/* Streak Counter */}
            {frenzyStreak > 0 && (
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.4 }}
                className="mb-4"
              >
                <p className="text-sm text-ink-subtle text-center mb-2 font-bold inline-flex items-center justify-center gap-1 w-full">
                  Frenzy Streak: {frenzyStreak} week{frenzyStreak !== 1 ? 's' : ''}
                  {shieldCount > 0 && (
                    <span className="text-accent-300 ml-2 inline-flex items-center gap-1">
                      <ShieldIcon size={14} /> x{shieldCount}
                    </span>
                  )}
                </p>
                <div className="flex justify-center gap-1.5">
                  {ELEMENT_ROTATION.map((el, i) => {
                    const elTheme = ELEMENT_THEMES[el]
                    const ElIcon = ELEMENT_ICON[el] ?? FlameIcon
                    const filled = i < (frenzyStreak % 5) || frenzyStreak >= 5
                    return (
                      <div
                        key={el}
                        className={cx(
                          'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                          filled
                            ? `bg-gradient-to-br ${elTheme.gradient} ${elTheme.border} text-white`
                            : 'bg-surface-raised border-surface-border text-ink-subtle',
                        )}
                      >
                        <ElIcon size={16} />
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* CTA Buttons */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.5 }}
            >
              <Button variant="primary" size="lg" fullWidth onClick={onFightNow} className="mb-3">
                Fight Now!
              </Button>
              <Button variant="ghost" fullWidth onClick={onClose}>
                Maybe Later
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
