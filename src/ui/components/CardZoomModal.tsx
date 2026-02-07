import { motion, AnimatePresence } from 'framer-motion'
import type { OwnedCat } from '../../game/store'
import { useGame } from '../../game/store'
import { MAX_ASCENSION, ASCENSION_COSTS, MAX_CAT_LEVEL } from '../../game/constants'
import { EQUIPMENT, STONES } from '../../game/items'
import { useHolographicCard } from '../hooks/useHolographicCard'
import { isWeb } from '../../utils/platform'
import { useState } from 'react'
import { RARITY_GRADIENTS, RARITY_GLOWS } from '../constants/rarity'

interface CardZoomModalProps {
  cat: OwnedCat | null
  isOpen: boolean
  onClose: () => void
}

export default function CardZoomModal({ cat, isOpen, onClose }: CardZoomModalProps) {
  const ascendCat = useGame(s => s.ascendCat)
  const coins = useGame(s => s.coins)
  const inventory = useGame(s => s.inventory)
  const equipItem = useGame(s => s.equipItem)
  const unequipItem = useGame(s => s.unequipItem)
  const equipStone = useGame(s => s.equipStone)
  const unequipStone = useGame(s => s.unequipStone)
  const [showEquipMenu, setShowEquipMenu] = useState<'weapon' | 'accessory' | null>(null)
  const [showStoneMenu, setShowStoneMenu] = useState(false)

  // Hook must be called before any conditional returns (Rules of Hooks)
  const isElite = cat?.isElite === true
  const eliteTier = cat?.eliteTier || 0
  const holographic = useHolographicCard({
    mode: 'full',
    maxRotation: 20,
    shineIntensity: isElite ? 0.9 : cat?.rarity === 'Mythical' ? 0.9 : cat?.rarity === 'Legendary' ? 0.8 : 0.7
  })

  if (!cat) return null

  const ascension = cat.ascension || 0
  const canAscend = cat.level >= MAX_CAT_LEVEL && ascension < MAX_ASCENSION
  const ascensionCost = ascension < MAX_ASCENSION ? ASCENSION_COSTS[ascension] : 0
  const canAffordAscend = coins >= ascensionCost

  const rarityGradient = RARITY_GRADIENTS[cat.rarity] || RARITY_GRADIENTS['Common']
  const rarityGlow = RARITY_GLOWS[cat.rarity] || RARITY_GLOWS['Common']

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-zoom flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[700px] my-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-slate-800 hover:bg-red-600 border border-slate-600 hover:border-red-500 text-slate-400 hover:text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">
              {/* Left: Card Art with Holographic Effect */}
              <div
                ref={holographic.cardRef}
                className="relative w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] mx-auto lg:mx-0 lg:flex-shrink-0 holographic-card"
                style={holographic.style}
                {...(holographic.isSupported ? (isWeb() ? {
                  onMouseMove: holographic.handlers.onMouseMove,
                  onMouseLeave: holographic.handlers.onMouseLeave
                } : {
                  onTouchMove: holographic.handlers.onTouchMove,
                  onTouchEnd: holographic.handlers.onTouchEnd
                }) : {})}
              >

            {/* Card Container */}
            <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl ${rarityGlow}`}>
              {/* Holographic Overlay */}
              {holographic.isSupported && (
                <div
                  className={`holographic-overlay full ${holographic.isActive ? 'active' : ''} rarity-${cat.rarity.toLowerCase()}`}
                />
              )}

              {/* Mythical Particles */}
              {cat.rarity === 'Mythical' && !isElite && (
                <>
                  <div className="absolute top-4 left-4 w-2 h-2 bg-red-500 rounded-full mythical-particle" style={{ animationDelay: '0s', zIndex: 30 }} />
                  <div className="absolute top-8 right-6 w-2 h-2 bg-red-400 rounded-full mythical-particle" style={{ animationDelay: '0.5s', zIndex: 30 }} />
                  <div className="absolute bottom-12 left-8 w-2 h-2 bg-rose-500 rounded-full mythical-particle" style={{ animationDelay: '1s', zIndex: 30 }} />
                  <div className="absolute bottom-6 right-4 w-2 h-2 bg-red-600 rounded-full mythical-particle" style={{ animationDelay: '1.5s', zIndex: 30 }} />
                </>
              )}

              {/* Elite Particles */}
              {isElite && (
                <>
                  <div className="absolute top-6 left-6 w-2 h-2 bg-yellow-400 rounded-full elite-particle" style={{ animationDelay: '0s', zIndex: 30 }} />
                  <div className="absolute top-10 right-8 w-2 h-2 bg-cyan-400 rounded-full elite-particle" style={{ animationDelay: '0.4s', zIndex: 30 }} />
                  <div className="absolute bottom-14 left-10 w-2 h-2 bg-yellow-300 rounded-full elite-particle" style={{ animationDelay: '0.8s', zIndex: 30 }} />
                  <div className="absolute bottom-8 right-6 w-2 h-2 bg-cyan-300 rounded-full elite-particle" style={{ animationDelay: '1.2s', zIndex: 30 }} />
                  {eliteTier >= 2 && (
                    <>
                      <div className="absolute top-16 left-4 w-2 h-2 bg-pink-400 rounded-full elite-particle" style={{ animationDelay: '0.2s', zIndex: 30 }} />
                      <div className="absolute bottom-20 right-10 w-2 h-2 bg-purple-400 rounded-full elite-particle" style={{ animationDelay: '0.6s', zIndex: 30 }} />
                    </>
                  )}
                </>
              )}

              {/* Full-Screen Character Art */}
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
                )}

                {/* Gradient Overlays - only at top and bottom */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              </div>

              {/* Card Content Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
                {/* Top: Name Only */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-gradient-to-br ${rarityGradient} shadow-2xl border-2 sm:border-3 border-white/40 backdrop-blur-sm`}>
                    <h3 className="font-black text-xl sm:text-2xl tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                {/* Bottom: Ability Only */}
                <div className="flex flex-col gap-2">
                  {/* Ability */}
                  {cat.ability && (
                    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-black/80 backdrop-blur-md rounded-xl border-2 sm:border-3 border-white/30 shadow-2xl">
                      <div className="text-sm sm:text-base font-black text-gold-400 tracking-wider uppercase text-center leading-tight drop-shadow-lg mb-1">
                        {cat.ability.name}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-snug text-center">
                        {cat.ability.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Elite Badge - Below Card */}
            {isElite && (
              <div className="mt-3 sm:mt-4 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-400 border-2 border-white/50 shadow-xl elite-badge-shimmer">
                  <span className="text-base text-slate-900">&#x2726;</span>
                  <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {eliteTier >= 2 ? 'PRISMATIC' : 'ELITE'}
                  </span>
                  <span className="text-base text-slate-900">&#x2726;</span>
                </div>
              </div>
            )}

            {/* Breed and Rarity - Below Card */}
            <div className={`${isElite ? 'mt-2' : 'mt-3 sm:mt-4'} flex items-center justify-center gap-2`}>
              <div className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-md border-2 border-slate-600/50 shadow-xl flex items-center justify-center">
                <span className="text-sm sm:text-base text-slate-200 uppercase tracking-widest font-bold">
                  {cat.breed}
                </span>
              </div>
              <div className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-br from-amber-800/80 to-amber-900/90 backdrop-blur-md border-2 border-gold-500/50 shadow-xl flex items-center justify-center">
                <span className="text-sm sm:text-base text-gold-400 uppercase tracking-widest font-bold">
                  {cat.rarity}
                </span>
              </div>
            </div>
              </div>

              {/* Right: Stats & Equipment Panel */}
              <div className="w-full lg:flex-1 mt-2 lg:mt-0">
                <div className="lg:bg-slate-800/60 lg:backdrop-blur-sm lg:rounded-2xl lg:p-4 lg:border lg:border-slate-700/50">
            {/* Stats */}
            <div className="mt-2 sm:mt-3 lg:mt-0 grid grid-cols-4 gap-2 sm:gap-3">
              {/* Attack */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-amber-900/80 to-amber-950/90 rounded-xl border border-amber-700/50 shadow-xl">
                <span className="font-black text-amber-200 text-lg sm:text-xl drop-shadow-lg">{cat.currentAttack}</span>
                <span className="text-[9px] sm:text-[10px] text-amber-300/90 font-bold tracking-wide uppercase">ATK</span>
              </div>

              {/* Health */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 rounded-xl border border-emerald-700/50 shadow-xl">
                <span className="font-black text-emerald-200 text-base sm:text-lg drop-shadow-lg leading-none">{cat.currentHp}/{cat.maxHp}</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-300/90 font-bold tracking-wide uppercase">HP</span>
              </div>

              {/* Level */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-xl border border-purple-700/50 shadow-xl">
                <span className="font-black text-purple-200 text-lg sm:text-xl drop-shadow-lg">{cat.level}</span>
                <span className="text-[9px] sm:text-[10px] text-purple-300/90 font-bold tracking-wide uppercase">LVL</span>
              </div>

              {/* Battles */}
              <div className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-gradient-to-br from-slate-800/80 to-slate-900/90 rounded-xl border border-slate-700/50 shadow-xl">
                <span className="font-black text-slate-200 text-base sm:text-lg drop-shadow-lg leading-none">{cat.totalWins || 0}/{cat.totalBattles || 0}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-300/90 font-bold tracking-wide uppercase">W/L</span>
              </div>
            </div>

            {/* Equipment Slots */}
            <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2">
              {(['weapon', 'accessory'] as const).map(slot => {
                const equippedId = cat.equipment?.[slot]
                const equippedItem = equippedId ? EQUIPMENT.find(e => e.id === equippedId) : null

                return (
                  <div key={slot} className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowEquipMenu(showEquipMenu === slot ? null : slot) }}
                      className={`w-full p-2 rounded-lg border text-center transition-all ${
                        equippedItem
                          ? 'bg-slate-800/80 border-purple-500/50 hover:border-purple-400'
                          : 'bg-slate-900/50 border-slate-700 border-dashed hover:border-slate-500'
                      }`}
                    >
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                        {slot === 'weapon' ? '⚔️ Weapon' : '💎 Accessory'}
                      </div>
                      {equippedItem ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <img
                            src={equippedItem.iconUrl}
                            alt=""
                            className="w-5 h-5 object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span className="text-[11px] font-bold text-purple-300 truncate">{equippedItem.name}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600">Empty</div>
                      )}
                      {equippedItem && (
                        <div className="text-[9px] text-slate-400 mt-0.5">{equippedItem.description}</div>
                      )}
                    </button>

                    {/* Equip dropdown */}
                    {showEquipMenu === slot && (
                      <div
                        className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-dropdown max-h-40 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {equippedItem && (
                          <button
                            type="button"
                            onClick={() => { unequipItem(cat.instanceId, slot); setShowEquipMenu(null) }}
                            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 border-b border-slate-700"
                          >
                            Unequip {equippedItem.name}
                          </button>
                        )}
                        {EQUIPMENT.filter(e => e.slot === slot && (inventory[e.id] || 0) > 0).map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => { equipItem(cat.instanceId, item.id); setShowEquipMenu(null) }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 flex justify-between items-center"
                          >
                            <span className="font-bold">{item.name}</span>
                            <span className="text-slate-400">{item.description} (x{inventory[item.id]})</span>
                          </button>
                        ))}
                        {EQUIPMENT.filter(e => e.slot === slot && (inventory[e.id] || 0) > 0).length === 0 && !equippedItem && (
                          <div className="px-3 py-2 text-xs text-slate-500">No items available</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Stone Slot */}
            <div className="mt-2 sm:mt-3 relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowStoneMenu(!showStoneMenu) }}
                className={`w-full p-2 rounded-lg border text-center transition-all ${
                  cat.equipment?.stone
                    ? 'bg-slate-800/80 border-emerald-500/50 hover:border-emerald-400'
                    : 'bg-slate-900/50 border-slate-700 border-dashed hover:border-slate-500'
                }`}
              >
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                  💎 Stone
                </div>
                {(() => {
                  const stoneId = cat.equipment?.stone
                  const stone = stoneId ? STONES.find(s => s.id === stoneId) : null
                  return stone ? (
                    <>
                      <div className="text-[11px] font-bold text-emerald-300 truncate">{stone.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{stone.effect}</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-600">Empty</div>
                  )
                })()}
              </button>

              {/* Stone equip dropdown */}
              {showStoneMenu && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-dropdown max-h-40 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cat.equipment?.stone && (
                    <button
                      type="button"
                      onClick={() => { unequipStone(cat.instanceId); setShowStoneMenu(false) }}
                      className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 border-b border-slate-700"
                    >
                      Unequip {STONES.find(s => s.id === cat.equipment!.stone)?.name}
                    </button>
                  )}
                  {STONES.filter(s => (inventory[s.id] || 0) > 0).map(stone => (
                    <button
                      key={stone.id}
                      type="button"
                      onClick={() => { equipStone(cat.instanceId, stone.id); setShowStoneMenu(false) }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 flex justify-between items-center"
                    >
                      <span className="font-bold">{stone.name}</span>
                      <span className="text-slate-400">{stone.effect} (x{inventory[stone.id]})</span>
                    </button>
                  ))}
                  {STONES.filter(s => (inventory[s.id] || 0) > 0).length === 0 && !cat.equipment?.stone && (
                    <div className="px-3 py-2 text-xs text-slate-500">No stones available</div>
                  )}
                </div>
              )}
            </div>

            {/* Ascension Stars */}
            {ascension > 0 && (
              <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1">
                {Array.from({ length: MAX_ASCENSION }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${i < ascension ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'text-slate-700'}`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-[10px] text-amber-300 font-bold ml-1 uppercase tracking-wider">
                  Ascension {ascension}
                </span>
              </div>
            )}

            {/* Ascend Button */}
            {canAscend && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!canAffordAscend) return
                  if (window.confirm(`Ascend ${cat.name}? This resets to Level 1 but grants +10% permanent base stats.\n\nCost: ${ascensionCost} coins`)) {
                    ascendCat(cat.instanceId)
                    onClose()
                  }
                }}
                disabled={!canAffordAscend}
                className={`mt-2 sm:mt-3 w-full px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                  canAffordAscend
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-900 shadow-lg hover:shadow-xl'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                whileHover={canAffordAscend ? { scale: 1.03 } : {}}
                whileTap={canAffordAscend ? { scale: 0.97 } : {}}
              >
                ★ Ascend ({ascensionCost} coins)
              </motion.button>
            )}

            {/* Max ascension badge */}
            {ascension >= MAX_ASCENSION && (
              <div className="mt-2 sm:mt-3 flex items-center justify-center">
                <div className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border border-white/40">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Max Ascension</span>
                </div>
              </div>
            )}

                </div>
              </div>
            </div>
            {/* Hint Text */}
            <div className="mt-3 text-center">
              <p className="text-slate-400 text-xs sm:text-sm">Click anywhere to close</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
