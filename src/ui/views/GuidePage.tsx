import { useState } from 'react'
import { useGame } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'

interface Section {
  icon: string
  title: string
  content: JSX.Element
}

function Accordion({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden bg-slate-800/80">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-800/90 transition-colors"
      >
        <span className="text-2xl">{section.icon}</span>
        <span className="flex-1 font-bold text-white text-sm sm:text-base">{section.title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 text-lg"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 leading-relaxed space-y-3">
              {section.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs text-amber-200">
      <span className="mt-0.5">💡</span>
      <span>{children}</span>
    </div>
  )
}

const sections: Section[] = [
  {
    icon: '🎣',
    title: 'Getting Started',
    content: (
      <>
        <p><strong>Buy Bait</strong> from the Bait tab to attract cats. There are 6 tiers of bait — higher tiers cost more coins but attract rarer cats.</p>
        <p><strong>Use Bait</strong> to summon a random cat. The cat's rarity depends on the bait tier: Tier 1-2 attracts Common/Uncommon, Tier 5-6 can attract Legendary and Mythical cats.</p>
        <p><strong>Earn Coins</strong> by winning battles. Coins are your main currency for bait, equipment, and cat healing.</p>
        <Tip>Start with cheap bait to build a team, then invest in higher tiers as you earn more coins from battles.</Tip>
      </>
    ),
  },
  {
    icon: '🐱',
    title: 'Cats & Collection',
    content: (
      <>
        <p>There are <strong>40 unique cats</strong> across 6 rarities: Common, Uncommon, Rare, Epic, Legendary, and Mythical.</p>
        <p>Each cat has <strong>base stats</strong> (HP and ATK), a <strong>unique ability</strong> that triggers on dice rolls, and a breed.</p>
        <p>Cats <strong>level up</strong> from battle XP, gaining increased stats. Max level is 10.</p>
        <p>Select up to <strong>3 cats</strong> for your battle party from the Collection tab. Tap a cat to see full details, manage equipment, and more.</p>
        <p>Use the <strong>Catadex</strong> toggle to see all discoverable cats and which bait attracts each one.</p>
        <Tip>A balanced party with different abilities (damage, healing, defense) works best against tough bosses.</Tip>
      </>
    ),
  },
  {
    icon: '🔮',
    title: 'Merging',
    content: (
      <>
        <p>Combine <strong>3 copies of the same cat</strong> to create a stronger merged version with boosted base stats.</p>
        <p><strong>How to merge:</strong></p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Go to the <strong>Collection</strong> tab</li>
          <li>Toggle <strong>Merge Mode</strong> (the merge button at the top)</li>
          <li>Select 3 identical cats (same species)</li>
          <li>Confirm the merge</li>
        </ol>
        <p>The merged cat inherits the highest level of the three and gets a stat boost.</p>
        <Tip>Duplicate cats from lower-tier bait are perfect merge fodder — merge Commons to make surprisingly strong cats!</Tip>
      </>
    ),
  },
  {
    icon: '✨',
    title: 'Elite Cats & Ascension',
    content: (
      <>
        <p>Cats that reach <strong>max level (10)</strong> can <strong>ascend</strong> for a coin cost, resetting to level 1 with permanently increased base stats.</p>
        <p>Ascending unlocks <strong>Elite status</strong>, giving the cat:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Stellar Resilience</strong> — a chance to survive lethal hits with 1 HP</li>
          <li><strong>Elite Aura</strong> — +1 ATK to ALL party members per living elite cat in battle</li>
          <li>A special holographic card effect in your collection</li>
        </ul>
        <p>Cats can ascend multiple times, each time getting stronger.</p>
        <Tip>Ascension costs increase each tier. Save up coins before attempting higher ascensions.</Tip>
      </>
    ),
  },
  {
    icon: '⚔️',
    title: 'Equipment & Inventory',
    content: (
      <>
        <p>Equipment drops from <strong>battle victories</strong> with a 30% chance. Higher-tier dogs drop rarer gear.</p>
        <p>Each cat has <strong>two equipment slots</strong>:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Weapon</strong> — increases ATK damage</li>
          <li><strong>Accessory</strong> — can boost ATK and/or HP</li>
        </ul>
        <p>Manage equipment from the <strong>Inventory</strong> tab or by tapping a cat in Collection.</p>
        <p>The <strong>Shop</strong> (in the Inventory tab) sells Common through Rare equipment for coins. Epic and Legendary items are <strong>drop-only</strong> from high-tier dog battles.</p>
        <Tip>Equip your battle party first! Unequipped gear sits in your bag doing nothing.</Tip>
      </>
    ),
  },
  {
    icon: '💎',
    title: 'Elemental Stones',
    content: (
      <>
        <p>Stones are powerful <strong>one-time-use</strong> battle items that drop from <strong>Feline Frenzy Friday</strong> event battles (20% chance).</p>
        <p>There are <strong>5 elements</strong> that rotate weekly:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><span className="text-red-400">🔥 Emberstone</span> — 3x damage + burn (damage over time)</li>
          <li><span className="text-cyan-400">❄️ Froststone</span> — 2x damage + freeze (enemy skips turn)</li>
          <li><span className="text-amber-400">🪨 Terrastone</span> — 2x damage + rock shield (blocks next hit)</li>
          <li><span className="text-yellow-400">⚡ Stormstone</span> — Double strike + guaranteed crit</li>
          <li><span className="text-purple-400">🌑 Voidstone</span> — 2.5x damage + full lifesteal</li>
        </ul>
        <p>Equip stones via Collection (tap cat → Stone slot). In battle, a "Use Stone" button appears. Once activated, the stone is <strong>consumed permanently</strong>.</p>
        <Tip>Save stones for difficult boss fights. Rolling a Natural 1 shatters the stone with no effect!</Tip>
      </>
    ),
  },
  {
    icon: '🎲',
    title: 'Battle System',
    content: (
      <>
        <p>Battles are turn-based. Each turn:</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li><strong>Roll the D20 dice</strong> to determine attack power</li>
          <li><strong>Select a cat</strong> to attack with</li>
          <li>Your cat deals damage based on ATK + dice roll + equipment</li>
          <li>The dog retaliates on its turn</li>
        </ol>
        <p><strong>Special rolls:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Natural 20</strong> — Legendary Strike! Massive bonus damage</li>
          <li><strong>Natural 1</strong> — Critical Fail! Your attack misses entirely</li>
        </ul>
        <p>Cat abilities trigger based on dice rolls (e.g., heal on 15+, stun on 17+). Dogs have unique abilities too — poison, freeze, AoE damage, and more.</p>
        <p><strong>Difficulty settings</strong> scale dog stats and rewards. Higher difficulty = tougher fights but better loot.</p>
        <p><strong>Boss Rush:</strong> After defeating all dogs, unlock Boss Rush mode — fight every dog in sequence!</p>
        <Tip>Stunned enemies skip their next turn. Speed abilities give you an extra attack. Use these to chain big combos!</Tip>
      </>
    ),
  },
  {
    icon: '🎪',
    title: 'Events',
    content: (
      <>
        <p><strong>Feline Frenzy Friday</strong> is the main recurring event, active every Friday.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>A special <strong>elemental Frenzy Dog</strong> appears with unique abilities</li>
          <li>Defeating it has a 20% chance to drop the week's <strong>Elemental Stone</strong></li>
          <li>The element rotates weekly: Fire → Ice → Earth → Lightning → Shadow</li>
        </ul>
        <p><strong>Seasonal events</strong> may offer coin multipliers and bonus rewards. Check the event banner at the top of the screen for active events.</p>
        <Tip>Frenzy Dogs are tougher than regular bosses but the stone drops are worth it!</Tip>
      </>
    ),
  },
  {
    icon: '🎯',
    title: 'Training Arena',
    content: (
      <>
        <p>The <strong>Training Arena</strong> lets you practice battles against a training dummy.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>No risk — your cats won't lose HP permanently</li>
          <li>No rewards — no coins or XP earned</li>
          <li>Great for testing team compositions and learning abilities</li>
          <li>Limited daily training sessions per cat</li>
        </ul>
        <Tip>Use training to learn which abilities synergize well before taking on tough bosses.</Tip>
      </>
    ),
  },
  {
    icon: '☁️',
    title: 'Cloud Saves & Leaderboard',
    content: (
      <>
        <p><strong>Cloud Saves</strong> let you sync progress across devices using a unique code.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Tap your profile name in the header to access save/load options</li>
          <li>Your <strong>Cloud Code</strong> is shown in gold next to your name</li>
          <li>Share it to load your save on another device</li>
        </ul>
        <p>The <strong>Leaderboard</strong> (in the Stats tab) tracks:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Total Wins</li>
          <li>Highest Dog Defeated</li>
          <li>Unique Cats Collected</li>
          <li>Total Merges</li>
        </ul>
        <Tip>Your stats upload automatically when you have a cloud code. Check the leaderboard to see how you rank!</Tip>
      </>
    ),
  },
]

export default function GuidePage() {
  const setView = useGame(s => s.setView)
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]))

  const toggleSection = (index: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const expandAll = () => setOpenSections(new Set(sections.map((_, i) => i)))
  const collapseAll = () => setOpenSections(new Set())

  return (
    <div className="premium-card rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('bait')}
            className="px-3 py-2 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all text-sm font-bold"
          >
            ← Back
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            📖 Guide & FAQ
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Collapse All
          </button>
        </div>
      </motion.div>

      {/* Sections */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        {sections.map((section, index) => (
          <Accordion
            key={index}
            section={section}
            isOpen={openSections.has(index)}
            onToggle={() => toggleSection(index)}
          />
        ))}
      </motion.div>

      {/* Footer tip */}
      <div className="text-center py-4 text-xs text-slate-600">
        Game progress auto-saves. Have fun and good luck! 🐱
      </div>
    </div>
  )
}
