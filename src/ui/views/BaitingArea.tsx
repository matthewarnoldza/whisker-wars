import { useRef, useState } from 'react'
import { useGame } from '../../game/store'
import type { Bait, Cat } from '../../game/data'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from '../components/ParticleSystem'
import CatchCelebrationModal from '../components/CatchCelebrationModal'
import CoachMark from '../components/CoachMark'
import { useFirstRunHints } from '../hooks/useFirstRunHints'
import { containerVariants, cardVariants } from '../animations'
import { trackBaitUsed, trackCatchSuccess, trackCatchFailure } from '../../utils/analytics'
import { playSound } from '../../utils/sound'
import { Panel, StatPill } from '../components/ui'
import { RARITY, RARITY_TIERS } from '../constants/rarity'
import { CoinIcon, FishIcon, FishingRodIcon, SadCatIcon, SparkleIcon, BulbIcon } from '../icons'
import { useMotionSafe } from '../hooks/useMotionSafe'

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
  const setView = useGame(s => s.setView)
  const soundEnabled = useGame(s => s.soundEnabled)
  const reduceMotion = useMotionSafe()

  // First-run coach-marks: anchor refs for the two panels below. The hook owns
  // sequencing + persistence; we just render whatever it points at.
  const useBaitRef = useRef<HTMLDivElement>(null)
  const buyBaitRef = useRef<HTMLDivElement>(null)
  const { activeHint, dismissActive } = useFirstRunHints({ useBait: useBaitRef, buyBait: buyBaitRef })

  // Bait tier (1-6) maps 1:1 onto the canonical rarity tiers.
  const getRarityGradient = (tier: number) =>
    RARITY[RARITY_TIERS[Math.min(tier - 1, RARITY_TIERS.length - 1)]].gradient

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
      // Immediately add cat to collection so it's never lost
      befriend(cat)
      // befriendCat changes view to 'collection', override back to 'bait' for modal
      setView('bait')
      // Show celebration modal
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
    // Cat was already added to collection in handleUseBait, stay on bait screen to keep hunting
    setTimeout(() => {
      setCaughtCat(null)
      setResult(null)
    }, 300)
  }

  return (
    <div className="space-y-6">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/60 to-purple-500/60 border border-blue-500/50"
      >
        <p className="text-white text-center font-semibold inline-flex items-center justify-center gap-2 flex-wrap">
          <SparkleIcon className="text-lg text-accent-200 shrink-0" />
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
        <Panel ref={useBaitRef} className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-ink mb-1 flex items-center gap-2 font-heading">
              <FishIcon className="text-3xl text-accent-300" /> Use Bait
            </h2>
            <p className="text-sm text-ink-subtle">
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
                    className={`px-4 py-3 rounded-lg font-bold border border-white/20 bg-gradient-to-br ${getRarityGradient(
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
                        <div className="text-xs bg-black/60 px-2 py-0.5 rounded-full font-bold">x{qty}</div>
                      </div>
                    </div>
                    {/* Shine effect */}
                    {!reduceMotion && (
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
                    )}
                  </motion.button>
                )
              })}

            {Object.values(inventory).every(qty => qty === 0) && (
              <div className="w-full p-6 rounded-lg border-2 border-dashed border-surface-border text-center">
                <p className="text-ink-faint">
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
                className="mt-4 p-6 rounded-xl border border-danger-500/50 bg-danger-500/20"
              >
                <div className="text-center">
                  <SadCatIcon className="text-3xl text-danger-400 mx-auto mb-2" />
                  <p className="text-danger-400 font-semibold">No cat appeared...</p>
                  <p className="text-xs text-danger-400/70 mt-1">Try again!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-surface-deep/80 border border-surface-border">
            <span className="text-ink-subtle text-sm">Your Coins:</span>
            <StatPill
              icon={<CoinIcon className="text-accent-300" />}
              value={coins}
              tone="gold"
            />
          </div>
        </Panel>

        {/* Buy Bait Section - Second (Right) */}
        <Panel ref={buyBaitRef} className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-ink mb-1 flex items-center gap-2 font-heading">
              <FishingRodIcon className="text-3xl text-accent-300" /> Buy Bait
            </h2>
            <p className="text-sm text-ink-subtle">
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
                      ? 'border-surface-border bg-surface-raised/80 hover:border-accent-400 hover:shadow-glow-gold-sm cursor-pointer'
                      : 'border-surface-border bg-surface-deep/60 opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`px-2 py-1 rounded text-xs font-bold bg-gradient-to-r ${getRarityGradient(b.tier)} text-white shadow-sm`}>
                      TIER {b.tier}
                    </div>
                    <StatPill
                      icon={<CoinIcon className="text-accent-300" />}
                      value={b.cost}
                      tone="gold"
                      size="sm"
                    />
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
                    <div className="font-bold text-ink text-base flex-1">
                      {b.name}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>

          <div className="mt-4 p-3 rounded-lg bg-accent-500/15 border border-accent-400/40">
            <p className="text-sm text-accent-200 inline-flex items-start gap-2">
              <BulbIcon className="text-accent-300 shrink-0 mt-0.5" />
              <span><span className="font-semibold">Pro Tip:</span> Higher tier bait has better chances of attracting Epic, Legendary, and Mythical cats!</span>
            </p>
          </div>
        </Panel>
      </motion.div>

      <ParticleSystem {...particlePos} count={15} />

      {/* Catch Celebration Modal */}
      <CatchCelebrationModal
        cat={caughtCat}
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
      />

      {/* First-run coach-mark (one at a time; suppressed once the player has cats) */}
      {activeHint && (
        <CoachMark
          key={activeHint.id}
          anchorRef={activeHint.anchorRef}
          caption={activeHint.caption}
          placement={activeHint.placement}
          onDismiss={dismissActive}
        />
      )}
    </div>
  )
}
