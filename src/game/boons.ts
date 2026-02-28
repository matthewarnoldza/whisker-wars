import {
  BOON_WEIGHT_COMMON,
  BOON_WEIGHT_RARE,
  BOON_WEIGHT_LEGENDARY,
  BOON_PITY_THRESHOLD,
} from './constants'

// ===== Boon Types =====

export type BoonRarity = 'Common' | 'Rare' | 'Legendary'

export type BoonEffect =
  | 'atk_boost'
  | 'hp_boost'
  | 'crit_chance'
  | 'lifesteal'
  | 'thorns'
  | 'scavenger'
  | 'swift_paws'
  | 'iron_fur'
  | 'poison_claws'
  | 'rally_cry'
  | 'executioner'
  | 'fortune_favor'

export interface BoonParams {
  atkBoost?: number
  hpBoost?: number
  critThresholdReduction?: number
  lifestealFraction?: number
  thornsFraction?: number
  coinMultiplier?: number
  bonusAttackChance?: number
  damageReduction?: number
  dotDamage?: number
  dotTurns?: number
  healAmount?: number
  executeThreshold?: number
  executeBonusDamage?: number
  rarityBoost?: number
}

export interface Boon {
  id: string
  name: string
  description: string
  rarity: BoonRarity
  effect: BoonEffect
  maxStacks: number
  params: BoonParams
  iconUrl: string
}

export interface ActiveBoon {
  boonId: string
  stacks: number
}

export interface BoonOffering {
  boons: [Boon, Boon, Boon]
  wasGuaranteedRare: boolean
}

export interface BoonEffects {
  totalAtkBoost: number
  totalHpBoost: number
  critThresholdReduction: number
  lifestealFraction: number
  thornsFraction: number
  coinMultiplier: number
  bonusAttackChance: number
  damageReduction: number
  poisonDot: { damage: number; turns: number } | null
  stageStartHeal: number
  executeThreshold: number
  executeBonusDamage: number
  rarityBoost: number
}

// ===== Boon Roster =====

export const BOONS: Boon[] = [
  // Common
  {
    id: 'sharpened-claws', name: 'Sharpened Claws',
    description: '+2 ATK to all cats',
    rarity: 'Common', effect: 'atk_boost', maxStacks: 3,
    params: { atkBoost: 2 },
    iconUrl: '/images/boons/Sharpened Claws.png',
  },
  {
    id: 'thick-hide', name: 'Thick Hide',
    description: '+5 max HP to all cats',
    rarity: 'Common', effect: 'hp_boost', maxStacks: 3,
    params: { hpBoost: 5 },
    iconUrl: '/images/boons/Thick Hide.png',
  },
  {
    id: 'iron-fur', name: 'Iron Fur',
    description: 'Reduce all incoming damage by 1',
    rarity: 'Common', effect: 'iron_fur', maxStacks: 3,
    params: { damageReduction: 1 },
    iconUrl: '/images/boons/Iron Fur.png',
  },
  {
    id: 'swift-paws', name: 'Swift Paws',
    description: '10% chance for a bonus attack each turn',
    rarity: 'Common', effect: 'swift_paws', maxStacks: 2,
    params: { bonusAttackChance: 0.10 },
    iconUrl: '/images/boons/Swift Paws.png',
  },
  {
    id: 'scavenger', name: 'Scavenger',
    description: '+15% coin rewards from this run',
    rarity: 'Common', effect: 'scavenger', maxStacks: 3,
    params: { coinMultiplier: 0.15 },
    iconUrl: '/images/boons/Scavenger.png',
  },
  {
    id: 'poison-claws', name: 'Poison Claws',
    description: 'Attacks apply 2 poison damage for 2 turns',
    rarity: 'Common', effect: 'poison_claws', maxStacks: 2,
    params: { dotDamage: 2, dotTurns: 2 },
    iconUrl: '/images/boons/Poison Claws.png',
  },

  // Rare
  {
    id: 'keen-eye', name: 'Keen Eye',
    description: 'Crit threshold lowered by 2',
    rarity: 'Rare', effect: 'crit_chance', maxStacks: 2,
    params: { critThresholdReduction: 2 },
    iconUrl: '/images/boons/Keen Eye.png',
  },
  {
    id: 'vampiric-fangs', name: 'Vampiric Fangs',
    description: 'Heal 10% of damage dealt',
    rarity: 'Rare', effect: 'lifesteal', maxStacks: 2,
    params: { lifestealFraction: 0.10 },
    iconUrl: '/images/boons/Vampiric Fangs.png',
  },
  {
    id: 'rally-cry', name: 'Rally Cry',
    description: 'Heal all cats for 5 HP at the start of each stage',
    rarity: 'Rare', effect: 'rally_cry', maxStacks: 2,
    params: { healAmount: 5 },
    iconUrl: '/images/boons/Rally Cry.png',
  },
  {
    id: 'thorn-coat', name: 'Thorn Coat',
    description: 'Reflect 15% of incoming damage back to attacker',
    rarity: 'Rare', effect: 'thorns', maxStacks: 2,
    params: { thornsFraction: 0.15 },
    iconUrl: '/images/boons/Thorn Coat.png',
  },

  // Legendary
  {
    id: 'executioner', name: 'Executioner',
    description: '+8 damage to birds below 25% HP',
    rarity: 'Legendary', effect: 'executioner', maxStacks: 1,
    params: { executeThreshold: 0.25, executeBonusDamage: 8 },
    iconUrl: '/images/boons/Executioner.png',
  },
  {
    id: 'fortune-favor', name: "Fortune's Favor",
    description: 'Future boon offerings are more likely to be Rare or Legendary',
    rarity: 'Legendary', effect: 'fortune_favor', maxStacks: 1,
    params: { rarityBoost: 0.15 },
    iconUrl: '/images/boons/Fortunes Favor.png',
  },
]

