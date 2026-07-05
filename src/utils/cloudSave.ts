import { getDb } from './firebase'
import type { ProfileMeta } from '../game/store'
import type { SaveData } from '../game/saveData'

// The game-state portion of a cloud record is the same versioned SaveData the
// local save uses (single source of truth), via buildSavePayload. It is kept
// backward-compatible with the legacy hand-built literals in the Save/Profile UI:
// those provide the historically-required core fields and may omit the rest, so
// everything outside that core stays optional here. buildSavePayload's full
// SaveData is a superset and remains assignable.
type RequiredCloudField =
  | 'coins' | 'baits' | 'owned' | 'dogIndex' | 'difficultyLevel' | 'favorites'
  | 'theme' | 'achievements' | 'stats' | 'lastDailyReward' | 'tutorialCompleted'
  | 'trainingCooldowns'

export type CloudSaveData = Partial<SaveData> & Pick<SaveData, RequiredCloudField>

export interface CloudSavePayload {
  data: CloudSaveData
  meta: {
    name: string
    created: number
    lastPlayed: number
  }
  savedAt: number
  // Secret owner token. Only a client holding the matching token may overwrite
  // this record. Legacy records saved before this field existed have no token.
  ownerToken?: string
}

export interface DownloadResult {
  success: boolean
  data?: CloudSaveData
  meta?: { name: string; created: number; lastPlayed: number }
  error?: string
}

// Cat-themed prefixes kept for charm.
const CODE_PREFIXES = ['CAT', 'MEOW', 'PAW', 'PURR', 'WHSK', 'KITTY', 'CLAW', 'FUR']
// Unambiguous alphabet: A-Z minus I and O, plus digits 2-9 (32 chars). With an
// 8-char random part that gives 32^8 (~1.1 trillion) combinations, making blind
// enumeration of other players' codes impractical.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// Generate a code like "PAW-K7M2XR4Q" (cat prefix + 8 random unambiguous chars).
function generateSaveCode(): string {
  const prefix = CODE_PREFIXES[Math.floor(Math.random() * CODE_PREFIXES.length)]
  // crypto RNG for an unguessable random part. 2^32 is an exact multiple of 32,
  // so `% CODE_ALPHABET.length` introduces no modulo bias.
  const bytes = new Uint32Array(8)
  crypto.getRandomValues(bytes)
  let random = ''
  for (let i = 0; i < 8; i++) {
    random += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return `${prefix}-${random}`
}

// New codes look like PREFIX-XXXXXXXX; legacy codes look like PREFIX-1234.
const NEW_CODE_RE = /^[A-Z]+-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
const LEGACY_CODE_RE = /^[A-Z]+-\d{4}$/

// Validate a save code, accepting BOTH the new and legacy formats.
export function isValidSaveCode(code: string): boolean {
  const normalized = code.trim().toUpperCase()
  return NEW_CODE_RE.test(normalized) || LEGACY_CODE_RE.test(normalized)
}

// Owner tokens are persisted per-code in localStorage (same namespace the rest of
// the app uses). They never leave the device except inside the uploaded record.
const OWNER_TOKEN_PREFIX = 'whiskerwars-owner-token-'

function getOwnerToken(code: string): string | null {
  try {
    return localStorage.getItem(`${OWNER_TOKEN_PREFIX}${code}`)
  } catch {
    return null
  }
}

function setOwnerToken(code: string, token: string): void {
  try {
    localStorage.setItem(`${OWNER_TOKEN_PREFIX}${code}`, token)
  } catch {
    // Ignore storage errors (e.g. private mode); overwrite protection degrades
    // gracefully to legacy behaviour rather than blocking saves.
  }
}

function buildPayload(
  saveData: CloudSaveData,
  profileMeta: ProfileMeta,
  ownerToken: string
): CloudSavePayload {
  return {
    data: saveData,
    meta: {
      name: profileMeta.name,
      created: profileMeta.created,
      lastPlayed: profileMeta.lastPlayed
    },
    savedAt: Date.now(),
    ownerToken
  }
}

// Check if a code already exists in the database
async function codeExists(code: string): Promise<boolean> {
  try {
    const { database, ref, get } = await getDb()
    const snapshot = await get(ref(database, `saves/${code}`))
    return snapshot.exists()
  } catch {
    return false
  }
}

// Upload save to cloud, returns the code
// If existingCode is provided, updates that code; otherwise generates a new one
export async function uploadSave(
  saveData: CloudSaveData,
  profileMeta: ProfileMeta,
  existingCode?: string
): Promise<{ success: boolean; code?: string; error?: string; isNew?: boolean }> {
  // If we have an existing code, update it (with overwrite protection).
  if (existingCode) {
    const normalizedCode = existingCode.trim().toUpperCase()
    try {
      const { database, ref, set, get } = await getDb()
      let ownerToken = getOwnerToken(normalizedCode)

      // Read the current record first so we can enforce ownership before writing.
      const snapshot = await get(ref(database, `saves/${normalizedCode}`))
      if (snapshot.exists()) {
        const existing = snapshot.val() as CloudSavePayload
        const remoteToken = existing?.ownerToken
        // A record already owned by someone else must not be overwritten.
        if (remoteToken && remoteToken !== ownerToken) {
          return {
            success: false,
            error: 'This save code belongs to another player, so it cannot be overwritten.'
          }
        }
        // Legacy record with no token: we claim it by writing our token below.
      }

      // First save from this device for this code: mint and persist a token.
      if (!ownerToken) {
        ownerToken = crypto.randomUUID()
        setOwnerToken(normalizedCode, ownerToken)
      }

      await set(ref(database, `saves/${normalizedCode}`), buildPayload(saveData, profileMeta, ownerToken))
      return { success: true, code: normalizedCode, isNew: false }
    } catch (error) {
      console.error('Failed to update existing code:', error)
      return { success: false, error: 'Could not update save. Please try again.' }
    }
  }

  // Otherwise, generate a new unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateSaveCode()

    try {
      const { database, ref, set } = await getDb()
      // Check if code already exists
      const exists = await codeExists(code)
      if (exists) {
        continue // Try another code
      }

      const ownerToken = crypto.randomUUID()
      await set(ref(database, `saves/${code}`), buildPayload(saveData, profileMeta, ownerToken))
      setOwnerToken(code, ownerToken)
      return { success: true, code, isNew: true }
    } catch (error) {
      // If this specific code failed, try another
      continue
    }
  }

  return { success: false, error: 'Could not generate a unique save code. Please try again.' }
}

