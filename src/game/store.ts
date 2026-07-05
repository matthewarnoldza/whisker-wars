// Compatibility entry point.
//
// The store was split into domain slices under ./store/ (coreSlice, jungleSlice,
// profilesSlice, syncSlice) composed in ./store/index.ts. This file preserves the
// original '../game/store' import path so every UI component and util keeps
// working unchanged — it re-exports the entire public surface (useGame plus the
// View / OwnedCat / Achievement / GameStats / ProfileMeta / ProfilesData types).

export * from './store/index'
