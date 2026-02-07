import { useState, useMemo } from 'react'
import { useGame } from '../../game/store'
import { EQUIPMENT, STONES, isStone } from '../../game/items'
import type { Equipment, Stone } from '../../game/items'
import { motion, AnimatePresence } from 'framer-motion'
import { containerVariants, cardVariants } from '../animations'
import { playSound } from '../../utils/sound'

type Tab = 'items' | 'shop'
type Filter = 'all' | 'weapon' | 'accessory' | 'stone'
type Sort = 'rarity' | 'name'

const RARITY_ORDER: Record<string, number> = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 }
const RARITY_COLORS: Record<string, string> = {
  Common: 'from-slate-500 to-slate-600',
  Uncommon: 'from-green-500 to-emerald-600',
  Rare: 'from-blue-500 to-cyan-600',
  Epic: 'from-purple-500 to-violet-600',
  Legendary: 'from-amber-500 to-yellow-600',
}
const RARITY_BORDER: Record<string, string> = {
  Common: 'border-slate-500/40',
  Uncommon: 'border-green-500/40',
  Rare: 'border-blue-500/40',
  Epic: 'border-purple-500/40',
  Legendary: 'border-amber-500/40',
}
const RARITY_GLOW: Record<string, string> = {
  Common: '',
  Uncommon: 'shadow-[0_0_12px_rgba(34,197,94,0.2)]',
  Rare: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  Epic: 'shadow-[0_0_16px_rgba(168,85,247,0.3)]',
  Legendary: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
}

type InventoryItem = { type: 'equipment'; data: Equipment } | { type: 'stone'; data: Stone }

