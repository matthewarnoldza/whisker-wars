import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './ParticleSystem'
import { useState, useEffect } from 'react'
import type { Stone } from '../../game/items'

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
  const [particleActive, setParticleActive] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])

  useEffect(() => {
    if (isOpen && stone) {
      setParticleActive(true)
      setTimeout(() => setParticleActive(false), 500)
    }
  }, [isOpen, stone])

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

  if (!stone) return null

  const colors = ELEMENT_COLORS[stone.element] || ELEMENT_COLORS.FIRE

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
              className="text-center mb-6"
            >
              <div className="text-6xl mb-2 animate-bounce">💎</div>
              <h2 className="text-3xl font-black text-emerald-400 drop-shadow-lg font-heading tracking-wider">
                STONE DROP!
              </h2>
            </motion.div>

            {/* Stone Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`relative rounded-2xl overflow-hidden ${colors.glow} border-2 ${colors.border}`}
            >
              {/* Stone Image */}
              <div className="relative w-full aspect-square bg-slate-900 flex items-center justify-center p-8">
                {stone.iconUrl ? (
                  <img
                    src={stone.iconUrl}
                    alt={stone.name}
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                ) : (
                  <div className="text-8xl">💎</div>
                )}
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-10`} />
              </div>

              {/* Stone Info */}
              <div className={`p-4 bg-gradient-to-br ${colors.gradient} bg-opacity-20`}>
                <h3 className="text-2xl font-black text-white text-center tracking-wider uppercase mb-2">
                  {stone.name}
                </h3>
                <p className="text-sm text-slate-200 text-center leading-relaxed">
                  {stone.effect}
                </p>
              </div>
            </motion.div>

            {/* Hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-center"
            >
              <p className="text-slate-300 text-sm font-semibold mb-1">
                Added to your inventory!
              </p>
              <p className="text-slate-500 text-xs">
                Equip stones to cats in Collection before battle
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Click anywhere to continue
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
