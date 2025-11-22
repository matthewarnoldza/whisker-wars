
import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { BAITS } from '../game/data'
import type { View } from '../game/store'
import BaitingArea from './views/BaitingArea'
import Collection from './views/Collection'
import BattleArena from './views/BattleArena'
import StatsView from './views/StatsView'
import PrivacyPolicy from './views/PrivacyPolicy'
import TermsOfService from './views/TermsOfService'
import AnimatedBackground from './components/AnimatedBackground'
import Modal from './components/Modal'
import ProfileSelector from './components/ProfileSelector'
import WelcomeTutorialModal from './components/WelcomeTutorialModal'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants } from './animations'

function DailyRewardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Reward" size="sm">
      <div className="text-center py-6">
        <div className="text-6xl mb-4 animate-bounce">🪙</div>
        <h3 className="text-2xl font-bold text-matrix-400 mb-2">+50 Coins!</h3>
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
  const tutorialCompleted = useGame(s => s.tutorialCompleted)
  const completeTutorial = useGame(s => s.completeTutorial)

  const [showDailyReward, setShowDailyReward] = useState(false)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Sync view with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove the #
      if (hash === 'privacy' || hash === 'terms' || hash === 'bait' || hash === 'collection' || hash === 'battle' || hash === 'stats') {
        setView(hash as View)
      }
    }

    // Set initial view from URL
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setView])

  // Update URL when view changes
  useEffect(() => {
    const currentHash = window.location.hash.slice(1)
    if (currentHash !== view) {
      window.location.hash = view
    }
  }, [view])

  // Check for profiles on mount
  useEffect(() => {
    const profiles = getProfiles()
    const currentProfile = getCurrentProfile()

    if (profiles.length === 0 || !currentProfile) {
      setShowProfileSelector(true)
    } else {
      load()
      setProfileLoaded(true)

      // Check if this is a new profile (created within last 10 seconds)
      const isNewProfile = currentProfile && (Date.now() - currentProfile.created) < 10000

      // Check for daily reward
      const canClaim = claimDailyReward()
      if (canClaim) {
        setTimeout(() => setShowDailyReward(true), 1000)
      }

      // Show tutorial for new profiles who haven't completed it
      if (isNewProfile && !tutorialCompleted) {
        setTimeout(() => setShowWelcomeTutorial(true), 500)
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

      <div className="min-h-screen relative z-10 text-slate-100 font-sans overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left: Logo + Title + Navigation */}
              <div className="flex items-center gap-6">
                {/* Logo */}
                <motion.div
                  className="flex items-center"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <img
                    src="/images/logos/Whisker_Wars_White_Logo_New.png"
                    alt="Whisker Wars Logo"
                    className="h-16 sm:h-28 w-auto drop-shadow-lg object-contain"
                  />
                </motion.div>

                {/* Navigation Tabs */}
                <nav className="hidden lg:flex gap-2">
                  {[
                    { id: 'bait', label: 'Bait', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C10.34 2 9 3.34 9 5c0 1.38.93 2.55 2.2 2.91-.15 2.22-.97 3.83-1.74 4.93-.92 1.32-1.66 1.92-1.66 1.92l-.02.02c-.35.33-.73.62-1.13.85-1.17.68-2.65 1.01-4.5 1.01h-.5v2h.5c2.11 0 3.98-.43 5.49-1.32.47-.27.91-.59 1.31-.94C10.07 18.28 11.58 20 13 20c.56 0 1.03-.29 1.35-.71.33-.44.46-1.01.38-1.56-.16-1.09-1.04-2.09-1.89-2.88-.5-.46-.97-.85-1.31-1.19.48-.81.98-1.8 1.35-2.93.32-.98.55-2.04.64-3.22C13.93 7.55 15 6.38 15 5c0-1.66-1.34-3-3-3z"/></svg>, gradient: 'from-blue-500 to-cyan-500' },
                    { id: 'collection', label: 'Collection', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>, gradient: 'from-purple-500 to-pink-500' },
                    { id: 'battle', label: 'Battle', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1-.94m4.96 6.06l-.84.84a.996.996 0 01-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.66 2.68 3.12 3.12c.36.36.36.94 0 1.35z"/></svg>, gradient: 'from-red-500 to-orange-500' },
                    { id: 'stats', label: 'Stats', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>, gradient: 'from-emerald-500 to-teal-500' },
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
                        {tab.icon}
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
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        {/* Simple user profile icon */}
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
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
            <nav className="flex lg:hidden gap-2 mt-3 pt-3 border-t border-slate-700/50">
              {[
                { id: 'bait', label: 'Bait', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C10.34 2 9 3.34 9 5c0 1.38.93 2.55 2.2 2.91-.15 2.22-.97 3.83-1.74 4.93-.92 1.32-1.66 1.92-1.66 1.92l-.02.02c-.35.33-.73.62-1.13.85-1.17.68-2.65 1.01-4.5 1.01h-.5v2h.5c2.11 0 3.98-.43 5.49-1.32.47-.27.91-.59 1.31-.94C10.07 18.28 11.58 20 13 20c.56 0 1.03-.29 1.35-.71.33-.44.46-1.01.38-1.56-.16-1.09-1.04-2.09-1.89-2.88-.5-.46-.97-.85-1.31-1.19.48-.81.98-1.8 1.35-2.93.32-.98.55-2.04.64-3.22C13.93 7.55 15 6.38 15 5c0-1.66-1.34-3-3-3z"/></svg>, gradient: 'from-blue-500 to-cyan-500' },
                { id: 'collection', label: 'Collection', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>, gradient: 'from-purple-500 to-pink-500' },
                { id: 'battle', label: 'Battle', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1-.94m4.96 6.06l-.84.84a.996.996 0 01-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.66 2.68 3.12 3.12c.36.36.36.94 0 1.35z"/></svg>, gradient: 'from-red-500 to-orange-500' },
                { id: 'stats', label: 'Stats', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>, gradient: 'from-emerald-500 to-teal-500' },
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  onClick={() => setView(tab.id as any)}
                  className={`relative flex-1 px-3 py-3 rounded-lg font-bold text-xs tracking-wide transition-all overflow-hidden ${view === tab.id
                    ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700'
                    }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative flex flex-col items-center justify-center gap-1">
                    {tab.icon}
                    <span className="text-[10px]">{tab.label}</span>
                  </span>
                </motion.button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <motion.div
            key={view}
            initial="initial"
            animate="animate"
            variants={pageVariants}
          >
            {view === 'bait' && <BaitingArea baits={BAITS} />}
            {view === 'collection' && <Collection />}
            {view === 'battle' && <BattleArena />}
            {view === 'stats' && <StatsView />}
            {view === 'privacy' && <PrivacyPolicy />}
            {view === 'terms' && <TermsOfService />}
          </motion.div>
        </main>

        {/* Premium Footer */}
        <footer className="max-w-7xl mx-auto px-6 py-8 mt-12 border-t border-slate-800/50">
          <div className="text-center">
            <div className="inline-block px-6 py-3 rounded-xl bg-premium-gradient border border-slate-700/50 shadow-premium mb-3">
              <p className="text-slate-300 text-sm flex items-center gap-3 justify-center">
                <img
                  src="/images/logos/Whisker_Wars_White_Logo_New.png"
                  alt="Whisker Wars"
                  className="h-12 w-auto"
                />
                <span className="mx-2 text-slate-600">•</span>
                <span className="text-slate-400">Elite Cat Combat Simulator</span>
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Progress auto-saves • Built by Aaron and Matt Arnold
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={() => setView('privacy')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
              >
                Privacy Policy
              </button>
              <span className="text-slate-700">•</span>
              <button
                onClick={() => setView('terms')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </footer>
      </div>

      <DailyRewardModal
        isOpen={showDailyReward}
        onClose={() => setShowDailyReward(false)}
      />

      <WelcomeTutorialModal
        isOpen={showWelcomeTutorial}
        onClose={() => {
          setShowWelcomeTutorial(false)
          completeTutorial()
        }}
      />

      {showProfileSelector && (
        <ProfileSelector
          onProfileSelected={() => {
            setShowProfileSelector(false)
            setProfileLoaded(true)
            load()

            const currentProfile = getCurrentProfile()
            const isNewProfile = currentProfile && (Date.now() - currentProfile.created) < 10000

            const canClaim = claimDailyReward()
            if (canClaim && !isNewProfile) {
              setTimeout(() => setShowDailyReward(true), 1000)
            }

            // Show tutorial for new profiles
            if (isNewProfile && !tutorialCompleted) {
              setTimeout(() => setShowWelcomeTutorial(true), 800)
            }
          }}
        />
      )}
    </>
  )
}
