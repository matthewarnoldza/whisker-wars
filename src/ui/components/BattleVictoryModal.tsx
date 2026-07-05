import Modal from './Modal'
import type { Dog } from '../../game/data'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { Button, Panel, cx } from './ui'
import { TrophyIcon, CoinIcon, XPIcon, GiftIcon, GemIcon, ArrowRightIcon } from '../icons'

interface VictoryRewards {
  coins: number
  xp: number
  equipDrop?: string
  stoneDrop?: string
}

interface BattleVictoryModalProps {
  isOpen: boolean
  dog: Dog
  rewards: VictoryRewards
  isFrontierBattle: boolean
  onNextBattle: () => void
  onChooseBattle: () => void
}

export default function BattleVictoryModal({
  isOpen,
  dog,
  rewards,
  isFrontierBattle,
  onNextBattle,
  onChooseBattle,
}: BattleVictoryModalProps) {
  const reduce = useMotionSafe()
  return (
    <Modal
      isOpen={isOpen}
      onClose={isFrontierBattle ? onNextBattle : onChooseBattle}
      title="Victory!"
      size="sm"
    >
      <div className="text-center py-6">
        <TrophyIcon
          className={cx('mx-auto mb-4 text-accent-300 [filter:drop-shadow(0_0_18px_rgba(245,183,10,0.55))]', !reduce && 'animate-bounce')}
          size={64}
        />
        <h3 className="font-heading text-2xl font-black text-accent-300 mb-2">Epic Victory!</h3>
        <p className="text-ink-muted mb-6">
          You have defeated {dog.name}! Your cats grow stronger!
        </p>

        <Panel accent className="mb-6 text-left">
          <div className="text-xs text-ink-subtle mb-4 uppercase tracking-wider font-heading font-bold text-center">Rewards Earned</div>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <CoinIcon className="text-accent-300" size={40} />
              <div className="text-left">
                <div className="text-3xl font-black text-accent-300 tabular-nums">+{rewards.coins}</div>
                <div className="text-xs text-ink-faint uppercase tracking-wide">Coins</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <XPIcon className="text-arcane-300" size={40} />
              <div className="text-left">
                <div className="text-3xl font-black text-arcane-300 tabular-nums">+{rewards.xp}</div>
                <div className="text-xs text-ink-faint uppercase tracking-wide">Experience</div>
              </div>
            </div>
            {rewards.equipDrop && (
              <div className="flex items-center justify-center gap-3 pt-2 border-t border-surface-border mt-2">
                <GiftIcon className="text-arcane-300" size={40} />
                <div className="text-left">
                  <div className="text-lg font-black text-arcane-300">{rewards.equipDrop}</div>
                  <div className="text-xs text-ink-faint uppercase tracking-wide">Equipment Drop</div>
                </div>
              </div>
            )}
            {rewards.stoneDrop && (
              <div className="flex items-center justify-center gap-3 pt-2 border-t border-surface-border mt-2">
                <GemIcon className="text-success-400" size={40} />
                <div className="text-left">
                  <div className="text-lg font-black text-success-400">{rewards.stoneDrop}</div>
                  <div className="text-xs text-ink-faint uppercase tracking-wide">Elemental Stone</div>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {isFrontierBattle ? (
          <Button variant="primary" size="lg" fullWidth onClick={onNextBattle}>
            Continue to Next Battle
            <ArrowRightIcon size={18} />
          </Button>
        ) : (
          <Button variant="secondary" size="lg" fullWidth onClick={onChooseBattle}>
            Choose Next Battle
          </Button>
        )}
      </div>
    </Modal>
  )
}
