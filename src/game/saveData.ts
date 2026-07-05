// Single source of truth for the persisted save shape.
//
// Historically the ~27-field save payload was hand-maintained in four separate
// places (store.save / store.load / store.restoreProfile / CloudSaveData). That
// drift shipped real data-loss bugs: `d.coins || 120` reset zero-coin saves, and
// soundEnabled/selectedForBattle were dropped because someone forgot to add them
// to one of the lists. This module centralises the field list, validates it with
// zod, and provides a versioned migration path so the shape can evolve safely.

import { z } from 'zod'
import { INITIAL_COINS, DEFAULT_BAITS } from './constants'
import { createInitialJungleStats } from './jungleRun'

// Bump this whenever the persisted shape changes in a way that needs a migration.
// Legacy saves predate this field entirely and are treated as version 0.
export const SAVE_VERSION = 2

// ===== Leaf schemas =====

const raritySchema = z.enum(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'])

const abilitySchema = z.object({
  name: z.string(),
  description: z.string(),
  effect: z.enum(['shield', 'crit', 'heal', 'stun', 'bleed', 'lifesteal', 'armor', 'speed']),
})

const catEquipmentSchema = z.object({
  weapon: z.string().optional(),
  accessory: z.string().optional(),
  stone: z.string().optional(),
})

// Mirrors OwnedCat (extends Cat). Optional fields stay optional so the inferred
// type matches OwnedCat exactly; load() still normalises their defaults, matching
// the pre-existing behaviour. Core fields are required — a save missing them is
// genuinely corrupt and should surface an error rather than be silently defaulted.
const ownedCatSchema = z.object({
  // Cat
  id: z.string(),
  name: z.string(),
  rarity: raritySchema,
  health: z.number(),
  attack: z.number(),
  ability: abilitySchema,
  imageUrl: z.string().optional(),
  breed: z.string().optional(),
  // OwnedCat
  instanceId: z.string(),
  level: z.number(),
  xp: z.number(),
  currentHp: z.number(),
  maxHp: z.number(),
  currentAttack: z.number(),
  totalBattles: z.number().optional(),
  totalWins: z.number().optional(),
  isElite: z.boolean().optional(),
  eliteTier: z.number().optional(),
  mergedFromIds: z.array(z.string()).optional(),
  ascension: z.number().optional(),
  equipment: catEquipmentSchema.optional(),
})

const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  unlocked: z.boolean(),
  claimed: z.boolean(),
  progress: z.number(),
  maxProgress: z.number(),
})

const gameStatsSchema = z.object({
  totalBattles: z.number().default(0),
  totalWins: z.number().default(0),
  totalLosses: z.number().default(0),
  totalCatsCollected: z.number().default(0),
  totalCoinsEarned: z.number().default(0),
  highestDogDefeated: z.number().default(-1),
  totalMerges: z.number().default(0),
})

// ===== Jungle of Talons schemas =====

const junglePhaseSchema = z.enum([
  'idle', 'squad_select', 'pre_battle', 'in_battle', 'boon_select',
  'healing_spring', 'stage_cleared', 'run_complete', 'run_failed',
])

const boonRaritySchema = z.enum(['Common', 'Rare', 'Legendary'])

const boonEffectSchema = z.enum([
  'atk_boost', 'hp_boost', 'crit_chance', 'lifesteal', 'thorns', 'scavenger',
  'swift_paws', 'iron_fur', 'poison_claws', 'rally_cry', 'executioner', 'fortune_favor',
])

const boonParamsSchema = z.object({
  atkBoost: z.number().optional(),
  hpBoost: z.number().optional(),
  critThresholdReduction: z.number().optional(),
  lifestealFraction: z.number().optional(),
  thornsFraction: z.number().optional(),
  coinMultiplier: z.number().optional(),
  bonusAttackChance: z.number().optional(),
  damageReduction: z.number().optional(),
  dotDamage: z.number().optional(),
  dotTurns: z.number().optional(),
  healAmount: z.number().optional(),
  executeThreshold: z.number().optional(),
  executeBonusDamage: z.number().optional(),
  rarityBoost: z.number().optional(),
})

const boonSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  rarity: boonRaritySchema,
  effect: boonEffectSchema,
  maxStacks: z.number(),
  params: boonParamsSchema,
  iconUrl: z.string(),
})

const boonOfferingSchema = z.object({
  boons: z.tuple([boonSchema, boonSchema, boonSchema]),
  wasGuaranteedRare: z.boolean(),
})

const activeBoonSchema = z.object({
  boonId: z.string(),
  stacks: z.number(),
})

const jungleSquadCatSchema = z.object({
  instanceId: z.string(),
  name: z.string(),
  catId: z.string(),
  rarity: z.string(),
  imageUrl: z.string().optional(),
  ability: abilitySchema,
  isElite: z.boolean().optional(),
  eliteTier: z.number().optional(),
  level: z.number(),
  ascension: z.number().optional(),
  equipment: catEquipmentSchema.optional(),
  baseMaxHp: z.number(),
  baseAtk: z.number(),
  currentHp: z.number(),
  maxHp: z.number(),
  currentAtk: z.number(),
  knockedOut: z.boolean(),
})

const jungleStageResultSchema = z.object({
  stageNumber: z.number(),
  birdId: z.string(),
  birdName: z.string(),
  turnsElapsed: z.number(),
  catHpRemaining: z.record(z.string(), z.number()),
  catsKnockedOut: z.array(z.string()),
  wasFlawless: z.boolean(),
  startTime: z.number(),
  endTime: z.number(),
})

// Resilience fields default so a partially-written in-progress run still loads,
// mirroring load()'s prior `d.jungleRun.field ?? default` guards.
const jungleRunSchema = z.object({
  runId: z.string(),
  seed: z.number(),
  phase: junglePhaseSchema,
  currentStage: z.number(),
  squad: z.array(jungleSquadCatSchema),
  activeBoons: z.array(activeBoonSchema).default([]),
  stageResults: z.array(jungleStageResultSchema).default([]),
  currentBoonOffering: boonOfferingSchema.nullable().default(null),
  consecutiveAllCommonOfferings: z.number().default(0),
  prngCallCount: z.number().default(0),
  bossRevived: z.record(z.string(), z.boolean()).default({}),
  startedAt: z.number().default(() => Date.now()),
})

const jungleStatsSchema = z.object({
  totalRuns: z.number().default(0),
  totalRunsCompleted: z.number().default(0),
  bestScore: z.number().default(0),
  bestStage: z.number().default(0),
  totalCoinsEarned: z.number().default(0),
  fastestCompletionMs: z.number().nullable().default(null),
  bossesDefeated: z.array(z.number()).default([]),
  maxFlawlessStages: z.number().default(0),
})

// ===== Per-element resilience =====
//
// `owned` and `achievements` are permanent collections, but a SINGLE malformed
// element (missing required field, out-of-enum rarity/effect) must not reject the
// ENTIRE save — that would fresh-start the player and drop their whole collection.
// This mirrors jungleRun's `.catch(null)` philosophy, but one level down: each
// element is safeParse'd against its schema and failures are FILTERED OUT, so the
// player keeps their collection minus the corrupt element (self-healed on next save).
//
// Well-formed elements are untouched: they run through the very same element schema,
// so a valid cat/achievement validates exactly as strictly as before. A non-array
// (or missing) value collapses to `[]` so the field's own `.default([])` semantics
// still hold — matching the pre-existing fall-back-to-default behaviour.
function resilientArray<T extends z.ZodTypeAny>(element: T) {
  return z.preprocess(
    val => (Array.isArray(val) ? val.filter(el => element.safeParse(el).success) : []),
    z.array(element)
  )
}

