import { motion, AnimatePresence } from 'framer-motion'
import type { OwnedCat } from '../../game/store'

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 z-10 w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Card Container */}
            <div className={`relative w-full rounded-3xl overflow-hidden shadow-2xl ${rarityGlow}`}>
              {/* Mythical Particles */}
              {cat.rarity === 'Mythical' && (
                <>
                  <div className="absolute top-8 left-8 w-3 h-3 bg-red-500 rounded-full mythical-particle" style={{ animationDelay: '0s', zIndex: 30 }} />
                  <div className="absolute top-16 right-12 w-3 h-3 bg-red-400 rounded-full mythical-particle" style={{ animationDelay: '0.5s', zIndex: 30 }} />
                  <div className="absolute bottom-24 left-16 w-3 h-3 bg-rose-500 rounded-full mythical-particle" style={{ animationDelay: '1s', zIndex: 30 }} />
                  <div className="absolute bottom-12 right-8 w-3 h-3 bg-red-600 rounded-full mythical-particle" style={{ animationDelay: '1.5s', zIndex: 30 }} />
                </>
              )}

              {/* Full-Screen Character Art */}
              <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden">
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
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              </div>

              {/* Card Content Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-8">
                {/* Top: Name & Breed */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`px-8 py-4 rounded-xl bg-gradient-to-br ${rarityGradient} shadow-2xl border-4 border-white/40 backdrop-blur-sm`}>
                    <h3 className="font-black text-3xl tracking-wider text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] uppercase">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="px-6 py-2 rounded-lg bg-black/80 backdrop-blur-md border-2 border-white/30 shadow-xl">
                    <span className="text-sm text-slate-200 uppercase tracking-widest font-bold">
                      {cat.breed}
                    </span>
                  </div>
                  <div className="px-4 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20">
                    <span className="text-xs text-gold-400 uppercase tracking-widest font-bold">
                      {cat.rarity}
                    </span>
                  </div>
                </div>

                {/* Bottom: Ability */}
                {cat.ability && (
                  <div className="px-6 py-4 bg-black/80 backdrop-blur-md rounded-2xl border-4 border-white/30 shadow-2xl">
                    <div className="text-lg font-black text-gold-400 tracking-wider uppercase text-center leading-tight drop-shadow-lg mb-2">
                      {cat.ability.name}
                    </div>
                    <p className="text-base text-slate-200 leading-snug text-center">
                      {cat.ability.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Below Card */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              {/* Attack */}
              <div className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-amber-900/80 to-amber-950/90 rounded-xl border-2 border-amber-700/50 shadow-xl">
                <span className="font-black text-amber-200 text-3xl drop-shadow-lg">{cat.currentAttack}</span>
                <span className="text-xs text-amber-300/90 font-bold tracking-wide uppercase">Attack</span>
              </div>

              {/* Health */}
              <div className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 rounded-xl border-2 border-emerald-700/50 shadow-xl">
                <span className="font-black text-emerald-200 text-3xl drop-shadow-lg">{cat.currentHp}/{cat.maxHp}</span>
                <span className="text-xs text-emerald-300/90 font-bold tracking-wide uppercase">Health</span>
              </div>

              {/* Level */}
              <div className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-xl border-2 border-purple-700/50 shadow-xl">
                <span className="font-black text-purple-200 text-3xl drop-shadow-lg">{cat.level}</span>
                <span className="text-xs text-purple-300/90 font-bold tracking-wide uppercase">Level</span>
              </div>

              {/* Battles */}
              <div className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/90 rounded-xl border-2 border-slate-700/50 shadow-xl">
                <span className="font-black text-slate-200 text-3xl drop-shadow-lg">{cat.totalWins || 0}/{cat.totalBattles || 0}</span>
                <span className="text-xs text-slate-300/90 font-bold tracking-wide uppercase">W/L</span>
              </div>
            </div>

            {/* Hint Text */}
            <div className="mt-4 text-center">
              <p className="text-slate-400 text-sm">Click anywhere to close</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
