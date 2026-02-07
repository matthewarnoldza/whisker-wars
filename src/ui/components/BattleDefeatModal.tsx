import Modal from './Modal'
import type { GameStats } from '../../game/store'

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
      title="💀 DEFEAT"
      size="sm"
    >
      <div className="text-center py-6">
        <div className="text-6xl mb-4">😿</div>
        <h3 className="text-2xl font-bold text-red-400 mb-2">All cats defeated!</h3>
        <p className="text-slate-300 mb-6">
          Your party has fallen in battle. Visit Collection to heal your cats for 20 coins!
        </p>

        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="text-sm text-slate-400 mb-2">Battle Statistics</div>
          <div className="flex justify-around">
            <div>
              <div className="text-2xl font-bold text-gold-400">{stats.totalWins}</div>
              <div className="text-xs text-slate-500">WINS</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-400">{stats.totalBattles}</div>
              <div className="text-xs text-slate-500">BATTLES</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.totalBattles - stats.totalWins}</div>
              <div className="text-xs text-slate-500">LOSSES</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onGoToCollection}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-glow-purple hover:shadow-premium-lg transition-all hover:scale-105"
          >
            📚 Collection
          </button>
          <button
            onClick={onGoToBait}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-premium-lg transition-all hover:scale-105"
          >
            🎣 Baiting Area
          </button>
        </div>
      </div>
    </Modal>
  )
}
