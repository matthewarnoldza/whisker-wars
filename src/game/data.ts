
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical'

export interface Cat {
  id: string
  name: string
  rarity: Rarity
  health: number
  attack: number
  ability: { name: string, description: string, effect: 'shield' | 'crit' | 'heal' | 'stun' | 'bleed' | 'lifesteal' | 'armor' | 'speed' }
  imageUrl?: string
  breed?: string
}

export interface Dog {
  id: string
  name: string
  health: number
  attack: number
  imageUrl?: string
  ability?: { name: string, description: string }
}

export interface Bait {
  id: string
  name: string
  tier: number // 1..6
  cost: number
  iconUrl?: string
}

export const BAITS: Bait[] = [
  { id:'toy-mouse', name:'Toy Mouse', tier:1, cost: 10, iconUrl:'/images/baits/Toy Mouse.png' },
  { id:'silver-sardine', name:'Silver Sardine', tier:1, cost: 15, iconUrl:'/images/baits/Silver Sardine.png' },
  { id:'catnip-crunch', name:'Catnip Crunch', tier:2, cost: 30, iconUrl:'/images/baits/Catnip Crunch.png' },
  { id:'tuna-deluxe', name:'Tuna Deluxe', tier:2, cost: 40, iconUrl:'/images/baits/Tuna Deluxe.png' },
  { id:'cosmic-tuna', name:'Cosmic Tuna', tier:3, cost: 80, iconUrl:'/images/baits/Cosmic Tuna.png' },
  { id:'nebula-nibbles', name:'Nebula Nibbles', tier:3, cost: 100, iconUrl:'/images/baits/Nebula Nibbles.png' },
  { id:'starlight-salmon', name:'Starlight Salmon', tier:4, cost: 160, iconUrl:'/images/baits/Starlight Salmon.png' },
  { id:'quantum-quail', name:'Quantum Quail', tier:4, cost: 200, iconUrl:'/images/baits/Quantum Quail.png' },
  { id:'void-venison', name:'Void Venison', tier:5, cost: 320, iconUrl:'/images/baits/Void Venison.png' },
  { id:'aurora-anchovy', name:'Aurora Anchovy', tier:5, cost: 360, iconUrl:'/images/baits/Aurora Anchovy.png' },
  { id:'mythic-mackerel', name:'Mythic Mackerel', tier:6, cost: 500, iconUrl:'/images/baits/Mythical Mackerel.png' },
  { id:'chronos-chow', name:'Chronos Chow', tier:6, cost: 600, iconUrl:'/images/baits/Chronos Chow.png' },
]

