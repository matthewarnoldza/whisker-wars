// ===== Jungle of Talons - Cosmetic Rewards =====

export type JungleRewardType = 'badge' | 'border' | 'title'

export interface JungleReward {
  id: string
  name: string
  description: string
  type: JungleRewardType
  imageUrl: string
  requirement: {
    kind: 'complete_run' | 'reach_stage' | 'score' | 'boss_kill' | 'flawless'
    value: number
  }
}

export const JUNGLE_REWARDS: JungleReward[] = [
  {
    id: 'jungle-survivor',
    name: 'Jungle Survivor',
    description: 'Complete your first Jungle of Talons run',
    type: 'badge',
    imageUrl: '/images/rewards/Jungle Survivor.png',
    requirement: { kind: 'complete_run', value: 1 },
  },
  {
    id: 'talon-blade',
    name: 'Talon Blade',
    description: 'Defeat the Talon Queen at Stage 10',
    type: 'border',
    imageUrl: '/images/rewards/Talon Blade.png',
    requirement: { kind: 'boss_kill', value: 10 },
  },
  {
    id: 'feathered-collar',
    name: 'Feathered Collar',
    description: 'Reach Stage 15 in a single run',
    type: 'border',
    imageUrl: '/images/rewards/Feathered Collar.png',
    requirement: { kind: 'reach_stage', value: 15 },
  },
  {
    id: 'vine-crest',
    name: 'Vine Crest',
    description: 'Achieve a score of 5,000 in a single run',
    type: 'badge',
    imageUrl: '/images/rewards/Vine Crest.png',
    requirement: { kind: 'score', value: 5000 },
  },
  {
    id: 'jungle-crown',
    name: 'Jungle Crown',
    description: 'Conquer all 20 stages and defeat the Apex Raptor',
    type: 'border',
    imageUrl: '/images/rewards/Jungle Crown.png',
    requirement: { kind: 'complete_run', value: 1 },
  },
  {
    id: 'apex-predator-title',
    name: 'Apex Predator',
    description: 'Complete a run with a flawless stage count of 10 or more',
    type: 'title',
    imageUrl: '/images/rewards/Apex Predator Title.png',
    requirement: { kind: 'flawless', value: 10 },
  },
]

export function checkRewardUnlocked(
  reward: JungleReward,
  stats: {
    totalRunsCompleted: number
    bestStage: number
    bestScore: number
    bossesDefeated?: number[]
    maxFlawlessStages?: number
  },
): boolean {
  switch (reward.requirement.kind) {
    case 'complete_run':
      return stats.totalRunsCompleted >= reward.requirement.value
    case 'reach_stage':
      return stats.bestStage >= reward.requirement.value
    case 'score':
      return stats.bestScore >= reward.requirement.value
    case 'boss_kill':
      return stats.bossesDefeated?.includes(reward.requirement.value) ?? false
    case 'flawless':
      return (stats.maxFlawlessStages ?? 0) >= reward.requirement.value
  }
}

/**
 * Compute which medals would be newly unlocked by the current run.
 * Projects stats forward (since finishJungleRun hasn't run yet when the modal shows).
 */
export function getNewlyUnlockedMedals(
  runState: { phase: string; currentStage: number; stageResults: { stageNumber: number; wasFlawless: boolean }[] },
  currentStats: { totalRunsCompleted: number; bestStage: number; bestScore: number; bossesDefeated: number[]; maxFlawlessStages: number },
  runScore: number,
  alreadyUnlocked: string[],
): JungleReward[] {
  const isComplete = runState.phase === 'run_complete'
  const stageNumbers = runState.stageResults.map(r => r.stageNumber)
  const flawlessCount = runState.stageResults.filter(r => r.wasFlawless).length

  // Project what stats will be after finishJungleRun
  const projectedStats = {
    totalRunsCompleted: isComplete ? currentStats.totalRunsCompleted + 1 : currentStats.totalRunsCompleted,
    bestStage: Math.max(currentStats.bestStage, runState.currentStage),
    bestScore: Math.max(currentStats.bestScore, runScore),
    bossesDefeated: [...new Set([...currentStats.bossesDefeated, ...stageNumbers.filter(s => s === 10 || s === 20)])],
    maxFlawlessStages: Math.max(currentStats.maxFlawlessStages, flawlessCount),
  }

  const alreadySet = new Set(alreadyUnlocked)
  return JUNGLE_REWARDS.filter(r => !alreadySet.has(r.id) && checkRewardUnlocked(r, projectedStats))
}