// ===== Top-level save schema =====
//
// `.default()` (never `||`) backfills MISSING fields with the same values load()
// used to apply inline — critically, a present `0` (coins!) passes `z.number()`
// and is kept, so the zero-coin data-loss bug cannot recur. A present-but-wrong
// type is a real error and is surfaced, NOT silently defaulted.
//
// Unknown keys are STRIPPED (zod's default), not passed through. Forward-compat is
// handled by SAVE_VERSION + the migration chain, not by preserving stray keys: the
// store is the source of truth for live fields, so buildSavePayload only ever
// re-writes known ones — a passed-through key would be dropped on the next save
// regardless. Stripping also keeps SaveData a precise type so buildSavePayload can
// type-check against store state. An unknown key never fails parsing; it is dropped.
export const SaveDataSchema = z.object({
  saveVersion: z.number().default(0),
  coins: z.number().default(INITIAL_COINS),
  baits: z.record(z.string(), z.number()).default(() => ({ ...DEFAULT_BAITS })),
  owned: resilientArray(ownedCatSchema).default([]),
  selectedForBattle: z.array(z.string()).default([]),
  favorites: z.array(z.string()).default([]),
  dogIndex: z.number().default(0),
  difficultyLevel: z.number().default(0),
  alienUnlocked: z.boolean().default(false),
  theme: z.enum(['light', 'dark']).default('dark'),
  soundEnabled: z.boolean().default(true),
  musicEnabled: z.boolean().default(true),
  // Settings (added in save v2). `.default()` backfills v1 saves that predate them;
  // a present 0 (fully-muted SFX) passes z.number() and is kept, mirroring the
  // zero-coin lesson — never use `||`, which would resurrect the falsy-reset bug.
  sfxVolume: z.number().default(0.5),
  musicVolume: z.number().default(0.2),
  reducedMotion: z.boolean().default(false),
  colorblindMode: z.boolean().default(false),
  achievements: resilientArray(achievementSchema).default([]),
  stats: gameStatsSchema.default(() => ({
    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalCatsCollected: 0,
    totalCoinsEarned: 0,
    highestDogDefeated: -1,
    totalMerges: 0,
  })),
  lastDailyReward: z.number().default(0),
  dailyStreak: z.number().default(0),
  tutorialCompleted: z.boolean().default(false),
  // First-run coach-mark ids already dismissed. Added within v2 — `.default([])`
  // backfills any save that predates it, so no version bump is needed.
  hintsSeen: z.array(z.string()).default([]),
  trainingCooldowns: z.record(z.string(), z.array(z.number())).default({}),
  inventory: z.record(z.string(), z.number()).default({}),
  completedEventRewards: z.array(z.string()).default([]),
  frenzyStreak: z.number().default(0),
  lastFrenzyParticipation: z.string().default(''),
  junglePassUnlocked: z.boolean().default(false),
  // An in-progress run is resumable, not permanent progress: a single corrupt run
  // should drop to null, not nuke the whole save. jungleStats (below) is permanent
  // and deliberately has no `.catch()`.
  jungleRun: jungleRunSchema.nullable().catch(null).default(null),
  jungleStats: jungleStatsSchema.default(() => createInitialJungleStats()),
  unlockedJungleMedals: z.array(z.string()).default([]),
  jungleAnnouncementShown: z.boolean().default(false),
  jungleTabVisited: z.boolean().default(false),
})

export type SaveData = z.infer<typeof SaveDataSchema>

// The subset of store state that gets persisted. Everything the store adds on top
// (view, action functions, and the transient saveError/cloudSyncError/lastCloudSyncAt
// fields) is intentionally excluded.
export type SaveSource = Omit<SaveData, 'saveVersion'>

