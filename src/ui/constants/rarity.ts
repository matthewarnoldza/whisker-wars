// Single source of truth for all rarity-based styling
// Import from here instead of duplicating in each component

export const RARITY_GRADIENTS: Record<string, string> = {
  Common: 'from-slate-500 to-slate-600',
  Uncommon: 'from-green-500 to-emerald-600',
  Rare: 'from-blue-500 to-cyan-600',
  Epic: 'from-purple-500 to-fuchsia-600',
  Legendary: 'from-orange-500 to-amber-600',
  Mythical: 'from-red-600 to-rose-700',
}

export const RARITY_GLOWS: Record<string, string> = {
  Common: 'drop-shadow-[0_0_15px_rgba(148,163,184,0.6)]',
  Uncommon: 'drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]',
  Rare: 'drop-shadow-[0_0_25px_rgba(59,130,246,0.9)]',
  Epic: 'drop-shadow-[0_0_30px_rgba(168,85,247,1)]',
  Legendary: 'drop-shadow-[0_0_35px_rgba(251,146,60,1.2)]',
  Mythical: 'drop-shadow-[0_0_40px_rgba(239,68,68,1.3)]',
}

export const RARITY_BORDERS: Record<string, string> = {
  Common: 'border-slate-500/40',
  Uncommon: 'border-green-500/40',
  Rare: 'border-blue-500/40',
  Epic: 'border-purple-500/40',
  Legendary: 'border-amber-500/40',
  Mythical: 'border-red-500/40',
}

export const RARITY_TEXT_COLORS: Record<string, string> = {
  Common: 'text-slate-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-orange-400',
  Mythical: 'text-red-400',
}

export const RARITY_BOX_SHADOWS: Record<string, string> = {
  Common: '',
  Uncommon: 'shadow-[0_0_12px_rgba(34,197,94,0.2)]',
  Rare: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  Epic: 'shadow-[0_0_16px_rgba(168,85,247,0.3)]',
  Legendary: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
  Mythical: 'shadow-[0_0_24px_rgba(239,68,68,0.4)]',
}

export const RARITY_ORDER: Record<string, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythical: 5,
}
