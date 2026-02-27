import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../game/store'
import { createYocoCheckout } from '../../utils/yocoCheckout'

interface JunglePurchaseModalProps {
  onClose: () => void
  onUnlocked: () => void
  initialState?: PurchaseState
}

type PurchaseState = 'preview' | 'loading' | 'confirming' | 'success'

const FEATURES = [
  { title: '20 Stages', description: 'Roguelike challenge with scaling difficulty' },
  { title: '11 Enemies', description: 'Unique bird opponents with special abilities' },
  { title: '12 Boons', description: 'Stackable power-ups across Common, Rare, and Legendary tiers' },
  { title: 'Boss Battles', description: 'Face the Talon Queen and Apex Raptor' },
  { title: 'Exclusive Rewards', description: 'Cosmetics and achievements only from the jungle' },
]

// Simple emerald particle effect for success state
function EmeraldParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 60,
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 2,
    size: 3 + Math.random() * 5,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: '60%', x: `${p.x}%`, opacity: 1, scale: 0 }}
          animate={{ y: '-20%', opacity: 0, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          className="absolute bg-emerald-400 rounded-full"
          style={{ width: p.size, height: p.size }}
        />
      ))}
    </div>
  )
}

export default function JunglePurchaseModal({ onClose, onUnlocked, initialState = 'preview' }: JunglePurchaseModalProps) {
  const [state, setState] = useState<PurchaseState>(initialState)
  const [error, setError] = useState<string | null>(null)
  const setJunglePassPending = useGame(s => s.setJunglePassPending)

  const handlePurchaseClick = async () => {
    setState('loading')
    setError(null)
    setJunglePassPending(true)

    const profile = useGame.getState().getCurrentProfile()
    if (!profile) {
      setError('No profile found. Please create a profile first.')
      setState('preview')
      setJunglePassPending(false)
      return
    }

    const result = await createYocoCheckout(profile.id, profile.cloudCode)

    if (result.success && result.redirectUrl) {
      // Save checkout context before leaving the page
      sessionStorage.setItem('yoco-checkout-id', result.checkoutId || '')
      // Redirect to Yoco's hosted payment page
      window.location.href = result.redirectUrl
    } else {
      setError(result.error || 'Something went wrong. Please try again.')
      setState('preview')
      setJunglePassPending(false)
    }
  }

  const handleEnterJungle = () => {
    onUnlocked()
  }

  // Transition to success when jungle pass gets unlocked (called from parent via polling)
  const junglePassUnlocked = useGame(s => s.junglePassUnlocked)
  if (state === 'confirming' && junglePassUnlocked) {
    setState('success')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={state === 'preview' ? onClose : undefined}
        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-lg flex items-center justify-center touch-none overflow-hidden p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-emerald-950 border border-emerald-500/20 p-5 shadow-[0_0_60px_rgba(16,185,129,0.1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== PREVIEW STATE ===== */}
          {state === 'preview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Hero Section */}
              <div className="relative rounded-xl overflow-hidden mb-5 bg-gradient-to-br from-emerald-900/80 to-[#022c22]">
                <div className="py-8 flex items-center justify-center">
                  <div className="text-center">
                    <h2
                      className="text-3xl font-black text-emerald-400 tracking-wider"
                      style={{ textShadow: '0 0 30px rgba(52,211,153,0.5)' }}
                    >
                      Jungle of Talons
                    </h2>
                    <p className="text-emerald-200/50 text-sm mt-2">A new roguelike challenge awaits</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-900/40 border border-red-500/30 rounded-xl text-center"
                >
                  <p className="text-red-300 text-sm font-bold">{error}</p>
                </motion.div>
              )}

              {/* Feature Cards */}
              <div className="space-y-2 mb-5">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-start gap-3 bg-emerald-900/50 border border-emerald-500/10 rounded-xl px-4 py-3"
                  >
                    <div className="mt-0.5 text-emerald-400 shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-slate-100 text-sm font-black">{feature.title}</h4>
                      <p className="text-emerald-200/50 text-xs">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Price + CTA */}
              <div className="text-center mb-4">
                <div className="text-3xl font-black text-slate-100 mb-1">R120</div>
                <p className="text-emerald-200/40 text-xs mb-4">One-time purchase</p>
                <motion.button
                  onClick={handlePurchaseClick}
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-black text-lg rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] transition-all"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Unlock Jungle of Talons
                </motion.button>
              </div>

              {/* Payment Badges + Close */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-xs text-emerald-200/30 font-bold">Visa</span>
                <span className="text-[10px] text-emerald-200/15">|</span>
                <span className="text-xs text-emerald-200/30 font-bold">Mastercard</span>
                <span className="text-[10px] text-emerald-200/15">|</span>
                <span className="text-xs text-emerald-200/30 font-bold">SnapScan</span>
              </div>
              <button
                onClick={onClose}
                className="w-full text-center text-slate-500 hover:text-slate-300 text-xs py-1 transition-colors font-bold"
              >
                Close
              </button>
            </motion.div>
          )}

          {/* ===== LOADING STATE ===== */}
          {state === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full mx-auto mb-6"
              />
              <p className="text-slate-100 font-bold text-lg">Preparing secure checkout...</p>
              <p className="text-emerald-200/40 text-sm mt-2">You'll be redirected to complete payment</p>
            </motion.div>
          )}

          {/* ===== CONFIRMING STATE ===== */}
          {state === 'confirming' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full mx-auto mb-6"
              />
              <p className="text-slate-100 font-bold text-lg">Payment received!</p>
              <p className="text-emerald-200/50 text-sm mt-2">Confirming your purchase...</p>
            </motion.div>
          )}

          {/* ===== SUCCESS STATE ===== */}
          {state === 'success' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 relative"
            >
              <EmeraldParticles />

              {/* Crown Icon */}
              <motion.div
                initial={{ y: -60, opacity: 0, scale: 0.3 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 120, delay: 0.2 }}
                className="mb-4"
              >
                <svg className="w-16 h-16 text-amber-400 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                </svg>
              </motion.div>

              {/* UNLOCKED Text */}
              <motion.h2
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 100, delay: 0.4 }}
                className="text-5xl font-black text-emerald-400 tracking-wider mb-2"
                style={{ textShadow: '0 0 40px rgba(52,211,153,0.6)' }}
              >
                UNLOCKED!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-emerald-200/60 text-sm mb-8"
              >
                Jungle of Talons is now yours
              </motion.p>

              {/* Enter the Jungle CTA */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.button
                  onClick={handleEnterJungle}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-black text-lg rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.4)] transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Enter the Jungle
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
