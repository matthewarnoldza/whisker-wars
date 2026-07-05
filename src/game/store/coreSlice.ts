// Core game domain: collection/economy, battle progression, achievements, stats,
// daily rewards, training, equipment/merges/ascension, events, and frenzy.
//
// Persisted fields for this domain are declared (and validated) in
// src/game/saveData.ts — this slice only owns their live values and mutations.

import type { StateCreator } from 'zustand'
import type { Cat, Bait, Rarity } from '../data'
import { BAITS, CATS, DOGS, rarityByTier } from '../data'
import { EQUIPMENT } from '../items'
import { getEventPeriodKey, getFrenzyWeekKey, isConsecutiveWeek, type GameEvent } from '../events'
import { FRENZY_STREAK_REWARDS, FRENZY_STREAK_LENGTH, RELEASE_VALUES } from '../constants'
import {
  calculateXpForLevel,
  calculateStatBoost,
  HEAL_COST,
  ACHIEVEMENT_REWARD_COINS,
  MAX_CAT_LEVEL,
  ELITE_TIER_1_MULTIPLIER,
  ELITE_TIER_2_MULTIPLIER,
  MAX_DAILY_TRAINING_SESSIONS,
  DAILY_STREAK_REWARDS,
  DAILY_STREAK_LENGTH,
  TWO_DAYS_MS,
  MAX_ASCENSION,
  ASCENSION_COSTS,
  ASCENSION_STAT_BONUS,
  getAscendedBaseStat,
} from '../constants'
import {
  trackBaitPurchased,
  trackCoinsSpent,
  trackCoinsEarned,
  trackLevelUp,
  trackAchievementUnlocked,
  trackAchievementClaimed,
  trackDailyRewardClaimed,
  trackDogDefeated,
} from '../../utils/analytics'
import type { View, OwnedCat, Achievement, GameStats } from './shared'
import { getCoreInitialState } from './shared'
import type { GameState } from './types'
import { setSfxVolume as applySfxVolume, setMusicVolume as applyMusicVolume } from '../../utils/sound'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const rand = (min:number, max:number)=> Math.floor(Math.random()*(max-min+1))+min

const getRandomCatByBait = (bait:Bait): Cat | null => {
  const rarities = rarityByTier(bait.tier)
  const pool = CATS.filter(c=> rarities.includes(c.rarity as Rarity))
  if (!pool.length) return null

  // Tier-based fail chance - higher tier baits have lower fail chance
  // Tier 1: 15% fail, Tier 2: 12%, Tier 3: 9%, Tier 4: 6%, Tier 5: 3%, Tier 6: 1%
  const failChance = Math.max(0.01, 0.18 - (bait.tier * 0.03))
  if (Math.random() < failChance) return null

  return pool[rand(0, pool.length-1)]
}

