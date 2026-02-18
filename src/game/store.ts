
import { create } from 'zustand'
import type { Cat, Dog, Bait, Rarity } from './data'
import { BAITS, CATS, DOGS, rarityByTier } from './data'
import { EQUIPMENT } from './items'
import { uploadLeaderboardStats } from '../utils/leaderboard'
import { uploadJungleLeaderboardStats } from '../utils/jungleLeaderboard'
import { uploadSave, type CloudSaveData } from '../utils/cloudSave'
import { getEventPeriodKey, getFrenzyWeekKey, isConsecutiveWeek, type GameEvent } from './events'
import { FRENZY_STREAK_REWARDS, FRENZY_STREAK_LENGTH, JUNGLE_SQUAD_SIZE } from './constants'
import type { JungleRunState, JungleStats, JungleStageResult } from './jungleRun'
import { createJungleRun, createInitialJungleStats, calculateScore, applyHealingSpring, applyStageStartHealing, applyBoonStatsToSquad, isValidTransition } from './jungleRun'
import { generateBoonOffering, applyBoon, calculateBoonEffects, createPRNG, generateSeed } from './boons'
import { isHealingSpring } from './birds'
import {
  trackBaitPurchased,
  trackCoinsSpent,
  trackCoinsEarned,
  trackLevelUp,
  trackAchievementUnlocked,
  trackAchievementClaimed,
  trackDailyRewardClaimed,
  trackDogDefeated,
  trackProfileCreated,
} from '../utils/analytics'

export type View = 'bait' | 'collection' | 'inventory' | 'battle' | 'training' | 'jungle' | 'stats' | 'guide' | 'privacy' | 'terms'

export interface OwnedCat extends Cat {
  instanceId: string // Unique identifier for this specific cat instance
  level: number
  xp: number
  currentHp: number
  maxHp: number
  currentAttack: number
  totalBattles?: number
  totalWins?: number
  isElite?: boolean       // true if created via merge
  eliteTier?: number      // 1 = Elite, 2 = Prismatic
  mergedFromIds?: string[] // instanceIds of 3 consumed cats
  ascension?: number      // 0-3, number of ascensions (prestige resets)
  equipment?: { weapon?: string; accessory?: string; stone?: string } // equipped item IDs
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
  claimed: boolean
  progress: number
  maxProgress: number
}

export interface GameStats {
  totalBattles: number
  totalWins: number
  totalLosses: number
  totalCatsCollected: number
  totalCoinsEarned: number
  highestDogDefeated: number
  totalMerges: number
}

export interface ProfileMeta {
  id: string
  name: string
  created: number
  lastPlayed: number
  cloudCode?: string // Persistent save code for cloud backup
}

export interface ProfilesData {
  profiles: ProfileMeta[]
  activeProfileId: string
}

interface GameState {
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
  achievements: Achievement[]
  stats: GameStats
  lastDailyReward: number
  dailyStreak: number
  tutorialCompleted: boolean
  trainingCooldowns: Record<string, number[]>
  inventory: Record<string, number> // equipmentId -> qty
  completedEventRewards: string[] // event period keys like "halloween-2025"
  frenzyStreak: number // consecutive Friday participations
  lastFrenzyParticipation: string // week key like "2026-w6"
  saveError: string | null
  // Jungle of Talons
  junglePassUnlocked: boolean
  junglePassPending: boolean
  jungleRun: JungleRunState | null
  jungleStats: JungleStats
  jungleAnnouncementShown: boolean
  jungleTabVisited: boolean
  setView: (v:View)=>void
  addCoins: (n:number)=>void
  buyBait: (baitId:string)=>void
  useBait: (baitId:string)=>Cat | null
  befriendCat: (cat:Cat)=>void
  releaseCat: (catId:string)=>void
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
  recordTrainingComplete: (instanceId:string)=>void
  getTrainingSessions: (instanceId:string)=>{ remaining:number, nextAvailable:number|null }
  save: ()=>void
  load: ()=>void
  setTheme: (t:'light'|'dark')=>void
  toggleSound: ()=>void
  toggleMusic: ()=>void
  // Profile management
  getCurrentProfile: ()=>ProfileMeta | null
  getProfiles: ()=>ProfileMeta[]
  createProfile: (name:string)=>string
  loadProfile: (profileId:string)=>void
  deleteProfile: (profileId:string)=>void
  renameProfile: (profileId:string, name:string)=>void
  setProfileCloudCode: (code:string)=>void
  restoreProfile: (name:string, cloudCode:string, data:Record<string, unknown>)=>string
  unlockAlienPhase: ()=>void
  clearSaveError: ()=>void
  // Jungle of Talons actions
  startJungleRun: ()=>void
  selectJungleSquad: (catInstanceIds: [string, string, string])=>boolean
  completeJungleStage: (result: JungleStageResult)=>void
  selectJungleBoon: (boonId: string)=>void
  advanceJungleStage: ()=>void
  startJungleBattle: ()=>void
  abandonJungleRun: ()=>void
  finishJungleRun: ()=>void
  unlockJunglePass: ()=>void
  setJunglePassPending: (pending: boolean)=>void
  dismissJungleAnnouncement: ()=>void
  markJungleTabVisited: ()=>void
}

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

