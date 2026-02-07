export interface Equipment {
  id: string
  name: string
  slot: 'weapon' | 'accessory'
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  atkBonus: number
  hpBonus: number
  description: string
  cost: number // Shop price (0 = drop only)
}

export const EQUIPMENT: Equipment[] = [
  // Common Weapons
  { id: 'wooden-claws', name: 'Wooden Claws', slot: 'weapon', rarity: 'Common', atkBonus: 1, hpBonus: 0, description: '+1 ATK', cost: 50 },
  { id: 'iron-claws', name: 'Iron Claws', slot: 'weapon', rarity: 'Common', atkBonus: 2, hpBonus: 0, description: '+2 ATK', cost: 100 },

  // Common Accessories
  { id: 'leather-collar', name: 'Leather Collar', slot: 'accessory', rarity: 'Common', atkBonus: 0, hpBonus: 3, description: '+3 HP', cost: 50 },
  { id: 'bell-charm', name: 'Bell Charm', slot: 'accessory', rarity: 'Common', atkBonus: 0, hpBonus: 5, description: '+5 HP', cost: 100 },

  // Uncommon
  { id: 'steel-claws', name: 'Steel Claws', slot: 'weapon', rarity: 'Uncommon', atkBonus: 3, hpBonus: 0, description: '+3 ATK', cost: 200 },
  { id: 'silver-pendant', name: 'Silver Pendant', slot: 'accessory', rarity: 'Uncommon', atkBonus: 1, hpBonus: 5, description: '+1 ATK, +5 HP', cost: 200 },

  // Rare
  { id: 'crystal-claws', name: 'Crystal Claws', slot: 'weapon', rarity: 'Rare', atkBonus: 4, hpBonus: 2, description: '+4 ATK, +2 HP', cost: 400 },
  { id: 'mystic-amulet', name: 'Mystic Amulet', slot: 'accessory', rarity: 'Rare', atkBonus: 2, hpBonus: 8, description: '+2 ATK, +8 HP', cost: 400 },

  // Epic
  { id: 'void-talons', name: 'Void Talons', slot: 'weapon', rarity: 'Epic', atkBonus: 6, hpBonus: 3, description: '+6 ATK, +3 HP', cost: 800 },
  { id: 'stardust-collar', name: 'Stardust Collar', slot: 'accessory', rarity: 'Epic', atkBonus: 3, hpBonus: 12, description: '+3 ATK, +12 HP', cost: 800 },

  // Legendary (drop only from high-tier dogs)
  { id: 'infernal-fangs', name: 'Infernal Fangs', slot: 'weapon', rarity: 'Legendary', atkBonus: 8, hpBonus: 5, description: '+8 ATK, +5 HP', cost: 0 },
  { id: 'celestial-crown', name: 'Celestial Crown', slot: 'accessory', rarity: 'Legendary', atkBonus: 5, hpBonus: 15, description: '+5 ATK, +15 HP', cost: 0 },
]

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
