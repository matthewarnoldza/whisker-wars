import { useEffect, useState } from 'react'
import GameCard from '../components/GameCard'
import Dice from '../components/Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import { useGame } from '../../game/store'
import { DOGS } from '../../game/data'
import { rollD20 } from '../../game/dice'
import { motion, AnimatePresence } from 'framer-motion'
import { shakeVariants, attackVariants, victoryVariants, damageVariants } from '../animations'

interface BattleLog { text: string; type?: 'damage' | 'heal' | 'crit' | 'info' }

export default function BattleArena() {
  const party = useGame(s => s.owned.filter(o => s.selectedForBattle.includes(o.id)))
  const dogIndex = useGame(s => s.dogIndex)
  const addCoins = useGame(s => s.addCoins)
  const nextDog = useGame(s => s.nextDog)
  const updateCatHp = useGame(s => s.updateCatHp)
  const healAllCats = useGame(s => s.healAllCats)
  const addXpToCat = useGame(s => s.addXpToCat)
  const recordBattleResult = useGame(s => s.recordBattleResult)

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

  const dog = DOGS[dogIndex]

  // Reset battle when dog changes
  useEffect(() => {
    setDogHp(dog.health)
    setLog([{ text: `⚔️ A wild ${dog.name} appears!`, type: 'info' }])
    setTurn('player')
    setBattleEnded(false)
    setSelectedCatId(null)
  }, [dogIndex])

  // Enemy Turn Logic
  useEffect(() => {
    if (turn === 'enemy' && !battleEnded && dogHp > 0) {
      const timer = setTimeout(() => handleDogTurn(), 1500)
      return () => clearTimeout(timer)
    }
  }, [turn, battleEnded, dogHp])

  const addLog = (t: string, type?: 'damage' | 'heal' | 'crit' | 'info') => {
    setLog(l => [...l, { text: t, type }])
    // Keep log short
    if (log.length > 5) setLog(l => l.slice(1))
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

    const cat = party.find(c => c.id === selectedCatId)
    if (!cat || cat.currentHp <= 0) return

    setAttackingId(cat.id)
    addLog(`${cat.name} attacks!`, 'info')

    const v = await roll()

    // Base damage
    let dmg = cat.currentAttack + Math.floor(v / 5)
    let isCrit = false

    // Abilities
    if (cat.ability.effect === 'crit' && v >= 15) {
      dmg = Math.floor(dmg * 1.5)
      isCrit = true
    }
    if (cat.ability.effect === 'bleed' && v >= 15) dmg += 2
    if (cat.ability.effect === 'heal' && v >= 16) {
      const newHp = Math.min(cat.maxHp, cat.currentHp + 3)
      updateCatHp(cat.id, newHp)
      addLog(`${cat.name} heals 3 HP! ✨`, 'heal')
    }
    if (cat.ability.effect === 'lifesteal') {
      const healAmount = Math.floor(dmg * 0.5)
      const newHp = Math.min(cat.maxHp, cat.currentHp + healAmount)
      updateCatHp(cat.id, newHp)
      addLog(`${cat.name} steals ${healAmount} HP! 🩸`, 'heal')
    }

    // Stun on natural 20
    if (v === 20 && cat.ability.effect === 'stun') {
      addLog('💥 CRITICAL STUN! The dog flinches!', 'crit')
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      setDogHp(h => Math.max(0, h - dmg))
      showDamage(dmg, window.innerWidth / 2, 100)

      // Stun means player goes again
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

    const t = targets[Math.floor(Math.random() * targets.length)]
    const newHp = Math.max(0, t.currentHp - dmg)
    updateCatHp(t.id, newHp)

    // Find target position (approximate)
    const targetIndex = party.findIndex(c => c.id === t.id)
    // This is a bit hacky for positioning, but works for now
    const xPos = (window.innerWidth / 3) * (targetIndex + 0.5)
    showDamage(dmg, xPos, window.innerHeight - 200)

    addLog(`${dog.name} hits ${t.name} for ${dmg}!`, 'damage')

    setAttackingId(null)

    // Check Defeat
    if (party.every(c => (c.id === t.id ? newHp <= 0 : c.currentHp <= 0))) {
      handleDefeat()
    } else {
      setTurn('player')
    }
  }

  const handleVictory = () => {
    setBattleEnded(true)
    const xpEarned = 30 + dogIndex * 10
    addLog(`🎉 VICTORY!`, 'info')
    addLog(`+${xpEarned} XP, +40 Coins`, 'info')

    party.forEach(cat => addXpToCat(cat.id, xpEarned))
    addCoins(40)
    recordBattleResult(true, xpEarned)
    healAllCats()

    setTimeout(() => {
      nextDog()
    }, 3000)
  }

  const handleDefeat = () => {
    setBattleEnded(true)
    addLog(`💀 DEFEAT!`, 'info')
    recordBattleResult(false, 0)
  }

  return (
    <div className="relative min-h-[80vh] flex flex-col">
      {/* Top Area: Enemy */}
      <div className="flex-1 flex justify-center items-start pt-8 relative">
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            variants={shakeVariants}
            animate={shaking ? 'shake' : 'idle'}
            className="relative"
          >
            <GameCard
              character={dog}
              isEnemy={true}
              animate={false}
              showStats={false} // We show big stats for boss
            />
            {/* Boss HP Bar */}
            <div className="absolute -bottom-8 left-0 right-0">
              <StatBar current={dogHp} max={dog.health} label="BOSS HP" type="hp" showNumbers={true} />
            </div>
          </motion.div>

          {/* Damage Numbers */}
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
        </div>
      </div>

      {/* Middle Area: Dice & Log & Controls */}
      <div className="flex justify-center items-center gap-8 my-4 z-20">
        {/* Log */}
        <div className="w-64 h-32 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 overflow-hidden border border-slate-700 text-xs font-mono shadow-fantasy">
          {log.map((l, i) => (
            <div key={i} className={`mb-1 ${l.type === 'crit' ? 'text-yellow-400 font-bold' :
                l.type === 'damage' ? 'text-red-400' :
                  l.type === 'heal' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
              {l.text}
            </div>
          ))}
        </div>

        {/* Dice */}
        <div className="flex flex-col items-center">
          <Dice value={dice} rolling={rolling} />
          {turn === 'player' && !battleEnded && (
            <div className="mt-2 text-gold-400 font-bold animate-pulse font-heading tracking-widest">
              YOUR TURN
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="w-64 flex justify-center">
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
            <div className="text-slate-400 text-sm text-center italic">
              Select a cat to attack
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: Player Party */}
      <div className="flex-1 flex justify-center items-end pb-8 gap-4">
        {party.map(cat => {
          const isSelected = selectedCatId === cat.id
          const isDead = cat.currentHp <= 0
          return (
            <motion.div
              key={cat.id}
              variants={attackVariants}
              animate={attackingId === cat.id ? 'attack' : 'idle'}
              className="relative group cursor-pointer"
              onClick={() => !isDead && turn === 'player' && setSelectedCatId(cat.id)}
            >
              {/* Health Bar Above Card */}
              <div className="absolute -top-8 left-0 right-0 px-2">
                <StatBar
                  current={cat.currentHp}
                  max={cat.maxHp}
                  type="hp"
                  showNumbers={true}
                  label={cat.name}
                />
              </div>

              <div className={`transition-all duration-300 ${isSelected ? 'transform -translate-y-4 scale-105' : 'hover:-translate-y-2'}`}>
                <GameCard
                  character={cat}
                  selected={isSelected}
                  disabled={isDead || (turn !== 'player' && !isSelected)}
                  showStats={true}
                />
              </div>

              {/* Active Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -top-20 left-0 right-0 flex justify-center"
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

      <ParticleSystem
        x={window.innerWidth / 2}
        y={200}
        active={particleActive}
        count={20}
        colors={['#FF0000', '#FF4444', '#FF6666']}
      />
    </div>
  )
}
