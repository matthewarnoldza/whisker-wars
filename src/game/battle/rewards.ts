import {
  BATTLE_BASE_COINS,
  BATTLE_COINS_PER_DOG,
  BATTLE_BASE_XP,
  BATTLE_XP_PER_DOG,
  getDifficultyMultiplier,
} from '../constants'
import type { BattleRewardConfig, BattleRewards } from './types'

/**
 * Pure victory-reward computation, extracted verbatim from the legacy
 * BattleArena.handleVictory (coins/XP formula). Equipment/stone drops remain
 * in the view layer because they are RNG + store-coupled (addEquipment,
 * frenzy streak, achievements, save) rather than combat outcomes.
 */
export function computeBattleRewards(cfg: BattleRewardConfig): BattleRewards {
  const difficultyMultiplier = getDifficultyMultiplier(cfg.difficultyLevel)
  const repeatPenalty = cfg.isRepeatEventBoss ? 0.1 : 1.0
  const xp = Math.floor(
    (BATTLE_BASE_XP + cfg.battleDogIndex * BATTLE_XP_PER_DOG) * difficultyMultiplier * repeatPenalty,
  )
  const coins = Math.floor(
    (BATTLE_BASE_COINS + cfg.battleDogIndex * BATTLE_COINS_PER_DOG) *
      difficultyMultiplier *
      cfg.coinMultiplier *
      repeatPenalty,
  )
  return { coins, xp }
}
