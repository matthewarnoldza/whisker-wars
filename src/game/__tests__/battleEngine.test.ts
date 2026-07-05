import { describe, it, expect } from 'vitest'
import { createBattle, createJungleBattle, resolveAction } from '../battle/engine'
import { computeBattleRewards } from '../battle/rewards'
import type { BattleAction, BattleConfig, BattleEvent, BattleState, BirdSnapshot, JungleBattleConfig } from '../battle/types'
import { createPRNG } from '../boons'
import type { BoonEffects } from '../boons'
import type { JungleSquadCat } from '../jungleRun'
import type { OwnedCat } from '../store'

// ===== Fixtures =====

function makeCat(overrides: Partial<OwnedCat> = {}): OwnedCat {
  return {
    id: 'cat',
    name: 'Test Cat',
    rarity: 'Rare',
    health: 50,
    attack: 7,
    ability: { name: 'Lucky Strike', description: 'x', effect: 'crit' },
    instanceId: 'cat-1',
    level: 5,
    xp: 0,
    currentHp: 50,
    maxHp: 50,
    currentAttack: 7,
    ...overrides,
  }
}

function makeConfig(overrides: Partial<BattleConfig> = {}): BattleConfig {
  return {
    dog: { id: 'plain-boss', name: 'Plain Boss', attack: 3, health: 30 },
    cats: [makeCat({ instanceId: 'cat-1', currentAttack: 20, currentHp: 50, maxHp: 50 })],
    frontierDogId: 'plain-boss',
    rewards: { battleDogIndex: 3, difficultyLevel: 1, coinMultiplier: 2, isRepeatEventBoss: false },
    ...overrides,
  }
}

/** rng that yields queued values in order (throws if drained — catches drift). */
function scriptedRng(values: number[]): () => number {
  let i = 0
  return () => {
    if (i >= values.length) throw new Error(`scriptedRng drained after ${values.length} draws`)
    return values[i++]
  }
}

/** Deterministic full-battle driver: first living cat attacks each turn. */
function drive(startSeed: number, config: BattleConfig, maxSteps = 200) {
  const rng = createPRNG(startSeed)
  let state = createBattle(config)
  const events: BattleEvent[] = []
  let steps = 0
  while (state.outcome === 'ongoing' && steps++ < maxSteps) {
    let action: BattleAction
    if (state.turn === 'player') {
      const cat = state.cats.find(c => c.currentHp > 0)
      if (!cat) break
      action = { type: 'PLAYER_ATTACK', attackerId: cat.instanceId }
    } else {
      action = { type: 'ENEMY_TURN' }
    }
    const r = resolveAction(state, action, rng)
    state = r.state
    events.push(...r.events)
    if (action.type === 'ENEMY_TURN' && state.turn === 'player' && state.outcome === 'ongoing') {
      const r2 = resolveAction(state, { type: 'START_PLAYER_TURN' }, rng)
      state = r2.state
      events.push(...r2.events)
    }
  }
  return { state, events }
}

// ===== Determinism =====

describe('battle engine — determinism', () => {
  it('same seed + same actions → deep-equal final state and events', () => {
    const a = drive(12345, makeConfig())
    const b = drive(12345, makeConfig())
    expect(a.state).toEqual(b.state)
    expect(a.events).toEqual(b.events)
  })

  it('different seeds can diverge (sanity: rng is actually wired in)', () => {
    // Use a config with a randomised dog so the seed matters.
    const cfg = makeConfig({
      dog: { id: 'chaos-demon', name: 'Chaos', attack: 6, health: 200 },
      frontierDogId: 'chaos-demon',
      cats: [makeCat({ instanceId: 'cat-1', currentAttack: 5, currentHp: 60, maxHp: 60 })],
    })
    const a = drive(1, cfg)
    const b = drive(999, cfg)
    // Event streams should differ for at least one of the runs.
    expect(a.events).not.toEqual(b.events)
  })
})

// ===== Full seeded battle to victory =====