// Re-export from constants for backward compatibility within this file
import {
  calculateXpForLevel,
  calculateStatBoost,
  INITIAL_COINS,
  HEAL_COST,
  DAILY_REWARD_COINS,
  ACHIEVEMENT_REWARD_COINS,
  MAX_CAT_LEVEL,
  ELITE_TIER_1_MULTIPLIER,
  ELITE_TIER_2_MULTIPLIER,
  MAX_DAILY_TRAINING_SESSIONS,
  DEFAULT_BAITS,
  DAILY_STREAK_REWARDS,
  DAILY_STREAK_LENGTH,
  TWO_DAYS_MS,
  MAX_ASCENSION,
  ASCENSION_COSTS,
  ASCENSION_STAT_BONUS,
  getAscendedBaseStat,
} from './constants'

// Profile management helpers
const PROFILES_META_KEY = 'whiskerwars-profiles'
const PROFILE_KEY_PREFIX = 'whiskerwars-profile-'

const getProfilesData = (): ProfilesData => {
  const raw = localStorage.getItem(PROFILES_META_KEY)
  if (!raw) {
    // Migrate existing save to profile-1 if it exists
    const oldSave = localStorage.getItem('whiskerwars')
    if (oldSave) {
      const profile: ProfileMeta = {
        id: 'profile-1',
        name: 'Player 1',
        created: Date.now(),
        lastPlayed: Date.now()
      }
      localStorage.setItem(`${PROFILE_KEY_PREFIX}profile-1`, oldSave)
      localStorage.removeItem('whiskerwars')
      const data: ProfilesData = {
        profiles: [profile],
        activeProfileId: 'profile-1'
      }
      localStorage.setItem(PROFILES_META_KEY, JSON.stringify(data))
      return data
    }
    return { profiles: [], activeProfileId: '' }
  }
  try {
    return JSON.parse(raw)
  } catch {
    return { profiles: [], activeProfileId: '' }
  }
}

const saveProfilesData = (data: ProfilesData) => {
  localStorage.setItem(PROFILES_META_KEY, JSON.stringify(data))
}

