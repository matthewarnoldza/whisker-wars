import { describe, it, expect } from 'vitest'
import {
  calculateXpForLevel,
  calculateStatBoost,
  getAscendedBaseStat,
  getDifficultyMultiplier,
  XP_BASE,
  MAX_CAT_LEVEL,
  MAX_ASCENSION,
  ASCENSION_COSTS,
} from '../constants'

describe('calculateXpForLevel', () => {
  it('returns base XP at level 1', () => {
    expect(calculateXpForLevel(1)).toBe(XP_BASE)
  })

  it('increases XP required at higher levels', () => {
    const xp1 = calculateXpForLevel(1)
    const xp5 = calculateXpForLevel(5)
    const xp10 = calculateXpForLevel(10)
    expect(xp5).toBeGreaterThan(xp1)
    expect(xp10).toBeGreaterThan(xp5)
  })

  it('returns integer values', () => {
    for (let i = 1; i <= MAX_CAT_LEVEL; i++) {
      expect(Number.isInteger(calculateXpForLevel(i))).toBe(true)
    }
  })
})

describe('calculateStatBoost', () => {
  it('returns base value at level 1', () => {
    expect(calculateStatBoost(20, 1)).toBe(20)
  })

  it('increases with level', () => {
    const level1 = calculateStatBoost(20, 1)
    const level5 = calculateStatBoost(20, 5)
    const level10 = calculateStatBoost(20, 10)
    expect(level5).toBeGreaterThan(level1)
    expect(level10).toBeGreaterThan(level5)
  })

  it('scales proportionally with base value', () => {
    const low = calculateStatBoost(10, 5)
    const high = calculateStatBoost(20, 5)
    expect(high).toBeGreaterThan(low)
  })

  it('returns integer values', () => {
    expect(Number.isInteger(calculateStatBoost(18, 7))).toBe(true)
  })
})

describe('getAscendedBaseStat', () => {
  it('returns base value at ascension 0', () => {
    expect(getAscendedBaseStat(20, 0)).toBe(20)
  })

  it('increases by 10% per ascension', () => {
    const base = 20
    expect(getAscendedBaseStat(base, 1)).toBe(Math.floor(base * 1.1))
    expect(getAscendedBaseStat(base, 2)).toBe(Math.floor(base * 1.2))
    expect(getAscendedBaseStat(base, 3)).toBe(Math.floor(base * 1.3))
  })

  it('returns integer values', () => {
    for (let a = 0; a <= MAX_ASCENSION; a++) {
      expect(Number.isInteger(getAscendedBaseStat(17, a))).toBe(true)
    }
  })
})

describe('getDifficultyMultiplier', () => {
  it('returns 1x at difficulty 0', () => {
    expect(getDifficultyMultiplier(0)).toBe(1)
  })

  it('increases with difficulty', () => {
    expect(getDifficultyMultiplier(1)).toBe(1.5)
    expect(getDifficultyMultiplier(2)).toBe(2.0)
    expect(getDifficultyMultiplier(3)).toBe(2.5)
  })
})

describe('game constants integrity', () => {
  it('has correct number of ascension costs', () => {
    expect(ASCENSION_COSTS.length).toBe(MAX_ASCENSION)
  })

  it('ascension costs are increasing', () => {
    for (let i = 1; i < ASCENSION_COSTS.length; i++) {
      expect(ASCENSION_COSTS[i]).toBeGreaterThan(ASCENSION_COSTS[i - 1])
    }
  })
})