describe('battle engine — full battle to victory', () => {
  it('reaches victory, event-type sequence is stable, rewards match legacy formula', () => {
    const cfg = makeConfig()
    const { state, events } = drive(777, cfg)

    expect(state.outcome).toBe('victory')

    const typeSeq = events.map(e => e.type)
    expect(typeSeq).toMatchSnapshot()

    const ended = events.filter(e => e.type === 'BattleEnded')
    expect(ended).toHaveLength(1)
    const end = ended[0] as Extract<BattleEvent, { type: 'BattleEnded' }>
    expect(end.outcome).toBe('victory')

    const expected = computeBattleRewards(cfg.rewards)
    expect(end.rewards).toEqual(expected)
    // sanity: (150 + 3*30) * 1.5 * 2 = 720 coins ; (50 + 3*25) * 1.5 = 187 xp
    expect(expected).toEqual({ coins: 720, xp: 187 })
  })
})

// ===== Unit cases =====

describe('battle engine — mechanics', () => {
  it('natural 20 doubles damage and flags a crit', () => {
    const state = createBattle(makeConfig({ cats: [makeCat({ instanceId: 'cat-1', currentAttack: 7 })] }))
    // rollD20 draw only (no dodge, no armor on plain-boss)
    const rng = scriptedRng([0.999])
    const { events } = resolveAction(state, { type: 'PLAYER_ATTACK', attackerId: 'cat-1' }, rng)

    const dice = events.find(e => e.type === 'DiceRolled') as Extract<BattleEvent, { type: 'DiceRolled' }>
    expect(dice.value).toBe(20)
    expect(dice.isCrit).toBe(true)
    expect(events.some(e => e.type === 'Log' && e.text.includes('NATURAL 20'))).toBe(true)

    // base = 7 + 0 aura + 0 equip + floor(20/5)=4 => 11 ; doubled => 22
    const dmg = events.find(e => e.type === 'DamageDealt') as Extract<BattleEvent, { type: 'DamageDealt' }>
    expect(dmg.targetId).toBe('dog')
    expect(dmg.amount).toBe(22)
  })

  it('dodge (Shadow Stalker) negates the hit and passes the turn', () => {
    const cfg = makeConfig({
      dog: { id: 'shadow-stalker', name: 'Shadow Stalker', attack: 5, health: 100 },
      frontierDogId: 'shadow-stalker',
    })
    const state = createBattle(cfg)
    expect(state.dogDodgeChance).toBe(0.3)
    // draws: rollD20 (0.5 -> 11), dodge roll (0.1 < 0.3 -> dodge)
    const rng = scriptedRng([0.5, 0.1])
    const { state: next, events } = resolveAction(state, { type: 'PLAYER_ATTACK', attackerId: 'cat-1' }, rng)

    expect(events.some(e => e.type === 'Dodged')).toBe(true)
    expect(events.some(e => e.type === 'DamageDealt' && e.targetId === 'dog')).toBe(false)
    expect(next.dog.hp).toBe(100)
    expect(next.turn).toBe('enemy')
  })

  it('Crystal Guardian armor reduces incoming damage and logs the absorb', () => {
    const cfg = makeConfig({
      dog: { id: 'crystal-guardian', name: 'Crystal Guardian', attack: 5, health: 100 },
      frontierDogId: 'crystal-guardian',
      cats: [makeCat({ instanceId: 'cat-1', currentAttack: 7 })],
    })
    const state = createBattle(cfg)
    expect(state.dogArmor).toBe(4)
    const rng = scriptedRng([0.5]) // roll 11, no dodge
    const { events } = resolveAction(state, { type: 'PLAYER_ATTACK', attackerId: 'cat-1' }, rng)

    // base = 7 + floor(11/5)=2 => 9 ; armor => max(1, 9-4)=5
    const dmg = events.find(e => e.type === 'DamageDealt') as Extract<BattleEvent, { type: 'DamageDealt' }>
    expect(dmg.amount).toBe(5)
    expect(events.some(e => e.type === 'Log' && e.text.includes('crystal armor absorbs 4'))).toBe(true)
  })

  it('applies and expires a DoT across player turns', () => {
    let state: BattleState = createBattle(makeConfig())
    state = { ...state, dotEffects: [{ catId: 'cat-1', turnsLeft: 2, dmgPerTurn: 2, type: 'poison' }] }
    const rng = scriptedRng([]) // START_PLAYER_TURN consumes no rng

    const r1 = resolveAction(state, { type: 'START_PLAYER_TURN' }, rng)
    const tick = r1.events.find(e => e.type === 'DotTick') as Extract<BattleEvent, { type: 'DotTick' }>
    expect(tick.amount).toBe(2)
    expect(tick.resultingHp).toBe(48)
    expect(r1.state.dotEffects[0].turnsLeft).toBe(1)

    const r2 = resolveAction(r1.state, { type: 'START_PLAYER_TURN' }, rng)
    expect(r2.events.some(e => e.type === 'DotTick')).toBe(true)
    expect(r2.state.dotEffects).toHaveLength(0) // expired
    expect(r2.state.cats[0].currentHp).toBe(46)
  })

  it('detects defeat when the enemy kills the last cat', () => {
    const cfg = makeConfig({
      dog: { id: 'plain-boss', name: 'Plain Boss', attack: 40, health: 100 },
      frontierDogId: 'plain-boss',
      cats: [makeCat({ instanceId: 'cat-1', currentHp: 1, maxHp: 50, currentAttack: 7 })],
    })
    let state = createBattle(cfg)
    state = { ...state, turn: 'enemy' }
    const rng = scriptedRng([0.5, 0.0]) // dog rolls d20, then picks the single target
    const { state: next, events } = resolveAction(state, { type: 'ENEMY_TURN' }, rng)

    expect(next.outcome).toBe('defeat')
    expect(events.some(e => e.type === 'BattleEnded' && e.outcome === 'defeat')).toBe(true)
    expect(next.cats[0].currentHp).toBe(0)
  })

  it('active ability (crit) doubles ATK, triggers, and damages the dog', () => {
    const cfg = makeConfig({
      cats: [makeCat({ instanceId: 'cat-1', currentAttack: 9, ability: { name: 'Critical Strike', description: 'x', effect: 'crit' } })],
      dog: { id: 'plain-boss', name: 'Plain Boss', attack: 3, health: 100 },
    })
    const state = createBattle(cfg)
    const rng = scriptedRng([]) // abilities do not roll
    const { state: next, events } = resolveAction(state, { type: 'PLAYER_ABILITY', attackerId: 'cat-1' }, rng)

    const trig = events.find(e => e.type === 'AbilityTriggered') as Extract<BattleEvent, { type: 'AbilityTriggered' }>
    expect(trig.effectType).toBe('crit')
    const dmg = events.find(e => e.type === 'DamageDealt') as Extract<BattleEvent, { type: 'DamageDealt' }>
    expect(dmg.amount).toBe(18) // floor(9 * 2)
    expect(next.dog.hp).toBe(82)
    expect(next.turn).toBe('enemy')
  })

  it('active ability respects the cooldown (no-op while cooling down)', () => {
    const state = createBattle(makeConfig())
    const cooling: BattleState = { ...state, abilityCooldowns: { 'cat-1': 3 } }
    const { state: next, events } = resolveAction(cooling, { type: 'PLAYER_ABILITY', attackerId: 'cat-1' }, scriptedRng([]))
    expect(events).toHaveLength(0)
    expect(next.dog.hp).toBe(next.dog.maxHealth)
  })
})

