import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../game/store'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { fetchLeaderboard, LEADERBOARD_CATEGORIES, type LeaderboardEntry, type LeaderboardCategory } from '../../utils/leaderboard'

export default function StatsView() {
  const stats = useGame(s => s.stats)
  const owned = useGame(s => s.owned)
  const coins = useGame(s => s.coins)
  const dogIndex = useGame(s => s.dogIndex)
  const difficultyLevel = useGame(s => s.difficultyLevel)
  const achievements = useGame(s => s.achievements)
  const getCurrentProfile = useGame(s => s.getCurrentProfile)

  const [tab, setTab] = useState<'stats' | 'leaderboard'>('stats')
  const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('totalWins')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const profile = getCurrentProfile()

  const loadLeaderboard = useCallback(async (category: LeaderboardCategory) => {
    setLeaderboardLoading(true)
    const entries = await fetchLeaderboard(category, 50)
    setLeaderboardData(entries)
    setLeaderboardLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'leaderboard') {
      loadLeaderboard(leaderboardCategory)
    }
  }, [tab, leaderboardCategory, loadLeaderboard])

  // Calculate derived stats
  const winRate = useMemo(() => {
    if (stats.totalBattles === 0) return 0
    return Math.round((stats.totalWins / stats.totalBattles) * 100)
  }, [stats.totalBattles, stats.totalWins])

  const uniqueCatsCollected = useMemo(() => {
    const uniqueIds = new Set(owned.map(cat => cat.id))
    return uniqueIds.size
  }, [owned])

  const totalCats = useMemo(() => owned.length, [owned])

  const averageCatLevel = useMemo(() => {
    if (owned.length === 0) return 0
    const total = owned.reduce((sum, cat) => sum + cat.level, 0)
    return (total / owned.length).toFixed(1)
  }, [owned])

  const highestLevelCat = useMemo(() => {
    if (owned.length === 0) return null
    return owned.reduce((max, cat) => cat.level > max.level ? cat : max, owned[0])
  }, [owned])

  const achievementsUnlocked = useMemo(() => {
    return achievements.filter(a => a.unlocked).length
  }, [achievements])

  const achievementsClaimed = useMemo(() => {
    return achievements.filter(a => a.claimed).length
  }, [achievements])

  const rarityBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      'Common': 0,
      'Uncommon': 0,
      'Rare': 0,
      'Epic': 0,
      'Legendary': 0,
      'Mythical': 0
    }
    owned.forEach(cat => {
      breakdown[cat.rarity] = (breakdown[cat.rarity] || 0) + 1
    })
    return breakdown
  }, [owned])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'text-slate-400'
      case 'Uncommon': return 'text-green-400'
      case 'Rare': return 'text-blue-400'
      case 'Epic': return 'text-purple-400'
      case 'Legendary': return 'text-orange-400'
      case 'Mythical': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  // Find current player's rank in leaderboard
  const myRank = useMemo(() => {
    if (!profile?.cloudCode) return null
    const idx = leaderboardData.findIndex(e => e.cloudCode === profile.cloudCode)
    return idx >= 0 ? idx + 1 : null
  }, [leaderboardData, profile])

  const categoryMeta = LEADERBOARD_CATEGORIES.find(c => c.key === leaderboardCategory)!

  const StatCard = ({ icon, label, value, subtitle }: { icon: string, label: string, value: string | number, subtitle?: string }) => (
    <motion.div
      className="premium-card p-4 rounded-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center gap-3">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
          <p className="text-2xl font-black text-gold-400">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500 mb-2 font-heading drop-shadow-glow">
            Stats Dashboard
          </h1>
          <p className="text-slate-400 text-lg">Track your progress and achievements</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('stats')}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              tab === 'stats'
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            My Stats
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              tab === 'leaderboard'
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Leaderboards
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'stats' ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Instruction Banner */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/60 to-teal-500/60 border border-emerald-500/50 mb-6"
              >
                <p className="text-white text-center font-semibold">
                  <span className="text-lg mr-2">📊</span>
                  Track your legendary journey through the realm of Whisker Wars - view your battle record, collection progress, and achievements!
                </p>
              </motion.div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <StatCard
                  icon="⚔️"
                  label="Total Battles"
                  value={stats.totalBattles}
                  subtitle={`${stats.totalWins}W / ${stats.totalLosses}L`}
                />
                <StatCard
                  icon="🏆"
                  label="Win Rate"
                  value={`${winRate}%`}
                />
                <StatCard
                  icon="🐱"
                  label="Cats Collected"
                  value={totalCats}
                  subtitle={`${uniqueCatsCollected}/40 unique`}
                />
                <StatCard
                  icon="🪙"
                  label="Current Coins"
                  value={coins}
                />
                <StatCard
                  icon="💰"
                  label="Lifetime Coins"
                  value={stats.totalCoinsEarned}
                />
                <StatCard
                  icon="🎯"
                  label="Progress"
                  value={`Dog ${dogIndex + 1}`}
                  subtitle={difficultyLevel > 0 ? `Difficulty Level ${difficultyLevel + 1}` : 'First Playthrough'}
                />
              </div>

              {/* Collection Stats */}
              <div className="premium-card p-6 rounded-xl mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 font-heading">
                  <span className="text-3xl">📊</span> Collection Statistics
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rarity Breakdown */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-300 mb-3">Rarity Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(rarityBreakdown).map(([rarity, count]) => (
                        <div key={rarity} className="flex items-center justify-between">
                          <span className={`font-semibold ${getRarityColor(rarity)}`}>{rarity}</span>
                          <span className="text-slate-400 font-mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collection Metrics */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-300 mb-3">Collection Metrics</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-400">Average Cat Level</p>
                        <p className="text-xl font-bold text-gold-400">{averageCatLevel}</p>
                      </div>
                      {highestLevelCat && (
                        <div>
                          <p className="text-sm text-slate-400">Highest Level Cat</p>
                          <p className="text-lg font-bold text-gold-400">{highestLevelCat.name}</p>
                          <p className="text-sm text-slate-500">Level {highestLevelCat.level}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-400">Collection Completion</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-gold-500 to-amber-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(uniqueCatsCollected / 40) * 100}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gold-400">{Math.round((uniqueCatsCollected / 40) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements Progress */}
              <div className="premium-card p-6 rounded-xl">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 font-heading">
                  <span className="text-3xl">🏅</span> Achievements
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-900/80 rounded-lg">
                    <p className="text-3xl font-black text-gold-400">{achievementsUnlocked}</p>
                    <p className="text-sm text-slate-400 mt-1">Unlocked</p>
                  </div>
                  <div className="text-center p-4 bg-slate-900/80 rounded-lg">
                    <p className="text-3xl font-black text-emerald-400">{achievementsClaimed}</p>
                    <p className="text-sm text-slate-400 mt-1">Claimed</p>
                  </div>
                  <div className="text-center p-4 bg-slate-900/80 rounded-lg">
                    <p className="text-3xl font-black text-purple-400">{achievements.length}</p>
                    <p className="text-sm text-slate-400 mt-1">Total Available</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Cloud code requirement notice */}
              {!profile?.cloudCode && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/60 to-orange-500/60 border border-amber-500/50 mb-6">
                  <p className="text-white text-center font-semibold">
                    <span className="text-lg mr-2">☁️</span>
                    Enable Cloud Save in your profile to appear on the leaderboard!
                  </p>
                </div>
              )}

              {/* Category Selector */}
              <div className="flex flex-wrap gap-2 mb-6">
                {LEADERBOARD_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setLeaderboardCategory(cat.key)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${
                      leaderboardCategory === cat.key
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>

              {/* My Rank */}
              {myRank !== null && (
                <div className="premium-card p-4 rounded-xl mb-6 border border-gold-500/30">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">🥇</div>
                    <div>
                      <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Your Rank</p>
                      <p className="text-3xl font-black text-gold-400">#{myRank}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard Table */}
              <div className="premium-card rounded-xl overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">{categoryMeta.icon}</span> {categoryMeta.label} Leaderboard
                  </h2>
                </div>

                {leaderboardLoading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-slate-400">Loading leaderboard...</p>
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-4xl mb-3">🏆</p>
                    <p className="text-slate-400 text-lg">No entries yet. Be the first!</p>
                    <p className="text-slate-500 text-sm mt-1">Enable Cloud Save to submit your scores</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {leaderboardData.map((entry, idx) => {
                      const rank = idx + 1
                      const isMe = profile?.cloudCode === entry.cloudCode
                      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                      return (
                        <motion.div
                          key={entry.cloudCode}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className={`flex items-center gap-4 px-4 py-3 ${
                            isMe ? 'bg-gold-500/10 border-l-4 border-gold-500' : ''
                          }`}
                        >
                          <div className="w-10 text-center">
                            {medal ? (
                              <span className="text-2xl">{medal}</span>
                            ) : (
                              <span className="text-lg font-bold text-slate-500">#{rank}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate ${isMe ? 'text-gold-400' : 'text-white'}`}>
                              {entry.name}
                              {isMe && <span className="text-xs ml-2 text-gold-400/70">(You)</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-gold-400">
                              {categoryMeta.format(entry[leaderboardCategory])}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  )
}
