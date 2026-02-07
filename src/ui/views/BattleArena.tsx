import { useEffect, useState, useRef, useMemo } from 'react'
import GameCard from '../components/GameCard'
import D20Dice from '../components/D20Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import BattleLogPanel, { type BattleLog } from '../components/BattleLogPanel'
import BattleVictoryModal from '../components/BattleVictoryModal'
import BattleDefeatModal from '../components/BattleDefeatModal'
import StoneCelebrationModal from '../components/StoneCelebrationModal'
import { useGame } from '../../game/store'
import { DOGS } from '../../game/data'
import { rollD20 } from '../../game/dice'
import { resolveAbility, resolveDefense } from '../../game/abilityResolver'
import { BATTLE_BASE_COINS, BATTLE_COINS_PER_DOG, BATTLE_BASE_XP, BATTLE_XP_PER_DOG, getDifficultyMultiplier, BATTLE_LOG_MAX_ENTRIES } from '../../game/constants'
import { EQUIPMENT, rollEquipmentDrop, STONES, rollStoneDrop } from '../../game/items'
import { getActiveEvents, getActiveCoinMultiplier, getEventPeriodKey, getActiveElement, getScaledFrenzyDog, FRENZY_STONES, type GameEvent, type FrenzyElement } from '../../game/events'
import { resolveStoneEffect } from '../../game/stoneResolver'
import { playSound } from '../../utils/sound'
import { motion, AnimatePresence } from 'framer-motion'
import { shakeVariants, attackVariants, victoryVariants, damageVariants } from '../animations'
import {
  trackBattleStart,
  trackAbilityTriggered,
  trackBattleWon,
  trackBattleLost,
  trackCoinsEarned,
} from '../../utils/analytics'

