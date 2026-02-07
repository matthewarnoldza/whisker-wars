import { useState, useEffect } from 'react'
import Modal from './Modal'
import { uploadSave, previewSave, downloadSave, CloudSaveData } from '../../utils/cloudSave'
import { useGame } from '../../game/store'

interface SaveCodeModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'generate' | 'restore'
  onRestoreComplete?: () => void
}

export default function SaveCodeModal({ isOpen, onClose, mode, onRestoreComplete }: SaveCodeModalProps) {
  // Generate mode state
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Restore mode state
  const [inputCode, setInputCode] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [preview, setPreview] = useState<{
    name: string
    savedAt: number
    catCount: number
    coins: number
  } | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  // Get store functions
  const getCurrentProfile = useGame(s => s.getCurrentProfile)
  const restoreProfile = useGame(s => s.restoreProfile)
  const setProfileCloudCode = useGame(s => s.setProfileCloudCode)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedCode(null)
      setIsGenerating(false)
      setGenerateError(null)
      setCopied(false)
      setInputCode('')
      setIsChecking(false)
      setIsRestoring(false)
      setPreview(null)
      setRestoreError(null)
      setRestoreSuccess(false)
    }
  }, [isOpen])

  // Auto-generate code when opening in generate mode
  useEffect(() => {
    if (isOpen && mode === 'generate' && !generatedCode && !isGenerating) {
      handleGenerate()
    }
  }, [isOpen, mode])

  // Check code when user types
  useEffect(() => {
    if (mode !== 'restore') return

    const normalizedCode = inputCode.trim().toUpperCase()
    // Only check if it looks like a valid code format
    if (/^[A-Z]+-\d{4}$/.test(normalizedCode)) {
      checkCode(normalizedCode)
    } else {
      setPreview(null)
      setRestoreError(null)
    }
  }, [inputCode, mode])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerateError(null)

    const profile = getCurrentProfile()
    if (!profile) {
      setGenerateError('No profile loaded')
      setIsGenerating(false)
      return
    }

    // Get current save data from store
    const state = useGame.getState()
    const saveData: CloudSaveData = {
      coins: state.coins,
      baits: state.baits,
      owned: state.owned,
      dogIndex: state.dogIndex,
      difficultyLevel: state.difficultyLevel,
      favorites: state.favorites,
      theme: state.theme,
      achievements: state.achievements,
      stats: state.stats,
      lastDailyReward: state.lastDailyReward,
      tutorialCompleted: state.tutorialCompleted,
      trainingCooldowns: state.trainingCooldowns,
      selectedForBattle: state.selectedForBattle,
      dailyStreak: state.dailyStreak,
      soundEnabled: state.soundEnabled,
      musicEnabled: state.musicEnabled,
      inventory: state.inventory,
      completedEventRewards: state.completedEventRewards,
    }

    // Use existing code if profile has one, otherwise generate new
    const result = await uploadSave(saveData, profile, profile.cloudCode)

    if (result.success && result.code) {
      setGeneratedCode(result.code)
      // Save the code to the profile if it's new
      if (result.isNew) {
        setProfileCloudCode(result.code)
      }
    } else {
      setGenerateError(result.error || 'Failed to generate save code')
    }

    setIsGenerating(false)
  }

  const handleCopy = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const checkCode = async (code: string) => {
    setIsChecking(true)
    setRestoreError(null)
    setPreview(null)

    const result = await previewSave(code)

    if (result.success && result.preview) {
      setPreview(result.preview)
    } else {
      setRestoreError(result.error || 'Could not find save')
    }

    setIsChecking(false)
  }

  const handleRestore = async () => {
    const normalizedCode = inputCode.trim().toUpperCase()
    setIsRestoring(true)
    setRestoreError(null)

    const result = await downloadSave(normalizedCode)

    if (result.success && result.data && result.meta) {
      // Atomic restore: writes cloud data directly to localStorage, then loads
      restoreProfile(result.meta.name, normalizedCode, result.data as unknown as Record<string, unknown>)

      setRestoreSuccess(true)
    } else {
      setRestoreError(result.error || 'Could not restore save')
    }

    setIsRestoring(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSuccessClose = () => {
    onClose()
    onRestoreComplete?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={restoreSuccess ? handleSuccessClose : onClose}
      title={mode === 'generate' ? 'Your Save Code' : 'Enter Save Code'}
      size="sm"
    >
      {mode === 'generate' ? (
        <div className="text-center space-y-6">
          {isGenerating ? (
            <div className="py-8">
              <div className="text-4xl mb-4 animate-bounce">🐱</div>
              <p className="text-slate-300">Creating your save code...</p>
            </div>
          ) : generateError ? (
            <div className="py-4">
              <div className="text-4xl mb-4">😿</div>
              <p className="text-red-400 mb-4">{generateError}</p>
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-gold-500 text-slate-900 font-bold rounded-xl hover:bg-gold-400 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : generatedCode ? (
            <>
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-dashed border-gold-500/50">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Your Code</p>
                <p className="text-4xl font-black text-gold-400 font-mono tracking-wider">
                  {generatedCode}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className={`w-full px-6 py-4 font-bold rounded-xl transition-all ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {copied ? '✓ Copied!' : '📋 Copy Code'}
              </button>

              <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-left">
                <p className="text-blue-200 text-sm">
                  <strong>Write this down</strong> or take a screenshot! You can use this code on any device to get your cats back.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all"
              >
                Got it!
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {restoreSuccess ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gold-400 mb-2">Welcome Back!</h3>
              <p className="text-slate-300 mb-6">Your progress has been restored. Your cats missed you!</p>
              <button
                onClick={handleSuccessClose}
                className="w-full px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all"
              >
                Let's Play!
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Enter your save code:
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="CAT-1234"
                  className="w-full bg-slate-800 text-white text-2xl text-center font-mono font-bold px-4 py-4 rounded-xl border border-gold-500/30 focus:border-gold-500 focus:outline-none tracking-wider"
                  autoFocus
                />
              </div>

              {isChecking && (
                <div className="text-center text-slate-400">
                  <span className="inline-block animate-spin mr-2">🔍</span>
                  Checking code...
                </div>
              )}

              {restoreError && !isChecking && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
                  <p className="text-red-300">{restoreError}</p>
                </div>
              )}

              {preview && !isChecking && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-3">
                    <span>✓</span>
                    <span className="font-bold">Save Found!</span>
                  </div>
                  <div className="space-y-2 text-slate-300">
                    <p><strong>Profile:</strong> {preview.name}</p>
                    <p><strong>Saved:</strong> {formatDate(preview.savedAt)}</p>
                    <p>🐱 {preview.catCount} cats | 🪙 {preview.coins} coins</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  disabled={!preview || isRestoring}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring ? 'Loading...' : 'Load My Cats!'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