let lastLeaderboardSync = 0
let lastCloudSync = 0
let stateLoaded = false

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id:'first-cat', name:'First Friend', description:'Befriend your first cat', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'cat-collector', name:'Cat Collector', description:'Befriend 10 cats', unlocked:false, claimed:false, progress:0, maxProgress:10 },
  { id:'cat-master', name:'Cat Master', description:'Befriend 25 cats', unlocked:false, claimed:false, progress:0, maxProgress:25 },
  { id:'first-victory', name:'First Victory', description:'Win your first battle', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'veteran', name:'Veteran', description:'Win 25 battles', unlocked:false, claimed:false, progress:0, maxProgress:25 },
  { id:'champion', name:'Champion', description:'Win 100 battles', unlocked:false, claimed:false, progress:0, maxProgress:100 },
  { id:'legendary-catch', name:'Legendary Catch', description:'Catch a Legendary or Mythical cat', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'level-10', name:'Power Up', description:'Level a cat to level 10', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'coin-hoarder', name:'Coin Hoarder', description:'Accumulate 1000 coins', unlocked:false, claimed:false, progress:0, maxProgress:1000 },
  { id:'dog-slayer', name:'Dog Slayer', description:'Defeat all dog enemies', unlocked:false, claimed:false, progress:0, maxProgress:15 },
  { id:'star-barks-victor', name:'Star Barks Victor', description:'Defeat all alien mutated dogs', unlocked:false, claimed:false, progress:0, maxProgress:9 },
  { id:'first-merge', name:'First Fusion', description:'Merge 3 cats into your first Elite', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'merge-master', name:'Merge Master', description:'Perform 5 cat merges', unlocked:false, claimed:false, progress:0, maxProgress:5 },
  { id:'fusion-champion', name:'Fusion Champion', description:'Perform 10 cat merges', unlocked:false, claimed:false, progress:0, maxProgress:10 },
  { id:'prismatic-power', name:'Prismatic Power', description:'Create a Tier 2 Prismatic cat', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'frenzy-collector', name:'Frenzy Collector', description:'Collect all 5 elemental stones', unlocked:false, claimed:false, progress:0, maxProgress:5 },
]

const getInitialGameState = () => ({
  view: 'bait' as View,
  coins: INITIAL_COINS,
  baits: { ...DEFAULT_BAITS },
  owned: [],
  selectedForBattle: [],
  favorites: [],
  dogIndex: 0,
  theme: 'dark' as 'light' | 'dark',
  soundEnabled: true,
  musicEnabled: true,
  achievements: INITIAL_ACHIEVEMENTS,
  stats: {
    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalCatsCollected: 0,
    totalCoinsEarned: 0,
    highestDogDefeated: -1,
    totalMerges: 0,
  },
  lastDailyReward: 0,
  dailyStreak: 0,
  difficultyLevel: 0, // For multi-dog battles after beating all dogs
  alienUnlocked: false, // Star Barks alien dogs
  tutorialCompleted: false,
  trainingCooldowns: {} as Record<string, number[]>,
  inventory: {} as Record<string, number>,
  completedEventRewards: [] as string[],
  frenzyStreak: 0,
  lastFrenzyParticipation: '',
  saveError: null as string | null,
  // Jungle of Talons
  junglePassUnlocked: false,
  junglePassPending: false,
  jungleRun: null as JungleRunState | null,
  jungleStats: createInitialJungleStats(),
  jungleAnnouncementShown: false,
  jungleTabVisited: false,
})

