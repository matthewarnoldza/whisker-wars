import { motion, AnimatePresence } from 'framer-motion'
import type { Cat } from '../../game/data'
import { useHolographicCard } from '../hooks/useHolographicCard'
import { isWeb } from '../../utils/platform'
import ParticleSystem from './ParticleSystem'
import { useState, useEffect } from 'react'

interface CatchCelebrationModalProps {
  cat: Cat | null
  isOpen: boolean
  onClose: () => void
}

export default function CatchCelebrationModal({ cat, isOpen, onClose }: CatchCelebrationModalProps) {
  const [particleActive, setParticleActive] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // Initialize window size
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])

  useEffect(() => {
    if (isOpen && cat) {
      // Trigger particle explosion when modal opens
      setParticleActive(true)
      setTimeout(() => setParticleActive(false), 500)
    }
  }, [isOpen, cat])

  // Enhanced holographic effect for celebration - MUST be called before any conditional returns
  const holographic = useHolographicCard({
    mode: 'full',
    maxRotation: 25, // Extra dramatic for celebration!
    shineIntensity: 0.9
  })

  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'from-slate-500 to-slate-600'
      case 'Uncommon': return 'from-green-500 to-emerald-600'
      case 'Rare': return 'from-blue-500 to-cyan-600'
      case 'Epic': return 'from-purple-500 to-fuchsia-600'
      case 'Legendary': return 'from-orange-500 to-amber-600'
      case 'Mythical': return 'from-red-600 to-rose-700'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'drop-shadow-[0_0_15px_rgba(148,163,184,0.6)]'
      case 'Uncommon': return 'drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]'
      case 'Rare': return 'drop-shadow-[0_0_25px_rgba(59,130,246,0.9)]'
      case 'Epic': return 'drop-shadow-[0_0_30px_rgba(168,85,247,1)]'
      case 'Legendary': return 'drop-shadow-[0_0_35px_rgba(251,146,60,1.2)]'
      case 'Mythical': return 'drop-shadow-[0_0_40px_rgba(239,68,68,1.3)]'
      default: return 'drop-shadow-[0_0_15px_rgba(148,163,184,0.6)]'
    }
  }

  // Guard clause - only access cat properties if cat exists
  if (!cat) {
    return null
  }

  const rarityGradient = getRarityGradient(cat.rarity)
  const rarityGlow = getRarityGlow(cat.rarity)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden"
          style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}
        >
          {/* Celebration Particles */}
          {windowSize.width > 0 && (
            <ParticleSystem
              x={windowSize.width / 2}
              y={windowSize.height / 2}
              active={particleActive}
              count={30}
            />
          )}

          <motion.div
            ref={holographic.cardRef}
            initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[90vw] sm:max-w-[320px] lg:max-w-[360px] holographic-card"
            style={holographic.style}
            {...(holographic.isSupported ? (isWeb() ? {
              onMouseMove: holographic.handlers.onMouseMove,
              onMouseLeave: holographic.handlers.onMouseLeave
            } : {
              onTouchMove: holographic.handlers.onTouchMove,
              onTouchEnd: holographic.handlers.onTouchEnd
            }) : {})}
          >
            {/* Celebration Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-4"
            >
              <div className="text-6xl mb-2 animate-bounce">✨</div>
              <h2 className="text-3xl font-black text-gold-400 drop-shadow-lg font-heading tracking-wider">
                CAT CAUGHT!
              </h2>
            </motion.div>

            {/* Card Container */}
            <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl ${rarityGlow}`}>
              {/* Holographic Overlay */}
              {holographic.isSupported && (
                <div
                  className={`holographic-overlay full ${holographic.isActive ? 'active' : ''} rarity-${cat.rarity.toLowerCase()}`}
                />
              )}

              {/* Mythical Particles */}
              {cat.rarity === 'Mythical' && (
                <>
                  <div className="absolute top-4 left-4 w-2 h-2 bg-red-500 rounded-full mythical-particle" style={{ animationDelay: '0s', zIndex: 30 }} />
                  <div className="absolute top-8 right-6 w-2 h-2 bg-red-400 rounded-full mythical-particle" style={{ animationDelay: '0.5s', zIndex: 30 }} />
                  <div className="absolute bottom-12 left-8 w-2 h-2 bg-rose-500 rounded-full mythical-particle" style={{ animationDelay: '1s', zIndex: 30 }} />
                  <div className="absolute bottom-6 right-4 w-2 h-2 bg-red-600 rounded-full mythical-particle" style={{ animationDelay: '1.5s', zIndex: 30 }} />
                </>
              )}

              {/* Full-Screen Character Art */}
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
                )}

                {/* Gradient Overlays */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              </div>

              {/* Card Content Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
                {/* Top: Name & Breed */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`px-6 py-3 rounded-xl bg-gradient-to-br ${rarityGradient} shadow-2xl border-3 border-white/40 backdrop-blur-sm`}>
                    <h3 className="font-black text-2xl sm:text-3xl tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-black/80 backdrop-blur-md border-2 border-white/30 shadow-xl">
                    <span className="text-sm text-slate-200 uppercase tracking-widest font-bold">
                      {cat.breed}
                    </span>
                  </div>
                </div>

                {/* Bottom: Ability */}
                <div className="flex flex-col gap-2">
                  {cat.ability && (
                    <div className="px-4 py-3 bg-black/85 backdrop-blur-md rounded-xl border-3 border-white/30 shadow-2xl">
                      <div className="text-base font-black text-gold-400 tracking-wider uppercase text-center leading-tight drop-shadow-lg mb-1">
                        {cat.ability.name}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-snug text-center">
                        {cat.ability.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rarity & Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className={`px-6 py-2 rounded-lg bg-gradient-to-br ${rarityGradient} shadow-2xl border-2 border-white/40`}>
                  <span className="text-white font-black text-lg uppercase tracking-wider">
                    {cat.rarity}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Attack */}
                <div className="flex flex-col items-center gap-1 p-3 bg-gradient-to-br from-amber-900/80 to-amber-950/90 rounded-lg border border-amber-700/50 shadow-xl">
                  <span className="font-black text-amber-200 text-xl drop-shadow-lg">{cat.attack}</span>
                  <span className="text-[10px] text-amber-300/90 font-bold tracking-wide uppercase">ATK</span>
                </div>

                {/* Health */}
                <div className="flex flex-col items-center gap-1 p-3 bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 rounded-lg border border-emerald-700/50 shadow-xl">
                  <span className="font-black text-emerald-200 text-xl drop-shadow-lg">{cat.health}</span>
                  <span className="text-[10px] text-emerald-300/90 font-bold tracking-wide uppercase">HP</span>
                </div>

                {/* Level */}
                <div className="flex flex-col items-center gap-1 p-3 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-lg border border-purple-700/50 shadow-xl">
                  <span className="font-black text-purple-200 text-xl drop-shadow-lg">1</span>
                  <span className="text-[10px] text-purple-300/90 font-bold tracking-wide uppercase">LVL</span>
                </div>
              </div>
            </motion.div>

            {/* Hint Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center"
            >
              <p className="text-slate-300 text-sm sm:text-base font-semibold mb-1">
                Added to your collection!
              </p>
              <p className="text-slate-500 text-xs">
                Click anywhere to continue
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