// ===== Boss damage reflect =====

// Locks the intentional fix of the legacy stale-snapshot bug: reflect damage was
// written from a stale React snapshot and silently overwritten by the main hit
// (making it cosmetic). It must now STACK on top of the main hit against live state.
describe('battle engine — boss damage reflect', () => {
  it('Eternal Overlord: Apocalypse Aura reflect STACKS on top of the main hit', () => {
    const cfg = makeConfig({
      dog: { id: 'eternal-overlord', name: 'Eternal Overlord', attack: 10, health: 400 },
      frontierDogId: 'eternal-overlord',
      cats: [makeCat({ instanceId: 'cat-1', currentHp: 50, maxHp: 50, currentAttack: 7 })],
    })
    let state = createBattle(cfg)
    state = { ...state, turn: 'enemy' } // ability ready (cooldown 0), so aura + reflect fire
    // draws: rollD20 (0.5 -> 11), target pick (0.0 -> only cat). crit cat = no defense roll.
    const rng = scriptedRng([0.5, 0.0])
    const { state: next, events } = resolveAction(state, { type: 'ENEMY_TURN' }, rng)

    // dmg = attack 10 + floor(11/6)=1 => 11 (main hit) ; reflect = floor(11 * 0.2) = 2
    const reflect = events.find(e => e.type === 'DamageDealt' && e.source === 'reflect') as Extract<BattleEvent, { type: 'DamageDealt' }>
    const main = events.find(e => e.type === 'DamageDealt' && e.source === 'dog-attack') as Extract<BattleEvent, { type: 'DamageDealt' }>
    expect(reflect.amount).toBe(2)
    expect(main.amount).toBe(11)
    // final HP = 50 - 2 (Apocalypse Aura chip) - 2 (reflect) - 11 (main hit) = 35.
    // Under the legacy bug the reflect was discarded, leaving 37; asserting 35 locks the stack.
    expect(next.cats[0].currentHp).toBe(35)
  })

  it('dogReflect (Assimilator / Cosmic Queen 25%) STACKS on top of the main hit', () => {
    // dogReflect is set by Genetic Override / Extinction Protocol for the *following* turn,
    // so we seed it directly to exercise the reflect branch in isolation (no Apocalypse Aura chip).
    const cfg = makeConfig({
      dog: { id: 'plain-boss', name: 'Plain Boss', attack: 10, health: 100 },
      frontierDogId: 'plain-boss',
      cats: [makeCat({ instanceId: 'cat-1', currentHp: 50, maxHp: 50, currentAttack: 7 })],
    })
    let state = createBattle(cfg)
    state = { ...state, turn: 'enemy', dogReflect: 0.25 }
    // draws: rollD20 (0.5 -> 11), target pick (0.0 -> only cat). crit cat = no defense roll.
    const rng = scriptedRng([0.5, 0.0])
    const { state: next, events } = resolveAction(state, { type: 'ENEMY_TURN' }, rng)

    // dmg = 10 + floor(11/6)=1 => 11 (main hit) ; reflect = floor(11 * 0.25) = 2
    const reflect = events.find(e => e.type === 'DamageDealt' && e.source === 'reflect') as Extract<BattleEvent, { type: 'DamageDealt' }>
    const main = events.find(e => e.type === 'DamageDealt' && e.source === 'dog-attack') as Extract<BattleEvent, { type: 'DamageDealt' }>
    expect(reflect.amount).toBe(2)
    expect(main.amount).toBe(11)
    // final HP = 50 - 2 (reflect) - 11 (main hit) = 37 ; legacy bug would leave 39.
    expect(next.cats[0].currentHp).toBe(37)
    expect(next.dogReflect).toBe(0) // one-shot reflect is consumed
  })
})