export const CATS: Cat[] = [
  // Common Cats (Tier 1)
  { id:'whiskers', name:'Whiskers', rarity:'Common', health: 18, attack: 5, breed:'Tabby', ability:{name:'Sharp Claws', description:'+3 bonus damage on roll ≥15', effect:'bleed'}, imageUrl:'/images/cats/Whiskers.png' },
  { id:'mittens', name:'Mittens', rarity:'Common', health: 20, attack: 4, breed:'Domestic Shorthair', ability:{name:'Soft Paws', description:'35% chance to block half damage', effect:'shield'}, imageUrl:'/images/cats/Mittens.png' },
  { id:'patches', name:'Patches', rarity:'Common', health: 19, attack: 5, breed:'Calico', ability:{name:'Lucky Strike', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Patches.png' },
  { id:'socks', name:'Socks', rarity:'Common', health: 17, attack: 5, breed:'Tuxedo', ability:{name:'Formal Fury', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Socks.png' },
  { id:'fluffy', name:'Fluffy', rarity:'Common', health: 21, attack: 4, breed:'Persian', ability:{name:'Fur Shield', description:'Reduces all damage taken by 3', effect:'armor'}, imageUrl:'/images/cats/Fluffy.png' },
  { id:'tiger', name:'Tiger', rarity:'Common', health: 18, attack: 6, breed:'Orange Tabby', ability:{name:'Pounce', description:'Extra attack on roll ≥14', effect:'speed'}, imageUrl:'/images/cats/Tiger.png' },

  // Uncommon Cats (Tier 2)
  { id:'trickpaw', name:'Trickpaw', rarity:'Uncommon', health: 22, attack: 6, breed:'Siamese', ability:{name:'Prankster', description:'Stuns enemy on roll ≥17', effect:'stun'}, imageUrl:'/images/cats/Trickpaw.png' },
  { id:'luna', name:'Luna', rarity:'Uncommon', health: 23, attack: 6, breed:'Russian Blue', ability:{name:'Moonlight', description:'Heals 2 HP on roll ≥15', effect:'heal'}, imageUrl:'/images/cats/Luna.png' },
  { id:'ginger', name:'Ginger', rarity:'Uncommon', health: 21, attack: 7, breed:'Maine Coon', ability:{name:'Spicy Swipe', description:'+3 bonus damage on roll ≥15', effect:'bleed'}, imageUrl:'/images/cats/Ginger.png' },
  { id:'smokey', name:'Smokey', rarity:'Uncommon', health: 24, attack: 5, breed:'British Shorthair', ability:{name:'Smoke Screen', description:'35% chance to block half damage', effect:'shield'}, imageUrl:'/images/cats/Smokey.png' },
  { id:'oreo', name:'Oreo', rarity:'Uncommon', health: 22, attack: 6, breed:'Black & White', ability:{name:'Double Strike', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Oreo.png' },
  { id:'buttons', name:'Buttons', rarity:'Uncommon', health: 23, attack: 6, breed:'Scottish Fold', ability:{name:'Cute Charm', description:'Stuns enemy on roll ≥17', effect:'stun'}, imageUrl:'/images/cats/Buttons.png' },

  // Rare Cats (Tier 3)
  { id:'shadowpaw', name:'ShadowPaw', rarity:'Rare', health: 26, attack: 7, breed:'Bombay', ability:{name:'Smoke Step', description:'35% chance to block half damage', effect:'shield'}, imageUrl:'/images/cats/ShadowPaw.png' },
  { id:'dune-runner', name:'Dune Runner', rarity:'Rare', health: 24, attack: 7, breed:'Egyptian Mau', ability:{name:'Sand Slash', description:'+3 bonus damage on roll ≥15', effect:'bleed'}, imageUrl:'/images/cats/Dune Runner.png' },
  { id:'midnight', name:'Midnight', rarity:'Rare', health: 25, attack: 7, breed:'Black Cat', ability:{name:'Dark Strike', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Midnight.png' },
  { id:'blizzard', name:'Blizzard', rarity:'Rare', health: 27, attack: 6, breed:'Turkish Angora', ability:{name:'Ice Shield', description:'Reduces all damage taken by 3', effect:'armor'}, imageUrl:'/images/cats/Blizzard.png' },
  { id:'thunder', name:'Thunder', rarity:'Rare', health: 25, attack: 8, breed:'Bengal', ability:{name:'Lightning Fast', description:'Extra attack on roll ≥14', effect:'speed'}, imageUrl:'/images/cats/Thunder.png' },
  { id:'phoenix', name:'Phoenix', rarity:'Rare', health: 26, attack: 7, breed:'Somali', ability:{name:'Rising Flames', description:'Heals 3 HP on roll ≥15', effect:'heal'}, imageUrl:'/images/cats/Phoenix.png' },
  { id:'jade', name:'Jade', rarity:'Rare', health: 24, attack: 7, breed:'Oriental', ability:{name:'Lucky Charm', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Jade.png' },
  { id:'storm', name:'Storm', rarity:'Rare', health: 26, attack: 7, breed:'Norwegian Forest', ability:{name:'Tempest', description:'+3 bonus damage on roll ≥15', effect:'bleed'}, imageUrl:'/images/cats/Storm.png' },

  // Epic Cats (Tier 4)
  { id:'quantum-purr', name:'Quantum Purr', rarity:'Epic', health: 28, attack: 8, breed:'Sphynx', ability:{name:'Time Twitch', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Quantum Purr.png' },
  { id:'crystal', name:'Crystal', rarity:'Epic', health: 30, attack: 7, breed:'Himalayan', ability:{name:'Diamond Shield', description:'Reduces all damage taken by 3', effect:'armor'}, imageUrl:'/images/cats/Crystal.png' },
  { id:'nebula', name:'Nebula', rarity:'Epic', health: 29, attack: 8, breed:'Ragdoll', ability:{name:'Star Burst', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Nebula.png' },
  { id:'plasma', name:'Plasma', rarity:'Epic', health: 27, attack: 9, breed:'Devon Rex', ability:{name:'Energy Drain', description:'Steals 50% of damage as HP', effect:'lifesteal'}, imageUrl:'/images/cats/Plasma.png' },
  { id:'vortex', name:'Vortex', rarity:'Epic', health: 28, attack: 8, breed:'Cornish Rex', ability:{name:'Time Warp', description:'Extra attack on roll ≥14', effect:'speed'}, imageUrl:'/images/cats/Vortex.png' },
  { id:'aurora', name:'Aurora', rarity:'Epic', health: 31, attack: 7, breed:'Siberian', ability:{name:'Northern Lights', description:'Heals 4 HP on roll ≥15', effect:'heal'}, imageUrl:'/images/cats/Aurora.png' },
  { id:'eclipse', name:'Eclipse', rarity:'Epic', health: 28, attack: 8, breed:'Chartreux', ability:{name:'Solar Flare', description:'+3 bonus damage on roll ≥15', effect:'bleed'}, imageUrl:'/images/cats/Eclipse.png' },
  { id:'comet', name:'Comet', rarity:'Epic', health: 27, attack: 9, breed:'Abyssinian', ability:{name:'Meteor Strike', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Comet.png' },

  // Legendary Cats (Tier 5)
  { id:'dreamweaver', name:'Dreamweaver', rarity:'Legendary', health: 30, attack: 9, breed:'Birman', ability:{name:'Lullaby', description:'Heals 5 HP on roll ≥15', effect:'heal'}, imageUrl:'/images/cats/Dreamweaver.png' },
  { id:'cosmic-void', name:'Cosmic Void', rarity:'Legendary', health: 32, attack: 10, breed:'Void Cat', ability:{name:'Black Hole', description:'35% chance to block half damage', effect:'shield'}, imageUrl:'/images/cats/Cosmic Void.png' },
  { id:'inferno', name:'Inferno', rarity:'Legendary', health: 31, attack: 10, breed:'Fire Cat', ability:{name:'Blazing Fury', description:'+3 bonus damage on roll ≥15', effect:'bleed'}, imageUrl:'/images/cats/Inferno.png' },
  { id:'frost-fang', name:'Frost Fang', rarity:'Legendary', health: 33, attack: 9, breed:'Ice Cat', ability:{name:'Frozen Heart', description:'Stuns enemy on roll ≥17', effect:'stun'}, imageUrl:'/images/cats/Frost Fang.png' },
  { id:'titan', name:'Titan', rarity:'Legendary', health: 35, attack: 9, breed:'Giant Cat', ability:{name:'Unstoppable', description:'Reduces all damage taken by 3', effect:'armor'}, imageUrl:'/images/cats/Titan.png' },
  { id:'velocity', name:'Velocity', rarity:'Legendary', health: 29, attack: 11, breed:'Speed Cat', ability:{name:'Sonic Strike', description:'Extra attack on roll ≥14', effect:'speed'}, imageUrl:'/images/cats/Velocity.png' },

  // Mythical Cats (Tier 6)
  { id:'chronos', name:'Chronos', rarity:'Mythical', health: 35, attack: 12, breed:'Time Cat', ability:{name:'Time Stop', description:'Stuns enemy on roll ≥17', effect:'stun'}, imageUrl:'/images/cats/Chronos.png' },
  { id:'celestial', name:'Celestial', rarity:'Mythical', health: 38, attack: 11, breed:'Divine Cat', ability:{name:'Divine Grace', description:'Heals 6 HP on roll ≥15', effect:'heal'}, imageUrl:'/images/cats/Celestial.png' },
  { id:'omni', name:'Omni', rarity:'Mythical', health: 36, attack: 12, breed:'Omnipotent Cat', ability:{name:'Reality Bend', description:'1.5x damage on roll ≥15', effect:'crit'}, imageUrl:'/images/cats/Omni.png' },
  { id:'reaper', name:'Reaper', rarity:'Mythical', health: 34, attack: 13, breed:'Death Cat', ability:{name:'Soul Drain', description:'Steals 50% of damage as HP', effect:'lifesteal'}, imageUrl:'/images/cats/Reaper.png' },
  { id:'guardian', name:'Guardian', rarity:'Mythical', health: 40, attack: 10, breed:'Ancient Cat', ability:{name:'Eternal Shield', description:'Reduces all damage taken by 3', effect:'armor'}, imageUrl:'/images/cats/Guardian.png' },
  { id:'aarons-kitty', name:"Aaron's Kitty", rarity:'Mythical', health: 36, attack: 12, breed:'Rizz Cat', ability:{name:'Rizz', description:'Stuns enemy on roll ≥17', effect:'stun'}, imageUrl:'/images/cats/Aarons Kitty.png' },
]

export const DOGS: Dog[] = [
  { id:'slime-hound', name:'Slime Hound', health: 50, attack: 6, ability:{name:'Toxic Bite', description:'Poisons on hit'}, imageUrl:'/images/dogs/Slime Hound.png' },
  { id:'tentacle-paws', name:'Tentacle Paws', health: 60, attack: 7, ability:{name:'Tentacle Grab', description:'Multi-target attack'}, imageUrl:'/images/dogs/Tentacle Paws.png' },
  { id:'void-walker', name:'Void Walker', health: 70, attack: 8, ability:{name:'Void Strike', description:'Ignores armor'}, imageUrl:'/images/dogs/Void Walker.png' },
  { id:'echo-howler', name:'Echo Howler', health: 80, attack: 9, ability:{name:'Sonic Howl', description:'Damages all cats'}, imageUrl:'/images/dogs/Echo Howler.png' },
  { id:'magma-beast', name:'Magma Beast', health: 95, attack: 10, ability:{name:'Lava Burst', description:'Burns over time'}, imageUrl:'/images/dogs/Magma Beast.png' },
  { id:'frost-wolf', name:'Frost Wolf', health: 100, attack: 10, ability:{name:'Ice Breath', description:'Slows attacks'}, imageUrl:'/images/dogs/Frost Wolf.png' },
  { id:'thunder-hound', name:'Thunder Hound', health: 110, attack: 11, ability:{name:'Lightning Strike', description:'Chain damage'}, imageUrl:'/images/dogs/Thunder Hound.png' },
  { id:'shadow-stalker', name:'Shadow Stalker', health: 120, attack: 11, ability:{name:'Shadow Clone', description:'Dodges attacks'}, imageUrl:'/images/dogs/Shadow Stalker.png' },
  { id:'crystal-guardian', name:'Crystal Guardian', health: 140, attack: 12, ability:{name:'Crystal Armor', description:'Reduces damage'}, imageUrl:'/images/dogs/Crystal Guardian.png' },
  { id:'chaos-demon', name:'Chaos Demon', health: 160, attack: 13, ability:{name:'Chaotic Energy', description:'Random devastating attacks'}, imageUrl:'/images/dogs/Chaos Demon.png' },
  // Boss Dogs
  { id:'infernal-cerberus', name:'Infernal Cerberus', health: 200, attack: 14, ability:{name:'Triple Hellfire', description:'Attacks 3 times per turn'}, imageUrl:'/images/dogs/Infernal Cerberus.png' },
  { id:'void-emperor', name:'Void Emperor', health: 250, attack: 15, ability:{name:'Reality Tear', description:'Massive damage + heal'}, imageUrl:'/images/dogs/Void Emperor.png' },
  // Uber Bosses
  { id:'omega-fenrir', name:'Omega Fenrir', health: 300, attack: 16, ability:{name:'Ragnarok Howl', description:'Silences cat abilities for 1 turn'}, imageUrl:'/images/dogs/Omega Fenrir.png' },
  { id:'abyssal-devourer', name:'Abyssal Devourer', health: 350, attack: 17, ability:{name:'Soul Drain', description:'Steals 25% HP from attackers'}, imageUrl:'/images/dogs/Abyssal Devourer.png' },
  { id:'eternal-overlord', name:'Eternal Overlord', health: 400, attack: 18, ability:{name:'Apocalypse Aura', description:'Damages all cats + reflects 20% damage'}, imageUrl:'/images/dogs/Eternal Overlord.png' },
  // Star Barks — Alien Mutated Dogs
  { id:'xenospore-hound', name:'Xenospore Hound', health: 450, attack: 19, ability:{name:'Toxic Spores', description:'Poisons all cats'}, imageUrl:'/images/dogs/Xenospore Hound.png' },
  { id:'acidmaw-ravager', name:'Acidmaw Ravager', health: 520, attack: 20, ability:{name:'Corrosive Bite', description:'Reduces cat ATK for 2 turns'}, imageUrl:'/images/dogs/Acidmaw Ravager.png' },
  { id:'hiveling-alpha', name:'Hiveling Alpha', health: 600, attack: 21, ability:{name:'Swarm Strike', description:'4 hits on random cats'}, imageUrl:'/images/dogs/Hiveling Alpha.png' },
  { id:'nebula-stalker', name:'Nebula Stalker', health: 700, attack: 22, ability:{name:'Phase Shift', description:'Dodges + counter-attacks'}, imageUrl:'/images/dogs/Nebula Stalker.png' },
  { id:'parasyte-warden', name:'Parasyte Warden', health: 800, attack: 23, ability:{name:'Neural Hijack', description:'Forces cat to hit ally'}, imageUrl:'/images/dogs/Parasyte Warden.png' },
  { id:'plasmic-behemoth', name:'Plasmic Behemoth', health: 900, attack: 24, ability:{name:'Plasma Barrage', description:'AOE damage + burns'}, imageUrl:'/images/dogs/Plasmic Behemoth.png' },
  { id:'void-reaver', name:'Void Reaver', health: 1000, attack: 26, ability:{name:'Dimensional Rift', description:'Ignores defenses + lifesteal'}, imageUrl:'/images/dogs/Void Reaver.png' },
  { id:'the-assimilator', name:'The Assimilator', health: 1150, attack: 28, ability:{name:'Genetic Override', description:'Copies cat ability + reflects damage'}, imageUrl:'/images/dogs/The Assimilator.png' },
  { id:'cosmic-queen', name:'The Cosmic Queen', health: 1300, attack: 30, ability:{name:'Extinction Protocol', description:'Dual random devastating effects each turn'}, imageUrl:'/images/dogs/The Cosmic Queen.png' },
]

export const TRAINING_DOG: Dog = {
  id: 'training-dog',
  name: 'Training Dummy',
  health: 25,
  attack: 0,
  imageUrl: '/images/dogs/Training Dog.png',
}

export const rarityByTier = (tier:number): Rarity[] => {
  switch (tier) {
    case 1: return ['Common','Uncommon']
    case 2: return ['Uncommon','Rare']
    case 3: return ['Rare','Epic']
    case 4: return ['Epic','Legendary']
    case 5: return ['Legendary','Mythical']
    case 6: return ['Mythical']
    default: return ['Common']
  }
}
