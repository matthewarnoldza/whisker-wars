import { describe, it, expect } from 'vitest'
import { resolveAbility, resolveDefense } from '../abilityResolver'
import type { OwnedCat } from '../store'

function makeCat(overrides: Partial<OwnedCat> = {}): OwnedCat {
  return {
    id: 'test-cat',
    name: 'Test Cat',
    rarity: 'Rare',
    health: 25,
    attack: 7,
    ability: { name: 'Test Ability', description: 'Test', effect: 'crit' },
    instanceId: 'test-instance',
    level: 5,
    xp: 0,
    currentHp: 25,
    maxHp: 25,
    currentAttack: 7,
    ...overrides,
  }
}

describe('resolveAbility', () => {
  describe('crit effect', () => {
    it('triggers crit on high roll', () => {
      const cat = makeCat({ ability: { name: 'Crit', description: 'x', effect: 'crit' } })
      const result = resolveAbility(cat, 18, 10, false)
      expect(result.isCrit).toBe(true)
      expect(result.damage).toBe(Math.floor(10 * 1.5))
    })

    it('does not trigger crit on low roll', () => {
      const cat = makeCat({ ability: { name: 'Crit', description: 'x', effect: 'crit' } })
      const result = resolveAbility(cat, 10, 10, false)
      expect(result.isCrit).toBe(false)
      expect(result.damage).toBe(10)
    })

    it('has lower threshold for elite cats', () => {
      const cat = makeCat({
        ability: { name: 'Crit', description: 'x', effect: 'crit' },
        isElite: true,
        eliteTier: 1,
      })
      const result = resolveAbility(cat, 13, 10, false)
      expect(result.isCrit).toBe(true)
      expect(result.damage).toBe(Math.floor(10 * 1.75))
    })
  })

  describe('bleed effect', () => {
    it('adds bonus damage on high roll', () => {
      const cat = makeCat({ ability: { name: 'Bleed', description: 'x', effect: 'bleed' } })
      const result = resolveAbility(cat, 18, 10, false)
      expect(result.damage).toBe(13) // 10 + 3
    })

    it('does not add bonus on low roll', () => {
      const cat = makeCat({ ability: { name: 'Bleed', description: 'x', effect: 'bleed' } })
      const result = resolveAbility(cat, 10, 10, false)
      expect(result.damage).toBe(10)
    })
  })

  describe('heal effect', () => {
    it('heals on high roll based on rarity', () => {
      const cat = makeCat({
        ability: { name: 'Heal', description: 'x', effect: 'heal' },
        rarity: 'Rare',
      })
      const result = resolveAbility(cat, 18, 10, false)
      expect(result.healAmount).toBe(3)
      expect(result.healTargetId).toBe('test-instance')
    })

    it('does not heal on low roll', () => {
      const cat = makeCat({ ability: { name: 'Heal', description: 'x', effect: 'heal' } })
      const result = resolveAbility(cat, 10, 10, false)
      expect(result.healAmount).toBe(0)
    })
  })

  describe('lifesteal effect', () => {
    it('always steals HP (no roll threshold)', () => {
      const cat = makeCat({ ability: { name: 'Lifesteal', description: 'x', effect: 'lifesteal' } })
      const result = resolveAbility(cat, 5, 10, false)
      expect(result.healAmount).toBe(5) // 50% of 10
      expect(result.healTargetId).toBe('test-instance')
    })
  })

  describe('stun effect', () => {
    it('stuns on very high roll', () => {
      const cat = makeCat({ ability: { name: 'Stun', description: 'x', effect: 'stun' } })
      const result = resolveAbility(cat, 18, 10, false)
      expect(result.isStun).toBe(true)
    })

    it('does not stun on moderate roll', () => {
      const cat = makeCat({ ability: { name: 'Stun', description: 'x', effect: 'stun' } })
      const result = resolveAbility(cat, 15, 10, false)
      expect(result.isStun).toBe(false)
    })
  })

  describe('speed effect', () => {
    it('triggers extra attack on high roll', () => {
      const cat = makeCat({ ability: { name: 'Speed', description: 'x', effect: 'speed' } })
      const result = resolveAbility(cat, 16, 10, false)
      expect(result.isSpeed).toBe(true)
    })
  })

  describe('silenced', () => {
    it('blocks all ability effects when silenced', () => {
      const cat = makeCat({ ability: { name: 'Crit', description: 'x', effect: 'crit' } })
      const result = resolveAbility(cat, 20, 10, true)
      expect(result.isCrit).toBe(false)
      expect(result.damage).toBe(10)
      expect(result.logMessages.some(m => m.text.includes('silenced'))).toBe(true)
    })
  })
})

describe('resolveDefense', () => {
  describe('armor effect', () => {
    it('reduces damage by flat amount', () => {
      const cat = makeCat({ ability: { name: 'Armor', description: 'x', effect: 'armor' } })
      const result = resolveDefense(cat, 10, false)
      expect(result.actualDamage).toBe(7) // 10 - 3
    })

    it('never reduces damage below 1', () => {
      const cat = makeCat({ ability: { name: 'Armor', description: 'x', effect: 'armor' } })
      const result = resolveDefense(cat, 2, false)
      expect(result.actualDamage).toBe(1)
    })

    it('reduces more for elite cats', () => {
      const cat = makeCat({
        ability: { name: 'Armor', description: 'x', effect: 'armor' },
        isElite: true,
        eliteTier: 1,
      })
      const result = resolveDefense(cat, 10, false)
      expect(result.actualDamage).toBe(5) // 10 - 5
    })
  })

  describe('silenced', () => {
    it('does not apply defense when silenced', () => {
      const cat = makeCat({ ability: { name: 'Armor', description: 'x', effect: 'armor' } })
      const result = resolveDefense(cat, 10, true)
      expect(result.actualDamage).toBe(10)
    })
  })
})
