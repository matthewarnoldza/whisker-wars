import type { OwnedCat } from './store'

export interface AbilityResult {
  damage: number
  isCrit: boolean
  healAmount: number
  healTargetId: string | null
  isStun: boolean
  isSpeed: boolean
  logMessages: { text: string; type: 'damage' | 'heal' | 'crit' | 'info' }[]
  abilityTriggered: { abilityName: string; effectType: string } | null
}

const HEAL_BY_RARITY: Record<string, number> = {
  'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5, 'Mythical': 6
}

/**
 * Resolves a cat's offensive ability effects for a single attack.
 * Pure function — no side effects, no state mutations.
 */
export function resolveAbility(
  cat: OwnedCat,
  roll: number,
  baseDamage: number,
  silenced: boolean
): AbilityResult {
  const isElite = cat.isElite === true
  const eliteTier = cat.eliteTier || 0
  let dmg = baseDamage
  let isCrit = false
  let healAmount = 0
  let healTargetId: string | null = null
  let isStun = false
  let isSpeed = false
  const logMessages: AbilityResult['logMessages'] = []
  let abilityTriggered: AbilityResult['abilityTriggered'] = null

  if (silenced) {
    logMessages.push({ text: `🔇 ${cat.name}'s ability is silenced!`, type: 'info' })
    return { damage: dmg, isCrit, healAmount, healTargetId, isStun, isSpeed, logMessages, abilityTriggered }
  }

  const effect = cat.ability.effect

  if (effect === 'crit') {
    const threshold = isElite ? 13 : 15
    const multiplier = isElite ? (eliteTier >= 2 ? 2.0 : 1.75) : 1.5
    if (roll >= threshold) {
      dmg = Math.floor(dmg * multiplier)
      isCrit = true
      abilityTriggered = { abilityName: cat.ability.name, effectType: 'crit' }
    }
  }

  if (effect === 'bleed') {
    const threshold = isElite ? 13 : 15
    const bonus = isElite ? (eliteTier >= 2 ? 7 : 5) : 3
    if (roll >= threshold) {
      dmg += bonus
      logMessages.push({ text: `🔥 ${cat.name}'s attack burns for +${bonus} damage!`, type: 'crit' })
      abilityTriggered = { abilityName: cat.ability.name, effectType: 'bleed' }
    }
  }

  if (effect === 'heal') {
    const threshold = isElite ? 13 : 15
    if (roll >= threshold) {
      const healMultiplier = isElite ? (eliteTier >= 2 ? 1.75 : 1.5) : 1.0
      healAmount = Math.floor((HEAL_BY_RARITY[cat.rarity] || 3) * healMultiplier)
      healTargetId = cat.instanceId
      logMessages.push({ text: `${cat.name} heals ${healAmount} HP! ✨`, type: 'heal' })
      abilityTriggered = { abilityName: cat.ability.name, effectType: 'heal' }
    }
  }

  if (effect === 'lifesteal') {
    const pct = isElite ? (eliteTier >= 2 ? 0.75 : 0.65) : 0.50
    healAmount = Math.floor(dmg * pct)
    healTargetId = cat.instanceId
    logMessages.push({ text: `${cat.name} steals ${healAmount} HP! 🩸`, type: 'heal' })
    abilityTriggered = { abilityName: cat.ability.name, effectType: 'lifesteal' }
  }

  if (effect === 'stun') {
    const threshold = isElite ? (eliteTier >= 2 ? 13 : 15) : 17
    if (roll >= threshold) {
      isStun = true
      abilityTriggered = { abilityName: cat.ability.name, effectType: 'stun' }
    }
  }

  if (effect === 'speed') {
    const threshold = isElite ? (eliteTier >= 2 ? 10 : 12) : 14
    if (roll >= threshold) {
      isSpeed = true
      logMessages.push({ text: `⚡ ${cat.name} attacks with lightning speed!`, type: 'crit' })
      abilityTriggered = { abilityName: cat.ability.name, effectType: 'speed' }
    }
  }

  return { damage: dmg, isCrit, healAmount, healTargetId, isStun, isSpeed, logMessages, abilityTriggered }
}

/**
 * Resolves a cat's defensive ability when taking damage.
 * Returns the actual damage after applying shield/armor.
 */
export function resolveDefense(
  cat: OwnedCat,
  incomingDamage: number,
  silenced: boolean
): { actualDamage: number; logMessages: AbilityResult['logMessages'] } {
  let actualDamage = incomingDamage
  const logMessages: AbilityResult['logMessages'] = []
  const isElite = cat.isElite === true
  const eliteTier = cat.eliteTier || 0

  if (silenced) return { actualDamage, logMessages }

  if (cat.ability.effect === 'shield') {
    const shieldChance = isElite ? (eliteTier >= 2 ? 0.60 : 0.50) : 0.35
    if (Math.random() < shieldChance) {
      actualDamage = Math.floor(actualDamage * 0.5)
      logMessages.push({ text: `${cat.name}'s shield blocks half the damage! 🛡️`, type: 'info' })
    }
  }

  if (cat.ability.effect === 'armor') {
    const armorReduction = isElite ? (eliteTier >= 2 ? 7 : 5) : 3
    actualDamage = Math.max(1, actualDamage - armorReduction)
    logMessages.push({ text: `${cat.name}'s armor absorbs ${armorReduction} damage! 🛡️`, type: 'info' })
  }

  return { actualDamage, logMessages }
}
