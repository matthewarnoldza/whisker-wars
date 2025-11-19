
import { create } from 'zustand'
import type { Cat, Dog, Bait, Rarity } from './data'
import { BAITS, CATS, DOGS, rarityByTier } from './data'

export type View = 'bait' | 'collection' | 'battle'

export interface OwnedCat extends Cat {
  level: number
  xp: number
  currentHp: number
  maxHp: number
  currentAttack: number
  totalBattles?: number
  totalWins?: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
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
}

interface GameState {
  view: View
  coins: number
  baits: Record<string, number> // baitId -> qty
  owned: OwnedCat[]
  selectedForBattle: string[]
  dogIndex: number
  theme: 'light' | 'dark'
  achievements: Achievement[]
  stats: GameStats
  lastDailyReward: number
  setView: (v:View)=>void
  addCoins: (n:number)=>void
  buyBait: (baitId:string)=>void
  useBait: (baitId:string)=>Cat | null
  befriendCat: (cat:Cat)=>void
  releaseCat: (catId:string)=>void
  toggleSelectCat: (id:string)=>void
  nextDog: ()=>void
  addXpToCat: (catId:string, amount:number)=>void
  healCat: (catId:string, amount:number)=>void
  healAllCats: ()=>void
  updateCatHp: (catId:string, newHp:number)=>void
  recordBattleResult: (won:boolean, xpEarned:number)=>void
  claimDailyReward: ()=>boolean
  unlockAchievement: (id:string)=>void
  save: ()=>void
  load: ()=>void
  setTheme: (t:'light'|'dark')=>void
}

const rand = (min:number, max:number)=> Math.floor(Math.random()*(max-min+1))+min

const getRandomCatByBait = (bait:Bait): Cat | null => {
  const rarities = rarityByTier(bait.tier)
  const pool = CATS.filter(c=> rarities.includes(c.rarity as Rarity))
  if (!pool.length) return null
  // small chance no cat appears
  if (Math.random() < 0.15) return null
  return pool[rand(0, pool.length-1)]
}

const calculateXpForLevel = (level:number): number => {
  return Math.floor(50 * Math.pow(1.5, level - 1))
}

const calculateStatBoost = (baseValue:number, level:number): number => {
  return Math.floor(baseValue + (level - 1) * (baseValue * 0.15))
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id:'first-cat', name:'First Friend', description:'Befriend your first cat', unlocked:false, progress:0, maxProgress:1 },
  { id:'cat-collector', name:'Cat Collector', description:'Befriend 10 cats', unlocked:false, progress:0, maxProgress:10 },
  { id:'cat-master', name:'Cat Master', description:'Befriend 25 cats', unlocked:false, progress:0, maxProgress:25 },
  { id:'first-victory', name:'First Victory', description:'Win your first battle', unlocked:false, progress:0, maxProgress:1 },
  { id:'veteran', name:'Veteran', description:'Win 25 battles', unlocked:false, progress:0, maxProgress:25 },
  { id:'champion', name:'Champion', description:'Win 100 battles', unlocked:false, progress:0, maxProgress:100 },
  { id:'legendary-catch', name:'Legendary Catch', description:'Catch a Legendary or Mythical cat', unlocked:false, progress:0, maxProgress:1 },
  { id:'level-10', name:'Power Up', description:'Level a cat to level 10', unlocked:false, progress:0, maxProgress:1 },
  { id:'coin-hoarder', name:'Coin Hoarder', description:'Accumulate 1000 coins', unlocked:false, progress:0, maxProgress:1000 },
  { id:'dog-slayer', name:'Dog Slayer', description:'Defeat all dog enemies', unlocked:false, progress:0, maxProgress:DOGS.length },
]

