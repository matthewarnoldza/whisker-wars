
import { create } from 'zustand'
import type { Cat, Dog, Bait, Rarity } from './data'
import { BAITS, CATS, DOGS, rarityByTier } from './data'
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

export type View = 'bait' | 'collection' | 'battle' | 'training' | 'stats' | 'privacy' | 'terms'

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
  theme: 'light' | 'dark'
  soundEnabled: boolean // Toggle for dice roll sounds
  achievements: Achievement[]
  stats: GameStats
  lastDailyReward: number
  tutorialCompleted: boolean
  trainingCooldowns: Record<string, number[]>
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
  completeTutorial: ()=>void
  recordTrainingComplete: (instanceId:string)=>void
  getTrainingSessions: (instanceId:string)=>{ remaining:number, nextAvailable:number|null }
  save: ()=>void
  load: ()=>void
  setTheme: (t:'light'|'dark')=>void
  toggleSound: ()=>void
  // Profile management
  getCurrentProfile: ()=>ProfileMeta | null
  getProfiles: ()=>ProfileMeta[]
  createProfile: (name:string)=>string
  loadProfile: (profileId:string)=>void
  deleteProfile: (profileId:string)=>void
  renameProfile: (profileId:string, name:string)=>void
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

const calculateXpForLevel = (level:number): number => {
  return Math.floor(50 * Math.pow(1.5, level - 1))
}

const calculateStatBoost = (baseValue:number, level:number): number => {
  return Math.floor(baseValue + (level - 1) * (baseValue * 0.15))
}

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
  { id:'dog-slayer', name:'Dog Slayer', description:'Defeat all dog enemies', unlocked:false, claimed:false, progress:0, maxProgress:DOGS.length },
  { id:'first-merge', name:'First Fusion', description:'Merge 3 cats into your first Elite', unlocked:false, claimed:false, progress:0, maxProgress:1 },
  { id:'merge-master', name:'Merge Master', description:'Perform 5 cat merges', unlocked:false, claimed:false, progress:0, maxProgress:5 },
  { id:'fusion-champion', name:'Fusion Champion', description:'Perform 10 cat merges', unlocked:false, claimed:false, progress:0, maxProgress:10 },
  { id:'prismatic-power', name:'Prismatic Power', description:'Create a Tier 2 Prismatic cat', unlocked:false, claimed:false, progress:0, maxProgress:1 },
]

