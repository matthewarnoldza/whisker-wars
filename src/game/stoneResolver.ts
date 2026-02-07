import type { OwnedCat } from './store'
import type { FrenzyElement } from './events'

export interface StoneResult {
  damage: number
  isCrit: boolean
  healAmount: number
  healTargetId: string | null
  burnApplied: { dmgPerTurn: number; turns: number } | null
  freezeApplied: boolean
  rockShieldApplied: boolean
  doubleStrike: boolean
  logMessages: { text: string; type: 'damage' | 'heal' | 'crit' | 'info' }[]
}

/**
 * Resolves an elemental stone's effect on an attack.
 * Pure function — no side effects, no state mutations.
 */
export function resolveStoneEffect(
  element: FrenzyElement,
  cat: OwnedCat,
  baseDamage: number
): StoneResult {
  const result: StoneResult = {
    damage: baseDamage,
    isCrit: false,
    healAmount: 0,
    healTargetId: null,
    burnApplied: null,
    freezeApplied: false,
    rockShieldApplied: false,
    doubleStrike: false,
    logMessages: [],
  }

  switch (element) {
    case 'FIRE':
      result.damage = Math.floor(baseDamage * 3)
      result.burnApplied = { dmgPerTurn: 3, turns: 2 }
      result.logMessages.push(
        { text: `EMBERSTONE ACTIVATED! ${cat.name} unleashes a 3x fire blast!`, type: 'crit' },
        { text: `${cat.name} ignites the enemy! (3 dmg/turn for 2 turns)`, type: 'damage' }
      )
      break

    case 'ICE':
      result.damage = Math.floor(baseDamage * 2)
      result.freezeApplied = true
      result.logMessages.push(
        { text: `FROSTSTONE ACTIVATED! ${cat.name} freezes the battlefield!`, type: 'crit' },
        { text: `Enemy is frozen solid! Skips next turn!`, type: 'info' }
      )
      break

    case 'EARTH':
      result.damage = Math.floor(baseDamage * 2)
      result.rockShieldApplied = true
      result.logMessages.push(
        { text: `TERRASTONE ACTIVATED! ${cat.name} summons a rock shield!`, type: 'crit' },
        { text: `Rock Shield raised! Blocks the next incoming hit!`, type: 'info' }
      )
      break

    case 'LIGHTNING':
      result.damage = baseDamage
      result.isCrit = true
      result.doubleStrike = true
      result.logMessages.push(
        { text: `STORMSTONE ACTIVATED! ${cat.name} strikes twice with lightning speed!`, type: 'crit' },
        { text: `First strike is a guaranteed CRITICAL HIT!`, type: 'crit' }
      )
      break

    case 'SHADOW':
      result.damage = Math.floor(baseDamage * 2.5)
      result.healAmount = result.damage
      result.healTargetId = cat.instanceId
      result.logMessages.push(
        { text: `VOIDSTONE ACTIVATED! ${cat.name} channels the void!`, type: 'crit' },
        { text: `${cat.name} drains ALL damage dealt as HP!`, type: 'heal' }
      )
      break
  }

  return result
}
