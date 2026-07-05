import { describe, it, expect } from 'vitest'
import { buildSavePayload, parseSaveData, SAVE_VERSION, type SaveData, type SaveSource } from '../saveData'

// A realistic owned cat with every optional field populated.
const cat: SaveData['owned'][number] = {
  id: 'cat-1',
  name: 'Whiskers',
  rarity: 'Rare',
  health: 100,
  attack: 20,
  ability: { name: 'Shield', description: 'Blocks a hit', effect: 'shield' },
  imageUrl: '/images/cats/whiskers.webp',
  breed: 'Tabby',
  instanceId: 'inst-1',
  level: 5,
  xp: 30,
  currentHp: 90,
  maxHp: 100,
  currentAttack: 22,
  totalBattles: 3,
  totalWins: 2,
  isElite: false,
  eliteTier: 0,
  mergedFromIds: [],
  ascension: 1,
  equipment: { weapon: 'sword-1', accessory: 'charm-1' },
}

// A full in-progress jungle run so nested jungle state is exercised.
const jungleRun: NonNullable<SaveData['jungleRun']> = {
  runId: 'run-1',
  seed: 123456,
  phase: 'pre_battle',
  currentStage: 2,
  squad: [
    {
      instanceId: 'inst-1',
      name: 'Whiskers',
      catId: 'cat-1',
      rarity: 'Rare',
      imageUrl: '/images/cats/whiskers.webp',
      ability: { name: 'Shield', description: 'Blocks a hit', effect: 'shield' },
      isElite: false,
      eliteTier: 0,
      level: 5,
      ascension: 1,
      equipment: { weapon: 'sword-1' },
      baseMaxHp: 100,
      baseAtk: 20,
      currentHp: 90,
      maxHp: 100,
      currentAtk: 22,
      knockedOut: false,
    },
  ],
  activeBoons: [{ boonId: 'atk-1', stacks: 2 }],
  stageResults: [
    {
      stageNumber: 1,
      birdId: 'bird-1',
      birdName: 'Sparrow',
      turnsElapsed: 4,
      catHpRemaining: { 'inst-1': 90 },
      catsKnockedOut: [],
      wasFlawless: true,
      startTime: 1000,
      endTime: 2000,
    },
  ],
  currentBoonOffering: null,
  consecutiveAllCommonOfferings: 0,
  prngCallCount: 5,
  bossRevived: {},
  startedAt: 1700000000000,
}

function makeState(overrides: Partial<SaveSource> = {}): SaveSource {
  return {
    coins: 500,
    baits: { 'toy-mouse': 2, 'silver-sardine': 1 },
    owned: [cat],
    selectedForBattle: ['inst-1'],
    favorites: ['inst-1'],
    dogIndex: 3,
    difficultyLevel: 1,
    alienUnlocked: true,
    theme: 'light',
    soundEnabled: false,
    musicEnabled: true,
    sfxVolume: 0.8,
    musicVolume: 0.6,
    reducedMotion: true,
    colorblindMode: true,
    achievements: [
      { id: 'first-cat', name: 'First Friend', description: 'Befriend your first cat', unlocked: true, claimed: false, progress: 1, maxProgress: 1 },
    ],
    stats: {
      totalBattles: 10,
      totalWins: 7,
      totalLosses: 3,
      totalCatsCollected: 5,
      totalCoinsEarned: 800,
      highestDogDefeated: 4,
      totalMerges: 2,
    },
    lastDailyReward: 1699999999999,
    dailyStreak: 3,
    tutorialCompleted: true,
    hintsSeen: ['bait-select', 'bait-cast'],
    trainingCooldowns: { 'inst-1': [111, 222] },
    inventory: { 'sword-1': 1 },
    completedEventRewards: ['halloween-2025'],
    frenzyStreak: 2,
    lastFrenzyParticipation: '2026-w6',
    junglePassUnlocked: true,
    jungleRun,
    jungleStats: {
      totalRuns: 4,
      totalRunsCompleted: 2,
      bestScore: 999,
      bestStage: 6,
      totalCoinsEarned: 1200,
      fastestCompletionMs: 45000,
      bossesDefeated: [1, 2],
      maxFlawlessStages: 3,
    },
    unlockedJungleMedals: ['gold'],
    jungleAnnouncementShown: true,
    jungleTabVisited: true,
    ...overrides,
  }
}