const getInitialGameState = () => ({
  view: 'bait' as View,
  coins: 120,
  baits: { 'toy-mouse': 1, 'silver-sardine': 1 },
  owned: [],
  selectedForBattle: [],
  favorites: [],
  dogIndex: 0,
  theme: 'dark' as 'light' | 'dark',
  soundEnabled: true,
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
  difficultyLevel: 0, // For multi-dog battles after beating all dogs
  tutorialCompleted: false,
  trainingCooldowns: {} as Record<string, number[]>,
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
    const bait = BAITS.find(b=> b.id===baitId)!
    const cat = getRandomCatByBait(bait)
    set({ baits: { ...s.baits, [baitId]: qty-1 } })
    return cat
  },

  befriendCat: (cat)=> set(s=>{
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
  }),

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

  nextDog: ()=> set(s=> {
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
      // Unlock achievement on first completion of all dogs
      if (s.dogIndex >= DOGS.length - 1 && s.difficultyLevel === 0) {
        get().unlockAchievement('dog-slayer')
      }
    }, 100)

    return { dogIndex: newIndex, difficultyLevel: newDifficultyLevel, stats: newStats }
  }),

  addXpToCat: (instanceId, amount)=> set(s=> {
    const owned = s.owned.map(cat => {
      if (cat.instanceId !== instanceId) return cat

      let newXp = cat.xp + amount
      let newLevel = cat.level
      let newMaxHp = cat.maxHp
      let newCurrentAttack = cat.currentAttack

      // Level up logic
      while (newXp >= calculateXpForLevel(newLevel) && newLevel < 10) {
        newXp -= calculateXpForLevel(newLevel)
        newLevel++
        newMaxHp = calculateStatBoost(cat.health, newLevel)
        newCurrentAttack = calculateStatBoost(cat.attack, newLevel)
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
    const HEAL_COST = 25
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

  recordBattleResult: (won, xpEarned)=> set(s=> {
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
  }),

  claimDailyReward: ()=> {
    const now = Date.now()
    const lastReward = get().lastDailyReward
    const oneDayMs = 24 * 60 * 60 * 1000

    if (now - lastReward >= oneDayMs) {
      const rewardCoins = 50
      get().addCoins(rewardCoins)
      set({ lastDailyReward: now })
      trackDailyRewardClaimed(rewardCoins)
      trackCoinsEarned('daily_reward', rewardCoins)
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
    const statMultiplier = newTier === 1 ? 1.20 : 1.35
    const baseCat = CATS.find(c => c.id === templateId)!

    const newMaxHp = Math.floor(calculateStatBoost(baseCat.health, highestLevel) * statMultiplier)
    const newAttack = Math.floor(calculateStatBoost(baseCat.attack, highestLevel) * statMultiplier)

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
    })

    // Check achievements
    setTimeout(() => {
      const g = get()
      g.unlockAchievement('first-merge')
      g.updateAchievementProgress('merge-master', newMerges)
      g.updateAchievementProgress('fusion-champion', newMerges)
      if (newTier === 2) g.unlockAchievement('prismatic-power')
    }, 100)

    return eliteCat
  },

  claimAchievement: (id)=> set(s=> {
    const ach = s.achievements.find(a => a.id === id)
    if (!ach || !ach.unlocked || ach.claimed) return {}

    trackAchievementClaimed(id, ach.name, 100)
    trackCoinsEarned('achievement', 100)

    const achievements = s.achievements.map(a =>
      a.id === id ? { ...a, claimed: true } : a
    )

    return {
      achievements,
      coins: s.coins + 100
    }
  }),

  completeTutorial: ()=> set({ tutorialCompleted: true }),

  recordTrainingComplete: (instanceId)=> set(s => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const existing = (s.trainingCooldowns[instanceId] || []).filter(t => now - t < oneDayMs)
    if (existing.length >= 3) return s
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
    const profilesData = getProfilesData()
    if (!profilesData.activeProfileId) return

    const s = get()
    const payload = JSON.stringify({
      coins: s.coins,
      baits: s.baits,
      owned: s.owned,
      dogIndex: s.dogIndex,
      difficultyLevel: s.difficultyLevel,
      favorites: s.favorites,
      theme: s.theme,
      achievements: s.achievements,
      stats: s.stats,
      lastDailyReward: s.lastDailyReward,
      tutorialCompleted: s.tutorialCompleted,
      trainingCooldowns: s.trainingCooldowns,
    })
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${profilesData.activeProfileId}`, payload)

    // Update lastPlayed timestamp
    profilesData.profiles = profilesData.profiles.map(p =>
      p.id === profilesData.activeProfileId ? { ...p, lastPlayed: Date.now() } : p
    )
    saveProfilesData(profilesData)
  },

  load: ()=> {
    const profilesData = getProfilesData()
    if (!profilesData.activeProfileId) return

    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${profilesData.activeProfileId}`)
    if (!raw) return
    try {
      const d = JSON.parse(raw)

      // Merge saved achievements with INITIAL_ACHIEVEMENTS to pick up new ones
      const savedAchievements: Achievement[] = d.achievements || []
      const savedIds = new Set(savedAchievements.map((a: Achievement) => a.id))
      const mergedAchievements = [
        ...savedAchievements,
        ...INITIAL_ACHIEVEMENTS.filter(a => !savedIds.has(a.id)),
      ]

      const savedStats = d.stats || {}
      set({
        coins: d.coins || 120,
        baits: d.baits || { 'toy-mouse': 1, 'silver-sardine': 1 },
        owned: d.owned || [],
        dogIndex: d.dogIndex || 0,
        difficultyLevel: d.difficultyLevel || 0,
        favorites: d.favorites || [],
        theme: d.theme || 'dark',
        achievements: mergedAchievements,
        stats: {
          totalBattles: savedStats.totalBattles || 0,
          totalWins: savedStats.totalWins || 0,
          totalLosses: savedStats.totalLosses || 0,
          totalCatsCollected: savedStats.totalCatsCollected || 0,
          totalCoinsEarned: savedStats.totalCoinsEarned || 0,
          highestDogDefeated: savedStats.highestDogDefeated ?? -1,
          totalMerges: savedStats.totalMerges || 0,
        },
        lastDailyReward: d.lastDailyReward || 0,
        tutorialCompleted: d.tutorialCompleted || false,
        trainingCooldowns: d.trainingCooldowns || {},
      })
    } catch {}
  },
  setTheme: (t)=> set({ theme: t }),
  toggleSound: ()=> set(s=> ({ soundEnabled: !s.soundEnabled })),

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
    const profileNumber = data.profiles.length + 1
    const newProfile: ProfileMeta = {
      id: `profile-${profileNumber}`,
      name: name || `Player ${profileNumber}`,
      created: Date.now(),
      lastPlayed: Date.now()
    }
    data.profiles.push(newProfile)
    saveProfilesData(data)
    trackProfileCreated(newProfile.id)
    return newProfile.id
  },

  loadProfile: (profileId)=> {
    const data = getProfilesData()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return

    data.activeProfileId = profileId
    saveProfilesData(data)

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
}))

// Auto-save every 5 seconds (reduced from 1.5s to reduce main thread blocking)
setInterval(() => {
  useGame.getState().save()
}, 5000)

// Save when page becomes hidden (tab switch, app switch, lid close)
// Critical for Chromebooks which aggressively freeze tabs
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    useGame.getState().save()
  }
})

// Save when page is being unloaded (browser close, navigation)
window.addEventListener('pagehide', () => {
  useGame.getState().save()
})
