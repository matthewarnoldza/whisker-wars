import { database, ref, set, get } from './firebase'
import { query, orderByChild, limitToLast } from 'firebase/database'

export interface JungleLeaderboardEntry {
  name: string
  cloudCode: string
  bestScore: number
  highestStage: number
  totalClears: number
  fastestClearMs: number | null
  updatedAt: number
}

export type JungleLeaderboardCategory = 'bestScore' | 'highestStage' | 'totalClears' | 'fastestClear'

export const JUNGLE_LEADERBOARD_CATEGORIES: {
  key: JungleLeaderboardCategory
  label: string
  icon: string
  format: (v: number | null) => string
}[] = [
  { key: 'bestScore', label: 'Best Score', icon: '🏆', format: (v) => `${v ?? 0}` },
  { key: 'highestStage', label: 'Highest Stage', icon: '🌿', format: (v) => `Stage ${v ?? 0}` },
  { key: 'totalClears', label: 'Total Clears', icon: '🎯', format: (v) => `${v ?? 0}` },
  {
    key: 'fastestClear',
    label: 'Fastest Clear',
    icon: '⚡',
    format: (v) => {
      if (v == null || v <= 0) return '--'
      const totalSec = Math.floor(v / 1000)
      const min = Math.floor(totalSec / 60)
      const sec = totalSec % 60
      return `${min}m ${sec}s`
    },
  },
]

/** Upload jungle run stats to the leaderboard */
export async function uploadJungleLeaderboardStats(
  cloudCode: string,
  name: string,
  stats: {
    bestScore: number
    highestStage: number
    totalClears: number
    fastestClearMs: number | null
  }
): Promise<void> {
  try {
    const entry: JungleLeaderboardEntry = {
      name,
      cloudCode,
      ...stats,
      updatedAt: Date.now(),
    }
    await set(ref(database, `jungleLeaderboard/${cloudCode}`), entry)
  } catch (error) {
    console.error('Failed to upload jungle leaderboard stats:', error)
  }
}

/** Fetch top entries for a jungle leaderboard category */
export async function fetchJungleLeaderboard(
  category: JungleLeaderboardCategory,
  limit: number = 50
): Promise<JungleLeaderboardEntry[]> {
  try {
    // Map category key to the actual field stored in Firebase
    const orderField = category === 'fastestClear' ? 'fastestClearMs' : category
    const leaderboardRef = ref(database, 'jungleLeaderboard')
    const q = query(leaderboardRef, orderByChild(orderField), limitToLast(limit))
    const snapshot = await get(q)

    if (!snapshot.exists()) return []

    const entries: JungleLeaderboardEntry[] = []
    snapshot.forEach((child) => {
      entries.push(child.val() as JungleLeaderboardEntry)
    })

    // Sort descending for score/stage/clears, ascending for fastest clear
    if (category === 'fastestClear') {
      // Filter out nulls and sort ascending (lower is better)
      return entries
        .filter((e) => e.fastestClearMs != null && e.fastestClearMs > 0)
        .sort((a, b) => (a.fastestClearMs ?? Infinity) - (b.fastestClearMs ?? Infinity))
    }

    entries.sort((a, b) => {
      const aVal = a[orderField as keyof JungleLeaderboardEntry] as number
      const bVal = b[orderField as keyof JungleLeaderboardEntry] as number
      return bVal - aVal
    })
    return entries
  } catch (error) {
    console.error('Failed to fetch jungle leaderboard:', error)
    return []
  }
}