// Round-trip through JSON exactly like localStorage does.
function roundTrip(state: SaveSource) {
  const payload = buildSavePayload(state)
  const reparsed = parseSaveData(JSON.parse(JSON.stringify(payload)))
  return { payload, reparsed }
}

describe('buildSavePayload', () => {
  it('stamps the current SAVE_VERSION', () => {
    expect(buildSavePayload(makeState()).saveVersion).toBe(SAVE_VERSION)
  })

  it('only persists the known field set (no transient fields leak in)', () => {
    // Simulate the full store state carrying transient/non-persisted fields.
    const dirty = {
      ...makeState(),
      view: 'battle',
      saveError: 'boom',
      cloudSyncError: 'boom',
      lastCloudSyncAt: 12345,
      junglePassPending: true,
      someAction: () => {},
    } as unknown as SaveSource
    const payload = buildSavePayload(dirty)
    expect(payload).not.toHaveProperty('view')
    expect(payload).not.toHaveProperty('saveError')
    expect(payload).not.toHaveProperty('cloudSyncError')
    expect(payload).not.toHaveProperty('lastCloudSyncAt')
    expect(payload).not.toHaveProperty('junglePassPending')
    expect(payload).not.toHaveProperty('someAction')
  })
})

describe('parseSaveData round-trip', () => {
  it('is lossless for a fully-populated save', () => {
    const { payload, reparsed } = roundTrip(makeState())
    expect('data' in reparsed).toBe(true)
    if ('data' in reparsed) {
      expect(reparsed.migrated).toBe(false) // saveVersion present -> no migration
      expect(reparsed.data).toEqual(payload)
    }
  })

  it('preserves a full nested jungle run', () => {
    const { reparsed } = roundTrip(makeState())
    if ('data' in reparsed) {
      expect(reparsed.data.jungleRun).toEqual(jungleRun)
    } else {
      throw new Error('expected data')
    }
  })

  // THE REGRESSION: `d.coins || 120` used to reset zero-coin saves to 120.
  it('keeps coins exactly 0 (the zero-coin regression)', () => {
    const { reparsed } = roundTrip(makeState({ coins: 0 }))
    expect('data' in reparsed).toBe(true)
    if ('data' in reparsed) {
      expect(reparsed.data.coins).toBe(0)
    }
  })

  // Both fields were historically dropped from one of the four hand-kept lists.
  it('preserves selectedForBattle and soundEnabled (the dropped-field bugs)', () => {
    const { reparsed } = roundTrip(makeState({ selectedForBattle: ['a', 'b'], soundEnabled: false }))
    if ('data' in reparsed) {
      expect(reparsed.data.selectedForBattle).toEqual(['a', 'b'])
      expect(reparsed.data.soundEnabled).toBe(false) // survives as false, not defaulted to true
    } else {
      throw new Error('expected data')
    }
  })

  // First-run coach-mark tracking (useFirstRunHints).
  it('round-trips hintsSeen and backfills [] for a save that predates it', () => {
    const { reparsed } = roundTrip(makeState({ hintsSeen: ['bait-select'] }))
    if ('data' in reparsed) {
      expect(reparsed.data.hintsSeen).toEqual(['bait-select'])
    } else {
      throw new Error('expected data')
    }

    // A save written before hintsSeen existed lacks the key entirely -> defaults to [].
    const withoutHints = buildSavePayload(makeState()) as Record<string, unknown>
    delete withoutHints.hintsSeen
    const backfilled = parseSaveData(withoutHints)
    if ('data' in backfilled) {
      expect(backfilled.data.hintsSeen).toEqual([])
    } else {
      throw new Error('expected data')
    }
  })
})