export interface CoreSlice {
  view: View
  coins: number
  baits: Record<string, number> // baitId -> qty
  owned: OwnedCat[]
  selectedForBattle: string[]
  favorites: string[] // instanceIds of favorite cats
  dogIndex: number
  difficultyLevel: number // Difficulty multiplier for multi-dog battles
  alienUnlocked: boolean // Star Barks alien dogs unlocked
  theme: 'light' | 'dark'
  soundEnabled: boolean // Toggle for sound effects
  musicEnabled: boolean // Toggle for background music
  sfxVolume: number // 0-1, playback volume for sound effects
  musicVolume: number // 0-1, playback volume for background music
  reducedMotion: boolean // User override (in addition to the OS media query)
  colorblindMode: boolean // Colorblind-friendly rarity labels
  achievements: Achievement[]
  stats: GameStats
  lastDailyReward: number
  dailyStreak: number
  tutorialCompleted: boolean
  hintsSeen: string[] // first-run coach-mark ids already dismissed
  trainingCooldowns: Record<string, number[]>
  inventory: Record<string, number> // equipmentId -> qty
  completedEventRewards: string[] // event period keys like "halloween-2025"
  frenzyStreak: number // consecutive Friday participations
  lastFrenzyParticipation: string // week key like "2026-w6"
  setView: (v:View)=>void
  addCoins: (n:number)=>void
  buyBait: (baitId:string)=>void
  useBait: (baitId:string)=>Cat | null
  befriendCat: (cat:Cat)=>void
  releaseCat: (catId:string)=>number
  toggleSelectCat: (id:string)=>void
  toggleFavorite: (instanceId:string)=>void
  nextDog: ()=>void
  addXpToCat: (catId:string, amount:number)=>void
  healCat: (catId:string, amount:number)=>void
  healAllCats: ()=>boolean
  updateCatHp: (catId:string, newHp:number)=>void
  recordBattleResult: (won:boolean, xpEarned:number)=>void
  claimDailyReward: ()=>boolean
  unlockAchievement: (id:string)=>void
  updateAchievementProgress: (id:string, progress:number)=>void
  claimAchievement: (id:string)=>void
  mergeCats: (instanceIds:[string,string,string])=>OwnedCat|null
  ascendCat: (instanceId:string)=>boolean
  addEquipment: (equipmentId:string)=>void
  equipItem: (catInstanceId:string, equipmentId:string)=>boolean
  unequipItem: (catInstanceId:string, slot:'weapon'|'accessory')=>void
  buyEquipment: (equipmentId:string)=>boolean
  equipStone: (catInstanceId:string, stoneId:string)=>boolean
  unequipStone: (catInstanceId:string)=>void
  consumeStone: (catInstanceId:string)=>void
  claimEventReward: (event:GameEvent)=>boolean
  completeTutorial: ()=>void
  markHintSeen: (id:string)=>void
  recordTrainingComplete: (instanceId:string)=>void
  getTrainingSessions: (instanceId:string)=>{ remaining:number, nextAvailable:number|null }
  setTheme: (t:'light'|'dark')=>void
  toggleSound: ()=>void
  toggleMusic: ()=>void
  setSfxVolume: (v:number)=>void
  setMusicVolume: (v:number)=>void
  setReducedMotion: (v:boolean)=>void
  setColorblindMode: (v:boolean)=>void
  unlockAlienPhase: ()=>void
}