// ===== Re-entrancy =====

describe('battle engine — re-entrancy', () => {
  it('resolveAction on a finished battle is a no-op', () => {
    const { state } = drive(777, makeConfig())
    expect(state.outcome).toBe('victory')

    const rng = createPRNG(5)
    const r = resolveAction(state, { type: 'PLAYER_ATTACK', attackerId: 'cat-1' }, rng)
    expect(r.events).toEqual([])
    expect(r.state).toBe(state) // same reference, untouched
  })
})

// =====================================================================
// ===== Jungle combat (cats vs bird) =====
// =====================================================================

function makeBoons(overrides: Partial<BoonEffects> = {}): BoonEffects {
  return {
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
    ...overrides,
  }
}

function makeBird(overrides: Partial<BirdSnapshot> = {}): BirdSnapshot {
  return {
    id: 'jungle-sparrow',
    name: 'Sparrow',
    DEF: 0,
    isBoss: false,
    scaledHP: 60,
    scaledATK: 6,
    ability: { name: 'Gale Force', description: 'x', effect: 'aoe', params: { aoeFraction: 0.3, cooldown: 3 } },
    ...overrides,
  }
}

function makeSquadCat(overrides: Partial<JungleSquadCat> = {}): JungleSquadCat {
  return {
    instanceId: 'jc-1',
    name: 'Jungle Cat',
    catId: 'cat',
    rarity: 'Rare',
    ability: { name: 'Lucky Strike', description: 'x', effect: 'crit' },
    level: 5,
    baseMaxHp: 50,
    baseAtk: 10,
    currentHp: 50,
    maxHp: 50,
    currentAtk: 10,
    knockedOut: false,
    ...overrides,
  }
}

