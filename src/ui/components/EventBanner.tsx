import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getActiveEvents, getEventPeriodKey } from '../../game/events'
import { useGame } from '../../game/store'
import { BAITS } from '../../game/data'
import Modal from './Modal'

export default function EventBanner() {
  const completedEventRewards = useGame(s => s.completedEventRewards)
  const claimEventReward = useGame(s => s.claimEventReward)
  const setView = useGame(s => s.setView)
  const [claimedEvent, setClaimedEvent] = useState<string | null>(null)

  const activeEvents = useMemo(() => getActiveEvents(), [])

  if (activeEvents.length === 0) return null

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 mt-2">
        {activeEvents.map(event => {
          const periodKey = getEventPeriodKey(event)
          const isCompleted = completedEventRewards.includes(periodKey)

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl bg-gradient-to-r ${event.themeGradient} border ${event.borderColor} mb-2`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{event.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{event.name}</p>
                    <p className="text-white/70 text-xs truncate">{event.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCompleted ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/30 text-emerald-300 text-xs font-bold">
                      Completed
                    </span>
                  ) : (
                    <>
                      <motion.button
                        onClick={() => setView('battle')}
                        className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Fight Boss
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          const success = claimEventReward(event)
                          if (success) setClaimedEvent(event.id)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gold-500/80 text-black text-xs font-bold hover:bg-gold-400 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Claim
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Claim success modal */}
      <AnimatePresence>
        {claimedEvent && (() => {
          const event = activeEvents.find(e => e.id === claimedEvent)
          if (!event) return null
          const bait = event.baitReward ? BAITS.find(b => b.id === event.baitReward) : null

          return (
            <Modal
              isOpen={true}
              onClose={() => setClaimedEvent(null)}
              title="Event Reward Claimed!"
              size="sm"
            >
              <div className="text-center py-4">
                <div className="text-5xl mb-3">{event.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{event.name}</h3>
                <div className="space-y-2 mb-6">
                  <p className="text-amber-400 font-bold text-lg">+{event.coinReward} Coins</p>
                  {bait && (
                    <p className="text-cyan-400 font-semibold">+1x {bait.name}</p>
                  )}
                </div>
                <motion.button
                  onClick={() => setClaimedEvent(null)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-bold rounded-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Awesome!
                </motion.button>
              </div>
            </Modal>
          )
        })()}
      </AnimatePresence>
    </>
  )
}
