# Fix Save/Load & Profile Bugs in Whisker Wars

## Context
Players are experiencing data loss (cats and game progress not persisting across reloads) and duplicate profiles appearing in the UI when switching profiles. After thorough code review, I found 7 bugs in the save/load and profile management system, all centered in the Zustand store.

## Files to Modify
- [store.ts](src/game/store.ts) - 6 fixes (save, load, createProfile)
- [App.tsx](src/ui/App.tsx) - 1 fix (double load removal)

---

## Fixes (ordered by severity)

### 1. Profile ID Collision (causes duplicate profiles)
**[store.ts:675](src/game/store.ts#L675)** - `createProfile` uses `profiles.length + 1` for IDs. After deleting a profile, new profiles can collide with existing IDs (e.g., delete profile-2, create new one = another profile-3).

**Fix:** Use `crypto.randomUUID()` for profile IDs instead of array length counter.

### 2. Falsy-check bug corrupts coin data
**[store.ts:637](src/game/store.ts#L637)** - `load()` uses `d.coins || 120`. If coins are `0`, this resets them to `120` because `0` is falsy.

**Fix:** Replace all `||` with `??` (nullish coalescing) in the entire `load()` set block (lines 637-656). This affects `coins`, `baits`, `owned`, `dogIndex`, `difficultyLevel`, `favorites`, `theme`, all stats fields, `lastDailyReward`, `tutorialCompleted`, and `trainingCooldowns`.

### 3. Missing fields in save (data loss)
**[store.ts:595-608](src/game/store.ts#L595-L608)** - `save()` payload omits `soundEnabled` and `selectedForBattle`. Both reset to defaults on every reload.

**Fix:** Add both fields to the `save()` payload and corresponding `??` fallbacks in `load()`.

### 4. New profile not immediately saved
**[store.ts:673-686](src/game/store.ts#L673-L686)** - `createProfile()` writes metadata but never writes game state to localStorage. If browser closes within 5s (before auto-save), profile data is lost.

**Fix:** After creating metadata, set as active profile, reset to initial game state, and call `save()`.

### 5. Double load on profile selection
**[App.tsx:461](src/ui/App.tsx#L461)** - `onProfileSelected` callback calls `load()`, but `loadProfile()` in ProfileSelector already called `load()` internally. Redundant state churn.

**Fix:** Remove the `load()` call from `onProfileSelected` callback in App.tsx.

### 6. Owned cat data not validated on load
**[store.ts:639](src/game/store.ts#L639)** - Cats loaded from JSON may lack optional fields (`totalBattles`, `totalWins`, `isElite`, `eliteTier`). UI code has scattered `|| 0` fallbacks but this is fragile.

**Fix:** Normalize cat data at load time with a `.map()` that provides defaults for all optional fields.

### 7. Silent error handling
**[store.ts:658](src/game/store.ts#L658)** - Empty `catch {}` block swallows all JSON parse errors silently. Corrupted saves fail with no indication.

**Fix:** Add `console.error` logging in the catch block.

---

## Verification
1. Create 3 profiles, delete middle one, create new one - verify no duplicate IDs in localStorage
2. Spend all coins to 0, reload - verify coins stay at 0 (not 120)
3. Select battle cats, toggle sound off, reload - verify both persist
4. Create new profile, close tab immediately, reopen - verify profile has initial game state
5. Switch profiles via selector - verify no double-load in console, daily reward still works
6. Corrupt a profile's JSON in DevTools, reload - verify console.error appears
