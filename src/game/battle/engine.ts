import type { OwnedCat } from '../store'
import type { FrenzyElement } from '../events'
import { EQUIPMENT, STONES } from '../items'
import { resolveStoneEffect } from '../stoneResolver'
import { resolveDefense } from '../abilityResolver'
import { BIRD_ABILITY_COOLDOWN } from '../constants'
import { computeBattleRewards } from './rewards'
import type {
  BattleAction,
  BattleConfig,
  BattleEvent,
  BattleState,
  JungleBattleConfig,
  LogType,
  ResolveResult,
} from './types'

const ABILITY_COOLDOWN = 3 // Turns between active ability uses (mirrors legacy)

// ===== Pure helpers =====

/** Seeded d20 roll — mirrors game/dice.rollD20 but draws from the injected rng. */
function rollD20(rng: () => number): number {
  return Math.floor(rng() * 20) + 1
}

function cloneState(state: BattleState): BattleState {
  // All fields are plain serialisable data (no funcs/Dates), so a structural
  // clone keeps resolveAction pure without mutating the caller's state.
  return JSON.parse(JSON.stringify(state)) as BattleState
}

function equipAtk(cat: OwnedCat): number {
  return (
    ((cat.equipment?.weapon ? EQUIPMENT.find(e => e.id === cat.equipment!.weapon)?.atkBonus : 0) || 0) +
    ((cat.equipment?.accessory ? EQUIPMENT.find(e => e.id === cat.equipment!.accessory)?.atkBonus : 0) || 0)
  )
}

/** +1 ATK per living elite cat in the party (Elite Aura). */
function eliteAuraBonus(state: BattleState): number {
  return state.cats.filter(c => c.isElite && c.currentHp > 0).length
}

/** ATK after applying an active Acidmaw ATK debuff. */
function effectiveAtk(state: BattleState, cat: OwnedCat): number {
  const debuff = state.atkDebuffs[cat.instanceId]
  return debuff && debuff.turnsLeft > 0 ? Math.floor(cat.currentAttack * debuff.multiplier) : cat.currentAttack
}

// abilityResolver.resolveDefense is now RNG-injected, so the engine calls it
// directly (seeded via the battle rng) instead of keeping a private mirror.

// --- event/state mutation helpers (operate on the working clone) ---

function log(events: BattleEvent[], text: string, logType?: LogType) {
  events.push({ type: 'Log', text, logType })
}

function pushDefenseLogs(events: BattleEvent[], msgs: { text: string; type: LogType }[]) {
  msgs.forEach(m => log(events, m.text, m.type))
}

/** Apply damage to the dog, mutate hp, emit DamageDealt. */
function hitDog(
  state: BattleState,
  events: BattleEvent[],
  amount: number,
  opts: { isCrit?: boolean; source?: string; showNumber?: boolean; impact?: boolean; secondary?: boolean } = {},
) {
  state.dog.hp = Math.max(0, state.dog.hp - amount)
  events.push({
    type: 'DamageDealt',
    targetId: 'dog',
    amount,
    resultingHp: state.dog.hp,
    isCrit: !!opts.isCrit,
    source: opts.source ?? 'player',
    showNumber: opts.showNumber ?? true,
    impact: opts.impact ?? false,
    secondary: opts.secondary,
  })
}

/** Apply damage to a cat, mutate hp, emit DamageDealt (+CombatantDefeated). */
function hitCat(
  state: BattleState,
  events: BattleEvent[],
  catId: string,
  amount: number,
  opts: { isCrit?: boolean; source?: string; showNumber?: boolean; impact?: boolean } = {},
) {
  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat) return
  const prev = cat.currentHp
  cat.currentHp = Math.max(0, cat.currentHp - amount)
  events.push({
    type: 'DamageDealt',
    targetId: catId,
    amount,
    resultingHp: cat.currentHp,
    isCrit: !!opts.isCrit,
    source: opts.source ?? 'dog',
    showNumber: !!opts.showNumber,
    impact: !!opts.impact,
  })
  if (prev > 0 && cat.currentHp <= 0) events.push({ type: 'CombatantDefeated', id: catId })
}

function healCat(state: BattleState, events: BattleEvent[], catId: string, amount: number) {
  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat) return
  cat.currentHp = Math.min(cat.maxHp, cat.currentHp + amount)
  events.push({ type: 'Healed', targetId: catId, amount, resultingHp: cat.currentHp })
}

function healDog(state: BattleState, events: BattleEvent[], amount: number) {
  state.dog.hp = Math.min(state.dog.maxHealth, state.dog.hp + amount)
  events.push({ type: 'Healed', targetId: 'dog', amount, resultingHp: state.dog.hp })
}

function livingCats(state: BattleState): OwnedCat[] {
  return state.cats.filter(c => c.currentHp > 0)
}

function isAllPartyDead(state: BattleState): boolean {
  return state.cats.every(c => c.currentHp <= 0)
}

/** Deterministic array pick (mirrors arr[Math.floor(Math.random()*len)]). */
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function endVictory(state: BattleState, events: BattleEvent[]) {
  state.battleEnded = true
  state.outcome = 'victory'
  events.push({ type: 'CombatantDefeated', id: 'dog' })
  events.push({ type: 'BattleEnded', outcome: 'victory', rewards: computeBattleRewards(state.config) })
}

function endDefeat(state: BattleState, events: BattleEvent[]) {
  state.battleEnded = true
  state.outcome = 'defeat'
  events.push({ type: 'BattleEnded', outcome: 'defeat' })
}

// ===== Battle creation =====

export function createBattle(config: BattleConfig): BattleState {
  const cats = config.cats.map(c => ({ ...c }))
  const state: BattleState = {
    dog: {
      id: config.dog.id,
      name: config.dog.name,
      attack: config.dog.attack,
      maxHealth: config.dog.health,
      hp: config.dog.health,
    },
    cats,
    turn: 'player',
    battleEnded: false,
    outcome: 'ongoing',
    silenced: false,
    frozenCatId: null,
    dogDodgeChance: 0,
    dogArmor: 0,
    dotEffects: [],
    abilityCooldowns: {},
    atkDebuffs: {},
    dogReflect: 0,
    dogAbilityCooldown: 0,
    stoneActivated: {},
    rockShieldCatId: null,
    stoneBurnOnDog: null,
    stoneFreezeOnDog: false,
    config: config.rewards,
    frontierDogId: config.frontierDogId,
    eventDogId: config.eventDogId,
    enemyKind: 'dog',
    bird: null,
    boonEffects: null,
    birdAbilityCooldown: 0,
    bossRevived: false,
    turnsElapsed: 0,
    damageTaken: 0,
  }
  cats.forEach(c => {
    state.abilityCooldowns[c.instanceId] = 0
  })
  // Passive dog abilities (gated by source exactly like legacy reset effect)
  if (config.frontierDogId === 'shadow-stalker') state.dogDodgeChance = 0.3
  if (config.frontierDogId === 'crystal-guardian') state.dogArmor = 4
  if (config.frontierDogId === 'nebula-stalker') state.dogDodgeChance = 0.4
  if (config.eventDogId === 'obsidian-shade') state.dogDodgeChance = 0.2
  return state
}

// ===== Jungle battle creation (cats vs bird) =====

/**
 * Build a jungle BattleState. The bird enemy occupies the shared `dog` slot
 * (hp/attack/maxHealth), with bird-specific data in `bird`. Squad cats are
 * mapped onto the combat-cat shape the shared helpers expect. `currentAttack`
 * is the run-squad's `currentAtk` verbatim (boon ATK is re-added in the damage
 * formula, matching the legacy JungleBattle arithmetic exactly).
 */
export function createJungleBattle(config: JungleBattleConfig): BattleState {
  const { bird, squad, boonEffects } = config
  const cats: OwnedCat[] = squad.map(c => ({
    id: c.catId,
    name: c.name,
    rarity: c.rarity,
    health: c.baseMaxHp,
    attack: c.baseAtk,
    ability: c.ability,
    instanceId: c.instanceId,
    level: c.level,
    xp: 0,
    currentHp: c.currentHp,
    maxHp: c.maxHp,
    currentAttack: c.currentAtk,
    isElite: c.isElite,
    eliteTier: c.eliteTier,
    ascension: c.ascension,
    equipment: c.equipment,
    imageUrl: c.imageUrl,
  } as OwnedCat))

  const state: BattleState = {
    dog: {
      id: bird.id,
      name: bird.name,
      attack: bird.scaledATK,
      maxHealth: bird.scaledHP,
      hp: bird.scaledHP,
    },
    cats,
    turn: 'player',
    battleEnded: false,
    outcome: 'ongoing',
    silenced: false,
    frozenCatId: null,
    dogDodgeChance: 0,
    dogArmor: 0,
    dotEffects: [],
    abilityCooldowns: {},
    atkDebuffs: {},
    dogReflect: 0,
    dogAbilityCooldown: 0,
    stoneActivated: {},
    rockShieldCatId: null,
    stoneBurnOnDog: null,
    stoneFreezeOnDog: false,
    config: { battleDogIndex: 0, difficultyLevel: 0, coinMultiplier: 1, isRepeatEventBoss: false },
    frontierDogId: '',
    enemyKind: 'bird',
    bird,
    boonEffects,
    birdAbilityCooldown: bird.ability.params.cooldown ?? BIRD_ABILITY_COOLDOWN,
    bossRevived: false,
    turnsElapsed: 0,
    damageTaken: 0,
  }
  cats.forEach(c => {
    state.abilityCooldowns[c.instanceId] = 0
  })
  return state
}

