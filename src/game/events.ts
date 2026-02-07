import type { Dog } from './data'

export interface GameEvent {
  id: string
  name: string
  description: string
  icon: string
  startMonth: number // 1-12
  startDay: number
  endMonth: number
  endDay: number
  themeGradient: string // tailwind gradient classes
  borderColor: string
  eventDog: Dog // Special event boss
  coinReward: number
  baitReward?: string // bait id to award
  coinMultiplier: number // e.g. 1.5 = 50% more coins from battles
}

export const EVENTS: GameEvent[] = [
  {
    id: 'valentines-2025',
    name: "Valentine's Day",
    description: 'Love is in the air! Defeat Cupid Corgi for bonus rewards. All battle coins x1.5!',
    icon: '💝',
    startMonth: 2, startDay: 10,
    endMonth: 2, endDay: 16,
    themeGradient: 'from-pink-500/30 to-rose-500/30',
    borderColor: 'border-pink-500/50',
    eventDog: {
      id: 'cupid-corgi', name: 'Cupid Corgi', health: 180, attack: 13,
      ability: { name: 'Love Arrow', description: 'Charms a cat, skipping their turn' },
      imageUrl: '/images/dogs/Slime Hound.png', // Reuse existing dog image
    },
    coinReward: 500,
    baitReward: 'starlight-salmon',
    coinMultiplier: 1.5,
  },
  {
    id: 'spring-festival',
    name: 'Spring Festival',
    description: 'Spring blooms bring new challenges! Defeat the Blossom Beast. All battle coins x1.25!',
    icon: '🌸',
    startMonth: 3, startDay: 20,
    endMonth: 3, endDay: 27,
    themeGradient: 'from-green-500/30 to-emerald-500/30',
    borderColor: 'border-green-500/50',
    eventDog: {
      id: 'blossom-beast', name: 'Blossom Beast', health: 200, attack: 14,
      ability: { name: 'Petal Storm', description: 'Damages all cats with razor petals' },
      imageUrl: '/images/dogs/Echo Howler.png',
    },
    coinReward: 500,
    baitReward: 'cosmic-tuna',
    coinMultiplier: 1.25,
  },
  {
    id: 'summer-sizzle',
    name: 'Summer Sizzle',
    description: 'The heat is on! Take down the Solar Hound for sizzling rewards. All battle coins x1.5!',
    icon: '☀️',
    startMonth: 6, startDay: 21,
    endMonth: 6, endDay: 28,
    themeGradient: 'from-yellow-500/30 to-orange-500/30',
    borderColor: 'border-yellow-500/50',
    eventDog: {
      id: 'solar-hound', name: 'Solar Hound', health: 220, attack: 14,
      ability: { name: 'Solar Flare', description: 'Burns all cats over time' },
      imageUrl: '/images/dogs/Magma Beast.png',
    },
    coinReward: 600,
    baitReward: 'void-venison',
    coinMultiplier: 1.5,
  },
  {
    id: 'friday-13th',
    name: 'Friday the 13th',
    description: 'An unlucky day... or is it? Defeat the Shadow Mutt for dark rewards!',
    icon: '🖤',
    startMonth: 0, startDay: 13, // Special: any Friday the 13th
    endMonth: 0, endDay: 13,
    themeGradient: 'from-slate-600/30 to-slate-800/30',
    borderColor: 'border-slate-500/50',
    eventDog: {
      id: 'shadow-mutt', name: 'Shadow Mutt', health: 190, attack: 14,
      ability: { name: 'Bad Luck Curse', description: 'Reduces all dice rolls by 2' },
      imageUrl: '/images/dogs/Shadow Stalker.png',
    },
    coinReward: 666,
    coinMultiplier: 1.0,
  },
  {
    id: 'halloween',
    name: 'Halloween',
    description: 'Spooky season! Defeat the Ghost Hound for treat-filled rewards. All battle coins x1.5!',
    icon: '🎃',
    startMonth: 10, startDay: 25,
    endMonth: 10, endDay: 31,
    themeGradient: 'from-orange-500/30 to-purple-500/30',
    borderColor: 'border-orange-500/50',
    eventDog: {
      id: 'ghost-hound', name: 'Ghost Hound', health: 250, attack: 15,
      ability: { name: 'Phantom Howl', description: 'Phases through shields and armor' },
      imageUrl: '/images/dogs/Void Walker.png',
    },
    coinReward: 750,
    baitReward: 'aurora-anchovy',
    coinMultiplier: 1.5,
  },
  {
    id: 'winter-wonderland',
    name: 'Winter Wonderland',
    description: 'A frosty challenge awaits! Defeat the Blizzard Wolf for legendary rewards. All battle coins x2!',
    icon: '❄️',
    startMonth: 12, startDay: 20,
    endMonth: 1, endDay: 2,
    themeGradient: 'from-cyan-500/30 to-blue-500/30',
    borderColor: 'border-cyan-500/50',
    eventDog: {
      id: 'blizzard-wolf', name: 'Blizzard Wolf', health: 280, attack: 16,
      ability: { name: 'Absolute Zero', description: 'Freezes a random cat each turn' },
      imageUrl: '/images/dogs/Frost Wolf.png',
    },
    coinReward: 1000,
    baitReward: 'mythic-mackerel',
    coinMultiplier: 2.0,
  },
]