describe('v0 (legacy, unversioned) migration', () => {
  // A legacy blob is exactly what save() wrote before this change: the full field
  // set with NO saveVersion.
  function legacyBlob(): Record<string, unknown> {
    const { saveVersion, ...rest } = buildSavePayload(makeState())
    void saveVersion
    return rest
  }

  it('parses, reports migrated: true, and stamps the version', () => {
    const result = parseSaveData(legacyBlob())
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.migrated).toBe(true)
      expect(result.data.saveVersion).toBe(SAVE_VERSION)
    }
  })

  it('loses NO fields during migration', () => {
    const legacy = legacyBlob()
    const result = parseSaveData(legacy)
    if ('data' in result) {
      const { saveVersion, ...restored } = result.data
      void saveVersion
      expect(restored).toEqual(legacy)
    } else {
      throw new Error('expected data')
    }
  })

  it('backfills fields that were missing from an older legacy save', () => {
    // An even older save that predates soundEnabled/selectedForBattle entirely.
    const legacy = legacyBlob()
    delete legacy.soundEnabled
    delete legacy.selectedForBattle
    const result = parseSaveData(legacy)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.migrated).toBe(true)
      expect(result.data.soundEnabled).toBe(true) // default
      expect(result.data.selectedForBattle).toEqual([]) // default
    }
  })
})

describe('v1 -> v2 migration (settings fields added)', () => {
  // A v1 blob is exactly what save() wrote before the settings work: the full v1
  // field set, stamped saveVersion 1, with NONE of the four settings fields.
  function v1Blob(): Record<string, unknown> {
    const full = buildSavePayload(makeState()) as Record<string, unknown>
    delete full.sfxVolume
    delete full.musicVolume
    delete full.reducedMotion
    delete full.colorblindMode
    return { ...full, saveVersion: 1 }
  }

  it('migrates to v2, reports migrated, and stamps SAVE_VERSION', () => {
    const result = parseSaveData(v1Blob())
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.migrated).toBe(true)
      expect(result.data.saveVersion).toBe(SAVE_VERSION)
      expect(SAVE_VERSION).toBe(2)
    }
  })

  it('injects the four settings defaults for a v1 save that lacks them', () => {
    const result = parseSaveData(v1Blob())
    if ('data' in result) {
      expect(result.data.sfxVolume).toBe(0.5)
      expect(result.data.musicVolume).toBe(0.2)
      expect(result.data.reducedMotion).toBe(false)
      expect(result.data.colorblindMode).toBe(false)
    } else {
      throw new Error('expected data')
    }
  })

  it('loses nothing else when upgrading a v1 save', () => {
    const result = parseSaveData(v1Blob())
    if ('data' in result) {
      expect(result.data.coins).toBe(500)
      expect(result.data.owned).toHaveLength(1)
      expect(result.data.soundEnabled).toBe(false)
      expect(result.data.jungleRun).toEqual(jungleRun)
    } else {
      throw new Error('expected data')
    }
  })

  it('chains a legacy (v0) save all the way to v2 with settings defaults', () => {
    // v0 = no saveVersion at all, and no settings fields.
    const full = buildSavePayload(makeState()) as Record<string, unknown>
    delete full.saveVersion
    delete full.sfxVolume
    delete full.musicVolume
    delete full.reducedMotion
    delete full.colorblindMode
    const result = parseSaveData(full)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.migrated).toBe(true)
      expect(result.data.saveVersion).toBe(2)
      expect(result.data.sfxVolume).toBe(0.5)
      expect(result.data.reducedMotion).toBe(false)
      expect(result.data.coins).toBe(500) // legacy data intact through the chain
    }
  })

  // THE FALSY LESSON: a fully-muted SFX volume of 0 must survive, not be
  // resurrected to the 0.5 default by a `||`-style fallback.
  it('preserves an explicit sfxVolume of 0 (the falsy-volume regression)', () => {
    const { reparsed } = roundTrip(makeState({ sfxVolume: 0, musicVolume: 0 }))
    expect('data' in reparsed).toBe(true)
    if ('data' in reparsed) {
      expect(reparsed.data.sfxVolume).toBe(0)
      expect(reparsed.data.musicVolume).toBe(0)
    }
  })
})

describe('corrupt input surfaces an error (never silent defaults)', () => {
  it('rejects non-objects', () => {
    expect('error' in parseSaveData(null)).toBe(true)
    expect('error' in parseSaveData(undefined)).toBe(true)
    expect('error' in parseSaveData('a raw string')).toBe(true)
    expect('error' in parseSaveData(42)).toBe(true)
    expect('error' in parseSaveData([1, 2, 3])).toBe(true)
  })

  it('rejects a wrong-typed critical field instead of resetting it', () => {
    const bad = { ...buildSavePayload(makeState()), coins: 'not-a-number' }
    const result = parseSaveData(bad)
    expect('error' in result).toBe(true)
    // Must NOT come back as valid data with a defaulted coin balance.
    expect('data' in result).toBe(false)
  })

})