// ===== Action resolution =====

export function resolveAction(state: BattleState, action: BattleAction, rng: () => number): ResolveResult {
  // No-op on a finished battle (re-entrancy guard for double-dispatch).
  if (state.outcome !== 'ongoing' || state.battleEnded) {
    return { state, events: [] }
  }

  const next = cloneState(state)
  const events: BattleEvent[] = []

  if (next.enemyKind === 'bird') {
    switch (action.type) {
      case 'PLAYER_ATTACK':
        resolveBirdPlayerAttack(next, events, action.attackerId, rng)
        break
      case 'PLAYER_ABILITY':
        resolveBirdPlayerAbility(next, events, action.attackerId)
        break
      case 'ENEMY_TURN':
        resolveBirdTurn(next, events, rng)
        break
      case 'START_PLAYER_TURN':
        resolveBirdStartPlayerTurn(next, events)
        break
      case 'PLAYER_STONE_ATTACK':
        break // no stones in jungle mode
    }
    return { state: next, events }
  }

  switch (action.type) {
    case 'PLAYER_ATTACK':
      resolvePlayerAttack(next, events, action.attackerId, rng)
      break
    case 'PLAYER_STONE_ATTACK':
      resolvePlayerStoneAttack(next, events, action.attackerId, rng)
      break
    case 'PLAYER_ABILITY':
      resolvePlayerAbility(next, events, action.attackerId)
      break
    case 'ENEMY_TURN':
      resolveEnemyTurn(next, events, rng)
      break
    case 'START_PLAYER_TURN':
      resolveStartPlayerTurn(next, events)
      break
  }

  return { state: next, events }
}

// --- Player: basic attack (mirrors handleAttack) ---

function resolvePlayerAttack(state: BattleState, events: BattleEvent[], catId: string, rng: () => number) {
  if (state.turn !== 'player') return
  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat || cat.currentHp <= 0) return

  // Frost Wolf freeze — frozen cat skips their turn
  if (state.frozenCatId === cat.instanceId) {
    log(events, `❄️ ${cat.name} is frozen and can't attack!`, 'damage')
    state.frozenCatId = null
    state.turn = 'enemy'
    return
  }

  log(events, `${cat.name} attacks!`, 'info')
  const v = rollD20(rng)
  events.push({ type: 'DiceRolled', value: v, isCrit: v === 20 })
  events.push({ type: 'Sound', name: 'diceRoll' })

  if (v === 20) {
    log(events, `🎲 NATURAL 20! ⚡ LEGENDARY STRIKE! ⚡`, 'crit')
    log(events, `✨ MAXIMUM POWER UNLEASHED! ✨`, 'crit')
  } else if (v === 1) {
    log(events, `🎲 CRITICAL FAIL! 💥 Attack MISSES! 💥`, 'damage')
    log(events, `${cat.name} stumbles and deals NO damage!`, 'damage')
    state.turn = 'enemy'
    return
  }

  const baseDmg = effectiveAtk(state, cat) + eliteAuraBonus(state) + equipAtk(cat) + Math.floor(v / 5)

  // Silence wears off after one turn
  if (state.silenced) state.silenced = false

  // Shadow / Nebula dodge
  if (state.dogDodgeChance > 0 && rng() < state.dogDodgeChance) {
    log(events, `👻 ${state.dog.name} dodges the attack!`, 'info')
    events.push({ type: 'Dodged', targetId: 'dog' })
    if (state.dog.id === 'nebula-stalker') {
      const counterDmg = Math.floor(state.dog.attack * 0.5)
      hitCat(state, events, cat.instanceId, counterDmg, { source: 'nebula-counter' })
      log(events, `🌌 Phase Counter! ${state.dog.name} strikes back for ${counterDmg}!`, 'crit')
    }
    state.turn = 'enemy'
    return
  }

  let finalDmg = baseDmg
  if (v === 20) finalDmg = Math.floor(finalDmg * 2)

  // Crystal Guardian armor
  if (state.dogArmor > 0) {
    const reduced = Math.max(1, finalDmg - state.dogArmor)
    if (reduced < baseDmg) {
      log(events, `🛡️ ${state.dog.name}'s crystal armor absorbs ${baseDmg - reduced} damage!`, 'info')
    }
    finalDmg = reduced
  }

  hitDog(state, events, finalDmg, { isCrit: v === 20, source: 'player-attack', showNumber: true, impact: true })
  log(events, `Hit for ${finalDmg} damage.`, 'damage')
  events.push({ type: 'Sound', name: 'attack' })

  if (state.dog.hp <= 0) {
    endVictory(state, events)
    return
  }

  // Decrement cooldown for the acting cat
  state.abilityCooldowns[cat.instanceId] = Math.max(0, (state.abilityCooldowns[cat.instanceId] ?? ABILITY_COOLDOWN) - 1)
  state.turn = 'enemy'
}

// --- Player: stone attack (mirrors handleStoneAttack) ---

function resolvePlayerStoneAttack(state: BattleState, events: BattleEvent[], catId: string, rng: () => number) {
  if (state.turn !== 'player') return
  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat || cat.currentHp <= 0) return
  if (!cat.equipment?.stone || state.stoneActivated[cat.instanceId]) return

  const stone = STONES.find(s => s.id === cat.equipment!.stone)
  if (!stone) return

  if (state.frozenCatId === cat.instanceId) {
    log(events, `❄️ ${cat.name} is frozen and can't attack!`, 'damage')
    state.frozenCatId = null
    state.turn = 'enemy'
    return
  }

  log(events, `💎 ${cat.name} channels ${stone.name}!`, 'crit')
  const v = rollD20(rng)
  events.push({ type: 'DiceRolled', value: v, isCrit: v === 20 })
  events.push({ type: 'Sound', name: 'diceRoll' })

  if (v === 1) {
    log(events, `🎲 CRITICAL FAIL! 💥 The stone shatters uselessly!`, 'damage')
    state.stoneActivated[cat.instanceId] = true
    events.push({ type: 'StoneConsumed', catId: cat.instanceId })
    state.turn = 'enemy'
    return
  }

  if (v === 20) {
    log(events, `🎲 NATURAL 20! ⚡ LEGENDARY STONE STRIKE! ⚡`, 'crit')
  }

  const baseDmg = cat.currentAttack + eliteAuraBonus(state) + equipAtk(cat) + Math.floor(v / 5)
  const element = stone.element as FrenzyElement
  const result = resolveStoneEffect(element, cat, baseDmg)

  result.logMessages.forEach(msg => log(events, msg.text, msg.type))

  if (result.burnApplied) {
    state.stoneBurnOnDog = { dmgPerTurn: result.burnApplied.dmgPerTurn, turnsLeft: result.burnApplied.turns }
  }
  if (result.freezeApplied) state.stoneFreezeOnDog = true
  if (result.rockShieldApplied) state.rockShieldCatId = cat.instanceId
  if (result.healAmount > 0 && result.healTargetId) {
    healCat(state, events, result.healTargetId, result.healAmount)
  }

  // Shadow / Obsidian dodge
  if (state.dogDodgeChance > 0 && rng() < state.dogDodgeChance) {
    log(events, `👻 ${state.dog.name} dodges the stone attack!`, 'info')
    events.push({ type: 'Dodged', targetId: 'dog' })
    state.stoneActivated[cat.instanceId] = true
    events.push({ type: 'StoneConsumed', catId: cat.instanceId })
    state.turn = 'enemy'
    return
  }

  let finalDmg = result.damage
  if (state.dogArmor > 0) {
    const reduced = Math.max(1, result.damage - state.dogArmor)
    if (reduced < result.damage) {
      log(events, `🛡️ ${state.dog.name}'s armor absorbs ${result.damage - reduced} damage!`, 'info')
    }
    finalDmg = reduced
  }

  hitDog(state, events, finalDmg, { isCrit: result.isCrit, source: 'stone', showNumber: true, impact: true })

  // Double strike (Lightning) — second hit
  if (result.doubleStrike && state.dog.hp > 0) {
    const secondDmg = Math.max(1, baseDmg - state.dogArmor)
    log(events, `⚡ Second strike hits for ${secondDmg}!`, 'crit')
    hitDog(state, events, secondDmg, { source: 'stone-second', showNumber: true, secondary: true })
  }

  state.stoneActivated[cat.instanceId] = true
  events.push({ type: 'StoneConsumed', catId: cat.instanceId })

  if (state.dog.hp <= 0) {
    endVictory(state, events)
    return
  }

  state.turn = 'enemy'
}