export default function BattleArena() {
  // Separate selectors + useMemo to avoid recomputing on every store update
  const owned = useGame(s => s.owned)
  const selectedForBattle = useGame(s => s.selectedForBattle)
  const party = useMemo(
    () => owned.filter(o => selectedForBattle.includes(o.instanceId)),
    [owned, selectedForBattle]
  )
  const storeDogIndex = useGame(s => s.dogIndex)
  const difficultyLevel = useGame(s => s.difficultyLevel)
  const addCoins = useGame(s => s.addCoins)
  const nextDog = useGame(s => s.nextDog)
  const updateCatHp = useGame(s => s.updateCatHp)
  const healAllCats = useGame(s => s.healAllCats)
  const addXpToCat = useGame(s => s.addXpToCat)
  const recordBattleResult = useGame(s => s.recordBattleResult)
  const setView = useGame(s => s.setView)
  const stats = useGame(s => s.stats)
  const addEquipment = useGame(s => s.addEquipment)
  const consumeStone = useGame(s => s.consumeStone)
  const soundEnabled = useGame(s => s.soundEnabled)
  const completedEventRewards = useGame(s => s.completedEventRewards)

  // Dog selection: battleDogIndex can differ from storeDogIndex for replays
  const [showDogSelect, setShowDogSelect] = useState(true)
  const [battleDogIndex, setBattleDogIndex] = useState(storeDogIndex)
  const isFrontierBattle = battleDogIndex === storeDogIndex

  // Event battles
  const activeEvents = useMemo(() => getActiveEvents(), [])
  const [eventBattle, setEventBattle] = useState<GameEvent | null>(null)
  const coinMultiplier = useMemo(() => getActiveCoinMultiplier(), [])

  // Boss Rush mode
  const [bossRushActive, setBossRushActive] = useState(false)
  const [bossRushDogIndex, setBossRushDogIndex] = useState(0)
  const [bossRushHighest, setBossRushHighest] = useState(0)

  const [dogHp, setDogHp] = useState(DOGS[battleDogIndex].health)
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
  const [showStoneCelebration, setShowStoneCelebration] = useState(false)
  const [droppedStone, setDroppedStone] = useState<typeof STONES[number] | null>(null)
  const [pendingVictoryAction, setPendingVictoryAction] = useState<(() => void) | null>(null)
  const [victoryRewards, setVictoryRewards] = useState<{ coins: number; xp: number; equipDrop?: string; stoneDrop?: string }>({ coins: 0, xp: 0 })
  const [silenced, setSilenced] = useState(false) // Omega Fenrir ability
  const [frozenCatId, setFrozenCatId] = useState<string | null>(null) // Frost Wolf ability
  const [dogDodgeChance, setDogDodgeChance] = useState(0) // Shadow Stalker ability
  const [dogArmor, setDogArmor] = useState(0) // Crystal Guardian ability
  const [dotEffects, setDotEffects] = useState<{ catId: string; turnsLeft: number; dmgPerTurn: number; type: string }[]>([]) // poison/burn
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>({}) // catInstanceId -> turns remaining
  // Read fresh HP from the Zustand store (avoids stale closure values)
  const isAllPartyDead = () => {
    const fresh = useGame.getState().owned
    return fresh
      .filter(o => selectedForBattle.includes(o.instanceId))
      .every(c => c.currentHp <= 0)
  }

  const ABILITY_COOLDOWN = 3 // Turns between active ability uses
  // Stone activation state
  const [stoneActivated, setStoneActivated] = useState<Record<string, boolean>>({})
  const [rockShieldCatId, setRockShieldCatId] = useState<string | null>(null)
  const [stoneBurnOnDog, setStoneBurnOnDog] = useState<{ dmgPerTurn: number; turnsLeft: number } | null>(null)
  const [stoneFreezeOnDog, setStoneFreezeOnDog] = useState(false)
  const mobileLogRef = useRef<HTMLDivElement>(null)
  const desktopLogRef = useRef<HTMLDivElement>(null)

  const dog = eventBattle ? eventBattle.eventDog : DOGS[battleDogIndex]

  // Elite Aura: +1 ATK per living elite cat in party
  const eliteAuraBonus = useMemo(() => {
    return party.filter(c => c.isElite && c.currentHp > 0).length
  }, [party])

  // Stone info for selected cat (for UI button display)
  const selectedCatStone = useMemo(() => {
    if (!selectedCatId) return null
    const cat = party.find(c => c.instanceId === selectedCatId)
    const stoneId = cat?.equipment?.stone
    if (!stoneId || stoneActivated[selectedCatId]) return null
    return STONES.find(s => s.id === stoneId) ?? null
  }, [selectedCatId, party, stoneActivated])

  // Reset battle when dog changes
  useEffect(() => {
    setDogHp(dog.health)
    const initialLog: BattleLog[] = [{ text: `⚔️ A wild ${dog.name} appears!`, type: 'info' }]
    if (eliteAuraBonus > 0) {
      initialLog.push({ text: `✨ Elite Aura: +${eliteAuraBonus} ATK to all party members!`, type: 'info' })
    }
    if (coinMultiplier > 1) {
      initialLog.push({ text: `🎪 Event bonus: x${coinMultiplier} coins!`, type: 'info' })
    }
    setLog(initialLog)
    setTurn('player')
    setBattleEnded(false)
    setSelectedCatId(null)
    setSilenced(false)
    setFrozenCatId(null)
    setDogDodgeChance(0)
    setDogArmor(0)
    setDotEffects([])
    setStoneActivated({})
    setRockShieldCatId(null)
    setStoneBurnOnDog(null)
    setStoneFreezeOnDog(false)
    // Initialize ability cooldowns (start ready)
    const initialCooldowns: Record<string, number> = {}
    party.forEach(c => { initialCooldowns[c.instanceId] = 0 })
    setAbilityCooldowns(initialCooldowns)
    // Set passive dog abilities
    if (DOGS[battleDogIndex]?.id === 'shadow-stalker') setDogDodgeChance(0.30)
    if (DOGS[battleDogIndex]?.id === 'crystal-guardian') setDogArmor(4)
    // Frenzy dog passives
    if (eventBattle?.eventDog?.id === 'obsidian-shade') setDogDodgeChance(0.20)
    if (party.length > 0) {
      trackBattleStart(party.length, party.map(c => c.name).join(','), dog.name, difficultyLevel)
    }
  }, [battleDogIndex, eventBattle])

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

  // Process DOT effects (poison/burn) at start of player turn
  useEffect(() => {
    if (turn === 'player' && !battleEnded && dotEffects.length > 0) {
      dotEffects.forEach(dot => {
        const cat = party.find(c => c.instanceId === dot.catId)
        if (cat && cat.currentHp > 0) {
          const newHp = Math.max(0, cat.currentHp - dot.dmgPerTurn)
          updateCatHp(dot.catId, newHp)
          const icon = dot.type === 'poison' ? '🟢' : '🔥'
          addLog(`${icon} ${cat.name} takes ${dot.dmgPerTurn} ${dot.type} damage!`, 'damage')
        }
      })
      // Decrement turns and remove expired effects
      setDotEffects(prev => prev
        .map(d => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
        .filter(d => d.turnsLeft > 0)
      )
      // Check if DOT killed all cats
      if (isAllPartyDead()) {
        handleDefeat()
      }
    }
  }, [turn])

  // Process stone burn DOT on dog at start of player turn
  useEffect(() => {
    if (turn === 'player' && !battleEnded && stoneBurnOnDog) {
      const burnDmg = stoneBurnOnDog.dmgPerTurn
      const newHp = Math.max(0, dogHp - burnDmg)
      setDogHp(newHp)
      addLog(`🔥 Burn deals ${burnDmg} damage to ${dog.name}!`, 'damage')
      if (stoneBurnOnDog.turnsLeft <= 1) {
        addLog(`🔥 Burn on ${dog.name} wears off.`, 'info')
        setStoneBurnOnDog(null)
      } else {
        setStoneBurnOnDog({ ...stoneBurnOnDog, turnsLeft: stoneBurnOnDog.turnsLeft - 1 })
      }
      if (newHp <= 0) {
        handleVictory()
      }
    }
  }, [turn])

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
    if (soundEnabled) playSound('diceRoll')
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

    // Frost Wolf freeze check — frozen cat skips their turn
    if (frozenCatId === cat.instanceId) {
      addLog(`❄️ ${cat.name} is frozen and can't attack!`, 'damage')
      setFrozenCatId(null)
      setAttackingId(null)
      setTurn('enemy')
      return
    }

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

    // Equipment ATK bonus
    const equipAtk = ((cat.equipment?.weapon ? EQUIPMENT.find(e => e.id === cat.equipment!.weapon)?.atkBonus : 0) || 0)
      + ((cat.equipment?.accessory ? EQUIPMENT.find(e => e.id === cat.equipment!.accessory)?.atkBonus : 0) || 0)

    // Base damage with Elite Aura bonus + equipment
    const baseDmg = cat.currentAttack + eliteAuraBonus + equipAtk + Math.floor(v / 5)

    // Check if silenced (Omega Fenrir ability) — silence wears off after one turn
    const wasSilenced = silenced
    if (silenced) setSilenced(false)

    // Resolve ability effects
    const result = resolveAbility(cat, v, baseDmg, wasSilenced)
    const { damage: dmg, isCrit, healAmount, healTargetId, isStun, isSpeed, logMessages, abilityTriggered } = result

    // Apply log messages
    logMessages.forEach(msg => addLog(msg.text, msg.type))

    // Track ability analytics
    if (abilityTriggered) {
      trackAbilityTriggered(cat.name, abilityTriggered.abilityName, abilityTriggered.effectType, 'battle')
      if (soundEnabled) playSound('abilityTrigger')
    }

    // Apply healing if any
    if (healAmount > 0 && healTargetId) {
      const newHp = Math.min(cat.maxHp, cat.currentHp + healAmount)
      updateCatHp(healTargetId, newHp)
      if (soundEnabled) playSound('heal')
    }

    // Shadow Stalker dodge check
    if (dogDodgeChance > 0 && Math.random() < dogDodgeChance) {
      addLog(`👻 ${dog.name} dodges the attack!`, 'info')
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    // Apply Crystal Guardian armor reduction
    let finalDmg = dmg
    if (dogArmor > 0) {
      finalDmg = Math.max(1, dmg - dogArmor)
      if (finalDmg < dmg) {
        addLog(`🛡️ ${dog.name}'s crystal armor absorbs ${dmg - finalDmg} damage!`, 'info')
      }
    }

    // Void Walker — ignore cat armor/shield (already resolved, but this is for dog's armor)
    // Apply damage and check victory
    const newDogHp = Math.max(0, dogHp - finalDmg)
    setDogHp(newDogHp)
    showDamage(finalDmg, window.innerWidth / 2, 100)

    setShaking(true)
    setTimeout(() => setShaking(false), 400)
    setParticleActive(true)
    setTimeout(() => setParticleActive(false), 100)

    // Stun path
    if (isStun) {
      addLog('💥 STUN! The enemy flinches and misses a turn!', 'crit')
      if (newDogHp <= 0) { handleVictory(); return }
      setAttackingId(null)
      return
    }

    // Speed path — extra attack, player goes again
    if (isSpeed) {
      if (newDogHp <= 0) { handleVictory(); return }
      setAttackingId(null)
      return
    }

    // Normal hit
    if (isCrit) {
      addLog(`💥 Critical Hit! ${dmg} damage!`, 'crit')
      if (soundEnabled) playSound('criticalHit')
    } else {
      addLog(`Hit for ${dmg} damage.`, 'damage')
      if (soundEnabled) playSound('attack')
    }

    if (newDogHp <= 0) { handleVictory(); return }

    // Decrement cooldowns for the acting cat
    setAbilityCooldowns(prev => ({
      ...prev,
      [cat.instanceId]: Math.max(0, (prev[cat.instanceId] ?? ABILITY_COOLDOWN) - 1),
    }))

    setAttackingId(null)
    setTurn('enemy')
  }

  const handleStoneAttack = async () => {
    if (!selectedCatId || turn !== 'player' || battleEnded) return

    const cat = party.find(c => c.instanceId === selectedCatId)
    if (!cat || cat.currentHp <= 0) return
    if (!cat.equipment?.stone || stoneActivated[cat.instanceId]) return

    const stoneId = cat.equipment.stone
    const stone = STONES.find(s => s.id === stoneId)
    if (!stone) return

    // Frozen cat can't attack
    if (frozenCatId === cat.instanceId) {
      addLog(`❄️ ${cat.name} is frozen and can't attack!`, 'damage')
      setFrozenCatId(null)
      setTurn('enemy')
      return
    }

    setAttackingId(cat.instanceId)
    addLog(`💎 ${cat.name} channels ${stone.name}!`, 'crit')

    const v = await roll()

    // Critical fail — stone consumed, no effect
    if (v === 1) {
      addLog(`🎲 CRITICAL FAIL! 💥 The stone shatters uselessly!`, 'damage')
      consumeStone(cat.instanceId)
      setStoneActivated(prev => ({ ...prev, [cat.instanceId]: true }))
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    if (v === 20) {
      addLog(`🎲 NATURAL 20! ⚡ LEGENDARY STONE STRIKE! ⚡`, 'crit')
    }

    // Equipment ATK bonus
    const equipAtk = ((cat.equipment?.weapon ? EQUIPMENT.find(e => e.id === cat.equipment!.weapon)?.atkBonus : 0) || 0)
      + ((cat.equipment?.accessory ? EQUIPMENT.find(e => e.id === cat.equipment!.accessory)?.atkBonus : 0) || 0)

    const baseDmg = cat.currentAttack + eliteAuraBonus + equipAtk + Math.floor(v / 5)

    // Resolve stone effect
    const element = stone.element as FrenzyElement
    const result = resolveStoneEffect(element, cat, baseDmg)

    // Log stone effect messages
    result.logMessages.forEach(msg => addLog(msg.text, msg.type))

    // Apply burn on dog
    if (result.burnApplied) {
      setStoneBurnOnDog({ dmgPerTurn: result.burnApplied.dmgPerTurn, turnsLeft: result.burnApplied.turns })
    }

    // Apply freeze on dog
    if (result.freezeApplied) {
      setStoneFreezeOnDog(true)
    }

    // Apply rock shield on cat
    if (result.rockShieldApplied) {
      setRockShieldCatId(cat.instanceId)
    }

    // Apply lifesteal
    if (result.healAmount > 0 && result.healTargetId) {
      const healTarget = party.find(c => c.instanceId === result.healTargetId)
      if (healTarget) {
        const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + result.healAmount)
        updateCatHp(result.healTargetId, newHp)
      }
    }

    // Shadow Stalker / Obsidian Shade dodge check
    if (dogDodgeChance > 0 && Math.random() < dogDodgeChance) {
      addLog(`👻 ${dog.name} dodges the stone attack!`, 'info')
      consumeStone(cat.instanceId)
      setStoneActivated(prev => ({ ...prev, [cat.instanceId]: true }))
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    // Apply armor reduction
    let finalDmg = result.damage
    if (dogArmor > 0) {
      finalDmg = Math.max(1, result.damage - dogArmor)
      if (finalDmg < result.damage) {
        addLog(`🛡️ ${dog.name}'s armor absorbs ${result.damage - finalDmg} damage!`, 'info')
      }
    }

    // Apply damage
    let newDogHp = Math.max(0, dogHp - finalDmg)
    setDogHp(newDogHp)
    showDamage(finalDmg, window.innerWidth / 2, 100)

    setShaking(true)
    setTimeout(() => setShaking(false), 400)
    setParticleActive(true)
    setTimeout(() => setParticleActive(false), 100)

    // Double strike (Lightning) — second hit
    if (result.doubleStrike && newDogHp > 0) {
      const secondDmg = Math.max(1, baseDmg - dogArmor)
      addLog(`⚡ Second strike hits for ${secondDmg}!`, 'crit')
      newDogHp = Math.max(0, newDogHp - secondDmg)
      setDogHp(newDogHp)
      showDamage(secondDmg, window.innerWidth / 2 + 30, 120)
    }

    // Consume stone and mark activated
    consumeStone(cat.instanceId)
    setStoneActivated(prev => ({ ...prev, [cat.instanceId]: true }))

    if (newDogHp <= 0) {
      handleVictory()
      return
    }

    setAttackingId(null)
    setTurn('enemy')
  }

  const handleActiveAbility = (catId: string) => {
    if (turn !== 'player' || rolling || battleEnded) return
    const cat = party.find(c => c.instanceId === catId)
    if (!cat || cat.currentHp <= 0) return
    if ((abilityCooldowns[catId] ?? ABILITY_COOLDOWN) > 0) return

    setAttackingId(catId)

    // Equipment ATK bonus
    const equipAtk = ((cat.equipment?.weapon ? EQUIPMENT.find(e => e.id === cat.equipment!.weapon)?.atkBonus : 0) || 0)
      + ((cat.equipment?.accessory ? EQUIPMENT.find(e => e.id === cat.equipment!.accessory)?.atkBonus : 0) || 0)

    const baseAtk = cat.currentAttack + eliteAuraBonus + equipAtk
    const effect = cat.ability.effect

    addLog(`✨ ${cat.name} activates ${cat.ability.name}!`, 'crit')

    let dmg = 0
    if (effect === 'crit') {
      dmg = Math.floor(baseAtk * 2)
      addLog(`💥 Critical Strike deals ${dmg} damage!`, 'crit')
    } else if (effect === 'bleed') {
      dmg = baseAtk + 8
      addLog(`🔥 Burning Strike deals ${dmg} damage!`, 'crit')
    } else if (effect === 'heal') {
      const healAmt = Math.floor(cat.maxHp * 0.4)
      party.forEach(c => {
        if (c.currentHp > 0) updateCatHp(c.instanceId, Math.min(c.maxHp, c.currentHp + healAmt))
      })
      addLog(`💚 Heals all cats for ${healAmt} HP!`, 'heal')
    } else if (effect === 'lifesteal') {
      dmg = baseAtk
      const stolen = Math.floor(dmg * 0.75)
      updateCatHp(cat.instanceId, Math.min(cat.maxHp, cat.currentHp + stolen))
      addLog(`🩸 Drains ${stolen} HP from enemy! Deals ${dmg} damage.`, 'heal')
    } else if (effect === 'stun') {
      dmg = Math.floor(baseAtk * 0.5)
      addLog(`💥 Stun Strike deals ${dmg} damage and stuns!`, 'crit')
      // Skip dog's next turn by setting turn back to player after a delay
    } else if (effect === 'shield') {
      addLog(`🛡️ Shield Wall! Party takes 50% less damage next turn.`, 'info')
      // Could be tracked with state, but for simplicity: set dogArmor temporarily
    } else if (effect === 'armor') {
      dmg = baseAtk
      addLog(`🛡️ Fortified Strike deals ${dmg} damage!`, 'crit')
    } else if (effect === 'speed') {
      dmg = baseAtk
      addLog(`⚡ Lightning Strike deals ${dmg} damage! Attacks again!`, 'crit')
    }

    if (dmg > 0) {
      const newDogHp = Math.max(0, dogHp - dmg)
      setDogHp(newDogHp)
      setShaking(true)
      setParticleActive(true)
      setTimeout(() => { setShaking(false); setParticleActive(false) }, 400)

      if (newDogHp <= 0) { handleVictory(); return }
    }

    // Reset cooldown
    setAbilityCooldowns(prev => ({ ...prev, [catId]: ABILITY_COOLDOWN }))

    setAttackingId(null)

    // Speed effect: player goes again
    if (effect === 'speed') return
    // Stun effect: skip dog turn
    if (effect === 'stun') return

    setTurn('enemy')
  }

  const handleDogTurn = async () => {
    // Stone freeze check — frozen dog skips turn
    if (stoneFreezeOnDog) {
      setStoneFreezeOnDog(false)
      addLog(`❄️ ${dog.name} is frozen solid! Skips turn!`, 'crit')
      setTurn('player')
      return
    }

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
    if (dog.id === 'eternal-overlord') {
      addLog(`☠️ Apocalypse Aura damages all cats!`, 'damage')
      targets.forEach(cat => {
        const newHp = Math.max(0, cat.currentHp - 2)
        updateCatHp(cat.instanceId, newHp)
      })
    }

    // === DOG ABILITY: Echo Howler - Sonic Howl (AoE) ===
    if (dog.id === 'echo-howler') {
      const aoeDmg = Math.floor(dmg * 0.5)
      addLog(`📢 Sonic Howl hits ALL cats for ${aoeDmg} damage!`, 'damage')
      targets.forEach(cat => {
        const newHp = Math.max(0, cat.currentHp - aoeDmg)
        updateCatHp(cat.instanceId, newHp)
      })
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      setAttackingId(null)
      const allDead = targets.every(c => c.currentHp - aoeDmg <= 0)
      if (allDead) { handleDefeat() } else { setTurn('player') }
      return
    }

    // === DOG ABILITY: Tentacle Paws - Multi-target ===
    if (dog.id === 'tentacle-paws') {
      const multiDmg = Math.floor(dmg * 0.6)
      addLog(`🐙 Tentacle Grab hits all cats for ${multiDmg} each!`, 'damage')
      targets.forEach(cat => {
        const defense = resolveDefense(cat, multiDmg, silenced)
        defense.logMessages.forEach(msg => addLog(msg.text, msg.type))
        const newHp = Math.max(0, cat.currentHp - defense.actualDamage)
        updateCatHp(cat.instanceId, newHp)
      })
      setAttackingId(null)
      if (isAllPartyDead()) { handleDefeat() } else { setTurn('player') }
      return
    }

    // === FRENZY DOG: Granite Colossus - Tectonic Slam (AoE + armor) ===
    if (dog.id === 'granite-colossus') {
      const aoeDmg = Math.floor(dmg * 0.4)
      addLog(`🪨 Tectonic Slam hits ALL cats for ${aoeDmg}!`, 'damage')
      targets.forEach(cat => {
        const defense = resolveDefense(cat, aoeDmg, silenced)
        defense.logMessages.forEach(msg => addLog(msg.text, msg.type))
        const newHp = Math.max(0, cat.currentHp - defense.actualDamage)
        updateCatHp(cat.instanceId, newHp)
      })
      setDogArmor(a => a + 3)
      addLog(`🛡️ ${dog.name} gains 3 armor!`, 'info')
      setAttackingId(null)
      if (isAllPartyDead()) { handleDefeat() } else { setTurn('player') }
      return
    }

    // === DOG ABILITY: Infernal Cerberus - Triple Hellfire ===
    if (dog.id === 'infernal-cerberus') {
      addLog(`🔥🔥🔥 Triple Hellfire! 3 attacks!`, 'crit')
      for (let strike = 0; strike < 3; strike++) {
        // Read fresh HP from store each strike (previous strikes update store)
        const freshOwned = useGame.getState().owned
        const alive = freshOwned.filter(o => selectedForBattle.includes(o.instanceId) && o.currentHp > 0)
        if (!alive.length) break
        const target = alive[Math.floor(Math.random() * alive.length)]
        const strikeDmg = Math.floor(dmg * 0.6)
        const defense = resolveDefense(target, strikeDmg, silenced)
        defense.logMessages.forEach(msg => addLog(msg.text, msg.type))
        const newHp = Math.max(0, target.currentHp - defense.actualDamage)
        updateCatHp(target.instanceId, newHp)
        addLog(`🔥 Strike ${strike + 1} hits ${target.name} for ${defense.actualDamage}!`, 'damage')
      }
      setAttackingId(null)
      if (isAllPartyDead()) { handleDefeat() } else { setTurn('player') }
      return
    }

    const t = targets[Math.floor(Math.random() * targets.length)]

    // Rock shield check — absorbs one hit completely
    if (rockShieldCatId === t.instanceId) {
      setRockShieldCatId(null)
      addLog(`🪨 Rock Shield absorbs the hit on ${t.name}!`, 'info')
      setAttackingId(null)
      setTurn('player')
      return
    }

    // === DOG ABILITY: Void Walker - Void Strike (ignores armor/shield) ===
    let actualDamage: number
    if (dog.id === 'void-walker') {
      actualDamage = dmg
      addLog(`🌀 Void Strike bypasses ${t.name}'s defenses!`, 'crit')
    } else {
      // Apply defensive abilities
      const defense = resolveDefense(t, dmg, silenced)
      actualDamage = defense.actualDamage
      defense.logMessages.forEach(msg => addLog(msg.text, msg.type))
    }

    const tIsElite = t.isElite === true
    const tEliteTier = t.eliteTier || 0

    // === DOG ABILITY: Eternal Overlord - Damage Reflect ===
    if (dog.id === 'eternal-overlord') {
      const reflectDmg = Math.floor(actualDamage * 0.2)
      if (reflectDmg > 0) {
        addLog(`🔄 Apocalypse Aura reflects ${reflectDmg} damage!`, 'damage')
        const reflectHp = Math.max(0, t.currentHp - reflectDmg)
        updateCatHp(t.instanceId, reflectHp)
      }
    }

    let newHp = Math.max(0, t.currentHp - actualDamage)

    // Stellar Resilience - Elite cats have a chance to survive lethal blow
    if (newHp <= 0 && tIsElite) {
      const surviveChance = tEliteTier >= 2 ? 0.25 : 0.15
      if (Math.random() < surviveChance) {
        newHp = 1
        addLog(`✨ ${t.name}'s Stellar Resilience triggers! Survives with 1 HP!`, 'heal')
      }
    }

    updateCatHp(t.instanceId, newHp)

    const targetIndex = party.findIndex(c => c.instanceId === t.instanceId)
    const xPos = (window.innerWidth / 3) * (targetIndex + 0.5)
    showDamage(actualDamage, xPos, window.innerHeight - 200)

    addLog(`${dog.name} hits ${t.name} for ${actualDamage}!`, 'damage')

    // === DOG ABILITY: Slime Hound - Toxic Bite (Poison DOT) ===
    if (dog.id === 'slime-hound') {
      addLog(`🟢 Toxic Bite poisons ${t.name}!`, 'damage')
      setDotEffects(prev => [...prev.filter(d => !(d.catId === t.instanceId && d.type === 'poison')),
        { catId: t.instanceId, turnsLeft: 3, dmgPerTurn: 2, type: 'poison' }
      ])
    }

    // === DOG ABILITY: Magma Beast - Lava Burst (Burn DOT) ===
    if (dog.id === 'magma-beast') {
      addLog(`🔥 Lava Burst ignites ${t.name}!`, 'damage')
      setDotEffects(prev => [...prev.filter(d => !(d.catId === t.instanceId && d.type === 'burn')),
        { catId: t.instanceId, turnsLeft: 3, dmgPerTurn: 3, type: 'burn' }
      ])
    }

    // === FRENZY DOG: Ember Drake - Inferno Breath (Burn DOT) ===
    if (dog.id === 'ember-drake') {
      addLog(`🔥 Inferno Breath burns ${t.name}!`, 'damage')
      setDotEffects(prev => [...prev.filter(d => !(d.catId === t.instanceId && d.type === 'burn')),
        { catId: t.instanceId, turnsLeft: 2, dmgPerTurn: 4, type: 'burn' }
      ])
    }

    // === DOG ABILITY: Frost Wolf - Ice Breath (Freeze) ===
    if (dog.id === 'frost-wolf') {
      const freezeTarget = targets[Math.floor(Math.random() * targets.length)]
      setFrozenCatId(freezeTarget.instanceId)
      addLog(`❄️ Ice Breath freezes ${freezeTarget.name}! They'll skip next turn!`, 'crit')
    }

    // === FRENZY DOG: Glacial Howler - Permafrost Howl (Freeze) ===
    if (dog.id === 'glacial-howler') {
      const freezeTarget = targets[Math.floor(Math.random() * targets.length)]
      setFrozenCatId(freezeTarget.instanceId)
      addLog(`❄️ Permafrost Howl freezes ${freezeTarget.name}! They'll skip next turn!`, 'crit')
    }

    // === DOG ABILITY: Thunder Hound - Lightning Strike (Chain) ===
    if (dog.id === 'thunder-hound') {
      const otherTargets = targets.filter(c => c.instanceId !== t.instanceId && c.currentHp > 0)
      if (otherTargets.length > 0) {
        const chainTarget = otherTargets[Math.floor(Math.random() * otherTargets.length)]
        const chainDmg = Math.floor(actualDamage * 0.5)
        const chainHp = Math.max(0, chainTarget.currentHp - chainDmg)
        updateCatHp(chainTarget.instanceId, chainHp)
        addLog(`⚡ Lightning chains to ${chainTarget.name} for ${chainDmg}!`, 'damage')
      }
    }

    // === FRENZY DOG: Voltfang Warden - Chain Lightning ===
    if (dog.id === 'voltfang-warden') {
      const otherTargets = targets.filter(c => c.instanceId !== t.instanceId && c.currentHp > 0)
      if (otherTargets.length > 0) {
        const chainTarget = otherTargets[Math.floor(Math.random() * otherTargets.length)]
        const chainDmg = Math.floor(actualDamage * 0.6)
        const chainHp = Math.max(0, chainTarget.currentHp - chainDmg)
        updateCatHp(chainTarget.instanceId, chainHp)
        addLog(`⚡ Chain Lightning arcs to ${chainTarget.name} for ${chainDmg}!`, 'damage')
      }
    }

    // === DOG ABILITY: Chaos Demon - Random effect ===
    if (dog.id === 'chaos-demon') {
      const chaosRoll = Math.random()
      if (chaosRoll < 0.25) {
        // Heal self
        const chaosHeal = Math.floor(dog.health * 0.1)
        setDogHp(h => Math.min(dog.health, h + chaosHeal))
        addLog(`🎭 Chaotic Energy heals ${dog.name} for ${chaosHeal}!`, 'heal')
      } else if (chaosRoll < 0.5) {
        // Damage all cats
        const chaosDmg = Math.floor(dmg * 0.3)
        addLog(`🎭 Chaotic Energy damages all cats for ${chaosDmg}!`, 'damage')
        targets.forEach(cat => {
          const hp = Math.max(0, cat.currentHp - chaosDmg)
          updateCatHp(cat.instanceId, hp)
        })
      } else if (chaosRoll < 0.75) {
        // Silence
        setSilenced(true)
        addLog(`🎭 Chaotic Energy silences cat abilities!`, 'crit')
      } else {
        // Extra damage to target
        const bonusDmg = Math.floor(dmg * 0.5)
        const bonusHp = Math.max(0, t.currentHp - bonusDmg)
        updateCatHp(t.instanceId, bonusHp)
        addLog(`🎭 Chaotic Energy deals ${bonusDmg} bonus damage to ${t.name}!`, 'damage')
      }
    }

    // === DOG ABILITY: Void Emperor - Reality Tear (heal self) ===
    if (dog.id === 'void-emperor') {
      const voidHeal = Math.floor(actualDamage * 0.3)
      setDogHp(h => Math.min(dog.health, h + voidHeal))
      addLog(`🌑 Reality Tear heals ${dog.name} for ${voidHeal} HP!`, 'heal')
    }

    // === DOG ABILITY: Abyssal Devourer - Soul Drain ===
    if (dog.id === 'abyssal-devourer') {
      const healAmount = Math.floor(actualDamage * 0.25)
      setDogHp(h => Math.min(dog.health, h + healAmount))
      addLog(`💀 Soul Drain heals ${dog.name} for ${healAmount} HP!`, 'heal')
    }

    // === FRENZY DOG: Obsidian Shade - Soul Siphon (lifesteal) ===
    if (dog.id === 'obsidian-shade') {
      const siphonHeal = Math.floor(actualDamage * 0.3)
      setDogHp(h => Math.min(dog.health, h + siphonHeal))
      addLog(`🌑 Soul Siphon heals ${dog.name} for ${siphonHeal} HP!`, 'heal')
    }

    // === DOG ABILITY: Omega Fenrir - Ragnarok Howl ===
    if (dog.id === 'omega-fenrir') {
      setSilenced(true)
      addLog(`🐺 Ragnarok Howl! Cat abilities silenced next turn!`, 'crit')
    }

    setAttackingId(null)

    // Check defeat using fresh store state (avoids stale closure HP values)
    if (isAllPartyDead()) {
      handleDefeat()
    } else {
      setTurn('player')
    }
  }

  const handleVictory = () => {
    setBattleEnded(true)
    if (soundEnabled) playSound('victory')
    // Scale rewards based on difficulty level
    const difficultyMultiplier = getDifficultyMultiplier(difficultyLevel)
    const xpEarned = Math.floor((BATTLE_BASE_XP + (battleDogIndex * BATTLE_XP_PER_DOG)) * difficultyMultiplier)
    const coinsEarned = Math.floor((BATTLE_BASE_COINS + (battleDogIndex * BATTLE_COINS_PER_DOG)) * difficultyMultiplier * coinMultiplier)

    addLog(`🎉 VICTORY!`, 'info')
    addLog(`+${xpEarned} XP, +${coinsEarned} Coins`, 'info')

    party.forEach(cat => addXpToCat(cat.instanceId, xpEarned))
    addCoins(coinsEarned)
    recordBattleResult(true, xpEarned)
    if (soundEnabled) playSound('coinEarned')

    trackBattleWon(dog.name, coinsEarned, xpEarned, difficultyLevel)
    trackCoinsEarned('battle', coinsEarned)

    // Roll for equipment drop
    const equipDrop = rollEquipmentDrop(battleDogIndex)
    if (equipDrop) {
      addEquipment(equipDrop.id)
      addLog(`🎁 Loot drop: ${equipDrop.name}!`, 'info')
      if (soundEnabled) playSound('equipDrop')
    }

    // Roll for stone drop (Feline Frenzy Friday only)
    let stoneDropName: string | undefined
    let stoneDropRef: typeof STONES[number] | null = null
    if (eventBattle?.id === 'feline-frenzy') {
      const element = getActiveElement()
      const stoneDrop = rollStoneDrop(element)
      if (stoneDrop) {
        addEquipment(stoneDrop.id) // add to shared inventory
        stoneDropName = stoneDrop.name
        stoneDropRef = stoneDrop
        addLog(`💎 Stone drop: ${stoneDrop.name}!`, 'crit')
        if (soundEnabled) playSound('equipDrop')
      }
    }
    setDroppedStone(stoneDropRef)

    setVictoryRewards({ coins: coinsEarned, xp: xpEarned, equipDrop: equipDrop?.name, stoneDrop: stoneDropName })

    // Boss Rush: auto-advance to next dog
    if (bossRushActive) {
      const nextRushIndex = bossRushDogIndex + 1
      setBossRushHighest(Math.max(bossRushHighest, bossRushDogIndex))
      if (nextRushIndex >= DOGS.length) {
        // Completed all dogs!
        addLog(`🏆 BOSS RUSH COMPLETE! All ${DOGS.length} dogs defeated!`, 'info')
        setBossRushActive(false)
        setTimeout(() => setShowVictoryModal(true), 1000)
      } else {
        addLog(`➡️ Next challenger: ${DOGS[nextRushIndex].name}!`, 'info')
        setBossRushDogIndex(nextRushIndex)
        setBattleDogIndex(nextRushIndex)
        // Don't show victory modal, auto-continue
      }
      return
    }

    setTimeout(() => setShowVictoryModal(true), 1000)
  }

  const handleDefeat = () => {
    setBattleEnded(true)
    if (soundEnabled) playSound('defeat')
    if (bossRushActive) {
      addLog(`💀 Boss Rush ended at dog ${bossRushDogIndex + 1}/${DOGS.length}!`, 'info')
      setBossRushActive(false)
    }
    addLog(`💀 DEFEAT!`, 'info')
    recordBattleResult(false, 0)
    trackBattleLost(dog.name, difficultyLevel)
    // Don't auto-heal - player must heal manually for 20 coins
    setTimeout(() => setShowDefeatModal(true), 1000)
  }

  return (
    <div className="relative min-h-[80vh] flex flex-col space-y-4">
      {/* Dog Selection Screen */}
      {showDogSelect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/30 to-orange-500/30 border border-red-500/50">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold flex-1 text-center">
                <span className="text-lg mr-2">⚔️</span>
                Choose your opponent! Challenge new dogs to progress, or replay defeated ones for rewards.
              </p>
              {storeDogIndex >= DOGS.length && (
                <motion.button
                  onClick={() => {
                    setBossRushActive(true)
                    setBossRushDogIndex(0)
                    setBattleDogIndex(0)
                    setBossRushHighest(0)
                    setShowDogSelect(false)
                  }}
                  className="ml-3 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-xs uppercase tracking-wider border-2 border-red-400/50 shadow-lg whitespace-nowrap"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Boss Rush
                </motion.button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {DOGS.map((d, i) => {
              const isDefeated = i < storeDogIndex
              const isFrontier = i === storeDogIndex
              const isLocked = i > storeDogIndex
              const isBoss = i >= 10

              return (
                <motion.button
                  key={d.id}
                  disabled={isLocked}
                  onClick={() => {
                    setBattleDogIndex(i)
                    setShowDogSelect(false)
                  }}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                    isLocked
                      ? 'border-slate-700 opacity-40 cursor-not-allowed'
                      : isFrontier
                      ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-[1.03]'
                      : 'border-slate-600 hover:border-slate-400 hover:scale-[1.03]'
                  }`}
                  whileHover={!isLocked ? { y: -2 } : {}}
                  whileTap={!isLocked ? { scale: 0.97 } : {}}
                >
                  {/* Dog Image */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                    {d.imageUrl ? (
                      <img
                        src={d.imageUrl}
                        alt={isLocked ? 'Locked' : d.name}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover ${isLocked ? 'brightness-0 opacity-30' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800" />
                    )}

                    {/* Locked overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl">🔒</span>
                      </div>
                    )}

                    {/* Defeated checkmark */}
                    {isDefeated && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-300">
                        <span className="text-white text-xs font-black">✓</span>
                      </div>
                    )}

                    {/* Frontier badge */}
                    {isFrontier && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500 border border-amber-300">
                        <span className="text-[10px] font-black text-slate-900 uppercase">NEW</span>
                      </div>
                    )}

                    {/* Boss badge */}
                    {isBoss && !isLocked && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600 border border-red-400">
                        <span className="text-[10px] font-black text-white uppercase">BOSS</span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="p-2.5 bg-slate-900/90">
                    <h4 className={`font-black text-sm truncate ${isLocked ? 'text-slate-600' : 'text-white'}`}>
                      {isLocked ? '???' : d.name}
                    </h4>
                    {!isLocked && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-red-400 font-bold">HP {d.health}</span>
                        <span className="text-[10px] text-amber-400 font-bold">ATK {d.attack}</span>
                      </div>
                    )}
                    {!isLocked && d.ability && (
                      <p className="text-[9px] text-slate-400 mt-1 truncate">{d.ability.description}</p>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Event Dogs */}
          {activeEvents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-xl">🎪</span> Event Battles
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeEvents.map(event => {
                  const periodKey = getEventPeriodKey(event)
                  const isCompleted = completedEventRewards.includes(periodKey)

                  return (
                    <motion.button
                      key={event.id}
                      onClick={() => {
                        // Scale Frenzy dogs with player progression
                        if (event.id === 'feline-frenzy') {
                          const scaled = getScaledFrenzyDog(event.eventDog, storeDogIndex, difficultyLevel)
                          setEventBattle({ ...event, eventDog: scaled })
                        } else {
                          setEventBattle(event)
                        }
                        setBattleDogIndex(storeDogIndex) // keep store index for non-event logic
                        setShowDogSelect(false)
                      }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                        isCompleted
                          ? 'border-emerald-500/50 hover:scale-[1.03]'
                          : 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-[1.03]'
                      }`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                        {event.eventDog.imageUrl ? (
                          <img
                            src={event.eventDog.imageUrl}
                            alt={event.eventDog.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800" />
                        )}

                        {/* Event badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-purple-600 border border-purple-400">
                          <span className="text-[10px] font-black text-white uppercase">EVENT</span>
                        </div>

                        {/* Event icon */}
                        <div className="absolute top-2 right-2 text-2xl">{event.icon}</div>

                        {isCompleted && (
                          <div className="absolute top-10 right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-300">
                            <span className="text-white text-xs font-black">✓</span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>

                      <div className="p-2.5 bg-slate-900/90">
                        <h4 className="font-black text-sm truncate text-white">{event.eventDog.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-red-400 font-bold">HP {event.eventDog.health}</span>
                          <span className="text-[10px] text-amber-400 font-bold">ATK {event.eventDog.attack}</span>
                        </div>
                        <p className="text-[9px] text-purple-300 mt-1 truncate">{event.name}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Battle Arena (hidden during dog selection) */}
      {!showDogSelect && <>
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-500/50"
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold flex-1 text-center">
            <span className="text-lg mr-2">🎲</span>
            Roll the D20 dice, then select one of your cats to attack! Each cat has unique abilities. Defeat enemy dogs and bosses!
          </p>
          <motion.button
            onClick={() => { setEventBattle(null); setShowDogSelect(true) }}
            className="ml-3 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-600 text-slate-300 text-xs font-bold hover:border-slate-400 transition-all whitespace-nowrap"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Switch Dog
          </motion.button>
        </div>
      </motion.div>

      {/* MOBILE LAYOUT (< lg) - Compact Layout Matching Mockup */}
      <div className="lg:hidden flex flex-col gap-3 px-2 py-3 pb-6">
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
          <div className="w-[125px] mt-0">
            <StatBar current={dogHp} max={dog.health} type="hp" showNumbers={false} />
          </div>
        </div>

        {/* Turn Indicator */}
        {turn === 'player' && !battleEnded && (
          <div className="flex justify-center">
            <div className="text-white font-black text-center animate-pulse font-heading tracking-widest text-xl py-2 px-4 bg-black/60 rounded-lg backdrop-blur-sm">
              YOUR TURN
            </div>
          </div>
        )}
        {turn === 'enemy' && !battleEnded && (
          <div className="flex justify-center">
            <div className="text-red-400 font-black text-center animate-pulse text-xl py-2 px-4 bg-black/60 rounded-lg backdrop-blur-sm">
              ENEMY TURN...
            </div>
          </div>
        )}

        {/* Dice + Battle Log - Side by Side with Expanded Log */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
          {/* Dice - Smaller scale */}
          <div className="scale-[0.65] origin-top-left -mt-8">
            <D20Dice value={dice} rolling={rolling} />
          </div>

          <BattleLogPanel ref={mobileLogRef} logs={log} variant="mobile" />
        </div>

        {/* Attack Button - Large and Prominent */}
        <div className="mt-12 space-y-2">
          {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
            <>
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAttack}
                className="w-full px-6 py-5 bg-gradient-to-b from-red-600 to-red-800 text-white font-black text-2xl rounded-xl shadow-2xl border-4 border-red-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
              >
                ⚔️ ATTACK!
              </motion.button>
              {selectedCatStone && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStoneAttack}
                  className="w-full px-6 py-4 bg-gradient-to-b from-emerald-500 to-teal-700 text-white font-black text-lg rounded-xl shadow-2xl border-4 border-emerald-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
                >
                  💎 ATTACK + {selectedCatStone.name}!
                </motion.button>
              )}
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleActiveAbility(selectedCatId)}
                  className="w-full px-6 py-3 bg-gradient-to-b from-purple-600 to-indigo-800 text-white font-black text-lg rounded-xl shadow-2xl border-4 border-purple-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
                >
                  ✨ {party.find(c => c.instanceId === selectedCatId)?.ability.name || 'ABILITY'}
                </motion.button>
              )}
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) > 0 && (
                <div className="text-center text-xs text-slate-500">
                  Ability ready in {abilityCooldowns[selectedCatId]} turn{(abilityCooldowns[selectedCatId] ?? 0) !== 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
          {turn === 'player' && !selectedCatId && !battleEnded && (
            <div className="flex justify-center">
              <div className="text-slate-200 text-sm text-center font-semibold py-2 px-4 bg-black/50 rounded-lg">
                Tap a cat below to select
              </div>
            </div>
          )}
        </div>

        {/* Player Party - Smaller Cards (55% scale) with Health Bars Above */}
        <div className="flex gap-2 justify-center">
          {party.map(cat => {
            const isSelected = selectedCatId === cat.instanceId
            const isDead = cat.currentHp <= 0
            // Calculate card width: base 208px * 0.55 scale = 114.4px
            const cardWidth = 114
            const healthBarWidth = 100 // Closer to card width for better visual connection

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
                  animate={isSelected ? { y: -8, scale: 0.58 } : { y: 0, scale: 0.55 }}
                  transition={{ duration: 0.2 }}
                  className={`origin-top-center -mt-4 ${isSelected && !isDead ? 'ring-4 ring-purple-500/80 rounded-2xl' : ''} relative`}
                >
                  <GameCard
                    character={cat}
                    selected={false}
                    disabled={isDead || turn !== 'player'}
                    showStats={true}
                    animate={false}
                    holographicMode="none"
                  />
                  {/* Dead overlay - now inside card container */}
                  {isDead && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                      <span className="text-4xl">💀</span>
                    </div>
                  )}
                </motion.div>
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
                <div className="text-white font-bold animate-pulse font-heading tracking-widest text-sm mb-2 py-1.5 px-3 bg-black/60 rounded-lg backdrop-blur-sm">
                  YOUR TURN
                </div>
              )}
              <D20Dice value={dice} rolling={rolling} />
            </div>

            {/* Action Buttons */}
            <div className="w-64 flex flex-col items-center gap-2 mb-4">
              {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
                <>
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
                  {selectedCatStone && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStoneAttack}
                      className="px-6 py-2.5 bg-gradient-to-b from-emerald-500 to-teal-700 text-white font-black text-sm rounded-xl shadow-lg border-2 border-emerald-400 tracking-wider hover:shadow-emerald-500/50 transition-shadow"
                    >
                      💎 ATTACK + {selectedCatStone.name}!
                    </motion.button>
                  )}
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleActiveAbility(selectedCatId)}
                      className="px-6 py-2.5 bg-gradient-to-b from-purple-600 to-indigo-800 text-white font-black text-sm rounded-xl shadow-lg border-2 border-purple-400 tracking-wider"
                    >
                      ✨ {party.find(c => c.instanceId === selectedCatId)?.ability.name}
                    </motion.button>
                  )}
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) > 0 && (
                    <div className="text-[10px] text-slate-500">
                      Ability in {abilityCooldowns[selectedCatId]} turn{(abilityCooldowns[selectedCatId] ?? 0) !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
              {turn === 'player' && !selectedCatId && !battleEnded && (
                <div className="text-slate-200 text-sm text-center font-semibold py-2 px-4 bg-black/50 rounded-lg">
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
          <BattleLogPanel ref={desktopLogRef} logs={log} variant="desktop" />
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

      <BattleDefeatModal
        isOpen={showDefeatModal}
        stats={stats}
        onGoToCollection={() => { setShowDefeatModal(false); setTimeout(() => setView('collection'), 350) }}
        onGoToBait={() => { setShowDefeatModal(false); setTimeout(() => setView('bait'), 350) }}
      />

      <BattleVictoryModal
        isOpen={showVictoryModal}
        dog={dog}
        rewards={victoryRewards}
        isFrontierBattle={isFrontierBattle}
        onNextBattle={() => {
          setShowVictoryModal(false)
          if (droppedStone) {
            setPendingVictoryAction(() => () => { nextDog(); setBattleDogIndex(storeDogIndex + 1) })
            setTimeout(() => setShowStoneCelebration(true), 350)
          } else {
            setTimeout(() => { nextDog(); setBattleDogIndex(storeDogIndex + 1) }, 350)
          }
        }}
        onChooseBattle={() => {
          setShowVictoryModal(false)
          if (droppedStone) {
            setPendingVictoryAction(() => () => setShowDogSelect(true))
            setTimeout(() => setShowStoneCelebration(true), 350)
          } else {
            setShowDogSelect(true)
          }
        }}
      />

      <StoneCelebrationModal
        stone={droppedStone}
        isOpen={showStoneCelebration}
        onClose={() => {
          setShowStoneCelebration(false)
          setDroppedStone(null)
          if (pendingVictoryAction) {
            pendingVictoryAction()
            setPendingVictoryAction(null)
          }
        }}
      />
      </>}
    </div>
  )
}
