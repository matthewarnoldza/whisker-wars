// Composed GameState type = intersection of the four slice interfaces.
//
// Each slice imports this (type-only) for its StateCreator generic, so get()/set()
// see the whole store; this file imports the slice interfaces. The cycle is
// type-only and erased at compile time, so there is no runtime import edge.

import type { CoreSlice } from './coreSlice'
import type { JungleSlice } from './jungleSlice'
import type { ProfilesSlice } from './profilesSlice'
import type { SyncSlice } from './syncSlice'

export type GameState = CoreSlice & JungleSlice & ProfilesSlice & SyncSlice
