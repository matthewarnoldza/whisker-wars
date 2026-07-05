import { describe, it, expect } from 'vitest'
import { useGame } from '../store'
import { SaveDataSchema, buildSavePayload, parseSaveData } from '../saveData'

// After the store was split into domain slices, a slice could silently forget to
// declare one of its persisted fields — the app would type-check but ship a save
// with an `undefined` hole. This test locks the composed store's shape to the
// authoritative persisted-field list in saveData.ts (SaveDataSchema).
describe('composed store shape', () => {
  // Every persisted field except saveVersion (which buildSavePayload injects, it is
  // not a store field) must be present on the live composed store state.
  const persistedKeys = Object.keys(SaveDataSchema.shape).filter(k => k !== 'saveVersion')

  it('exposes every persisted field declared in SaveDataSchema', () => {
    const state = useGame.getState() as unknown as Record<string, unknown>
    for (const key of persistedKeys) {
      expect(key in state, `composed store is missing persisted field "${key}"`).toBe(true)
      expect(state[key], `persisted field "${key}" is undefined on the store`).not.toBeUndefined()
    }
  })

  it('produces a payload that round-trips through parseSaveData', () => {
    // buildSavePayload reads each persisted field off the store; if a slice dropped
    // one, the built payload would carry an undefined and fail schema validation.
    const payload = buildSavePayload(useGame.getState())
    const parsed = parseSaveData(payload)
    expect('data' in parsed, 'error' in parsed ? (parsed as { error: string }).error : '').toBe(true)
  })
})
