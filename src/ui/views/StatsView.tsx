import { motion } from 'framer-motion'
import { useGame } from '../../game/store'
import { useMemo } from 'react'

export default function StatsView() {
  const stats = useGame(s => s.stats)
  const owned = useGame(s => s.owned)
  const coins = useGame(s => s.coins)
  const dogIndex = useGame(s => s.dogIndex)
  const difficultyLevel = useGame(s => s.difficultyLevel)
  const achievements = useGame(s => s.achievements)

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
        <div className="mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500 mb-2 font-heading drop-shadow-glow">
            Stats Dashboard
          </h1>
          <p className="text-slate-400 text-lg">Track your progress and achievements</p>
        </div>

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
          <h2 className="text-2xl font-bold text-gold-400 mb-4 flex items-center gap-2 font-heading">
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
          <h2 className="text-2xl font-bold text-gold-400 mb-4 flex items-center gap-2 font-heading">
            <span className="text-3xl">🏅</span> Achievements
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <p className="text-3xl font-black text-gold-400">{achievementsUnlocked}</p>
              <p className="text-sm text-slate-400 mt-1">Unlocked</p>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <p className="text-3xl font-black text-emerald-400">{achievementsClaimed}</p>
              <p className="text-sm text-slate-400 mt-1">Claimed</p>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <p className="text-3xl font-black text-purple-400">{achievements.length}</p>
              <p className="text-sm text-slate-400 mt-1">Total Available</p>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  )
}
