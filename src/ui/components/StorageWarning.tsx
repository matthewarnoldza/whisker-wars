import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StorageWarningProps {
  onGetCode: () => void
}

export default function StorageWarning({ onGetCode }: StorageWarningProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-[999998] bg-amber-900/95 border-b-2 border-amber-500/50 px-4 py-3 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-amber-100 font-bold text-sm sm:text-base">
                Your browser might not save automatically
              </p>
              <p className="text-amber-200/80 text-xs sm:text-sm">
                Get a Save Code to keep your progress safe!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGetCode}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 transition-colors text-sm"
            >
              Get Save Code
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-2 text-amber-300 hover:text-white transition-colors"
              aria-label="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