// ===== Feline Frenzy Friday =====

export type FrenzyElement = 'FIRE' | 'ICE' | 'EARTH' | 'LIGHTNING' | 'SHADOW'

const ELEMENT_ROTATION: FrenzyElement[] = ['FIRE', 'ICE', 'EARTH', 'LIGHTNING', 'SHADOW']

const FRENZY_DOGS: Dog[] = [
  {
    id: 'ember-drake', name: 'Ember Drake', health: 120, attack: 11,
    ability: { name: 'Inferno Breath', description: 'Burns a cat for 4 dmg/turn for 2 turns' },
    imageUrl: '/images/events/dogs/Ember Drake.png',
  },
  {
    id: 'glacial-howler', name: 'Glacial Howler', health: 130, attack: 10,
    ability: { name: 'Permafrost Howl', description: 'Freezes a random cat, skipping their next turn' },
    imageUrl: '/images/events/dogs/Glacial Howler.png',
  },
  {
    id: 'granite-colossus', name: 'Granite Colossus', health: 150, attack: 9,
    ability: { name: 'Tectonic Slam', description: 'Damages all cats for 40% ATK and gains 3 armor' },
    imageUrl: '/images/events/dogs/Granite Colossus.png',
  },
  {
    id: 'voltfang-warden', name: 'Voltfang Warden', health: 110, attack: 12,
    ability: { name: 'Chain Lightning', description: 'Chains to 1 other cat for 60% damage' },
    imageUrl: '/images/events/dogs/Voltfang Warden.png',
  },
  {
    id: 'obsidian-shade', name: 'Obsidian Shade', health: 115, attack: 11,
    ability: { name: 'Soul Siphon', description: 'Steals 30% of damage dealt as HP, 20% dodge chance' },
    imageUrl: '/images/events/dogs/Obsidian Shade.png',
  },
]

export const FRENZY_STONES = [
  { id: 'emberstone', name: 'Emberstone', element: 'FIRE' as FrenzyElement },
  { id: 'froststone', name: 'Froststone', element: 'ICE' as FrenzyElement },
  { id: 'terrastone', name: 'Terrastone', element: 'EARTH' as FrenzyElement },
  { id: 'stormstone', name: 'Stormstone', element: 'LIGHTNING' as FrenzyElement },
  { id: 'voidstone', name: 'Voidstone', element: 'SHADOW' as FrenzyElement },
]

