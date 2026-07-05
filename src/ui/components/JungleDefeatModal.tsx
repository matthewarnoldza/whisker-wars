import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { JungleRunScore, JungleRunState } from '../../game/jungleRun'
import { getBoonById } from '../../game/boons'
import { useGame } from '../../game/store'
import { getNewlyUnlockedMedals } from '../../game/jungleRewards'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { SkullIcon, CoinIcon, ClockIcon } from '../icons'

interface JungleDefeatModalProps {
  score: JungleRunScore
  runState: JungleRunState
  stageReached: number
  onClose: () => void
}

export default function JungleDefeatModal({ score, runState, stageReached, onClose }: JungleDefeatModalProps) {
  const reduce = useMotionSafe()
  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({ onClose })
  const jungleStats = useGame(s => s.jungleStats)
  const unlockedJungleMedals = useGame(s => s.unlockedJungleMedals)

  const newMedals = useMemo(() =>
    getNewlyUnlockedMedals(runState, jungleStats, score.totalScore, unlockedJungleMedals),
    [runState, jungleStats, score.totalScore, unlockedJungleMedals],
  )

  const elapsedMs = runState.stageResults.length > 0
    ? runState.stageResults[runState.stageResults.length - 1].endTime - runState.startedAt
    : 0
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)

  const scoreRows: { label: string; value: number }[] = [
    { label: 'Stages Cleared', value: score.stageScore },
    { label: 'Speed Bonus', value: score.speedBonus },
    { label: 'HP Remaining', value: score.hpRemainingScore },
    { label: 'Boss Kills', value: score.bossKillScore },
    { label: 'Boon Efficiency', value: score.boonEfficiencyScore },
    { label: 'Flawless Stages', value: score.flawlessStageScore },
  ]

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-surface-deep/90 backdrop-blur-lg flex items-center justify-center touch-none overflow-y-auto p-4"
      >
        <motion.div
          ref={dialogRef}
          {...dialogProps}
          aria-labelledby="jungle-defeat-title"
          initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 22, stiffness: 200 }}
          className="relative w-full max-w-lg my-4 focus:outline-none"
        >
          {/* Defeat Header — sombre, no gold, no glow pulse */}
          <motion.div
            initial={reduce ? false : { y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.2 }}
            className="text-center mb-6"
          >
            <SkullIcon className="mx-auto mb-3 text-ink-subtle" size={48} />
            <motion.h1
              id="jungle-defeat-title"
              className="font-heading text-4xl font-black uppercase text-danger-400/80 tracking-wide"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.3 }}
            >
              Defeated...
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-ink-faint text-sm mt-2"
            >
              Reached Stage {stageReached} of 20
            </motion.p>
          </motion.div>

          {/* Flavor Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-ink-faint/80 text-sm italic mb-6"
          >
            "The jungle claims another..."
          </motion.p>

          {/* Partial Score Breakdown */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-emerald-900/50 border border-emerald-500/10 rounded-2xl p-5 mb-4"
          >
            <div className="text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-3">Score Breakdown</div>
            <div className="space-y-2">
              {scoreRows.map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-emerald-200/50 text-sm">{row.label}</span>
                  <span className={`text-sm font-bold ${row.value > 0 ? 'text-ink-muted' : 'text-ink-faint'}`}>
                    {row.value > 0 ? `+${row.value}` : row.value}
                  </span>
                </div>
              ))}
              <div className="border-t border-emerald-500/10 pt-2 mt-2 flex justify-between items-center">
                <span className="text-ink-muted font-bold">Total Score</span>
                <span className="text-xl font-black text-amber-400/80">{score.totalScore.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Medals Earned */}
          {newMedals.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="bg-amber-900/20 border border-amber-500/15 rounded-2xl p-5 mb-4"
            >
              <div className="text-xs text-amber-300/50 uppercase tracking-wider font-bold mb-3">Medals Earned</div>
              <div className="space-y-3">
                {newMedals.map((medal, i) => (
                  <motion.div
                    key={medal.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.65 + i * 0.15, type: 'spring', damping: 15 }}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={medal.imageUrl}
                      alt={medal.name}
                      className="w-10 h-10 rounded-lg border border-amber-500/25 shadow-[0_0_8px_rgba(251,191,36,0.15)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-amber-300/80">{medal.name}</div>
                      <div className="text-xs text-ink-subtle">{medal.description}</div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400/40 uppercase shrink-0">{medal.type}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Coins + Time */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            <div className="bg-emerald-900/50 border border-emerald-500/10 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-1"><CoinIcon className="text-amber-400/80" size={13} /> Coins Earned</div>
              <div className="text-xl font-black text-amber-400/80 tabular-nums">{score.coinsEarned}</div>
            </div>
            <div className="bg-emerald-900/50 border border-emerald-500/10 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-1"><ClockIcon className="text-teal-300/70" size={13} /> Time</div>
              <div className="text-xl font-black text-teal-300/70 tabular-nums">
                {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
              </div>
            </div>
          </motion.div>

          {/* Boons Collected */}
          {(runState.activeBoons ?? []).length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="bg-emerald-900/50 border border-emerald-500/10 rounded-xl p-4 mb-4"
            >
              <div className="text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-2">Boons Collected</div>
              <div className="flex flex-wrap gap-2">
                {runState.activeBoons.map(ab => {
                  const boon = getBoonById(ab.boonId)
                  if (!boon) return null
                  const rarityColor = boon.rarity === 'Legendary' ? 'text-amber-400/70 border-amber-500/20'
                    : boon.rarity === 'Rare' ? 'text-purple-400/70 border-purple-500/20'
                    : 'text-ink-subtle border-surface-border'
                  return (
                    <span
                      key={ab.boonId}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/40 border text-xs font-bold ${rarityColor}`}
                    >
                      {boon.name}
                      {ab.stacks > 1 && <span className="text-emerald-200/40">x{ab.stacks}</span>}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Squad Status */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-emerald-900/50 border border-emerald-500/10 rounded-xl p-4 mb-6"
          >
            <div className="text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-2">Squad Status</div>
            <div className="space-y-1.5">
              {runState.squad.map(cat => (
                <div key={cat.instanceId} className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${cat.knockedOut ? 'text-ink-faint line-through' : 'text-ink-muted'}`}>
                    {cat.name}
                  </span>
                  <span className={`text-xs font-bold ${cat.knockedOut ? 'text-danger-400/70' : 'text-emerald-400/60'}`}>
                    {cat.knockedOut ? 'KO' : `${cat.currentHp}/${cat.maxHp} HP`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Try Again Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={onClose}
              className="w-full px-6 py-4 bg-surface-raised hover:bg-surface-overlay border border-surface-border text-ink font-heading font-black uppercase tracking-wide text-lg rounded-xl shadow-panel transition-colors focus:outline-none focus-visible:shadow-focus-gold"
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(52,211,153,0.1)' }}
              whileTap={{ scale: 0.97 }}
            >
              Try Again
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