// --- Player: active ability (mirrors handleActiveAbility) ---

function resolvePlayerAbility(state: BattleState, events: BattleEvent[], catId: string) {
  if (state.turn !== 'player') return

  if (state.silenced) {
    const name = state.cats.find(c => c.instanceId === catId)?.name || 'Cat'
    log(events, `🔇 Silenced! ${name} can't use abilities!`, 'damage')
    state.silenced = false
    return
  }

  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat || cat.currentHp <= 0) return
  if ((state.abilityCooldowns[catId] ?? ABILITY_COOLDOWN) > 0) return

  const debuff = state.atkDebuffs[catId]
  const abilityEffectiveAtk =
    debuff && debuff.turnsLeft > 0 ? Math.floor(cat.currentAttack * debuff.multiplier) : cat.currentAttack
  const baseAtk = abilityEffectiveAtk + eliteAuraBonus(state) + equipAtk(cat)
  const effect = cat.ability.effect

  log(events, `✨ ${cat.name} activates ${cat.ability.name}!`, 'crit')
  events.push({ type: 'AbilityTriggered', casterId: catId, abilityName: cat.ability.name, effectType: effect })
  events.push({ type: 'Sound', name: 'abilityTrigger' })

  let dmg = 0
  if (effect === 'crit') {
    dmg = Math.floor(baseAtk * 2)
    log(events, `💥 Critical Strike deals ${dmg} damage!`, 'crit')
  } else if (effect === 'bleed') {
    dmg = baseAtk + 8
    log(events, `🔥 Burning Strike deals ${dmg} damage!`, 'crit')
  } else if (effect === 'heal') {
    const healAmt = Math.floor(cat.maxHp * 0.4)
    state.cats.forEach(c => {
      if (c.currentHp > 0) healCat(state, events, c.instanceId, healAmt)
    })
    log(events, `💚 Heals all cats for ${healAmt} HP!`, 'heal')
  } else if (effect === 'lifesteal') {
    dmg = baseAtk
    const stolen = Math.floor(dmg * 0.75)
    healCat(state, events, cat.instanceId, stolen)
    log(events, `🩸 Drains ${stolen} HP from enemy! Deals ${dmg} damage.`, 'heal')
  } else if (effect === 'stun') {
    dmg = Math.floor(baseAtk * 0.5)
    log(events, `💥 Stun Strike deals ${dmg} damage and stuns!`, 'crit')
  } else if (effect === 'shield') {
    log(events, `🛡️ Shield Wall! Party takes 50% less damage next turn.`, 'info')
  } else if (effect === 'armor') {
    dmg = baseAtk
    log(events, `🛡️ Fortified Strike deals ${dmg} damage!`, 'crit')
  } else if (effect === 'speed') {
    dmg = baseAtk
    log(events, `⚡ Lightning Strike deals ${dmg} damage! Attacks again!`, 'crit')
  }

  if (dmg > 0) {
    hitDog(state, events, dmg, { source: 'ability', showNumber: false, impact: true })
    if (state.dog.hp <= 0) {
      endVictory(state, events)
      return
    }
  }

  state.abilityCooldowns[catId] = ABILITY_COOLDOWN

  // Speed / stun: player keeps the turn
  if (effect === 'speed') return
  if (effect === 'stun') return

  state.turn = 'enemy'
}

// --- Start of player turn: DoT / debuff / stone-burn ticks ---
// Replicates the INTENDED behaviour of the three legacy [turn]-keyed useEffects,
// resolved in declaration order (DoT on cats → ATK debuff tick → stone burn on dog).