function ItemImage({ item, size = 'md' }: { item: InventoryItem; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-16 h-16' : 'w-24 h-24'
  const url = item.type === 'equipment' ? item.data.iconUrl : item.data.iconUrl
  const fallback = item.type === 'equipment'
    ? (item.data.slot === 'weapon' ? '⚔️' : '💎')
    : '💎'

  if (imgError || !url) {
    return <span className={`${sizeClass} flex items-center justify-center text-3xl`}>{fallback}</span>
  }
  return (
    <img
      src={url}
      alt={item.type === 'equipment' ? item.data.name : item.data.name}
      className={`${sizeClass} object-contain`}
      onError={() => setImgError(true)}
    />
  )
}

export default function Inventory() {
  const inventory = useGame(s => s.inventory)
  const coins = useGame(s => s.coins)
  const owned = useGame(s => s.owned)
  const buyEquipment = useGame(s => s.buyEquipment)
  const equipItem = useGame(s => s.equipItem)
  const unequipItem = useGame(s => s.unequipItem)
  const equipStone = useGame(s => s.equipStone)
  const unequipStone = useGame(s => s.unequipStone)
  const soundEnabled = useGame(s => s.soundEnabled)
  const selectedForBattle = useGame(s => s.selectedForBattle)

  const [tab, setTab] = useState<Tab>('items')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('rarity')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showEquipPanel, setShowEquipPanel] = useState(false)

  // Build inventory items list
  const inventoryItems = useMemo(() => {
    const items: (InventoryItem & { qty: number })[] = []

    // Equipment
    for (const equip of EQUIPMENT) {
      const qty = inventory[equip.id] || 0
      // Also count equipped on cats
      const equippedCount = owned.filter(c =>
        c.equipment?.weapon === equip.id || c.equipment?.accessory === equip.id
      ).length
      if (qty > 0 || equippedCount > 0) {
        items.push({ type: 'equipment', data: equip, qty })
      }
    }

    // Stones
    for (const stone of STONES) {
      const qty = inventory[stone.id] || 0
      const equippedCount = owned.filter(c => c.equipment?.stone === stone.id).length
      if (qty > 0 || equippedCount > 0) {
        items.push({ type: 'stone', data: stone, qty })
      }
    }

    return items
  }, [inventory, owned])

  // Filter and sort
  const filteredItems = useMemo(() => {
    let result = [...inventoryItems]

    if (filter === 'weapon') result = result.filter(i => i.type === 'equipment' && i.data.slot === 'weapon')
    else if (filter === 'accessory') result = result.filter(i => i.type === 'equipment' && i.data.slot === 'accessory')
    else if (filter === 'stone') result = result.filter(i => i.type === 'stone')

    if (sort === 'rarity') {
      result.sort((a, b) => {
        const ra = a.type === 'equipment' ? RARITY_ORDER[a.data.rarity] : 5
        const rb = b.type === 'equipment' ? RARITY_ORDER[b.data.rarity] : 5
        return rb - ra
      })
    } else {
      result.sort((a, b) => {
        const na = a.type === 'equipment' ? a.data.name : a.data.name
        const nb = b.type === 'equipment' ? b.data.name : b.data.name
        return na.localeCompare(nb)
      })
    }
    return result
  }, [inventoryItems, filter, sort])

  // Stats
  const totalOwned = inventoryItems.reduce((sum, i) => sum + i.qty, 0)
  const totalEquipped = owned.reduce((sum, c) => {
    let count = 0
    if (c.equipment?.weapon) count++
    if (c.equipment?.accessory) count++
    if (c.equipment?.stone) count++
    return sum + count
  }, 0)

  // Cats that can equip the selected item
  const equippableCats = useMemo(() => {
    if (!selectedItem) return []
    return owned.filter(c => c.currentHp > 0 || true) // all owned cats
  }, [selectedItem, owned])

  // Which cats have this item equipped
  const catsWithItem = useMemo(() => {
    if (!selectedItem) return []
    if (selectedItem.type === 'equipment') {
      const slot = selectedItem.data.slot
      return owned.filter(c =>
        slot === 'weapon' ? c.equipment?.weapon === selectedItem.data.id : c.equipment?.accessory === selectedItem.data.id
      )
    } else {
      return owned.filter(c => c.equipment?.stone === selectedItem.data.id)
    }
  }, [selectedItem, owned])

  const handleBuy = (equipId: string) => {
    const success = buyEquipment(equipId)
    if (success && soundEnabled) playSound('coinEarned')
  }

  const handleEquip = (catInstanceId: string) => {
    if (!selectedItem) return
    if (selectedItem.type === 'equipment') {
      equipItem(catInstanceId, selectedItem.data.id)
    } else {
      equipStone(catInstanceId, selectedItem.data.id)
    }
    if (soundEnabled) playSound('equipDrop')
  }

  const handleUnequip = (catInstanceId: string) => {
    if (!selectedItem) return
    if (selectedItem.type === 'equipment') {
      unequipItem(catInstanceId, selectedItem.data.slot)
    } else {
      unequipStone(catInstanceId)
    }
    if (soundEnabled) playSound('buttonClick')
  }

  // Shop items
  const shopItems = useMemo(() => {
    const buyable = EQUIPMENT.filter(e => e.cost > 0)
      .sort((a, b) => a.cost - b.cost)
    const dropOnly = EQUIPMENT.filter(e => e.cost === 0)
      .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])
    return { buyable, dropOnly }
  }, [])

  return (
    <div className="space-y-4">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-amber-500/60 to-orange-500/60 border border-amber-500/50"
      >
        <p className="text-white font-semibold text-center">
          <span className="text-lg mr-2">🎒</span>
          Manage your equipment, stones, and shop for new gear!
        </p>
      </motion.div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            <span className="text-white font-bold">{totalOwned}</span> in bag
          </span>
          <span className="text-slate-400">
            <span className="text-white font-bold">{totalEquipped}</span> equipped
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold text-gold-400">
          <span>🪙</span> {coins.toLocaleString()}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {(['items', 'shop'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedItem(null) }}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
              tab === t
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {t === 'items' ? '🎒 My Items' : '🛒 Shop'}
          </button>
        ))}
      </div>

      {/* My Items Tab */}
      {tab === 'items' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'weapon', 'accessory', 'stone'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  filter === f
                    ? 'bg-amber-500/50 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'weapon' ? '⚔️ Weapons' : f === 'accessory' ? '💎 Accessories' : '🔮 Stones'}
              </button>
            ))}
            <div className="ml-auto">
              <select
                value={sort}
                onChange={e => setSort(e.target.value as Sort)}
                className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-slate-700"
              >
                <option value="rarity">Sort: Rarity</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-5xl mb-3">📦</div>
              <p className="font-semibold">No items yet</p>
              <p className="text-sm mt-1">Win battles to earn equipment drops!</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {filteredItems.map(item => {
                const id = item.type === 'equipment' ? item.data.id : item.data.id
                const name = item.type === 'equipment' ? item.data.name : item.data.name
                const rarity = item.type === 'equipment' ? item.data.rarity : 'Legendary'
                const isSelected = selectedItem && (
                  selectedItem.type === item.type &&
                  (selectedItem.type === 'equipment' ? selectedItem.data.id === id : selectedItem.data.id === id)
                )
                const equippedOn = owned.filter(c => {
                  if (item.type === 'equipment') {
                    return item.data.slot === 'weapon'
                      ? c.equipment?.weapon === id
                      : c.equipment?.accessory === id
                  }
                  return c.equipment?.stone === id
                }).length

                return (
                  <motion.button
                    key={`${item.type}-${id}`}
                    variants={cardVariants}
                    onClick={() => {
                      setSelectedItem(isSelected ? null : item)
                      setShowEquipPanel(false)
                      if (soundEnabled) playSound('buttonClick')
                    }}
                    className={`relative p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/50'
                        : `${RARITY_BORDER[rarity]} bg-slate-800/80 hover:bg-slate-800/90`
                    } ${RARITY_GLOW[rarity]}`}
                  >
                    {/* Quantity badge */}
                    {item.qty > 0 && (
                      <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        x{item.qty}
                      </div>
                    )}
                    {equippedOn > 0 && (
                      <div className="absolute top-2 left-2 bg-green-600/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        Equipped
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-2 pt-2">
                      <ItemImage item={item} size="md" />
                      <div className="text-center">
                        <div className="text-white font-bold text-xs leading-tight">{name}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 bg-gradient-to-r ${RARITY_COLORS[rarity]} bg-clip-text text-transparent`}>
                          {item.type === 'equipment' ? item.data.rarity : item.data.element}
                        </div>
                        {item.type === 'equipment' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.data.atkBonus > 0 && <span className="text-red-400">+{item.data.atkBonus} ATK</span>}
                            {item.data.atkBonus > 0 && item.data.hpBonus > 0 && ' '}
                            {item.data.hpBonus > 0 && <span className="text-green-400">+{item.data.hpBonus} HP</span>}
                          </div>
                        )}
                        {item.type === 'stone' && (
                          <div className="text-[10px] text-slate-500 mt-0.5">Stone</div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}

          {/* Selected Item Detail Panel */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700"
              >
                <div className="flex items-start gap-4">
                  <ItemImage item={selectedItem} size="lg" />
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white">
                      {selectedItem.type === 'equipment' ? selectedItem.data.name : selectedItem.data.name}
                    </h3>
                    <div className={`text-xs font-bold uppercase bg-gradient-to-r ${
                      RARITY_COLORS[selectedItem.type === 'equipment' ? selectedItem.data.rarity : 'Legendary']
                    } bg-clip-text text-transparent`}>
                      {selectedItem.type === 'equipment'
                        ? `${selectedItem.data.rarity} ${selectedItem.data.slot === 'weapon' ? 'Weapon' : 'Accessory'}`
                        : `${selectedItem.data.element} Stone`
                      }
                    </div>
                    {selectedItem.type === 'equipment' && (
                      <div className="text-sm text-slate-300 mt-1">{selectedItem.data.description}</div>
                    )}
                    {selectedItem.type === 'stone' && (
                      <div className="text-sm text-slate-300 mt-1">{selectedItem.data.effect}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      In bag: {inventory[selectedItem.type === 'equipment' ? selectedItem.data.id : selectedItem.data.id] || 0}
                    </div>
                  </div>
                </div>

                {/* Equipped on cats */}
                {catsWithItem.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400 font-bold uppercase mb-2">Equipped on</div>
                    <div className="flex flex-wrap gap-2">
                      {catsWithItem.map(cat => (
                        <div key={cat.instanceId} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/80 rounded-lg text-xs">
                          <span className="text-white font-bold">{cat.name}</span>
                          <span className="text-slate-500">Lv.{cat.level}</span>
                          <button
                            onClick={() => handleUnequip(cat.instanceId)}
                            className="text-red-400 hover:text-red-300 font-bold ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equip button */}
                {(inventory[selectedItem.type === 'equipment' ? selectedItem.data.id : selectedItem.data.id] || 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <button
                      onClick={() => setShowEquipPanel(!showEquipPanel)}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:shadow-lg transition-all"
                    >
                      {showEquipPanel ? 'Hide Cats' : 'Equip to Cat...'}
                    </button>

                    <AnimatePresence>
                      {showEquipPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-1.5 overflow-hidden"
                        >
                          {equippableCats.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-2">No cats available</p>
                          ) : (
                            equippableCats.map(cat => {
                              const isInParty = selectedForBattle.includes(cat.instanceId)
                              const currentlyEquipped = selectedItem.type === 'equipment'
                                ? (selectedItem.data.slot === 'weapon' ? cat.equipment?.weapon : cat.equipment?.accessory)
                                : cat.equipment?.stone
                              const hasThisItem = currentlyEquipped === (selectedItem.type === 'equipment' ? selectedItem.data.id : selectedItem.data.id)

                              return (
                                <button
                                  key={cat.instanceId}
                                  onClick={() => !hasThisItem && handleEquip(cat.instanceId)}
                                  disabled={hasThisItem}
                                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                                    hasThisItem
                                      ? 'bg-green-500/10 border border-green-500/30 cursor-default'
                                      : 'bg-slate-700/30 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-700/60'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-bold text-sm">{cat.name}</span>
                                      <span className="text-xs text-slate-500">Lv.{cat.level}</span>
                                      {isInParty && (
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">Party</span>
                                      )}
                                    </div>
                                    {currentlyEquipped && !hasThisItem && (
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        Replaces: {
                                          selectedItem.type === 'equipment'
                                            ? EQUIPMENT.find(e => e.id === currentlyEquipped)?.name
                                            : STONES.find(s => s.id === currentlyEquipped)?.name
                                        }
                                      </div>
                                    )}
                                  </div>
                                  {hasThisItem ? (
                                    <span className="text-green-400 text-xs font-bold">Equipped</span>
                                  ) : (
                                    <span className="text-purple-400 text-xs font-bold">Equip</span>
                                  )}
                                </button>
                              )
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Shop Tab */}
      {tab === 'shop' && (
        <div className="space-y-6">
          {/* Buyable items */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Available for Purchase</h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {shopItems.buyable.map(item => {
                const canAfford = coins >= item.cost
                const qty = inventory[item.id] || 0
                return (
                  <motion.div
                    key={item.id}
                    variants={cardVariants}
                    className={`relative p-3 rounded-xl border ${RARITY_BORDER[item.rarity]} bg-slate-800/80 ${RARITY_GLOW[item.rarity]}`}
                  >
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        x{qty}
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <ItemImage item={{ type: 'equipment', data: item }} size="md" />
                      <div className="text-center">
                        <div className="text-white font-bold text-xs">{item.name}</div>
                        <div className={`text-[10px] font-bold uppercase bg-gradient-to-r ${RARITY_COLORS[item.rarity]} bg-clip-text text-transparent`}>
                          {item.rarity} {item.slot === 'weapon' ? 'Weapon' : 'Accessory'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
                      </div>
                      <button
                        onClick={() => handleBuy(item.id)}
                        disabled={!canAfford}
                        className={`w-full py-2 rounded-lg font-bold text-xs transition-all ${
                          canAfford
                            ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-900 hover:shadow-lg'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        🪙 {item.cost}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>

          {/* Drop only items */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Drop Only (Battle Rewards)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shopItems.dropOnly.map(item => {
                const qty = inventory[item.id] || 0
                return (
                  <div
                    key={item.id}
                    className={`relative p-3 rounded-xl border ${RARITY_BORDER[item.rarity]} bg-slate-800/70 opacity-80 ${RARITY_GLOW[item.rarity]}`}
                  >
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        x{qty}
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <ItemImage item={{ type: 'equipment', data: item }} size="md" />
                      <div className="text-center">
                        <div className="text-white font-bold text-xs">{item.name}</div>
                        <div className={`text-[10px] font-bold uppercase bg-gradient-to-r ${RARITY_COLORS[item.rarity]} bg-clip-text text-transparent`}>
                          {item.rarity} {item.slot === 'weapon' ? 'Weapon' : 'Accessory'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
                      </div>
                      <div className="w-full py-2 rounded-lg bg-slate-700/80 text-slate-500 font-bold text-xs text-center">
                        🔒 Drop Only
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stones info */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Elemental Stones (Feline Frenzy Friday)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {STONES.map(stone => {
                const qty = inventory[stone.id] || 0
                return (
                  <div
                    key={stone.id}
                    className="relative p-3 rounded-xl border border-purple-500/30 bg-slate-800/70 shadow-[0_0_16px_rgba(168,85,247,0.2)]"
                  >
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        x{qty}
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <ItemImage item={{ type: 'stone', data: stone }} size="md" />
                      <div className="text-center">
                        <div className="text-white font-bold text-xs">{stone.name}</div>
                        <div className="text-[10px] font-bold uppercase text-purple-400">{stone.element}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{stone.effect}</div>
                      </div>
                      <div className="w-full py-2 rounded-lg bg-slate-700/80 text-slate-500 font-bold text-xs text-center">
                        🎪 Friday Event
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