const ELEMENT_THEMES: Record<FrenzyElement, { gradient: string; border: string; icon: string }> = {
  FIRE:      { gradient: 'from-red-500/30 to-orange-500/30',    border: 'border-red-500/50',    icon: '🔥' },
  ICE:       { gradient: 'from-blue-400/30 to-cyan-400/30',     border: 'border-cyan-500/50',   icon: '❄️' },
  EARTH:     { gradient: 'from-amber-600/30 to-yellow-700/30',  border: 'border-amber-500/50',  icon: '🪨' },
  LIGHTNING: { gradient: 'from-yellow-400/30 to-amber-300/30',  border: 'border-yellow-500/50', icon: '⚡' },
  SHADOW:    { gradient: 'from-purple-500/30 to-violet-600/30', border: 'border-purple-500/50', icon: '🌑' },
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getActiveElement(date: Date = new Date()): FrenzyElement {
  return ELEMENT_ROTATION[getISOWeekNumber(date) % 5]
}

export function getScaledFrenzyDog(baseDog: Dog, dogIndex: number, difficultyLevel: number): Dog {
  const progressionMultiplier = 1 + (dogIndex / 15) * 0.5
  const difficultyMultiplier = 1 + difficultyLevel * 0.5
  const mult = progressionMultiplier * difficultyMultiplier
  return {
    ...baseDog,
    health: Math.floor(baseDog.health * mult),
    attack: Math.floor(baseDog.attack * mult),
  }
}

/** Get the Feline Frenzy Friday event if it's Friday, or null otherwise */
export function getFrenzyEvent(): GameEvent | null {
  const now = new Date()
  if (now.getDay() !== 5) return null // Not Friday
  const element = getActiveElement(now)
  const idx = ELEMENT_ROTATION.indexOf(element)
  const theme = ELEMENT_THEMES[element]
  const dog = FRENZY_DOGS[idx]
  const stone = FRENZY_STONES[idx]
  return {
    id: 'feline-frenzy',
    name: 'Feline Frenzy Friday',
    description: `This week: ${element}! Defeat ${dog.name} for a chance at ${stone.name}!`,
    icon: theme.icon,
    startMonth: 0, startDay: 0,
    endMonth: 0, endDay: 0,
    themeGradient: theme.gradient,
    borderColor: theme.border,
    eventDog: dog,
    coinReward: 200,
    coinMultiplier: 1.25,
  }
}

/** Check if an event is currently active */
function isEventActive(event: GameEvent, now: Date): boolean {
  const month = now.getMonth() + 1 // 1-12
  const day = now.getDate()
  const dayOfWeek = now.getDay() // 0 = Sunday, 5 = Friday

  // Special case: Friday the 13th
  if (event.id === 'friday-13th') {
    return dayOfWeek === 5 && day === 13
  }

  // Handle year-wrap (e.g., Dec 20 - Jan 2)
  if (event.endMonth < event.startMonth) {
    // Active if we're in the tail end (Jan) or the start (Dec)
    if (month === event.endMonth && day <= event.endDay) return true
    if (month === event.startMonth && day >= event.startDay) return true
    if (month > event.startMonth || month < event.endMonth) return true
    return false
  }

  // Normal date range
  if (month < event.startMonth || month > event.endMonth) return false
  if (month === event.startMonth && day < event.startDay) return false
  if (month === event.endMonth && day > event.endDay) return false
  return true
}

/** Get all currently active events (including Feline Frenzy on Fridays) */
export function getActiveEvents(): GameEvent[] {
  const now = new Date()
  const events = EVENTS.filter(e => isEventActive(e, now))
  const frenzy = getFrenzyEvent()
  if (frenzy) events.push(frenzy)
  return events
}

/** Get a unique key for the current occurrence of an event (to track per-period completion) */
export function getEventPeriodKey(event: GameEvent): string {
  const now = new Date()
  const year = now.getFullYear()
  if (event.id === 'feline-frenzy') {
    return `feline-frenzy-${year}-w${getISOWeekNumber(now)}`
  }
  if (event.id === 'friday-13th') {
    return `${event.id}-${year}-${now.getMonth() + 1}`
  }
  return `${event.id}-${year}`
}

/** Get the active coin multiplier (highest among active events) */
export function getActiveCoinMultiplier(): number {
  const active = getActiveEvents()
  if (active.length === 0) return 1.0
  return Math.max(...active.map(e => e.coinMultiplier))
}
