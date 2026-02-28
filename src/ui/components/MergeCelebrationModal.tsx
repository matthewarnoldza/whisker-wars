import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { OwnedCat } from '../../game/store'
import GameCard from './GameCard'
import ParticleSystem from './ParticleSystem'
import { useState, useEffect } from 'react'

interface MergeCelebrationModalProps {
  eliteCat: OwnedCat | null
  isOpen: boolean
  onClose: () => void
}

export default function MergeCelebrationModal({ eliteCat, isOpen, onClose }: MergeCelebrationModalProps) {
  const [particleActive, setParticleActive] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])

  useEffect(() => {
    if (isOpen && eliteCat) {
      setShowCard(false)
      // Flash delay then reveal card
      const timer = setTimeout(() => {
        setShowCard(true)
        setParticleActive(true)
        setTimeout(() => setParticleActive(false), 500)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isOpen, eliteCat])

  // Lock body scroll when modal is open
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

  if (!eliteCat) return null

  const isPrismatic = (eliteCat.eliteTier || 0) >= 2
  const title = isPrismatic ? 'PRISMATIC FORGED!' : 'ELITE FORGED!'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-celebration flex items-center justify-center bg-slate-950/85 backdrop-blur-md overflow-hidden touch-none p-4"
        >
          {/* White Flash Effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
            className="absolute inset-0 bg-white/80 pointer-events-none"
          />

          {/* Celebration Particles */}
          {windowSize.width > 0 && (
            <ParticleSystem
              x={windowSize.width / 2}
              y={windowSize.height / 2}
              active={particleActive}
              count={40}
              colors={isPrismatic
                ? ['#FFD700', '#00FFFF', '#FF69B4', '#8B5CF6']
                : ['#FFD700', '#FFA500', '#00FFFF']
              }
            />
          )}

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={showCard ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="relative flex flex-col items-center touch-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={showCard ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="text-center mb-4"
            >
              <div className="text-6xl mb-2 animate-bounce">
                {isPrismatic ? '💎' : '⚡'}
              </div>
              <h2 className={`text-3xl font-black drop-shadow-lg font-heading tracking-wider ${
                isPrismatic ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-cyan-400 to-purple-400' : 'text-gold-400'
              }`}>
                {title}
              </h2>
            </motion.div>

            {/* The Elite Card */}
            <GameCard
              character={eliteCat}
              holographicMode="full"
              animate={true}
            />

            {/* Stats Summary */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={showCard ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="mt-4 flex items-center gap-3"
            >
              <div className="flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-br from-amber-900/80 to-amber-950/90 rounded-lg border border-amber-700/50 shadow-xl">
                <span className="font-black text-amber-200 text-lg">{eliteCat.currentAttack}</span>
                <span className="text-[10px] text-amber-300/90 font-bold tracking-wide uppercase">ATK</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 rounded-lg border border-emerald-700/50 shadow-xl">
                <span className="font-black text-emerald-200 text-lg">{eliteCat.maxHp}</span>
                <span className="text-[10px] text-emerald-300/90 font-bold tracking-wide uppercase">HP</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-lg border border-purple-700/50 shadow-xl">
                <span className="font-black text-purple-200 text-lg">{eliteCat.level}</span>
                <span className="text-[10px] text-purple-300/90 font-bold tracking-wide uppercase">LVL</span>
              </div>
            </motion.div>

            {/* Bonus Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={showCard ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
              className="mt-3 text-center"
            >
              <p className="text-cyan-300 text-sm font-bold">
                +{isPrismatic ? '35' : '20'}% Stats &bull; Enhanced Abilities &bull; Stellar Resilience
              </p>
            </motion.div>

            {/* Hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={showCard ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="mt-4 text-center"
            >
              <p className="text-slate-500 text-xs">Click anywhere to continue</p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