function makeJungleConfig(overrides: Partial<JungleBattleConfig> = {}): JungleBattleConfig {
  return {
    bird: makeBird(),
    squad: [makeSquadCat()],
    boonEffects: makeBoons(),
    ...overrides,
  }
}

/** Deterministic full jungle-battle driver: first living cat attacks each turn. */
function driveJungle(startSeed: number, config: JungleBattleConfig, maxSteps = 300) {
  const rng = createPRNG(startSeed)
  let state = createJungleBattle(config)
  const events: BattleEvent[] = []
  let steps = 0
  while (state.outcome === 'ongoing' && steps++ < maxSteps) {
    let action: BattleAction
    if (state.turn === 'player') {
      const cat = state.cats.find(c => c.currentHp > 0)
      if (!cat) break
      action = { type: 'PLAYER_ATTACK', attackerId: cat.instanceId }
    } else {
      action = { type: 'ENEMY_TURN' }
    }
    const r = resolveAction(state, action, rng)
    state = r.state
    events.push(...r.events)
    if (action.type === 'ENEMY_TURN' && state.turn === 'player' && state.outcome === 'ongoing') {
      const r2 = resolveAction(state, { type: 'START_PLAYER_TURN' }, rng)
      state = r2.state
      events.push(...r2.events)
    }
  }
  return { state, events }
}

describe('jungle engine — determinism', () => {
  it('same seed + same actions → deep-equal final state and events', () => {
    const a = driveJungle(2024, makeJungleConfig({
      bird: makeBird({ id: 'apex-raptor', name: 'Apex Raptor', isBoss: true, scaledHP: 120, scaledATK: 12, DEF: 2, ability: { name: 'Apex Fury', description: 'x', effect: 'enrage', params: { enrageThreshold: 0.3, enrageMultiplier: 1.5 } } }),
      squad: [
        makeSquadCat({ instanceId: 'jc-1', currentAtk: 9 }),
        makeSquadCat({ instanceId: 'jc-2', name: 'Cat 2', currentAtk: 7, ability: { name: 'Guard', description: 'x', effect: 'shield' } }),
      ],
    }))
    const b = driveJungle(2024, makeJungleConfig({
      bird: makeBird({ id: 'apex-raptor', name: 'Apex Raptor', isBoss: true, scaledHP: 120, scaledATK: 12, DEF: 2, ability: { name: 'Apex Fury', description: 'x', effect: 'enrage', params: { enrageThreshold: 0.3, enrageMultiplier: 1.5 } } }),
      squad: [
        makeSquadCat({ instanceId: 'jc-1', currentAtk: 9 }),
        makeSquadCat({ instanceId: 'jc-2', name: 'Cat 2', currentAtk: 7, ability: { name: 'Guard', description: 'x', effect: 'shield' } }),
      ],
    }))
    expect(a.state).toEqual(b.state)
    expect(a.events).toEqual(b.events)
    expect(['victory', 'defeat']).toContain(a.state.outcome)
  })

  it('different seeds can diverge (rng is wired into jungle combat)', () => {
    const cfg = () => makeJungleConfig({
      bird: makeBird({ id: 'shadow-swift', name: 'Shadow Swift', scaledHP: 200, scaledATK: 5, ability: { name: 'Evasive Flight', description: 'x', effect: 'dodge', params: { dodgeChance: 0.3 } } }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 5, currentHp: 60, maxHp: 60 })],
    })
    const a = driveJungle(1, cfg())
    const b = driveJungle(999, cfg())
    expect(a.events).not.toEqual(b.events)
  })
})

