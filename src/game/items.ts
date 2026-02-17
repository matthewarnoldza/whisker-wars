export interface Equipment {
  id: string
  name: string
  slot: 'weapon' | 'accessory'
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  atkBonus: number
  hpBonus: number
  description: string
  cost: number // Shop price (0 = drop only)
  iconUrl: string
}

export const EQUIPMENT: Equipment[] = [
  // Common Weapons
  { id: 'wooden-claws', name: 'Wooden Claws', slot: 'weapon', rarity: 'Common', atkBonus: 1, hpBonus: 0, description: '+1 ATK', cost: 50, iconUrl: '/images/equipment/Wooden claws.png' },
  { id: 'iron-claws', name: 'Iron Claws', slot: 'weapon', rarity: 'Common', atkBonus: 2, hpBonus: 0, description: '+2 ATK', cost: 100, iconUrl: '/images/equipment/Iron claws.png' },

  // Common Accessories
  { id: 'leather-collar', name: 'Leather Collar', slot: 'accessory', rarity: 'Common', atkBonus: 0, hpBonus: 3, description: '+3 HP', cost: 50, iconUrl: '/images/equipment/Leather collar.png' },
  { id: 'bell-charm', name: 'Bell Charm', slot: 'accessory', rarity: 'Common', atkBonus: 0, hpBonus: 5, description: '+5 HP', cost: 100, iconUrl: '/images/equipment/Bell charm.png' },

  // Uncommon
  { id: 'steel-claws', name: 'Steel Claws', slot: 'weapon', rarity: 'Uncommon', atkBonus: 3, hpBonus: 0, description: '+3 ATK', cost: 200, iconUrl: '/images/equipment/Steel claws.png' },
  { id: 'silver-pendant', name: 'Silver Pendant', slot: 'accessory', rarity: 'Uncommon', atkBonus: 1, hpBonus: 5, description: '+1 ATK, +5 HP', cost: 200, iconUrl: '/images/equipment/Silver pendant.png' },

  // Rare
  { id: 'crystal-claws', name: 'Crystal Claws', slot: 'weapon', rarity: 'Rare', atkBonus: 4, hpBonus: 2, description: '+4 ATK, +2 HP', cost: 400, iconUrl: '/images/equipment/Crystal claws.png' },
  { id: 'mystic-amulet', name: 'Mystic Amulet', slot: 'accessory', rarity: 'Rare', atkBonus: 2, hpBonus: 8, description: '+2 ATK, +8 HP', cost: 400, iconUrl: '/images/equipment/Mystical amulet.png' },

  // Epic
  { id: 'void-talons', name: 'Void Talons', slot: 'weapon', rarity: 'Epic', atkBonus: 6, hpBonus: 3, description: '+6 ATK, +3 HP', cost: 800, iconUrl: '/images/equipment/Void talons.png' },
  { id: 'stardust-collar', name: 'Stardust Collar', slot: 'accessory', rarity: 'Epic', atkBonus: 3, hpBonus: 12, description: '+3 ATK, +12 HP', cost: 800, iconUrl: '/images/equipment/Stardust collar.png' },

  // Legendary (drop only from high-tier dogs)
  { id: 'infernal-fangs', name: 'Infernal Fangs', slot: 'weapon', rarity: 'Legendary', atkBonus: 8, hpBonus: 5, description: '+8 ATK, +5 HP', cost: 0, iconUrl: '/images/equipment/Infernal fangs.png' },
  { id: 'celestial-crown', name: 'Celestial Crown', slot: 'accessory', rarity: 'Legendary', atkBonus: 5, hpBonus: 15, description: '+5 ATK, +15 HP', cost: 0, iconUrl: '/images/equipment/Celestial crown.png' },
]

// ===== Elemental Stones (Feline Frenzy Friday drops) =====

export interface Stone {
  id: string
  name: string
  element: string
  effect: string
  iconUrl: string
}

export const STONES: Stone[] = [
  { id: 'emberstone', name: 'Emberstone', element: 'FIRE', effect: '3x damage + burn (3 dmg/turn for 2 turns)', iconUrl: '/images/events/stones/Emberstone.png' },
  { id: 'froststone', name: 'Froststone', element: 'ICE', effect: '2x damage + freeze (enemy skips next turn)', iconUrl: '/images/events/stones/Froststone.png' },
  { id: 'terrastone', name: 'Terrastone', element: 'EARTH', effect: '2x damage + rock shield (blocks next hit)', iconUrl: '/images/events/stones/Terrastone.png' },
  { id: 'stormstone', name: 'Stormstone', element: 'LIGHTNING', effect: 'Double strike + guaranteed crit on first', iconUrl: '/images/events/stones/Stormstone.png' },
  { id: 'voidstone', name: 'Voidstone', element: 'SHADOW', effect: '2.5x damage + 100% lifesteal', iconUrl: '/images/events/stones/Voidstone.png' },
]

/** Roll for stone drop from Feline Frenzy Friday (50% base chance + optional streak bonus) */
export function rollStoneDrop(element: string, bonusChance: number = 0): Stone | null {
  const totalChance = Math.min(1.0, 0.50 + bonusChance)
  if (Math.random() > totalChance) return null
  return STONES.find(s => s.element === element) ?? null
}

/** Check if an item ID is a stone */
export function isStone(itemId: string): boolean {
  return STONES.some(s => s.id === itemId)
}

/** Get total ATK and HP bonuses from equipped weapon + accessory */
export function getEquipmentBonuses(equipment?: { weapon?: string; accessory?: string }): { atkBonus: number; hpBonus: number } {
  if (!equipment) return { atkBonus: 0, hpBonus: 0 }
  const weapon = equipment.weapon ? EQUIPMENT.find(e => e.id === equipment.weapon) : null
  const accessory = equipment.accessory ? EQUIPMENT.find(e => e.id === equipment.accessory) : null
  return {
    atkBonus: (weapon?.atkBonus || 0) + (accessory?.atkBonus || 0),
    hpBonus: (weapon?.hpBonus || 0) + (accessory?.hpBonus || 0),
  }
}

/** Get possible equipment drops for a given dog index (higher = better loot) */
export function getEquipmentDropPool(dogIndex: number): Equipment[] {
  if (dogIndex >= 12) return EQUIPMENT.filter(e => e.rarity === 'Legendary' || e.rarity === 'Epic')
  if (dogIndex >= 8) return EQUIPMENT.filter(e => e.rarity === 'Epic' || e.rarity === 'Rare')
  if (dogIndex >= 4) return EQUIPMENT.filter(e => e.rarity === 'Rare' || e.rarity === 'Uncommon')
  return EQUIPMENT.filter(e => e.rarity === 'Uncommon' || e.rarity === 'Common')
}

/** Roll for equipment drop (30% chance) */
export function rollEquipmentDrop(dogIndex: number): Equipment | null {
  if (Math.random() > 0.30) return null
  const pool = getEquipmentDropPool(dogIndex)
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
