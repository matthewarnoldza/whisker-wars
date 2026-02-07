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

/** Get all currently active events */
export function getActiveEvents(): GameEvent[] {
  const now = new Date()
  return EVENTS.filter(e => isEventActive(e, now))
}

/** Get a unique key for the current occurrence of an event (to track per-period completion) */
export function getEventPeriodKey(event: GameEvent): string {
  const now = new Date()
  const year = now.getFullYear()
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
