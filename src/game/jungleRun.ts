import type { OwnedCat } from './store'
import type { ScaledBird } from './birds'
import type { ActiveBoon, BoonOffering, BoonEffects } from './boons'
import { calculateBoonEffects } from './boons'
import {
  JUNGLE_TOTAL_STAGES,
  JUNGLE_SCORE_PER_STAGE,
  JUNGLE_SPEED_BONUS_MAX,
  JUNGLE_HP_REMAINING_MULTIPLIER,
  JUNGLE_BOSS_KILL_SCORE_MID,
  JUNGLE_BOSS_KILL_SCORE_FINAL,
  JUNGLE_ALL_CATS_ALIVE_BONUS,
  JUNGLE_FLAWLESS_STAGE_BONUS,
  JUNGLE_BOON_SCORE_COMMON,
  JUNGLE_BOON_SCORE_RARE,
  JUNGLE_BOON_SCORE_LEGENDARY,
  JUNGLE_COINS_PER_STAGE,
  JUNGLE_COINS_PER_BOSS_KILL,
  JUNGLE_HEALING_SPRING_FRACTION,
} from './constants'
import { getBoonById } from './boons'
import { calculateStatBoost, getAscendedBaseStat } from './constants'

// ===== Phase Types =====

export type JunglePhase =
  | 'idle'
  | 'squad_select'
  | 'pre_battle'
  | 'in_battle'
  | 'boon_select'
  | 'healing_spring'
  | 'stage_cleared'
  | 'run_complete'
  | 'run_failed'

// ===== State Types =====

export interface JungleSquadCat {
  instanceId: string
  name: string
  catId: string
  rarity: string
  imageUrl?: string
  ability: OwnedCat['ability']
  isElite?: boolean
  eliteTier?: number
  baseMaxHp: number
  baseAtk: number
  currentHp: number
  maxHp: number
  currentAtk: number
  knockedOut: boolean
}

export interface JungleStageResult {
  stageNumber: number
  birdId: string
  birdName: string
  turnsElapsed: number
  catHpRemaining: Record<string, number>
  catsKnockedOut: string[]
  wasFlawless: boolean
  startTime: number
  endTime: number
}

export interface JungleRunState {
  runId: string
  seed: number
  phase: JunglePhase
  currentStage: number
  squad: JungleSquadCat[]
  activeBoons: ActiveBoon[]
  stageResults: JungleStageResult[]
  currentBoonOffering: BoonOffering | null
  consecutiveAllCommonOfferings: number
  prngCallCount: number
  bossRevived: Record<string, boolean>
  startedAt: number
}

export interface JungleRunScore {
  stagesCleared: number
  stageScore: number
  speedBonus: number
  hpRemainingScore: number
  bossKillScore: number
  allCatsAliveBonus: number
  boonEfficiencyScore: number
  flawlessStageScore: number
  totalScore: number
  coinsEarned: number
}

export interface JungleStats {
  totalRuns: number
  totalRunsCompleted: number
  bestScore: number
  bestStage: number
  totalCoinsEarned: number
  fastestCompletionMs: number | null
  bossesDefeated: number[]
  maxFlawlessStages: number
}

// ===== Phase Transitions =====

export const PHASE_TRANSITIONS: Record<JunglePhase, JunglePhase[]> = {
  idle: ['squad_select'],
  squad_select: ['pre_battle', 'idle'],
  pre_battle: ['in_battle'],
  in_battle: ['boon_select', 'run_failed', 'run_complete'],
  boon_select: ['stage_cleared'],
  healing_spring: ['pre_battle'],
  stage_cleared: ['pre_battle', 'healing_spring', 'run_complete'],
  run_complete: ['idle'],
  run_failed: ['idle'],
}

export function isValidTransition(current: JunglePhase, next: JunglePhase): boolean {
  return PHASE_TRANSITIONS[current]?.includes(next) ?? false
}

// ===== Initialization =====

export function createInitialJungleStats(): JungleStats {
  return {
    totalRuns: 0,
    totalRunsCompleted: 0,
    bestScore: 0,
    bestStage: 0,
    totalCoinsEarned: 0,
    fastestCompletionMs: null,
    bossesDefeated: [],
    maxFlawlessStages: 0,
  }
}

/**
 * Snapshot an OwnedCat into a JungleSquadCat with computed stats.
 * Equipment bonuses are included. Elemental stones are stripped.
 */
export function snapshotCatForJungle(cat: OwnedCat): JungleSquadCat {
  return {
    instanceId: cat.instanceId,
    name: cat.name,
    catId: cat.id,
    rarity: cat.rarity,
    imageUrl: cat.imageUrl,
    ability: cat.ability,
    isElite: cat.isElite,
    eliteTier: cat.eliteTier,
    baseMaxHp: cat.maxHp,
    baseAtk: cat.currentAttack,
    currentHp: cat.currentHp,
    maxHp: cat.maxHp,
    currentAtk: cat.currentAttack,
    knockedOut: false,
  }
}

export function createJungleRun(
  squad: OwnedCat[],
  seed: number,
): JungleRunState {
  return {
    runId: crypto.randomUUID(),
    seed,
    phase: 'pre_battle',
    currentStage: 1,
    squad: squad.map(snapshotCatForJungle),
    activeBoons: [],
    stageResults: [],
    currentBoonOffering: null,
    consecutiveAllCommonOfferings: 0,
    prngCallCount: 0,
    bossRevived: {},
    startedAt: Date.now(),
  }
}