describe('jungle engine — bird abilities', () => {
  it('Shadow Swift dodge negates the hit and passes the turn', () => {
    const state = createJungleBattle(makeJungleConfig({
      bird: makeBird({ id: 'shadow-swift', name: 'Shadow Swift', scaledHP: 100, ability: { name: 'Evasive Flight', description: 'x', effect: 'dodge', params: { dodgeChance: 0.3 } } }),
    }))
    // draws: rollD20 (0.5 -> 11), dodge roll (0.1 < 0.3 -> dodge)
    const rng = scriptedRng([0.5, 0.1])
    const { state: next, events } = resolveAction(state, { type: 'PLAYER_ATTACK', attackerId: 'jc-1' }, rng)

    expect(events.some(e => e.type === 'Dodged' && e.targetId === 'bird')).toBe(true)
    expect(events.some(e => e.type === 'DamageDealt' && e.targetId === 'bird')).toBe(false)
    expect(next.dog.hp).toBe(100)
    expect(next.turn).toBe('enemy')
  })

  it('Screech Owl applies an ATK debuff to all living cats on its turn', () => {
    let state = createJungleBattle(makeJungleConfig({
      bird: makeBird({ id: 'screech-owl', name: 'Screech Owl', scaledATK: 8, scaledHP: 100, ability: { name: 'Screech', description: 'x', effect: 'debuff_atk', params: { debuffMultiplier: 0.7, debuffTurns: 2, cooldown: 0 } } }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 10 })],
    }))
    state = { ...state, turn: 'enemy' }
    // one draw: non-boss primary-target pick (crit cat = no defense roll, not elite)
    const rng = scriptedRng([0.0])
    const { state: next, events } = resolveAction(state, { type: 'ENEMY_TURN' }, rng)

    expect(events.some(e => e.type === 'Log' && e.text.includes('ATK reduced by 30%'))).toBe(true)
    expect(next.atkDebuffs['jc-1']).toBeDefined()
    expect(next.atkDebuffs['jc-1'].multiplier).toBe(0.7)
    expect(next.atkDebuffs['jc-1'].turnsLeft).toBe(2)
  })

  it('Talon Queen revives once instead of dying (Phoenix Rebirth)', () => {
    const state = createJungleBattle(makeJungleConfig({
      bird: makeBird({ id: 'talon-queen', name: 'Talon Queen', isBoss: true, scaledHP: 100, scaledATK: 5, ability: { name: 'Phoenix Rebirth', description: 'x', effect: 'revive', params: { reviveHpFraction: 0.4 } } }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 500 })], // one-shot the bird
    }))
    const rng = scriptedRng([0.5]) // d20 only; revive is not RNG
    const { state: next, events } = resolveAction(state, { type: 'PLAYER_ATTACK', attackerId: 'jc-1' }, rng)

    expect(next.outcome).toBe('ongoing')
    expect(next.bossRevived).toBe(true)
    expect(next.dog.hp).toBe(40) // floor(100 * 0.4)
    expect(events.some(e => e.type === 'Log' && e.text.includes('Phoenix Rebirth'))).toBe(true)
    expect(next.turn).toBe('enemy')
  })
})

