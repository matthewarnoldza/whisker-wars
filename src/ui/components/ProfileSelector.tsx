import { useState } from 'react'
import { useGame } from '../../game/store'
import type { ProfileMeta } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'
import { trackProfileSwitched } from '../../utils/analytics'
import SaveCodeModal from './SaveCodeModal'
import { uploadSave, CloudSaveData } from '../../utils/cloudSave'
import { buildSavePayload } from '../../game/saveData'
import { Button } from './ui'
import {
  CatIcon,
  CalendarIcon,
  ClockIcon,
  EditIcon,
  TrashIcon,
  PlayIcon,
  PlusIcon,
  PawIcon,
} from '../icons'

interface ProfileSelectorProps {
  onProfileSelected: () => void
}

export default function ProfileSelector({ onProfileSelected }: ProfileSelectorProps) {
  const getProfiles = useGame(s => s.getProfiles)
  const createProfile = useGame(s => s.createProfile)
  const loadProfile = useGame(s => s.loadProfile)
  const deleteProfile = useGame(s => s.deleteProfile)
  const renameProfile = useGame(s => s.renameProfile)

  const [profiles, setProfiles] = useState<ProfileMeta[]>(getProfiles())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [saveCodeModal, setSaveCodeModal] = useState<{ open: boolean; mode: 'generate' | 'restore'; profileId?: string }>({ open: false, mode: 'generate' })

  const handleSelectProfile = (profileId: string) => {
    trackProfileSwitched(profileId)
    loadProfile(profileId)
    onProfileSelected()
  }

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return
    const profileId = createProfile(newProfileName.trim())
    loadProfile(profileId)

    // Auto-generate cloud code for new profile (fire-and-forget to avoid UI freeze)
    const state = useGame.getState()
    const profile = state.getCurrentProfile()
    if (profile) {
      // Complete versioned SaveData from the single source of truth (includes
      // Jungle-expansion and frenzy fields).
      const saveData: CloudSaveData = buildSavePayload(state)
      uploadSave(saveData, profile).then(result => {
        if (result.success && result.code && result.isNew) {
          useGame.getState().setProfileCloudCode(result.code)
        }
      }).catch(err => {
        console.error('Failed to auto-generate cloud code:', err)
      })
    }

    setProfiles(getProfiles())
    setCreatingNew(false)
    setNewProfileName('')
    onProfileSelected()
  }

  const handleDeleteProfile = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (profiles.length === 1) {
      alert("Cannot delete the last profile!")
      return
    }
    if (window.confirm('Delete this profile? This cannot be undone!')) {
      deleteProfile(profileId)
      setProfiles(getProfiles())
    }
  }

  const handleRename = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const profile = profiles.find(p => p.id === profileId)
    if (profile) {
      setEditingId(profileId)
      setEditName(profile.name)
    }
  }

  const saveRename = (profileId: string) => {
    if (editName.trim()) {
      renameProfile(profileId, editName.trim())
      setProfiles(getProfiles())
    }
    setEditingId(null)
    setEditName('')
  }

  const handleGetCode = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // First load the profile so we can export its data
    loadProfile(profileId)
    setSaveCodeModal({ open: true, mode: 'generate', profileId })
  }

  const handleRestoreCode = () => {
    setSaveCodeModal({ open: true, mode: 'restore' })
  }

  const handleRestoreComplete = () => {
    setProfiles(getProfiles())
    onProfileSelected()
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-critical flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl bg-slate-900 border border-gold-500/30 rounded-2xl shadow-premium-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
          <h2 className="flex items-center gap-3 text-3xl font-black bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent font-heading">
            <CatIcon className="text-gold-400 shrink-0" />
            Select Your Profile
          </h2>
          <p className="text-slate-400 mt-2">Pick a profile and get back to the cats.</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <AnimatePresence mode="popLayout">
              {profiles.map(profile => (
                <motion.div
                  key={profile.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => handleSelectProfile(profile.id)}
                  className="premium-card p-6 cursor-pointer hover:border-gold-500/50 transition-all group relative"
                >
                  {/* Profile Card Content */}
                  <div className="flex flex-col h-full">
                    {editingId === profile.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => saveRename(profile.id)}
                        onKeyPress={(e) => e.key === 'Enter' && saveRename(profile.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-800 text-white px-3 py-2 rounded border border-gold-500/30 mb-3 font-bold text-lg"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-xl font-heading font-black text-gold-400 mb-3 truncate">
                        {profile.name}
                      </h3>
                    )}

                    <div className="space-y-1 text-sm text-slate-400 mb-4 flex-1">
                      <div className="flex items-center gap-1.5"><CalendarIcon className="shrink-0" /> Created: {formatDate(profile.created)}</div>
                      <div className="flex items-center gap-1.5"><ClockIcon className="shrink-0" /> Last played: {formatDate(profile.lastPlayed)}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleGetCode(profile.id, e)}
                        className="flex-1 px-3 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 rounded font-bold text-sm transition-all focus:outline-none focus-visible:shadow-focus-gold"
                      >
                        📋 Code
                      </button>
                      <button
                        onClick={(e) => handleRename(profile.id, e)}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold text-sm transition-all focus:outline-none focus-visible:shadow-focus-gold"
                        aria-label="Rename profile"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProfile(profile.id, e)}
                        className="px-3 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded font-bold text-sm transition-all focus:outline-none focus-visible:shadow-focus-gold"
                        aria-label="Delete profile"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Play hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gold-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                    <PlayIcon className="text-4xl text-white drop-shadow-lg" />
                  </div>
                </motion.div>
              ))}

              {/* Create New Profile Card */}
              {profiles.length < 5 && !creatingNew && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setCreatingNew(true)}
                  className="premium-card p-6 cursor-pointer hover:border-gold-500/50 transition-all border-dashed flex items-center justify-center min-h-[200px]"
                >
                  <div className="text-center">
                    <PlusIcon className="text-5xl text-gold-400 mx-auto mb-3" />
                    <div className="text-lg font-bold text-gold-400">Create New Profile</div>
                  </div>
                </motion.div>
              )}

              {/* New Profile Form */}
              {creatingNew && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="premium-card p-6 border-gold-500/50 min-h-[200px] flex flex-col justify-center"
                >
                  <h3 className="text-lg font-heading font-black text-gold-400 mb-4">New Profile</h3>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                    placeholder="Name your profile…"
                    className="bg-slate-800 text-white px-4 py-3 rounded border border-gold-500/30 mb-4 font-bold"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleCreateProfile}
                      disabled={!newProfileName.trim()}
                      fullWidth
                    >
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCreatingNew(false)
                        setNewProfileName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {profiles.length === 0 && !creatingNew && (
            <div className="text-center py-12">
              <PawIcon className="text-6xl text-slate-400 mx-auto mb-4" />
              <h3 className="text-2xl font-heading font-bold text-slate-300 mb-2">No profiles yet!</h3>
              <p className="text-slate-500 mb-6">Create your first profile and start your clowder.</p>
              <Button variant="primary" size="lg" onClick={() => setCreatingNew(true)}>
                Create Profile
              </Button>
            </div>
          )}

          {/* Restore from Save Code Section */}
          <div className="border-t border-slate-700 pt-6 mt-6">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-3">Have a save code from another device?</p>
              <Button variant="secondary" onClick={handleRestoreCode}>
                📋 Enter Save Code
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Code Modal */}
      <SaveCodeModal
        isOpen={saveCodeModal.open}
        onClose={() => setSaveCodeModal({ ...saveCodeModal, open: false })}
        mode={saveCodeModal.mode}
        onRestoreComplete={handleRestoreComplete}
      />
    </div>
  )
}
