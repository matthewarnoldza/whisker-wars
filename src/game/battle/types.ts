import type { OwnedCat } from '../store'
import type { BirdAbility } from '../birds'
import type { BoonEffects } from '../boons'
import type { JungleSquadCat } from '../jungleRun'

// ===== Shared vocab =====

export type LogType = 'damage' | 'heal' | 'crit' | 'info'
export type BattleSound = 'diceRoll' | 'attack' | 'abilityTrigger' | 'birdAttack'
export type BattleOutcome = 'ongoing' | 'victory' | 'defeat'

/** Which family of enemy this battle is against — selects the resolution path. */
export type EnemyKind = 'dog' | 'bird'

/** The enemy dog, snapshotted for combat. `hp` is the live value; `maxHealth` the ceiling. */
export interface DogSnapshot {
  id: string
  name: string
  attack: number
  maxHealth: number
  hp: number
}

export interface DotEffect {
  catId: string
  turnsLeft: number
  dmgPerTurn: number
  type: string // 'poison' | 'burn'
}

export interface AtkDebuff {
  multiplier: number
  turnsLeft: number
}

/** Static per-battle configuration used for reward computation. */
export interface BattleRewardConfig {
  battleDogIndex: number
  difficultyLevel: number
  coinMultiplier: number
  isRepeatEventBoss: boolean
}

export interface BattleRewards {
  coins: number
  xp: number
}

/** Everything needed to spin up a battle. Framework-free, no store/DOM refs. */
export interface BattleConfig {
  dog: { id: string; name: string; attack: number; health: number }
  cats: OwnedCat[]
  /** id of DOGS[battleDogIndex] — used to gate frontier passive dog abilities. */
  frontierDogId: string
  /** id of the active event dog (if this is an event battle) — gates event passives. */
  eventDogId?: string
  rewards: BattleRewardConfig
}

/** The jungle enemy (a scaled bird), snapshotted for combat. */
export interface BirdSnapshot {
  id: string
  name: string
  DEF: number
  isBoss: boolean
  ability: BirdAbility
  /** Ceiling for scaling-relative maths (enrage/revive/heal fractions). */
  scaledHP: number
  scaledATK: number
}

/** Config to spin up a jungle (cats-vs-bird) battle. Framework-free. */
export interface JungleBattleConfig {
  bird: BirdSnapshot
  /** The run squad. Mapped into combat cats internally. */
  squad: JungleSquadCat[]
  /** Aggregated boon modifiers applied throughout the fight. */
  boonEffects: BoonEffects
}

/**
 * The complete deterministic combat state. Cats carry a live `currentHp`;
 * every field mirrors a piece of state the legacy BattleArena tracked inline.
 */
export interface BattleState {
  dog: DogSnapshot
  cats: OwnedCat[]
  turn: 'player' | 'enemy'
  battleEnded: boolean
  outcome: BattleOutcome
  // status / effect tracks
  silenced: boolean
  frozenCatId: string | null
  dogDodgeChance: number
  dogArmor: number
  dotEffects: DotEffect[]
  abilityCooldowns: Record<string, number>
  atkDebuffs: Record<string, AtkDebuff>
  dogReflect: number
  dogAbilityCooldown: number
  stoneActivated: Record<string, boolean>
  rockShieldCatId: string | null
  stoneBurnOnDog: { dmgPerTurn: number; turnsLeft: number } | null
  stoneFreezeOnDog: boolean
  // reward config
  config: BattleRewardConfig
  // passive-source gating (kept so we can reason about behaviour if needed)
  frontierDogId: string
  eventDogId?: string
  // ===== Jungle (cats-vs-bird) extension =====
  /** Which resolution path to take. Base dog battles use 'dog'. */
  enemyKind: EnemyKind
  /** Bird combat data when enemyKind === 'bird' (else null). HP lives in `dog`. */
  bird: BirdSnapshot | null
  /** Aggregated boon modifiers for jungle mode (else null). */
  boonEffects: BoonEffects | null
  /** Bird active-ability cooldown (jungle only). */
  birdAbilityCooldown: number
  /** Whether the boss has already used its one-shot revive (Talon Queen). */
  bossRevived: boolean
  /** Bird turns taken this battle (jungle scoring — turnsElapsed). */
  turnsElapsed: number
  /** Total damage the party has taken this battle (jungle flawless check). */
  damageTaken: number
}

// ===== Actions (intents only — never roll results) =====

export type BattleAction =
  | { type: 'PLAYER_ATTACK'; attackerId: string }
  | { type: 'PLAYER_STONE_ATTACK'; attackerId: string }
  | { type: 'PLAYER_ABILITY'; attackerId: string }
  | { type: 'ENEMY_TURN' }
  | { type: 'START_PLAYER_TURN' } // process DoT / debuff / stone-burn ticks

// ===== Events (granular, animatable playback vocabulary) =====

export type BattleEvent =
  | { type: 'Log'; text: string; logType?: LogType }
  | { type: 'DiceRolled'; value: number; isCrit: boolean }
  | { type: 'Sound'; name: BattleSound }
  | {
      type: 'DamageDealt'
      targetId: string // 'dog' or a cat instanceId
      amount: number
      /** target's HP after this hit (authoritative — drives the HP bar) */
      resultingHp: number
      isCrit: boolean
      source: string
      /** show a floating damage number */
      showNumber?: boolean
      /** trigger screen shake + hit particles */
      impact?: boolean
      /** secondary hit (offset the damage number) */
      secondary?: boolean
    }
  | { type: 'Dodged'; targetId: string }
  | { type: 'AbilityTriggered'; casterId: string; abilityName: string; effectType: string }
  | { type: 'DotApplied'; targetId: string; dotType: string; dmgPerTurn: number; turns: number }
  | { type: 'DotTick'; targetId: string; dotType: string; amount: number; resultingHp: number }
  | { type: 'Healed'; targetId: string; amount: number; resultingHp: number }
  | { type: 'ScreenShake' }
  /** The cat's equipped elemental stone was spent — view must persist via store.consumeStone. */
  | { type: 'StoneConsumed'; catId: string }
  | { type: 'CombatantDefeated'; id: string }
  | { type: 'BattleEnded'; outcome: 'victory' | 'defeat'; rewards?: BattleRewards }

export interface ResolveResult {
  state: BattleState
  events: BattleEvent[]
}
