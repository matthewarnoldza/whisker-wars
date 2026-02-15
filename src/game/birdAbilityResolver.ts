import type { ScaledBird } from './birds'
import type { BoonEffects } from './boons'
import { BIRD_ABILITY_COOLDOWN } from './constants'

// ===== Result Types =====

export interface BirdOffenseResult {
  primaryDamage: number
  primaryTargetId: string
  aoeDamage: number
  dotApplied: { catInstanceId: string; damage: number; turns: number; type: 'poison' | 'burn' } | null
  atkDebuff: { multiplier: number; turns: number } | null
  silenceApplied: boolean
  birdHealAmount: number
  isEnraged: boolean
  attackCount: number
  effectiveATK: number
  logMessages: { text: string; type: 'damage' | 'heal' | 'crit' | 'info' }[]
}

export interface BirdDefenseResult {
  actualDamage: number
  reflectDamage: number
  dodged: boolean
  logMessages: { text: string; type: 'damage' | 'heal' | 'crit' | 'info' }[]
}

export interface BirdTarget {
  instanceId: string
  currentHp: number
  maxHp: number
  name: string
}

// ===== Offense Resolution =====

/**
 * Resolve a bird's offensive turn.
 * Pure function - no side effects.
 */
export function resolveBirdOffense(
  bird: ScaledBird,
  targets: BirdTarget[],
  abilityCooldown: number,
  birdCurrentHp: number,
  random: () => number,
): BirdOffenseResult {
  const aliveCats = targets.filter(t => t.currentHp > 0)
  const abilityReady = abilityCooldown <= 0
  const effect = bird.ability.effect
  const params = bird.ability.params

  // Check enrage for Apex Raptor
  const enrage = checkBirdEnrage(bird, birdCurrentHp)

  // Pick primary target (highest HP cat for regular, lowest HP for bosses)
  let primaryTarget: BirdTarget
  if (bird.isBoss) {
    primaryTarget = aliveCats.reduce((a, b) => a.currentHp < b.currentHp ? a : b)
  } else {
    primaryTarget = aliveCats[Math.floor(random() * aliveCats.length)]
  }

  const result: BirdOffenseResult = {
    primaryDamage: enrage.effectiveATK,
    primaryTargetId: primaryTarget.instanceId,
    aoeDamage: 0,
    dotApplied: null,
    atkDebuff: null,
    silenceApplied: false,
    birdHealAmount: 0,
    isEnraged: enrage.isEnraged,
    attackCount: enrage.attackCount,
    effectiveATK: enrage.effectiveATK,
    logMessages: [],
  }

  if (enrage.isEnraged) {
    result.logMessages.push({
      text: `${bird.name} is enraged! ATK increased and attacks ${enrage.attackCount} times!`,
      type: 'crit',
    })
  }

  // Resolve ability if ready
  if (abilityReady) {
    switch (effect) {
      case 'aoe': {
        const fraction = params.aoeFraction ?? 0.3
        result.aoeDamage = Math.floor(enrage.effectiveATK * fraction)
        result.logMessages.push({
          text: `${bird.name} uses ${bird.ability.name}! Hits all cats for ${result.aoeDamage} damage!`,
          type: 'damage',
        })
        // Storm Condor also silences on AoE
        if (bird.id === 'storm-condor') {
          result.silenceApplied = true
          result.logMessages.push({
            text: `The tempest silences all cat abilities for 1 turn!`,
            type: 'info',
          })
        }
        break
      }

      case 'dot_poison': {
        result.dotApplied = {
          catInstanceId: primaryTarget.instanceId,
          damage: params.dotDamage ?? 3,
          turns: params.dotTurns ?? 2,
          type: 'poison',
        }
        result.logMessages.push({
          text: `${bird.name} poisons ${primaryTarget.name} for ${params.dotDamage} dmg/turn!`,
          type: 'damage',
        })
        break
      }

      case 'dot_burn': {
        result.dotApplied = {
          catInstanceId: primaryTarget.instanceId,
          damage: params.dotDamage ?? 4,
          turns: params.dotTurns ?? 3,
          type: 'burn',
        }
        result.logMessages.push({
          text: `${bird.name} burns ${primaryTarget.name} for ${params.dotDamage} dmg/turn!`,
          type: 'damage',
        })
        break
      }

      case 'debuff_atk': {
        result.atkDebuff = {
          multiplier: params.debuffMultiplier ?? 0.7,
          turns: params.debuffTurns ?? 2,
        }
        const reduction = Math.round((1 - (params.debuffMultiplier ?? 0.7)) * 100)
        result.logMessages.push({
          text: `${bird.name} screeches! All cat ATK reduced by ${reduction}% for ${params.debuffTurns} turns!`,
          type: 'info',
        })
        break
      }

      case 'silence': {
        result.silenceApplied = true
        result.logMessages.push({
          text: `${bird.name}'s shriek silences all cat abilities for 1 turn!`,
          type: 'info',
        })
        break
      }

      case 'heal_self': {
        const healAmount = Math.floor(bird.scaledHP * (params.healFraction ?? 0.15))
        result.birdHealAmount = healAmount
        result.logMessages.push({
          text: `${bird.name} heals for ${healAmount} HP!`,
          type: 'heal',
        })
        break
      }

      // Reflect and dodge are defensive - handled in resolveBirdDefense
      // Revive and enrage are checked separately
      default:
        break
    }
  }

  return result
}