function resolveStartPlayerTurn(state: BattleState, events: BattleEvent[]) {
  if (state.turn !== 'player' || state.battleEnded) return

  // 1) Poison / burn DoT on cats
  if (state.dotEffects.length > 0) {
    state.dotEffects.forEach(dot => {
      const cat = state.cats.find(c => c.instanceId === dot.catId)
      if (cat && cat.currentHp > 0) {
        cat.currentHp = Math.max(0, cat.currentHp - dot.dmgPerTurn)
        events.push({ type: 'DotTick', targetId: dot.catId, dotType: dot.type, amount: dot.dmgPerTurn, resultingHp: cat.currentHp })
        const icon = dot.type === 'poison' ? '🟢' : '🔥'
        log(events, `${icon} ${cat.name} takes ${dot.dmgPerTurn} ${dot.type} damage!`, 'damage')
        if (cat.currentHp <= 0) events.push({ type: 'CombatantDefeated', id: dot.catId })
      }
    })
    state.dotEffects = state.dotEffects
      .map(d => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
      .filter(d => d.turnsLeft > 0)

    if (isAllPartyDead(state)) {
      endDefeat(state, events)
      return
    }
  }

  // 2) ATK debuff tick (Acidmaw)
  if (Object.keys(state.atkDebuffs).length > 0) {
    const nextDebuffs: Record<string, { multiplier: number; turnsLeft: number }> = {}
    for (const [id, debuff] of Object.entries(state.atkDebuffs)) {
      const remaining = debuff.turnsLeft - 1
      if (remaining > 0) {
        nextDebuffs[id] = { ...debuff, turnsLeft: remaining }
      } else {
        const cat = state.cats.find(c => c.instanceId === id)
        if (cat) log(events, `💪 ${cat.name}'s attack power is restored!`, 'info')
      }
    }
    state.atkDebuffs = nextDebuffs
  }

  // 3) Stone burn DoT on dog
  if (state.stoneBurnOnDog) {
    const burnDmg = state.stoneBurnOnDog.dmgPerTurn
    state.dog.hp = Math.max(0, state.dog.hp - burnDmg)
    events.push({ type: 'DotTick', targetId: 'dog', dotType: 'burn', amount: burnDmg, resultingHp: state.dog.hp })
    log(events, `🔥 Burn deals ${burnDmg} damage to ${state.dog.name}!`, 'damage')
    if (state.stoneBurnOnDog.turnsLeft <= 1) {
      log(events, `🔥 Burn on ${state.dog.name} wears off.`, 'info')
      state.stoneBurnOnDog = null
    } else {
      state.stoneBurnOnDog = { ...state.stoneBurnOnDog, turnsLeft: state.stoneBurnOnDog.turnsLeft - 1 }
    }
    if (state.dog.hp <= 0) {
      endVictory(state, events)
      return
    }
  }
}

// --- Enemy turn (mirrors handleDogTurn) ---

function resolveEnemyTurn(state: BattleState, events: BattleEvent[], rng: () => number) {
  if (state.turn !== 'enemy' || state.battleEnded || state.dog.hp <= 0) return

  const dog = state.dog

  // Stone freeze — frozen dog skips its turn
  if (state.stoneFreezeOnDog) {
    state.stoneFreezeOnDog = false
    log(events, `❄️ ${dog.name} is frozen solid! Skips turn!`, 'crit')
    state.turn = 'player'
    return
  }

  log(events, `${dog.name} attacks!`, 'info')
  const v = rollD20(rng)
  events.push({ type: 'DiceRolled', value: v, isCrit: v === 20 })
  events.push({ type: 'Sound', name: 'diceRoll' })
  const dmg = dog.attack + Math.floor(v / 6)

  const targets = livingCats(state)
  if (!targets.length) {
    endDefeat(state, events)
    return
  }

  const dogAbilityReady = state.dogAbilityCooldown <= 0

  // Eternal Overlord — Apocalypse Aura (chip all)
  if (dogAbilityReady && dog.id === 'eternal-overlord') {
    log(events, `☠️ Apocalypse Aura damages all cats!`, 'damage')
    targets.forEach(cat => hitCat(state, events, cat.instanceId, 2, { source: 'apocalypse-aura' }))
  }

  // Echo Howler — Sonic Howl (AoE, ends turn)
  if (dogAbilityReady && dog.id === 'echo-howler') {
    const aoeDmg = Math.floor(dmg * 0.5)
    log(events, `📢 Sonic Howl hits ALL cats for ${aoeDmg} damage!`, 'damage')
    targets.forEach(cat => hitCat(state, events, cat.instanceId, aoeDmg, { source: 'sonic-howl' }))
    events.push({ type: 'ScreenShake' })
    state.dogAbilityCooldown = ABILITY_COOLDOWN
    if (isAllPartyDead(state)) endDefeat(state, events)
    else state.turn = 'player'
    return
  }

  // Tentacle Paws — Multi-target (ends turn)
  if (dogAbilityReady && dog.id === 'tentacle-paws') {
    const multiDmg = Math.floor(dmg * 0.6)
    log(events, `🐙 Tentacle Grab hits all cats for ${multiDmg} each!`, 'damage')
    targets.forEach(cat => {
      const defense = resolveDefense(cat, multiDmg, state.silenced, rng)
      pushDefenseLogs(events, defense.logMessages)
      hitCat(state, events, cat.instanceId, defense.actualDamage, { source: 'tentacle' })
    })
    state.dogAbilityCooldown = ABILITY_COOLDOWN
    if (isAllPartyDead(state)) endDefeat(state, events)
    else state.turn = 'player'
    return
  }

  // Granite Colossus — Tectonic Slam (AoE + armor, ends turn)
  if (dogAbilityReady && dog.id === 'granite-colossus') {
    const aoeDmg = Math.floor(dmg * 0.4)
    log(events, `🪨 Tectonic Slam hits ALL cats for ${aoeDmg}!`, 'damage')
    targets.forEach(cat => {
      const defense = resolveDefense(cat, aoeDmg, state.silenced, rng)
      pushDefenseLogs(events, defense.logMessages)
      hitCat(state, events, cat.instanceId, defense.actualDamage, { source: 'tectonic' })
    })
    state.dogArmor = state.dogArmor + 3
    log(events, `🛡️ ${dog.name} gains 3 armor!`, 'info')
    state.dogAbilityCooldown = ABILITY_COOLDOWN
    if (isAllPartyDead(state)) endDefeat(state, events)
    else state.turn = 'player'
    return
  }

  // Infernal Cerberus — Triple Hellfire (ends turn)
  if (dogAbilityReady && dog.id === 'infernal-cerberus') {
    log(events, `🔥🔥🔥 Triple Hellfire! 3 attacks!`, 'crit')
    for (let strike = 0; strike < 3; strike++) {
      const alive = livingCats(state)
      if (!alive.length) break
      const target = pick(rng, alive)
      const strikeDmg = Math.floor(dmg * 0.6)
      const defense = resolveDefense(target, strikeDmg, state.silenced, rng)
      pushDefenseLogs(events, defense.logMessages)
      hitCat(state, events, target.instanceId, defense.actualDamage, { source: 'hellfire' })
      log(events, `🔥 Strike ${strike + 1} hits ${target.name} for ${defense.actualDamage}!`, 'damage')
    }
    state.dogAbilityCooldown = ABILITY_COOLDOWN
    if (isAllPartyDead(state)) endDefeat(state, events)
    else state.turn = 'player'
    return
  }

  const t = pick(rng, targets)

  // Rock shield — absorbs one hit completely
  if (state.rockShieldCatId === t.instanceId) {
    state.rockShieldCatId = null
    log(events, `🪨 Rock Shield absorbs the hit on ${t.name}!`, 'info')
    state.turn = 'player'
    return
  }

  // Void Walker / Void Reaver — bypass defenses
  let actualDamage: number
  if (dogAbilityReady && (dog.id === 'void-walker' || dog.id === 'void-reaver')) {
    actualDamage = dmg
    log(events, `🌀 ${dog.id === 'void-reaver' ? 'Dimensional Rift' : 'Void Strike'} bypasses ${t.name}'s defenses!`, 'crit')
  } else {
    const defense = resolveDefense(t, dmg, state.silenced, rng)
    actualDamage = defense.actualDamage
    pushDefenseLogs(events, defense.logMessages)
  }

  const tIsElite = t.isElite === true
  const tEliteTier = t.eliteTier || 0

  // Eternal Overlord — Damage Reflect
  if (dogAbilityReady && dog.id === 'eternal-overlord') {
    const reflectDmg = Math.floor(actualDamage * 0.2)
    if (reflectDmg > 0) {
      log(events, `🔄 Apocalypse Aura reflects ${reflectDmg} damage!`, 'damage')
      hitCat(state, events, t.instanceId, reflectDmg, { source: 'reflect' })
    }
  }

  // Star Barks dynamic reflect
  if (state.dogReflect > 0) {
    const reflDmg = Math.floor(actualDamage * state.dogReflect)
    if (reflDmg > 0) {
      log(events, `🔄 Reflected ${reflDmg} damage back to ${t.name}!`, 'damage')
      hitCat(state, events, t.instanceId, reflDmg, { source: 'reflect' })
    }
    state.dogReflect = 0
  }

  // Main hit (with Stellar Resilience for elites) — this one shows a damage number
  {
    const target = state.cats.find(c => c.instanceId === t.instanceId)!
    const prev = target.currentHp
    let newHp = Math.max(0, target.currentHp - actualDamage)
    if (newHp <= 0 && tIsElite) {
      const surviveChance = tEliteTier >= 2 ? 0.25 : 0.15
      if (rng() < surviveChance) {
        newHp = 1
        log(events, `✨ ${t.name}'s Stellar Resilience triggers! Survives with 1 HP!`, 'heal')
      }
    }
    target.currentHp = newHp
    events.push({
      type: 'DamageDealt',
      targetId: t.instanceId,
      amount: actualDamage,
      resultingHp: newHp,
      isCrit: false,
      source: 'dog-attack',
      showNumber: true,
    })
    if (prev > 0 && newHp <= 0) events.push({ type: 'CombatantDefeated', id: t.instanceId })
  }

  log(events, `${dog.name} hits ${t.name} for ${actualDamage}!`, 'damage')

  if (dogAbilityReady) {
    resolveDogAbilityEffects(state, events, dog, t, dmg, actualDamage, rng)
  }

  // Cooldown management
  if (dogAbilityReady) state.dogAbilityCooldown = ABILITY_COOLDOWN
  else state.dogAbilityCooldown = state.dogAbilityCooldown - 1

  if (isAllPartyDead(state)) endDefeat(state, events)
  else state.turn = 'player'
}

/**
 * Post-hit dog ability effects (poison/burn/freeze/chain/heal/chaos/etc).
 * `t` is the primary target snapshot at selection time; live HP reads use state.
 */
function resolveDogAbilityEffects(
  state: BattleState,
  events: BattleEvent[],
  dog: BattleState['dog'],
  t: OwnedCat,
  dmg: number,
  actualDamage: number,
  rng: () => number,
) {
  const targets = livingCats(state) // recomputed post-hit, mirrors legacy `targets` reuse where noted

  // NOTE: legacy reused the pre-hit `targets` snapshot for freeze/chain picks and
  // AoE loops. We recompute here but the sets are equivalent for these effects
  // because they either target `t` explicitly or iterate living cats.

  if (dog.id === 'slime-hound') {
    log(events, `🟢 Toxic Bite poisons ${t.name}!`, 'damage')
    state.dotEffects = [
      ...state.dotEffects.filter(d => !(d.catId === t.instanceId && d.type === 'poison')),
      { catId: t.instanceId, turnsLeft: 3, dmgPerTurn: 2, type: 'poison' },
    ]
    events.push({ type: 'DotApplied', targetId: t.instanceId, dotType: 'poison', dmgPerTurn: 2, turns: 3 })
  }

  if (dog.id === 'magma-beast') {
    log(events, `🔥 Lava Burst ignites ${t.name}!`, 'damage')
    state.dotEffects = [
      ...state.dotEffects.filter(d => !(d.catId === t.instanceId && d.type === 'burn')),
      { catId: t.instanceId, turnsLeft: 3, dmgPerTurn: 3, type: 'burn' },
    ]
    events.push({ type: 'DotApplied', targetId: t.instanceId, dotType: 'burn', dmgPerTurn: 3, turns: 3 })
  }

  if (dog.id === 'ember-drake') {
    log(events, `🔥 Inferno Breath burns ${t.name}!`, 'damage')
    state.dotEffects = [
      ...state.dotEffects.filter(d => !(d.catId === t.instanceId && d.type === 'burn')),
      { catId: t.instanceId, turnsLeft: 2, dmgPerTurn: 4, type: 'burn' },
    ]
    events.push({ type: 'DotApplied', targetId: t.instanceId, dotType: 'burn', dmgPerTurn: 4, turns: 2 })
  }

  if (dog.id === 'frost-wolf') {
    const freezeTarget = pick(rng, targets)
    state.frozenCatId = freezeTarget.instanceId
    log(events, `❄️ Ice Breath freezes ${freezeTarget.name}! They'll skip next turn!`, 'crit')
  }

  if (dog.id === 'glacial-howler') {
    const freezeTarget = pick(rng, targets)
    state.frozenCatId = freezeTarget.instanceId
    log(events, `❄️ Permafrost Howl freezes ${freezeTarget.name}! They'll skip next turn!`, 'crit')
  }

  if (dog.id === 'thunder-hound') {
    const otherTargets = targets.filter(c => c.instanceId !== t.instanceId && c.currentHp > 0)
    if (otherTargets.length > 0) {
      const chainTarget = pick(rng, otherTargets)
      const chainDmg = Math.floor(actualDamage * 0.5)
      hitCat(state, events, chainTarget.instanceId, chainDmg, { source: 'chain' })
      log(events, `⚡ Lightning chains to ${chainTarget.name} for ${chainDmg}!`, 'damage')
    }
  }

  if (dog.id === 'voltfang-warden') {
    const otherTargets = targets.filter(c => c.instanceId !== t.instanceId && c.currentHp > 0)
    if (otherTargets.length > 0) {
      const chainTarget = pick(rng, otherTargets)
      const chainDmg = Math.floor(actualDamage * 0.6)
      hitCat(state, events, chainTarget.instanceId, chainDmg, { source: 'chain' })
      log(events, `⚡ Chain Lightning arcs to ${chainTarget.name} for ${chainDmg}!`, 'damage')
    }
  }

  if (dog.id === 'chaos-demon') {
    const chaosRoll = rng()
    if (chaosRoll < 0.25) {
      const chaosHeal = Math.floor(dog.maxHealth * 0.1)
      healDog(state, events, chaosHeal)
      log(events, `🎭 Chaotic Energy heals ${dog.name} for ${chaosHeal}!`, 'heal')
    } else if (chaosRoll < 0.5) {
      const chaosDmg = Math.floor(dmg * 0.3)
      log(events, `🎭 Chaotic Energy damages all cats for ${chaosDmg}!`, 'damage')
      targets.forEach(cat => hitCat(state, events, cat.instanceId, chaosDmg, { source: 'chaos' }))
    } else if (chaosRoll < 0.75) {
      state.silenced = true
      log(events, `🎭 Chaotic Energy silences cat abilities!`, 'crit')
    } else {
      const bonusDmg = Math.floor(dmg * 0.5)
      hitCat(state, events, t.instanceId, bonusDmg, { source: 'chaos' })
      log(events, `🎭 Chaotic Energy deals ${bonusDmg} bonus damage to ${t.name}!`, 'damage')
    }
  }

  if (dog.id === 'void-emperor') {
    const voidHeal = Math.floor(actualDamage * 0.3)
    healDog(state, events, voidHeal)
    log(events, `🌑 Reality Tear heals ${dog.name} for ${voidHeal} HP!`, 'heal')
  }

  if (dog.id === 'abyssal-devourer') {
    const healAmount = Math.floor(actualDamage * 0.25)
    healDog(state, events, healAmount)
    log(events, `💀 Soul Drain heals ${dog.name} for ${healAmount} HP!`, 'heal')
  }

  if (dog.id === 'obsidian-shade') {
    const siphonHeal = Math.floor(actualDamage * 0.3)
    healDog(state, events, siphonHeal)
    log(events, `🌑 Soul Siphon heals ${dog.name} for ${siphonHeal} HP!`, 'heal')
  }

  if (dog.id === 'omega-fenrir') {
    state.silenced = true
    log(events, `🐺 Ragnarok Howl! Cat abilities silenced next turn!`, 'crit')
  }

  if (dog.id === 'xenospore-hound') {
    const alive = livingCats(state)
    alive.forEach(cat => {
      state.dotEffects = [...state.dotEffects, { catId: cat.instanceId, turnsLeft: 2, dmgPerTurn: 2, type: 'poison' }]
      events.push({ type: 'DotApplied', targetId: cat.instanceId, dotType: 'poison', dmgPerTurn: 2, turns: 2 })
    })
    log(events, `🟢 Toxic Spores! All cats are poisoned! (2 dmg/turn for 2 turns)`, 'crit')
  }

  if (dog.id === 'acidmaw-ravager') {
    state.atkDebuffs = { ...state.atkDebuffs, [t.instanceId]: { multiplier: 0.8, turnsLeft: 2 } }
    log(events, `🧪 Corrosive Bite! ${t.name}'s attack reduced by 20% for 2 turns!`, 'crit')
  }

  if (dog.id === 'hiveling-alpha') {
    for (let s = 0; s < 3; s++) {
      const alive = livingCats(state)
      const swarmTarget = pick(rng, alive)
      if (swarmTarget && swarmTarget.currentHp > 0) {
        const swarmDmg = Math.floor(dmg * 0.4)
        const defense = resolveDefense(swarmTarget, swarmDmg, state.silenced, rng)
        pushDefenseLogs(events, defense.logMessages)
        hitCat(state, events, swarmTarget.instanceId, defense.actualDamage, { source: 'swarm' })
        log(events, `🐝 Swarm hit ${swarmTarget.name} for ${defense.actualDamage}!`, 'damage')
      }
    }
  }

  if (dog.id === 'nebula-stalker') {
    state.dogDodgeChance = 0.4
    log(events, `🌌 Phase Shift! Nebula Stalker phases in and out of reality! (40% dodge + counter)`, 'crit')
  }

  if (dog.id === 'parasyte-warden') {
    const alive = livingCats(state)
    if (alive.length > 1) {
      const hijacked = alive.find(c => c.instanceId === t.instanceId) || alive[0]
      const allies = alive.filter(c => c.instanceId !== hijacked.instanceId)
      const victim = pick(rng, allies)
      if (victim) {
        const hijackDmg = Math.floor(hijacked.currentAttack * 0.3)
        hitCat(state, events, victim.instanceId, hijackDmg, { source: 'hijack' })
        log(events, `🧠 Neural Hijack! ${hijacked.name} attacks ${victim.name} for ${hijackDmg}!`, 'crit')
      }
    }
  }

  if (dog.id === 'plasmic-behemoth') {
    const alive = livingCats(state)
    const aoeDmg = Math.floor(dmg * 0.5)
    alive.forEach(cat => {
      if (cat.instanceId !== t.instanceId) {
        const defense = resolveDefense(cat, aoeDmg, state.silenced, rng)
        pushDefenseLogs(events, defense.logMessages)
        hitCat(state, events, cat.instanceId, defense.actualDamage, { source: 'plasma' })
      }
    })
    log(events, `💥 Plasma Barrage hits all cats!`, 'crit')
    const burnTarget = pick(rng, alive)
    if (burnTarget) {
      state.dotEffects = [...state.dotEffects, { catId: burnTarget.instanceId, turnsLeft: 2, dmgPerTurn: 4, type: 'burn' }]
      events.push({ type: 'DotApplied', targetId: burnTarget.instanceId, dotType: 'burn', dmgPerTurn: 4, turns: 2 })
      log(events, `🔥 ${burnTarget.name} is burning! (4 dmg/turn for 2 turns)`, 'damage')
    }
  }

  if (dog.id === 'void-reaver') {
    const riftHeal = Math.floor(actualDamage * 0.3)
    healDog(state, events, riftHeal)
    log(events, `🕳️ Dimensional Rift! Ignores defenses and drains ${riftHeal} HP!`, 'crit')
  }

  if (dog.id === 'the-assimilator') {
    const effect = t.ability.effect
    if (effect === 'heal') {
      const assimHeal = Math.floor(dog.maxHealth * 0.15)
      healDog(state, events, assimHeal)
      log(events, `🧬 Genetic Override copies ${t.ability.name}! ${dog.name} heals ${assimHeal} HP!`, 'crit')
    } else if (effect === 'bleed') {
      state.dotEffects = [...state.dotEffects, { catId: t.instanceId, turnsLeft: 3, dmgPerTurn: 3, type: 'burn' }]
      events.push({ type: 'DotApplied', targetId: t.instanceId, dotType: 'burn', dmgPerTurn: 3, turns: 3 })
      log(events, `🧬 Genetic Override copies ${t.ability.name}! ${t.name} is burning!`, 'crit')
    } else if (effect === 'stun') {
      state.frozenCatId = t.instanceId
      log(events, `🧬 Genetic Override copies ${t.ability.name}! ${t.name} is stunned!`, 'crit')
    } else {
      const bonusDmg = Math.floor(dmg * 0.3)
      hitCat(state, events, t.instanceId, bonusDmg, { source: 'assimilate' })
      log(events, `🧬 Genetic Override copies ${t.ability.name}! Deals ${bonusDmg} bonus damage!`, 'crit')
    }
    state.dogReflect = 0.25
    log(events, `🛡️ Genetic Override: 25% damage will be reflected!`, 'info')
  }

  if (dog.id === 'cosmic-queen') {
    const effects = ['silence', 'aoe', 'burn', 'lifesteal', 'reflect']
    const picked: string[] = []
    while (picked.length < 2) {
      const e = pick(rng, effects)
      if (!picked.includes(e)) picked.push(e)
    }
    picked.forEach(e => {
      if (e === 'silence') {
        state.silenced = true
        log(events, `👽 Extinction Protocol: Silence! Cat abilities blocked!`, 'crit')
      } else if (e === 'aoe') {
        const alive = livingCats(state)
        const aoeDmg = Math.floor(dmg * 0.4)
        alive.forEach(cat => {
          if (cat.instanceId !== t.instanceId) hitCat(state, events, cat.instanceId, aoeDmg, { source: 'extinction' })
        })
        log(events, `👽 Extinction Protocol: AOE blast hits all cats for ${aoeDmg}!`, 'crit')
      } else if (e === 'burn') {
        state.dotEffects = [...state.dotEffects, { catId: t.instanceId, turnsLeft: 2, dmgPerTurn: 4, type: 'burn' }]
        events.push({ type: 'DotApplied', targetId: t.instanceId, dotType: 'burn', dmgPerTurn: 4, turns: 2 })
        log(events, `👽 Extinction Protocol: ${t.name} is scorched! (4 dmg/turn)`, 'crit')
      } else if (e === 'lifesteal') {
        const lsHeal = Math.floor(actualDamage * 0.3)
        healDog(state, events, lsHeal)
        log(events, `👽 Extinction Protocol: Drains ${lsHeal} HP!`, 'crit')
      } else if (e === 'reflect') {
        state.dogReflect = 0.25
        log(events, `👽 Extinction Protocol: Cosmic shield active! 25% damage reflected next turn!`, 'crit')
      }
    })
  }
}

// =====================================================================
// ===== Jungle combat (cats vs bird) =====
// A faithful port of the legacy JungleBattle.tsx inline loop + the pure
// resolvers in birdAbilityResolver.ts, sharing the primitives above.
// The bird occupies the shared `dog` slot; bird-only data lives in state.bird.
// Damage arithmetic re-adds boonEffects.totalAtkBoost on top of the squad's
// already-boosted currentAttack, matching the legacy view byte-for-byte.
// =====================================================================

/** Bird HP hit — mutates the shared enemy slot, emits DamageDealt(targetId 'bird'). */
function hitBird(
  state: BattleState,
  events: BattleEvent[],
  amount: number,
  opts: { isCrit?: boolean; source?: string; showNumber?: boolean; impact?: boolean } = {},
) {
  state.dog.hp = Math.max(0, state.dog.hp - amount)
  events.push({
    type: 'DamageDealt',
    targetId: 'bird',
    amount,
    resultingHp: state.dog.hp,
    isCrit: !!opts.isCrit,
    source: opts.source ?? 'player',
    showNumber: opts.showNumber ?? true,
    impact: opts.impact ?? false,
  })
}

function healBird(state: BattleState, events: BattleEvent[], amount: number) {
  state.dog.hp = Math.min(state.dog.maxHealth, state.dog.hp + amount)
  events.push({ type: 'Healed', targetId: 'bird', amount, resultingHp: state.dog.hp })
}

/** rawAtk (currentAttack + boon ATK + equip) with an active ATK debuff applied — jungle order. */
function jungleEffectiveAtk(state: BattleState, cat: OwnedCat): number {
  const be = state.boonEffects!
  const rawAtk = cat.currentAttack + be.totalAtkBoost + equipAtk(cat)
  const debuff = state.atkDebuffs[cat.instanceId]
  return debuff && debuff.turnsLeft > 0 ? Math.floor(rawAtk * debuff.multiplier) : rawAtk
}

function endBirdVictory(state: BattleState, events: BattleEvent[]) {
  state.battleEnded = true
  state.outcome = 'victory'
  events.push({ type: 'CombatantDefeated', id: 'bird' })
  events.push({ type: 'BattleEnded', outcome: 'victory' })
}

function endBirdDefeat(state: BattleState, events: BattleEvent[]) {
  state.battleEnded = true
  state.outcome = 'defeat'
  events.push({ type: 'BattleEnded', outcome: 'defeat' })
}

/**
 * The bird has reached 0 HP. Talon Queen revives once (Phoenix Rebirth); any
 * other bird is truly defeated. Mirrors JungleBattle.handleBirdDefeated +
 * checkBirdRevive.
 */
function onBirdReachedZero(state: BattleState, events: BattleEvent[]) {
  if (state.battleEnded) return
  const bird = state.bird!
  if (!state.bossRevived && bird.ability.effect === 'revive') {
    const fraction = bird.ability.params.reviveHpFraction ?? 0.4
    const reviveHp = Math.floor(bird.scaledHP * fraction)
    state.dog.hp = reviveHp
    state.bossRevived = true
    log(events, `${bird.name} revives with ${reviveHp} HP! Phoenix Rebirth!`, 'crit')
    events.push({ type: 'Sound', name: 'abilityTrigger' })
    state.turn = 'enemy'
    return
  }
  endBirdVictory(state, events)
}

/** Damage dealt TO a bird: DEF reduction, dodge (Shadow Swift), reflect (Mirror Macaw). */
function resolveBirdDefenseInline(
  state: BattleState,
  incomingDamage: number,
  attackerName: string,
  rng: () => number,
): { actualDamage: number; reflectDamage: number; dodged: boolean; logMessages: { text: string; type: LogType }[] } {
  const bird = state.bird!
  const effect = bird.ability.effect
  const params = bird.ability.params
  const logMessages: { text: string; type: LogType }[] = []

  let actualDamage = Math.max(1, incomingDamage - bird.DEF)
  if (bird.DEF > 0 && incomingDamage > bird.DEF) {
    logMessages.push({ text: `${bird.name}'s armor absorbs ${bird.DEF} damage`, type: 'info' })
  }

  if (effect === 'dodge') {
    const dodgeChance = params.dodgeChance ?? 0.3
    if (rng() < dodgeChance) {
      logMessages.push({ text: `${bird.name} dodges ${attackerName}'s attack!`, type: 'info' })
      return { actualDamage: 0, reflectDamage: 0, dodged: true, logMessages }
    }
  }

  let reflectDamage = 0
  if (effect === 'reflect') {
    const fraction = params.reflectFraction ?? 0.2
    reflectDamage = Math.floor(actualDamage * fraction)
    if (reflectDamage > 0) {
      logMessages.push({ text: `${bird.name}'s plumage reflects ${reflectDamage} damage back to ${attackerName}!`, type: 'damage' })
    }
  }

  return { actualDamage, reflectDamage, dodged: false, logMessages }
}

// --- Jungle player: basic attack (mirrors JungleBattle.handleAttack) ---

function resolveBirdPlayerAttack(state: BattleState, events: BattleEvent[], catId: string, rng: () => number) {
  if (state.turn !== 'player') return
  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat || cat.currentHp <= 0) return
  const be = state.boonEffects!
  const bird = state.bird!

  log(events, `${cat.name} attacks!`, 'info')
  const v = rollD20(rng)
  events.push({ type: 'DiceRolled', value: v, isCrit: v === 20 })

  if (v === 20) {
    log(events, `NATURAL 20! LEGENDARY STRIKE!`, 'crit')
  } else if (v === 1) {
    log(events, `CRITICAL FAIL! Attack MISSES!`, 'damage')
    log(events, `${cat.name} stumbles and deals NO damage!`, 'damage')
    state.turn = 'enemy'
    return
  }

  const baseDmg = jungleEffectiveAtk(state, cat) + eliteAuraBonus(state) + Math.floor(v / 5)
  let dmgToBird = baseDmg
  if (v === 20) dmgToBird = Math.floor(dmgToBird * 2)

  // Executioner boon — bonus damage when the bird is below the HP threshold
  if (be.executeThreshold > 0 && state.dog.hp > 0) {
    const hpRatio = state.dog.hp / bird.scaledHP
    if (hpRatio < be.executeThreshold) {
      dmgToBird += be.executeBonusDamage
      log(events, `Executioner! +${be.executeBonusDamage} bonus damage!`, 'crit')
    }
  }

  if (state.silenced) state.silenced = false

  const def = resolveBirdDefenseInline(state, dmgToBird, cat.name, rng)
  pushDefenseLogs(events, def.logMessages)
  if (def.dodged) {
    log(events, `${bird.name} evades the attack!`, 'info')
    events.push({ type: 'Dodged', targetId: 'bird' })
    state.turn = 'enemy'
    return
  }

  const finalDmg = def.actualDamage
  hitBird(state, events, finalDmg, { source: 'player-attack', showNumber: true, impact: true })
  log(events, `Hit for ${finalDmg} damage!`, 'damage')
  events.push({ type: 'Sound', name: 'attack' })

  // Bird reflect (Mirror Macaw) → damage back to the attacking cat
  if (def.reflectDamage > 0) {
    hitCat(state, events, cat.instanceId, def.reflectDamage, { source: 'bird-reflect' })
    state.damageTaken += def.reflectDamage
  }

  // Vampiric Fangs boon — lifesteal
  if (be.lifestealFraction > 0 && finalDmg > 0) {
    const heal = Math.floor(finalDmg * be.lifestealFraction)
    if (heal > 0 && cat.currentHp > 0) {
      healCat(state, events, cat.instanceId, heal)
      log(events, `Vampiric Fangs: ${cat.name} heals ${heal} HP!`, 'heal')
    }
  }

  // Poison Claws boon — apply poison DoT to the bird
  if (be.poisonDot && finalDmg > 0) {
    const existing = state.dotEffects.find(d => d.catId === 'bird' && d.type === 'poison')
    if (!existing) {
      state.dotEffects = [
        ...state.dotEffects,
        { catId: 'bird', turnsLeft: be.poisonDot.turns, dmgPerTurn: be.poisonDot.damage, type: 'poison' },
      ]
      log(events, `Poison Claws! ${bird.name} is poisoned for ${be.poisonDot.damage} dmg/turn!`, 'damage')
    }
  }

  if (state.dog.hp <= 0) {
    onBirdReachedZero(state, events)
    return
  }

  // Swift Paws boon — chance to keep the turn for a bonus attack
  if (be.bonusAttackChance > 0 && rng() < be.bonusAttackChance) {
    log(events, `Swift Paws! ${cat.name} gets a bonus attack!`, 'crit')
    state.abilityCooldowns[cat.instanceId] = Math.max(0, (state.abilityCooldowns[cat.instanceId] ?? ABILITY_COOLDOWN) - 1)
    return
  }

  state.abilityCooldowns[cat.instanceId] = Math.max(0, (state.abilityCooldowns[cat.instanceId] ?? ABILITY_COOLDOWN) - 1)
  state.turn = 'enemy'
}

