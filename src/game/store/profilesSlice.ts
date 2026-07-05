// Profiles domain: multi-profile metadata (localStorage), the active profile, and
// profile create/load/delete/rename/restore. Profiles live in their own
// localStorage keys, NOT in the persisted save blob.
//
// Persisted game fields are declared (and validated) in src/game/saveData.ts.
// restoreProfile() routes cloud payloads through parseSaveData (the single source
// of truth) — it does not fork the field list.

import type { StateCreator } from 'zustand'
import { parseSaveData } from '../saveData'
import { trackProfileCreated } from '../../utils/analytics'
import type { ProfileMeta } from './shared'
import {
  PROFILE_KEY_PREFIX,
  SAVE_CORRUPT_MSG,
  getProfilesData,
  saveProfilesData,
  getInitialGameState,
  syncFlags,
} from './shared'
import type { GameState } from './types'

export interface ProfilesSlice {
  getCurrentProfile: ()=>ProfileMeta | null
  getProfiles: ()=>ProfileMeta[]
  createProfile: (name:string)=>string
  loadProfile: (profileId:string)=>void
  deleteProfile: (profileId:string)=>void
  renameProfile: (profileId:string, name:string)=>void
  setProfileCloudCode: (code:string)=>void
  restoreProfile: (name:string, cloudCode:string, data:Record<string, unknown>)=>string
}

export const createProfilesSlice: StateCreator<GameState, [], [], ProfilesSlice> = (set, get) => ({
  getCurrentProfile: ()=> {
    const data = getProfilesData()
    return data.profiles.find(p => p.id === data.activeProfileId) || null
  },

  getProfiles: ()=> {
    return getProfilesData().profiles
  },

  createProfile: (name)=> {
    const data = getProfilesData()
    const profileId = crypto.randomUUID()
    const newProfile: ProfileMeta = {
      id: profileId,
      name: name || `Player ${data.profiles.length + 1}`,
      created: Date.now(),
      lastPlayed: Date.now()
    }
    data.profiles.push(newProfile)
    data.activeProfileId = profileId
    saveProfilesData(data)

    // Immediately save initial game state so it's not lost if browser closes
    set(getInitialGameState())
    syncFlags.stateLoaded = true // New profile: initial state IS the canonical state
    get().save()

    trackProfileCreated(newProfile.id)
    return newProfile.id
  },

  loadProfile: (profileId)=> {
    const data = getProfilesData()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return

    data.activeProfileId = profileId
    saveProfilesData(data)

    // Reset flags so new profile's stats get uploaded fresh
    syncFlags.stateLoaded = false
    syncFlags.lastLeaderboardSync = 0

    // Reset to initial state first, then load saved data if it exists
    set(getInitialGameState())
    get().load()
  },

  deleteProfile: (profileId)=> {
    const data = getProfilesData()
    data.profiles = data.profiles.filter(p => p.id !== profileId)
    if (data.activeProfileId === profileId) {
      data.activeProfileId = data.profiles[0]?.id || ''
    }
    localStorage.removeItem(`${PROFILE_KEY_PREFIX}${profileId}`)
    saveProfilesData(data)
  },

  renameProfile: (profileId, name)=> {
    const data = getProfilesData()
    data.profiles = data.profiles.map(p =>
      p.id === profileId ? { ...p, name } : p
    )
    saveProfilesData(data)
  },

  setProfileCloudCode: (code)=> {
    const data = getProfilesData()
    if (!data.activeProfileId) return
    data.profiles = data.profiles.map(p =>
      p.id === data.activeProfileId ? { ...p, cloudCode: code } : p
    )
    saveProfilesData(data)
  },

  restoreProfile: (name, cloudCode, cloudData)=> {
    // Validate (and migrate) the cloud payload through the single source of truth
    // instead of a fourth hand-maintained `?? default` list. On failure we surface
    // the error rather than materialising a half-empty profile from defaults.
    const parsed = parseSaveData(cloudData)
    if ('error' in parsed) {
      console.error('Cloud save failed validation:', parsed.error)
      set({ saveError: SAVE_CORRUPT_MSG })
      return ''
    }

    const data = getProfilesData()
    const profileId = crypto.randomUUID()
    const now = Date.now()
    const newProfile: ProfileMeta = {
      id: profileId,
      name: name || 'Restored Profile',
      created: now,
      lastPlayed: now,
      cloudCode,
    }
    data.profiles.push(newProfile)
    data.activeProfileId = profileId
    saveProfilesData(data)

    // Write the validated, version-stamped data directly to localStorage for this
    // profile (skip initial state), then load() re-parses it.
    const payload = JSON.stringify(parsed.data)
    try {
      localStorage.setItem(`${PROFILE_KEY_PREFIX}${profileId}`, payload)
    } catch (error) {
      console.error('Failed to save restored profile:', error)
    }

    // Now load the profile (reads the data we just wrote)
    syncFlags.stateLoaded = false
    syncFlags.lastLeaderboardSync = 0
    syncFlags.lastCloudSync = 0
    set(getInitialGameState())
    get().load()

    return profileId
  },
})
