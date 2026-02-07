import Modal from './Modal'
import type { Dog } from '../../game/data'

interface VictoryRewards {
  coins: number
  xp: number
  equipDrop?: string
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={isFrontierBattle ? onNextBattle : onChooseBattle}
      title="🎉 VICTORY!"
      size="sm"
    >
      <div className="text-center py-6">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h3 className="text-2xl font-bold text-gold-400 mb-2">Epic Victory!</h3>
        <p className="text-slate-300 mb-6">
          You have defeated {dog.name}! Your cats grow stronger!
        </p>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6 border border-gold-500/30">
          <div className="text-sm text-slate-400 mb-4 uppercase tracking-wider">Rewards Earned</div>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">💰</span>
              <div>
                <div className="text-3xl font-black text-gold-400">+{rewards.coins}</div>
                <div className="text-xs text-slate-500">COINS</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">⭐</span>
              <div>
                <div className="text-3xl font-black text-cyan-400">+{rewards.xp}</div>
                <div className="text-xs text-slate-500">EXPERIENCE</div>
              </div>
            </div>
            {rewards.equipDrop && (
              <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-700/50 mt-2">
                <span className="text-4xl">🎁</span>
                <div>
                  <div className="text-lg font-black text-purple-400">{rewards.equipDrop}</div>
                  <div className="text-xs text-slate-500">EQUIPMENT DROP</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isFrontierBattle ? (
          <button
            onClick={onNextBattle}
            className="w-full px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black text-lg rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all hover:scale-105 active:scale-95"
          >
            Continue to Next Battle →
          </button>
        ) : (
          <button
            onClick={onChooseBattle}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-lg rounded-xl shadow-lg hover:shadow-premium-lg transition-all hover:scale-105 active:scale-95"
          >
            Choose Next Battle
          </button>
        )}
      </div>
    </Modal>
  )
}
