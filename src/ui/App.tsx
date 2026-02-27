
import React, { useEffect, useState, Suspense } from 'react'
import { useGame } from '../game/store'
import { BAITS } from '../game/data'
import type { View } from '../game/store'
import BaitingArea from './views/BaitingArea'
import Collection from './views/Collection'
import BattleArena from './views/BattleArena'
import StatsView from './views/StatsView'
import TrainingArena from './views/TrainingArena'
import Inventory from './views/Inventory'
import GuidePage from './views/GuidePage'
import PrivacyPolicy from './views/PrivacyPolicy'
import TermsOfService from './views/TermsOfService'

const JungleRunView = React.lazy(() => import('./views/JungleRunView'))
import JungleBackground from './components/JungleBackground'
import JungleAnnouncementModal from './components/JungleAnnouncementModal'
import Modal from './components/Modal'
import ProfileSelector from './components/ProfileSelector'
import WelcomeTutorialModal from './components/WelcomeTutorialModal'
import SplashScreen from './components/SplashScreen'
import StorageWarning from './components/StorageWarning'
import SaveCodeModal from './components/SaveCodeModal'
import ErrorBoundary from './components/ErrorBoundary'
import EventBanner from './components/EventBanner'
import FrenzyFridayModal from './components/FrenzyFridayModal'
import { isFrenzyFriday, getFrenzyWeekKey } from '../game/events'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants } from './animations'
import { isWeb } from '../utils/platform'
import { getStorageHealth } from '../utils/storage'
import { startMusic, stopMusic, playSound } from '../utils/sound'
import {
  trackPageView,
  trackTabNavigation,
  trackAchievementsModalOpened,
  trackTutorialCompleted,
  trackProfileSwitched,
} from '../utils/analytics'

function DailyRewardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dailyStreak = useGame(s => s.dailyStreak)
  const streakDay = Math.max(0, dailyStreak - 1) // Show the day that was just claimed
  const STREAK_REWARDS = [
    { coins: 50 },
    { coins: 75 },
    { coins: 100, bait: 'Catnip Crunch' },
    { coins: 125 },
    { coins: 150, bait: 'Cosmic Tuna' },
    { coins: 200 },
    { coins: 300, bait: 'Mythic Mackerel' },
  ]
  const reward = STREAK_REWARDS[streakDay % STREAK_REWARDS.length]
  const currentDay = (streakDay % STREAK_REWARDS.length) + 1

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Reward" size="sm">
      <div className="text-center py-6">
        <div className="text-6xl mb-4 animate-bounce">🪙</div>
        <h3 className="text-2xl font-bold text-amber-400 mb-2">+{reward.coins} Coins!</h3>
        {'bait' in reward && reward.bait && (
          <p className="text-cyan-400 font-semibold mb-2">+ 1x {reward.bait}!</p>
        )}
        {/* Streak indicator */}
        <div className="flex justify-center gap-1.5 my-4">
          {STREAK_REWARDS.map((_, i) => (
            <div
              key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i < currentDay
                  ? 'bg-amber-500 border-amber-400 text-slate-900'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Day {currentDay} of 7 — Come back tomorrow to keep your streak!
        </p>
        <motion.button
          onClick={onClose}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-bold rounded-xl shadow-lg"
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
  const soundEnabled = useGame(s => s.soundEnabled)
  const unclaimedCount = achievements.filter(a => a.unlocked && !a.claimed).length

  return (
    <>
      <motion.button
        onClick={() => { trackAchievementsModalOpened(); setShowAchievements(true) }}
        className="px-3 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-gold-500/30 shadow-glow-gold relative group flex items-center"
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
                    onClick={() => { claimAchievement(ach.id); if (soundEnabled) playSound('coinEarned') }}
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

function SoundToggle() {
  const soundEnabled = useGame(s => s.soundEnabled)
  const toggleSound = useGame(s => s.toggleSound)

  return (
    <motion.button
      onClick={toggleSound}
      className="px-2.5 h-10 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
    >
      <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
    </motion.button>
  )
}

function MusicToggle() {
  const musicEnabled = useGame(s => s.musicEnabled)
  const toggleMusic = useGame(s => s.toggleMusic)

  // Auto-start music on first user interaction if enabled
  useEffect(() => {
    if (!musicEnabled) return

    const handleInteraction = () => {
      startMusic()
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
    window.addEventListener('click', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [musicEnabled])

  const handleToggle = () => {
    const newState = !musicEnabled
    toggleMusic()
    if (newState) {
      startMusic()
    } else {
      stopMusic()
    }
  }

  return (
    <motion.button
      onClick={handleToggle}
      className="relative px-2.5 h-10 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={musicEnabled ? 'Stop music' : 'Play music'}
    >
      <span className={`text-lg ${musicEnabled ? '' : 'opacity-50'}`}>🎵</span>
      {!musicEnabled && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="block w-5 h-0.5 bg-red-500 rotate-45 rounded" />
        </span>
      )}
    </motion.button>
  )
}

export default function App() {
  const view = useGame(s => s.view)
  const setView = useGame(s => s.setView)
  const soundEnabled = useGame(s => s.soundEnabled)
  const coins = useGame(s => s.coins)
  const load = useGame(s => s.load)
  const claimDailyReward = useGame(s => s.claimDailyReward)
  const stats = useGame(s => s.stats)
  const getCurrentProfile = useGame(s => s.getCurrentProfile)
  const getProfiles = useGame(s => s.getProfiles)
  const tutorialCompleted = useGame(s => s.tutorialCompleted)
  const completeTutorial = useGame(s => s.completeTutorial)
  const saveError = useGame(s => s.saveError)
  const clearSaveError = useGame(s => s.clearSaveError)
  const junglePassUnlocked = useGame(s => s.junglePassUnlocked)
  const jungleAnnouncementShown = useGame(s => s.jungleAnnouncementShown)
  const jungleTabVisited = useGame(s => s.jungleTabVisited)
  const dogIndex = useGame(s => s.dogIndex)
  const dismissJungleAnnouncement = useGame(s => s.dismissJungleAnnouncement)

  const [showDailyReward, setShowDailyReward] = useState(false)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [showSplash, setShowSplash] = useState(isWeb())
  const [splashCompleted, setSplashCompleted] = useState(!isWeb())
  const [isPublicPage, setIsPublicPage] = useState(false)
  const [showStorageWarning, setShowStorageWarning] = useState(false)
  const [showSaveCodeModal, setShowSaveCodeModal] = useState(false)
  const [showFrenzyPopup, setShowFrenzyPopup] = useState(false)
  const [showJungleAnnouncement, setShowJungleAnnouncement] = useState(false)

  // Sync view with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove the #
      if (hash === 'privacy' || hash === 'terms' || hash === 'bait' || hash === 'collection' || hash === 'inventory' || hash === 'battle' || hash === 'training' || hash === 'jungle' || hash === 'stats' || hash === 'guide') {
        setView(hash as View)
        // Check if viewing public pages (privacy/terms)
        setIsPublicPage(hash === 'privacy' || hash === 'terms')
      }
    }

    // Set initial view from URL
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setView])

  // Handle payment return — Yoco strips hash fragments, so we use ?view= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    if (viewParam && !window.location.hash.slice(1)) {
      window.location.hash = viewParam
    }
  }, [])

  // Update URL when view changes
  useEffect(() => {
    const currentHash = window.location.hash.slice(1)
    if (currentHash !== view) {
      window.location.hash = view
    }
    trackPageView(view)
  }, [view])

  // Check for profiles on mount - but only after splash completes
  useEffect(() => {
    // Skip profile check if viewing public pages (privacy/terms)
    const currentHash = window.location.hash.slice(1)
    if (currentHash === 'privacy' || currentHash === 'terms') {
      setIsPublicPage(true)
      setProfileLoaded(true)
      return
    }

    // Wait for splash to complete before showing profile selector
    if (!splashCompleted) {
      return
    }

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

      // Check for Frenzy Friday announcement
      if (isFrenzyFriday()) {
        const frenzyShownKey = `frenzy-shown-${getFrenzyWeekKey()}`
        if (!sessionStorage.getItem(frenzyShownKey)) {
          sessionStorage.setItem(frenzyShownKey, '1')
          const delay = canClaim ? 2500 : 1200
          setTimeout(() => setShowFrenzyPopup(true), delay)
        }
      }

      // Jungle of Talons announcement
      const jungleState = useGame.getState()
      if (!jungleState.jungleAnnouncementShown && jungleState.junglePassUnlocked === false && tutorialCompleted && jungleState.dogIndex >= 10) {
        setTimeout(() => setShowJungleAnnouncement(true), 2000)
      }
    }
  }, [splashCompleted])

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Check storage health on mount
  useEffect(() => {
    const health = getStorageHealth()
    if (!health.healthy && profileLoaded) {
      setShowStorageWarning(true)
    }
  }, [profileLoaded])

  return (
    <>
      {/* Background Layer */}
      {view === 'jungle' && junglePassUnlocked ? (
        <JungleBackground mode="fullscreen" intensity="low" />
      ) : (
        <div className="animated-bg" />
      )}

      <div className="min-h-screen relative z-10 text-slate-100 font-sans overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Premium Header with Background */}
        <header className={`sticky top-0 z-header backdrop-blur-xl border-b shadow-premium overflow-hidden ${
          view === 'jungle' && junglePassUnlocked
            ? 'bg-emerald-950/80 border-emerald-700/50'
            : 'bg-slate-900/80 border-slate-700/50'
        }`}>
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {view === 'jungle' && junglePassUnlocked ? (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/80 to-emerald-950/90" />
            ) : (
              <>
                <img
                  src="/images/header/WW header.png"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/90" />
              </>
            )}
          </div>

          <div className="max-w-7xl mx-auto px-4 py-3 relative">
            {/* Single Compact Row */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left: Logo + Title + Navigation */}
              <div className="flex items-center gap-6">
                {/* Logo */}
                <motion.div
                  className="hidden sm:flex items-center"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <img
                    src="/images/logos/Whisker_Wars_White_Logo_New.png"
                    alt="Whisker Wars Logo"
                    loading="lazy"
                    decoding="async"
                    className="h-24 w-auto drop-shadow-lg object-contain"
                  />
                </motion.div>

                {/* Navigation Tabs */}
                <nav className="hidden lg:flex gap-2">
                  {[
                    { id: 'bait', label: 'Bait', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C10.34 2 9 3.34 9 5c0 1.38.93 2.55 2.2 2.91-.15 2.22-.97 3.83-1.74 4.93-.92 1.32-1.66 1.92-1.66 1.92l-.02.02c-.35.33-.73.62-1.13.85-1.17.68-2.65 1.01-4.5 1.01h-.5v2h.5c2.11 0 3.98-.43 5.49-1.32.47-.27.91-.59 1.31-.94C10.07 18.28 11.58 20 13 20c.56 0 1.03-.29 1.35-.71.33-.44.46-1.01.38-1.56-.16-1.09-1.04-2.09-1.89-2.88-.5-.46-.97-.85-1.31-1.19.48-.81.98-1.8 1.35-2.93.32-.98.55-2.04.64-3.22C13.93 7.55 15 6.38 15 5c0-1.66-1.34-3-3-3z"/></svg>, gradient: 'from-blue-500 to-cyan-500' },
                    { id: 'collection', label: 'Collection', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>, gradient: 'from-purple-500 to-pink-500' },
                    { id: 'inventory', label: 'Inventory', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>, gradient: 'from-amber-500 to-orange-500' },
                    { id: 'battle', label: 'Battle', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1-.94m4.96 6.06l-.84.84a.996.996 0 01-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.66 2.68 3.12 3.12c.36.36.36.94 0 1.35z"/></svg>, gradient: 'from-red-500 to-orange-500' },
                    { id: 'training', label: 'Train', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93V18h-2v1.93A8 8 0 0 1 4.07 13H6v-2H4.07A8 8 0 0 1 11 4.07V6h2V4.07A8 8 0 0 1 19.93 11H18v2h1.93A8 8 0 0 1 13 19.93zM12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/></svg>, gradient: 'from-amber-500 to-yellow-500' },
                    ...(import.meta.env.VITE_FEATURE_JUNGLE !== 'false' ? [{ id: 'jungle', label: 'Jungle', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.05 8.05a7 7 0 0 0 9.9 9.9l1.41 1.41a9 9 0 0 1-12.73-12.73l1.42 1.42zM17.95 15.95a7 7 0 0 0-9.9-9.9L6.64 4.64a9 9 0 0 1 12.73 12.73l-1.42-1.42zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>, gradient: junglePassUnlocked ? 'from-emerald-600 to-teal-600' : 'from-slate-600 to-slate-500', isJungle: true as const }] : []),
                    { id: 'stats', label: 'Stats', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>, gradient: 'from-emerald-500 to-teal-500' },
                  ].map(tab => {
                    const isJungleTab = 'isJungle' in tab && tab.isJungle
                    const jungleLocked = isJungleTab && !junglePassUnlocked
                    const jungleNewDot = isJungleTab && junglePassUnlocked && !jungleTabVisited
                    return (
                    <motion.button
                      key={tab.id}
                      onClick={() => { if (soundEnabled) playSound('buttonClick'); trackTabNavigation(tab.id); setView(tab.id as any) }}
                      className={`relative px-4 py-2 rounded-lg font-bold text-xs tracking-wide transition-all overflow-hidden ${view === tab.id
                        ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg'
                        : jungleLocked
                          ? 'bg-slate-800/50 text-slate-500 border border-slate-700 opacity-75 hover:opacity-100 hover:border-slate-600'
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
                        {jungleLocked && <span className="text-[10px] opacity-70">&#x1F512;</span>}
                      </span>
                      {jungleNewDot && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900 animate-pulse" />
                      )}
                    </motion.button>
                    )
                  })}
                </nav>
              </div>

              {/* Right: User Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div
                  className="px-3 sm:px-4 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-gold-500/30 shadow-glow-gold relative overflow-hidden group flex items-center"
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
                <SoundToggle />
                <MusicToggle />
                {profileLoaded && (
                  <motion.button
                    onClick={() => setShowProfileSelector(true)}
                    className="px-3 h-10 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-purple-500/50 transition-all flex items-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        {/* Simple user profile icon */}
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                      <span className="hidden sm:flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 max-w-[80px] truncate">
                          {getCurrentProfile()?.name}
                        </span>
                        {getCurrentProfile()?.cloudCode && (
                          <span className="text-xs font-black text-gold-400 font-mono">
                            {getCurrentProfile()?.cloudCode}
                          </span>
                        )}
                      </span>
                    </div>
                  </motion.button>
                )}
                <motion.button
                  onClick={() => { if (soundEnabled) playSound('buttonClick'); setView('guide') }}
                  className="w-10 h-10 rounded-full bg-slate-800/70 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm font-bold"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Guide & FAQ"
                >
                  ?
                </motion.button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex lg:hidden gap-2 mt-3 pt-3 border-t border-slate-700/50 overflow-x-auto scrollbar-hide">
              {[
                { id: 'bait', label: 'Bait', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C10.34 2 9 3.34 9 5c0 1.38.93 2.55 2.2 2.91-.15 2.22-.97 3.83-1.74 4.93-.92 1.32-1.66 1.92-1.66 1.92l-.02.02c-.35.33-.73.62-1.13.85-1.17.68-2.65 1.01-4.5 1.01h-.5v2h.5c2.11 0 3.98-.43 5.49-1.32.47-.27.91-.59 1.31-.94C10.07 18.28 11.58 20 13 20c.56 0 1.03-.29 1.35-.71.33-.44.46-1.01.38-1.56-.16-1.09-1.04-2.09-1.89-2.88-.5-.46-.97-.85-1.31-1.19.48-.81.98-1.8 1.35-2.93.32-.98.55-2.04.64-3.22C13.93 7.55 15 6.38 15 5c0-1.66-1.34-3-3-3z"/></svg>, gradient: 'from-blue-500 to-cyan-500' },
                { id: 'collection', label: 'Collection', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>, gradient: 'from-purple-500 to-pink-500' },
                { id: 'inventory', label: 'Items', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>, gradient: 'from-amber-500 to-orange-500' },
                { id: 'battle', label: 'Battle', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1-.94m4.96 6.06l-.84.84a.996.996 0 01-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.66 2.68 3.12 3.12c.36.36.36.94 0 1.35z"/></svg>, gradient: 'from-red-500 to-orange-500' },
                { id: 'training', label: 'Train', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93V18h-2v1.93A8 8 0 0 1 4.07 13H6v-2H4.07A8 8 0 0 1 11 4.07V6h2V4.07A8 8 0 0 1 19.93 11H18v2h1.93A8 8 0 0 1 13 19.93zM12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/></svg>, gradient: 'from-amber-500 to-yellow-500' },
                ...(import.meta.env.VITE_FEATURE_JUNGLE !== 'false' ? [{ id: 'jungle', label: 'Jungle', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6.05 8.05a7 7 0 0 0 9.9 9.9l1.41 1.41a9 9 0 0 1-12.73-12.73l1.42 1.42zM17.95 15.95a7 7 0 0 0-9.9-9.9L6.64 4.64a9 9 0 0 1 12.73 12.73l-1.42-1.42zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>, gradient: junglePassUnlocked ? 'from-emerald-600 to-teal-600' : 'from-slate-600 to-slate-500', isJungle: true as const }] : []),
                { id: 'stats', label: 'Stats', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>, gradient: 'from-emerald-500 to-teal-500' },
              ].map(tab => {
                const isJungleTab = 'isJungle' in tab && tab.isJungle
                const jungleLocked = isJungleTab && !junglePassUnlocked
                const jungleNewDot = isJungleTab && junglePassUnlocked && !jungleTabVisited
                return (
                <motion.button
                  key={tab.id}
                  onClick={() => { if (soundEnabled) playSound('buttonClick'); trackTabNavigation(tab.id); setView(tab.id as any) }}
                  className={`relative flex-1 px-3 py-3 rounded-lg font-bold text-xs tracking-wide transition-all overflow-hidden ${view === tab.id
                    ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg'
                    : jungleLocked
                      ? 'bg-slate-800/50 text-slate-500 border border-slate-700 opacity-75'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700'
                    }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative flex flex-col items-center justify-center gap-1">
                    {tab.icon}
                    <span className="text-[10px]">{tab.label}{jungleLocked ? ' \u{1F512}' : ''}</span>
                  </span>
                  {jungleNewDot && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </motion.button>
                )
              })}
            </nav>
          </div>
        </header>

        {/* Event Banner */}
        {profileLoaded && !isPublicPage && <EventBanner />}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 relative z-content">
          <motion.div
            key={view}
            initial="initial"
            animate="animate"
            variants={pageVariants}
          >
            <ErrorBoundary>
              {view === 'bait' && <BaitingArea baits={BAITS} />}
              {view === 'collection' && <Collection />}
              {view === 'inventory' && <Inventory />}
              {view === 'battle' && <BattleArena />}
              {view === 'training' && <TrainingArena />}
              {view === 'jungle' && (
                <Suspense fallback={<div className="text-center py-12 text-slate-500">Loading Jungle...</div>}>
                  <JungleRunView />
                </Suspense>
              )}
              {view === 'stats' && <StatsView />}
              {view === 'guide' && <GuidePage />}
              {view === 'privacy' && <PrivacyPolicy />}
              {view === 'terms' && <TermsOfService />}
            </ErrorBoundary>
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
                  loading="lazy"
                  decoding="async"
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

      <FrenzyFridayModal
        isOpen={showFrenzyPopup}
        onClose={() => setShowFrenzyPopup(false)}
        onFightNow={() => {
          setShowFrenzyPopup(false)
          setView('battle')
        }}
      />

      <WelcomeTutorialModal
        isOpen={showWelcomeTutorial}
        onClose={() => {
          trackTutorialCompleted()
          setShowWelcomeTutorial(false)
          completeTutorial()
        }}
      />

      {/* Jungle of Talons Announcement Modal */}
      {showJungleAnnouncement && (
        <JungleAnnouncementModal
          onExplore={() => { setShowJungleAnnouncement(false); dismissJungleAnnouncement(); setView('jungle') }}
          onDismiss={() => { setShowJungleAnnouncement(false); dismissJungleAnnouncement() }}
        />
      )}

      {/* Splash Screen for Web Only */}
      <AnimatePresence>
        {showSplash && !isPublicPage && (
          <SplashScreen onClose={() => {
            setShowSplash(false)
            setSplashCompleted(true)
          }} />
        )}
      </AnimatePresence>

      {/* Profile Selector - Don't show on public pages */}
      {showProfileSelector && !isPublicPage && (
        <ProfileSelector
          onProfileSelected={() => {
            setShowProfileSelector(false)
            setProfileLoaded(true)
            // load() is already called by loadProfile() in ProfileSelector - no double load
            trackProfileSwitched(getCurrentProfile()?.id || 'unknown')

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

            // Check storage health after profile loads
            const health = getStorageHealth()
            if (!health.healthy) {
              setTimeout(() => setShowStorageWarning(true), 1500)
            }

            // Check for Frenzy Friday announcement on profile switch
            if (isFrenzyFriday()) {
              const frenzyShownKey = `frenzy-shown-${getFrenzyWeekKey()}`
              if (!sessionStorage.getItem(frenzyShownKey)) {
                sessionStorage.setItem(frenzyShownKey, '1')
                const delay = canClaim ? 2500 : 1200
                setTimeout(() => setShowFrenzyPopup(true), delay)
              }
            }
          }}
        />
      )}

      {/* Save Error Banner */}
      {saveError && profileLoaded && !isPublicPage && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-900/95 backdrop-blur-sm border-b border-red-500/50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-red-100 text-sm font-medium flex-1">{saveError}</p>
          <button
            onClick={() => setShowSaveCodeModal(true)}
            className="px-4 py-2 bg-gold-500 text-slate-900 font-bold rounded-lg text-sm whitespace-nowrap hover:bg-gold-400 transition-colors"
          >
            Get Save Code
          </button>
          <button
            onClick={clearSaveError}
            className="text-red-300 hover:text-white p-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Storage Warning Banner */}
      {showStorageWarning && profileLoaded && !isPublicPage && (
        <StorageWarning onGetCode={() => setShowSaveCodeModal(true)} />
      )}

      {/* Save Code Modal (opened from storage warning) */}
      <SaveCodeModal
        isOpen={showSaveCodeModal}
        onClose={() => setShowSaveCodeModal(false)}
        mode="generate"
      />
    </>
  )
}