export const createCoreSlice: StateCreator<GameState, [], [], CoreSlice> = (set, get) => ({
  ...getCoreInitialState(),

  setView: (v)=> set({view: v}),
  addCoins: (n)=> set(s=>{
    const newCoins = Math.max(0, s.coins + n)
    // Check coin hoarder achievement
    if (newCoins >= 1000) {
      get().unlockAchievement('coin-hoarder')
    }
    return {
      coins: newCoins,
      stats: { ...s.stats, totalCoinsEarned: s.stats.totalCoinsEarned + Math.max(0, n) }
    }
  }),

  buyBait: (baitId)=> set(s=>{
    const bait = BAITS.find(b=>b.id===baitId)
    if (!bait || s.coins < bait.cost) return s
    trackBaitPurchased(bait.name, bait.tier, bait.cost)
    trackCoinsSpent('bait_purchase', bait.cost)
    return {
      coins: s.coins - bait.cost,
      baits: { ...s.baits, [baitId]: (s.baits[baitId]||0)+1 }
    }
  }),

  useBait: (baitId)=> {
    const s = get()
    const qty = s.baits[baitId]||0
    if (!qty) return null
    const bait = BAITS.find(b=> b.id===baitId)
    if (!bait) return null
    const cat = getRandomCatByBait(bait)
    set({ baits: { ...s.baits, [baitId]: qty-1 } })
    return cat
  },

  befriendCat: (cat)=> {
    set(s=>{
      const ownedCat: OwnedCat = {
        ...cat,
        instanceId: crypto.randomUUID(), // Generate unique ID for this cat instance
        level: 1,
        xp: 0,
        currentHp: cat.health,
        maxHp: cat.health,
        currentAttack: cat.attack,
        totalBattles: 0,
        totalWins: 0,
      }
      const newOwned = [...s.owned, ownedCat]
      const newStats = { ...s.stats, totalCatsCollected: s.stats.totalCatsCollected + 1 }

      // Check achievements
      setTimeout(() => {
        const g = get()
        if (newOwned.length === 1) g.unlockAchievement('first-cat')
        if (newOwned.length >= 10) g.unlockAchievement('cat-collector')
        if (newOwned.length >= 25) g.unlockAchievement('cat-master')
        if (cat.rarity === 'Legendary' || cat.rarity === 'Mythical') {
          g.unlockAchievement('legendary-catch')
        }
      }, 100)

      return { owned: newOwned, view: 'collection', stats: newStats }
    })
    get().save() // Persist immediately — don't rely on 3s debounce (Chromebooks freeze tabs)
  },

  releaseCat: (instanceId)=> {
    const cat = get().owned.find(c => c.instanceId === instanceId)
    if (!cat) return 0
    const coins = RELEASE_VALUES[cat.rarity] ?? 0
    set(s => ({
      owned: s.owned.filter(c => c.instanceId !== instanceId),
      selectedForBattle: s.selectedForBattle.filter(id => id !== instanceId),
      coins: s.coins + coins,
    }))
    get().save()
    return coins
  },

  toggleSelectCat: (instanceId)=> set(s=>{
    const sel = new Set(s.selectedForBattle)
    if (sel.has(instanceId)) sel.delete(instanceId)
    else if (sel.size < 3) sel.add(instanceId)
    return { selectedForBattle: [...sel] }
  }),

  toggleFavorite: (instanceId)=> set(s=>{
    const fav = new Set(s.favorites)
    if (fav.has(instanceId)) fav.delete(instanceId)
    else fav.add(instanceId)
    return { favorites: [...fav] }
  }),

  nextDog: ()=> {
    set(s=> {
      trackDogDefeated(DOGS[s.dogIndex].name, s.dogIndex, s.difficultyLevel)

      let newIndex = s.dogIndex + 1
      let newDifficultyLevel = s.difficultyLevel

      // If we've beaten all dogs, increase difficulty and loop back
      if (newIndex >= DOGS.length) {
        newDifficultyLevel += 1
        newIndex = 0 // Start from first dog again with higher difficulty
      }

      const newStats = {
        ...s.stats,
        highestDogDefeated: Math.max(s.stats.highestDogDefeated, s.dogIndex)
      }

      setTimeout(() => {
        // Unlock achievement on first completion of all original dogs (index 14 = Eternal Overlord)
        if (s.dogIndex === 14 && s.difficultyLevel === 0) {
          get().unlockAchievement('dog-slayer')
        }
        // Unlock achievement on first completion of alien dogs (index 23 = The Cosmic Queen)
        if (s.dogIndex === DOGS.length - 1 && s.difficultyLevel === 0) {
          get().unlockAchievement('star-barks-victor')
        }
      }, 100)

      return { dogIndex: newIndex, difficultyLevel: newDifficultyLevel, stats: newStats }
    })
    get().save() // Persist dog progression immediately
  },

  unlockAlienPhase: ()=> {
    set({ alienUnlocked: true })
    get().save()
  },

  addXpToCat: (instanceId, amount)=> set(s=> {
    const owned = s.owned.map(cat => {
      if (cat.instanceId !== instanceId) return cat

      let newXp = cat.xp + amount
      let newLevel = cat.level
      let newMaxHp = cat.maxHp
      let newCurrentAttack = cat.currentAttack
      const ascension = cat.ascension || 0
      const baseHp = getAscendedBaseStat(cat.health, ascension)
      const baseAtk = getAscendedBaseStat(cat.attack, ascension)
      const eliteMultiplier = cat.isElite
        ? ((cat.eliteTier || 0) >= 2 ? ELITE_TIER_2_MULTIPLIER : ELITE_TIER_1_MULTIPLIER)
        : 1

      // Level up logic
      while (newXp >= calculateXpForLevel(newLevel) && newLevel < MAX_CAT_LEVEL) {
        newXp -= calculateXpForLevel(newLevel)
        newLevel++
        newMaxHp = Math.floor(calculateStatBoost(baseHp, newLevel) * eliteMultiplier)
        newCurrentAttack = Math.floor(calculateStatBoost(baseAtk, newLevel) * eliteMultiplier)
        trackLevelUp(cat.name, newLevel, cat.rarity)

        // Check level 10 achievement
        if (newLevel === 10) {
          setTimeout(() => get().unlockAchievement('level-10'), 100)
        }
      }

      return {
        ...cat,
        level: newLevel,
        xp: newXp,
        maxHp: newMaxHp,
        currentHp: Math.min(cat.currentHp, newMaxHp), // Don't exceed new max
        currentAttack: newCurrentAttack,
      }
    })
    return { owned }
  }),

  healCat: (instanceId, amount)=> set(s=> ({
    owned: s.owned.map(cat =>
      cat.instanceId === instanceId
        ? { ...cat, currentHp: Math.min(cat.maxHp, cat.currentHp + amount) }
        : cat
    )
  })),

  healAllCats: ()=> {
    const state = get()
    if (state.coins < HEAL_COST) return false

    // Check if any cats need healing
    const needsHealing = state.owned.some(cat => cat.currentHp < cat.maxHp)
    if (!needsHealing) return false

    const catsHealed = state.owned.filter(cat => cat.currentHp < cat.maxHp).length
    set(s=> ({
      coins: s.coins - HEAL_COST,
      owned: s.owned.map(cat => ({ ...cat, currentHp: cat.maxHp }))
    }))
    trackCoinsSpent('heal_all', HEAL_COST)
    get().save() // Persist immediately — don't rely on 3s debounce
    return true
  },

  updateCatHp: (instanceId, newHp)=> set(s=> ({
    owned: s.owned.map(cat =>
      cat.instanceId === instanceId
        ? { ...cat, currentHp: Math.max(0, Math.min(cat.maxHp, newHp)) }
        : cat
    )
  })),

  recordBattleResult: (won, xpEarned)=> {
    set(s=> {
      const newStats = {
        ...s.stats,
        totalBattles: s.stats.totalBattles + 1,
        totalWins: won ? s.stats.totalWins + 1 : s.stats.totalWins,
        totalLosses: won ? s.stats.totalLosses : s.stats.totalLosses + 1,
      }

      // Update selected cats using instanceId
      const owned = s.owned.map(cat => {
        if (!s.selectedForBattle.includes(cat.instanceId)) return cat
        return {
          ...cat,
          totalBattles: (cat.totalBattles || 0) + 1,
          totalWins: won ? (cat.totalWins || 0) + 1 : (cat.totalWins || 0),
        }
      })

      // Check achievements
      setTimeout(() => {
        const g = get()
        if (won) {
          if (newStats.totalWins === 1) g.unlockAchievement('first-victory')
          if (newStats.totalWins >= 25) g.unlockAchievement('veteran')
          if (newStats.totalWins >= 100) g.unlockAchievement('champion')
        }
      }, 100)

      return { stats: newStats, owned }
    })
    get().save() // Persist battle results immediately
  },

  claimDailyReward: ()=> {
    const now = Date.now()
    const s = get()
    const lastReward = s.lastDailyReward
    const oneDayMs = 24 * 60 * 60 * 1000

    if (now - lastReward >= oneDayMs) {
      // Check if streak continues or resets (missed more than 48 hours)
      const streakBroken = lastReward > 0 && (now - lastReward >= TWO_DAYS_MS)
      const newStreak = streakBroken ? 0 : s.dailyStreak
      const streakDay = newStreak % DAILY_STREAK_LENGTH
      const reward = DAILY_STREAK_REWARDS[streakDay]

      get().addCoins(reward.coins)

      // Give bonus bait if applicable
      if ('bait' in reward && reward.bait) {
        set(prev => ({
          baits: { ...prev.baits, [reward.bait!]: (prev.baits[reward.bait!] || 0) + 1 }
        }))
      }

      set({ lastDailyReward: now, dailyStreak: newStreak + 1 })
      trackDailyRewardClaimed(reward.coins)
      trackCoinsEarned('daily_reward', reward.coins)
      return true
    }
    return false
  },

  unlockAchievement: (id)=> set(s=> {
    const achievements = s.achievements.map(ach => {
      if (ach.id === id && !ach.unlocked) {
        trackAchievementUnlocked(id, ach.name)
        return { ...ach, unlocked: true, progress: ach.maxProgress }
      }
      return ach
    })
    return { achievements }
  }),

  updateAchievementProgress: (id, progress)=> set(s=> {
    const achievements = s.achievements.map(ach => {
      if (ach.id !== id) return ach
      const newProgress = Math.min(ach.maxProgress, progress)
      return {
        ...ach,
        progress: newProgress,
        unlocked: newProgress >= ach.maxProgress ? true : ach.unlocked,
      }
    })
    return { achievements }
  }),

  mergeCats: (instanceIds)=> {
    const s = get()

    // Validate: all 3 exist in owned collection
    const sourceCats = instanceIds.map(id => s.owned.find(c => c.instanceId === id))
    if (sourceCats.some(c => !c)) return null
    const cats = sourceCats as OwnedCat[]

    // Validate: all same template id
    const templateId = cats[0].id
    if (!cats.every(c => c.id === templateId)) return null

    // Validate: all same elite tier
    const tier = cats[0].eliteTier || 0
    if (!cats.every(c => (c.eliteTier || 0) === tier)) return null

    // Validate: cannot merge Tier 2 (max tier)
    if (tier >= 2) return null

    const newTier = tier + 1
    const highestLevel = Math.max(...cats.map(c => c.level))
    const statMultiplier = newTier === 1 ? ELITE_TIER_1_MULTIPLIER : ELITE_TIER_2_MULTIPLIER
    const baseCat = CATS.find(c => c.id === templateId)!

    // Preserve highest ascension from merged cats
    const highestAscension = Math.max(...cats.map(c => c.ascension || 0))
    const mergeBaseHp = getAscendedBaseStat(baseCat.health, highestAscension)
    const mergeBaseAtk = getAscendedBaseStat(baseCat.attack, highestAscension)
    const newMaxHp = Math.floor(calculateStatBoost(mergeBaseHp, highestLevel) * statMultiplier)
    const newAttack = Math.floor(calculateStatBoost(mergeBaseAtk, highestLevel) * statMultiplier)

    const eliteCat: OwnedCat = {
      ...baseCat,
      instanceId: crypto.randomUUID(),
      level: highestLevel,
      xp: 0,
      currentHp: newMaxHp,
      maxHp: newMaxHp,
      currentAttack: newAttack,
      totalBattles: 0,
      totalWins: 0,
      isElite: true,
      eliteTier: newTier,
      mergedFromIds: instanceIds,
      ascension: highestAscension,
    }

    // Return equipment from consumed cats to inventory
    const newInventory = { ...s.inventory }
    for (const cat of cats) {
      const equip = cat.equipment || {}
      if (equip.weapon) newInventory[equip.weapon] = (newInventory[equip.weapon] || 0) + 1
      if (equip.accessory) newInventory[equip.accessory] = (newInventory[equip.accessory] || 0) + 1
      if (equip.stone) newInventory[equip.stone] = (newInventory[equip.stone] || 0) + 1
    }

    // Remove consumed cats, clean up battle selection and favorites
    const consumedSet = new Set(instanceIds)
    const newOwned = s.owned.filter(c => !consumedSet.has(c.instanceId))
    newOwned.push(eliteCat)

    const newSelected = s.selectedForBattle.filter(id => !consumedSet.has(id))
    const newFavorites = s.favorites.filter(id => !consumedSet.has(id))
    const newMerges = (s.stats.totalMerges || 0) + 1
    const newStats = { ...s.stats, totalMerges: newMerges }

    set({
      owned: newOwned,
      selectedForBattle: newSelected,
      favorites: newFavorites,
      stats: newStats,
      inventory: newInventory,
    })

    // Check achievements
    setTimeout(() => {
      const g = get()
      g.unlockAchievement('first-merge')
      g.updateAchievementProgress('merge-master', newMerges)
      g.updateAchievementProgress('fusion-champion', newMerges)
      if (newTier === 2) g.unlockAchievement('prismatic-power')
    }, 100)

    get().save() // Persist merge immediately — 3 cats consumed, elite created
    return eliteCat
  },

  ascendCat: (instanceId)=> {
    const s = get()
    const cat = s.owned.find(c => c.instanceId === instanceId)
    if (!cat) return false

    const currentAscension = cat.ascension || 0
    if (currentAscension >= MAX_ASCENSION) return false
    if (cat.level < MAX_CAT_LEVEL) return false

    const cost = ASCENSION_COSTS[currentAscension]
    if (s.coins < cost) return false

    const newAscension = currentAscension + 1
    const newMaxHp = Math.floor(cat.maxHp * (1 + ASCENSION_STAT_BONUS))
    const newAttack = Math.floor(cat.currentAttack * (1 + ASCENSION_STAT_BONUS))

    const owned = s.owned.map(c => {
      if (c.instanceId !== instanceId) return c
      return {
        ...c,
        ascension: newAscension,
        currentHp: newMaxHp,
        maxHp: newMaxHp,
        currentAttack: newAttack,
      }
    })

    set({ owned, coins: s.coins - cost })
    get().save() // Persist ascension immediately — coins spent, stats boosted
    return true
  },

  addEquipment: (equipmentId)=> set(s => ({
    inventory: { ...s.inventory, [equipmentId]: (s.inventory[equipmentId] || 0) + 1 },
  })),

  equipItem: (catInstanceId, equipmentId)=> {
    const s = get()
    const item = EQUIPMENT.find(e => e.id === equipmentId)
    if (!item) return false
    if ((s.inventory[equipmentId] || 0) <= 0) return false

    const cat = s.owned.find(c => c.instanceId === catInstanceId)
    if (!cat) return false

    const currentEquip = cat.equipment || {}
    // Unequip existing item in the same slot (return to inventory)
    const existingId = currentEquip[item.slot]
    const newInventory = { ...s.inventory }
    if (existingId) {
      newInventory[existingId] = (newInventory[existingId] || 0) + 1
    }
    newInventory[equipmentId] = Math.max(0, (newInventory[equipmentId] || 0) - 1)

    const owned = s.owned.map(c => {
      if (c.instanceId !== catInstanceId) return c
      return { ...c, equipment: { ...currentEquip, [item.slot]: equipmentId } }
    })

    set({ owned, inventory: newInventory })
    return true
  },

  unequipItem: (catInstanceId, slot)=> {
    const s = get()
    const cat = s.owned.find(c => c.instanceId === catInstanceId)
    if (!cat) return
    const currentEquip = cat.equipment || {}
    const itemId = currentEquip[slot]
    if (!itemId) return

    const newInventory = { ...s.inventory, [itemId]: (s.inventory[itemId] || 0) + 1 }
    const owned = s.owned.map(c => {
      if (c.instanceId !== catInstanceId) return c
      const newEquip = { ...currentEquip }
      delete newEquip[slot]
      return { ...c, equipment: newEquip }
    })

    set({ owned, inventory: newInventory })
  },

  buyEquipment: (equipmentId)=> {
    const s = get()
    const item = EQUIPMENT.find(e => e.id === equipmentId)
    if (!item || item.cost <= 0) return false
    if (s.coins < item.cost) return false

    set({
      coins: s.coins - item.cost,
      inventory: { ...s.inventory, [equipmentId]: (s.inventory[equipmentId] || 0) + 1 },
    })
    return true
  },

  equipStone: (catInstanceId, stoneId)=> {
    const s = get()
    if ((s.inventory[stoneId] || 0) <= 0) return false
    const cat = s.owned.find(c => c.instanceId === catInstanceId)
    if (!cat) return false

    const currentEquip = cat.equipment || {}
    const newInventory = { ...s.inventory }
    // Return existing stone to inventory
    if (currentEquip.stone) {
      newInventory[currentEquip.stone] = (newInventory[currentEquip.stone] || 0) + 1
    }
    newInventory[stoneId] = Math.max(0, (newInventory[stoneId] || 0) - 1)

    const owned = s.owned.map(c => {
      if (c.instanceId !== catInstanceId) return c
      return { ...c, equipment: { ...currentEquip, stone: stoneId } }
    })
    set({ owned, inventory: newInventory })
    return true
  },

  unequipStone: (catInstanceId)=> {
    const s = get()
    const cat = s.owned.find(c => c.instanceId === catInstanceId)
    if (!cat) return
    const currentEquip = cat.equipment || {}
    if (!currentEquip.stone) return

    const newInventory = { ...s.inventory, [currentEquip.stone]: (s.inventory[currentEquip.stone] || 0) + 1 }
    const owned = s.owned.map(c => {
      if (c.instanceId !== catInstanceId) return c
      const newEquip = { ...currentEquip }
      delete newEquip.stone
      return { ...c, equipment: newEquip }
    })
    set({ owned, inventory: newInventory })
  },

  consumeStone: (catInstanceId)=> {
    const s = get()
    const cat = s.owned.find(c => c.instanceId === catInstanceId)
    if (!cat) return
    const currentEquip = cat.equipment || {}
    if (!currentEquip.stone) return

    // Remove stone from cat — do NOT return to inventory (consumed)
    const owned = s.owned.map(c => {
      if (c.instanceId !== catInstanceId) return c
      const newEquip = { ...currentEquip }
      delete newEquip.stone
      return { ...c, equipment: newEquip }
    })
    set({ owned })
  },

  claimEventReward: (event)=> {
    const s = get()
    const periodKey = getEventPeriodKey(event)
    if (s.completedEventRewards.includes(periodKey)) return false

    const newRewards = [...s.completedEventRewards, periodKey]
    const updates: Partial<GameState> = { completedEventRewards: newRewards }

    if (event.id === 'feline-frenzy') {
      // Frenzy Friday streak tracking
      const currentWeekKey = getFrenzyWeekKey()
      const lastWeek = s.lastFrenzyParticipation
      let newStreak: number

      if (lastWeek === '') {
        newStreak = 1
      } else if (isConsecutiveWeek(lastWeek, currentWeekKey)) {
        newStreak = s.frenzyStreak + 1
      } else {
        // Streak broken — check for Streak Shield
        const shieldCount = s.inventory['streak-shield'] || 0
        if (shieldCount > 0) {
          // Consume shield, preserve streak
          updates.inventory = { ...s.inventory, 'streak-shield': shieldCount - 1 }
          newStreak = s.frenzyStreak + 1
        } else {
          newStreak = 1
        }
      }

      updates.frenzyStreak = newStreak
      updates.lastFrenzyParticipation = currentWeekKey

      // Apply streak coin multiplier
      const streakIdx = Math.min(newStreak - 1, FRENZY_STREAK_LENGTH - 1)
      const streakReward = FRENZY_STREAK_REWARDS[streakIdx]
      const totalCoins = Math.floor(event.coinReward * streakReward.coinMultiplier)
      get().addCoins(totalCoins)

      // Award Streak Shield at full rotation completion (every 5 weeks)
      if (newStreak >= 5 && newStreak % 5 === 0) {
        const inv = updates.inventory || { ...s.inventory }
        inv['streak-shield'] = (inv['streak-shield'] || 0) + 1
        updates.inventory = inv
      }
    } else {
      // Non-frenzy event: standard coin reward
      get().addCoins(event.coinReward)
    }

    // Add bait reward if applicable
    if (event.baitReward) {
      const currentBaits = updates.baits || { ...s.baits }
      currentBaits[event.baitReward] = (currentBaits[event.baitReward] || 0) + 1
      updates.baits = currentBaits
    }

    set(updates)
    return true
  },

  claimAchievement: (id)=> set(s=> {
    const ach = s.achievements.find(a => a.id === id)
    if (!ach || !ach.unlocked || ach.claimed) return {}

    trackAchievementClaimed(id, ach.name, ACHIEVEMENT_REWARD_COINS)
    trackCoinsEarned('achievement', ACHIEVEMENT_REWARD_COINS)

    const achievements = s.achievements.map(a =>
      a.id === id ? { ...a, claimed: true } : a
    )

    return {
      achievements,
      coins: s.coins + ACHIEVEMENT_REWARD_COINS
    }
  }),

  completeTutorial: ()=> set({ tutorialCompleted: true }),

  // Record a first-run coach-mark as seen so it never fires again (persisted).
  // Idempotent: re-marking an already-seen hint is a no-op.
  markHintSeen: (id)=> {
    const s = get()
    if (s.hintsSeen.includes(id)) return
    set({ hintsSeen: [...s.hintsSeen, id] })
    get().save() // persist immediately so a reload never re-shows the hint
  },

  recordTrainingComplete: (instanceId)=> set(s => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const existing = (s.trainingCooldowns[instanceId] || []).filter(t => now - t < oneDayMs)
    if (existing.length >= MAX_DAILY_TRAINING_SESSIONS) return s
    return {
      trainingCooldowns: {
        ...s.trainingCooldowns,
        [instanceId]: [...existing, now],
      }
    }
  }),

  getTrainingSessions: (instanceId)=> {
    const s = get()
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const sessions = (s.trainingCooldowns[instanceId] || []).filter(t => now - t < oneDayMs)
    const remaining = Math.max(0, 3 - sessions.length)
    let nextAvailable: number | null = null
    if (remaining === 0 && sessions.length > 0) {
      const earliest = Math.min(...sessions)
      nextAvailable = earliest + oneDayMs
    }
    return { remaining, nextAvailable }
  },

  setTheme: (t)=> set({ theme: t }),
  toggleSound: ()=> set(s=> ({ soundEnabled: !s.soundEnabled })),
  toggleMusic: ()=> set(s=> ({ musicEnabled: !s.musicEnabled })),

  setSfxVolume: (v)=> {
    const vol = clamp01(v)
    applySfxVolume(vol) // push into sound.ts so playSound uses it immediately
    set({ sfxVolume: vol })
    get().save()
  },
  setMusicVolume: (v)=> {
    const vol = clamp01(v)
    applyMusicVolume(vol) // applies to the live music element and future ones
    set({ musicVolume: vol })
    get().save()
  },
  setReducedMotion: (v)=> {
    set({ reducedMotion: v })
    get().save()
  },
  setColorblindMode: (v)=> {
    set({ colorblindMode: v })
    get().save()
  },
})
