import { describe, it, expect } from 'vitest'
import { EVENTS, getActiveEvents, getEventPeriodKey, getActiveCoinMultiplier } from '../events'

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
