
import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { BAITS } from '../game/data'
import BaitingArea from './views/BaitingArea'
import Collection from './views/Collection'
import BattleArena from './views/BattleArena'
import AnimatedBackground from './components/AnimatedBackground'
import Modal from './components/Modal'
import ProfileSelector from './components/ProfileSelector'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants } from './animations'

function DailyRewardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Reward" size="sm">
      <div className="text-center py-6">
        <div className="text-6xl mb-4 animate-bounce">🪙</div>
        <h3 className="text-2xl font-bold text-matrix-400 mb-2">+100 Coins!</h3>
        <p className="text-gray-300 mb-6">
          Come back tomorrow for another reward!
        </p>
        <motion.button
          onClick={onClose}
          className="px-6 py-3 bg-matrix-500 text-cyber-black-500 font-bold rounded-lg shadow-neon"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Claim Reward
        </motion.button>
      </div>
    </Modal>
  )
}

function AchievementsButton() {
  const [showAchievements, setShowAchievements] = useState(false)
  const achievements = useGame(s => s.achievements)
  const claimAchievement = useGame(s => s.claimAchievement)
  const unclaimedCount = achievements.filter(a => a.unlocked && !a.claimed).length

  return (
    <>
      <motion.button
        onClick={() => setShowAchievements(true)}
        className="px-6 py-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gold-500/30 shadow-glow-gold relative group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity rounded-xl" />
        <div className="relative flex items-center gap-2">
          <span className="text-2xl drop-shadow-md">🏆</span>
          <span className="font-black text-gold-100 tracking-wide drop-shadow-md">
            Achievements
          </span>
        </div>
        {unclaimedCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-white/20">
            {unclaimedCount}
          </span>
        )}
      </motion.button>

      <Modal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        title="🏆 Achievements"
        size="md"
      >
        <div className="grid gap-4 pr-2">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`p-5 rounded-xl border ${ach.unlocked
                ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-gold-500/50 shadow-glow-gold'
                : 'bg-slate-900/50 border-slate-700 opacity-70 grayscale'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{ach.unlocked ? '🌟' : '🔒'}</span>
                    <h4 className={`font-black text-lg ${ach.unlocked ? 'text-gold-400' : 'text-slate-400'}`}>
                      {ach.name}
                    </h4>
                  </div>
                  <p className="text-slate-400 text-sm mb-3 leading-relaxed">{ach.description}</p>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                    <motion.div
                      className={`absolute top-0 left-0 h-full ${ach.unlocked ? 'bg-gradient-to-r from-gold-400 to-gold-600' : 'bg-slate-600'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</span>
                    <span className={`text-xs font-bold ${ach.unlocked ? 'text-gold-400' : 'text-slate-500'}`}>
                      {ach.progress} / {ach.maxProgress}
                    </span>
                  </div>
                </div>
                {ach.unlocked && !ach.claimed && (
                  <button
                    onClick={() => claimAchievement(ach.id)}
                    className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-bold rounded-lg shadow-glow-gold hover:shadow-premium-lg transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    Claim 100 💰
                  </button>
                )}
                {ach.claimed && (
                  <div className="px-4 py-2 bg-slate-700/50 text-slate-400 font-bold rounded-lg whitespace-nowrap">
                    Claimed ✓
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}

export default function App() {
  const view = useGame(s => s.view)
  const setView = useGame(s => s.setView)
  const coins = useGame(s => s.coins)
  const load = useGame(s => s.load)
  const claimDailyReward = useGame(s => s.claimDailyReward)
  const stats = useGame(s => s.stats)
  const getCurrentProfile = useGame(s => s.getCurrentProfile)
  const getProfiles = useGame(s => s.getProfiles)

  const [showDailyReward, setShowDailyReward] = useState(false)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Check for profiles on mount
  useEffect(() => {
    const profiles = getProfiles()
    const currentProfile = getCurrentProfile()

    if (profiles.length === 0 || !currentProfile) {
      setShowProfileSelector(true)
    } else {
      load()
      setProfileLoaded(true)
      // Check for daily reward
      const canClaim = claimDailyReward()
      if (canClaim) {
        setTimeout(() => setShowDailyReward(true), 1000)
      }
    }
  }, [])

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg" />

      <div className="min-h-screen relative z-10 text-slate-100 font-sans overflow-x-hidden">
        {/* Premium Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/60 border-b border-slate-700/50 shadow-premium">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-gold-900/10 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 py-5 relative">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-6">
              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-glow-gold">
                  <span className="text-2xl">⚔️</span>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent font-heading">
                    WHISKER WARS
                  </h1>
                  <p className="text-xs text-slate-400 tracking-widest uppercase">Elite Cat Combat</p>
                </div>
              </motion.div>

              <div className="flex items-center gap-4">
                {profileLoaded && (
                  <motion.button
                    onClick={() => setShowProfileSelector(true)}
                    className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      <span className="text-sm font-bold text-purple-300">
                        {getCurrentProfile()?.name}
                      </span>
                    </div>
                  </motion.button>
                )}
                <motion.div
                  className="px-6 py-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gold-500/30 shadow-glow-gold relative overflow-hidden group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
                  <div className="relative flex items-center gap-2">
                    <span className="text-2xl drop-shadow-md">🪙</span>
                    <span className="text-2xl font-black text-gold-100 drop-shadow-md tracking-wide">
                      {coins}
                    </span>
                  </div>
                </motion.div>
                <AchievementsButton />
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-3 mb-4">
              {[
                { id: 'bait', label: 'Baiting Area', icon: '🎣', gradient: 'from-blue-500 to-cyan-500' },
                { id: 'collection', label: 'Collection', icon: '📚', gradient: 'from-purple-500 to-pink-500' },
                { id: 'battle', label: 'Battle Arena', icon: '⚔️', gradient: 'from-red-500 to-orange-500' },
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  onClick={() => setView(tab.id as any)}
                  className={`relative px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all overflow-hidden group ${view === tab.id
                    ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-premium-lg scale-105'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {view === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <span className="text-lg">{tab.icon}</span>
                    {tab.label}
                  </span>
                </motion.button>
              ))}
            </nav>

            {/* Stats Bar */}
            <div className="flex gap-6 text-sm">
              {[
                { label: 'Battles', value: `${stats.totalWins}/${stats.totalBattles}`, icon: '⚔️' },
                { label: 'Cats', value: stats.totalCatsCollected, icon: '🐱' },
                { label: 'Coins Earned', value: stats.totalCoinsEarned, icon: '💰' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/30 border border-slate-700/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span>{stat.icon}</span>
                  <span className="text-slate-400">{stat.label}:</span>
                  <span className="font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
            >
              {view === 'bait' && <BaitingArea baits={BAITS} />}
              {view === 'collection' && <Collection />}
              {view === 'battle' && <BattleArena />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Premium Footer */}
        <footer className="max-w-7xl mx-auto px-6 py-8 mt-12 border-t border-slate-800/50">
          <div className="text-center">
            <div className="inline-block px-6 py-3 rounded-xl bg-premium-gradient border border-slate-700/50 shadow-premium mb-3">
              <p className="text-slate-300 text-sm">
                <span className="font-black bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent font-heading text-lg">
                  WHISKER WARS
                </span>
                <span className="mx-2 text-slate-600">•</span>
                <span className="text-slate-400">Elite Cat Combat Simulator</span>
              </p>
            </div>
            <p className="text-xs text-slate-500">Progress auto-saves • Built with ⚡ by AI</p>
          </div>
        </footer>
      </div>

      <DailyRewardModal
        isOpen={showDailyReward}
        onClose={() => setShowDailyReward(false)}
      />

      {showProfileSelector && (
        <ProfileSelector
          onProfileSelected={() => {
            setShowProfileSelector(false)
            setProfileLoaded(true)
            load()
            const canClaim = claimDailyReward()
            if (canClaim) {
              setTimeout(() => setShowDailyReward(true), 1000)
            }
          }}
        />
      )}
    </>
  )
}
