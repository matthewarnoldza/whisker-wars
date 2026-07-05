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
import { rarityStyle } from '../constants/rarity'
import { Button, Panel, RarityBadge } from '../components/ui'
import {
  BookIcon, MergeIcon, SwordsIcon, CardIcon, SearchIcon, StarIcon,
  HealIcon, SadCatIcon, CatIcon, GemIcon, TrashIcon, ChevronDownIcon,
} from '../icons'
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
  const colorblindMode = useGame(s => s.colorblindMode)

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
          return rarityStyle(b.rarity).order - rarityStyle(a.rarity).order
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
        <p className="text-white text-center font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 flex-wrap">
          {showCatadex ? (
            <>
              <BookIcon className="text-lg shrink-0" />
              Browse all {totalUniqueCats} cats. Undiscovered cats appear as silhouettes — use the right bait to find them!
            </>
          ) : mergeMode ? (
            <>
              <MergeIcon className="text-lg shrink-0" />
              Select 3 of the same cat to merge into an Elite! {selectedForMerge.length}/3 selected
            </>
          ) : (
            <>
              <SwordsIcon className="text-lg shrink-0" />
              Select up to 3 of your cats for battle by clicking the circles. Heal injured cats before sending them into combat!
            </>
          )}
        </p>
      </motion.div>

      {/* Compact Stats & Progress Bar */}
      <Panel elevation="flat" className="p-3 sm:p-4">
        {/* Mobile: 2x2 Grid, Desktop: Row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="font-bold text-ink-muted">
            <span className="text-ink">{cats.length}</span> cats
          </span>
          <span className="hidden sm:inline text-ink-faint">•</span>
          <span className="font-bold text-ink-muted">
            <span className="text-accent-300">{selected.length}/3</span> selected
          </span>
          <span className="hidden sm:inline text-ink-faint">•</span>
          <span className="font-bold text-ink-muted inline-flex items-center gap-1">
            <CardIcon className="text-arcane-300" /> <span className="text-arcane-300">{uniqueCatsCollected}/{totalUniqueCats}</span> unique
          </span>
          <span className="hidden sm:inline text-ink-faint">•</span>
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 mt-1 sm:mt-0">
            <span className="font-bold text-accent-300 text-xs sm:text-sm">{collectionProgress}%</span>
            {/* Progress Bar (Inline) */}
            <div className="flex-1 sm:w-32 bg-surface-raised/80 rounded-full h-2 overflow-hidden border border-surface-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${collectionProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-accent-300 to-accent-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* Compact Toolbar */}
      <div className="premium-card rounded-xl p-4 space-y-3">
        {/* Row 1: Search, Favorites, Heal All */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Bar */}
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search cats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-raised/80 border border-surface-border rounded-lg text-ink text-sm placeholder-ink-faint focus:outline-none focus-visible:shadow-focus-gold focus:border-accent-500 transition-all"
            />
          </div>

          {/* Favorites Toggle */}
          <Button
            variant={showFavoritesOnly ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="whitespace-nowrap"
          >
            <StarIcon /> Favorites
          </Button>

          {/* Heal All Button */}
          <motion.button
            onClick={() => {
              const catsNeedingHeal = cats.filter(c => c.currentHp < c.maxHp).length
              const success = healAllCats()
              if (!success) {
                const msg = coins < 25 ? 'Not enough coins! Need 25 coins' : 'All cats are already at full health!'
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
            <span className="relative z-10 inline-flex items-center gap-1.5"><HealIcon /> Heal All (25)</span>
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
          <Button
            variant={mergeMode ? 'primary' : 'ghost'}
            size="sm"
            onClick={handleMergeToggle}
            className="whitespace-nowrap"
          >
            <MergeIcon /> Merge
          </Button>

          {/* Catadex Toggle */}
          <Button
            variant={showCatadex ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => { setShowCatadex(v => !v); if (mergeMode) handleMergeToggle() }}
            className="whitespace-nowrap"
          >
            <BookIcon /> Catadex
          </Button>
        </div>

        {/* Row 2: Sort & Filter */}
        <div className="flex flex-col lg:flex-row gap-3 pt-3 border-t border-slate-800/30">
          {/* Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider whitespace-nowrap">Sort:</span>
            {(['level', 'rarity', 'name', 'hp', 'attack'] as SortOption[]).map(option => (
              <Button
                key={option}
                variant={sortBy === option ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleSortChange(option)}
                className="px-3 py-1 text-[11px]"
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-surface-border" />

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider whitespace-nowrap">Filter:</span>
            {(['all', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'] as FilterOption[]).map(
              option => (
                <Button
                  key={option}
                  variant={filterBy === option ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleFilterChange(option)}
                  className="px-3 py-1 text-[11px]"
                >
                  {option === 'all' ? 'All' : option}
                </Button>
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
                      ? `${rarityStyle(cat.rarity).border} bg-surface-deep/90`
                      : 'border-surface-border bg-surface-deep/80'
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
                      {discovered ? (
                        <RarityBadge rarity={cat.rarity} size={11} colorblindMode={colorblindMode} />
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                          {cat.rarity}
                        </span>
                      )}
                      {discovered && bestInstance && (
                        <span className="text-[10px] font-bold text-ink-subtle">Lv.{bestInstance.level}</span>
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
              <SearchIcon className="text-4xl text-ink-subtle mx-auto" />
              <p className="text-ink-subtle mt-2">No cats match your filter.</p>
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
          <SadCatIcon className="text-8xl mb-6 animate-float text-ink-subtle mx-auto" />
          <h3 className="text-3xl font-bold text-ink-muted mb-3 font-heading">
            {filterBy === 'all' ? 'No cats yet!' : `No ${filterBy} cats found`}
          </h3>
          <p className="text-ink-faint text-lg">
            {filterBy === 'all'
              ? 'Visit the Baiting Area to befriend some cats!'
              : 'Try a different filter or catch more cats!'}
          </p>
        </motion.div>
      )}

      {/* Merge mode empty state */}
      {!showCatadex && mergeMode && mergeCandidates.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
          <CatIcon className="text-6xl mb-4 text-ink-subtle mx-auto" />
          <h3 className="text-xl font-bold text-ink-muted font-heading">No cats ready to merge</h3>
          <p className="text-ink-faint text-sm">You need 3 of the same cat (and tier) to merge. Catch more duplicates!</p>
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
                      <GemIcon className="text-[10px] text-white" />
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
                    <StarIcon className="h-5 w-5" size={20} />
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
                    <TrashIcon className="h-5 w-5" size={20} />
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
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-black text-lg tracking-wider uppercase shadow-2xl border-2 border-white/30 inline-flex items-center gap-2"
              style={{ animation: 'merge-pulse 2s ease-in-out infinite' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MergeIcon /> {(() => {
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
              <div className="flex justify-center text-3xl text-cyan-400 mb-4"><ChevronDownIcon /></div>

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
                <Button variant="secondary" fullWidth onClick={() => setShowMergeConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" fullWidth onClick={handleMergeConfirm}>
                  <MergeIcon /> Merge!
                </Button>
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
