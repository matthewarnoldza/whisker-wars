// Persistence + cloud sync + payment domain: save()/load()/restore delegate to
// src/game/saveData.ts (buildSavePayload/parseSaveData — the single source of
// truth for the persisted field list); this slice owns the throttled leaderboard
// and cloud-save timers, the transient saveError/cloudSyncError/lastCloudSyncAt
// surfaces, and the Firebase payment check.
//
// The persisted field list is NOT declared here — it lives in saveData.ts.

import type { StateCreator } from 'zustand'
import { getDb } from '../../utils/firebase'
import { uploadLeaderboardStats } from '../../utils/leaderboard'
import { uploadJungleLeaderboardStats } from '../../utils/jungleLeaderboard'
import { uploadSave, type CloudSaveData } from '../../utils/cloudSave'
import { buildSavePayload, parseSaveData } from '../saveData'
import { setSfxVolume as applySfxVolume, setMusicVolume as applyMusicVolume } from '../../utils/sound'
import { INITIAL_COINS, DEFAULT_BAITS } from '../constants'
import { createInitialJungleStats } from '../jungleRun'
import type { OwnedCat, Achievement } from './shared'
import {
  PROFILE_KEY_PREFIX,
  SAVE_CORRUPT_MSG,
  INITIAL_ACHIEVEMENTS,
  getProfilesData,
  saveProfilesData,
  syncFlags,
  getSyncInitialState,
} from './shared'
import type { GameState } from './types'

export interface SyncSlice {
  saveError: string | null
  // Cloud (save-code) backup sync status — transient, never persisted.
  cloudSyncError: string | null
  lastCloudSyncAt: number | null
  save: ()=>void
  load: ()=>void
  clearSaveError: ()=>void
  clearCloudSyncError: ()=>void
  checkPaymentStatus: ()=>Promise<boolean>
}

