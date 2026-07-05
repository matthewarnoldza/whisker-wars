import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { StarIcon, BirdIcon, SparkleIcon, SwordsIcon, GiftIcon } from '../icons'

interface JungleAnnouncementModalProps {
  onExplore: () => void
  onDismiss: () => void
}

const FEATURES = [
  { Icon: StarIcon, text: '20 Stages of roguelike challenge' },
  { Icon: BirdIcon, text: '11 unique bird enemies' },
  { Icon: SparkleIcon, text: 'Boon system with 12 power-ups' },
  { Icon: SwordsIcon, text: 'Epic boss battles' },
  { Icon: GiftIcon, text: 'Exclusive cosmetic rewards' },
]

export default function JungleAnnouncementModal({ onExplore, onDismiss }: JungleAnnouncementModalProps) {
  const reduce = useMotionSafe()
  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({ onClose: onDismiss })
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-[110] bg-[#022c22]/95 backdrop-blur-lg flex items-center justify-center touch-none overflow-hidden p-4"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>

        <motion.div
          ref={dialogRef}
          {...dialogProps}
          aria-labelledby="jungle-announce-title"
          initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0, y: 30 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 20, stiffness: 180 }}
          className="relative w-full max-w-md focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* NEW EXPANSION Badge */}
          <motion.div
            initial={reduce ? false : { y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.15 }}
            className="flex justify-center mb-4"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">
              New Expansion
            </span>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={reduce ? false : { y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.25 }}
            className="text-center mb-8"
          >
            <h1
              id="jungle-announce-title"
              className="font-heading text-4xl sm:text-5xl font-black uppercase text-emerald-400 tracking-wider leading-tight"
              style={{ textShadow: '0 0 40px rgba(52,211,153,0.5)' }}
            >
              Jungle of
              <br />
              Talons
            </h1>
          </motion.div>

          {/* Feature List */}
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.35 }}
            className="space-y-3 mb-8"
          >
            {FEATURES.map((feature, index) => {
              const { Icon } = feature
              return (
                <motion.div
                  key={index}
                  initial={reduce ? false : { x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={reduce ? { duration: 0.15 } : { delay: 0.4 + index * 0.1, type: 'spring', damping: 20, stiffness: 200 }}
                  className="flex items-center gap-3 bg-emerald-900/50 border border-emerald-500/15 rounded-xl px-4 py-3"
                >
                  <Icon className="text-emerald-400 shrink-0" size={20} />
                  <span className="text-ink text-sm font-bold">{feature.text}</span>
                </motion.div>
              )
            })}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={reduce ? false : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.9 }}
            className="space-y-3"
          >
            <motion.button
              onClick={onExplore}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-heading font-black uppercase tracking-wide text-lg rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] transition-all focus:outline-none focus-visible:shadow-focus-gold"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
            >
              Explore Now
            </motion.button>
            <button
              onClick={onDismiss}
              className="w-full text-center text-ink-faint hover:text-ink-muted text-sm py-2 transition-colors font-bold focus:outline-none focus-visible:text-ink"
            >
              Maybe Later
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
