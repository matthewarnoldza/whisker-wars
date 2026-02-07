import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './ParticleSystem'
import { useGame } from '../../game/store'
import {
  getActiveElement, getFrenzyDetails, ELEMENT_ROTATION, ELEMENT_THEMES,
} from '../../game/events'
import { FRENZY_BASE_COINS, FRENZY_BASE_MULTIPLIER, FRENZY_STREAK_REWARDS, FRENZY_STREAK_LENGTH } from '../../game/constants'

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
  const frenzyStreak = useGame(s => s.frenzyStreak)
  const inventory = useGame(s => s.inventory)
  const [particleActive, setParticleActive] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  const element = getActiveElement()
  const { dog, stone, theme } = getFrenzyDetails(element)
  const colors = ELEMENT_COLORS[element] || ELEMENT_COLORS.FIRE

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
    if (isOpen) {
      setParticleActive(true)
      setTimeout(() => setParticleActive(false), 500)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-celebration flex items-center justify-center bg-slate-950/85 backdrop-blur-md overflow-hidden touch-none p-4"
        >
          {/* Celebration Particles */}
          {windowSize.width > 0 && (
            <ParticleSystem
              x={windowSize.width / 2}
              y={windowSize.height / 2}
              active={particleActive}
              count={30}
              colors={colors.particles}
            />
          )}

          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative w-full max-w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-4"
            >
              <div className="text-6xl mb-2 animate-bounce">{theme.icon}</div>
              <h2 className="text-3xl font-black text-gold-400 drop-shadow-lg font-heading tracking-wider">
                FELINE FRENZY FRIDAY
              </h2>
              <p className="text-white/80 font-bold mt-1">{element} Week</p>
            </motion.div>

            {/* Boss Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`relative rounded-2xl overflow-hidden ${colors.glow} border-2 ${colors.border} mb-4`}
            >
              <div className="relative w-full aspect-square bg-slate-900 flex items-center justify-center">
                <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-10`} />
              </div>
              <div className={`p-4 bg-gradient-to-br ${colors.gradient} bg-opacity-20`}>
                <h3 className="text-2xl font-black text-white text-center tracking-wider uppercase mb-1">
                  {dog.name}
                </h3>
                {dog.ability && (
                  <p className="text-sm text-slate-200 text-center leading-relaxed">
                    {dog.ability.name}: {dog.ability.description}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Rewards Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="grid grid-cols-3 gap-2 mb-4"
            >
              <div className="text-center p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-xl mb-1">🪙</div>
                <div className="text-gold-400 font-black text-sm">{totalCoins}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Coins</div>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-xl mb-1">💎</div>
                <div className="text-emerald-400 font-black text-sm">{stone.name}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stone Drop</div>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-xl mb-1">✨</div>
                <div className="text-cyan-400 font-black text-sm">x{FRENZY_BASE_MULTIPLIER}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Multiplier</div>
              </div>
            </motion.div>

            {/* Streak Counter */}
            {frenzyStreak > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <p className="text-sm text-slate-400 text-center mb-2 font-bold">
                  Frenzy Streak: {frenzyStreak} week{frenzyStreak !== 1 ? 's' : ''}
                  {shieldCount > 0 && <span className="text-amber-400 ml-2">🛡️ x{shieldCount}</span>}
                </p>
                <div className="flex justify-center gap-1.5">
                  {ELEMENT_ROTATION.map((el, i) => {
                    const elTheme = ELEMENT_THEMES[el]
                    const filled = i < (frenzyStreak % 5) || frenzyStreak >= 5
                    return (
                      <div
                        key={el}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          filled
                            ? `bg-gradient-to-br ${elTheme.gradient} ${elTheme.border} text-white`
                            : 'bg-slate-700 border-slate-600 text-slate-400'
                        }`}
                      >
                        {elTheme.icon}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={onFightNow}
                className="w-full px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black text-lg rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all mb-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Fight Now!
              </motion.button>
              <button
                onClick={onClose}
                className="w-full text-center text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
              >
                Maybe Later
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
