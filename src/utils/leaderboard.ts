import { getDb } from './firebase'

export interface LeaderboardEntry {
  name: string
  cloudCode: string
  totalWins: number
  highestDogDefeated: number
  collectionCompletion: number // unique cats count
  totalMerges: number
  updatedAt: number
}

export type LeaderboardCategory = 'totalWins' | 'highestDogDefeated' | 'collectionCompletion' | 'totalMerges'

export const LEADERBOARD_CATEGORIES: { key: LeaderboardCategory; label: string; icon: string; format: (v: number) => string }[] = [
  { key: 'totalWins', label: 'Total Wins', icon: '🏆', format: (v) => `${v}` },
  { key: 'highestDogDefeated', label: 'Highest Dog', icon: '🐕', format: (v) => `Dog ${v + 1}` },
  { key: 'collectionCompletion', label: 'Unique Cats', icon: '🐱', format: (v) => `${v}` },
  { key: 'totalMerges', label: 'Total Merges', icon: '🔮', format: (v) => `${v}` },
]

/** Upload player stats to the leaderboard */
export async function uploadLeaderboardStats(
  cloudCode: string,
  name: string,
  stats: {
    totalWins: number
    highestDogDefeated: number
    collectionCompletion: number
    totalMerges: number
  }
): Promise<boolean> {
  try {
    const { database, ref, set } = await getDb()
    const entry: LeaderboardEntry = {
      name,
      cloudCode,
      ...stats,
      updatedAt: Date.now()
    }
    await set(ref(database, `leaderboard/${cloudCode}`), entry)
    return true
  } catch (error) {
    console.error('Failed to upload leaderboard stats:', error)
    return false
  }
}

/** Fetch top entries for a leaderboard category */
export async function fetchLeaderboard(
  category: LeaderboardCategory,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  try {
    const { database, ref, get, query, orderByChild, limitToLast } = await getDb()
    const leaderboardRef = ref(database, 'leaderboard')
    const q = query(leaderboardRef, orderByChild(category), limitToLast(limit))
    const snapshot = await get(q)

    if (!snapshot.exists()) return []

    const entries: LeaderboardEntry[] = []
    snapshot.forEach((child) => {
      entries.push(child.val() as LeaderboardEntry)
    })

    // limitToLast returns ascending; reverse for descending rank
    entries.sort((a, b) => b[category] - a[category])
    return entries
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return []
  }
}
