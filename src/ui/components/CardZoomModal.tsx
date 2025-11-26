import { motion, AnimatePresence } from 'framer-motion'
import type { OwnedCat } from '../../game/store'
import { useHolographicCard } from '../hooks/useHolographicCard'
import { isWeb } from '../../utils/platform'

interface CardZoomModalProps {
  cat: OwnedCat | null
  isOpen: boolean
  onClose: () => void
}

export default function CardZoomModal({ cat, isOpen, onClose }: CardZoomModalProps) {
  if (!cat) return null

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

  const rarityGradient = getRarityGradient(cat.rarity)
  const rarityGlow = getRarityGlow(cat.rarity)

  // Enhanced holographic effect for zoomed view
  const holographic = useHolographicCard({
    mode: 'full',
    maxRotation: 20, // More dramatic in zoom
    shineIntensity: cat.rarity === 'Mythical' ? 0.9 : cat.rarity === 'Legendary' ? 0.8 : 0.7
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div
            ref={holographic.cardRef}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] my-auto holographic-card"
            style={holographic.style}
            {...(holographic.isSupported ? (isWeb() ? {
              onMouseMove: holographic.handlers.onMouseMove,
              onMouseLeave: holographic.handlers.onMouseLeave
            } : {
              onTouchMove: holographic.handlers.onTouchMove,
              onTouchEnd: holographic.handlers.onTouchEnd
            }) : {})}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

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

                {/* Gradient Overlays - only at top and bottom */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              </div>

              {/* Card Content Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
                {/* Top: Name Only */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-gradient-to-br ${rarityGradient} shadow-2xl border-2 sm:border-3 border-white/40 backdrop-blur-sm`}>
                    <h3 className="font-black text-xl sm:text-2xl tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                {/* Bottom: Ability Only */}
                <div className="flex flex-col gap-2">
                  {/* Ability */}
                  {cat.ability && (
                    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-black/80 backdrop-blur-md rounded-xl border-2 sm:border-3 border-white/30 shadow-2xl">
                      <div className="text-sm sm:text-base font-black text-gold-400 tracking-wider uppercase text-center leading-tight drop-shadow-lg mb-1">
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

            {/* Breed and Rarity - Below Card */}
            <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2">
              <div className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-md border-2 border-slate-600/50 shadow-xl flex items-center justify-center">
                <span className="text-sm sm:text-base text-slate-200 uppercase tracking-widest font-bold">
                  {cat.breed}
                </span>
              </div>
              <div className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-br from-amber-800/80 to-amber-900/90 backdrop-blur-md border-2 border-gold-500/50 shadow-xl flex items-center justify-center">
                <span className="text-sm sm:text-base text-gold-400 uppercase tracking-widest font-bold">
                  {cat.rarity}
                </span>
              </div>
            </div>

            {/* Stats Below Breed/Rarity */}
            <div className="mt-2 sm:mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {/* Attack */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-amber-900/80 to-amber-950/90 rounded-lg border border-amber-700/50 shadow-xl">
                <span className="font-black text-amber-200 text-lg sm:text-xl drop-shadow-lg">{cat.currentAttack}</span>
                <span className="text-[9px] sm:text-[10px] text-amber-300/90 font-bold tracking-wide uppercase">ATK</span>
              </div>

              {/* Health */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 rounded-lg border border-emerald-700/50 shadow-xl">
                <span className="font-black text-emerald-200 text-base sm:text-lg drop-shadow-lg leading-none">{cat.currentHp}/{cat.maxHp}</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-300/90 font-bold tracking-wide uppercase">HP</span>
              </div>

              {/* Level */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-lg border border-purple-700/50 shadow-xl">
                <span className="font-black text-purple-200 text-lg sm:text-xl drop-shadow-lg">{cat.level}</span>
                <span className="text-[9px] sm:text-[10px] text-purple-300/90 font-bold tracking-wide uppercase">LVL</span>
              </div>

              {/* Battles */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-slate-800/80 to-slate-900/90 rounded-lg border border-slate-700/50 shadow-xl">
                <span className="font-black text-slate-200 text-base sm:text-lg drop-shadow-lg leading-none">{cat.totalWins || 0}/{cat.totalBattles || 0}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-300/90 font-bold tracking-wide uppercase">W/L</span>
              </div>
            </div>

            {/* Hint Text */}
            <div className="mt-2 sm:mt-3 text-center">
              <p className="text-slate-400 text-xs sm:text-sm">Click anywhere to close</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
