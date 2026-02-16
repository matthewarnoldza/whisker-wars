import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../game/store'
import type { OwnedCat } from '../../game/store'
import type { JungleStageResult } from '../../game/jungleRun'
import { isBossStage, isHealingSpring } from '../../game/birds'
import { getBoonById } from '../../game/boons'
import { calculateBoonEffects } from '../../game/boons'
import { calculateScore } from '../../game/jungleRun'
import { JUNGLE_TOTAL_STAGES, JUNGLE_SQUAD_SIZE } from '../../game/constants'
import JungleBackground from '../components/JungleBackground'
import Modal from '../components/Modal'
import {
  trackJungleRunStart,
  trackJungleStageComplete,
  trackJungleBoonSelected,
  trackJungleBossDefeated,
  trackJungleRunComplete,
  trackJungleRunFailed,
  trackJunglePurchaseStart,
} from '../../utils/analytics'
import {
  fetchJungleLeaderboard,
  JUNGLE_LEADERBOARD_CATEGORIES,
  type JungleLeaderboardEntry,
} from '../../utils/jungleLeaderboard'

// ===== Stage Names =====

const STAGE_NAMES: Record<number, string> = {
  1: 'Sunlit Threshold',
  2: 'Vine Walk',
  3: 'Whispering Branches',
  4: 'Canopy Ambush',
  5: 'Misty Riverbank',
  6: 'Log Bridge',
  7: 'Waterfall Grotto',
  8: 'Rapids Gauntlet',
  9: 'Overgrown Gates',
  10: "Talon Queen's Throne",
  11: 'Shattered Aviary',
  12: 'Idol Chamber',
  13: 'Thornveil Entrance',
  14: 'Spore Cavern',
  15: 'Thorn Maze',
  16: 'Fungal Heart',
  17: 'Bone Bridge',
  18: 'Featherstorm Gallery',
  19: 'Throne Approach',
  20: "The Apex Raptor's Domain",
}

// ===== Sub-components =====

