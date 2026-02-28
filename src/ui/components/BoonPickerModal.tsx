import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { BoonOffering, ActiveBoon, BoonRarity } from '../../game/boons'

interface BoonPickerModalProps {
  offering: BoonOffering
  activeBoons: ActiveBoon[]
  onSelect: (boonId: string) => void
}

const RARITY_COLORS: Record<BoonRarity, { text: string; bg: string; border: string; glow: string }> = {
  Common: {
    text: 'text-slate-400',
    bg: 'bg-slate-600/30',
    border: 'border-slate-500/40',
    glow: 'hover:shadow-[0_0_20px_rgba(148,163,184,0.3)]',
  },
  Rare: {
    text: 'text-purple-400',
    bg: 'bg-purple-600/20',
    border: 'border-purple-500/40',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
  },
  Legendary: {
    text: 'text-amber-400',
    bg: 'bg-amber-600/20',
    border: 'border-amber-500/40',
    glow: 'hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]',
  },
}

export default function BoonPickerModal({ offering, activeBoons, onSelect }: BoonPickerModalProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const getActiveStacks = (boonId: string): number => {
    return activeBoons.find(b => b.boonId === boonId)?.stacks ?? 0
  }

  const handleSelect = (boonId: string) => {
    if (selected) return
    setSelected(boonId)
    setTimeout(() => onSelect(boonId), 600)
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-emerald-950/90 backdrop-blur-md flex items-center justify-center touch-none"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="w-full max-w-3xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <h2 className="text-3xl font-black text-slate-100 tracking-wide">
              Choose a Boon
            </h2>
            {offering.wasGuaranteedRare && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-emerald-400/60 text-sm mt-2 italic"
              >
                Pity timer activated
              </motion.p>
            )}
          </motion.div>

          {/* Boon Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {offering.boons.map((boon, index) => {
              const colors = RARITY_COLORS[boon.rarity]
              const currentStacks = getActiveStacks(boon.id)
              const isSelected = selected === boon.id
              const isDimmed = selected !== null && !isSelected

              return (
                <motion.button
                  key={boon.id}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: isDimmed ? 0.3 : 1,
                    scale: isSelected ? 1.08 : 1,
                  }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 200,
                    delay: 0.15 + index * 0.1,
                  }}
                  whileHover={!selected ? { scale: 1.05, y: -4 } : undefined}
                  whileTap={!selected ? { scale: 0.98 } : undefined}
                  onClick={() => handleSelect(boon.id)}
                  disabled={selected !== null}
                  className={`
                    relative p-5 rounded-2xl border-2 text-left transition-all duration-200
                    bg-emerald-900/80 ${colors.border} ${colors.glow}
                    ${isSelected ? 'ring-2 ring-emerald-400 border-emerald-400' : ''}
                    ${!selected ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {/* Boon Icon */}
                  {boon.iconUrl && (
                    <div className="flex justify-center mb-3">
                      <img
                        src={boon.iconUrl}
                        alt={boon.name}
                        className="w-16 h-16 object-cover rounded-xl border-2 border-slate-600/50"
                      />
                    </div>
                  )}

                  {/* Rarity Badge */}
                  <div className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${colors.bg} ${colors.text}`}>
                    {boon.rarity}
                  </div>

                  {/* Boon Name */}
                  <h3 className="text-lg font-black text-slate-100 mb-2 leading-tight">
                    {boon.name}
                  </h3>

                  {/* Description */}
                  <p className="text-emerald-200/70 text-sm leading-relaxed mb-3">
                    {boon.description}
                  </p>

                  {/* Stacks & Max */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-200/50">
                      Max stacks: {boon.maxStacks}
                    </span>
                    {currentStacks > 0 && (
                      <span className="text-xs font-bold text-teal-300">
                        {currentStacks}/{boon.maxStacks} stacked
                      </span>
                    )}
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-emerald-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
