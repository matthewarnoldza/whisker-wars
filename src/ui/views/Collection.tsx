import Card from '../components/Card'
import GameCard from '../components/GameCard'
import Avatar from '../components/Avatar'
import StatBar from '../components/StatBar'
import { useGame } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'
import { containerVariants, cardVariants } from '../animations'
import { useState, useMemo } from 'react'
import type { OwnedCat } from '../../game/store'
import type { Rarity } from '../../game/data'

type SortOption = 'name' | 'level' | 'rarity' | 'hp' | 'attack'
type FilterOption = 'all' | Rarity

export default function Collection() {
  const cats = useGame(s => s.owned)
  const toggle = useGame(s => s.toggleSelectCat)
  const selected = useGame(s => s.selectedForBattle)
  const healAllCats = useGame(s => s.healAllCats)
  const releaseCat = useGame(s => s.releaseCat)
  const coins = useGame(s => s.coins)

  const [sortBy, setSortBy] = useState<SortOption>('level')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')

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

  const filteredAndSortedCats = useMemo(() => {
    let result = [...cats]

    // Filter
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
  }, [cats, sortBy, filterBy])

  const calculateXpForNextLevel = (level: number): number => {
    return Math.floor(50 * Math.pow(1.5, level - 1))
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="premium-card rounded-2xl p-8 shimmer">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent mb-2 font-heading">
              📚 Your Cat Collection
            </h2>
            <p className="text-slate-400 text-lg">
              <span className="font-bold text-white">{cats.length}</span> cats collected
              <span className="mx-2 text-slate-600">•</span>
              <span className="font-bold text-gold-400">{selected.length}/3</span> selected for battle
            </p>
          </div>

          <motion.button
            onClick={() => {
              const success = healAllCats()
              if (!success) {
                alert('Not enough coins! Need 20 coins to heal all cats.')
              }
            }}
            disabled={coins < 20}
            className={`px-8 py-4 font-bold rounded-xl shadow-glow-purple hover:shadow-premium-lg transition-all ${
              coins < 20
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
            }`}
            whileHover={coins >= 20 ? { scale: 1.05, y: -2 } : {}}
            whileTap={coins >= 20 ? { scale: 0.95 } : {}}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">💊</span>
              Heal All Cats
              <span className="text-sm opacity-80">(20 💰)</span>
            </span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sort */}
            <div>
              <label className="text-sm font-bold text-slate-300 mb-3 block tracking-wider uppercase">Sort By</label>
              <div className="flex flex-wrap gap-2">
                {(['level', 'rarity', 'name', 'hp', 'attack'] as SortOption[]).map(option => (
                  <motion.button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === option
                      ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-slate-900 shadow-glow-gold'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-gold-500/50 hover:text-gold-300'
                      }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div>
              <label className="text-sm font-bold text-slate-300 mb-3 block tracking-wider uppercase">Filter By Rarity</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'] as FilterOption[]).map(
                  option => (
                    <motion.button
                      key={option}
                      onClick={() => setFilterBy(option)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterBy === option
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow-purple'
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
                    onClick={() => toggle(cat.instanceId)}
                    disabled={!isSelected && selected.length >= 3}
                  />

                  {/* Selection Overlay */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none'
                    }`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggle(cat.instanceId); }}
                      className={`px-8 py-3 rounded-full font-black shadow-premium-lg transform translate-y-8 border-2 border-white/20 transition-all hover:scale-110 active:scale-95 ${isSelected
                          ? 'bg-red-600 text-white hover:bg-red-500 shadow-glow-purple'
                          : 'bg-gold-500 text-slate-900 hover:bg-gold-400 shadow-glow-gold'
                        }`}
                    >
                      {isSelected ? 'REMOVE' : 'SELECT'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Release ${cat.name}? This cannot be undone!`)) {
                          releaseCat(cat.instanceId);
                        }
                      }}
                      className="px-6 py-2 rounded-full font-bold shadow-lg transform translate-y-8 border border-white/20 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-all hover:scale-105 active:scale-95"
                    >
                      Release
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