describe('jungle engine — boon effects', () => {
  it('an ATK-boost boon raises DamageDealt to the bird by exactly the boon amount', () => {
    const cfg = (boost: number) => makeJungleConfig({
      bird: makeBird({ DEF: 0, scaledHP: 200 }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 10 })],
      boonEffects: makeBoons({ totalAtkBoost: boost }),
    })
    // single d20 draw (11); no dodge/reflect/swift-paws draws with an empty-ish boon set
    const base = resolveAction(createJungleBattle(cfg(0)), { type: 'PLAYER_ATTACK', attackerId: 'jc-1' }, scriptedRng([0.5]))
    const boosted = resolveAction(createJungleBattle(cfg(5)), { type: 'PLAYER_ATTACK', attackerId: 'jc-1' }, scriptedRng([0.5]))

    const da = base.events.find(e => e.type === 'DamageDealt' && e.targetId === 'bird') as Extract<BattleEvent, { type: 'DamageDealt' }>
    const db = boosted.events.find(e => e.type === 'DamageDealt' && e.targetId === 'bird') as Extract<BattleEvent, { type: 'DamageDealt' }>
    // base = 10 + 0 + floor(11/5)=2 => 12 ; boosted adds exactly the +5 boost
    expect(da.amount).toBe(12)
    expect(db.amount - da.amount).toBe(5)
  })

  it('Iron Fur reduces incoming bird damage by exactly the damageReduction', () => {
    const cfg = (dr: number) => makeJungleConfig({
      bird: makeBird({ id: 'jungle-sparrow', name: 'Sparrow', scaledATK: 10, scaledHP: 100, ability: { name: 'Gale', description: 'x', effect: 'aoe', params: { aoeFraction: 0.3, cooldown: 3 } } }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 5 })],
      boonEffects: makeBoons({ damageReduction: dr }),
    })
    // ability on cooldown (3), so the bird just does a plain strike. crit cat = no defense roll.
    const drive = (dr: number) => {
      let state = createJungleBattle(cfg(dr))
      state = { ...state, turn: 'enemy' }
      return resolveAction(state, { type: 'ENEMY_TURN' }, scriptedRng([0.0]))
    }
    const noFur = drive(0).events.find(e => e.type === 'DamageDealt' && e.targetId === 'jc-1') as Extract<BattleEvent, { type: 'DamageDealt' }>
    const withFur = drive(3).events.find(e => e.type === 'DamageDealt' && e.targetId === 'jc-1') as Extract<BattleEvent, { type: 'DamageDealt' }>
    expect(noFur.amount).toBe(10)
    expect(noFur.amount - withFur.amount).toBe(3)
  })
})

describe('jungle engine — win/lose flow', () => {
  it('reaches victory and emits a single BattleEnded(victory)', () => {
    const { state, events } = driveJungle(7, makeJungleConfig({
      bird: makeBird({ scaledHP: 30, scaledATK: 3 }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 40, currentHp: 80, maxHp: 80 })],
    }))
    expect(state.outcome).toBe('victory')
    const ended = events.filter(e => e.type === 'BattleEnded')
    expect(ended).toHaveLength(1)
    expect((ended[0] as Extract<BattleEvent, { type: 'BattleEnded' }>).outcome).toBe('victory')
    expect(events.some(e => e.type === 'CombatantDefeated' && e.id === 'bird')).toBe(true)
  })

  it('reaches defeat when the bird kills the last cat', () => {
    let state = createJungleBattle(makeJungleConfig({
      bird: makeBird({ id: 'jungle-sparrow', name: 'Sparrow', scaledATK: 40, scaledHP: 200, ability: { name: 'Gale', description: 'x', effect: 'aoe', params: { aoeFraction: 0.3, cooldown: 3 } } }),
      squad: [makeSquadCat({ instanceId: 'jc-1', currentAtk: 5, currentHp: 1, maxHp: 50 })],
    }))
    state = { ...state, turn: 'enemy' }
    const { state: next, events } = resolveAction(state, { type: 'ENEMY_TURN' }, scriptedRng([0.0]))
    expect(next.outcome).toBe('defeat')
    expect(events.some(e => e.type === 'BattleEnded' && e.outcome === 'defeat')).toBe(true)
    expect(next.cats[0].currentHp).toBe(0)
  })
})