export const createSyncSlice: StateCreator<GameState, [], [], SyncSlice> = (set, get) => ({
  ...getSyncInitialState(),

  save: ()=> {
    if (!syncFlags.stateLoaded) return // Never persist unloaded/initial state
    const profilesData = getProfilesData()
    if (!profilesData.activeProfileId) return

    const s = get()
    // buildSavePayload is the single source of truth for the persisted field list.
    const payload = JSON.stringify(buildSavePayload(s))
    const storageKey = `${PROFILE_KEY_PREFIX}${profilesData.activeProfileId}`
    try {
      localStorage.setItem(storageKey, payload)
      // Verify write succeeded
      const readBack = localStorage.getItem(storageKey)
      if (readBack !== payload) {
        console.error('Save verification failed: data mismatch after write')
        set({ saveError: 'Save verification failed. Please get a save code to back up your data.' })
        return
      }
      // Clear any previous save error on successful save
      if (s.saveError) set({ saveError: null })
    } catch (error) {
      console.error('Failed to save game data (storage quota may be exceeded):', error)
      set({ saveError: 'Save failed — storage may be full. Get a save code to back up your data!' })
      return
    }

    // Update lastPlayed timestamp
    profilesData.profiles = profilesData.profiles.map(p =>
      p.id === profilesData.activeProfileId ? { ...p, lastPlayed: Date.now() } : p
    )
    saveProfilesData(profilesData)

    // Throttled leaderboard sync (at most once per 30 seconds, only after state is loaded)
    const profile = profilesData.profiles.find(p => p.id === profilesData.activeProfileId)
    if (syncFlags.stateLoaded && profile?.cloudCode) {
      const now = Date.now()
      if (now - syncFlags.lastLeaderboardSync > 30_000) {
        syncFlags.lastLeaderboardSync = now
        const uniqueCats = new Set(s.owned.map(c => c.id)).size
        uploadLeaderboardStats(profile.cloudCode, profile.name, {
          totalWins: s.stats.totalWins,
          highestDogDefeated: s.stats.highestDogDefeated,
          collectionCompletion: uniqueCats,
          totalMerges: s.stats.totalMerges,
        })

        // Jungle leaderboard sync (same throttle window)
        if (s.jungleStats.totalRuns > 0) {
          uploadJungleLeaderboardStats(profile.cloudCode, profile.name, {
            bestScore: s.jungleStats.bestScore,
            highestStage: s.jungleStats.bestStage,
            totalClears: s.jungleStats.totalRunsCompleted,
            fastestClearMs: s.jungleStats.fastestCompletionMs,
          })
        }
      }

      // Throttled cloud save sync (at most once per 2 minutes)
      if (now - syncFlags.lastCloudSync > 120_000) {
        syncFlags.lastCloudSync = now
        // Same versioned payload as the local save (includes saveVersion).
        const cloudData: CloudSaveData = buildSavePayload(s)
        // Surface cloud-backup failures instead of swallowing them: players who
        // rely on their save code must know when a backup did not happen.
        const NETWORK_MSG = 'Cloud backup failed — your progress is saved on this device. Retry from the Save menu.'
        uploadSave(cloudData, profile, profile.cloudCode)
          .then(result => {
            if (result.success) {
              set({ lastCloudSyncAt: Date.now(), cloudSyncError: null })
              return
            }
            // Ownership refusal from cloudSave.ts (code now belongs to another
            // device) is a distinct, non-transient failure from a network error.
            const ownership = result.error?.includes('another player')
            // Being offline is not itself an error; only flag apparent-online failures.
            if (!ownership && navigator.onLine === false) {
              console.warn('Cloud save skipped (offline):', result.error)
              return
            }
            console.warn('Cloud save failed:', result.error)
            set({
              cloudSyncError: ownership
                ? 'This save code now belongs to another device. Your progress is saved here — get a new code from the Save menu.'
                : NETWORK_MSG,
            })
          })
          .catch(err => {
            if (navigator.onLine === false) {
              console.warn('Cloud save skipped (offline):', err)
              return
            }
            console.warn('Cloud save error:', err)
            set({ cloudSyncError: NETWORK_MSG })
          })
      }
    }
  },

  load: ()=> {
    const profilesData = getProfilesData()
    if (!profilesData.activeProfileId) return

    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${profilesData.activeProfileId}`)
    if (!raw) return

    let rawObj: unknown
    try {
      rawObj = JSON.parse(raw)
    } catch (error) {
      // Corrupt JSON: surface it and leave the current in-memory data untouched.
      console.error('Failed to parse save JSON:', error)
      set({ saveError: SAVE_CORRUPT_MSG })
      return
    }

    // parseSaveData runs the migration chain then validates. On failure we do NOT
    // silently fall back to defaults (that path shipped data-loss bugs) — we surface
    // the error and keep whatever is already in memory.
    const parsed = parseSaveData(rawObj)
    if ('error' in parsed) {
      console.error('Save data failed validation:', parsed.error)
      set({ saveError: SAVE_CORRUPT_MSG })
      return
    }

    try {
      const d = parsed.data

      // Merge saved achievements with INITIAL_ACHIEVEMENTS to pick up new ones
      const savedAchievements: Achievement[] = d.achievements ?? []
      const savedIds = new Set(savedAchievements.map((a: Achievement) => a.id))
      const mergedAchievements = [
        ...savedAchievements,
        ...INITIAL_ACHIEVEMENTS.filter(a => !savedIds.has(a.id)),
      ]

      // Normalize owned cat data to ensure all optional fields have defaults
      const normalizedOwned: OwnedCat[] = (d.owned ?? []).map((cat: OwnedCat) => ({
        ...cat,
        totalBattles: cat.totalBattles ?? 0,
        totalWins: cat.totalWins ?? 0,
        isElite: cat.isElite ?? false,
        eliteTier: cat.eliteTier ?? 0,
        mergedFromIds: cat.mergedFromIds ?? [],
        ascension: cat.ascension ?? 0,
      }))

      const savedStats = d.stats ?? {}
      set({
        coins: d.coins ?? INITIAL_COINS,
        baits: d.baits ?? { ...DEFAULT_BAITS },
        owned: normalizedOwned,
        selectedForBattle: d.selectedForBattle ?? [],
        dogIndex: d.dogIndex ?? 0,
        difficultyLevel: d.difficultyLevel ?? 0,
        alienUnlocked: d.alienUnlocked ?? false,
        favorites: d.favorites ?? [],
        theme: d.theme ?? 'dark',
        soundEnabled: d.soundEnabled ?? true,
        musicEnabled: d.musicEnabled ?? true,
        sfxVolume: d.sfxVolume ?? 0.5,
        musicVolume: d.musicVolume ?? 0.2,
        reducedMotion: d.reducedMotion ?? false,
        colorblindMode: d.colorblindMode ?? false,
        achievements: mergedAchievements,
        stats: {
          totalBattles: savedStats.totalBattles ?? 0,
          totalWins: savedStats.totalWins ?? 0,
          totalLosses: savedStats.totalLosses ?? 0,
          totalCatsCollected: savedStats.totalCatsCollected ?? 0,
          totalCoinsEarned: savedStats.totalCoinsEarned ?? 0,
          highestDogDefeated: savedStats.highestDogDefeated ?? -1,
          totalMerges: savedStats.totalMerges ?? 0,
        },
        lastDailyReward: d.lastDailyReward ?? 0,
        dailyStreak: d.dailyStreak ?? 0,
        tutorialCompleted: d.tutorialCompleted ?? false,
        hintsSeen: d.hintsSeen ?? [],
        trainingCooldowns: d.trainingCooldowns ?? {},
        inventory: d.inventory ?? {},
        completedEventRewards: d.completedEventRewards ?? [],
        frenzyStreak: d.frenzyStreak ?? 0,
        lastFrenzyParticipation: d.lastFrenzyParticipation ?? '',
        junglePassUnlocked: d.junglePassUnlocked ?? false,
        jungleRun: d.jungleRun ? {
          ...d.jungleRun,
          activeBoons: d.jungleRun.activeBoons ?? [],
          stageResults: d.jungleRun.stageResults ?? [],
          currentBoonOffering: d.jungleRun.currentBoonOffering ?? null,
          consecutiveAllCommonOfferings: d.jungleRun.consecutiveAllCommonOfferings ?? 0,
          prngCallCount: d.jungleRun.prngCallCount ?? 0,
          bossRevived: d.jungleRun.bossRevived ?? {},
          startedAt: d.jungleRun.startedAt ?? Date.now(),
        } : null,
        jungleStats: {
          ...createInitialJungleStats(),
          ...(d.jungleStats ?? {}),
          bossesDefeated: d.jungleStats?.bossesDefeated ?? [],
          maxFlawlessStages: d.jungleStats?.maxFlawlessStages ?? 0,
        },
        unlockedJungleMedals: d.unlockedJungleMedals ?? [],
        jungleAnnouncementShown: d.jungleAnnouncementShown ?? false,
        jungleTabVisited: d.jungleTabVisited ?? false,
      })
      syncFlags.stateLoaded = true

      // Push the loaded volume levels into sound.ts, whose module-level values are
      // the source of truth for playback. Without this the saved volumes would not
      // survive a reload (sound.ts would keep its defaults). soundEnabled/musicEnabled
      // need no equivalent — they are read reactively by the UI, not held in sound.ts.
      applySfxVolume(d.sfxVolume ?? 0.5)
      applyMusicVolume(d.musicVolume ?? 0.2)

      // A legacy blob was migrated in-memory; persist the upgrade so the stored
      // data carries saveVersion (and the normalized shape) from now on.
      if (parsed.migrated) get().save()

      // If jungle pass not unlocked, check Firebase for a verified payment (handles cross-device/recovery)
      if (!(d.junglePassUnlocked ?? false)) {
        setTimeout(() => get().checkPaymentStatus(), 1000)
      }
    } catch (error) {
      console.error('Failed to load save data:', error)
    }
  },

  clearSaveError: ()=> set({ saveError: null }),

  clearCloudSyncError: ()=> set({ cloudSyncError: null }),

  checkPaymentStatus: async ()=> {
    const s = get()
    if (s.junglePassUnlocked) return true

    const profilesData = getProfilesData()
    const profileId = profilesData.activeProfileId
    if (!profileId) return false

    try {
      const { database, ref: fbRef, get: fbGet } = await getDb()
      const snapshot = await fbGet(fbRef(database, `payments/${profileId}`))
      if (!snapshot.exists()) return false

      const payments = snapshot.val() as Record<string, { product?: string; status?: string }>
      const hasJunglePass = Object.values(payments).some(
        (p) => p.product === 'jungle-pass' && p.status === 'succeeded'
      )

      if (hasJunglePass) {
        set({ junglePassUnlocked: true, junglePassPending: false })
        get().save()
        return true
      }
      return false
    } catch {
      return false
    }
  },
})
