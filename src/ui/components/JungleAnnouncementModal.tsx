import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface JungleAnnouncementModalProps {
  onExplore: () => void
  onDismiss: () => void
}

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    text: '20 Stages of roguelike challenge',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.5 2a5.5 5.5 0 00-2.07 10.6C3.23 13.65 1 16.12 1 19.1V21h6v-2H3c.06-2.42 2.28-4.4 5.01-4.49.27.03.51.05.75.05A5.5 5.5 0 008.5 2zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM18 8l-2.8 1.4L12 8l1.4 2.8L12 13.6l3.2-1.4L18 13.6l-1.4-2.8L18 8z" />
      </svg>
    ),
    text: '11 unique bird enemies',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    text: 'Boon system with 12 power-ups',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.92 5H5l9 9 1-.94m4.96 6.06l-.84.84a.996.996 0 01-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.66 2.68 3.12 3.12c.36.36.36.94 0 1.35z" />
      </svg>
    ),
    text: 'Epic boss battles',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z" />
      </svg>
    ),
    text: 'Exclusive cosmetic rewards',
  },
]

export default function JungleAnnouncementModal({ onExplore, onDismiss }: JungleAnnouncementModalProps) {
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
          initial={{ scale: 0.6, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 180 }}
          className="relative w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* NEW EXPANSION Badge */}
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="flex justify-center mb-4"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">
              New Expansion
            </span>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-center mb-8"
          >
            <h1
              className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-wider leading-tight"
              style={{ textShadow: '0 0 40px rgba(52,211,153,0.5)' }}
            >
              Jungle of
              <br />
              Talons
            </h1>
          </motion.div>

          {/* Feature List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="space-y-3 mb-8"
          >
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1, type: 'spring', damping: 20, stiffness: 200 }}
                className="flex items-center gap-3 bg-emerald-900/50 border border-emerald-500/15 rounded-xl px-4 py-3"
              >
                <div className="text-emerald-400 shrink-0">
                  {feature.icon}
                </div>
                <span className="text-slate-100 text-sm font-bold">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="space-y-3"
          >
            <motion.button
              onClick={onExplore}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-black text-lg rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] transition-all"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Explore Now
            </motion.button>
            <button
              onClick={onDismiss}
              className="w-full text-center text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors font-bold"
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
