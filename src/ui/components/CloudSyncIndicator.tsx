import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../game/store'

// Small dismissible banner shown only when a cloud (save-code) backup has failed
// AND the player actually uses cloud saves (has a cloudCode). Mirrors the
// StorageWarning visual pattern. No retry logic here — the copy points players at
// the Save menu; dismissing clears the error in the store.
export default function CloudSyncIndicator() {
  const cloudSyncError = useGame(s => s.cloudSyncError)
  const clearCloudSyncError = useGame(s => s.clearCloudSyncError)
  const getCurrentProfile = useGame(s => s.getCurrentProfile)

  const hasCloudCode = !!getCurrentProfile()?.cloudCode
  if (!cloudSyncError || !hasCloudCode) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-critical bg-red-900/95 border-b-2 border-red-500/50 px-4 py-3 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☁️</span>
            <p className="text-red-100 font-medium text-sm sm:text-base">
              {cloudSyncError}
            </p>
          </div>
          <button
            onClick={clearCloudSyncError}
            className="p-2 text-red-300 hover:text-white transition-colors"
            aria-label="Dismiss cloud sync warning"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
