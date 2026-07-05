// Shared accessible-dialog behavior, extracted from the Modal primitive so both
// the panel Modal and the game's full-screen celebration overlays share ONE
// implementation of the a11y contract:
//   • Escape always dismisses.
//   • Focus is moved into the dialog on open and TRAPPED (Tab cycles inside).
//   • Focus is RESTORED to the previously-focused element on close/unmount.
//   • `closeOnAnyKey` turns the dialog into a "press any key or tap to continue"
//     surface (the reward celebrations) — any non-modifier key dismisses.
//   • `lockScroll` freezes the body behind the overlay (celebrations).
//
// The hook owns behavior only; callers apply the returned `dialogProps`
// (role/aria-modal/tabIndex) plus their own `aria-label`/`aria-labelledby`.

import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export interface UseDialogOptions {
  /** Whether the dialog is currently open. Always-mounted overlays pass `true`. */
  isOpen?: boolean
  /** Dismiss handler (Escape, and — with `closeOnAnyKey` — any key). */
  onClose?: () => void
  /** "Press any key or tap to continue": any non-modifier key dismisses. */
  closeOnAnyKey?: boolean
  /** Freeze body scroll behind the overlay while open. */
  lockScroll?: boolean
}

export interface UseDialogReturn<T extends HTMLElement> {
  /** Attach to the dialog container. */
  dialogRef: React.RefObject<T>
  /** Spread onto the dialog element (compose with your own aria-label(ledby)). */
  dialogProps: {
    role: 'dialog'
    'aria-modal': true
    tabIndex: -1
  }
}

// Keys that must never trigger a "press any key" dismiss — they're chords/AT.
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])

export function useDialog<T extends HTMLElement = HTMLDivElement>({
  isOpen = true,
  onClose,
  closeOnAnyKey = false,
  lockScroll = false,
}: UseDialogOptions = {}): UseDialogReturn<T> {
  const dialogRef = useRef<T>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  // Move focus into the dialog on open; restore it on close/unmount.
  useEffect(() => {
    if (!isOpen) return
    restoreRef.current = (document.activeElement as HTMLElement) ?? null
    const node = dialogRef.current
    if (node) {
      const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE)
      const target = focusable[0] ?? node
      // rAF so the element exists after the enter animation mounts it.
      requestAnimationFrame(() => target.focus?.())
    }
    return () => {
      restoreRef.current?.focus?.()
    }
  }, [isOpen])

  // Escape → close (always). Any key → close (celebrations). Else trap Tab.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (closeOnAnyKey) {
        if (MODIFIER_KEYS.has(e.key)) return
        // Ignore OS key-repeat: a held Enter from the action that OPENED this
        // dialog (e.g. casting bait) must not instantly dismiss the celebration.
        if (e.repeat) return
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      const node = dialogRef.current
      if (!node) return
      const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusable.length === 0) {
        // Nothing focusable inside — keep focus on the dialog shell.
        e.preventDefault()
        node.focus?.()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      // Focus escaped the dialog (e.g. click on dead space) — pull it back in.
      if (!node.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
        return
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose, closeOnAnyKey])

  // Optional body scroll lock while open (celebration overlays).
  useEffect(() => {
    if (!isOpen || !lockScroll) return
    const scrollY = window.scrollY
    const body = document.body
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    return () => {
      body.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen, lockScroll])

  return {
    dialogRef,
    dialogProps: { role: 'dialog', 'aria-modal': true, tabIndex: -1 },
  }
}
