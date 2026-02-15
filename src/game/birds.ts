import {
  JUNGLE_TOTAL_STAGES,
  JUNGLE_BOSS_STAGES,
  JUNGLE_HEALING_SPRING_STAGES,
  JUNGLE_STAGE_SCALING_FACTOR,
} from './constants'

// ===== Bird Ability Types =====

export type BirdAbilityEffect =
  | 'aoe'          // Damage all cats
  | 'dot_poison'   // Poison DoT on target
  | 'reflect'      // Reflect % damage back
  | 'debuff_atk'   // Reduce cat ATK for N turns
  | 'silence'      // Block cat abilities 1 turn
  | 'heal_self'    // Bird heals % max HP
  | 'dodge'        // Chance to dodge attacks
  | 'dot_burn'     // Burn DoT on target
  | 'revive'       // Boss: revive once at % HP
  | 'enrage'       // Boss: increase ATK at low HP

export interface BirdAbilityParams {
  aoeFraction?: number
  dotDamage?: number
  dotTurns?: number
  reflectFraction?: number
  debuffMultiplier?: number
  debuffTurns?: number
  healFraction?: number
  dodgeChance?: number
  reviveHpFraction?: number
  enrageThreshold?: number
  enrageMultiplier?: number
  cooldown?: number
}

export interface BirdAbility {
  name: string
  description: string
  effect: BirdAbilityEffect
  params: BirdAbilityParams
}

// ===== Bird Types =====

export type BirdTier = 1 | 2 | 3 | 4 | 5

export interface Bird {
  id: string
  name: string
  baseHP: number
  baseATK: number
  DEF: number
  speed: number
  tier: BirdTier
  stageRange: [number, number]
  isBoss: boolean
  ability: BirdAbility
  imageUrl: string
}

export interface ScaledBird extends Bird {
  scaledHP: number
  scaledATK: number
  stage: number
}

// ===== Bird Roster =====

