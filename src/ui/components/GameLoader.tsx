import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PawIcon } from '../icons'
import { useMotionSafe } from '../hooks/useMotionSafe'

// Themed loading state — replaces every bare "Loading..." across the app.
// A pulsing paw (static when reduced motion is on) over a rotating flavor line.
// One voice, even while the player waits.
const FLAVOR_LINES = [
  'Herding cats…',
  'Shuffling the deck…',
  'Polishing whiskers…',
  'Sharpening claws…',
  'Untangling the yarn…',
  'Waking the cats…',
]

// Random starting line, fixed for this mount (avoids re-rolling on every render).
function randomLine() {
  return FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)]
}

interface GameLoaderProps {
  /** Compact inline variant for small panels (e.g. leaderboard slots). */
  compact?: boolean
  className?: string
}

export default function GameLoader({ compact = false, className = '' }: GameLoaderProps) {
  const reduce = useMotionSafe()
  const [line, setLine] = useState(randomLine)

  // Cycle the flavor line while we wait — but only when motion is allowed.
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      setLine(prev => {
        let next = prev
        while (next === prev) next = randomLine()
        return next
      })
    }, 1800)
    return () => clearInterval(id)
  }, [reduce])

  const paw = reduce ? (
    <PawIcon className="text-accent-300" size={compact ? 20 : 40} title="Loading" />
  ) : (
    <motion.span
      className="inline-flex text-accent-300"
      animate={{ scale: [1, 1.15, 1], opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <PawIcon size={compact ? 20 : 40} title="Loading" />
    </motion.span>
  )

  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-2 text-slate-500 text-sm py-4 ${className}`}>
        {paw}
        <span>{line}</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-slate-400 ${className}`}>
      {paw}
      <p className="font-heading text-sm tracking-wide">{line}</p>
    </div>
  )
}