describe('per-element resilience (owned / achievements)', () => {
  // Three cats, the middle one corrupt (missing the required maxHp field).
  function threeCatsOneCorrupt() {
    const good1 = { ...cat, instanceId: 'inst-1', name: 'Alpha' }
    const good2 = { ...cat, instanceId: 'inst-3', name: 'Gamma' }
    const { maxHp, ...corrupt } = { ...cat, instanceId: 'inst-2', name: 'Beta' }
    void maxHp
    return { good1, good2, corrupt }
  }

  it('drops one corrupt owned cat, keeps the other two, and reports 1 dropped', () => {
    const { good1, good2, corrupt } = threeCatsOneCorrupt()
    const blob = { ...buildSavePayload(makeState()), owned: [good1, corrupt, good2] }
    const result = parseSaveData(blob)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.owned).toHaveLength(2)
      expect(result.data.owned.map(c => c.instanceId)).toEqual(['inst-1', 'inst-3'])
      expect(result.droppedElements).toEqual({ owned: 1, achievements: 0 })
    }
  })

  it('drops one corrupt achievement, keeps the other, and reports 1 dropped', () => {
    const good = { id: 'first-cat', name: 'First Friend', description: 'x', unlocked: true, claimed: false, progress: 1, maxProgress: 1 }
    const corrupt = { id: 'broken', name: 'Broken', description: 'x', unlocked: true, claimed: false, progress: 1 } // missing maxProgress
    const blob = { ...buildSavePayload(makeState()), achievements: [good, corrupt] }
    const result = parseSaveData(blob)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.achievements).toHaveLength(1)
      expect(result.data.achievements[0].id).toBe('first-cat')
      expect(result.droppedElements).toEqual({ owned: 0, achievements: 1 })
    }
  })

  it('does not alter the surviving siblings of a dropped element', () => {
    const { good1, good2, corrupt } = threeCatsOneCorrupt()
    const blob = { ...buildSavePayload(makeState()), owned: [good1, corrupt, good2] }
    const result = parseSaveData(blob)
    if ('data' in result) {
      expect(result.data.owned[0]).toEqual(good1)
      expect(result.data.owned[1]).toEqual(good2)
    } else {
      throw new Error('expected data')
    }
  })

  it('falls back to the default [] when owned is not an array (fully corrupt)', () => {
    const blob = { ...buildSavePayload(makeState()), owned: 'totally-not-an-array' }
    const result = parseSaveData(blob)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.owned).toEqual([])
      // A non-array collapse is a fall-back-to-default, not a per-element drop.
      expect(result.droppedElements).toBeUndefined()
      expect(result.data.coins).toBe(500) // rest of the save intact
    }
  })

  it('omits droppedElements entirely when nothing was dropped', () => {
    const result = parseSaveData(buildSavePayload(makeState()))
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.droppedElements).toBeUndefined()
    }
  })
})

describe('resilience and forward-compat', () => {
  it('drops a single corrupt jungleRun to null without nuking the save', () => {
    const blob = { ...buildSavePayload(makeState()), jungleRun: { runId: 12345 } } // runId wrong type
    const result = parseSaveData(blob)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.jungleRun).toBeNull() // corrupt run dropped
      expect(result.data.coins).toBe(500) // rest of the save intact
      expect(result.data.owned).toHaveLength(1)
    }
  })

  it('does not fail parsing on unknown extra fields (stripped)', () => {
    const blob = {
      ...buildSavePayload(makeState()),
      someFutureField: { nested: true },
      anotherNewThing: 42,
    }
    const result = parseSaveData(blob)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect((result.data as Record<string, unknown>).someFutureField).toBeUndefined()
      expect((result.data as Record<string, unknown>).anotherNewThing).toBeUndefined()
      expect(result.data.coins).toBe(500) // known fields intact
    }
  })

  it('treats a future save version as current-and-unknown (no migration, no crash)', () => {
    const blob = { ...buildSavePayload(makeState()), saveVersion: 99 }
    const result = parseSaveData(blob)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.migrated).toBe(false)
      expect(result.data.coins).toBe(500)
    }
  })
})