// Download save from cloud using a code
export async function downloadSave(code: string): Promise<DownloadResult> {
  // Normalize the code: uppercase, remove extra spaces
  const normalizedCode = code.trim().toUpperCase()

  // Validate code format (accepts both new and legacy codes)
  if (!isValidSaveCode(normalizedCode)) {
    return { success: false, error: 'Invalid code format. Should look like PAW-K7M2XR4Q' }
  }

  try {
    const { database, ref, get } = await getDb()
    const snapshot = await get(ref(database, `saves/${normalizedCode}`))

    if (!snapshot.exists()) {
      return { success: false, error: 'Code not found. Check your code and try again.' }
    }

    const payload = snapshot.val() as CloudSavePayload

    // Validate the payload has required fields
    if (!payload.data || !payload.meta) {
      return { success: false, error: 'Save data is corrupted.' }
    }

    // Whoever holds a valid code is entitled to own it: cache the record's owner
    // token so this device can later save back to the code (multi-device restore).
    // This does not change what we return to callers.
    if (payload.ownerToken) {
      setOwnerToken(normalizedCode, payload.ownerToken)
    }

    return {
      success: true,
      data: payload.data,
      meta: payload.meta
    }
  } catch (error) {
    console.error('Cloud save download error:', error)
    return { success: false, error: 'Could not connect to cloud. Check your internet connection.' }
  }
}

// Preview save without loading it (for showing summary before restore)
export async function previewSave(code: string): Promise<{
  success: boolean
  preview?: {
    name: string
    savedAt: number
    catCount: number
    coins: number
  }
  error?: string
}> {
  const result = await downloadSave(code)

  if (!result.success || !result.data || !result.meta) {
    return { success: false, error: result.error }
  }

  return {
    success: true,
    preview: {
      name: result.meta.name,
      savedAt: result.meta.lastPlayed,
      catCount: result.data.owned?.length || 0,
      coins: result.data.coins || 0
    }
  }
}
