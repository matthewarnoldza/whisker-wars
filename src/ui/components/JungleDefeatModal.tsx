import { motion, AnimatePresence } from 'framer-motion'
import type { JungleRunScore, JungleRunState } from '../../game/jungleRun'
import { getBoonById } from '../../game/boons'

interface JungleDefeatModalProps {
  score: JungleRunScore
  runState: JungleRunState
  stageReached: number
  onClose: () => void
}

export default function JungleDefeatModal({ score, runState, stageReached, onClose }: JungleDefeatModalProps) {
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-lg flex items-center justify-center touch-none overflow-y-auto p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
          className="relative w-full max-w-lg my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Defeat Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <motion.h1
              className="text-4xl font-black text-red-400/80 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Defeated...
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-500 text-sm mt-2"
            >
              Reached Stage {stageReached} of 20
            </motion.p>
          </motion.div>

          {/* Flavor Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-slate-600 text-sm italic mb-6"
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
                  <span className={`text-sm font-bold ${row.value > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                    {row.value > 0 ? `+${row.value}` : row.value}
                  </span>
                </div>
              ))}
              <div className="border-t border-emerald-500/10 pt-2 mt-2 flex justify-between items-center">
                <span className="text-slate-300 font-bold">Total Score</span>
                <span className="text-xl font-black text-amber-400/80">{score.totalScore.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Coins + Time */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            <div className="bg-emerald-900/50 border border-emerald-500/10 rounded-xl p-4 text-center">
              <div className="text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-1">Coins Earned</div>
              <div className="text-xl font-black text-amber-400/80">{score.coinsEarned}</div>
            </div>
            <div className="bg-emerald-900/50 border border-emerald-500/10 rounded-xl p-4 text-center">
              <div className="text-xs text-emerald-200/40 uppercase tracking-wider font-bold mb-1">Time</div>
              <div className="text-xl font-black text-teal-300/70">
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
                    : 'text-slate-400/70 border-slate-500/20'
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
                  <span className={`text-sm font-bold ${cat.knockedOut ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {cat.name}
                  </span>
                  <span className={`text-xs font-bold ${cat.knockedOut ? 'text-red-400/60' : 'text-emerald-400/60'}`}>
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
              className="w-full px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200 font-black text-lg rounded-xl shadow-lg transition-all"
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(52,211,153,0.1)' }}
              whileTap={{ scale: 0.97 }}
            >
              Try Again
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
