import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  isFrenzyFriday, getMsUntilFridayEnd, getMsUntilNextFriday,
  getUpcomingFridayElement, getFrenzyDetails, getActiveElement,
} from '../../game/events'

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

export default function FrenzyCountdown() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isFriday = isFrenzyFriday(now)

  if (isFriday) {
    const msLeft = getMsUntilFridayEnd(now)
    const element = getActiveElement(now)
    const { theme } = getFrenzyDetails(element)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${theme.gradient} border ${theme.border}`}
      >
        <span className="text-sm">{theme.icon}</span>
        <span className="text-white text-xs font-bold">Frenzy ends in {formatCountdown(msLeft)}</span>
      </motion.div>
    )
  }

  // Non-Friday: show upcoming element preview
  const msUntil = getMsUntilNextFriday(now)
  const nextElement = getUpcomingFridayElement(now)
  const { theme: nextTheme } = getFrenzyDetails(nextElement)

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
      <span className="text-sm">{nextTheme.icon}</span>
      <span className="text-slate-300 text-xs font-bold">
        Next Frenzy ({nextElement}) in {formatCountdown(msUntil)}
      </span>
    </div>
  )
}