// --- Jungle player: active ability (mirrors JungleBattle.handleActiveAbility) ---

function resolveBirdPlayerAbility(state: BattleState, events: BattleEvent[], catId: string) {
  if (state.turn !== 'player') return

  if (state.silenced) {
    const name = state.cats.find(c => c.instanceId === catId)?.name || 'Cat'
    log(events, `Silenced! ${name} can't use abilities!`, 'damage')
    state.silenced = false
    return
  }

  const cat = state.cats.find(c => c.instanceId === catId)
  if (!cat || cat.currentHp <= 0) return
  if ((state.abilityCooldowns[catId] ?? ABILITY_COOLDOWN) > 0) return

  const baseAtk = jungleEffectiveAtk(state, cat) + eliteAuraBonus(state)
  const effect = cat.ability.effect

  log(events, `${cat.name} activates ${cat.ability.name}!`, 'crit')
  events.push({ type: 'Sound', name: 'abilityTrigger' })

  let dmg = 0
  if (effect === 'crit') {
    dmg = Math.floor(baseAtk * 2)
    log(events, `Critical Strike deals ${dmg} damage!`, 'crit')
  } else if (effect === 'bleed') {
    dmg = baseAtk + 8
    log(events, `Burning Strike deals ${dmg} damage!`, 'crit')
  } else if (effect === 'heal') {
    const healAmt = Math.floor(cat.maxHp * 0.4)
    state.cats.forEach(c => {
      if (c.currentHp > 0) healCat(state, events, c.instanceId, healAmt)
    })
    log(events, `Heals all cats for ${healAmt} HP!`, 'heal')
  } else if (effect === 'lifesteal') {
    dmg = baseAtk
    const stolen = Math.floor(dmg * 0.75)
    healCat(state, events, catId, stolen)
    log(events, `Drains ${stolen} HP from enemy! Deals ${dmg} damage.`, 'heal')
  } else if (effect === 'stun') {
    dmg = Math.floor(baseAtk * 0.5)
    log(events, `Stun Strike deals ${dmg} damage and stuns!`, 'crit')
  } else if (effect === 'shield') {
    log(events, `Shield Wall! Party takes reduced damage next turn.`, 'info')
  } else if (effect === 'armor') {
    dmg = baseAtk
    log(events, `Fortified Strike deals ${dmg} damage!`, 'crit')
  } else if (effect === 'speed') {
    dmg = baseAtk
    log(events, `Lightning Strike deals ${dmg} damage! Attacks again!`, 'crit')
  }

  if (dmg > 0) {
    // Abilities bypass bird defenses (matches JungleBattle + BattleArena)
    hitBird(state, events, dmg, { source: 'ability', showNumber: false, impact: true })
    if (state.dog.hp <= 0) {
      onBirdReachedZero(state, events)
      return
    }
  }

  state.abilityCooldowns[catId] = ABILITY_COOLDOWN

  if (effect === 'speed') return
  if (effect === 'stun') {
    state.turnsElapsed += 1
    return
  }

  state.turn = 'enemy'
}

