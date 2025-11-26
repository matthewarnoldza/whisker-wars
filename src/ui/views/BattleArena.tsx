import { useEffect, useState, useRef } from 'react'
import GameCard from '../components/GameCard'
import D20Dice from '../components/D20Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import Modal from '../components/Modal'
import { useGame } from '../../game/store'
import { DOGS } from '../../game/data'
import { rollD20 } from '../../game/dice'
import { motion, AnimatePresence } from 'framer-motion'
import { shakeVariants, attackVariants, victoryVariants, damageVariants } from '../animations'

interface BattleLog { text: string; type?: 'damage' | 'heal' | 'crit' | 'info' }

export default function BattleArena() {
  const party = useGame(s => s.owned.filter(o => s.selectedForBattle.includes(o.instanceId)))
  const dogIndex = useGame(s => s.dogIndex)
  const difficultyLevel = useGame(s => s.difficultyLevel)
  const addCoins = useGame(s => s.addCoins)
  const nextDog = useGame(s => s.nextDog)
  const updateCatHp = useGame(s => s.updateCatHp)
  const healAllCats = useGame(s => s.healAllCats)
  const addXpToCat = useGame(s => s.addXpToCat)
  const recordBattleResult = useGame(s => s.recordBattleResult)
  const setView = useGame(s => s.setView)
  const stats = useGame(s => s.stats)

  const [dogHp, setDogHp] = useState(DOGS[dogIndex].health)
  const [turn, setTurn] = useState<'player' | 'enemy'>('player')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [dice, setDice] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [log, setLog] = useState<BattleLog[]>([])
  const [battleEnded, setBattleEnded] = useState(false)
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number; x: number; y: number }[]>([])
  const [particleActive, setParticleActive] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [attackingId, setAttackingId] = useState<string | null>(null)
  const [showDefeatModal, setShowDefeatModal] = useState(false)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [victoryRewards, setVictoryRewards] = useState({ coins: 0, xp: 0 })
  const [silenced, setSilenced] = useState(false) // Omega Fenrir ability
  const mobileLogRef = useRef<HTMLDivElement>(null)
  const desktopLogRef = useRef<HTMLDivElement>(null)

  const dog = DOGS[dogIndex]

  // Reset battle when dog changes
  useEffect(() => {
    setDogHp(dog.health)
    setLog([{ text: `⚔️ A wild ${dog.name} appears!`, type: 'info' }])
    setTurn('player')
    setBattleEnded(false)
    setSelectedCatId(null)
    setSilenced(false)
  }, [dogIndex])

  // Auto-scroll log to bottom when updated
  useEffect(() => {
    // Scroll mobile battle log
    if (mobileLogRef.current) {
      mobileLogRef.current.scrollTop = mobileLogRef.current.scrollHeight
    }
    // Scroll desktop battle log
    if (desktopLogRef.current) {
      desktopLogRef.current.scrollTop = desktopLogRef.current.scrollHeight
    }
  }, [log])

  // Enemy Turn Logic
  useEffect(() => {
    if (turn === 'enemy' && !battleEnded && dogHp > 0) {
      const timer = setTimeout(() => handleDogTurn(), 1500)
      return () => clearTimeout(timer)
    }
  }, [turn, battleEnded, dogHp])

  const addLog = (t: string, type?: 'damage' | 'heal' | 'crit' | 'info') => {
    setLog(l => [...l, { text: t, type }])
    // Keep log manageable (show last 20 messages)
    if (log.length > 20) setLog(l => l.slice(-20))
  }

  const showDamage = (value: number, x: number, y: number) => {
    const id = Date.now()
    setDamageNumbers(prev => [...prev, { id, value, x, y }])
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id))
    }, 1000)
  }

  const roll = async () => {
    setRolling(true)
    await new Promise(r => setTimeout(r, 600))
    const v = rollD20()
    setDice(v)
    setRolling(false)
    return v
  }

  const handleAttack = async () => {
    if (!selectedCatId || turn !== 'player' || battleEnded) return

    const cat = party.find(c => c.instanceId === selectedCatId)
    if (!cat || cat.currentHp <= 0) return

    setAttackingId(cat.instanceId)
    addLog(`${cat.name} attacks!`, 'info')

    const v = await roll()

    // Special D20 and D1 rolls
    if (v === 20) {
      addLog(`🎲 NATURAL 20! ⚡ LEGENDARY STRIKE! ⚡`, 'crit')
      addLog(`✨ MAXIMUM POWER UNLEASHED! ✨`, 'crit')
    } else if (v === 1) {
      addLog(`🎲 CRITICAL FAIL! 💥 Attack MISSES! 💥`, 'damage')
      addLog(`${cat.name} stumbles and deals NO damage!`, 'damage')
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    // Base damage
    let dmg = cat.currentAttack + Math.floor(v / 5)
    let isCrit = false

    // Check if silenced (Omega Fenrir ability)
    if (silenced) {
      addLog(`🔇 ${cat.name}'s ability is silenced!`, 'info')
      setSilenced(false) // Silence wears off after one turn
    }

    // Abilities (only if not silenced)
    if (!silenced && cat.ability.effect === 'crit' && v >= 15) {
      dmg = Math.floor(dmg * 1.5)
      isCrit = true
    }
    if (!silenced && cat.ability.effect === 'bleed' && v >= 15) {
      dmg += 3
      addLog(`🔥 ${cat.name}'s attack burns for +3 damage!`, 'crit')
    }
    if (!silenced && cat.ability.effect === 'heal' && v >= 15) {
      // Heal amount scales by rarity
      const healByRarity: Record<string, number> = {
        'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5, 'Mythical': 6
      }
      const healAmount = healByRarity[cat.rarity] || 3
      const newHp = Math.min(cat.maxHp, cat.currentHp + healAmount)
      updateCatHp(cat.instanceId, newHp)
      addLog(`${cat.name} heals ${healAmount} HP! ✨`, 'heal')
    }
    if (!silenced && cat.ability.effect === 'lifesteal') {
      const healAmount = Math.floor(dmg * 0.5)
      const newHp = Math.min(cat.maxHp, cat.currentHp + healAmount)
      updateCatHp(cat.instanceId, newHp)
      addLog(`${cat.name} steals ${healAmount} HP! 🩸`, 'heal')
    }

    // Stun on roll >= 17
    if (!silenced && v >= 17 && cat.ability.effect === 'stun') {
      addLog('💥 STUN! The enemy flinches and misses a turn!', 'crit')
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      setDogHp(h => Math.max(0, h - dmg))
      showDamage(dmg, window.innerWidth / 2, 100)

      // Stun means player goes again
      setAttackingId(null)
      return
    }

    // Speed ability - extra attack on roll >= 14
    if (!silenced && cat.ability.effect === 'speed' && v >= 14) {
      addLog(`⚡ ${cat.name} attacks with lightning speed!`, 'crit')
      setDogHp(h => Math.max(0, h - dmg))
      showDamage(dmg, window.innerWidth / 2, 100)

      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      setParticleActive(true)
      setTimeout(() => setParticleActive(false), 100)

      // Check Victory
      if (dogHp - dmg <= 0) {
        handleVictory()
        return
      }

      // Speed means player goes again
      setAttackingId(null)
      return
    }

    setDogHp(h => Math.max(0, h - dmg))
    showDamage(dmg, window.innerWidth / 2, 100)

    if (isCrit) {
      addLog(`💥 Critical Hit! ${dmg} damage!`, 'crit')
    } else {
      addLog(`Hit for ${dmg} damage.`, 'damage')
    }

    setShaking(true)
    setTimeout(() => setShaking(false), 400)
    setParticleActive(true)
    setTimeout(() => setParticleActive(false), 100)

    // Check Victory
    if (dogHp - dmg <= 0) {
      handleVictory()
      return
    }

    setAttackingId(null)
    setTurn('enemy')
  }

  const handleDogTurn = async () => {
    setAttackingId('dog')
    addLog(`${dog.name} attacks!`, 'info')

    const v = await roll()
    let dmg = dog.attack + Math.floor(v / 6)

    // Choose a random alive cat to hit
    const targets = party.filter(c => c.currentHp > 0)
    if (!targets.length) {
      handleDefeat()
      return
    }

    // === DOG ABILITY: Eternal Overlord - Apocalypse Aura ===
    // Deals 2 damage to ALL cats each turn
    if (dog.id === 'eternal-overlord') {
      addLog(`☠️ Apocalypse Aura damages all cats!`, 'damage')
      targets.forEach(cat => {
        const auraDmg = 2
        const newHp = Math.max(0, cat.currentHp - auraDmg)
        updateCatHp(cat.instanceId, newHp)
      })
    }

    const t = targets[Math.floor(Math.random() * targets.length)]

    // Apply defensive abilities (only if not silenced - but dogs can't be silenced so always check)
    let actualDamage = dmg

    // Shield ability - 35% chance to block half damage
    if (!silenced && t.ability.effect === 'shield' && Math.random() < 0.35) {
      actualDamage = Math.floor(actualDamage * 0.5)
      addLog(`${t.name}'s shield blocks half the damage! 🛡️`, 'info')
    }

    // Armor ability - Reduce all damage by 3 (minimum 1)
    if (!silenced && t.ability.effect === 'armor') {
      actualDamage = Math.max(1, actualDamage - 3)
      addLog(`${t.name}'s armor absorbs 3 damage! 🛡️`, 'info')
    }

    // === DOG ABILITY: Eternal Overlord - Damage Reflect ===
    // Reflects 20% damage back to attacker (stored for next player attack)
    if (dog.id === 'eternal-overlord') {
      const reflectDmg = Math.floor(actualDamage * 0.2)
      if (reflectDmg > 0) {
        addLog(`🔄 Apocalypse Aura reflects ${reflectDmg} damage!`, 'damage')
        const reflectHp = Math.max(0, t.currentHp - reflectDmg)
        updateCatHp(t.instanceId, reflectHp)
      }
    }

    const newHp = Math.max(0, t.currentHp - actualDamage)
    updateCatHp(t.instanceId, newHp)

    // Find target position (approximate)
    const targetIndex = party.findIndex(c => c.instanceId === t.instanceId)
    // This is a bit hacky for positioning, but works for now
    const xPos = (window.innerWidth / 3) * (targetIndex + 0.5)
    showDamage(actualDamage, xPos, window.innerHeight - 200)

    addLog(`${dog.name} hits ${t.name} for ${actualDamage}!`, 'damage')

    // === DOG ABILITY: Abyssal Devourer - Soul Drain ===
    // Heals 25% of damage dealt
    if (dog.id === 'abyssal-devourer') {
      const healAmount = Math.floor(actualDamage * 0.25)
      setDogHp(h => Math.min(dog.health, h + healAmount))
      addLog(`💀 Soul Drain heals ${dog.name} for ${healAmount} HP!`, 'heal')
    }

    // === DOG ABILITY: Omega Fenrir - Ragnarok Howl ===
    // Silences cat abilities for next turn
    if (dog.id === 'omega-fenrir') {
      setSilenced(true)
      addLog(`🐺 Ragnarok Howl! Cat abilities silenced next turn!`, 'crit')
    }

    setAttackingId(null)

    // Check Defeat (re-check all cats after aura damage)
    const allDead = party.every(c => {
      const cat = party.find(p => p.instanceId === c.instanceId)
      if (!cat) return true
      if (c.instanceId === t.instanceId) return newHp <= 0
      return c.currentHp <= 0
    })

    if (allDead) {
      handleDefeat()
    } else {
      setTurn('player')
    }
  }

  const handleVictory = () => {
    setBattleEnded(true)
    // Scale rewards based on difficulty level
    const difficultyMultiplier = 1 + (difficultyLevel * 0.5)
    const xpEarned = Math.floor((50 + (dogIndex * 25)) * difficultyMultiplier)
    const coinsEarned = Math.floor((150 + (dogIndex * 30)) * difficultyMultiplier)

    addLog(`🎉 VICTORY!`, 'info')
    addLog(`+${xpEarned} XP, +${coinsEarned} Coins`, 'info')

    party.forEach(cat => addXpToCat(cat.instanceId, xpEarned))
    addCoins(coinsEarned)
    recordBattleResult(true, xpEarned)

    setVictoryRewards({ coins: coinsEarned, xp: xpEarned })
    setTimeout(() => setShowVictoryModal(true), 1000)
  }

  const handleDefeat = () => {
    setBattleEnded(true)
    addLog(`💀 DEFEAT!`, 'info')
    recordBattleResult(false, 0)
    // Don't auto-heal - player must heal manually for 20 coins
    setTimeout(() => setShowDefeatModal(true), 1000)
  }

  return (
    <div className="relative min-h-[80vh] flex flex-col space-y-4">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-500/50"
      >
        <p className="text-white text-center font-semibold">
          <span className="text-lg mr-2">🎲</span>
          Roll the D20 dice, then select one of your cats to attack! Each cat has unique abilities. Defeat enemy dogs and bosses!
        </p>
      </motion.div>

      {/* MOBILE LAYOUT (< lg) - Compact Layout Matching Mockup */}
      <div className="lg:hidden flex flex-col gap-2 px-2 py-2 pb-safe">
        {/* Enemy Section - Card with Health Bar Below */}
        <div className="flex flex-col items-center">
          <motion.div
            variants={shakeVariants}
            animate={shaking ? 'shake' : 'idle'}
            className="scale-[0.60] origin-center"
          >
            <GameCard
              character={dog}
              isEnemy={true}
              animate={false}
              showStats={false}
              holographicMode="full"
            />
          </motion.div>
          {/* Enemy Health Bar - Below Card */}
          <div className="w-32 -mt-1">
            <StatBar current={dogHp} max={dog.health} type="hp" showNumbers={false} />
          </div>
        </div>

        {/* Turn Indicator */}
        {turn === 'player' && !battleEnded && (
          <div className="text-white font-black text-center animate-pulse font-heading tracking-widest text-xl drop-shadow-lg py-1">
            YOUR TURN
          </div>
        )}
        {turn === 'enemy' && !battleEnded && (
          <div className="text-red-400 font-black text-center animate-pulse text-xl drop-shadow-lg py-1">
            ENEMY TURN...
          </div>
        )}

        {/* Dice + Battle Log - Side by Side with Expanded Log */}
        <div className="grid grid-cols-[auto_1fr] gap-2 items-start -ml-8">
          {/* Dice - Smaller scale */}
          <div className="scale-[0.65] origin-top-left -mt-3">
            <D20Dice value={dice} rolling={rolling} />
          </div>

          {/* Battle Log - 20% wider by moving left edge */}
          <div
            ref={mobileLogRef}
            className="bg-slate-900/90 rounded-lg p-2 border border-slate-700/50 h-[180px] overflow-y-auto custom-scrollbar"
          >
            {log.slice(-12).map((l, i) => (
              <div key={i} className={`text-xs font-medium leading-relaxed mb-0.5 ${
                l.type === 'crit' ? 'text-yellow-400 font-bold' :
                l.type === 'damage' ? 'text-red-400' :
                l.type === 'heal' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {l.text}
              </div>
            ))}
          </div>
        </div>

        {/* Attack Button - Large and Prominent */}
        {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAttack}
            className="w-full px-6 py-5 bg-gradient-to-b from-red-600 to-red-800 text-white font-black text-2xl rounded-xl shadow-2xl border-4 border-red-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
          >
            ⚔️ ATTACK!
          </motion.button>
        )}
        {turn === 'player' && !selectedCatId && !battleEnded && (
          <div className="text-slate-400 text-sm text-center font-medium py-1 italic">
            Tap a cat below to select
          </div>
        )}

        {/* Player Party - Smaller Cards (55% scale) with Health Bars Above */}
        <div className="flex gap-1.5 justify-center">
          {party.map(cat => {
            const isSelected = selectedCatId === cat.instanceId
            const isDead = cat.currentHp <= 0
            // Calculate card width: base 208px * 0.55 scale = 114.4px
            const cardWidth = 114
            const healthBarWidth = 85 // Reduced health bar width

            return (
              <motion.div
                key={cat.instanceId}
                variants={attackVariants}
                animate={attackingId === cat.instanceId ? 'attack' : 'idle'}
                onClick={() => !isDead && turn === 'player' && setSelectedCatId(cat.instanceId)}
                className={`flex flex-col ${isDead ? 'opacity-40 grayscale' : ''}`}
                style={{ willChange: 'transform', width: `${cardWidth}px` }}
              >
                {/* Health Bar Above Card - Centered and narrower than card */}
                <div className="flex justify-center" style={{ width: `${cardWidth}px` }}>
                  <div style={{ width: `${healthBarWidth}px` }}>
                    <StatBar current={cat.currentHp} max={cat.maxHp} type="hp" showNumbers={false} />
                  </div>
                </div>

                {/* Card with Selection Highlight */}
                <motion.div
                  animate={isSelected ? { y: -4, scale: 0.57 } : { y: 0, scale: 0.55 }}
                  transition={{ duration: 0.2 }}
                  className={`origin-top-center -mt-2 ${isSelected && !isDead ? 'ring-4 ring-purple-500/80 rounded-2xl' : ''}`}
                >
                  <GameCard
                    character={cat}
                    selected={false}
                    disabled={isDead || turn !== 'player'}
                    showStats={true}
                    animate={false}
                    holographicMode="none"
                  />
                </motion.div>

                {/* Dead overlay */}
                {isDead && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                    <span className="text-4xl">💀</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* DESKTOP LAYOUT (>= lg) */}
      <div className="hidden lg:flex flex-col flex-1">
        {/* Top Area: Enemy & Battle Log */}
        <div className="flex-1 flex justify-center items-start pt-8 relative gap-8">
          {/* Left Side: Dice & Action Button */}
          <div className="flex flex-col items-center gap-6 mt-4">
            {/* Dice */}
            <div className="flex flex-col items-center gap-2">
              {turn === 'player' && !battleEnded && (
                <div className="text-white font-bold animate-pulse font-heading tracking-widest text-xs mb-2">
                  YOUR TURN
                </div>
              )}
              <D20Dice value={dice} rolling={rolling} />
            </div>

            {/* Action Button */}
            <div className="w-64 flex justify-center mb-4">
              {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAttack}
                  className="px-8 py-4 bg-gradient-to-b from-red-600 to-red-800 text-white font-black text-xl rounded-xl shadow-lg border-2 border-red-400 font-heading tracking-wider hover:shadow-red-500/50 transition-shadow"
                >
                  ATTACK!
                </motion.button>
              )}
              {turn === 'player' && !selectedCatId && !battleEnded && (
                <div className="text-slate-400 text-sm text-center italic px-4">
                  Select a cat to attack
                </div>
              )}
            </div>
          </div>

          {/* Enemy Card - Center */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Boss HP Bar - Above Card */}
            <div className="mb-4 w-full px-2">
              <StatBar current={dogHp} max={dog.health} label="BOSS HP" type="hp" showNumbers={true} />
            </div>

            <motion.div
              variants={shakeVariants}
              animate={shaking ? 'shake' : 'idle'}
              className="relative"
            >
              <GameCard
                character={dog}
                isEnemy={true}
                animate={false}
                showStats={false}
              />
            </motion.div>
          </div>

          {/* Battle Log - Right Side */}
          <div
            ref={desktopLogRef}
            className="w-64 h-80 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 overflow-y-auto border border-slate-700 text-xs font-mono shadow-fantasy custom-scrollbar"
          >
            {log.map((l, i) => (
              <div key={i} className={`mb-1 ${l.type === 'crit' ? 'text-yellow-400 font-bold' :
                  l.type === 'damage' ? 'text-red-400' :
                    l.type === 'heal' ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                {l.text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Area: Player Party */}
        <div className="flex-1 flex justify-center items-end pb-8 gap-4 pt-24 mt-8">
          {party.map(cat => {
            const isSelected = selectedCatId === cat.instanceId
            const isDead = cat.currentHp <= 0
            return (
              <motion.div
                key={cat.instanceId}
                variants={attackVariants}
                animate={attackingId === cat.instanceId ? 'attack' : 'idle'}
                className="relative group cursor-pointer"
                onClick={() => !isDead && turn === 'player' && setSelectedCatId(cat.instanceId)}
              >
                {/* Health Bar Above Card */}
                <div className="absolute -top-14 left-0 right-0 px-2 z-20">
                  <StatBar
                    current={cat.currentHp}
                    max={cat.maxHp}
                    type="hp"
                    showNumbers={true}
                    label={cat.name}
                  />
                </div>

                <motion.div
                  animate={isSelected ? { y: -16, scale: 1.05 } : { y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <GameCard
                    character={cat}
                    selected={isSelected}
                    disabled={isDead || (turn !== 'player' && !isSelected)}
                    showStats={true}
                  />
                </motion.div>

                {/* Active Indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute -top-28 left-0 right-0 flex justify-center z-30"
                  >
                    <div className="bg-gold-500 text-slate-900 font-bold px-3 py-1 rounded-full text-sm shadow-lg border border-gold-300">
                      READY
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}

          {party.length === 0 && (
            <div className="text-center text-slate-400">
              Go to Collection to select your team!
            </div>
          )}
        </div>
      </div>

      {/* Damage Numbers (shared) */}
      <AnimatePresence>
        {damageNumbers.map(({ id, value, x, y }) => (
          <motion.div
            key={id}
            variants={damageVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed z-50 text-4xl font-black text-red-500 pointer-events-none font-heading"
            style={{ left: x, top: y, textShadow: '0 0 10px black' }}
          >
            -{value}
          </motion.div>
        ))}
      </AnimatePresence>

      <ParticleSystem
        x={window.innerWidth / 2}
        y={200}
        active={particleActive}
        count={20}
        colors={['#FF0000', '#FF4444', '#FF6666']}
      />

      {/* Defeat Modal */}
      <Modal
        isOpen={showDefeatModal}
        onClose={() => {
          setShowDefeatModal(false)
          setView('collection')
        }}
        title="💀 DEFEAT"
        size="sm"
      >
        <div className="text-center py-6">
          <div className="text-6xl mb-4">😿</div>
          <h3 className="text-2xl font-bold text-red-400 mb-2">All cats defeated!</h3>
          <p className="text-slate-300 mb-6">
            Your party has fallen in battle. Visit Collection to heal your cats for 20 coins!
          </p>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Battle Statistics</div>
            <div className="flex justify-around">
              <div>
                <div className="text-2xl font-bold text-gold-400">{stats.totalWins}</div>
                <div className="text-xs text-slate-500">WINS</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-400">{stats.totalBattles}</div>
                <div className="text-xs text-slate-500">BATTLES</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.totalBattles - stats.totalWins}</div>
                <div className="text-xs text-slate-500">LOSSES</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setShowDefeatModal(false)
                setTimeout(() => setView('collection'), 350)
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-glow-purple hover:shadow-premium-lg transition-all hover:scale-105"
            >
              📚 Collection
            </button>
            <button
              onClick={() => {
                setShowDefeatModal(false)
                setTimeout(() => setView('bait'), 350)
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-premium-lg transition-all hover:scale-105"
            >
              🎣 Baiting Area
            </button>
          </div>
        </div>
      </Modal>

      {/* Victory Modal */}
      <Modal
        isOpen={showVictoryModal}
        onClose={() => {
          setShowVictoryModal(false)
          setTimeout(() => nextDog(), 350)
        }}
        title="🎉 VICTORY!"
        size="sm"
      >
        <div className="text-center py-6">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <h3 className="text-2xl font-bold text-gold-400 mb-2">Epic Victory!</h3>
          <p className="text-slate-300 mb-6">
            You have defeated {dog.name}! Your cats grow stronger!
          </p>

          <div className="bg-slate-800/50 rounded-lg p-6 mb-6 border border-gold-500/30">
            <div className="text-sm text-slate-400 mb-4 uppercase tracking-wider">Rewards Earned</div>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">💰</span>
                <div>
                  <div className="text-3xl font-black text-gold-400">+{victoryRewards.coins}</div>
                  <div className="text-xs text-slate-500">COINS</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">⭐</span>
                <div>
                  <div className="text-3xl font-black text-cyan-400">+{victoryRewards.xp}</div>
                  <div className="text-xs text-slate-500">EXPERIENCE</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowVictoryModal(false)
              setTimeout(() => nextDog(), 350)
            }}
            className="w-full px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 font-black text-lg rounded-xl shadow-glow-gold hover:shadow-premium-lg transition-all hover:scale-105 active:scale-95"
          >
            Continue to Next Battle →
          </button>
        </div>
      </Modal>
    </div>
  )
}
