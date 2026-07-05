// Composed game store. The 1,600-line god-store was split into four domain slices
// (core / jungle / profiles / sync); this file composes them into a single
// create<GameState>() so the public surface (`useGame`, every field/action) is
// byte-for-byte identical to the old store.ts. All existing import paths keep
// working via the compatibility re-export in ../store.ts.

import { create } from 'zustand'
import { createCoreSlice } from './coreSlice'
import { createJungleSlice } from './jungleSlice'
import { createProfilesSlice } from './profilesSlice'
import { createSyncSlice } from './syncSlice'
import { syncFlags } from './shared'
import type { GameState } from './types'

// Re-export the public types that used to be declared inline in store.ts so
// `import type { View, OwnedCat, ... } from '../game/store'` keeps resolving.
export type { View, OwnedCat, Achievement, GameStats, ProfileMeta, ProfilesData } from './shared'
export type { GameState } from './types'

export const useGame = create<GameState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createJungleSlice(...a),
  ...createProfilesSlice(...a),
  ...createSyncSlice(...a),
}))

// ===== Module-level side effects (unchanged behaviour) =====
//
// Auto-save wiring. The window/document listeners are guarded with a typeof check
// so the store can be imported in a non-DOM (node/vitest) environment without
// throwing — the subscribe debounce and the listeners are otherwise identical to
// the original store.ts.

// Debounced auto-save: only saves when state actually changes
let saveTimeout: ReturnType<typeof setTimeout> | null = null
useGame.subscribe(() => {
  if (!syncFlags.stateLoaded) return // Don't schedule saves during init/profile switching
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    useGame.getState().save()
    saveTimeout = null
  }, 3000)
})

if (typeof document !== 'undefined') {
  // Save when page becomes hidden (tab switch, app switch, lid close)
  // Critical for Chromebooks which aggressively freeze tabs
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && syncFlags.stateLoaded) {
      useGame.getState().save()
    }
  })
}

if (typeof window !== 'undefined') {
  // Save when page is being unloaded (browser close, navigation)
  window.addEventListener('pagehide', () => {
    if (syncFlags.stateLoaded) useGame.getState().save()
  })

  // Redundant save on beforeunload (some browsers, especially older Firefox, don't fire pagehide reliably)
  window.addEventListener('beforeunload', () => {
    if (syncFlags.stateLoaded) useGame.getState().save()
  })
}
