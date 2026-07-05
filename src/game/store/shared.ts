// Shared types, initial-state factories, and cross-slice helpers for the store.
//
// This module is imported by every slice. It holds the public value types that
// used to live in store.ts (View / OwnedCat / Achievement / GameStats /
// ProfileMeta / ProfilesData), the per-domain initial-state factories, the
// profile-localStorage helpers, and the small bag of module-level sync flags that
// several slices mutate. It deliberately imports NO slice module, so it can be
// depended on without creating a runtime import cycle.
//
// The list of PERSISTED fields is NOT declared here — that single source of truth
// lives in src/game/saveData.ts (buildSavePayload / SaveDataSchema).

import type { Cat } from '../data'
import { INITIAL_COINS, DEFAULT_BAITS } from '../constants'
import { createInitialJungleStats } from '../jungleRun'
import type { JungleRunState, JungleStats } from '../jungleRun'

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

// Profile management helpers
export const PROFILES_META_KEY = 'whiskerwars-profiles'
export const PROFILE_KEY_PREFIX = 'whiskerwars-profile-'

// Shown via the existing saveError surface when a save/cloud blob fails to parse.
// We never wipe the current in-memory data on a parse failure — corrupt data is
// left untouched so the player can recover from a save code.
export const SAVE_CORRUPT_MSG = 'Saved data could not be read and was left untouched. If this keeps happening, restore from a save code.'

export const getProfilesData = (): ProfilesData => {
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

export const saveProfilesData = (data: ProfilesData) => {
  localStorage.setItem(PROFILES_META_KEY, JSON.stringify(data))
}

// Module-level sync flags shared across the sync + profiles slices and the
// module-level side effects in index.ts. Kept in one mutable holder so slices in
// separate files can read/write the same values (previously plain `let`s).
export const syncFlags = {
  lastLeaderboardSync: 0,
  lastCloudSync: 0,
  stateLoaded: false,
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
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

// ===== Per-domain initial-state factories =====
//
// Split from the original single getInitialGameState so each slice can seed its
// own fields, while getInitialGameState (composed below) stays the single reset
// source used when switching/creating profiles.

export const getCoreInitialState = () => ({
  view: 'bait' as View,
  coins: INITIAL_COINS,
  baits: { ...DEFAULT_BAITS },
  owned: [] as OwnedCat[],
  selectedForBattle: [] as string[],
  favorites: [] as string[],
  dogIndex: 0,
  theme: 'dark' as 'light' | 'dark',
  soundEnabled: true,
  musicEnabled: true,
  sfxVolume: 0.5,
  musicVolume: 0.2,
  reducedMotion: false,
  colorblindMode: false,
  achievements: INITIAL_ACHIEVEMENTS,
  stats: {
    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalCatsCollected: 0,
    totalCoinsEarned: 0,
    highestDogDefeated: -1,
    totalMerges: 0,
  } as GameStats,
  lastDailyReward: 0,
  dailyStreak: 0,
  difficultyLevel: 0, // For multi-dog battles after beating all dogs
  alienUnlocked: false, // Star Barks alien dogs
  tutorialCompleted: false,
  hintsSeen: [] as string[], // ids of first-run coach-marks already shown (see useFirstRunHints)
  trainingCooldowns: {} as Record<string, number[]>,
  inventory: {} as Record<string, number>,
  completedEventRewards: [] as string[],
  frenzyStreak: 0,
  lastFrenzyParticipation: '',
})

export const getSyncInitialState = () => ({
  saveError: null as string | null,
  // Cloud (save-code) backup sync status — transient, never persisted.
  cloudSyncError: null as string | null,
  lastCloudSyncAt: null as number | null,
})

export const getJungleInitialState = () => ({
  // Jungle of Talons
  junglePassUnlocked: false,
  junglePassPending: false,
  jungleRun: null as JungleRunState | null,
  jungleStats: createInitialJungleStats() as JungleStats,
  unlockedJungleMedals: [] as string[],
  jungleAnnouncementShown: false,
  jungleTabVisited: false,
})

// Full reset factory — the single source of truth for "brand new / switched
// profile" state. Used by the profiles slice when creating/loading/restoring.
export const getInitialGameState = () => ({
  ...getCoreInitialState(),
  ...getSyncInitialState(),
  ...getJungleInitialState(),
})
