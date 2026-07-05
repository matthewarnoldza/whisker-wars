// Single source of truth for all rarity-based styling.
// Import the canonical `RARITY` map (or the derived helpers below) instead of
// re-declaring rarity colors in components. The legacy `RARITY_*` record
// exports are kept as thin projections of `RARITY` so existing importers keep
// working while later waves migrate to the canonical map.

import type { Rarity } from '../../game/data'

export type { Rarity }

/** Everything a consumer needs to render a rarity, in one place. */
export interface RarityStyle {
  /** Display label (matches the Rarity name). */
  label: Rarity
  /** Sort weight, ascending Common(0) → Mythical(5). */
  order: number
  /** Tailwind text color class. */
  text: string
  /** Tailwind `from-*`/`to-*` gradient stops (pair with `bg-gradient-to-*`). */
  gradient: string
  /** Tailwind border color class. */
  border: string
  /** Tailwind drop-shadow glow class (for images/cards). */
  glow: string
  /** Tailwind box-shadow glow class (for panels/tiles). */
  boxShadow: string
  /** Primary hex — for non-Tailwind consumers (canvas particles, SVG). */
  hex: string
  /** RGB triplet of `hex`, for `rgba(...)` composition. */
  rgb: [number, number, number]
  /** Distinct symbol per rarity — colorblind-safe shape language. */
  shape: string
}

// Ordered tiers, derived from the Rarity union in game/data.ts.
export const RARITY_TIERS: Rarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythical',
]

/** Canonical rarity table — the one source every consumer should read. */
export const RARITY: Record<Rarity, RarityStyle> = {
  Common: {
    label: 'Common',
    order: 0,
    text: 'text-slate-400',
    gradient: 'from-slate-500 to-slate-600',
    border: 'border-slate-500/40',
    glow: 'drop-shadow-[0_0_15px_rgba(148,163,184,0.6)]',
    boxShadow: '',
    hex: '#94a3b8',
    rgb: [148, 163, 184],
    shape: '●',
  },
  Uncommon: {
    label: 'Uncommon',
    order: 1,
    text: 'text-green-400',
    gradient: 'from-green-500 to-emerald-600',
    border: 'border-green-500/40',
    glow: 'drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]',
    boxShadow: 'shadow-[0_0_12px_rgba(34,197,94,0.2)]',
    hex: '#22c55e',
    rgb: [34, 197, 94],
    shape: '▲',
  },
  Rare: {
    label: 'Rare',
    order: 2,
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-600',
    border: 'border-blue-500/40',
    glow: 'drop-shadow-[0_0_25px_rgba(59,130,246,0.9)]',
    boxShadow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    hex: '#3b82f6',
    rgb: [59, 130, 246],
    shape: '◆',
  },
  Epic: {
    label: 'Epic',
    order: 3,
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-fuchsia-600',
    border: 'border-purple-500/40',
    glow: 'drop-shadow-[0_0_30px_rgba(168,85,247,1)]',
    boxShadow: 'shadow-[0_0_16px_rgba(168,85,247,0.3)]',
    hex: '#a855f7',
    rgb: [168, 85, 247],
    shape: '★',
  },
  Legendary: {
    label: 'Legendary',
    order: 4,
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-600',
    border: 'border-amber-500/40',
    glow: 'drop-shadow-[0_0_35px_rgba(251,146,60,1.2)]',
    boxShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    hex: '#f59e0b',
    rgb: [245, 158, 11],
    shape: '✦',
  },
  Mythical: {
    label: 'Mythical',
    order: 5,
    text: 'text-red-400',
    gradient: 'from-red-600 to-rose-700',
    border: 'border-red-500/40',
    glow: 'drop-shadow-[0_0_40px_rgba(239,68,68,1.3)]',
    boxShadow: 'shadow-[0_0_24px_rgba(239,68,68,0.4)]',
    hex: '#ef4444',
    rgb: [239, 68, 68],
    shape: '❋',
  },
}

/**
 * Resolve a rarity's canonical style, defaulting to Common for unknown values.
 * @param rarity Rarity name (loosely typed for legacy call sites).
 */
export function rarityStyle(rarity: string | undefined | null): RarityStyle {
  return RARITY[(rarity as Rarity)] ?? RARITY.Common
}

// ── Derived legacy projections ───────────────────────────────────────────────
// Kept so existing importers (GameCard, Inventory, Collection, JungleRunView,
// modals…) compile unchanged. Prefer `RARITY` / `rarityStyle` in new code.

const project = <T>(pick: (s: RarityStyle) => T): Record<Rarity, T> =>
  RARITY_TIERS.reduce((acc, r) => {
    acc[r] = pick(RARITY[r])
    return acc
  }, {} as Record<Rarity, T>)

export const RARITY_GRADIENTS: Record<string, string> = project((s) => s.gradient)
export const RARITY_GLOWS: Record<string, string> = project((s) => s.glow)
export const RARITY_BORDERS: Record<string, string> = project((s) => s.border)
export const RARITY_TEXT_COLORS: Record<string, string> = project((s) => s.text)
export const RARITY_BOX_SHADOWS: Record<string, string> = project((s) => s.boxShadow)
export const RARITY_ORDER: Record<string, number> = project((s) => s.order)
export const RARITY_SHAPES: Record<string, string> = project((s) => s.shape)
export const RARITY_HEX: Record<string, string> = project((s) => s.hex)