// --- Jungle start-of-player-turn: DoT ticks (cats + bird) then ATK-debuff tick ---

function resolveBirdStartPlayerTurn(state: BattleState, events: BattleEvent[]) {
  if (state.turn !== 'player' || state.battleEnded) return

  // 1) Damage-over-time ticks. Cat DoTs first, then bird DoTs (poison-claws boon).
  if (state.dotEffects.length > 0) {
    const catDots = state.dotEffects.filter(d => d.catId !== 'bird')
    const birdDots = state.dotEffects.filter(d => d.catId === 'bird')

    catDots.forEach(dot => {
      const cat = state.cats.find(c => c.instanceId === dot.catId)
      if (cat && cat.currentHp > 0) {
        const dmg = dot.dmgPerTurn
        cat.currentHp = Math.max(0, cat.currentHp - dmg)
        events.push({ type: 'DotTick', targetId: dot.catId, dotType: dot.type, amount: dmg, resultingHp: cat.currentHp })
        if (dmg > 0) state.damageTaken += dmg
        const icon = dot.type === 'poison' ? '(poison)' : '(burn)'
        log(events, `${icon} ${cat.name} takes ${dmg} ${dot.type} damage!`, 'damage')
        if (cat.currentHp <= 0) events.push({ type: 'CombatantDefeated', id: dot.catId })
      }
    })

    for (const dot of birdDots) {
      if (state.dog.hp > 0) {
        state.dog.hp = Math.max(0, state.dog.hp - dot.dmgPerTurn)
        events.push({ type: 'DotTick', targetId: 'bird', dotType: 'poison', amount: dot.dmgPerTurn, resultingHp: state.dog.hp })
        log(events, `(poison) ${state.bird!.name} takes ${dot.dmgPerTurn} poison damage!`, 'damage')
        if (state.dog.hp <= 0) onBirdReachedZero(state, events)
      }
    }

    // Decrement and expire (single pass across cat + bird DoTs)
    state.dotEffects = state.dotEffects
      .map(d => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
      .filter(d => d.turnsLeft > 0)

    // Bird DoT ended the fight (victory) — stop here.
    if (state.battleEnded) return

    if (isAllPartyDead(state)) {
      endBirdDefeat(state, events)
      return
    }
  }

  // 2) ATK-debuff tick-down (Screech Owl / Dusk Parakeet)
  if (Object.keys(state.atkDebuffs).length > 0) {
    const nextDebuffs: Record<string, { multiplier: number; turnsLeft: number }> = {}
    for (const [id, debuff] of Object.entries(state.atkDebuffs)) {
      const remaining = debuff.turnsLeft - 1
      if (remaining > 0) {
        nextDebuffs[id] = { ...debuff, turnsLeft: remaining }
      } else {
        const cat = state.cats.find(c => c.instanceId === id)
        if (cat) log(events, `${cat.name}'s attack power is restored!`, 'info')
      }
    }
    state.atkDebuffs = nextDebuffs
  }
}

// --- Jungle enemy (bird) turn (mirrors JungleBattle.handleBirdTurn + resolveBirdOffense) ---

function resolveBirdTurn(state: BattleState, events: BattleEvent[], rng: () => number) {
  if (state.turn !== 'enemy' || state.battleEnded || state.dog.hp <= 0) return
  const bird = state.bird!
  const be = state.boonEffects!

  // Silence applied THIS turn must not affect cat defense rolls this same turn
  // (legacy used a stale `silenced` closure) — capture the pre-turn value.
  const silencedAtStart = state.silenced

  log(events, `${bird.name} attacks!`, 'info')

  const aliveCats = livingCats(state)
  if (aliveCats.length === 0) {
    endBirdDefeat(state, events)
    return
  }

  // ----- resolveBirdOffense (inlined) -----
  const abilityReady = state.birdAbilityCooldown <= 0
  const effect = bird.ability.effect
  const params = bird.ability.params

  // Enrage (Apex Raptor)
  let isEnraged = false
  let effectiveATK = bird.scaledATK
  let attackCount = 1
  if (effect === 'enrage') {
    const threshold = params.enrageThreshold ?? 0.3
    const multiplier = params.enrageMultiplier ?? 1.5
    isEnraged = state.dog.hp / bird.scaledHP < threshold
    if (isEnraged) {
      effectiveATK = Math.floor(bird.scaledATK * multiplier)
      attackCount = 2
    }
  }

  // Primary target: bosses focus the lowest-HP cat; others pick at random.
  let primaryTargetId: string
  if (bird.isBoss) {
    primaryTargetId = aliveCats.reduce((a, b) => (a.currentHp < b.currentHp ? a : b)).instanceId
  } else {
    primaryTargetId = aliveCats[Math.floor(rng() * aliveCats.length)].instanceId
  }

  if (isEnraged) {
    log(events, `${bird.name} is enraged! ATK increased and attacks ${attackCount} times!`, 'crit')
  }

  let aoeDamage = 0
  let birdHealAmount = 0
  let silenceApplied = false
  let atkDebuff: { multiplier: number; turns: number } | null = null
  let dotApplied: { catInstanceId: string; damage: number; turns: number; type: 'poison' | 'burn' } | null = null

  if (abilityReady) {
    const primary = state.cats.find(c => c.instanceId === primaryTargetId)!
    switch (effect) {
      case 'aoe': {
        const fraction = params.aoeFraction ?? 0.3
        aoeDamage = Math.floor(effectiveATK * fraction)
        log(events, `${bird.name} uses ${bird.ability.name}! Hits all cats for ${aoeDamage} damage!`, 'damage')
        if (bird.id === 'storm-condor') {
          silenceApplied = true
          log(events, `The tempest silences all cat abilities for 1 turn!`, 'info')
        }
        break
      }
      case 'dot_poison': {
        dotApplied = { catInstanceId: primaryTargetId, damage: params.dotDamage ?? 3, turns: params.dotTurns ?? 2, type: 'poison' }
        log(events, `${bird.name} poisons ${primary.name} for ${params.dotDamage} dmg/turn!`, 'damage')
        break
      }
      case 'dot_burn': {
        dotApplied = { catInstanceId: primaryTargetId, damage: params.dotDamage ?? 4, turns: params.dotTurns ?? 3, type: 'burn' }
        log(events, `${bird.name} burns ${primary.name} for ${params.dotDamage} dmg/turn!`, 'damage')
        break
      }
      case 'debuff_atk': {
        atkDebuff = { multiplier: params.debuffMultiplier ?? 0.7, turns: params.debuffTurns ?? 2 }
        const reduction = Math.round((1 - (params.debuffMultiplier ?? 0.7)) * 100)
        log(events, `${bird.name} screeches! All cat ATK reduced by ${reduction}% for ${params.debuffTurns} turns!`, 'info')
        break
      }
      case 'silence': {
        silenceApplied = true
        log(events, `${bird.name}'s shriek silences all cat abilities for 1 turn!`, 'info')
        break
      }
      case 'heal_self': {
        birdHealAmount = Math.floor(bird.scaledHP * (params.healFraction ?? 0.15))
        log(events, `${bird.name} heals for ${birdHealAmount} HP!`, 'heal')
        break
      }
      default:
        break
    }
  }
  // ----- end offense resolution -----

  if (birdHealAmount > 0) healBird(state, events, birdHealAmount)
  if (silenceApplied) state.silenced = true
  if (atkDebuff) {
    livingCats(state).forEach(c => {
      state.atkDebuffs[c.instanceId] = { multiplier: atkDebuff!.multiplier, turnsLeft: atkDebuff!.turns }
    })
  }
  if (dotApplied) {
    state.dotEffects = [
      ...state.dotEffects.filter(d => !(d.catId === dotApplied!.catInstanceId && d.type === dotApplied!.type)),
      { catId: dotApplied.catInstanceId, turnsLeft: dotApplied.turns, dmgPerTurn: dotApplied.damage, type: dotApplied.type },
    ]
    events.push({ type: 'DotApplied', targetId: dotApplied.catInstanceId, dotType: dotApplied.type, dmgPerTurn: dotApplied.damage, turns: dotApplied.turns })
  }

  // Attack strikes (enraged birds strike twice)
  for (let strike = 0; strike < attackCount; strike++) {
    const aliveNow = livingCats(state)
    if (aliveNow.length === 0) break

    const target =
      strike === 0
        ? aliveNow.find(c => c.instanceId === primaryTargetId) ?? aliveNow[0]
        : aliveNow[Math.floor(rng() * aliveNow.length)]

    let incomingDmg = effectiveATK
    if (be.damageReduction > 0) incomingDmg = Math.max(1, incomingDmg - be.damageReduction)

    const catDef = resolveDefense(target, incomingDmg, silencedAtStart, rng)
    pushDefenseLogs(events, catDef.logMessages)
    const actualDmg = catDef.actualDamage

    const prev = target.currentHp
    let newHp = Math.max(0, target.currentHp - actualDmg)
    if (newHp <= 0 && target.isElite) {
      const surviveChance = (target.eliteTier ?? 0) >= 2 ? 0.25 : 0.15
      if (rng() < surviveChance) {
        newHp = 1
        log(events, `${target.name}'s Stellar Resilience triggers! Survives with 1 HP!`, 'heal')
      }
    }
    target.currentHp = newHp
    state.damageTaken += actualDmg

    events.push({ type: 'Sound', name: 'birdAttack' })
    if (strike > 0) log(events, `Enraged strike ${strike + 1} hits ${target.name} for ${actualDmg}!`, 'damage')
    else log(events, `${bird.name} hits ${target.name} for ${actualDmg}!`, 'damage')

    // Thorn Coat boon — reflect a fraction back to the bird
    if (be.thornsFraction > 0 && actualDmg > 0) {
      const thornsDmg = Math.floor(actualDmg * be.thornsFraction)
      if (thornsDmg > 0) {
        state.dog.hp = Math.max(0, state.dog.hp - thornsDmg)
        log(events, `Thorn Coat reflects ${thornsDmg} damage to ${bird.name}!`, 'damage')
        events.push({ type: 'DamageDealt', targetId: 'bird', amount: thornsDmg, resultingHp: state.dog.hp, isCrit: false, source: 'thorns', showNumber: false, impact: false })
        if (state.dog.hp <= 0) {
          onBirdReachedZero(state, events)
          return
        }
      }
    }

    events.push({ type: 'DamageDealt', targetId: target.instanceId, amount: actualDmg, resultingHp: newHp, isCrit: false, source: 'bird-attack', showNumber: true, impact: false })
    if (prev > 0 && newHp <= 0) events.push({ type: 'CombatantDefeated', id: target.instanceId })
    if (newHp <= 0) log(events, `${target.name} is knocked out!`, 'damage')
  }

  // Separate AoE damage (no floating numbers, hits every living cat)
  if (aoeDamage > 0) {
    livingCats(state).forEach(c => {
      let dmg = aoeDamage
      if (be.damageReduction > 0) dmg = Math.max(1, dmg - be.damageReduction)
      const prev = c.currentHp
      c.currentHp = Math.max(0, c.currentHp - dmg)
      state.damageTaken += dmg
      events.push({ type: 'DamageDealt', targetId: c.instanceId, amount: dmg, resultingHp: c.currentHp, isCrit: false, source: 'bird-aoe', showNumber: false, impact: false })
      if (prev > 0 && c.currentHp <= 0) events.push({ type: 'CombatantDefeated', id: c.instanceId })
      if (c.currentHp <= 0) log(events, `${c.name} is knocked out by AoE!`, 'damage')
    })
  }

  // Bird ability cooldown management
  if (state.birdAbilityCooldown <= 0) {
    state.birdAbilityCooldown = bird.ability.params.cooldown ?? BIRD_ABILITY_COOLDOWN
  } else {
    state.birdAbilityCooldown = state.birdAbilityCooldown - 1
  }

  state.turnsElapsed += 1

  if (isAllPartyDead(state)) endBirdDefeat(state, events)
  else state.turn = 'player'
}