// ===== Healing =====

/** Apply Healing Springs: heal all living cats for 15% max HP. */
export function applyHealingSpring(squad: JungleSquadCat[]): JungleSquadCat[] {
  return squad.map(cat => {
    if (cat.knockedOut) return cat
    const healAmount = Math.floor(cat.maxHp * JUNGLE_HEALING_SPRING_FRACTION)
    const newHp = Math.min(cat.maxHp, cat.currentHp + healAmount)
    return { ...cat, currentHp: newHp }
  })
}

/** Apply Rally Cry boon healing at stage start. */
export function applyStageStartHealing(
  squad: JungleSquadCat[],
  healAmount: number,
): JungleSquadCat[] {
  if (healAmount <= 0) return squad
  return squad.map(cat => {
    if (cat.knockedOut) return cat
    const newHp = Math.min(cat.maxHp, cat.currentHp + healAmount)
    return { ...cat, currentHp: newHp }
  })
}

/** Apply boon stat boosts to the squad (ATK + HP ceiling). Does NOT heal. */
export function applyBoonStatsToSquad(
  squad: JungleSquadCat[],
  boonEffects: BoonEffects,
): JungleSquadCat[] {
  return squad.map(cat => {
    const newMaxHp = cat.baseMaxHp + boonEffects.totalHpBoost
    const newAtk = cat.baseAtk + boonEffects.totalAtkBoost
    return {
      ...cat,
      maxHp: newMaxHp,
      currentAtk: newAtk,
      // If max HP increased, keep current HP ratio but don't decrease
      currentHp: cat.knockedOut ? 0 : Math.min(newMaxHp, cat.currentHp),
    }
  })
}

// ===== Scoring =====

export function calculateScore(runState: JungleRunState): JungleRunScore {
  const stagesCleared = runState.stageResults.length
  const stageScore = stagesCleared * JUNGLE_SCORE_PER_STAGE

  // Speed bonus: based on total elapsed time
  const totalElapsedMs = runState.stageResults.length > 0
    ? runState.stageResults[runState.stageResults.length - 1].endTime - runState.startedAt
    : 0
  const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000)
  const speedBonus = Math.max(0, JUNGLE_SPEED_BONUS_MAX - totalElapsedSeconds)

  // HP remaining
  const totalHpRemaining = runState.squad
    .filter(c => !c.knockedOut)
    .reduce((sum, c) => sum + c.currentHp, 0)
  const hpRemainingScore = totalHpRemaining * JUNGLE_HP_REMAINING_MULTIPLIER

  // Boss kills
  let bossKillScore = 0
  const stageNumbers = runState.stageResults.map(r => r.stageNumber)
  if (stageNumbers.includes(10)) bossKillScore += JUNGLE_BOSS_KILL_SCORE_MID
  if (stageNumbers.includes(20)) bossKillScore += JUNGLE_BOSS_KILL_SCORE_FINAL

  // All cats alive
  const allCatsAlive = runState.squad.every(c => !c.knockedOut)
  const allCatsAliveBonus = allCatsAlive ? JUNGLE_ALL_CATS_ALIVE_BONUS : 0

  // Boon efficiency: score based on boon rarities collected
  let boonEfficiencyScore = 0
  for (const ab of runState.activeBoons) {
    const boon = getBoonById(ab.boonId)
    if (!boon) continue
    const scorePerStack = boon.rarity === 'Common' ? JUNGLE_BOON_SCORE_COMMON
      : boon.rarity === 'Rare' ? JUNGLE_BOON_SCORE_RARE
      : JUNGLE_BOON_SCORE_LEGENDARY
    boonEfficiencyScore += scorePerStack * ab.stacks
  }

  // Flawless stages
  const flawlessCount = runState.stageResults.filter(r => r.wasFlawless).length
  const flawlessStageScore = flawlessCount * JUNGLE_FLAWLESS_STAGE_BONUS

  const totalScore = stageScore + speedBonus + hpRemainingScore + bossKillScore
    + allCatsAliveBonus + boonEfficiencyScore + flawlessStageScore

  // Coins earned
  const bossKills = (stageNumbers.includes(10) ? 1 : 0) + (stageNumbers.includes(20) ? 1 : 0)
  const boonEffects = calculateBoonEffects(runState.activeBoons)
  const coinsEarned = calculateCoinsEarned(
    stagesCleared,
    bossKills,
    1 + boonEffects.coinMultiplier,
  )

  return {
    stagesCleared,
    stageScore,
    speedBonus,
    hpRemainingScore,
    bossKillScore,
    allCatsAliveBonus,
    boonEfficiencyScore,
    flawlessStageScore,
    totalScore,
    coinsEarned,
  }
}

export function calculateCoinsEarned(
  stagesCleared: number,
  bossKills: number,
  scavengerMultiplier: number,
): number {
  const base = stagesCleared * JUNGLE_COINS_PER_STAGE + bossKills * JUNGLE_COINS_PER_BOSS_KILL
  return Math.floor(base * scavengerMultiplier)
}
