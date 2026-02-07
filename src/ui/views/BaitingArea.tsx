import Card from '../components/Card'
import { useState } from 'react'
import { useGame } from '../../game/store'
import type { Bait, Cat } from '../../game/data'
import GameCard from '../components/GameCard'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from '../components/ParticleSystem'
import CatchCelebrationModal from '../components/CatchCelebrationModal'
import { containerVariants, cardVariants } from '../animations'
import { trackBaitUsed, trackCatchSuccess, trackCatchFailure } from '../../utils/analytics'
import { playSound } from '../../utils/sound'

export default function BaitingArea({ baits }: { baits: Bait[] }) {
  const [result, setResult] = useState<{ cat?: Cat, ok: boolean } | null>(null)
  const [caughtCat, setCaughtCat] = useState<Cat | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [particlePos, setParticlePos] = useState({ x: 0, y: 0, active: false })
  const coins = useGame(s => s.coins)
  const buyBait = useGame(s => s.buyBait)
  const inventory = useGame(s => s.baits)
  const useB = useGame(s => s.useBait)
  const befriend = useGame(s => s.befriendCat)
  const soundEnabled = useGame(s => s.soundEnabled)

  const getRarityColor = (tier: number) => {
    const colors = [
      'from-gray-500 to-gray-400',
      'from-green-500 to-green-400',
      'from-blue-500 to-blue-400',
      'from-purple-500 to-purple-400',
      'from-orange-500 to-orange-400',
      'from-slate-900 to-slate-800',
    ]
    return colors[Math.min(tier - 1, colors.length - 1)]
  }

  const handleUseBait = (id: string, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setParticlePos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      active: true,
    })

    setTimeout(() => setParticlePos(p => ({ ...p, active: false })), 100)

    const bait = baits.find(b => b.id === id)
    if (!bait) return
    trackBaitUsed(bait.name, bait.tier)

    const cat = useB(id)
    if (cat) {
      trackCatchSuccess(cat.name, cat.rarity, bait.name, bait.tier)
      if (soundEnabled) playSound('catCaught')
      // Show celebration modal instead of inline result
      setCaughtCat(cat)
      // Use setTimeout to ensure state is set before showing modal
      setTimeout(() => {
        setShowCelebration(true)
      }, 50)
      setResult({ cat, ok: true })
    } else {
      trackCatchFailure(bait.name, bait.tier)
      setResult({ ok: false })
      setCaughtCat(null)
      setShowCelebration(false)
    }
  }

  const handleCelebrationClose = () => {
    setShowCelebration(false)
    if (caughtCat) {
      befriend(caughtCat)
      // Clear after a brief delay
      setTimeout(() => {
        setCaughtCat(null)
        setResult(null)
      }, 300)
    }
  }

  return (
    <div className="space-y-6">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-500/50"
      >
        <p className="text-white text-center font-semibold">
          <span className="text-lg mr-2">✨</span>
          Use bait to summon cats! Higher tier bait attracts rarer cats. Each use is your chance to expand your legendary collection!
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="grid gap-8 lg:grid-cols-2"
      >
        {/* Use Bait Section - First (Left) */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-fantasy">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 font-heading">
              <span className="text-3xl">🐟</span> Use Bait
            </h2>
            <p className="text-sm text-slate-400">
              Cast your bait and see what cats you attract!
            </p>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[120px]">
            {Object.entries(inventory)
              .filter(([_, qty]) => qty > 0)
              .map(([id, qty]) => {
                const bait = baits.find(b => b.id === id)
                if (!bait) return null
                return (
                  <motion.button
                    key={id}
                    onClick={(e) => handleUseBait(id, e)}
                    className={`px-4 py-3 rounded-lg font-bold border-2 border-white/30 bg-gradient-to-br ${getRarityColor(
                      bait.tier
                    )} text-white shadow-lg relative overflow-hidden`}
                    whileHover={{ scale: 1.05, boxShadow: '0 8px 32px rgba(234, 179, 8, 0.2)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      {bait.iconUrl && (
                        <img
                          src={bait.iconUrl}
                          alt={bait.name}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 object-contain drop-shadow-lg"
                        />
                      )}
                      <div className="flex flex-col items-start flex-1">
                        <div className="text-sm font-black tracking-wide">{bait.name}</div>
                        <div className="text-xs bg-black/30 px-2 py-0.5 rounded-full font-bold">x{qty}</div>
                      </div>
                    </div>
                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  </motion.button>
                )
              })}

            {Object.values(inventory).every(qty => qty === 0) && (
              <div className="w-full p-6 rounded-lg border-2 border-dashed border-slate-700 text-center">
                <p className="text-slate-500">
                  No bait in inventory. Buy some bait to get started!
                </p>
              </div>
            )}
          </div>

          {/* Fail Result Display (only show when no cat caught) */}
          <AnimatePresence mode="wait">
            {result && !result.ok && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="mt-4 p-6 rounded-xl border border-red-500/50 bg-red-500/10"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">😿</div>
                  <p className="text-red-300 font-semibold">No cat appeared...</p>
                  <p className="text-xs text-red-200/70 mt-1">Try again!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
            <span className="text-slate-400 text-sm">Your Coins:</span>
            <span className="text-gold-400 font-bold text-lg">🪙 {coins}</span>
          </div>
        </div>

        {/* Buy Bait Section - Second (Right) */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-fantasy">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 font-heading">
              <span className="text-3xl">🎣</span> Buy Bait
            </h2>
            <p className="text-sm text-slate-400">
              Purchase bait to attract cats. Higher tier = rarer cats!
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 gap-3"
          >
            {baits.map(b => {
              const canAfford = coins >= b.cost
              return (
                <motion.button
                  key={b.id}
                  variants={cardVariants}
                  whileHover={canAfford ? { scale: 1.05, y: -5 } : {}}
                  whileTap={canAfford ? { scale: 0.95 } : {}}
                  onClick={() => buyBait(b.id)}
                  disabled={!canAfford}
                  className={`p-4 rounded-lg border text-left transition-all ${canAfford
                      ? 'border-slate-600 bg-slate-700/50 hover:border-gold-500 hover:shadow-gold-glow cursor-pointer'
                      : 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`px-2 py-1 rounded text-xs font-bold bg-gradient-to-r ${getRarityColor(b.tier)} text-white shadow-sm`}>
                      TIER {b.tier}
                    </div>
                    <div className="text-gold-400 font-bold text-sm">
                      🪙 {b.cost}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {b.iconUrl && (
                      <img
                        src={b.iconUrl}
                        alt={b.name}
                        loading="lazy"
                        decoding="async"
                        className="w-12 h-12 object-contain drop-shadow-lg"
                      />
                    )}
                    <div className="font-bold text-slate-200 text-base flex-1">
                      {b.name}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>

          <div className="mt-4 p-3 rounded-lg bg-gold-500/10 border border-gold-500/30">
            <p className="text-sm text-gold-200">
              💡 <span className="font-semibold">Pro Tip:</span> Higher tier bait has better chances of attracting Epic, Legendary, and Mythical cats!
            </p>
          </div>
        </div>
      </motion.div>

      <ParticleSystem {...particlePos} count={15} />

      {/* Catch Celebration Modal */}
      <CatchCelebrationModal
        cat={caughtCat}
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
      />
    </div>
  )
}
