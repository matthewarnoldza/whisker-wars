import Card from '../components/Card'
import GameCard from '../components/GameCard'
import Avatar from '../components/Avatar'
import StatBar from '../components/StatBar'
import CardZoomModal from '../components/CardZoomModal'
import MergeCelebrationModal from '../components/MergeCelebrationModal'
import { useGame } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'
import { containerVariants, cardVariants } from '../animations'
import { useState, useMemo, useCallback } from 'react'
import type { OwnedCat } from '../../game/store'
import type { Rarity } from '../../game/data'
import { CATS } from '../../game/data'
import {
  trackCardZoomed,
  trackCatReleased,
  trackMergeAttempted,
  trackMergeSuccess,
  trackHealAll,
  trackSortUsed,
  trackFilterUsed,
  trackCoinsSpent,
} from '../../utils/analytics'

type SortOption = 'name' | 'level' | 'rarity' | 'hp' | 'attack'
type FilterOption = 'all' | Rarity

export default function Collection() {
  const cats = useGame(s => s.owned)
  const toggle = useGame(s => s.toggleSelectCat)
  const toggleFavorite = useGame(s => s.toggleFavorite)
  const selected = useGame(s => s.selectedForBattle)
  const favorites = useGame(s => s.favorites)
  const healAllCats = useGame(s => s.healAllCats)
  const releaseCat = useGame(s => s.releaseCat)
  const mergeCats = useGame(s => s.mergeCats)
  const coins = useGame(s => s.coins)

  const [sortBy, setSortBy] = useState<SortOption>('level')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [zoomedCat, setZoomedCat] = useState<OwnedCat | null>(null)
  const [healFlash, setHealFlash] = useState(false)

  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false)
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([])
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [mergeResultCat, setMergeResultCat] = useState<OwnedCat | null>(null)
  const [showMergeCelebration, setShowMergeCelebration] = useState(false)

  // O(1) lookups instead of O(n) array.includes() in render loop
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const favoritesSet = useMemo(() => new Set(favorites), [favorites])
  const mergeSelectedSet = useMemo(() => new Set(selectedForMerge), [selectedForMerge])

  // Determine which cats are eligible for merge selection
  const mergeEligibleSet = useMemo(() => {
    if (!mergeMode || selectedForMerge.length === 0) return null
    const firstCat = cats.find(c => c.instanceId === selectedForMerge[0])
    if (!firstCat) return null
    return new Set(
      cats
        .filter(c => c.id === firstCat.id && (c.eliteTier || 0) === (firstCat.eliteTier || 0))
        .map(c => c.instanceId)
    )
  }, [mergeMode, selectedForMerge, cats])

  // Memoized handlers to prevent recreation on every render
  const handleSortChange = useCallback((option: SortOption) => { trackSortUsed(option); setSortBy(option) }, [])
  const handleFilterChange = useCallback((option: FilterOption) => { trackFilterUsed(option); setFilterBy(option) }, [])

  const handleMergeToggle = useCallback(() => {
    setMergeMode(m => !m)
    setSelectedForMerge([])
  }, [])

  const handleMergeSelect = useCallback((instanceId: string) => {
    setSelectedForMerge(prev => {
      if (prev.includes(instanceId)) {
        return prev.filter(id => id !== instanceId)
      }
      if (prev.length >= 3) return prev
      return [...prev, instanceId]
    })
  }, [])

  const handleMergeConfirm = useCallback(() => {
    if (selectedForMerge.length !== 3) return
    const firstCat = cats.find(c => c.instanceId === selectedForMerge[0])
    if (firstCat) trackMergeAttempted(firstCat.name, firstCat.eliteTier || 0)
    const result = mergeCats(selectedForMerge as [string, string, string])
    if (result) {
      trackMergeSuccess(result.name, result.eliteTier || 1, (result.eliteTier || 0) >= 2)
      setMergeResultCat(result)
      setShowMergeConfirm(false)
      setShowMergeCelebration(true)
      setSelectedForMerge([])
      setMergeMode(false)
    }
  }, [selectedForMerge, mergeCats, cats])

  const rarityColors: Record<Rarity, string> = {
    Common: 'text-gray-400 border-gray-500',
    Uncommon: 'text-green-400 border-green-500',
    Rare: 'text-blue-400 border-blue-500',
    Epic: 'text-purple-400 border-purple-500',
    Legendary: 'text-orange-400 border-orange-500',
    Mythical: 'text-matrix-400 border-matrix-500',
  }

  const rarityOrder: Record<Rarity, number> = {
    Common: 0,
    Uncommon: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 4,
    Mythical: 5,
  }

  // Calculate unique cats collected (by base id, not instanceId)
  const uniqueCatsCollected = useMemo(() => {
    const uniqueIds = new Set(cats.map(cat => cat.id))
    return uniqueIds.size
  }, [cats])

  const totalUniqueCats = 40

  const collectionProgress = useMemo(() => {
    return Math.round((uniqueCatsCollected / totalUniqueCats) * 100)
  }, [uniqueCatsCollected, totalUniqueCats])

  const filteredAndSortedCats = useMemo(() => {
    let result = [...cats]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(cat => cat.name.toLowerCase().includes(query))
    }

    // Favorites filter
    if (showFavoritesOnly) {
      result = result.filter(cat => favorites.includes(cat.instanceId))
    }

    // Rarity filter
    if (filterBy !== 'all') {
      result = result.filter(cat => cat.rarity === filterBy)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'level':
          return b.level - a.level
        case 'rarity':
          return rarityOrder[b.rarity as Rarity] - rarityOrder[a.rarity as Rarity]
        case 'hp':
          return b.maxHp - a.maxHp
        case 'attack':
          return b.currentAttack - a.currentAttack
        default:
          return 0
      }
    })

    return result
  }, [cats, sortBy, filterBy, searchQuery, showFavoritesOnly, favorites])

  const calculateXpForNextLevel = (level: number): number => {
    return Math.floor(50 * Math.pow(1.5, level - 1))
  }

  return (
    <div className="space-y-6">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl ${mergeMode
          ? 'bg-gradient-to-r from-cyan-500/30 to-teal-500/30 border border-cyan-500/50'
          : 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/50'
        }`}
      >
        <p className="text-white text-center font-semibold">
          {mergeMode ? (
            <>
              <span className="text-lg mr-2">&#x2726;</span>
              Select 3 of the same cat to merge into an Elite! {selectedForMerge.length}/3 selected
            </>
          ) : (
            <>
              <span className="text-lg mr-2">⚔️</span>
              Select up to 3 of your cats for battle by clicking the circles. Heal injured cats before sending them into combat!
            </>
          )}
        </p>
      </motion.div>

      {/* Compact Stats & Progress Bar */}
      <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-700/50">
        {/* Mobile: 2x2 Grid, Desktop: Row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="font-bold text-slate-300">
            <span className="text-white">{cats.length}</span> cats
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="font-bold text-slate-300">
            <span className="text-gold-400">{selected.length}/3</span> selected
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="font-bold text-slate-300">
            🎴 <span className="text-purple-400">{uniqueCatsCollected}/{totalUniqueCats}</span> unique
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 mt-1 sm:mt-0">
            <span className="font-bold text-gold-400 text-xs sm:text-sm">{collectionProgress}%</span>
            {/* Progress Bar (Inline) */}
            <div className="flex-1 sm:w-32 bg-slate-800/50 rounded-full h-2 overflow-hidden border border-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${collectionProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="premium-card rounded-xl p-4 space-y-3">
        {/* Row 1: Search, Favorites, Heal All */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Bar */}
          <input
            type="text"
            placeholder="🔍 Search cats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
          />

          {/* Favorites Toggle */}
          <motion.button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              showFavoritesOnly
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-pink-500/50 hover:text-pink-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⭐ Favorites
          </motion.button>

          {/* Heal All Button */}
          <motion.button
            onClick={() => {
              const catsNeedingHeal = cats.filter(c => c.currentHp < c.maxHp).length
              const success = healAllCats()
              if (!success) {
                if (coins < 25) {
                  alert('Not enough coins! Need 25 coins to heal all cats.')
                } else {
                  alert('All cats are already at full health!')
                }
              } else {
                trackHealAll(25, catsNeedingHeal)
                trackCoinsSpent('heal_all', 25)
                // Trigger green flash animation
                setHealFlash(true)
                setTimeout(() => setHealFlash(false), 500)
              }
            }}
            disabled={coins < 25}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap relative overflow-hidden ${
              coins < 25
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg'
            }`}
            whileHover={coins >= 25 ? { scale: 1.05 } : {}}
            whileTap={coins >= 25 ? { scale: 0.95 } : {}}
            animate={healFlash ? {
              boxShadow: [
                '0 0 0px rgba(16, 185, 129, 0)',
                '0 0 40px rgba(16, 185, 129, 1)',
                '0 0 0px rgba(16, 185, 129, 0)'
              ]
            } : {}}
            transition={{ duration: 0.5 }}
          >
            {healFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-emerald-300/60 rounded-lg"
              />
            )}
            <span className="relative z-10">💊 Heal All (25💰)</span>
          </motion.button>

          {/* Merge Mode Toggle */}
          <motion.button
            onClick={handleMergeToggle}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              mergeMode
                ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-900 shadow-lg'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-yellow-500/50 hover:text-yellow-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            &#x2726; Merge
          </motion.button>
        </div>

        {/* Row 2: Sort & Filter */}
        <div className="flex flex-col lg:flex-row gap-3 pt-3 border-t border-slate-700/50">
          {/* Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sort:</span>
            {(['level', 'rarity', 'name', 'hp', 'attack'] as SortOption[]).map(option => (
              <motion.button
                key={option}
                onClick={() => handleSortChange(option)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${sortBy === option
                  ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-slate-900 shadow-md'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-gold-500/50 hover:text-gold-300'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </motion.button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-slate-700/50" />

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Filter:</span>
            {(['all', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'] as FilterOption[]).map(
              option => (
                <motion.button
                  key={option}
                  onClick={() => handleFilterChange(option)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${filterBy === option
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-purple-500/50 hover:text-purple-300'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option === 'all' ? 'All' : option}
                </motion.button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedCats.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card rounded-2xl p-16 text-center"
        >
          <div className="text-8xl mb-6 animate-float">😿</div>
          <h3 className="text-3xl font-bold text-slate-300 mb-3">
            {filterBy === 'all' ? 'No cats yet!' : `No ${filterBy} cats found`}
          </h3>
          <p className="text-slate-500 text-lg">
            {filterBy === 'all'
              ? 'Visit the Baiting Area to befriend some cats!'
              : 'Try a different filter or catch more cats!'}
          </p>
        </motion.div>
      )}

      {/* Cats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-x-3 gap-y-1 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredAndSortedCats.map(cat => {
            const isSelected = selectedSet.has(cat.instanceId)
            const isFavorite = favoritesSet.has(cat.instanceId)
            const battlePosition = isSelected ? selected.indexOf(cat.instanceId) + 1 : 0
            const isMergeSelected = mergeSelectedSet.has(cat.instanceId)
            const mergePosition = isMergeSelected ? selectedForMerge.indexOf(cat.instanceId) + 1 : 0
            // In merge mode, dim ineligible cats (wrong type or wrong tier)
            const isMergeIneligible = mergeMode && mergeEligibleSet !== null && !mergeEligibleSet.has(cat.instanceId)
            // Cannot merge Tier 2 cats
            const isMaxTier = mergeMode && (cat.eliteTier || 0) >= 2

            return (
              <motion.div
                key={cat.instanceId}
                variants={cardVariants}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className={`relative scale-[0.8] sm:scale-100 origin-top-left transition-opacity ${
                  isMergeIneligible || isMaxTier ? 'opacity-40' : ''
                }`} style={{ willChange: 'transform' }}>

                  {/* Glow Effect */}
                  {(isSelected && !mergeMode) && (
                    <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/30 to-purple-500/30 rounded-2xl blur-xl" />
                  )}
                  {isMergeSelected && (
                    <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 to-teal-500/30 rounded-2xl blur-xl" />
                  )}

                  <GameCard
                    character={cat}
                    selected={mergeMode ? isMergeSelected : isSelected}
                    onClick={() => { trackCardZoomed(cat.name, cat.rarity, cat.level); setZoomedCat(cat) }}
                    holographicMode="subtle"
                    disabled={false}
                  />

                  {/* Selection Circle - Top Left */}
                  {mergeMode ? (
                    /* Merge Selection Circle */
                    <motion.button
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isMergeIneligible || isMaxTier) return
                        handleMergeSelect(cat.instanceId)
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isMergeIneligible || isMaxTier) return
                        handleMergeSelect(cat.instanceId)
                      }}
                      disabled={isMergeIneligible || isMaxTier || (!isMergeSelected && selectedForMerge.length >= 3)}
                      className={`absolute top-2 left-2 z-20 w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                        isMergeSelected
                          ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.6)] border-2 border-cyan-300'
                          : isMergeIneligible || isMaxTier || selectedForMerge.length >= 3
                          ? 'bg-slate-700/50 text-slate-500 border-2 border-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/80 text-slate-300 border-2 border-cyan-600/50 hover:border-cyan-500 hover:bg-slate-700'
                      }`}
                      whileHover={!isMergeIneligible && !isMaxTier ? { scale: 1.1 } : {}}
                      whileTap={!isMergeIneligible && !isMaxTier ? { scale: 0.9 } : {}}
                    >
                      {isMergeSelected ? mergePosition : ''}
                    </motion.button>
                  ) : (
                    /* Battle Selection Checkbox */
                    <motion.button
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isSelected || selected.length < 3) {
                          toggle(cat.instanceId)
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isSelected || selected.length < 3) {
                          toggle(cat.instanceId)
                        }
                      }}
                      disabled={!isSelected && selected.length >= 3}
                      className={`absolute top-2 left-2 z-20 w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                        isSelected
                          ? 'bg-gold-500 text-slate-900 shadow-glow-gold border-2 border-gold-300'
                          : selected.length >= 3
                          ? 'bg-slate-700/50 text-slate-500 border-2 border-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/80 text-slate-300 border-2 border-slate-600 hover:border-gold-500 hover:bg-slate-700'
                      }`}
                      whileHover={isSelected || selected.length < 3 ? { scale: 1.1 } : {}}
                      whileTap={isSelected || selected.length < 3 ? { scale: 0.9 } : {}}
                    >
                      {isSelected ? battlePosition : ''}
                    </motion.button>
                  )}

                  {/* Favorite Star - Top Right (below delete when hovered) */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(cat.instanceId)
                    }}
                    className={`absolute top-14 right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg border-2 ${
                      isFavorite
                        ? 'bg-yellow-500 text-white border-yellow-300 opacity-100'
                        : 'bg-slate-800/80 text-slate-400 border-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFavorite ? 0 : 2}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </motion.button>

                  {/* Delete Icon - Top Right (Hover Only) */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Release ${cat.name}? This cannot be undone!`)) {
                        trackCatReleased(cat.name, cat.rarity, cat.level)
                        releaseCat(cat.instanceId)
                      }
                    }}
                    className="absolute top-2 right-2 z-20 w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg border-2 border-red-400"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* Merge Button - Fixed at Bottom */}
      <AnimatePresence>
        {mergeMode && selectedForMerge.length === 3 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <motion.button
              onClick={() => setShowMergeConfirm(true)}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-black text-lg tracking-wider uppercase shadow-2xl border-2 border-white/30"
              style={{ animation: 'merge-pulse 2s ease-in-out infinite' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              &#x2726; {(() => {
                const firstCat = cats.find(c => c.instanceId === selectedForMerge[0])
                return (firstCat?.eliteTier || 0) >= 1 ? 'MERGE INTO PRISMATIC' : 'MERGE INTO ELITE'
              })()}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge Confirmation Modal */}
      <AnimatePresence>
        {showMergeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setShowMergeConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-center text-cyan-400 mb-4 tracking-wider uppercase">
                Confirm Merge
              </h3>

              {/* Selected Cards Preview */}
              <div className="flex justify-center gap-2 mb-4">
                {selectedForMerge.map((id, i) => {
                  const cat = cats.find(c => c.instanceId === id)
                  if (!cat) return null
                  return (
                    <div key={id} className="text-center">
                      <div className="w-20 h-32 rounded-lg overflow-hidden border border-slate-600">
                        <GameCard character={cat} showStats={false} animate={false} holographicMode="none" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Lv.{cat.level}</span>
                    </div>
                  )
                })}
              </div>

              {/* Arrow */}
              <div className="text-center text-3xl text-cyan-400 mb-4">&#x2193;</div>

              {/* Result Preview */}
              {(() => {
                const firstCat = cats.find(c => c.instanceId === selectedForMerge[0])
                if (!firstCat) return null
                const currentTier = firstCat.eliteTier || 0
                const newTier = currentTier + 1
                const isPrismatic = newTier >= 2
                const multiplier = isPrismatic ? 1.35 : 1.20
                const highestLevel = Math.max(...selectedForMerge.map(id => cats.find(c => c.instanceId === id)?.level || 1))
                const baseCat = CATS.find(c => c.id === firstCat.id)
                const baseHp = baseCat?.health || firstCat.health
                const baseAtk = baseCat?.attack || firstCat.attack
                const boostHp = Math.floor((baseHp + (highestLevel - 1) * (baseHp * 0.15)) * multiplier)
                const boostAtk = Math.floor((baseAtk + (highestLevel - 1) * (baseAtk * 0.15)) * multiplier)

                return (
                  <div className="text-center mb-4">
                    <div className={`inline-block px-3 py-1 rounded-lg ${isPrismatic
                      ? 'bg-gradient-to-r from-yellow-500 via-cyan-500 to-purple-500'
                      : 'bg-gradient-to-r from-yellow-500 to-amber-400'
                    } mb-2`}>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {isPrismatic ? 'PRISMATIC' : 'ELITE'} {firstCat.name}
                      </span>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      <div className="text-center">
                        <span className="text-amber-400 font-black text-lg">{boostAtk}</span>
                        <span className="text-[10px] text-amber-300 block">ATK</span>
                      </div>
                      <div className="text-center">
                        <span className="text-emerald-400 font-black text-lg">{boostHp}</span>
                        <span className="text-[10px] text-emerald-300 block">HP</span>
                      </div>
                      <div className="text-center">
                        <span className="text-purple-400 font-black text-lg">{highestLevel}</span>
                        <span className="text-[10px] text-purple-300 block">LVL</span>
                      </div>
                    </div>
                    <p className="text-cyan-300 text-xs mt-2">+{isPrismatic ? '35' : '20'}% stats boost</p>
                  </div>
                )
              })()}

              {/* Warning */}
              <p className="text-red-400 text-center text-sm mb-4 font-semibold">
                This will permanently consume these 3 cats!
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowMergeConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-600 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleMergeConfirm}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black text-sm shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  &#x2726; Merge!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Zoom Modal */}
      <CardZoomModal
        cat={zoomedCat}
        isOpen={zoomedCat !== null}
        onClose={() => setZoomedCat(null)}
      />

      {/* Merge Celebration Modal */}
      <MergeCelebrationModal
        eliteCat={mergeResultCat}
        isOpen={showMergeCelebration}
        onClose={() => {
          setShowMergeCelebration(false)
          setMergeResultCat(null)
        }}
      />
    </div>
  )
}
