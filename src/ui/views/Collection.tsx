import Card from '../components/Card'
import GameCard from '../components/GameCard'
import Avatar from '../components/Avatar'
import StatBar from '../components/StatBar'
import CardZoomModal from '../components/CardZoomModal'
import MergeCelebrationModal from '../components/MergeCelebrationModal'
import { useGame } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'
import { containerVariants, cardVariants, coinVariants } from '../animations'
import { useState, useMemo, useCallback } from 'react'
import type { OwnedCat } from '../../game/store'
import type { Rarity } from '../../game/data'
import { CATS, BAITS, rarityByTier } from '../../game/data'
import {
  ELITE_TIER_1_MULTIPLIER,
  ELITE_TIER_2_MULTIPLIER,
  RELEASE_VALUES,
  calculateStatBoost,
  getAscendedBaseStat,
} from '../../game/constants'
import { RARITY_TEXT_COLORS, RARITY_BORDERS } from '../constants/rarity'
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
import { playSound } from '../../utils/sound'

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
  const soundEnabled = useGame(s => s.soundEnabled)

  const [sortBy, setSortBy] = useState<SortOption>('level')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [zoomedCat, setZoomedCat] = useState<OwnedCat | null>(null)
  const [healFlash, setHealFlash] = useState(false)
  const [healMessage, setHealMessage] = useState<string | null>(null)
  const [showCatadex, setShowCatadex] = useState(false)
  const [coinPopups, setCoinPopups] = useState<{ id: number; value: number; x: number; y: number }[]>([])

  const showCoinPopup = useCallback((value: number, x: number, y: number) => {
    const id = Date.now()
    setCoinPopups(prev => [...prev, { id, value, x, y }])
    setTimeout(() => setCoinPopups(prev => prev.filter(p => p.id !== id)), 1500)
  }, [])

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

  // Cats eligible for merge: only cats that have 3+ duplicates (same id + tier), sorted by name
  const mergeCandidates = useMemo(() => {
    const groups = new Map<string, typeof cats>()
    cats.forEach(cat => {
      if ((cat.eliteTier || 0) >= 2) return // Can't merge max tier
      const key = `${cat.id}:${cat.eliteTier || 0}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(cat)
    })
    const eligible: typeof cats = []
    groups.forEach(group => {
      if (group.length >= 3) eligible.push(...group)
    })
    eligible.sort((a, b) => a.name.localeCompare(b.name))
    return eligible
  }, [cats])

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

  const totalUniqueCats = CATS.length

  const collectionProgress = useMemo(() => {
    return Math.round((uniqueCatsCollected / totalUniqueCats) * 100)
  }, [uniqueCatsCollected, totalUniqueCats])

  // Catadex: set of discovered cat base IDs
  const discoveredCatIds = useMemo(() => new Set(cats.map(c => c.id)), [cats])

  // Map rarity → minimum bait tier that can catch it
  const baitTiersForRarity = useMemo(() => {
    const map: Record<string, { minTier: number; baitNames: string[] }> = {}
    const rarities: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical']
    for (const r of rarities) {
      const tiers: number[] = []
      for (let t = 1; t <= 6; t++) {
        if (rarityByTier(t).includes(r)) tiers.push(t)
      }
      const minTier = Math.min(...tiers)
      const baitNames = BAITS.filter(b => tiers.includes(b.tier)).map(b => b.name)
      map[r] = { minTier, baitNames }
    }
    return map
  }, [])

  // Catadex: filter CATS by rarity if a filter is active
  const catadexCats = useMemo(() => {
    let result = [...CATS]
    if (filterBy !== 'all') {
      result = result.filter(c => c.rarity === filterBy)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c => {
        if (discoveredCatIds.has(c.id)) return c.name.toLowerCase().includes(query)
        return false // Can't search for undiscovered cats
      })
    }
    return result
  }, [filterBy, searchQuery, discoveredCatIds])

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
        className={`p-4 rounded-xl ${showCatadex
          ? 'bg-gradient-to-r from-indigo-500/60 to-violet-500/60 border border-indigo-500/50'
          : mergeMode
          ? 'bg-gradient-to-r from-cyan-500/60 to-teal-500/60 border border-cyan-500/50'
          : 'bg-gradient-to-r from-purple-500/60 to-pink-500/60 border border-purple-500/50'
        }`}
      >
        <p className="text-white text-center font-bold text-sm sm:text-base">
          {showCatadex ? (
            <>
              <span className="text-lg mr-2">📖</span>
              Browse all {totalUniqueCats} cats. Undiscovered cats appear as silhouettes — use the right bait to find them!
            </>
          ) : mergeMode ? (
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
            <div className="flex-1 sm:w-32 bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
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
            className="flex-1 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
          />

          {/* Favorites Toggle */}
          <motion.button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              showFavoritesOnly
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-pink-500/50 hover:text-pink-300'
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
                const msg = coins < 25 ? 'Not enough coins! Need 25💰' : 'All cats are already at full health!'
                setHealMessage(msg)
                setTimeout(() => setHealMessage(null), 2500)
              } else {
                trackHealAll(25, catsNeedingHeal)
                trackCoinsSpent('heal_all', 25)
                if (soundEnabled) playSound('heal')
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

          {/* Heal Message Toast — fixed to top center, above everything */}
          <AnimatePresence>
            {healMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-critical whitespace-nowrap"
              >
                <span className="text-sm font-medium text-slate-200">{healMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Merge Mode Toggle */}
          <motion.button
            onClick={handleMergeToggle}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              mergeMode
                ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-900 shadow-lg'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-yellow-500/50 hover:text-yellow-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            &#x2726; Merge
          </motion.button>

          {/* Catadex Toggle */}
          <motion.button
            onClick={() => { setShowCatadex(v => !v); if (mergeMode) handleMergeToggle() }}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              showCatadex
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-indigo-500/50 hover:text-indigo-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Catadex
          </motion.button>
        </div>

        {/* Row 2: Sort & Filter */}
        <div className="flex flex-col lg:flex-row gap-3 pt-3 border-t border-slate-800/30">
          {/* Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sort:</span>
            {(['level', 'rarity', 'name', 'hp', 'attack'] as SortOption[]).map(option => (
              <motion.button
                key={option}
                onClick={() => handleSortChange(option)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${sortBy === option
                  ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-slate-900 shadow-md'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-gold-500/50 hover:text-gold-300'
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
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-purple-500/50 hover:text-purple-300'
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

      {/* Catadex View */}
      {showCatadex && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Catadex Header */}
          <div className="bg-gradient-to-r from-indigo-500/60 to-violet-500/60 border border-indigo-500/50 rounded-xl p-4 text-center">
            <h3 className="text-lg font-black text-indigo-300 tracking-wider uppercase mb-1">Catadex</h3>
            <p className="text-sm text-slate-400">
              Discovered <span className="text-indigo-400 font-bold">{uniqueCatsCollected}</span> of <span className="text-indigo-400 font-bold">{totalUniqueCats}</span> cats
            </p>
          </div>

          {/* Catadex Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {catadexCats.map(cat => {
              const discovered = discoveredCatIds.has(cat.id)
              const baitInfo = baitTiersForRarity[cat.rarity]
              const ownedInstances = cats.filter(c => c.id === cat.id)
              const bestInstance = ownedInstances.length > 0
                ? ownedInstances.reduce((best, c) => c.level > best.level ? c : best, ownedInstances[0])
                : null

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    discovered
                      ? `${rarityColors[cat.rarity]} bg-slate-900/90`
                      : 'border-slate-700 bg-slate-900/80'
                  }`}
                >
                  {/* Cat Image */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={discovered ? cat.name : 'Unknown cat'}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover ${!discovered ? 'brightness-0 opacity-40' : ''}`}
                      />
                    ) : (
                      <div className={`w-full h-full bg-slate-800 ${!discovered ? 'opacity-40' : ''}`} />
                    )}

                    {/* Undiscovered Overlay */}
                    {!discovered && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl text-slate-600 font-black">?</span>
                      </div>
                    )}

                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

                    {/* Owned count badge */}
                    {discovered && ownedInstances.length > 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 border border-slate-600">
                        <span className="text-[10px] font-bold text-slate-300">x{ownedInstances.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="p-2.5 space-y-1.5">
                    {/* Name */}
                    <h4 className={`font-black text-sm truncate ${discovered ? 'text-white' : 'text-slate-500'}`}>
                      {discovered ? cat.name : '???'}
                    </h4>

                    {/* Rarity */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        discovered ? rarityColors[cat.rarity].split(' ')[0] : 'text-slate-600'
                      }`}>
                        {cat.rarity}
                      </span>
                      {discovered && bestInstance && (
                        <span className="text-[10px] font-bold text-slate-400">Lv.{bestInstance.level}</span>
                      )}
                    </div>

                    {/* Ability (only if discovered) */}
                    {discovered && (
                      <div className="px-2 py-1 bg-black/70 rounded-md border border-gold-500/30">
                        <span className="text-[9px] font-bold text-gold-400 uppercase">{cat.ability.name}</span>
                      </div>
                    )}

                    {/* Bait hint */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-500">
                        {discovered ? 'Catch with:' : 'Requires:'}
                      </span>
                      <span className="text-[9px] font-bold text-cyan-400 truncate">
                        Tier {baitInfo.minTier}+ bait
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {catadexCats.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl">🔍</span>
              <p className="text-slate-400 mt-2">No cats match your filter.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!showCatadex && filteredAndSortedCats.length === 0 && (
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

      {/* Merge mode empty state */}
      {!showCatadex && mergeMode && mergeCandidates.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
          <div className="text-6xl mb-4">🐱</div>
          <h3 className="text-xl font-bold text-slate-300">No cats ready to merge</h3>
          <p className="text-slate-500 text-sm">You need 3 of the same cat (and tier) to merge. Catch more duplicates!</p>
        </motion.div>
      )}

      {/* Cats Grid */}
      {!showCatadex && (!mergeMode || mergeCandidates.length > 0) && <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {(mergeMode ? mergeCandidates : filteredAndSortedCats).map(cat => {
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
                <div className={`relative scale-[0.85] sm:scale-100 origin-top -mb-12 sm:mb-0 transition-opacity ${
                  isMergeIneligible || isMaxTier ? 'opacity-40' : ''
                }`}>

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
                      className={`absolute top-2 left-2 z-card-overlay w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
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
                      className={`absolute top-2 left-2 z-card-overlay w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
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

                  {/* Stone Equipped Indicator */}
                  {cat.equipment?.stone && (
                    <div className="absolute bottom-2 left-2 z-card-overlay px-1.5 py-0.5 rounded-md bg-emerald-600/90 border border-emerald-400/50 shadow-lg">
                      <span className="text-[9px] font-black text-white">💎</span>
                    </div>
                  )}

                  {/* Favorite Star - Top Right (below delete when hovered) */}
                  <motion.button
                    aria-label={isFavorite ? `Remove ${cat.name} from favorites` : `Add ${cat.name} to favorites`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(cat.instanceId)
                    }}
                    className={`absolute top-14 right-2 z-card-overlay w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg border-2 ${
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
                    aria-label={`Release ${cat.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const releaseValue = RELEASE_VALUES[cat.rarity] ?? 0
                      if (window.confirm(`Release ${cat.name} for ${releaseValue} coins?`)) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const earned = releaseCat(cat.instanceId)
                        showCoinPopup(earned, rect.left + rect.width / 2, rect.top)
                        if (soundEnabled) playSound('coinEarned')
                        trackCatReleased(cat.name, cat.rarity, cat.level)
                      }
                    }}
                    className="absolute top-2 right-2 z-card-overlay w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg border-2 border-red-400"
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
      </motion.div>}

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
            className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
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
                const multiplier = isPrismatic ? ELITE_TIER_2_MULTIPLIER : ELITE_TIER_1_MULTIPLIER
                const highestLevel = Math.max(...selectedForMerge.map(id => cats.find(c => c.instanceId === id)?.level || 1))
                const highestAscension = Math.max(...selectedForMerge.map(id => cats.find(c => c.instanceId === id)?.ascension || 0))
                const baseCat = CATS.find(c => c.id === firstCat.id)
                const baseHp = baseCat?.health || firstCat.health
                const baseAtk = baseCat?.attack || firstCat.attack
                const boostHp = Math.floor(calculateStatBoost(getAscendedBaseStat(baseHp, highestAscension), highestLevel) * multiplier)
                const boostAtk = Math.floor(calculateStatBoost(getAscendedBaseStat(baseAtk, highestAscension), highestLevel) * multiplier)

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
                    <p className="text-cyan-300 text-xs mt-2">+{isPrismatic ? '50' : '20'}% stats boost</p>
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

      {/* Coin popups on release */}
      <AnimatePresence>
        {coinPopups.map(({ id, value, x, y }) => (
          <motion.div
            key={id}
            variants={coinVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed z-50 text-3xl font-black text-yellow-400 pointer-events-none"
            style={{ left: x, top: y, textShadow: '0 0 10px rgba(0,0,0,0.8)' }}
          >
            +{value}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
