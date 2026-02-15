import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { JungleRunScore, JungleRunState } from '../../game/jungleRun'
import { getBoonById } from '../../game/boons'

interface JungleVictoryModalProps {
  score: JungleRunScore
  runState: JungleRunState
  onClose: () => void
}

function AnimatedCounter({ target, duration = 1.5, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now()
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.floor(target * eased))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])

  return <>{value.toLocaleString()}</>
}

// Simple confetti particles
function ConfettiParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    color: ['bg-amber-400', 'bg-emerald-400', 'bg-teal-300', 'bg-yellow-300', 'bg-green-400'][Math.floor(Math.random() * 5)],
    size: 4 + Math.random() * 6,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: 360 + Math.random() * 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          className={`absolute ${p.color} rounded-sm`}
          style={{ width: p.size, height: p.size }}
        />
      ))}
    </div>
  )
}

export default function JungleVictoryModal({ score, runState, onClose }: JungleVictoryModalProps) {
  const elapsedMs = runState.stageResults.length > 0
    ? runState.stageResults[runState.stageResults.length - 1].endTime - runState.startedAt
    : 0
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)

  const survivingCats = runState.squad.filter(c => !c.knockedOut)
  const knockedOutCats = runState.squad.filter(c => c.knockedOut)

  const scoreRows: { label: string; value: number }[] = [
    { label: 'Stages Cleared', value: score.stageScore },
    { label: 'Speed Bonus', value: score.speedBonus },
    { label: 'HP Remaining', value: score.hpRemainingScore },
    { label: 'Boss Kills', value: score.bossKillScore },
    { label: 'All Cats Alive', value: score.allCatsAliveBonus },
    { label: 'Boon Efficiency', value: score.boonEfficiencyScore },
    { label: 'Flawless Stages', value: score.flawlessStageScore },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-emerald-950/95 backdrop-blur-lg flex items-center justify-center touch-none overflow-y-auto p-4"
      >
        <ConfettiParticles />

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 180 }}
          className="relative w-full max-w-lg my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Victory Header */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 0.2 }}
            className="text-center mb-6"
          >
            <motion.h1
              className="text-5xl font-black text-amber-400 tracking-wider"
              style={{ textShadow: '0 0 40px rgba(251,191,36,0.6)' }}
              animate={{ textShadow: ['0 0 30px rgba(251,191,36,0.4)', '0 0 50px rgba(251,191,36,0.7)', '0 0 30px rgba(251,191,36,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              VICTORY!
            </motion.h1>
            <p className="text-emerald-200/60 text-sm mt-2">
              The jungle has been conquered!
            </p>
          </motion.div>

          {/* Score Breakdown */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-emerald-900/80 border border-emerald-500/20 rounded-2xl p-5 mb-4"
          >
            <div className="text-xs text-emerald-200/50 uppercase tracking-wider font-bold mb-3">Score Breakdown</div>
            <div className="space-y-2">
              {scoreRows.map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-emerald-200/70 text-sm">{row.label}</span>
                  <span className={`text-sm font-bold ${row.value > 0 ? 'text-slate-100' : 'text-slate-500'}`}>
                    {row.value > 0 ? `+${row.value}` : row.value}
                  </span>
                </div>
              ))}
              <div className="border-t border-emerald-500/20 pt-2 mt-2 flex justify-between items-center">
                <span className="text-slate-100 font-bold">Total Score</span>
                <span className="text-2xl font-black text-amber-400">
                  <AnimatedCounter target={score.totalScore} delay={0.6} />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Coins Earned + Time */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            <div className="bg-emerald-900/80 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="text-xs text-emerald-200/50 uppercase tracking-wider font-bold mb-1">Coins Earned</div>
              <div className="text-2xl font-black text-amber-400">
                <AnimatedCounter target={score.coinsEarned} delay={0.8} />
              </div>
            </div>
            <div className="bg-emerald-900/80 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="text-xs text-emerald-200/50 uppercase tracking-wider font-bold mb-1">Time Elapsed</div>
              <div className="text-2xl font-black text-teal-300">
                {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
              </div>
            </div>
          </motion.div>

          {/* Boons Collected */}
          {runState.activeBoons.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="bg-emerald-900/80 border border-emerald-500/20 rounded-xl p-4 mb-4"
            >
              <div className="text-xs text-emerald-200/50 uppercase tracking-wider font-bold mb-2">Boons Collected</div>
              <div className="flex flex-wrap gap-2">
                {runState.activeBoons.map(ab => {
                  const boon = getBoonById(ab.boonId)
                  if (!boon) return null
                  const rarityColor = boon.rarity === 'Legendary' ? 'text-amber-400 border-amber-500/30'
                    : boon.rarity === 'Rare' ? 'text-blue-400 border-blue-500/30'
                    : 'text-slate-400 border-slate-500/30'
                  return (
                    <span
                      key={ab.boonId}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 border text-xs font-bold ${rarityColor}`}
                    >
                      {boon.name}
                      {ab.stacks > 1 && <span className="text-emerald-200/50">x{ab.stacks}</span>}
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
            transition={{ delay: 0.75 }}
            className="bg-emerald-900/80 border border-emerald-500/20 rounded-xl p-4 mb-6"
          >
            <div className="text-xs text-emerald-200/50 uppercase tracking-wider font-bold mb-2">Squad Status</div>
            <div className="space-y-1.5">
              {survivingCats.map(cat => (
                <div key={cat.instanceId} className="flex items-center justify-between">
                  <span className="text-slate-100 text-sm font-bold">{cat.name}</span>
                  <span className="text-emerald-400 text-xs font-bold">
                    {cat.currentHp}/{cat.maxHp} HP
                  </span>
                </div>
              ))}
              {knockedOutCats.map(cat => (
                <div key={cat.instanceId} className="flex items-center justify-between opacity-50">
                  <span className="text-slate-400 text-sm font-bold line-through">{cat.name}</span>
                  <span className="text-red-400 text-xs font-bold">KO</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Return Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <motion.button
              onClick={onClose}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-black text-lg rounded-xl shadow-[0_0_24px_rgba(52,211,153,0.3)] transition-all"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Return to Jungle
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