// ===== PRNG =====

/** Mulberry32 seeded PRNG. Returns deterministic float [0, 1). */
export function createPRNG(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate a numeric seed from a string. */
export function generateSeed(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  return hash
}

// ===== Boon Selection =====

export function getBoonById(id: string): Boon | undefined {
  return BOONS.find(b => b.id === id)
}

function getActiveStacks(activeBoons: ActiveBoon[], boonId: string): number {
  return activeBoons.find(b => b.boonId === boonId)?.stacks ?? 0
}

function weightForRarity(rarity: BoonRarity, fortuneBoost: number): number {
  switch (rarity) {
    case 'Common': return Math.max(0.1, BOON_WEIGHT_COMMON - fortuneBoost)
    case 'Rare': return BOON_WEIGHT_RARE + fortuneBoost * 0.7
    case 'Legendary': return BOON_WEIGHT_LEGENDARY + fortuneBoost * 0.3
  }
}

function pickRarity(random: () => number, fortuneBoost: number): BoonRarity {
  const w = {
    common: weightForRarity('Common', fortuneBoost),
    rare: weightForRarity('Rare', fortuneBoost),
    legendary: weightForRarity('Legendary', fortuneBoost),
  }
  const total = w.common + w.rare + w.legendary
  const roll = random() * total
  if (roll < w.common) return 'Common'
  if (roll < w.common + w.rare) return 'Rare'
  return 'Legendary'
}

export function generateBoonOffering(
  random: () => number,
  activeBoons: ActiveBoon[],
  consecutiveAllCommonOfferings: number,
  fortuneFavorStacks: number,
): BoonOffering {
  const fortuneBoost = fortuneFavorStacks * 0.15
  const pityActive = consecutiveAllCommonOfferings >= BOON_PITY_THRESHOLD

  // Get eligible boons (not at max stacks)
  const eligible = BOONS.filter(
    b => getActiveStacks(activeBoons, b.id) < b.maxStacks
  )

  // If fewer than 3 eligible boons, allow repeats from full pool
  const pool = eligible.length >= 3 ? eligible : BOONS

  const selected: Boon[] = []
  const usedIds = new Set<string>()

  for (let i = 0; i < 3; i++) {
    let rarity = pickRarity(random, fortuneBoost)

    // Pity timer: force first slot to Rare+ if triggered
    if (i === 0 && pityActive && rarity === 'Common') {
      rarity = random() < 0.85 ? 'Rare' : 'Legendary'
    }

    // Find boons of this rarity not already selected
    let candidates = pool.filter(b => b.rarity === rarity && !usedIds.has(b.id))

    // Fallback: try any rarity if none match
    if (candidates.length === 0) {
      candidates = pool.filter(b => !usedIds.has(b.id))
    }

    // Last resort: any boon
    if (candidates.length === 0) {
      candidates = BOONS.filter(b => !usedIds.has(b.id))
    }

    const pick = candidates[Math.floor(random() * candidates.length)]
    selected.push(pick)
    usedIds.add(pick.id)
  }

  const wasGuaranteedRare = pityActive && selected.some(b => b.rarity !== 'Common')

  return {
    boons: selected as [Boon, Boon, Boon],
    wasGuaranteedRare,
  }
}

// ===== Boon Application =====

export function applyBoon(activeBoons: ActiveBoon[], selectedBoonId: string): ActiveBoon[] {
  const boon = getBoonById(selectedBoonId)
  if (!boon) return activeBoons

  const existing = activeBoons.find(b => b.boonId === selectedBoonId)
  if (existing) {
    if (existing.stacks >= boon.maxStacks) return activeBoons
    return activeBoons.map(b =>
      b.boonId === selectedBoonId ? { ...b, stacks: b.stacks + 1 } : b
    )
  }

  return [...activeBoons, { boonId: selectedBoonId, stacks: 1 }]
}

// ===== Boon Effect Aggregation =====

export function calculateBoonEffects(activeBoons: ActiveBoon[]): BoonEffects {
  const effects: BoonEffects = {
    totalAtkBoost: 0,
    totalHpBoost: 0,
    critThresholdReduction: 0,
    lifestealFraction: 0,
    thornsFraction: 0,
    coinMultiplier: 0,
    bonusAttackChance: 0,
    damageReduction: 0,
    poisonDot: null,
    stageStartHeal: 0,
    executeThreshold: 0,
    executeBonusDamage: 0,
    rarityBoost: 0,
  }

  for (const ab of activeBoons) {
    const boon = getBoonById(ab.boonId)
    if (!boon) continue

    const s = ab.stacks
    const p = boon.params

    switch (boon.effect) {
      case 'atk_boost':
        effects.totalAtkBoost += (p.atkBoost ?? 0) * s
        break
      case 'hp_boost':
        effects.totalHpBoost += (p.hpBoost ?? 0) * s
        break
      case 'crit_chance':
        effects.critThresholdReduction += (p.critThresholdReduction ?? 0) * s
        break
      case 'lifesteal':
        effects.lifestealFraction += (p.lifestealFraction ?? 0) * s
        break
      case 'thorns':
        effects.thornsFraction += (p.thornsFraction ?? 0) * s
        break
      case 'scavenger':
        effects.coinMultiplier += (p.coinMultiplier ?? 0) * s
        break
      case 'swift_paws':
        effects.bonusAttackChance += (p.bonusAttackChance ?? 0) * s
        break
      case 'iron_fur':
        effects.damageReduction += (p.damageReduction ?? 0) * s
        break
      case 'poison_claws':
        if (p.dotDamage && p.dotTurns) {
          effects.poisonDot = {
            damage: (p.dotDamage ?? 0) * s,
            turns: p.dotTurns ?? 0,
          }
        }
        break
      case 'rally_cry':
        effects.stageStartHeal += (p.healAmount ?? 0) * s
        break
      case 'executioner':
        effects.executeThreshold = p.executeThreshold ?? 0
        effects.executeBonusDamage += (p.executeBonusDamage ?? 0) * s
        break
      case 'fortune_favor':
        effects.rarityBoost += (p.rarityBoost ?? 0) * s
        break
    }
  }

  return effects
}