export const BIRDS: Bird[] = [
  // Tier 1 (stages 1-4/5)
  {
    id: 'jungle-sparrow', name: 'Jungle Sparrow',
    baseHP: 45, baseATK: 6, DEF: 0, speed: 3,
    tier: 1, stageRange: [1, 4], isBoss: false,
    ability: {
      name: 'Gale Force',
      description: 'Wind gust hits all cats for 30% ATK',
      effect: 'aoe',
      params: { aoeFraction: 0.3, cooldown: 3 },
    },
    imageUrl: '/images/birds/Jungle Sparrow.png',
  },
  {
    id: 'toxic-toucan', name: 'Toxic Toucan',
    baseHP: 50, baseATK: 5, DEF: 1, speed: 2,
    tier: 1, stageRange: [1, 5], isBoss: false,
    ability: {
      name: 'Toxic Plume',
      description: 'Poisons target for 3 dmg/turn for 2 turns',
      effect: 'dot_poison',
      params: { dotDamage: 3, dotTurns: 2, cooldown: 3 },
    },
    imageUrl: '/images/birds/Toxic Toucan.png',
  },

  // Tier 2 (stages 4-9)
  {
    id: 'mirror-macaw', name: 'Mirror Macaw',
    baseHP: 65, baseATK: 7, DEF: 2, speed: 2,
    tier: 2, stageRange: [4, 8], isBoss: false,
    ability: {
      name: 'Mirror Plumage',
      description: 'Reflects 20% of damage taken',
      effect: 'reflect',
      params: { reflectFraction: 0.2 },
    },
    imageUrl: '/images/birds/Mirror Macaw.png',
  },
  {
    id: 'screech-owl', name: 'Screech Owl',
    baseHP: 60, baseATK: 8, DEF: 1, speed: 4,
    tier: 2, stageRange: [5, 9], isBoss: false,
    ability: {
      name: 'Screech',
      description: 'Reduces all cat ATK by 30% for 2 turns',
      effect: 'debuff_atk',
      params: { debuffMultiplier: 0.7, debuffTurns: 2, cooldown: 4 },
    },
    imageUrl: '/images/birds/Screech Owl.png',
  },

  // Tier 3 (stages 7-14)
  {
    id: 'silencing-heron', name: 'Silencing Heron',
    baseHP: 80, baseATK: 9, DEF: 2, speed: 3,
    tier: 3, stageRange: [7, 13], isBoss: false,
    ability: {
      name: 'Silencing Shriek',
      description: 'Blocks all cat abilities for 1 turn',
      effect: 'silence',
      params: { cooldown: 4 },
    },
    imageUrl: '/images/birds/Silencing Heron.png',
  },
  {
    id: 'phoenix-finch', name: 'Phoenix Finch',
    baseHP: 75, baseATK: 10, DEF: 1, speed: 3,
    tier: 3, stageRange: [8, 14], isBoss: false,
    ability: {
      name: 'Rejuvenation',
      description: 'Heals 15% of max HP',
      effect: 'heal_self',
      params: { healFraction: 0.15, cooldown: 4 },
    },
    imageUrl: '/images/birds/Phoenix Finch.png',
  },

  // Tier 4 (stages 11-19)
  {
    id: 'shadow-swift', name: 'Shadow Swift',
    baseHP: 90, baseATK: 11, DEF: 3, speed: 5,
    tier: 4, stageRange: [11, 18], isBoss: false,
    ability: {
      name: 'Evasive Flight',
      description: '30% chance to dodge attacks',
      effect: 'dodge',
      params: { dodgeChance: 0.3 },
    },
    imageUrl: '/images/birds/Shadow Swift.png',
  },
  {
    id: 'inferno-hawk', name: 'Inferno Hawk',
    baseHP: 95, baseATK: 12, DEF: 2, speed: 4,
    tier: 4, stageRange: [12, 19], isBoss: false,
    ability: {
      name: 'Inferno Dive',
      description: 'Burns target for 4 dmg/turn for 3 turns',
      effect: 'dot_burn',
      params: { dotDamage: 4, dotTurns: 3, cooldown: 3 },
    },
    imageUrl: '/images/birds/Inferno Hawk.png',
  },

  // Tier 5 (stages 16-20)
  {
    id: 'storm-condor', name: 'Storm Condor',
    baseHP: 110, baseATK: 13, DEF: 3, speed: 4,
    tier: 5, stageRange: [16, 20], isBoss: false,
    ability: {
      name: 'Tempest Gale',
      description: 'AoE 40% ATK damage to all cats + silences for 1 turn',
      effect: 'aoe',
      params: { aoeFraction: 0.4, cooldown: 3 },
    },
    imageUrl: '/images/birds/Storm Condor.png',
  },

  // ===== BOSSES =====
  {
    id: 'talon-queen', name: 'Talon Queen',
    baseHP: 200, baseATK: 14, DEF: 4, speed: 3,
    tier: 3, stageRange: [10, 10], isBoss: true,
    ability: {
      name: 'Phoenix Rebirth',
      description: 'Revives once at 40% HP when defeated',
      effect: 'revive',
      params: { reviveHpFraction: 0.4 },
    },
    imageUrl: '/images/birds/Talon Queen.png',
  },
  {
    id: 'apex-raptor', name: 'Apex Raptor',
    baseHP: 350, baseATK: 16, DEF: 5, speed: 5,
    tier: 5, stageRange: [20, 20], isBoss: true,
    ability: {
      name: 'Apex Fury',
      description: 'Below 30% HP: ATK x1.5, attacks twice per turn',
      effect: 'enrage',
      params: { enrageThreshold: 0.3, enrageMultiplier: 1.5 },
    },
    imageUrl: '/images/birds/Apex Raptor.png',
  },
]

// ===== Scaling Functions =====

export function getStageMultiplier(stage: number): number {
  return 1.0 + (stage - 1) * JUNGLE_STAGE_SCALING_FACTOR
}

export function scaleBirdForStage(bird: Bird, stage: number): ScaledBird {
  const multiplier = getStageMultiplier(stage)
  return {
    ...bird,
    scaledHP: Math.floor(bird.baseHP * multiplier),
    scaledATK: Math.floor(bird.baseATK * multiplier),
    stage,
  }
}

// ===== Stage Selection =====

export function getBossForStage(stage: number): Bird | null {
  if (stage === 10) return BIRDS.find(b => b.id === 'talon-queen') ?? null
  if (stage === 20) return BIRDS.find(b => b.id === 'apex-raptor') ?? null
  return null
}

export function selectBirdForStage(stage: number, random: () => number): Bird {
  // Boss stages always return the boss
  const boss = getBossForStage(stage)
  if (boss) return boss

  // Filter eligible birds by stage range (exclude bosses)
  const eligible = BIRDS.filter(
    b => !b.isBoss && stage >= b.stageRange[0] && stage <= b.stageRange[1]
  )

  // Fallback to highest-tier non-boss bird if nothing matches
  if (eligible.length === 0) {
    const nonBossBirds = BIRDS.filter(b => !b.isBoss)
    return nonBossBirds[nonBossBirds.length - 1]
  }

  return eligible[Math.floor(random() * eligible.length)]
}

export function isHealingSpring(stage: number): boolean {
  return (JUNGLE_HEALING_SPRING_STAGES as readonly number[]).includes(stage)
}

export function isBossStage(stage: number): boolean {
  return (JUNGLE_BOSS_STAGES as readonly number[]).includes(stage)
}
