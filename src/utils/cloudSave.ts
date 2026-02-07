import { database, ref, set, get } from './firebase'
import type { ProfileMeta, OwnedCat, Achievement, GameStats } from '../game/store'

// Save data structure that gets stored in the cloud
export interface CloudSaveData {
  coins: number
  baits: Record<string, number>
  owned: OwnedCat[]
  dogIndex: number
  difficultyLevel: number
  favorites: string[]
  theme: 'light' | 'dark'
  achievements: Achievement[]
  stats: GameStats
  lastDailyReward: number
  tutorialCompleted: boolean
  trainingCooldowns: Record<string, number[]>
  selectedForBattle?: string[]
  dailyStreak?: number
  soundEnabled?: boolean
  musicEnabled?: boolean
  inventory?: Record<string, number>
  completedEventRewards?: string[]
  frenzyStreak?: number
  lastFrenzyParticipation?: string
}

export interface CloudSavePayload {
  data: CloudSaveData
  meta: {
    name: string
    created: number
    lastPlayed: number
  }
  savedAt: number
}

export interface DownloadResult {
  success: boolean
  data?: CloudSaveData
  meta?: { name: string; created: number; lastPlayed: number }
  error?: string
}

// Generate a readable 8-character code like "CAT-4829" or "MEOW-7281"
function generateSaveCode(): string {
  const prefixes = ['CAT', 'MEOW', 'PAW', 'PURR', 'WHSK', 'KITTY', 'CLAW', 'FUR']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const number = Math.floor(Math.random() * 9000) + 1000 // 1000-9999
  return `${prefix}-${number}`
}

// Check if a code already exists in the database
async function codeExists(code: string): Promise<boolean> {
  try {
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
  const payload: CloudSavePayload = {
    data: saveData,
    meta: {
      name: profileMeta.name,
      created: profileMeta.created,
      lastPlayed: profileMeta.lastPlayed
    },
    savedAt: Date.now()
  }

  // If we have an existing code, update it
  if (existingCode) {
    try {
      const normalizedCode = existingCode.trim().toUpperCase()
      await set(ref(database, `saves/${normalizedCode}`), payload)
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
      // Check if code already exists
      const exists = await codeExists(code)
      if (exists) {
        continue // Try another code
      }

      await set(ref(database, `saves/${code}`), payload)
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

  // Validate code format
  if (!/^[A-Z]+-\d{4}$/.test(normalizedCode)) {
    return { success: false, error: 'Invalid code format. Should look like CAT-1234' }
  }

  try {
    const snapshot = await get(ref(database, `saves/${normalizedCode}`))

    if (!snapshot.exists()) {
      return { success: false, error: 'Code not found. Check your code and try again.' }
    }

    const payload = snapshot.val() as CloudSavePayload

    // Validate the payload has required fields
    if (!payload.data || !payload.meta) {
      return { success: false, error: 'Save data is corrupted.' }
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
