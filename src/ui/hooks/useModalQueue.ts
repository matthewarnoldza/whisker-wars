// Ordered, single-at-a-time modal queue — the fix for the first-load
// "popup gauntlet" where DailyReward / WelcomeTutorial / FrenzyFriday /
// JungleAnnouncement each fired on independent setTimeouts and stacked on top
// of one another.
//
// Contract:
// - enqueue(id, priority): register a modal to show. Lower priority number wins
//   (shows first). Insertion order breaks ties (Array.prototype.sort is stable).
// - Exactly one modal is visible at a time (`current`). The next promotes only
//   after the visible one is dismissed, with a short breather in between.
// - Dedupe by id: an id that has already entered the system this session is
//   ignored on re-enqueue (protects against the load-effect / profile-callback
//   double-scheduling). Eligibility (already-shown flags, day checks) stays in
//   the caller — this hook only owns the *scheduling*.

import { useCallback, useEffect, useRef, useState } from 'react'

/** Breather between one modal closing and the next opening (ms). */
const BREATHER_MS = 250

/** Canonical priorities. Welcome tutorial first, then daily reward, then promos. */
export const MODAL_PRIORITY = {
  welcome: 0,
  daily: 1,
  frenzy: 2,
  jungle: 2,
} as const

interface QueueItem {
  id: string
  priority: number
}

export interface ModalQueue {
  /** The modal that should currently be visible, or null. */
  current: string | null
  /** Register a modal. No-op if this id already entered the queue this session. */
  enqueue: (id: string, priority: number) => void
  /** Close the current modal; the next (if any) opens after a short breather. */
  dismiss: () => void
}

export function useModalQueue(): ModalQueue {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [cooling, setCooling] = useState(false)
  // Ids that have ever entered the system — the dedupe ledger for the session.
  const registered = useRef<Set<string>>(new Set())
  const breatherTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enqueue = useCallback((id: string, priority: number) => {
    if (registered.current.has(id)) return
    registered.current.add(id)
    setQueue(prev =>
      [...prev, { id, priority }].sort((a, b) => a.priority - b.priority),
    )
  }, [])

  const dismiss = useCallback(() => {
    setCurrent(null)
    setCooling(true)
    if (breatherTimer.current) clearTimeout(breatherTimer.current)
    breatherTimer.current = setTimeout(() => setCooling(false), BREATHER_MS)
  }, [])

  // Promote the highest-priority queued modal once nothing is showing and the
  // breather has elapsed.
  useEffect(() => {
    if (current !== null || cooling || queue.length === 0) return
    const [next, ...rest] = queue
    setCurrent(next.id)
    setQueue(rest)
  }, [current, cooling, queue])

  useEffect(() => () => {
    if (breatherTimer.current) clearTimeout(breatherTimer.current)
  }, [])

  return { current, enqueue, dismiss }
}
