import { describe, it, expect } from 'vitest'
import { EQUIPMENT, getEquipmentDropPool, rollEquipmentDrop } from '../items'

describe('EQUIPMENT', () => {
  it('has unique ids', () => {
    const ids = EQUIPMENT.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has both weapon and accessory slots', () => {
    const weapons = EQUIPMENT.filter(e => e.slot === 'weapon')
    const accessories = EQUIPMENT.filter(e => e.slot === 'accessory')
    expect(weapons.length).toBeGreaterThan(0)
    expect(accessories.length).toBeGreaterThan(0)
  })

  it('legendary items have cost 0 (drop only)', () => {
    const legendaries = EQUIPMENT.filter(e => e.rarity === 'Legendary')
    expect(legendaries.length).toBeGreaterThan(0)
    legendaries.forEach(e => {
      expect(e.cost).toBe(0)
    })
  })

  it('non-legendary items have positive cost', () => {
    const nonLegendary = EQUIPMENT.filter(e => e.rarity !== 'Legendary')
    nonLegendary.forEach(e => {
      expect(e.cost).toBeGreaterThan(0)
    })
  })
})

describe('getEquipmentDropPool', () => {
  it('returns Common/Uncommon for early dogs', () => {
    const pool = getEquipmentDropPool(0)
    const rarities = new Set(pool.map(e => e.rarity))
    expect(rarities.has('Common') || rarities.has('Uncommon')).toBe(true)
    expect(rarities.has('Legendary')).toBe(false)
  })

  it('returns Legendary/Epic for high dogs', () => {
    const pool = getEquipmentDropPool(12)
    const rarities = new Set(pool.map(e => e.rarity))
    expect(rarities.has('Legendary') || rarities.has('Epic')).toBe(true)
    expect(rarities.has('Common')).toBe(false)
  })

  it('always returns a non-empty pool', () => {
    for (let i = 0; i < 15; i++) {
      expect(getEquipmentDropPool(i).length).toBeGreaterThan(0)
    }
  })
})

describe('rollEquipmentDrop', () => {
  it('returns Equipment or null', () => {
    // Run many times to cover both outcomes
    const results = Array.from({ length: 100 }, () => rollEquipmentDrop(5))
    const drops = results.filter(r => r !== null)
    const nulls = results.filter(r => r === null)
    // Should have some of each (with 30% drop rate, very unlikely to get all one or the other)
    expect(drops.length).toBeGreaterThan(0)
    expect(nulls.length).toBeGreaterThan(0)
  })

  it('returns items from the correct pool', () => {
    const pool = getEquipmentDropPool(0)
    const poolIds = new Set(pool.map(e => e.id))
    for (let i = 0; i < 50; i++) {
      const drop = rollEquipmentDrop(0)
      if (drop) {
        expect(poolIds.has(drop.id)).toBe(true)
      }
    }
  })
})
