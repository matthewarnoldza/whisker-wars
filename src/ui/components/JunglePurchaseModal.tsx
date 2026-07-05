import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../game/store'
import { createYocoCheckout } from '../../utils/yocoCheckout'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { CheckIcon, CrownIcon } from '../icons'

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
  const reduce = useMotionSafe()
  // Escape mirrors the backdrop: only dismissable from the preview state,
  // never mid-payment. Flow/Yoco wiring below is untouched.
  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({
    onClose: state === 'preview' ? onClose : undefined,
  })

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

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={state === 'preview' ? onClose : undefined}
        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-lg flex items-center justify-center touch-none overflow-hidden p-4"
      >
        <motion.div
          ref={dialogRef}
          {...dialogProps}
          aria-label="Jungle of Talons"
          initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 22, stiffness: 220 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-emerald-950 border border-emerald-500/20 p-4 shadow-[0_0_60px_rgba(16,185,129,0.1)] focus:outline-none"
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
              <div className="relative rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-emerald-900/80 to-[#022c22]">
                <div className="py-5 flex items-center justify-center">
                  <div className="text-center">
                    <h2
                      className="font-heading text-2xl font-black uppercase text-emerald-400 tracking-wider"
                      style={{ textShadow: '0 0 30px rgba(52,211,153,0.5)' }}
                    >
                      Jungle of Talons
                    </h2>
                    <p className="text-emerald-200/50 text-xs mt-1.5">A new roguelike challenge awaits</p>
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
              <div className="space-y-1.5 mb-3 text-left">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-center gap-2.5 bg-emerald-900/50 border border-emerald-500/10 rounded-lg px-3 py-2"
                  >
                    <CheckIcon className="text-emerald-400 shrink-0" size={14} />
                    <div>
                      <h4 className="text-ink text-xs font-black">{feature.title}</h4>
                      <p className="text-emerald-200/50 text-[11px] leading-tight">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Price + CTA */}
              <div className="text-center mb-3">
                <div className="text-2xl font-black text-ink mb-0.5 tabular-nums">R65</div>
                <p className="text-emerald-200/40 text-[11px] mb-3">One-time purchase</p>
                <motion.button
                  onClick={handlePurchaseClick}
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-heading font-black uppercase tracking-wide text-base rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] transition-all focus:outline-none focus-visible:shadow-focus-gold"
                  whileHover={reduce ? undefined : { scale: 1.03 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                >
                  Unlock Jungle of Talons
                </motion.button>
              </div>

              {/* Payment Badges + Close */}
              <div className="flex items-center justify-center gap-3 mb-1">
                <span className="text-xs text-emerald-200/30 font-bold">Visa</span>
                <span className="text-[10px] text-emerald-200/15">|</span>
                <span className="text-xs text-emerald-200/30 font-bold">Mastercard</span>
                <span className="text-[10px] text-emerald-200/15">|</span>
                <span className="text-xs text-emerald-200/30 font-bold">SnapScan</span>
              </div>
              <button
                onClick={onClose}
                className="w-full text-center text-ink-faint hover:text-ink-muted text-xs py-1 transition-colors font-bold focus:outline-none focus-visible:text-ink"
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
              className="text-center py-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full mx-auto mb-4"
              />
              <p className="text-ink font-bold text-base">Preparing secure checkout...</p>
              <p className="text-emerald-200/40 text-sm mt-1.5">You'll be redirected to complete payment</p>
            </motion.div>
          )}

          {/* ===== CONFIRMING STATE ===== */}
          {state === 'confirming' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full mx-auto mb-4"
              />
              <p className="text-ink font-bold text-base">Payment received!</p>
              <p className="text-emerald-200/50 text-sm mt-1.5">Confirming your purchase...</p>
            </motion.div>
          )}

          {/* ===== SUCCESS STATE ===== */}
          {state === 'success' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 relative"
            >
              {!reduce && <EmeraldParticles />}

              {/* Crown Icon */}
              <motion.div
                initial={reduce ? false : { y: -60, opacity: 0, scale: 0.3 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 12, stiffness: 120, delay: 0.2 }}
                className="mb-3"
              >
                <CrownIcon className="text-amber-400 mx-auto" size={48} />
              </motion.div>

              {/* UNLOCKED Text */}
              <motion.h2
                initial={reduce ? false : { scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 14, stiffness: 100, delay: 0.4 }}
                className="font-heading text-4xl font-black uppercase text-emerald-400 tracking-wider mb-1.5"
                style={{ textShadow: '0 0 40px rgba(52,211,153,0.6)' }}
              >
                Unlocked!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-emerald-200/60 text-sm mb-6"
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
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-heading font-black uppercase tracking-wide text-base rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.4)] transition-all focus:outline-none focus-visible:shadow-focus-gold"
                  whileHover={reduce ? undefined : { scale: 1.05 }}
                  whileTap={reduce ? undefined : { scale: 0.95 }}
                >
                  Enter the Jungle
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
