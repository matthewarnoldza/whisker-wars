
import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { BAITS } from '../game/data'
import BaitingArea from './views/BaitingArea'
import Collection from './views/Collection'
import BattleArena from './views/BattleArena'
import StatsView from './views/StatsView'
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
        className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-gold-500/30 shadow-glow-gold relative group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
        <div className="relative flex items-center gap-1.5">
          <span className="text-lg drop-shadow-md">🏆</span>
          <span className="hidden xl:inline font-bold text-gold-100 tracking-wide drop-shadow-md text-xs">
            Achievements
          </span>
        </div>
        {unclaimedCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg border border-white/20">
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
        {/* Premium Header with Background */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 shadow-premium overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src="/images/header/WW header.png"
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/90" />
          </div>

          <div className="max-w-7xl mx-auto px-4 py-3 relative">
            {/* Single Compact Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Left: Logo + Title + Navigation */}
              <div className="flex items-center gap-6">
                {/* Logo + Title */}
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <img
                    src="/images/logos/Whisker Wars White.png"
                    alt="Whisker Wars Logo"
                    className="h-10 w-auto drop-shadow-lg"
                  />
                  <div className="hidden sm:block border-l border-slate-600 pl-3">
                    <h1 className="text-lg font-black tracking-tight text-white drop-shadow-lg">
                      WHISKER WARS
                    </h1>
                    <p className="text-[9px] text-slate-400 tracking-widest uppercase leading-none">
                      Elite Cat Combat
                    </p>
                  </div>
                </motion.div>

                {/* Navigation Tabs */}
                <nav className="hidden lg:flex gap-2">
                  {[
                    { id: 'bait', label: 'Bait', icon: '🎣', gradient: 'from-blue-500 to-cyan-500' },
                    { id: 'collection', label: 'Collection', icon: '📚', gradient: 'from-purple-500 to-pink-500' },
                    { id: 'battle', label: 'Battle', icon: '⚔️', gradient: 'from-red-500 to-orange-500' },
                    { id: 'stats', label: 'Stats', icon: '📊', gradient: 'from-emerald-500 to-teal-500' },
                  ].map(tab => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setView(tab.id as any)}
                      className={`relative px-4 py-2 rounded-lg font-bold text-xs tracking-wide transition-all overflow-hidden ${view === tab.id
                        ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {view === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        <span className="text-sm">{tab.icon}</span>
                        <span className="hidden xl:inline">{tab.label}</span>
                      </span>
                    </motion.button>
                  ))}
                </nav>
              </div>

              {/* Right: User Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                {profileLoaded && (
                  <motion.button
                    onClick={() => setShowProfileSelector(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-purple-500/50 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">👤</span>
                      <span className="text-xs font-bold text-purple-300 hidden sm:inline">
                        {getCurrentProfile()?.name}
                      </span>
                    </div>
                  </motion.button>
                )}
                <motion.div
                  className="px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-gold-500/30 shadow-glow-gold relative overflow-hidden group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
                  <div className="relative flex items-center gap-1.5">
                    <span className="text-lg drop-shadow-md">🪙</span>
                    <span className="text-base sm:text-lg font-black text-gold-100 drop-shadow-md tracking-wide">
                      {coins}
                    </span>
                  </div>
                </motion.div>
                <AchievementsButton />
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex lg:hidden gap-1.5 mt-2 pt-2 border-t border-slate-700/50">
              {[
                { id: 'bait', label: 'Bait', icon: '🎣', gradient: 'from-blue-500 to-cyan-500' },
                { id: 'collection', label: 'Collection', icon: '📚', gradient: 'from-purple-500 to-pink-500' },
                { id: 'battle', label: 'Battle', icon: '⚔️', gradient: 'from-red-500 to-orange-500' },
                { id: 'stats', label: 'Stats', icon: '📊', gradient: 'from-emerald-500 to-teal-500' },
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  onClick={() => setView(tab.id as any)}
                  className={`relative flex-1 px-2 py-1.5 rounded-lg font-bold text-xs tracking-wide transition-all overflow-hidden ${view === tab.id
                    ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700'
                    }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative flex items-center justify-center gap-1">
                    <span className="text-sm">{tab.icon}</span>
                    <span className="hidden xs:inline text-[10px]">{tab.label}</span>
                  </span>
                </motion.button>
              ))}
            </nav>
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
              {view === 'stats' && <StatsView />}
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