export const useGame = create<GameState>((set, get) => ({
  ...getInitialGameState(),

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

  releaseCat: (instanceId)=> set(s=> {
    const newOwned = s.owned.filter(cat => cat.instanceId !== instanceId)
    const newSelected = s.selectedForBattle.filter(id => id !== instanceId)
    return { owned: newOwned, selectedForBattle: newSelected }
  }),

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

  save: ()=> {
    if (!stateLoaded) return // Never persist unloaded/initial state
    const profilesData = getProfilesData()
    if (!profilesData.activeProfileId) return

    const s = get()
    const payload = JSON.stringify({
      coins: s.coins,
      baits: s.baits,
      owned: s.owned,
      selectedForBattle: s.selectedForBattle,
      dogIndex: s.dogIndex,
      difficultyLevel: s.difficultyLevel,
      alienUnlocked: s.alienUnlocked,
      favorites: s.favorites,
      theme: s.theme,
      soundEnabled: s.soundEnabled,
      musicEnabled: s.musicEnabled,
      achievements: s.achievements,
      stats: s.stats,
      lastDailyReward: s.lastDailyReward,
      dailyStreak: s.dailyStreak,
      tutorialCompleted: s.tutorialCompleted,
      trainingCooldowns: s.trainingCooldowns,
      inventory: s.inventory,
      completedEventRewards: s.completedEventRewards,
      frenzyStreak: s.frenzyStreak,
      lastFrenzyParticipation: s.lastFrenzyParticipation,
      junglePassUnlocked: s.junglePassUnlocked,
      jungleRun: s.jungleRun,
      jungleStats: s.jungleStats,
      jungleAnnouncementShown: s.jungleAnnouncementShown,
      jungleTabVisited: s.jungleTabVisited,
    })
    const storageKey = `${PROFILE_KEY_PREFIX}${profilesData.activeProfileId}`
    try {
      localStorage.setItem(storageKey, payload)
      // Verify write succeeded
      const readBack = localStorage.getItem(storageKey)
      if (readBack !== payload) {
        console.error('Save verification failed: data mismatch after write')
        set({ saveError: 'Save verification failed. Please get a save code to back up your data.' })
        return
      }
      // Clear any previous save error on successful save
      if (s.saveError) set({ saveError: null })
    } catch (error) {
      console.error('Failed to save game data (storage quota may be exceeded):', error)
      set({ saveError: 'Save failed — storage may be full. Get a save code to back up your data!' })
      return
    }

    // Update lastPlayed timestamp
    profilesData.profiles = profilesData.profiles.map(p =>
      p.id === profilesData.activeProfileId ? { ...p, lastPlayed: Date.now() } : p
    )
    saveProfilesData(profilesData)

    // Throttled leaderboard sync (at most once per 30 seconds, only after state is loaded)
    const profile = profilesData.profiles.find(p => p.id === profilesData.activeProfileId)
    if (stateLoaded && profile?.cloudCode) {
      const now = Date.now()
      if (now - lastLeaderboardSync > 30_000) {
        lastLeaderboardSync = now
        const uniqueCats = new Set(s.owned.map(c => c.id)).size
        uploadLeaderboardStats(profile.cloudCode, profile.name, {
          totalWins: s.stats.totalWins,
          highestDogDefeated: s.stats.highestDogDefeated,
          collectionCompletion: uniqueCats,
          totalMerges: s.stats.totalMerges,
        })
      }

      // Throttled cloud save sync (at most once per 2 minutes)
      if (now - lastCloudSync > 120_000) {
        lastCloudSync = now
        const cloudData: CloudSaveData = {
          coins: s.coins,
          baits: s.baits,
          owned: s.owned,
          dogIndex: s.dogIndex,
          difficultyLevel: s.difficultyLevel,
          alienUnlocked: s.alienUnlocked,
          favorites: s.favorites,
          theme: s.theme,
          achievements: s.achievements,
          stats: s.stats,
          lastDailyReward: s.lastDailyReward,
          tutorialCompleted: s.tutorialCompleted,
          trainingCooldowns: s.trainingCooldowns,
          selectedForBattle: s.selectedForBattle,
          dailyStreak: s.dailyStreak,
          soundEnabled: s.soundEnabled,
          musicEnabled: s.musicEnabled,
          inventory: s.inventory,
          completedEventRewards: s.completedEventRewards,
          frenzyStreak: s.frenzyStreak,
          lastFrenzyParticipation: s.lastFrenzyParticipation,
          junglePassUnlocked: s.junglePassUnlocked,
          jungleRun: s.jungleRun,
          jungleStats: s.jungleStats,
          jungleAnnouncementShown: s.jungleAnnouncementShown,
          jungleTabVisited: s.jungleTabVisited,
        }
        uploadSave(cloudData, profile, profile.cloudCode).catch(() => {})
      }
    }
  },

  load: ()=> {
    const profilesData = getProfilesData()
    if (!profilesData.activeProfileId) return

    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${profilesData.activeProfileId}`)
    if (!raw) return
    try {
      const d = JSON.parse(raw)

      // Merge saved achievements with INITIAL_ACHIEVEMENTS to pick up new ones
      const savedAchievements: Achievement[] = d.achievements ?? []
      const savedIds = new Set(savedAchievements.map((a: Achievement) => a.id))
      const mergedAchievements = [
        ...savedAchievements,
        ...INITIAL_ACHIEVEMENTS.filter(a => !savedIds.has(a.id)),
      ]

      // Normalize owned cat data to ensure all optional fields have defaults
      const normalizedOwned: OwnedCat[] = (d.owned ?? []).map((cat: OwnedCat) => ({
        ...cat,
        totalBattles: cat.totalBattles ?? 0,
        totalWins: cat.totalWins ?? 0,
        isElite: cat.isElite ?? false,
        eliteTier: cat.eliteTier ?? 0,
        mergedFromIds: cat.mergedFromIds ?? [],
        ascension: cat.ascension ?? 0,
      }))

      const savedStats = d.stats ?? {}
      set({
        coins: d.coins ?? INITIAL_COINS,
        baits: d.baits ?? { ...DEFAULT_BAITS },
        owned: normalizedOwned,
        selectedForBattle: d.selectedForBattle ?? [],
        dogIndex: d.dogIndex ?? 0,
        difficultyLevel: d.difficultyLevel ?? 0,
        alienUnlocked: d.alienUnlocked ?? false,
        favorites: d.favorites ?? [],
        theme: d.theme ?? 'dark',
        soundEnabled: d.soundEnabled ?? true,
        musicEnabled: d.musicEnabled ?? true,
        achievements: mergedAchievements,
        stats: {
          totalBattles: savedStats.totalBattles ?? 0,
          totalWins: savedStats.totalWins ?? 0,
          totalLosses: savedStats.totalLosses ?? 0,
          totalCatsCollected: savedStats.totalCatsCollected ?? 0,
          totalCoinsEarned: savedStats.totalCoinsEarned ?? 0,
          highestDogDefeated: savedStats.highestDogDefeated ?? -1,
          totalMerges: savedStats.totalMerges ?? 0,
        },
        lastDailyReward: d.lastDailyReward ?? 0,
        dailyStreak: d.dailyStreak ?? 0,
        tutorialCompleted: d.tutorialCompleted ?? false,
        trainingCooldowns: d.trainingCooldowns ?? {},
        inventory: d.inventory ?? {},
        completedEventRewards: d.completedEventRewards ?? [],
        frenzyStreak: d.frenzyStreak ?? 0,
        lastFrenzyParticipation: d.lastFrenzyParticipation ?? '',
        junglePassUnlocked: d.junglePassUnlocked ?? false,
        jungleRun: d.jungleRun ? {
          ...d.jungleRun,
          activeBoons: d.jungleRun.activeBoons ?? [],
          stageResults: d.jungleRun.stageResults ?? [],
          currentBoonOffering: d.jungleRun.currentBoonOffering ?? null,
          consecutiveAllCommonOfferings: d.jungleRun.consecutiveAllCommonOfferings ?? 0,
          prngCallCount: d.jungleRun.prngCallCount ?? 0,
          bossRevived: d.jungleRun.bossRevived ?? {},
          startedAt: d.jungleRun.startedAt ?? Date.now(),
        } : null,
        jungleStats: d.jungleStats ?? createInitialJungleStats(),
        jungleAnnouncementShown: d.jungleAnnouncementShown ?? false,
        jungleTabVisited: d.jungleTabVisited ?? false,
      })
      stateLoaded = true
    } catch (error) {
      console.error('Failed to load save data:', error)
    }
  },
  setTheme: (t)=> set({ theme: t }),
  toggleSound: ()=> set(s=> ({ soundEnabled: !s.soundEnabled })),
  toggleMusic: ()=> set(s=> ({ musicEnabled: !s.musicEnabled })),

  // Profile management implementations
  getCurrentProfile: ()=> {
    const data = getProfilesData()
    return data.profiles.find(p => p.id === data.activeProfileId) || null
  },

  getProfiles: ()=> {
    return getProfilesData().profiles
  },

  createProfile: (name)=> {
    const data = getProfilesData()
    const profileId = crypto.randomUUID()
    const newProfile: ProfileMeta = {
      id: profileId,
      name: name || `Player ${data.profiles.length + 1}`,
      created: Date.now(),
      lastPlayed: Date.now()
    }
    data.profiles.push(newProfile)
    data.activeProfileId = profileId
    saveProfilesData(data)

    // Immediately save initial game state so it's not lost if browser closes
    set(getInitialGameState())
    stateLoaded = true // New profile: initial state IS the canonical state
    get().save()

    trackProfileCreated(newProfile.id)
    return newProfile.id
  },

  loadProfile: (profileId)=> {
    const data = getProfilesData()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return

    data.activeProfileId = profileId
    saveProfilesData(data)

    // Reset flags so new profile's stats get uploaded fresh
    stateLoaded = false
    lastLeaderboardSync = 0

    // Reset to initial state first, then load saved data if it exists
    set(getInitialGameState())
    get().load()
  },

  deleteProfile: (profileId)=> {
    const data = getProfilesData()
    data.profiles = data.profiles.filter(p => p.id !== profileId)
    if (data.activeProfileId === profileId) {
      data.activeProfileId = data.profiles[0]?.id || ''
    }
    localStorage.removeItem(`${PROFILE_KEY_PREFIX}${profileId}`)
    saveProfilesData(data)
  },

  renameProfile: (profileId, name)=> {
    const data = getProfilesData()
    data.profiles = data.profiles.map(p =>
      p.id === profileId ? { ...p, name } : p
    )
    saveProfilesData(data)
  },

  setProfileCloudCode: (code)=> {
    const data = getProfilesData()
    if (!data.activeProfileId) return
    data.profiles = data.profiles.map(p =>
      p.id === data.activeProfileId ? { ...p, cloudCode: code } : p
    )
    saveProfilesData(data)
  },

  restoreProfile: (name, cloudCode, cloudData)=> {
    const d = cloudData as Record<string, any>
    const data = getProfilesData()
    const profileId = crypto.randomUUID()
    const now = Date.now()
    const newProfile: ProfileMeta = {
      id: profileId,
      name: name || 'Restored Profile',
      created: now,
      lastPlayed: now,
      cloudCode,
    }
    data.profiles.push(newProfile)
    data.activeProfileId = profileId
    saveProfilesData(data)

    // Write cloud data directly to localStorage for this profile (skip initial state)
    const payload = JSON.stringify({
      coins: d.coins ?? INITIAL_COINS,
      baits: d.baits ?? { ...DEFAULT_BAITS },
      owned: d.owned ?? [],
      selectedForBattle: d.selectedForBattle ?? [],
      dogIndex: d.dogIndex ?? 0,
      difficultyLevel: d.difficultyLevel ?? 0,
      favorites: d.favorites ?? [],
      theme: d.theme ?? 'dark',
      soundEnabled: d.soundEnabled ?? true,
      musicEnabled: d.musicEnabled ?? true,
      achievements: d.achievements ?? INITIAL_ACHIEVEMENTS,
      stats: d.stats ?? { totalBattles: 0, totalWins: 0, totalLosses: 0, totalCatsCollected: 0, totalCoinsEarned: 0, highestDogDefeated: -1, totalMerges: 0 },
      lastDailyReward: d.lastDailyReward ?? 0,
      dailyStreak: d.dailyStreak ?? 0,
      tutorialCompleted: d.tutorialCompleted ?? false,
      trainingCooldowns: d.trainingCooldowns ?? {},
      inventory: d.inventory ?? {},
      completedEventRewards: d.completedEventRewards ?? [],
      frenzyStreak: d.frenzyStreak ?? 0,
      lastFrenzyParticipation: d.lastFrenzyParticipation ?? '',
      junglePassUnlocked: d.junglePassUnlocked ?? false,
      jungleRun: d.jungleRun ?? null,
      jungleStats: d.jungleStats ?? createInitialJungleStats(),
      jungleAnnouncementShown: d.jungleAnnouncementShown ?? false,
      jungleTabVisited: d.jungleTabVisited ?? false,
    })
    try {
      localStorage.setItem(`${PROFILE_KEY_PREFIX}${profileId}`, payload)
    } catch (error) {
      console.error('Failed to save restored profile:', error)
    }

    // Now load the profile (reads the data we just wrote)
    stateLoaded = false
    lastLeaderboardSync = 0
    lastCloudSync = 0
    set(getInitialGameState())
    get().load()

    return profileId
  },

  clearSaveError: ()=> set({ saveError: null }),

  // ===== Jungle of Talons Actions =====

  startJungleRun: ()=> {
    const s = get()
    if (!s.junglePassUnlocked) return
    if (s.jungleRun && s.jungleRun.phase !== 'idle') return
    set({ jungleRun: {
      runId: '', seed: 0, phase: 'squad_select' as const,
      currentStage: 0, squad: [], activeBoons: [],
      stageResults: [], currentBoonOffering: null,
      consecutiveAllCommonOfferings: 0, prngCallCount: 0,
      bossRevived: {}, startedAt: 0,
    } as JungleRunState })
  },

  selectJungleSquad: (catInstanceIds)=> {
    const s = get()
    if (!s.junglePassUnlocked) return false

    // Validate cats exist, are alive, and we have exactly 3
    const cats = catInstanceIds.map(id => s.owned.find(c => c.instanceId === id)).filter(Boolean) as OwnedCat[]
    if (cats.length !== JUNGLE_SQUAD_SIZE) return false
    if (cats.some(c => c.currentHp <= 0)) return false

    const seed = generateSeed(catInstanceIds.join('-') + Date.now())
    const run = createJungleRun(cats, seed)

    set({
      jungleRun: run,
      jungleStats: { ...s.jungleStats, totalRuns: s.jungleStats.totalRuns + 1 },
    })
    get().save()
    return true
  },

  completeJungleStage: (result)=> {
    set(s => {
      if (!s.jungleRun) return s
      const run = s.jungleRun

      const newResults = [...run.stageResults, result]

      // Update squad HP from result
      const updatedSquad = run.squad.map(cat => {
        const hp = result.catHpRemaining[cat.instanceId]
        if (hp !== undefined) {
          return {
            ...cat,
            currentHp: Math.max(0, hp),
            knockedOut: hp <= 0 ? true : cat.knockedOut,
          }
        }
        return cat
      })

      // Check if all cats are knocked out
      const allDead = updatedSquad.every(c => c.knockedOut)
      if (allDead) {
        return {
          jungleRun: {
            ...run,
            phase: 'run_failed' as const,
            squad: updatedSquad,
            stageResults: newResults,
          },
        }
      }

      // Stage 20 completed = run complete
      if (run.currentStage >= 20) {
        return {
          jungleRun: {
            ...run,
            phase: 'run_complete' as const,
            squad: updatedSquad,
            stageResults: newResults,
          },
        }
      }

      // Generate boon offering
      const prng = createPRNG(run.seed)
      // Advance PRNG to correct position
      for (let i = 0; i < run.prngCallCount; i++) prng()

      let callCount = run.prngCallCount
      const fortuneStacks = run.activeBoons.find(b => b.boonId === 'fortune-favor')?.stacks ?? 0
      const offering = generateBoonOffering(
        () => { callCount++; return prng() },
        run.activeBoons,
        run.consecutiveAllCommonOfferings,
        fortuneStacks,
      )

      return {
        jungleRun: {
          ...run,
          phase: 'boon_select' as const,
          squad: updatedSquad,
          stageResults: newResults,
          currentBoonOffering: offering,
          prngCallCount: callCount,
        },
      }
    })
    get().save()
  },

  selectJungleBoon: (boonId)=> {
    set(s => {
      if (!s.jungleRun || s.jungleRun.phase !== 'boon_select') return s
      const run = s.jungleRun

      const newActiveBoons = applyBoon(run.activeBoons, boonId)
      const boonEffects = calculateBoonEffects(newActiveBoons)
      const updatedSquad = applyBoonStatsToSquad(run.squad, boonEffects)

      // Track pity timer
      const allCommon = run.currentBoonOffering?.boons.every(b => b.rarity === 'Common') ?? false
      const newPityCount = allCommon ? run.consecutiveAllCommonOfferings + 1 : 0

      return {
        jungleRun: {
          ...run,
          phase: 'stage_cleared' as const,
          activeBoons: newActiveBoons,
          squad: updatedSquad,
          currentBoonOffering: null,
          consecutiveAllCommonOfferings: newPityCount,
        },
      }
    })
    get().save()
  },

  advanceJungleStage: ()=> {
    set(s => {
      if (!s.jungleRun) return s
      const run = s.jungleRun

      // Safety check: if all cats are KO'd, end the run
      if (run.squad.every(c => c.knockedOut)) {
        return {
          jungleRun: {
            ...run,
            phase: 'run_failed' as const,
          },
        }
      }

      // From healing_spring: stage already incremented, just move to pre_battle
      if (run.phase === 'healing_spring') {
        return {
          jungleRun: {
            ...run,
            phase: 'pre_battle' as const,
          },
        }
      }

      if (run.phase !== 'stage_cleared') return s
      const nextStage = run.currentStage + 1

      // Apply Rally Cry healing at stage start
      const boonEffects = calculateBoonEffects(run.activeBoons)
      let updatedSquad = applyStageStartHealing(run.squad, boonEffects.stageStartHeal)

      // Check for Healing Springs
      if (isHealingSpring(run.currentStage)) {
        updatedSquad = applyHealingSpring(updatedSquad)
        return {
          jungleRun: {
            ...run,
            phase: 'healing_spring' as const,
            currentStage: nextStage,
            squad: updatedSquad,
          },
        }
      }

      return {
        jungleRun: {
          ...run,
          phase: 'pre_battle' as const,
          currentStage: nextStage,
          squad: updatedSquad,
        },
      }
    })
    get().save()
  },

  startJungleBattle: ()=> {
    set(s => {
      if (!s.jungleRun || s.jungleRun.phase !== 'pre_battle') return s
      return { jungleRun: { ...s.jungleRun, phase: 'in_battle' as const } }
    })
  },

  abandonJungleRun: ()=> {
    set(s => {
      if (!s.jungleRun) return s
      // Transition to run_failed so the defeat recap modal shows
      return {
        jungleRun: {
          ...s.jungleRun,
          phase: 'run_failed' as const,
        },
      }
    })
    get().save()
  },

  finishJungleRun: ()=> {
    set(s => {
      if (!s.jungleRun) return s
      const run = s.jungleRun
      const score = calculateScore(run)
      const runDuration = Date.now() - run.startedAt
      const isComplete = run.phase === 'run_complete'

      const newStats: JungleStats = {
        ...s.jungleStats,
        totalRunsCompleted: isComplete ? s.jungleStats.totalRunsCompleted + 1 : s.jungleStats.totalRunsCompleted,
        bestScore: Math.max(s.jungleStats.bestScore, score.totalScore),
        bestStage: Math.max(s.jungleStats.bestStage, run.currentStage),
        totalCoinsEarned: s.jungleStats.totalCoinsEarned + score.coinsEarned,
        fastestCompletionMs: isComplete
          ? (s.jungleStats.fastestCompletionMs === null
            ? runDuration
            : Math.min(s.jungleStats.fastestCompletionMs, runDuration))
          : s.jungleStats.fastestCompletionMs,
      }

      return {
        jungleRun: null,
        jungleStats: newStats,
        coins: s.coins + score.coinsEarned,
      }
    })
    get().save()

    // Upload to jungle leaderboard
    const state = get()
    const profile = state.getCurrentProfile()
    if (profile?.cloudCode) {
      uploadJungleLeaderboardStats(profile.cloudCode, profile.name, {
        bestScore: state.jungleStats.bestScore,
        highestStage: state.jungleStats.bestStage,
        totalClears: state.jungleStats.totalRunsCompleted,
        fastestClearMs: state.jungleStats.fastestCompletionMs,
      }).catch(() => {})
    }
  },

  unlockJunglePass: ()=> {
    set({ junglePassUnlocked: true, junglePassPending: false })
    get().save()
  },

  setJunglePassPending: (pending)=> set({ junglePassPending: pending }),

  dismissJungleAnnouncement: ()=> {
    set({ jungleAnnouncementShown: true })
    get().save()
  },

  markJungleTabVisited: ()=> {
    set({ jungleTabVisited: true })
    get().save()
  },
}))

// Debounced auto-save: only saves when state actually changes
let saveTimeout: ReturnType<typeof setTimeout> | null = null
useGame.subscribe(() => {
  if (!stateLoaded) return // Don't schedule saves during init/profile switching
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    useGame.getState().save()
    saveTimeout = null
  }, 3000)
})

// Save when page becomes hidden (tab switch, app switch, lid close)
// Critical for Chromebooks which aggressively freeze tabs
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && stateLoaded) {
    useGame.getState().save()
  }
})

// Save when page is being unloaded (browser close, navigation)
window.addEventListener('pagehide', () => {
  if (stateLoaded) useGame.getState().save()
})

// Redundant save on beforeunload (some browsers, especially older Firefox, don't fire pagehide reliably)
window.addEventListener('beforeunload', () => {
  if (stateLoaded) useGame.getState().save()
})