function StageProgressBar({ currentStage, totalStages }: { currentStage: number; totalStages: number }) {
  return (
    <div className="w-full bg-slate-800/80 rounded-xl p-3 border border-emerald-900/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Jungle Progress</span>
        <span className="text-xs font-bold text-slate-400">Stage {currentStage} / {totalStages}</span>
      </div>
      <div className="relative h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStage / totalStages) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Boss markers */}
        {[10, 20].map(bossStage => (
          <div
            key={`boss-${bossStage}`}
            className={`absolute top-0 h-full w-0.5 ${currentStage >= bossStage ? 'bg-red-400' : 'bg-red-800'}`}
            style={{ left: `${(bossStage / totalStages) * 100}%` }}
            title={`Boss: Stage ${bossStage}`}
          />
        ))}
        {/* Healing spring markers */}
        {[7, 14].map(springStage => (
          <div
            key={`spring-${springStage}`}
            className={`absolute top-0 h-full w-0.5 ${currentStage >= springStage ? 'bg-cyan-400' : 'bg-cyan-800'}`}
            style={{ left: `${(springStage / totalStages) * 100}%` }}
            title={`Healing Spring: Stage ${springStage}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <div className="flex gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-600 rounded-sm" /> Boss</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-600 rounded-sm" /> Spring</span>
        </div>
      </div>
    </div>
  )
}

function ActiveBoonsPanel({ activeBoons }: { activeBoons: { boonId: string; stacks: number }[] }) {
  const [collapsed, setCollapsed] = useState(true)

  if (activeBoons.length === 0) return null

  return (
    <div className="bg-slate-800/60 rounded-xl border border-emerald-900/40 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-emerald-400 hover:bg-slate-700/30 transition-colors"
      >
        <span>Active Boons ({activeBoons.length})</span>
        <span className="text-slate-500">{collapsed ? '+ Show' : '- Hide'}</span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeBoons.map(ab => {
                const boon = getBoonById(ab.boonId)
                if (!boon) return null
                const rarityColor = boon.rarity === 'Legendary' ? 'text-amber-400' : boon.rarity === 'Rare' ? 'text-purple-400' : 'text-slate-300'
                return (
                  <div key={ab.boonId} className="bg-slate-900/60 rounded-lg px-2 py-1.5 border border-slate-700/50 flex items-center gap-2">
                    {boon.iconUrl && (
                      <img src={boon.iconUrl} alt={boon.name} className="w-7 h-7 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className={`text-xs font-bold ${rarityColor} truncate`}>{boon.name}</div>
                      <div className="text-[10px] text-slate-500">x{ab.stacks}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function JungleStatsSummary({ stats }: { stats: { totalRuns: number; totalRunsCompleted: number; bestScore: number; bestStage: number; totalCoinsEarned: number; fastestCompletionMs: number | null } }) {
  const fastestStr = stats.fastestCompletionMs != null
    ? `${Math.floor(stats.fastestCompletionMs / 60000)}m ${Math.floor((stats.fastestCompletionMs % 60000) / 1000)}s`
    : '--'

  const statItems = [
    { label: 'Total Runs', value: stats.totalRuns, icon: '🏃' },
    { label: 'Completions', value: stats.totalRunsCompleted, icon: '🎯' },
    { label: 'Best Score', value: stats.bestScore, icon: '🏆' },
    { label: 'Best Stage', value: stats.bestStage, icon: '🌿' },
    { label: 'Coins Earned', value: stats.totalCoinsEarned, icon: '🪙' },
    { label: 'Fastest Clear', value: fastestStr, icon: '⚡' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {statItems.map(item => (
        <div key={item.label} className="bg-slate-800/60 rounded-xl p-3 border border-emerald-900/30 text-center">
          <div className="text-xl mb-1">{item.icon}</div>
          <div className="text-lg font-black text-emerald-300">{item.value}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

function LeaderboardPreview() {
  const [entries, setEntries] = useState<JungleLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJungleLeaderboard('bestScore', 5).then(data => {
      setEntries(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-slate-800/40 rounded-xl border border-emerald-900/30 p-4">
      <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🏆</span> Top Explorers
      </h3>
      {loading ? (
        <div className="text-center text-slate-500 text-sm py-4">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-4">No entries yet. Be the first!</div>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 5).map((entry, i) => (
            <div key={entry.cloudCode} className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-500'}`}>#{i + 1}</span>
                <span className="text-sm font-bold text-slate-200 truncate max-w-[120px]">{entry.name}</span>
              </div>
              <span className="text-sm font-black text-emerald-400">{entry.bestScore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SquadSelector({ owned, onConfirm, onCancel }: { owned: OwnedCat[]; onConfirm: (ids: [string, string, string]) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggleCat = (instanceId: string) => {
    setSelected(prev => {
      if (prev.includes(instanceId)) return prev.filter(id => id !== instanceId)
      if (prev.length >= JUNGLE_SQUAD_SIZE) return prev
      return [...prev, instanceId]
    })
  }

  const selectedCats = owned.filter(c => selected.includes(c.instanceId))

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-black text-emerald-400 mb-1">Select Your Squad</h2>
        <p className="text-slate-400 text-sm">Choose {JUNGLE_SQUAD_SIZE} cats to brave the jungle</p>
      </div>

      {/* Selected cats preview */}
      <div className="flex justify-center gap-4 py-3">
        {Array.from({ length: JUNGLE_SQUAD_SIZE }).map((_, i) => {
          const cat = selectedCats[i]
          return (
            <div
              key={i}
              className={`w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${cat
                ? 'border-emerald-500 bg-emerald-900/30'
                : 'border-slate-700 border-dashed bg-slate-800/30'
              }`}
            >
              {cat ? (
                <>
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 object-contain rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center text-xl">🐱</div>
                  )}
                  <span className="text-[10px] font-bold text-slate-300 truncate w-full text-center px-1 mt-1">{cat.name}</span>
                </>
              ) : (
                <span className="text-slate-600 text-2xl">+</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected cat stats */}
      {selectedCats.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4">
          {selectedCats.map(cat => (
            <div key={cat.instanceId} className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/50">
              <div className="text-xs font-bold text-slate-300 truncate">{cat.name}</div>
              <div className="flex justify-center gap-3 mt-1">
                <span className="text-[10px] text-red-400 font-bold">HP {cat.currentHp}/{cat.maxHp}</span>
                <span className="text-[10px] text-amber-400 font-bold">ATK {cat.currentAttack}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cat grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar p-1">
        {owned.map(cat => {
          const isSelected = selected.includes(cat.instanceId)
          const isDisabled = !isSelected && selected.length >= JUNGLE_SQUAD_SIZE
          const isKO = cat.currentHp <= 0
          return (
            <motion.button
              key={cat.instanceId}
              onClick={() => !isKO && toggleCat(cat.instanceId)}
              disabled={isDisabled || isKO}
              className={`relative rounded-xl p-2 border-2 transition-all text-left ${
                isKO
                  ? 'border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed'
                  : isSelected
                    ? 'border-emerald-500 bg-emerald-900/30 shadow-neon'
                    : isDisabled
                      ? 'border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-800/50 hover:border-emerald-700'
              }`}
              whileHover={!isDisabled && !isKO ? { scale: 1.02 } : {}}
              whileTap={!isDisabled && !isKO ? { scale: 0.98 } : {}}
            >
              {cat.imageUrl ? (
                <img src={cat.imageUrl} alt={cat.name} className="w-full aspect-square object-contain rounded-lg mb-1" />
              ) : (
                <div className="w-full aspect-square bg-slate-700 rounded-lg mb-1 flex items-center justify-center text-2xl">🐱</div>
              )}
              <div className="text-xs font-bold text-slate-200 truncate">{cat.name}</div>
              <div className="text-[10px] text-slate-500">Lv.{cat.level}</div>
              {isKO && <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-red-400 bg-slate-900/80 px-2 py-1 rounded">KO</span></div>}
              {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">&#10003;</span>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center pt-2">
        <motion.button
          onClick={onCancel}
          className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-700 hover:border-slate-500 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancel
        </motion.button>
        <motion.button
          onClick={() => {
            if (selected.length === JUNGLE_SQUAD_SIZE) {
              onConfirm(selected as [string, string, string])
            }
          }}
          disabled={selected.length !== JUNGLE_SQUAD_SIZE}
          className={`px-6 py-3 font-bold rounded-xl shadow-lg transition-all ${
            selected.length === JUNGLE_SQUAD_SIZE
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-neon'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          whileHover={selected.length === JUNGLE_SQUAD_SIZE ? { scale: 1.05 } : {}}
          whileTap={selected.length === JUNGLE_SQUAD_SIZE ? { scale: 0.95 } : {}}
        >
          Begin Run ({selected.length}/{JUNGLE_SQUAD_SIZE})
        </motion.button>
      </div>
    </div>
  )
}

// ===== Main View =====

export default function JungleRunView() {
  const jungleRun = useGame(s => s.jungleRun)
  const junglePassUnlocked = useGame(s => s.junglePassUnlocked)
  const jungleStats = useGame(s => s.jungleStats)
  const owned = useGame(s => s.owned)
  const startJungleRun = useGame(s => s.startJungleRun)
  const selectJungleSquad = useGame(s => s.selectJungleSquad)
  const completeJungleStage = useGame(s => s.completeJungleStage)
  const selectJungleBoon = useGame(s => s.selectJungleBoon)
  const advanceJungleStage = useGame(s => s.advanceJungleStage)
  const abandonJungleRun = useGame(s => s.abandonJungleRun)
  const finishJungleRun = useGame(s => s.finishJungleRun)
  const markJungleTabVisited = useGame(s => s.markJungleTabVisited)
  const soundEnabled = useGame(s => s.soundEnabled)

  const [showBossIntro, setShowBossIntro] = useState(false)
  const [healingCountdown, setHealingCountdown] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)

  // Mark tab as visited
  useEffect(() => {
    markJungleTabVisited()
  }, [markJungleTabVisited])

  // Auto-advance from healing spring after 2 seconds
  useEffect(() => {
    if (jungleRun?.phase !== 'healing_spring') {
      setHealingCountdown(false)
      return
    }
    setHealingCountdown(true)
    const timer = setTimeout(() => {
      advanceJungleStage()
      setHealingCountdown(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [jungleRun?.phase, advanceJungleStage])

  // Auto-advance from stage_cleared
  useEffect(() => {
    if (jungleRun?.phase !== 'stage_cleared') return
    const timer = setTimeout(() => {
      advanceJungleStage()
    }, 1500)
    return () => clearTimeout(timer)
  }, [jungleRun?.phase, advanceJungleStage])

  const handleStartRun = useCallback(() => {
    startJungleRun()
    trackJungleRunStart(JUNGLE_SQUAD_SIZE)
  }, [startJungleRun])

  const handleSquadConfirm = useCallback((ids: [string, string, string]) => {
    selectJungleSquad(ids)
  }, [selectJungleSquad])

  const handleSquadCancel = useCallback(() => {
    abandonJungleRun()
  }, [abandonJungleRun])

  const handleBoonSelect = useCallback((boonId: string) => {
    const boon = getBoonById(boonId)
    if (boon) {
      trackJungleBoonSelected(boon.name, boon.rarity)
    }
    selectJungleBoon(boonId)
  }, [selectJungleBoon])

  const handleFinishRun = useCallback(() => {
    if (jungleRun) {
      const score = calculateScore(jungleRun)
      if (jungleRun.phase === 'run_complete') {
        trackJungleRunComplete(score.totalScore, score.stagesCleared)
      } else {
        trackJungleRunFailed(jungleRun.currentStage, score.totalScore)
      }
    }
    finishJungleRun()
  }, [jungleRun, finishJungleRun])

  const boonEffects = useMemo(() => {
    if (!jungleRun) return null
    return calculateBoonEffects(jungleRun.activeBoons)
  }, [jungleRun?.activeBoons])

  const phase = jungleRun?.phase ?? 'idle'

  // ===== LOCKED STATE =====
  if (!junglePassUnlocked) {
    return (
      <JungleBackground intensity="low">
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-black text-emerald-400 mb-2">Jungle of Talons</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Lead your squad through 20 stages of bird combat. Collect boons, defeat bosses,
              and climb the leaderboard in this roguelite jungle adventure.
            </p>
          </motion.div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-emerald-900/40 space-y-3 text-left">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Expansion Features</h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#9679;</span> 20-stage roguelite runs with persistent progression</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#9679;</span> 10 unique bird enemies with special abilities</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#9679;</span> 12 collectible boons (Common, Rare, Legendary)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#9679;</span> 2 epic boss battles: Talon Queen &amp; Apex Raptor</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#9679;</span> Dedicated jungle leaderboard</li>
            </ul>
          </div>

          <motion.button
            onClick={() => trackJunglePurchaseStart()}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow-neon text-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Unlock Expansion
          </motion.button>

          {/* Dev tools — preview/dev builds only */}
          {import.meta.env.DEV && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => useGame.getState().unlockJunglePass()}
                className="px-4 py-2 text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg hover:text-slate-300 hover:border-slate-500 transition-colors"
              >
                [DEV] Unlock without payment
              </button>
              <button
                onClick={() => useGame.getState().addCoins(5000)}
                className="px-4 py-2 text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg hover:text-slate-300 hover:border-slate-500 transition-colors"
              >
                [DEV] +5000 coins
              </button>
            </div>
          )}
        </div>
      </JungleBackground>
    )
  }

  // ===== NO ACTIVE RUN =====
  if (!jungleRun || phase === 'idle') {
    return (
      <JungleBackground intensity="low">
        <div className="max-w-2xl mx-auto py-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-black text-emerald-400 mb-1">Jungle of Talons</h1>
            <p className="text-slate-400 text-sm">Brave the jungle. Conquer the birds. Claim glory.</p>
          </div>

          <JungleStatsSummary stats={jungleStats} />

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              onClick={handleStartRun}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow-neon text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start New Run
            </motion.button>
          </div>

          <LeaderboardPreview />
        </div>
      </JungleBackground>
    )
  }

  // ===== SQUAD SELECT =====
  if (phase === 'squad_select') {
    return (
      <JungleBackground intensity="low">
        <div className="max-w-3xl mx-auto py-6">
          <SquadSelector
            owned={owned.filter(c => c.currentHp > 0)}
            onConfirm={handleSquadConfirm}
            onCancel={handleSquadCancel}
          />
        </div>
      </JungleBackground>
    )
  }

  // ===== ACTIVE RUN STATES =====
  const currentStage = jungleRun.currentStage
  const stageName = STAGE_NAMES[currentStage] ?? `Stage ${currentStage}`

  return (
    <JungleBackground intensity={phase === 'in_battle' ? 'high' : 'medium'}>
      <div className="max-w-3xl mx-auto py-4 space-y-4">
        {/* Stage Progress Bar - always visible */}
        <StageProgressBar currentStage={currentStage} totalStages={JUNGLE_TOTAL_STAGES} />

        {/* Active Boons */}
        <ActiveBoonsPanel activeBoons={jungleRun.activeBoons} />

        {/* Abandon button */}
        {phase !== 'run_complete' && phase !== 'run_failed' && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAbandonConfirm(true)}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors underline"
            >
              Abandon Run
            </button>
          </div>
        )}

        {/* PRE-BATTLE */}
        {phase === 'pre_battle' && (
          <motion.div
            key={`pre-battle-${currentStage}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 py-8"
          >
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Stage {currentStage}</div>
              <h2 className="text-2xl font-black text-emerald-300">{stageName}</h2>
              {isBossStage(currentStage) && (
                <div className="mt-2 inline-block px-3 py-1 bg-red-900/50 border border-red-700/50 rounded-full">
                  <span className="text-xs font-black text-red-400 uppercase tracking-wider">Boss Stage</span>
                </div>
              )}
            </div>

            {/* Squad status */}
            <div className="flex justify-center gap-4">
              {jungleRun.squad.map(cat => (
                <div
                  key={cat.instanceId}
                  className={`bg-slate-800/60 rounded-xl p-3 border w-24 text-center ${
                    cat.knockedOut ? 'border-red-800/50 opacity-50' : 'border-emerald-900/40'
                  }`}
                >
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-14 h-14 mx-auto object-contain rounded-lg mb-1" />
                  ) : (
                    <div className="w-14 h-14 mx-auto bg-slate-700 rounded-lg mb-1 flex items-center justify-center text-xl">🐱</div>
                  )}
                  <div className="text-[10px] font-bold text-slate-300 truncate">{cat.name}</div>
                  <div className="mt-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cat.knockedOut ? 'bg-red-700' : 'bg-emerald-500'}`}
                      style={{ width: `${cat.knockedOut ? 0 : (cat.currentHp / cat.maxHp) * 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {cat.knockedOut ? 'KO' : `${cat.currentHp}/${cat.maxHp}`}
                  </div>
                </div>
              ))}
            </div>

            <motion.button
              onClick={() => {
                if (isBossStage(currentStage)) {
                  setShowBossIntro(true)
                } else {
                  useGame.getState().advanceJungleStage()
                }
              }}
              className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow-neon text-xl"
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(34, 197, 94, 0.6)' }}
              whileTap={{ scale: 0.95 }}
            >
              Fight!
            </motion.button>
          </motion.div>
        )}

        {/* IN-BATTLE */}
        {phase === 'in_battle' && (
          <div className="py-4">
            <div className="text-center bg-slate-800/60 rounded-xl p-8 border border-emerald-900/40">
              <div className="text-4xl mb-4 animate-pulse">&#9876;&#65039;</div>
              <h2 className="text-xl font-black text-emerald-400 mb-2">Battle in Progress</h2>
              <p className="text-slate-400 text-sm">Stage {currentStage}: {stageName}</p>
              <p className="text-slate-500 text-xs mt-2">The JungleBattle component renders here when implemented.</p>
            </div>
          </div>
        )}

        {/* BOON SELECT */}
        {phase === 'boon_select' && jungleRun.currentBoonOffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-emerald-400 mb-1">Choose a Boon</h2>
              <p className="text-slate-400 text-sm">Select a power-up for your squad</p>
              {jungleRun.currentBoonOffering.wasGuaranteedRare && (
                <div className="mt-2 text-xs text-purple-400 font-bold">Pity timer activated! Guaranteed Rare+</div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {jungleRun.currentBoonOffering.boons.map(boon => {
                const rarityBorder = boon.rarity === 'Legendary' ? 'border-amber-500/60 shadow-glow-gold' : boon.rarity === 'Rare' ? 'border-purple-500/60 shadow-glow-purple' : 'border-slate-600'
                const rarityBg = boon.rarity === 'Legendary' ? 'from-amber-900/30 to-slate-900' : boon.rarity === 'Rare' ? 'from-purple-900/30 to-slate-900' : 'from-slate-800 to-slate-900'
                const rarityText = boon.rarity === 'Legendary' ? 'text-amber-400' : boon.rarity === 'Rare' ? 'text-purple-400' : 'text-slate-400'
                return (
                  <motion.button
                    key={boon.id}
                    onClick={() => handleBoonSelect(boon.id)}
                    className={`bg-gradient-to-b ${rarityBg} rounded-xl p-4 border-2 ${rarityBorder} text-left hover:brightness-110 transition-all`}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {boon.iconUrl && (
                      <div className="flex justify-center mb-2">
                        <img src={boon.iconUrl} alt={boon.name} className="w-14 h-14 object-cover rounded-xl border-2 border-slate-600/50" />
                      </div>
                    )}
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${rarityText} mb-1`}>{boon.rarity}</div>
                    <div className="text-lg font-black text-white mb-2">{boon.name}</div>
                    <div className="text-xs text-slate-400 leading-relaxed">{boon.description}</div>
                    <div className="text-[10px] text-slate-600 mt-2">Max stacks: {boon.maxStacks}</div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* HEALING SPRING */}
        {phase === 'healing_spring' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-4"
            onClick={() => { advanceJungleStage(); setHealingCountdown(false) }}
          >
            <motion.div
              animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-block"
            >
              <img
                src="/images/jungle/Healing Spring.png"
                alt="Healing Spring"
                className="w-32 h-32 object-contain mx-auto rounded-2xl drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              />
            </motion.div>
            <h2 className="text-2xl font-black text-cyan-400">Healing Spring</h2>
            <p className="text-slate-400 text-sm">Your squad rests and recovers 15% max HP</p>
            <div className="flex justify-center gap-4 mt-4">
              {jungleRun.squad.map(cat => (
                <div key={cat.instanceId} className="text-center">
                  <div className="text-xs font-bold text-slate-300">{cat.name}</div>
                  <motion.div
                    className="text-sm font-black text-cyan-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {cat.knockedOut ? 'KO' : `+${Math.floor(cat.maxHp * 0.15)} HP`}
                  </motion.div>
                </div>
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-4">Tap to continue</p>
          </motion.div>
        )}

        {/* STAGE CLEARED */}
        {phase === 'stage_cleared' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              className="text-5xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              &#127942;
            </motion.div>
            <h2 className="text-2xl font-black text-emerald-400">Stage {currentStage - 1} Cleared!</h2>
            <p className="text-slate-400 text-sm mt-2">Advancing to next stage...</p>
          </motion.div>
        )}

        {/* RUN COMPLETE (Victory) */}
        {phase === 'run_complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-6"
          >
            <motion.div
              className="text-7xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              &#127775;
            </motion.div>
            <h2 className="text-3xl font-black text-emerald-400">Jungle Conquered!</h2>
            <p className="text-slate-300">You conquered all {JUNGLE_TOTAL_STAGES} stages!</p>

            {/* Score breakdown */}
            {(() => {
              const score = calculateScore(jungleRun)
              return (
                <div className="bg-slate-800/60 rounded-xl p-4 border border-emerald-900/40 max-w-md mx-auto space-y-2 text-left">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Stages cleared</span><span className="text-emerald-300 font-bold">{score.stagesCleared}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Stage score</span><span className="text-slate-300 font-bold">{score.stageScore}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Speed bonus</span><span className="text-slate-300 font-bold">{score.speedBonus}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">HP remaining</span><span className="text-slate-300 font-bold">{score.hpRemainingScore}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Boss kills</span><span className="text-slate-300 font-bold">{score.bossKillScore}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">All cats alive</span><span className="text-slate-300 font-bold">{score.allCatsAliveBonus}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Boon efficiency</span><span className="text-slate-300 font-bold">{score.boonEfficiencyScore}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Flawless stages</span><span className="text-slate-300 font-bold">{score.flawlessStageScore}</span></div>
                  <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-lg"><span className="text-emerald-400 font-black">Total Score</span><span className="text-emerald-300 font-black">{score.totalScore}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-amber-400 font-bold">Coins earned</span><span className="text-amber-300 font-black">{score.coinsEarned} &#x1FA99;</span></div>
                </div>
              )
            })()}

            <motion.button
              onClick={handleFinishRun}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow-neon text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Claim Rewards
            </motion.button>
          </motion.div>
        )}

        {/* RUN FAILED (Defeat) */}
        {phase === 'run_failed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-6"
          >
            <motion.div
              className="text-7xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              &#128128;
            </motion.div>
            <h2 className="text-3xl font-black text-red-400">Run Failed</h2>
            <p className="text-slate-400">Your squad was defeated at Stage {currentStage}</p>

            {/* Score breakdown */}
            {(() => {
              const score = calculateScore(jungleRun)
              return (
                <div className="bg-slate-800/60 rounded-xl p-4 border border-red-900/40 max-w-md mx-auto space-y-2 text-left">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Stages cleared</span><span className="text-slate-300 font-bold">{score.stagesCleared}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Score</span><span className="text-slate-300 font-bold">{score.totalScore}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-amber-400 font-bold">Coins earned</span><span className="text-amber-300 font-black">{score.coinsEarned} &#x1FA99;</span></div>
                </div>
              )
            })()}

            <motion.button
              onClick={handleFinishRun}
              className="px-8 py-4 bg-gradient-to-r from-red-700 to-red-600 text-white font-black rounded-xl shadow-lg text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Return to Camp
            </motion.button>
          </motion.div>
        )}

        {/* Boss Intro Modal */}
        <Modal isOpen={showBossIntro} onClose={() => setShowBossIntro(false)} title="Boss Encounter" size="sm">
          <div className="text-center py-4 space-y-4">
            <motion.div
              className="text-6xl"
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {currentStage === 10 ? '🦅' : '🦖'}
            </motion.div>
            <h3 className="text-2xl font-black text-red-400">
              {currentStage === 10 ? 'Talon Queen' : 'Apex Raptor'}
            </h3>
            <p className="text-slate-400 text-sm">
              {currentStage === 10
                ? 'The queen of the canopy guards the path ahead. She can revive once when defeated!'
                : 'The ultimate predator of the jungle. Below 30% HP, it enters Apex Fury - attacking with devastating power!'
              }
            </p>
            <motion.button
              onClick={() => {
                setShowBossIntro(false)
                useGame.getState().advanceJungleStage()
              }}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black rounded-xl shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Challenge Boss!
            </motion.button>
          </div>
        </Modal>

        {/* Abandon Confirm Modal */}
        <Modal isOpen={showAbandonConfirm} onClose={() => setShowAbandonConfirm(false)} title="Abandon Run?" size="sm">
          <div className="text-center py-4 space-y-4">
            <p className="text-slate-300 text-sm">
              Are you sure you want to abandon this run? Your progress will be saved and scored based on stages cleared so far.
            </p>
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={() => setShowAbandonConfirm(false)}
                className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Keep Going
              </motion.button>
              <motion.button
                onClick={() => {
                  setShowAbandonConfirm(false)
                  finishJungleRun()
                }}
                className="px-6 py-3 bg-red-700 text-white font-bold rounded-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Abandon
              </motion.button>
            </div>
          </div>
        </Modal>
      </div>
    </JungleBackground>
  )
}
