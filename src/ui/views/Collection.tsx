import Card from '../components/Card'
import GameCard from '../components/GameCard'
import Avatar from '../components/Avatar'
import StatBar from '../components/StatBar'
import CardZoomModal from '../components/CardZoomModal'
import { useGame } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'
import { containerVariants, cardVariants } from '../animations'
import { useState, useMemo } from 'react'
import type { OwnedCat } from '../../game/store'
import type { Rarity } from '../../game/data'
import { CATS } from '../../game/data'

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
  const coins = useGame(s => s.coins)

  const [sortBy, setSortBy] = useState<SortOption>('level')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [zoomedCat, setZoomedCat] = useState<OwnedCat | null>(null)

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
      {/* Compact Stats & Progress Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-bold text-slate-300">
            <span className="text-white">{cats.length}</span> cats
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-slate-300">
            <span className="text-gold-400">{selected.length}/3</span> selected
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-slate-300">
            🎴 <span className="text-purple-400">{uniqueCatsCollected}/{totalUniqueCats}</span> unique
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-gold-400">{collectionProgress}% complete</span>
        </div>

        {/* Progress Bar (Inline) */}
        <div className="w-full sm:w-48 bg-slate-800/50 rounded-full h-2 overflow-hidden border border-slate-700/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${collectionProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-gold-500 rounded-full"
          />
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
              const success = healAllCats()
              if (!success) {
                alert('Not enough coins! Need 20 coins to heal all cats.')
              }
            }}
            disabled={coins < 20}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              coins < 20
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg'
            }`}
            whileHover={coins >= 20 ? { scale: 1.05 } : {}}
            whileTap={coins >= 20 ? { scale: 0.95 } : {}}
          >
            💊 Heal All (20💰)
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
                onClick={() => setSortBy(option)}
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
                  onClick={() => setFilterBy(option)}
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
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredAndSortedCats.map(cat => {
            const isSelected = selected.includes(cat.instanceId)
            const isFavorite = favorites.includes(cat.instanceId)
            const battlePosition = selected.indexOf(cat.instanceId) + 1 // 1, 2, 3 or 0 if not selected
            const hpPercent = (cat.currentHp / cat.maxHp) * 100
            const xpForNext = calculateXpForNextLevel(cat.level)
            const xpPercent = cat.level >= 10 ? 100 : (cat.xp / xpForNext) * 100

            return (
              <motion.div
                key={cat.instanceId}
                variants={cardVariants}
                layout
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                className="relative group"
                style={{ perspective: '1000px' }}
              >
                <motion.div
                  className={`relative transition-all duration-300 ${isSelected ? 'scale-105' : 'hover:scale-105'
                    }`}
                  whileHover={{ rotateY: 5, rotateX: -5 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Glow Effect */}
                  {isSelected && (
                    <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/30 to-purple-500/30 rounded-2xl blur-xl animate-pulse-glow" />
                  )}

                  <GameCard
                    character={cat}
                    selected={isSelected}
                    onClick={() => setZoomedCat(cat)}
                    disabled={false}
                  />

                  {/* Battle Selection Checkbox - Top Left */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(cat.instanceId)
                    }}
                    disabled={!isSelected && selected.length >= 3}
                    className={`absolute top-2 left-2 z-20 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
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
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* Card Zoom Modal */}
      <CardZoomModal
        cat={zoomedCat}
        isOpen={zoomedCat !== null}
        onClose={() => setZoomedCat(null)}
      />
    </div>
  )
}
