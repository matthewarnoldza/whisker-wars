import { describe, it, expect } from 'vitest'
import {
  EVENTS, getActiveEvents, getEventPeriodKey, getActiveCoinMultiplier,
  getFrenzyWeekKey, isConsecutiveWeek, isFrenzyFriday,
  getMsUntilFridayEnd, getUpcomingFridayElement, ELEMENT_ROTATION,
} from '../events'
import { rollStoneDrop } from '../items'

describe('EVENTS', () => {
  it('has unique ids', () => {
    const ids = EVENTS.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all events have valid event dogs', () => {
    EVENTS.forEach(event => {
      expect(event.eventDog.id).toBeTruthy()
      expect(event.eventDog.name).toBeTruthy()
      expect(event.eventDog.health).toBeGreaterThan(0)
      expect(event.eventDog.attack).toBeGreaterThan(0)
    })
  })

  it('all events have positive coin rewards', () => {
    EVENTS.forEach(event => {
      expect(event.coinReward).toBeGreaterThan(0)
    })
  })

  it('all events have coin multiplier >= 1', () => {
    EVENTS.forEach(event => {
      expect(event.coinMultiplier).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('getEventPeriodKey', () => {
  it('includes event id and year', () => {
    const event = EVENTS[0]
    const key = getEventPeriodKey(event)
    const year = new Date().getFullYear()
    expect(key).toContain(event.id)
    expect(key).toContain(String(year))
  })
})

describe('getActiveCoinMultiplier', () => {
  it('returns at least 1.0', () => {
    expect(getActiveCoinMultiplier()).toBeGreaterThanOrEqual(1.0)
  })
})

describe('getActiveEvents', () => {
  it('returns an array', () => {
    expect(Array.isArray(getActiveEvents())).toBe(true)
  })
})

describe('getFrenzyWeekKey', () => {
  it('returns year-week format', () => {
    const key = getFrenzyWeekKey(new Date(2026, 1, 6)) // Feb 6, 2026 (Friday)
    expect(key).toMatch(/^\d{4}-w\d+$/)
  })
})

describe('isConsecutiveWeek', () => {
  it('detects consecutive weeks in same year', () => {
    expect(isConsecutiveWeek('2026-w5', '2026-w6')).toBe(true)
  })

  it('detects non-consecutive weeks', () => {
    expect(isConsecutiveWeek('2026-w5', '2026-w7')).toBe(false)
  })

  it('handles year boundary', () => {
    expect(isConsecutiveWeek('2025-w52', '2026-w1')).toBe(true)
  })

  it('rejects same week', () => {
    expect(isConsecutiveWeek('2026-w5', '2026-w5')).toBe(false)
  })
})

describe('isFrenzyFriday', () => {
  it('returns true on Friday', () => {
    // Feb 6, 2026 is a Friday
    expect(isFrenzyFriday(new Date(2026, 1, 6))).toBe(true)
  })

  it('returns false on Saturday', () => {
    expect(isFrenzyFriday(new Date(2026, 1, 7))).toBe(false)
  })
})

describe('getMsUntilFridayEnd', () => {
  it('returns positive number on a Friday', () => {
    const friday = new Date(2026, 1, 6, 12, 0, 0) // noon Friday
    expect(getMsUntilFridayEnd(friday)).toBeGreaterThan(0)
  })
})

describe('getUpcomingFridayElement', () => {
  it('returns a valid element', () => {
    const el = getUpcomingFridayElement()
    expect(ELEMENT_ROTATION).toContain(el)
  })
})

describe('rollStoneDrop with bonus', () => {
  it('guarantees drop with bonus of 0.80 (total 100%)', () => {
    let dropped = 0
    for (let i = 0; i < 100; i++) {
      if (rollStoneDrop('FIRE', 0.80)) dropped++
    }
    expect(dropped).toBe(100)
  })

  it('never exceeds 100% chance', () => {
    let dropped = 0
    for (let i = 0; i < 100; i++) {
      if (rollStoneDrop('FIRE', 5.0)) dropped++
    }
    expect(dropped).toBe(100)
  })
})
