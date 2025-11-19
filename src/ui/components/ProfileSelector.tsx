import { useState } from 'react'
import { useGame } from '../../game/store'
import type { ProfileMeta } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'

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

  const handleSelectProfile = (profileId: string) => {
    loadProfile(profileId)
    onProfileSelected()
  }

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return
    const profileId = createProfile(newProfileName.trim())
    setProfiles(getProfiles())
    setCreatingNew(false)
    setNewProfileName('')
    handleSelectProfile(profileId)
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl bg-slate-900 border border-gold-500/30 rounded-2xl shadow-premium-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
          <h2 className="text-3xl font-black bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent font-heading">
            🐱 Select Your Profile
          </h2>
          <p className="text-slate-400 mt-2">Choose a profile to continue playing</p>
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
                      <h3 className="text-xl font-black text-gold-400 mb-3 truncate">
                        {profile.name}
                      </h3>
                    )}

                    <div className="space-y-1 text-sm text-slate-400 mb-4 flex-1">
                      <div>📅 Created: {formatDate(profile.created)}</div>
                      <div>🕐 Last played: {formatDate(profile.lastPlayed)}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleRename(profile.id, e)}
                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold text-sm transition-all"
                      >
                        ✏️ Rename
                      </button>
                      <button
                        onClick={(e) => handleDeleteProfile(profile.id, e)}
                        className="px-3 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded font-bold text-sm transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Play hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gold-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="text-4xl">▶️</div>
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
                    <div className="text-5xl mb-3">➕</div>
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
                  <h3 className="text-lg font-black text-gold-400 mb-4">New Profile</h3>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                    placeholder="Enter profile name..."
                    className="bg-slate-800 text-white px-4 py-3 rounded border border-gold-500/30 mb-4 font-bold"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProfile}
                      disabled={!newProfileName.trim()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-bold rounded shadow-glow-gold hover:shadow-premium-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreatingNew(false)
                        setNewProfileName('')
                      }}
                      className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {profiles.length === 0 && !creatingNew && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🐾</div>
              <h3 className="text-2xl font-bold text-slate-300 mb-2">No profiles yet!</h3>
              <p className="text-slate-500 mb-6">Create your first profile to start playing</p>
              <button
                onClick={() => setCreatingNew(true)}
                className="px-8 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black text-lg rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all"
              >
                Create Profile
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
