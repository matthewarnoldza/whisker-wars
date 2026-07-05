import Modal from './Modal'
import type { GameStats } from '../../game/store'
import { Button, Panel } from './ui'
import { SadCatIcon, BookIcon, FishingRodIcon } from '../icons'

interface BattleDefeatModalProps {
  isOpen: boolean
  stats: GameStats
  onGoToCollection: () => void
  onGoToBait: () => void
}

export default function BattleDefeatModal({
  isOpen,
  stats,
  onGoToCollection,
  onGoToBait,
}: BattleDefeatModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onGoToCollection}
      title="Defeat"
      size="sm"
    >
      <div className="text-center py-6">
        {/* Sombre — no gold glow, no bounce. */}
        <SadCatIcon className="mx-auto mb-4 text-ink-subtle" size={64} />
        <h3 className="font-heading text-2xl font-black text-danger-400 mb-2">All cats defeated!</h3>
        <p className="text-ink-muted mb-6">
          Your party has fallen in battle. Visit Collection to heal your cats for 20 coins!
        </p>

        <Panel elevation="flat" className="mb-6">
          <div className="text-sm text-ink-subtle mb-2 font-heading font-bold uppercase tracking-wide">Battle Statistics</div>
          <div className="flex justify-around">
            <div>
              <div className="text-2xl font-black text-accent-300 tabular-nums">{stats.totalWins}</div>
              <div className="text-xs text-ink-faint uppercase tracking-wide">Wins</div>
            </div>
            <div>
              <div className="text-2xl font-black text-ink-muted tabular-nums">{stats.totalBattles}</div>
              <div className="text-xs text-ink-faint uppercase tracking-wide">Battles</div>
            </div>
            <div>
              <div className="text-2xl font-black text-danger-400 tabular-nums">{stats.totalBattles - stats.totalWins}</div>
              <div className="text-xs text-ink-faint uppercase tracking-wide">Losses</div>
            </div>
          </div>
        </Panel>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onGoToCollection}>
            <BookIcon size={18} />
            Collection
          </Button>
          <Button variant="secondary" onClick={onGoToBait}>
            <FishingRodIcon size={18} />
            Baiting Area
          </Button>
        </div>
      </div>
    </Modal>
  )
}