// The single place the persisted field list lives. Fields are enumerated
// explicitly (never spread) so transient store fields can never leak into a save.
export function buildSavePayload(state: SaveSource): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    coins: state.coins,
    baits: state.baits,
    owned: state.owned,
    selectedForBattle: state.selectedForBattle,
    favorites: state.favorites,
    dogIndex: state.dogIndex,
    difficultyLevel: state.difficultyLevel,
    alienUnlocked: state.alienUnlocked,
    theme: state.theme,
    soundEnabled: state.soundEnabled,
    musicEnabled: state.musicEnabled,
    sfxVolume: state.sfxVolume,
    musicVolume: state.musicVolume,
    reducedMotion: state.reducedMotion,
    colorblindMode: state.colorblindMode,
    achievements: state.achievements,
    stats: state.stats,
    lastDailyReward: state.lastDailyReward,
    dailyStreak: state.dailyStreak,
    tutorialCompleted: state.tutorialCompleted,
    hintsSeen: state.hintsSeen,
    trainingCooldowns: state.trainingCooldowns,
    inventory: state.inventory,
    completedEventRewards: state.completedEventRewards,
    frenzyStreak: state.frenzyStreak,
    lastFrenzyParticipation: state.lastFrenzyParticipation,
    junglePassUnlocked: state.junglePassUnlocked,
    jungleRun: state.jungleRun,
    jungleStats: state.jungleStats,
    unlockedJungleMedals: state.unlockedJungleMedals,
    jungleAnnouncementShown: state.jungleAnnouncementShown,
    jungleTabVisited: state.jungleTabVisited,
  }
}

// ===== Migrations =====
//
// Ordered chain. Each entry upgrades a save TO version `to` from the version
// immediately below it. Adding a v1->v2 migration later is a one-line append.

type RawSave = Record<string, unknown>

// v0 -> v1: legacy saves have no saveVersion. The historical data-loss quirks
// (coins||120, dropped soundEnabled/selectedForBattle) were read-side bugs, not
// stored-shape problems, and are already fixed; the schema's `.default()`s backfill
// any genuinely-missing fields. So this migration only stamps the version.
function migrateV0toV1(raw: RawSave): RawSave {
  return { ...raw, saveVersion: 1 }
}

// v1 -> v2: adds the settings fields (sfxVolume/musicVolume/reducedMotion/
// colorblindMode). The schema's `.default()`s backfill any genuinely-missing
// field, so — like v0->v1 — this migration only needs to stamp the new version.
// It is deliberately non-destructive: a v1 save that already carried these keys
// (impossible today, but forward-safe) keeps its explicit values untouched.
function migrateV1toV2(raw: RawSave): RawSave {
  return { ...raw, saveVersion: 2 }
}

const MIGRATIONS: { to: number; migrate: (raw: RawSave) => RawSave }[] = [
  { to: 1, migrate: migrateV0toV1 },
  { to: 2, migrate: migrateV1toV2 },
]

// Runs the migration chain then validates. Returns the parsed data plus whether a
// migration ran (so callers can re-save the upgraded blob), or a human-readable
// error so callers can surface it via the existing saveError machinery instead of
// silently falling back to defaults.
export function parseSaveData(
  raw: unknown
):
  | { data: SaveData; migrated: boolean; droppedElements?: { owned: number; achievements: number } }
  | { error: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'Save data is not an object.' }
  }

  let working: RawSave = { ...(raw as RawSave) }
  const detectedVersion = typeof working.saveVersion === 'number' ? working.saveVersion : 0

  let migrated = false
  for (const step of MIGRATIONS) {
    if (detectedVersion < step.to) {
      working = step.migrate(working)
      migrated = true
    }
  }

  const result = SaveDataSchema.safeParse(working)
  if (!result.success) {
    const detail = result.error.issues
      .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    return { error: detail || 'Save data failed validation.' }
  }

  // Per-element resilience filters bad cats/achievements out of these arrays. The
  // count of dropped elements is the length delta (elements are only ever removed,
  // never added). A non-array input collapsed to [] is a fall-back-to-default, not a
  // "drop", so only genuine arrays contribute. Surfaced so callers COULD warn; the
  // next save re-writes the filtered arrays, self-healing the stored blob.
  const droppedOwned = Array.isArray(working.owned)
    ? working.owned.length - result.data.owned.length
    : 0
  const droppedAchievements = Array.isArray(working.achievements)
    ? working.achievements.length - result.data.achievements.length
    : 0

  if (droppedOwned > 0 || droppedAchievements > 0) {
    return {
      data: result.data,
      migrated,
      droppedElements: { owned: droppedOwned, achievements: droppedAchievements },
    }
  }

  return { data: result.data, migrated }
}
