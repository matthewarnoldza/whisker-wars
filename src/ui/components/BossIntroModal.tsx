import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScaledBird } from '../../game/birds'
import { useDialog } from '../hooks/useDialog'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { HeartIcon, SwordIcon, ShieldIcon } from '../icons'

interface BossIntroModalProps {
  bird: ScaledBird
  stageNumber: number
  onContinue: () => void
}

const BOSS_THEMES: Record<number, {
  gradient: string
  glow: string
  border: string
  titleColor: string
  subtitle: string
  flavorText: string
}> = {
  10: {
    gradient: 'from-purple-950 via-purple-900/80 to-slate-950',
    glow: 'shadow-[0_0_80px_rgba(168,85,247,0.4)]',
    border: 'border-purple-500/40',
    titleColor: 'text-purple-300',
    subtitle: "Talon Queen's Throne",
    flavorText: 'She will not fall easily...',
  },
  20: {
    gradient: 'from-red-950 via-red-900/80 to-slate-950',
    glow: 'shadow-[0_0_80px_rgba(239,68,68,0.4)]',
    border: 'border-red-500/40',
    titleColor: 'text-red-300',
    subtitle: "The Apex Raptor's Domain",
    flavorText: 'The jungle trembles...',
  },
}

export default function BossIntroModal({ bird, stageNumber, onContinue }: BossIntroModalProps) {
  const theme = BOSS_THEMES[stageNumber] ?? BOSS_THEMES[10]
  const reduce = useMotionSafe()
  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({ onClose: onContinue })

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-surface-deep/95 backdrop-blur-lg flex items-center justify-center touch-none overflow-hidden"
      >
        {/* Vignette effect */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
        }} />

        <motion.div
          ref={dialogRef}
          {...dialogProps}
          aria-labelledby="boss-intro-title"
          initial={reduce ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 18, stiffness: 140 }}
          className="relative w-full max-w-md mx-4 text-center focus:outline-none"
        >
          {/* Stage Number */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <span className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400/80">
              Stage {stageNumber}
            </span>
            <h3 className={`text-lg font-bold ${theme.titleColor} mt-1`}>
              {theme.subtitle}
            </h3>
          </motion.div>

          {/* Boss Image */}
          <motion.div
            initial={reduce ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 14, stiffness: 100, delay: 0.3 }}
            className={`relative mx-auto w-56 h-56 rounded-2xl overflow-hidden mb-6 ${theme.glow} border-2 ${theme.border}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40`} />
            <img
              src={bird.imageUrl}
              alt={bird.name}
              className="w-full h-full object-cover relative z-10"
            />
            {/* Pulse overlay (steady under reduced motion) */}
            {!reduce && (
              <motion.div
                animate={{ opacity: [0, 0.15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} z-20`}
              />
            )}
          </motion.div>

          {/* Boss Name */}
          <motion.h2
            id="boss-intro-title"
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', damping: 16, stiffness: 120, delay: 0.5 }}
            className="font-heading text-4xl font-black uppercase text-amber-400 mb-2 tracking-wide"
            style={{ textShadow: '0 0 30px rgba(251,191,36,0.5)' }}
          >
            {bird.name}
          </motion.h2>

          {/* Ability Description */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mb-5"
          >
            <p className="text-teal-300 font-bold text-sm mb-1">{bird.ability.name}</p>
            <p className="text-emerald-200/60 text-sm">{bird.ability.description}</p>
          </motion.div>

          {/* Stats Display */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="flex justify-center gap-6 mb-5"
          >
            <div className="text-center">
              <HeartIcon className="mx-auto mb-1 text-danger-400" size={18} />
              <div className="text-2xl font-black text-danger-400 tabular-nums">{bird.scaledHP}</div>
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold">HP</div>
            </div>
            <div className="w-px bg-surface-border" />
            <div className="text-center">
              <SwordIcon className="mx-auto mb-1 text-orange-400" size={18} />
              <div className="text-2xl font-black text-orange-400 tabular-nums">{bird.scaledATK}</div>
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold">ATK</div>
            </div>
            <div className="w-px bg-surface-border" />
            <div className="text-center">
              <ShieldIcon className="mx-auto mb-1 text-blue-400" size={18} />
              <div className="text-2xl font-black text-blue-400 tabular-nums">{bird.DEF}</div>
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold">DEF</div>
            </div>
          </motion.div>

          {/* Flavor Text */}
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.9 }}
            className="text-ink-faint text-sm italic mb-8"
          >
            "{theme.flavorText}"
          </motion.p>

          {/* Enter Battle Button */}
          <motion.div
            initial={reduce ? false : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 1.0 }}
          >
            <motion.button
              onClick={onContinue}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-surface-deep font-heading font-black uppercase tracking-wide text-lg rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all focus:outline-none focus-visible:shadow-focus-gold"
              whileHover={reduce ? undefined : { scale: 1.05 }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              animate={reduce ? undefined : {
                boxShadow: [
                  '0 0 20px rgba(251,191,36,0.3)',
                  '0 0 40px rgba(251,191,36,0.5)',
                  '0 0 20px rgba(251,191,36,0.3)',
                ],
              }}
              transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Enter Battle
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
