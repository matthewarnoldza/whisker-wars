// ===== Economy =====
export const INITIAL_COINS = 120
export const HEAL_COST = 25
export const DAILY_REWARD_COINS = 50
export const ACHIEVEMENT_REWARD_COINS = 100
export const RELEASE_VALUES: Record<string, number> = {
  Common: 5, Uncommon: 15, Rare: 40, Epic: 80, Legendary: 160, Mythical: 250,
}

// ===== Training =====
export const TRAINING_XP = 15
export const MAX_DAILY_TRAINING_SESSIONS = 3

// ===== Cat Progression =====
export const MAX_CAT_LEVEL = 10
export const XP_BASE = 50
export const XP_GROWTH_RATE = 1.5
export const STAT_BOOST_PER_LEVEL = 0.15

/** Calculate XP required for a given level */
export function calculateXpForLevel(level: number): number {
  return Math.floor(XP_BASE * Math.pow(XP_GROWTH_RATE, level - 1))
}

/** Calculate stat value at a given level */
export function calculateStatBoost(baseValue: number, level: number): number {
  return Math.floor(baseValue + (level - 1) * (baseValue * STAT_BOOST_PER_LEVEL))
}

// ===== Ascension =====
export const MAX_ASCENSION = 3
export const ASCENSION_COSTS = [500, 1000, 2000] // Coins for ascension 1, 2, 3
export const ASCENSION_STAT_BONUS = 0.20 // +20% stats per ascension

/** Calculate effective base stat with ascension bonus */
export function getAscendedBaseStat(baseValue: number, ascension: number): number {
  return Math.floor(baseValue * (1 + ascension * ASCENSION_STAT_BONUS))
}

// ===== Elite / Merge =====
export const ELITE_TIER_1_MULTIPLIER = 1.20
export const ELITE_TIER_2_MULTIPLIER = 1.50
export const MERGE_REQUIRED_COUNT = 3

// ===== Battle Rewards =====
export const BATTLE_BASE_COINS = 150
export const BATTLE_COINS_PER_DOG = 30
export const BATTLE_BASE_XP = 50
export const BATTLE_XP_PER_DOG = 25
export const DIFFICULTY_MULTIPLIER_STEP = 0.5

/** Calculate reward multiplier for a difficulty level */
export function getDifficultyMultiplier(difficultyLevel: number): number {
  return 1 + difficultyLevel * DIFFICULTY_MULTIPLIER_STEP
}

// ===== UI =====
export const BATTLE_LOG_MAX_ENTRIES = 20
export const MAX_PROFILES = 5

// ===== Daily Reward Streak =====
export const DAILY_STREAK_REWARDS = [
  { coins: 50 },
  { coins: 75 },
  { coins: 100, bait: 'catnip-crunch' },
  { coins: 125 },
  { coins: 150, bait: 'cosmic-tuna' },
  { coins: 200 },
  { coins: 300, bait: 'mythic-mackerel' },
] as const
export const DAILY_STREAK_LENGTH = DAILY_STREAK_REWARDS.length
export const TWO_DAYS_MS = 48 * 60 * 60 * 1000

// ===== Frenzy Friday =====
export const FRENZY_BASE_COINS = 350
export const FRENZY_BASE_MULTIPLIER = 1.5
export const FRENZY_STREAK_REWARDS = [
  { coinMultiplier: 1.0, stoneDropBonus: 0, label: 'Week 1' },
  { coinMultiplier: 1.5, stoneDropBonus: 0, label: '2-Week Streak' },
  { coinMultiplier: 2.0, stoneDropBonus: 0, label: '3-Week Streak' },
  { coinMultiplier: 2.5, stoneDropBonus: 0.10, label: '4-Week Streak' },
  { coinMultiplier: 3.0, stoneDropBonus: 1.0, label: 'Full Rotation!' },
] as const
export const FRENZY_STREAK_LENGTH = FRENZY_STREAK_REWARDS.length

// ===== Jungle of Talons =====
export const JUNGLE_TOTAL_STAGES = 20
export const JUNGLE_BOSS_STAGES = [10, 20] as const
export const JUNGLE_HEALING_SPRING_STAGES = [7, 14] as const
export const JUNGLE_HEALING_SPRING_FRACTION = 0.15

export const JUNGLE_STAGE_SCALING_FACTOR = 0.065
export const JUNGLE_SQUAD_SIZE = 3

// Boon selection weights
export const BOON_WEIGHT_COMMON = 0.675
export const BOON_WEIGHT_RARE = 0.30
export const BOON_WEIGHT_LEGENDARY = 0.025
export const BOON_PITY_THRESHOLD = 3

// Scoring
export const JUNGLE_SCORE_PER_STAGE = 100
export const JUNGLE_SPEED_BONUS_MAX = 3000
export const JUNGLE_HP_REMAINING_MULTIPLIER = 3
export const JUNGLE_BOSS_KILL_SCORE_MID = 500
export const JUNGLE_BOSS_KILL_SCORE_FINAL = 1500
export const JUNGLE_ALL_CATS_ALIVE_BONUS = 500
export const JUNGLE_FLAWLESS_STAGE_BONUS = 200
export const JUNGLE_BOON_SCORE_COMMON = 10
export const JUNGLE_BOON_SCORE_RARE = 30
export const JUNGLE_BOON_SCORE_LEGENDARY = 100

// Coins
export const JUNGLE_COINS_PER_STAGE = 20
export const JUNGLE_COINS_PER_BOSS_KILL = 100

// Bird ability cooldown
export const BIRD_ABILITY_COOLDOWN = 3

// ===== Default State =====
export const DEFAULT_BAITS: Record<string, number> = { 'toy-mouse': 1, 'silver-sardine': 1 }