// ===== Defense Resolution =====

/**
 * Resolve damage dealt TO a bird (defensive properties).
 * Pure function.
 */
export function resolveBirdDefense(
  bird: ScaledBird,
  incomingDamage: number,
  attackerName: string,
  random: () => number,
): BirdDefenseResult {
  const effect = bird.ability.effect
  const params = bird.ability.params
  const logMessages: BirdDefenseResult['logMessages'] = []

  // Apply DEF reduction
  let actualDamage = Math.max(1, incomingDamage - bird.DEF)
  if (bird.DEF > 0 && incomingDamage > bird.DEF) {
    logMessages.push({
      text: `${bird.name}'s armor absorbs ${bird.DEF} damage`,
      type: 'info',
    })
  }

  // Dodge check (Shadow Swift)
  if (effect === 'dodge') {
    const dodgeChance = params.dodgeChance ?? 0.3
    if (random() < dodgeChance) {
      logMessages.push({
        text: `${bird.name} dodges ${attackerName}'s attack!`,
        type: 'info',
      })
      return { actualDamage: 0, reflectDamage: 0, dodged: true, logMessages }
    }
  }

  // Reflect check (Mirror Macaw)
  let reflectDamage = 0
  if (effect === 'reflect') {
    const fraction = params.reflectFraction ?? 0.2
    reflectDamage = Math.floor(actualDamage * fraction)
    if (reflectDamage > 0) {
      logMessages.push({
        text: `${bird.name}'s plumage reflects ${reflectDamage} damage back to ${attackerName}!`,
        type: 'damage',
      })
    }
  }

  return { actualDamage, reflectDamage, dodged: false, logMessages }
}

// ===== Boss Mechanics =====

/**
 * Check if a defeated bird should revive (Talon Queen).
 * Pure function.
 */
export function checkBirdRevive(
  bird: ScaledBird,
  hasRevivedAlready: boolean,
): { shouldRevive: boolean; reviveHp: number } {
  if (bird.ability.effect !== 'revive' || hasRevivedAlready) {
    return { shouldRevive: false, reviveHp: 0 }
  }

  const fraction = bird.ability.params.reviveHpFraction ?? 0.4
  const reviveHp = Math.floor(bird.scaledHP * fraction)

  return { shouldRevive: true, reviveHp }
}

/**
 * Check if bird should enrage (Apex Raptor).
 * Pure function.
 */
export function checkBirdEnrage(
  bird: ScaledBird,
  birdCurrentHp: number,
): { isEnraged: boolean; effectiveATK: number; attackCount: number } {
  if (bird.ability.effect !== 'enrage') {
    return { isEnraged: false, effectiveATK: bird.scaledATK, attackCount: 1 }
  }

  const threshold = bird.ability.params.enrageThreshold ?? 0.3
  const multiplier = bird.ability.params.enrageMultiplier ?? 1.5
  const isEnraged = birdCurrentHp / bird.scaledHP < threshold

  return {
    isEnraged,
    effectiveATK: isEnraged ? Math.floor(bird.scaledATK * multiplier) : bird.scaledATK,
    attackCount: isEnraged ? 2 : 1,
  }
}