export const useGame = create<GameState>((set, get) => ({
  view: 'bait',
  coins: 120,
  baits: { 'toy-mouse': 1, 'silver-sardine': 1 },
  owned: [],
  selectedForBattle: [],
  dogIndex: 0,
  theme: 'dark', // Default to dark theme for cyber aesthetic
  achievements: INITIAL_ACHIEVEMENTS,
  stats: {
    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalCatsCollected: 0,
    totalCoinsEarned: 0,
    highestDogDefeated: -1,
  },
  lastDailyReward: 0,

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

  releaseCat: (catId)=> set(s=> {
    const newOwned = s.owned.filter(cat => cat.id !== catId)
    const newSelected = s.selectedForBattle.filter(id => id !== catId)
    return { owned: newOwned, selectedForBattle: newSelected }
  }),

  toggleSelectCat: (id)=> set(s=>{
    const sel = new Set(s.selectedForBattle)
    if (sel.has(id)) sel.delete(id)
    else if (sel.size < 3) sel.add(id)
    return { selectedForBattle: [...sel] }
  }),

  nextDog: ()=> set(s=> {
    const newIndex = Math.min(DOGS.length-1, s.dogIndex+1)
    const newStats = { ...s.stats, highestDogDefeated: Math.max(s.stats.highestDogDefeated, newIndex) }
    setTimeout(() => {
      if (newIndex >= DOGS.length - 1) {
        get().unlockAchievement('dog-slayer')
      }
    }, 100)
    return { dogIndex: newIndex, stats: newStats }
  }),

  addXpToCat: (catId, amount)=> set(s=> {
    const owned = s.owned.map(cat => {
      if (cat.id !== catId) return cat

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

  healCat: (catId, amount)=> set(s=> ({
    owned: s.owned.map(cat =>
      cat.id === catId
        ? { ...cat, currentHp: Math.min(cat.maxHp, cat.currentHp + amount) }
        : cat
    )
  })),

  healAllCats: ()=> set(s=> ({
    owned: s.owned.map(cat => ({ ...cat, currentHp: cat.maxHp }))
  })),

  updateCatHp: (catId, newHp)=> set(s=> ({
    owned: s.owned.map(cat =>
      cat.id === catId
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

    // Update selected cats
    const selectedCats = s.owned.filter(cat => s.selectedForBattle.includes(cat.id))
    const owned = s.owned.map(cat => {
      if (!s.selectedForBattle.includes(cat.id)) return cat
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
      const rewardCoins = 100
      get().addCoins(rewardCoins)
      set({ lastDailyReward: now })
      return true
    }
    return false
  },

  unlockAchievement: (id)=> set(s=> {
    const achievements = s.achievements.map(ach => {
      if (ach.id === id && !ach.unlocked) {
        // Grant reward for unlocking achievement
        setTimeout(() => get().addCoins(50), 0)
        return { ...ach, unlocked: true, progress: ach.maxProgress }
      }
      return ach
    })
    return { achievements }
  }),

  save: ()=> {
    const s = get()
    const payload = JSON.stringify({
      coins: s.coins,
      baits: s.baits,
      owned: s.owned,
      dogIndex: s.dogIndex,
      theme: s.theme,
      achievements: s.achievements,
      stats: s.stats,
      lastDailyReward: s.lastDailyReward,
    })
    localStorage.setItem('whiskerwars', payload)
  },
  load: ()=> {
    const raw = localStorage.getItem('whiskerwars')
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      set({
        coins: d.coins || 120,
        baits: d.baits || { 'toy-mouse': 1, 'silver-sardine': 1 },
        owned: d.owned || [],
        dogIndex: d.dogIndex || 0,
        theme: d.theme || 'dark',
        achievements: d.achievements || INITIAL_ACHIEVEMENTS,
        stats: d.stats || {
          totalBattles: 0,
          totalWins: 0,
          totalLosses: 0,
          totalCatsCollected: 0,
          totalCoinsEarned: 0,
          highestDogDefeated: -1,
        },
        lastDailyReward: d.lastDailyReward || 0,
      })
    } catch {}
  },
  setTheme: (t)=> set({ theme: t }),
}))

// Auto-save every 1.5 seconds
setInterval(() => {
  useGame.getState().save()
}, 1500)
