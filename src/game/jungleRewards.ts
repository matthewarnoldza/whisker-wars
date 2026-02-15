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

export function getRewardById(id: string): JungleReward | undefined {
  return JUNGLE_REWARDS.find(r => r.id === id)
}

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
