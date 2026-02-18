import { useEffect, useState, useRef, useCallback } from 'react'
import GameCard from '../components/GameCard'
import D20Dice from '../components/D20Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import BattleLogPanel, { type BattleLog } from '../components/BattleLogPanel'
import { resolveAbility, resolveDefense } from '../../game/abilityResolver'
import {
  resolveBirdOffense,
  resolveBirdDefense,
  checkBirdRevive,
  type BirdTarget,
} from '../../game/birdAbilityResolver'
import type { ScaledBird } from '../../game/birds'
import type { JungleSquadCat } from '../../game/jungleRun'
import type { BoonEffects } from '../../game/boons'
import { BATTLE_LOG_MAX_ENTRIES, BIRD_ABILITY_COOLDOWN } from '../../game/constants'
import { playSound } from '../../utils/sound'
import { useGame } from '../../game/store'
import { motion, AnimatePresence } from 'framer-motion'
import { shakeVariants, attackVariants, damageVariants } from '../animations'

// ===== Props =====

interface JungleBattleProps {
  bird: ScaledBird
  squad: JungleSquadCat[]
  boonEffects: BoonEffects
  stageNumber: number
  onBattleEnd: (result: {
    won: boolean
    catHpRemaining: Record<string, number>
    catsKnockedOut: string[]
    turnsElapsed: number
    wasFlawless: boolean
  }) => void
  random: () => number
}

// ===== DoT Tracking =====

interface ActiveDoT {
  targetId: string // cat instanceId or 'bird'
  damage: number
  turnsRemaining: number
  type: 'poison' | 'burn'
}

// ===== Component =====

export default function JungleBattle({
  bird,
  squad: initialSquad,
  boonEffects,
  stageNumber,
  onBattleEnd,
  random,
}: JungleBattleProps) {
  const soundEnabled = useGame(s => s.soundEnabled)

  // ----- Cat State -----
  // Local HP tracking -- cats keep their HP from the jungle run, no store writes
  const [catHp, setCatHp] = useState<Record<string, number>>(() => {
    const hp: Record<string, number> = {}
    initialSquad.forEach(c => { hp[c.instanceId] = c.currentHp })
    return hp
  })
  const [catMaxHp] = useState<Record<string, number>>(() => {
    const hp: Record<string, number> = {}
    initialSquad.forEach(c => { hp[c.instanceId] = c.maxHp })
    return hp
  })

  // ----- Bird State -----
  const [birdHp, setBirdHp] = useState(bird.scaledHP)
  const [birdAbilityCooldown, setBirdAbilityCooldown] = useState(
    bird.ability.params.cooldown ?? BIRD_ABILITY_COOLDOWN
  )
  const [bossHasRevived, setBossHasRevived] = useState(false)

  // ----- Turn State -----
  const [turn, setTurn] = useState<'player' | 'enemy'>('player')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [battleEnded, setBattleEnded] = useState(false)
  const [turnsElapsed, setTurnsElapsed] = useState(0)
  const [damageTakenThisBattle, setDamageTakenThisBattle] = useState(0)

  // ----- Dice State -----
  const [dice, setDice] = useState(1)
  const [rolling, setRolling] = useState(false)

  // ----- Log State -----
  const [log, setLog] = useState<BattleLog[]>([])
  const mobileLogRef = useRef<HTMLDivElement>(null)
  const desktopLogRef = useRef<HTMLDivElement>(null)

  // ----- Animation State -----
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number; x: number; y: number }[]>([])
  const [particleActive, setParticleActive] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [attackingId, setAttackingId] = useState<string | null>(null)

  // ----- Status Effects -----
  const [dotEffects, setDotEffects] = useState<ActiveDoT[]>([])
  const [silenced, setSilenced] = useState(false)
  const [atkDebuffs, setAtkDebuffs] = useState<Record<string, { multiplier: number; turnsLeft: number }>>({})
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>(() => {
    const cd: Record<string, number> = {}
    initialSquad.forEach(c => { cd[c.instanceId] = 0 })
    return cd
  })

  const ABILITY_COOLDOWN = 3

  // ----- Derived -----
  const cats = initialSquad
  const aliveCats = cats.filter(c => (catHp[c.instanceId] ?? 0) > 0)
  const isAllDead = () => cats.every(c => (catHp[c.instanceId] ?? 0) <= 0)

  // Elite Aura: +1 ATK per living elite cat
  const eliteAuraBonus = cats.filter(c => c.isElite && (catHp[c.instanceId] ?? 0) > 0).length

  // ----- Helpers -----

  const addLog = useCallback((text: string, type?: BattleLog['type']) => {
    setLog(prev => {
      const next = [...prev, { text, type }]
      return next.length > BATTLE_LOG_MAX_ENTRIES ? next.slice(-BATTLE_LOG_MAX_ENTRIES) : next
    })
  }, [])

  const showDamage = useCallback((value: number, x: number, y: number) => {
    const id = Date.now() + Math.floor(Math.random() * 10000)
    setDamageNumbers(prev => [...prev, { id, value, x, y }])
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id))
    }, 1000)
  }, [])

  const rollDice = useCallback(async (): Promise<number> => {
    setRolling(true)
    if (soundEnabled) playSound('diceRoll')
    await new Promise(r => setTimeout(r, 600))
    // Use seeded PRNG for deterministic rolls
    const v = Math.floor(random() * 20) + 1
    setDice(v)
    setRolling(false)
    return v
  }, [random, soundEnabled])

  const getCatHp = useCallback((instanceId: string) => catHp[instanceId] ?? 0, [catHp])
  const getCatMaxHp = useCallback((instanceId: string) => catMaxHp[instanceId] ?? 1, [catMaxHp])

  const updateCatHpLocal = useCallback((instanceId: string, newHp: number) => {
    setCatHp(prev => ({ ...prev, [instanceId]: Math.max(0, newHp) }))
  }, [])

  // ----- Initialize -----

  useEffect(() => {
    const initialLog: BattleLog[] = [
      { text: `Stage ${stageNumber} -- A wild ${bird.name} appears!`, type: 'info' },
    ]
    if (bird.isBoss) {
      initialLog.push({ text: `BOSS BATTLE! ${bird.ability.name}: ${bird.ability.description}`, type: 'crit' })
    }
    if (eliteAuraBonus > 0) {
      initialLog.push({ text: `Elite Aura: +${eliteAuraBonus} ATK to all party members!`, type: 'info' })
    }
    if (boonEffects.damageReduction > 0) {
      initialLog.push({ text: `Iron Fur: -${boonEffects.damageReduction} incoming damage`, type: 'info' })
    }
    if (boonEffects.thornsFraction > 0) {
      initialLog.push({ text: `Thorn Coat: Reflect ${Math.round(boonEffects.thornsFraction * 100)}% damage`, type: 'info' })
    }
    setLog(initialLog)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Auto-scroll Log -----

  useEffect(() => {
    if (mobileLogRef.current) mobileLogRef.current.scrollTop = mobileLogRef.current.scrollHeight
    if (desktopLogRef.current) desktopLogRef.current.scrollTop = desktopLogRef.current.scrollHeight
  }, [log])

  // ----- DoT Processing at Start of Player Turn -----

  useEffect(() => {
    if (turn !== 'player' || battleEnded || dotEffects.length === 0) return

    const catDots = dotEffects.filter(d => d.targetId !== 'bird')
    const birdDots = dotEffects.filter(d => d.targetId === 'bird')

    // Process cat DoTs
    catDots.forEach(dot => {
      const cat = cats.find(c => c.instanceId === dot.targetId)
      if (cat && getCatHp(dot.targetId) > 0) {
        const dmg = dot.damage
        const newHp = Math.max(0, getCatHp(dot.targetId) - dmg)
        updateCatHpLocal(dot.targetId, newHp)
        if (dmg > 0) {
          setDamageTakenThisBattle(prev => prev + dmg)
        }
        const icon = dot.type === 'poison' ? '(poison)' : '(burn)'
        addLog(`${icon} ${cat.name} takes ${dmg} ${dot.type} damage!`, 'damage')
      }
    })

    // Process bird DoTs (from boon poison claws)
    birdDots.forEach(dot => {
      if (birdHp > 0) {
        const newHp = Math.max(0, birdHp - dot.damage)
        setBirdHp(newHp)
        addLog(`(poison) ${bird.name} takes ${dot.damage} poison damage!`, 'damage')
        if (newHp <= 0) {
          handleBirdDefeated()
        }
      }
    })

    // Decrement turns and remove expired
    setDotEffects(prev =>
      prev
        .map(d => ({ ...d, turnsRemaining: d.turnsRemaining - 1 }))
        .filter(d => d.turnsRemaining > 0)
    )

    // Check if DoTs killed all cats
    setTimeout(() => {
      if (isAllDead()) handleDefeat()
    }, 50)
  }, [turn]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- ATK Debuff Tick-down at Start of Player Turn -----

  useEffect(() => {
    if (turn !== 'player' || battleEnded || Object.keys(atkDebuffs).length === 0) return

    setAtkDebuffs(prev => {
      const next: Record<string, { multiplier: number; turnsLeft: number }> = {}
      for (const [id, debuff] of Object.entries(prev)) {
        const remaining = debuff.turnsLeft - 1
        if (remaining > 0) {
          next[id] = { ...debuff, turnsLeft: remaining }
        } else {
          const cat = cats.find(c => c.instanceId === id)
          if (cat) addLog(`${cat.name}'s attack power is restored!`, 'info')
        }
      }
      return next
    })
  }, [turn]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Enemy Turn Trigger -----

  useEffect(() => {
    if (turn === 'enemy' && !battleEnded && birdHp > 0) {
      const timer = setTimeout(() => handleBirdTurn(), 1500)
      return () => clearTimeout(timer)
    }
  }, [turn, battleEnded, birdHp]) // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Player Attack =====

  const handleAttack = async () => {
    if (!selectedCatId || turn !== 'player' || battleEnded || rolling) return

    const cat = cats.find(c => c.instanceId === selectedCatId)
    if (!cat || getCatHp(cat.instanceId) <= 0) return

    setAttackingId(cat.instanceId)
    addLog(`${cat.name} attacks!`, 'info')

    const v = await rollDice()

    // Natural 20 -- legendary strike
    if (v === 20) {
      addLog(`NATURAL 20! LEGENDARY STRIKE!`, 'crit')
    } else if (v === 1) {
      addLog(`CRITICAL FAIL! Attack MISSES!`, 'damage')
      addLog(`${cat.name} stumbles and deals NO damage!`, 'damage')
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    // Effective ATK with boon boost, elite aura, and debuff
    const debuff = atkDebuffs[cat.instanceId]
    const rawAtk = cat.currentAtk + boonEffects.totalAtkBoost
    const effectiveAtk = debuff && debuff.turnsLeft > 0
      ? Math.floor(rawAtk * debuff.multiplier)
      : rawAtk
    const baseDmg = effectiveAtk + eliteAuraBonus + Math.floor(v / 5)

    // Resolve cat's offensive ability (crit, bleed, heal, lifesteal, stun, speed)
    const abilityResult = resolveAbility(
      // Build an OwnedCat-like object from JungleSquadCat for the resolver
      {
        ...cat,
        id: cat.catId,
        health: cat.baseMaxHp,
        currentHp: getCatHp(cat.instanceId),
        maxHp: getCatMaxHp(cat.instanceId),
        currentAttack: effectiveAtk,
        level: 1,
        xp: 0,
      } as any,
      v,
      baseDmg,
      silenced,
    )

    // Log ability messages
    abilityResult.logMessages.forEach(msg => addLog(msg.text, msg.type))

    let dmgToBird = abilityResult.damage

    // Boon: Crit threshold reduction -- lower the crit threshold
    if (boonEffects.critThresholdReduction > 0 && !abilityResult.isCrit && cat.ability.effect === 'crit') {
      const threshold = (cat.isElite ? 13 : 15) - boonEffects.critThresholdReduction
      if (v >= threshold && v < (cat.isElite ? 13 : 15)) {
        const multiplier = cat.isElite ? (cat.eliteTier && cat.eliteTier >= 2 ? 2.0 : 1.75) : 1.5
        dmgToBird = Math.floor(dmgToBird * multiplier)
        addLog(`Keen Eye! Crit threshold lowered -- critical hit!`, 'crit')
      }
    }

    // Boon: Executioner -- bonus damage when bird is below threshold
    if (boonEffects.executeThreshold > 0 && birdHp > 0) {
      const hpRatio = birdHp / bird.scaledHP
      if (hpRatio < boonEffects.executeThreshold) {
        dmgToBird += boonEffects.executeBonusDamage
        addLog(`Executioner! +${boonEffects.executeBonusDamage} bonus damage!`, 'crit')
      }
    }

    // Clear silence after one attack
    if (silenced) setSilenced(false)

    // Resolve bird defense (dodge, reflect, DEF)
    const defenseResult = resolveBirdDefense(bird, dmgToBird, cat.name, random)
    defenseResult.logMessages.forEach(msg => addLog(msg.text, msg.type))

    if (defenseResult.dodged) {
      addLog(`${bird.name} evades the attack!`, 'info')
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    const finalDmg = defenseResult.actualDamage

    // Apply damage to bird
    let newBirdHp = Math.max(0, birdHp - finalDmg)
    setBirdHp(newBirdHp)
    showDamage(finalDmg, window.innerWidth / 2, 100)

    setShaking(true)
    setTimeout(() => setShaking(false), 400)
    setParticleActive(true)
    setTimeout(() => setParticleActive(false), 100)

    addLog(`Hit for ${finalDmg} damage!`, 'damage')
    if (soundEnabled) playSound('attack')

    // Reflect damage back to attacking cat
    if (defenseResult.reflectDamage > 0) {
      const reflectedHp = Math.max(0, getCatHp(cat.instanceId) - defenseResult.reflectDamage)
      updateCatHpLocal(cat.instanceId, reflectedHp)
      setDamageTakenThisBattle(prev => prev + defenseResult.reflectDamage)
    }

    // Ability: heal
    if (abilityResult.healAmount > 0 && abilityResult.healTargetId) {
      const healTarget = abilityResult.healTargetId
      const currentHp = getCatHp(healTarget)
      const maxHp = getCatMaxHp(healTarget)
      if (currentHp > 0) {
        updateCatHpLocal(healTarget, Math.min(maxHp, currentHp + abilityResult.healAmount))
      }
    }

    // Boon: Lifesteal
    if (boonEffects.lifestealFraction > 0 && finalDmg > 0) {
      const lifestealHeal = Math.floor(finalDmg * boonEffects.lifestealFraction)
      if (lifestealHeal > 0) {
        const currentHp = getCatHp(cat.instanceId)
        const maxHp = getCatMaxHp(cat.instanceId)
        if (currentHp > 0) {
          updateCatHpLocal(cat.instanceId, Math.min(maxHp, currentHp + lifestealHeal))
          addLog(`Vampiric Fangs: ${cat.name} heals ${lifestealHeal} HP!`, 'heal')
        }
      }
    }

    // Boon: Poison Claws -- apply poison DoT to bird
    if (boonEffects.poisonDot && finalDmg > 0) {
      const existingBirdPoison = dotEffects.find(d => d.targetId === 'bird' && d.type === 'poison')
      if (!existingBirdPoison) {
        setDotEffects(prev => [...prev, {
          targetId: 'bird',
          damage: boonEffects.poisonDot!.damage,
          turnsRemaining: boonEffects.poisonDot!.turns,
          type: 'poison',
        }])
        addLog(`Poison Claws! ${bird.name} is poisoned for ${boonEffects.poisonDot.damage} dmg/turn!`, 'damage')
      }
    }

    // Check bird defeat
    if (newBirdHp <= 0) {
      handleBirdDefeated()
      return
    }

    // Boon: Swift Paws -- chance for bonus attack (stay on player turn)
    if (boonEffects.bonusAttackChance > 0 && random() < boonEffects.bonusAttackChance) {
      addLog(`Swift Paws! ${cat.name} gets a bonus attack!`, 'crit')
      // Decrement cooldowns
      setAbilityCooldowns(prev => ({
        ...prev,
        [cat.instanceId]: Math.max(0, (prev[cat.instanceId] ?? ABILITY_COOLDOWN) - 1),
      }))
      setAttackingId(null)
      // Stay on player turn -- don't switch to enemy
      return
    }

    // Decrement cooldowns for the acting cat
    setAbilityCooldowns(prev => ({
      ...prev,
      [cat.instanceId]: Math.max(0, (prev[cat.instanceId] ?? ABILITY_COOLDOWN) - 1),
    }))

    // Ability: speed -- player goes again
    if (abilityResult.isSpeed) {
      setAttackingId(null)
      return
    }

    // Ability: stun -- skip bird turn
    if (abilityResult.isStun) {
      addLog(`${bird.name} is stunned! Skips next turn!`, 'crit')
      setAttackingId(null)
      setTurnsElapsed(prev => prev + 1)
      // Stay on player turn
      return
    }

    setAttackingId(null)
    setTurn('enemy')
  }

  // ===== Active Ability =====

  const handleActiveAbility = (catId: string) => {
    if (turn !== 'player' || rolling || battleEnded) return

    if (silenced) {
      const cat = cats.find(c => c.instanceId === catId)
      addLog(`Silenced! ${cat?.name || 'Cat'} can't use abilities!`, 'damage')
      setSilenced(false)
      return
    }

    const cat = cats.find(c => c.instanceId === catId)
    if (!cat || getCatHp(catId) <= 0) return
    if ((abilityCooldowns[catId] ?? ABILITY_COOLDOWN) > 0) return

    setAttackingId(catId)

    const debuff = atkDebuffs[catId]
    const rawAtk = cat.currentAtk + boonEffects.totalAtkBoost
    const effectiveAtk = debuff && debuff.turnsLeft > 0
      ? Math.floor(rawAtk * debuff.multiplier)
      : rawAtk
    const baseAtk = effectiveAtk + eliteAuraBonus
    const effect = cat.ability.effect

    addLog(`${cat.name} activates ${cat.ability.name}!`, 'crit')
    if (soundEnabled) playSound('abilityTrigger')

    let dmg = 0
    if (effect === 'crit') {
      dmg = Math.floor(baseAtk * 2)
      addLog(`Critical Strike deals ${dmg} damage!`, 'crit')
    } else if (effect === 'bleed') {
      dmg = baseAtk + 8
      addLog(`Burning Strike deals ${dmg} damage!`, 'crit')
    } else if (effect === 'heal') {
      const healAmt = Math.floor(getCatMaxHp(catId) * 0.4)
      cats.forEach(c => {
        if (getCatHp(c.instanceId) > 0) {
          updateCatHpLocal(c.instanceId, Math.min(getCatMaxHp(c.instanceId), getCatHp(c.instanceId) + healAmt))
        }
      })
      addLog(`Heals all cats for ${healAmt} HP!`, 'heal')
    } else if (effect === 'lifesteal') {
      dmg = baseAtk
      const stolen = Math.floor(dmg * 0.75)
      updateCatHpLocal(catId, Math.min(getCatMaxHp(catId), getCatHp(catId) + stolen))
      addLog(`Drains ${stolen} HP from enemy! Deals ${dmg} damage.`, 'heal')
    } else if (effect === 'stun') {
      dmg = Math.floor(baseAtk * 0.5)
      addLog(`Stun Strike deals ${dmg} damage and stuns!`, 'crit')
    } else if (effect === 'shield') {
      addLog(`Shield Wall! Party takes reduced damage next turn.`, 'info')
    } else if (effect === 'armor') {
      dmg = baseAtk
      addLog(`Fortified Strike deals ${dmg} damage!`, 'crit')
    } else if (effect === 'speed') {
      dmg = baseAtk
      addLog(`Lightning Strike deals ${dmg} damage! Attacks again!`, 'crit')
    }

    if (dmg > 0) {
      // Resolve bird defense
      const defenseResult = resolveBirdDefense(bird, dmg, cat.name, random)
      defenseResult.logMessages.forEach(msg => addLog(msg.text, msg.type))

      if (defenseResult.dodged) {
        addLog(`${bird.name} dodges the ability!`, 'info')
      } else {
        const finalDmg = defenseResult.actualDamage
        const newBirdHp = Math.max(0, birdHp - finalDmg)
        setBirdHp(newBirdHp)
        setShaking(true)
        setParticleActive(true)
        setTimeout(() => { setShaking(false); setParticleActive(false) }, 400)

        // Handle reflect
        if (defenseResult.reflectDamage > 0) {
          const reflectedHp = Math.max(0, getCatHp(catId) - defenseResult.reflectDamage)
          updateCatHpLocal(catId, reflectedHp)
          setDamageTakenThisBattle(prev => prev + defenseResult.reflectDamage)
        }

        if (newBirdHp <= 0) { handleBirdDefeated(); return }
      }
    }

    // Reset cooldown
    setAbilityCooldowns(prev => ({ ...prev, [catId]: ABILITY_COOLDOWN }))
    setAttackingId(null)

    // Speed: player goes again
    if (effect === 'speed') return
    // Stun: skip bird turn
    if (effect === 'stun') {
      setTurnsElapsed(prev => prev + 1)
      return
    }

    setTurn('enemy')
  }

  // ===== Bird Turn =====

  const handleBirdTurn = async () => {
    let localBirdHp = birdHp
    setAttackingId('bird')
    addLog(`${bird.name} attacks!`, 'info')

    // Build target list for the bird offense resolver
    const targets: BirdTarget[] = cats
      .filter(c => getCatHp(c.instanceId) > 0)
      .map(c => ({
        instanceId: c.instanceId,
        currentHp: getCatHp(c.instanceId),
        maxHp: getCatMaxHp(c.instanceId),
        name: c.name,
      }))

    if (targets.length === 0) {
      handleDefeat()
      return
    }

    // Resolve bird offense (pure function)
    const offenseResult = resolveBirdOffense(
      bird,
      targets,
      birdAbilityCooldown,
      birdHp,
      random,
    )

    // Log offense messages
    offenseResult.logMessages.forEach(msg => addLog(msg.text, msg.type))

    // Apply bird healing
    if (offenseResult.birdHealAmount > 0) {
      const healed = Math.min(bird.scaledHP, localBirdHp + offenseResult.birdHealAmount)
      localBirdHp = healed
      setBirdHp(healed)
    }

    // Apply silence
    if (offenseResult.silenceApplied) {
      setSilenced(true)
    }

    // Apply ATK debuff to all alive cats
    if (offenseResult.atkDebuff) {
      const newDebuffs: Record<string, { multiplier: number; turnsLeft: number }> = {}
      cats.forEach(c => {
        if (getCatHp(c.instanceId) > 0) {
          newDebuffs[c.instanceId] = {
            multiplier: offenseResult.atkDebuff!.multiplier,
            turnsLeft: offenseResult.atkDebuff!.turns,
          }
        }
      })
      setAtkDebuffs(prev => ({ ...prev, ...newDebuffs }))
    }

    // Apply DoT from bird ability
    if (offenseResult.dotApplied) {
      const dot = offenseResult.dotApplied
      setDotEffects(prev => [
        ...prev.filter(d => !(d.targetId === dot.catInstanceId && d.type === dot.type)),
        {
          targetId: dot.catInstanceId,
          damage: dot.damage,
          turnsRemaining: dot.turns,
          type: dot.type,
        },
      ])
    }

    // Process attacks (enraged birds attack multiple times)
    const attackCount = offenseResult.attackCount
    for (let strike = 0; strike < attackCount; strike++) {
      // Re-check alive cats for each strike
      const aliveNow = cats.filter(c => getCatHp(c.instanceId) > 0)
      if (aliveNow.length === 0) break

      // Determine target for this strike
      let targetCat: typeof cats[0]
      if (strike === 0) {
        targetCat = aliveNow.find(c => c.instanceId === offenseResult.primaryTargetId) ?? aliveNow[0]
      } else {
        // Subsequent enraged strikes hit random alive cats
        targetCat = aliveNow[Math.floor(random() * aliveNow.length)]
      }

      let incomingDmg = offenseResult.effectiveATK

      // Boon: Iron Fur damage reduction
      if (boonEffects.damageReduction > 0) {
        incomingDmg = Math.max(1, incomingDmg - boonEffects.damageReduction)
      }

      // Resolve cat defense (shield, armor abilities)
      const catDefense = resolveDefense(
        {
          ...targetCat,
          id: targetCat.catId,
          health: targetCat.baseMaxHp,
          currentHp: getCatHp(targetCat.instanceId),
          maxHp: getCatMaxHp(targetCat.instanceId),
          currentAttack: targetCat.currentAtk,
          level: 1,
          xp: 0,
        } as any,
        incomingDmg,
        silenced,
      )
      catDefense.logMessages.forEach(msg => addLog(msg.text, msg.type))

      const actualDmg = catDefense.actualDamage
      let newCatHp = Math.max(0, getCatHp(targetCat.instanceId) - actualDmg)

      // Elite cats: chance to survive lethal blow
      if (newCatHp <= 0 && targetCat.isElite) {
        const surviveChance = (targetCat.eliteTier ?? 0) >= 2 ? 0.25 : 0.15
        if (random() < surviveChance) {
          newCatHp = 1
          addLog(`${targetCat.name}'s Stellar Resilience triggers! Survives with 1 HP!`, 'heal')
        }
      }

      updateCatHpLocal(targetCat.instanceId, newCatHp)
      setDamageTakenThisBattle(prev => prev + actualDmg)

      if (strike > 0) {
        addLog(`Enraged strike ${strike + 1} hits ${targetCat.name} for ${actualDmg}!`, 'damage')
      } else {
        addLog(`${bird.name} hits ${targetCat.name} for ${actualDmg}!`, 'damage')
      }

      // Boon: Thorns -- reflect damage back to bird
      if (boonEffects.thornsFraction > 0 && actualDmg > 0) {
        const thornsDmg = Math.floor(actualDmg * boonEffects.thornsFraction)
        if (thornsDmg > 0) {
          const newBirdHp = Math.max(0, localBirdHp - thornsDmg)
          localBirdHp = newBirdHp
          setBirdHp(newBirdHp)
          addLog(`Thorn Coat reflects ${thornsDmg} damage to ${bird.name}!`, 'damage')
          if (newBirdHp <= 0) {
            handleBirdDefeated()
            return
          }
        }
      }

      // Floating damage number
      const catIndex = cats.findIndex(c => c.instanceId === targetCat.instanceId)
      const xPos = (window.innerWidth / 3) * (catIndex + 0.5)
      showDamage(actualDmg, xPos, window.innerHeight - 200)

      if (newCatHp <= 0) {
        addLog(`${targetCat.name} is knocked out!`, 'damage')
      }
    }

    // Apply AoE damage (separate from primary attack)
    if (offenseResult.aoeDamage > 0) {
      const aliveForAoe = cats.filter(c => getCatHp(c.instanceId) > 0)
      aliveForAoe.forEach(c => {
        let aoeDmg = offenseResult.aoeDamage
        // Iron Fur applies to AoE too
        if (boonEffects.damageReduction > 0) {
          aoeDmg = Math.max(1, aoeDmg - boonEffects.damageReduction)
        }
        const newHp = Math.max(0, getCatHp(c.instanceId) - aoeDmg)
        updateCatHpLocal(c.instanceId, newHp)
        setDamageTakenThisBattle(prev => prev + aoeDmg)
        if (newHp <= 0) {
          addLog(`${c.name} is knocked out by AoE!`, 'damage')
        }
      })
    }

    // Manage bird ability cooldown
    if (birdAbilityCooldown <= 0) {
      setBirdAbilityCooldown(bird.ability.params.cooldown ?? BIRD_ABILITY_COOLDOWN)
    } else {
      setBirdAbilityCooldown(prev => prev - 1)
    }

    setAttackingId(null)
    setTurnsElapsed(prev => prev + 1)

    // Check defeat after a brief delay to let state settle
    setTimeout(() => {
      if (isAllDead()) {
        handleDefeat()
      } else {
        setTurn('player')
      }
    }, 50)
  }

  // ===== Bird Defeated =====

  const handleBirdDefeated = () => {
    if (battleEnded) return
    // Check revive (Talon Queen)
    if (!bossHasRevived) {
      const revive = checkBirdRevive(bird, bossHasRevived)
      if (revive.shouldRevive) {
        setBirdHp(revive.reviveHp)
        setBossHasRevived(true)
        addLog(`${bird.name} revives with ${revive.reviveHp} HP! Phoenix Rebirth!`, 'crit')
        if (soundEnabled) playSound('abilityTrigger')
        setAttackingId(null)
        setTurn('enemy')
        return
      }
    }

    // Bird is truly defeated
    setBattleEnded(true)
    if (soundEnabled) playSound('victory')
    addLog(`VICTORY! ${bird.name} is defeated!`, 'info')

    const catHpRemaining: Record<string, number> = {}
    const catsKnockedOut: string[] = []
    cats.forEach(c => {
      const hp = getCatHp(c.instanceId)
      catHpRemaining[c.instanceId] = hp
      if (hp <= 0) catsKnockedOut.push(c.instanceId)
    })

    setTimeout(() => {
      onBattleEnd({
        won: true,
        catHpRemaining,
        catsKnockedOut,
        turnsElapsed,
        wasFlawless: damageTakenThisBattle === 0,
      })
    }, 1500)
  }

  // ===== Defeat =====

  const handleDefeat = () => {
    setBattleEnded(true)
    if (soundEnabled) playSound('defeat')
    addLog(`DEFEAT! All cats knocked out!`, 'damage')

    const catHpRemaining: Record<string, number> = {}
    const catsKnockedOut: string[] = []
    cats.forEach(c => {
      catHpRemaining[c.instanceId] = 0
      catsKnockedOut.push(c.instanceId)
    })

    setTimeout(() => {
      onBattleEnd({
        won: false,
        catHpRemaining,
        catsKnockedOut,
        turnsElapsed,
        wasFlawless: false,
      })
    }, 1500)
  }

  // ===== Selected Cat Stone (disabled in jungle) =====
  // Stones are not used in jungle mode; no stone button rendered.

  // ===== Render =====

  // Build a display-compatible object for the bird (GameCard expects Cat | Dog)
  const birdDisplay = {
    id: bird.id,
    name: bird.name,
    health: bird.scaledHP,
    attack: bird.scaledATK,
    imageUrl: bird.imageUrl,
    ability: { name: bird.ability.name, description: bird.ability.description },
  }

  return (
    <div className="relative min-h-[80vh] flex flex-col space-y-4">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/60 to-teal-600/60 border border-emerald-500/50"
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-sm sm:text-base flex-1 text-center">
            <span className="text-lg mr-2">🎲</span>
            Stage {stageNumber} — {bird.isBoss ? 'BOSS: ' : ''}{bird.name}
            {bird.ability && ` | ${bird.ability.name}`}
          </p>
        </div>
      </motion.div>

      {/* MOBILE LAYOUT (< lg) */}
      <div className="lg:hidden flex flex-col gap-3 px-2 py-2 pb-6">
        {/* Enemy Section */}
        <div className="flex flex-col items-center">
          <motion.div
            variants={shakeVariants}
            animate={shaking ? 'shake' : 'idle'}
            className="scale-[0.60] origin-center"
          >
            <GameCard
              character={birdDisplay}
              isEnemy={true}
              animate={false}
              showStats={false}
              holographicMode="full"
            />
          </motion.div>
          {/* Enemy Health Bar */}
          <div className="w-[125px] mt-0">
            <StatBar current={birdHp} max={bird.scaledHP} type="hp" showNumbers={false} />
          </div>
          {/* Bird ability cooldown indicator */}
          {birdAbilityCooldown > 0 && (
            <div className="text-[10px] text-teal-400 mt-1">
              {bird.ability.name} in {birdAbilityCooldown} turn{birdAbilityCooldown !== 1 ? 's' : ''}
            </div>
          )}
          {birdAbilityCooldown <= 0 && (
            <div className="text-[10px] text-amber-400 mt-1 font-bold">
              {bird.ability.name} READY
            </div>
          )}
        </div>

        {/* Turn Indicator */}
        {turn === 'player' && !battleEnded && (
          <div className="flex justify-center">
            <div className="text-white font-black text-center animate-pulse font-heading tracking-widest text-lg py-2 px-5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              YOUR TURN
            </div>
          </div>
        )}
        {turn === 'enemy' && !battleEnded && (
          <div className="flex justify-center">
            <div className="text-emerald-400 font-black text-center animate-pulse font-heading tracking-widest text-lg py-2 px-5 bg-emerald-500/10 rounded-xl backdrop-blur-sm border border-emerald-500/20">
              ENEMY TURN...
            </div>
          </div>
        )}

        {/* Dice + Battle Log */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
          <div className="w-28 h-28 flex items-center justify-center">
            <div className="scale-[0.7] origin-center">
              <D20Dice value={dice} rolling={rolling} />
            </div>
          </div>
          <BattleLogPanel ref={mobileLogRef} logs={log} variant="mobile" />
        </div>

        {/* Attack Buttons */}
        <div className="mt-4 space-y-2">
          {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
            <>
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAttack}
                className="w-full px-6 py-5 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white font-black text-2xl rounded-xl shadow-2xl border-4 border-emerald-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
              >
                ATTACK!
              </motion.button>
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && !silenced && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleActiveAbility(selectedCatId)}
                  className="w-full px-6 py-3 bg-gradient-to-b from-purple-600 to-indigo-800 text-white font-black text-lg rounded-xl shadow-2xl border-4 border-purple-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
                >
                  {cats.find(c => c.instanceId === selectedCatId)?.ability.name || 'ABILITY'}
                </motion.button>
              )}
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && silenced && (
                <div className="text-center text-xs text-red-400 font-bold">
                  Ability Silenced!
                </div>
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
              <div className="text-slate-200 text-sm text-center font-semibold py-2 px-4 bg-black/70 rounded-lg">
                Tap a cat below to select
              </div>
            </div>
          )}
        </div>

        {/* Player Party -- Smaller Cards */}
        <div className="flex gap-2 justify-center">
          {cats.map(cat => {
            const isSelected = selectedCatId === cat.instanceId
            const isDead = getCatHp(cat.instanceId) <= 0
            const cardWidth = 114
            const healthBarWidth = 100

            // Build display object for GameCard
            const catDisplay = {
              id: cat.catId,
              name: cat.name,
              rarity: cat.rarity as any,
              health: cat.baseMaxHp,
              attack: cat.currentAtk,
              ability: cat.ability,
              imageUrl: cat.imageUrl,
              isElite: cat.isElite,
              eliteTier: cat.eliteTier,
              instanceId: cat.instanceId,
              level: 1,
              xp: 0,
              currentHp: getCatHp(cat.instanceId),
              maxHp: getCatMaxHp(cat.instanceId),
              currentAttack: cat.currentAtk,
            }

            return (
              <motion.div
                key={cat.instanceId}
                variants={attackVariants}
                animate={attackingId === cat.instanceId ? 'attack' : 'idle'}
                onClick={() => !isDead && turn === 'player' && setSelectedCatId(cat.instanceId)}
                className={`flex flex-col ${isDead ? 'opacity-40 grayscale' : ''}`}
                style={{ willChange: 'transform', width: `${cardWidth}px` }}
              >
                {/* Health Bar Above Card */}
                <div className="flex justify-center" style={{ width: `${cardWidth}px` }}>
                  <div style={{ width: `${healthBarWidth}px` }}>
                    <StatBar current={getCatHp(cat.instanceId)} max={getCatMaxHp(cat.instanceId)} type="hp" showNumbers={false} />
                  </div>
                </div>

                {/* Card with Selection Highlight */}
                <motion.div
                  animate={isSelected ? { y: -8, scale: 0.58 } : { y: 0, scale: 0.55 }}
                  transition={{ duration: 0.2 }}
                  className={`origin-top-center -mt-4 ${isSelected && !isDead ? 'ring-4 ring-emerald-500/80 rounded-2xl' : ''} relative`}
                >
                  <GameCard
                    character={catDisplay}
                    selected={false}
                    disabled={isDead || turn !== 'player'}
                    showStats={true}
                    animate={false}
                    holographicMode="none"
                  />
                  {isDead && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                      <span className="text-4xl">KO</span>
                    </div>
                  )}
                </motion.div>

                {/* Status indicators */}
                <div className="flex gap-1 justify-center mt-1">
                  {dotEffects.filter(d => d.targetId === cat.instanceId && d.type === 'poison').length > 0 && (
                    <span className="text-[10px] text-green-400">PSN</span>
                  )}
                  {dotEffects.filter(d => d.targetId === cat.instanceId && d.type === 'burn').length > 0 && (
                    <span className="text-[10px] text-orange-400">BRN</span>
                  )}
                  {atkDebuffs[cat.instanceId] && atkDebuffs[cat.instanceId].turnsLeft > 0 && (
                    <span className="text-[10px] text-red-400">ATK-</span>
                  )}
                  {silenced && getCatHp(cat.instanceId) > 0 && (
                    <span className="text-[10px] text-slate-400">SIL</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* DESKTOP LAYOUT (>= lg) */}
      <div className="hidden lg:flex flex-col flex-1">
        {/* Top Area: Enemy & Battle Log */}
        <div className="flex-1 flex justify-center items-start pt-8 relative gap-8">
          {/* Left Side: Dice & Action Buttons */}
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex flex-col items-center gap-2">
              {turn === 'player' && !battleEnded && (
                <div className="text-white font-black animate-pulse font-heading tracking-widest text-sm mb-2 py-1.5 px-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  YOUR TURN
                </div>
              )}
              {turn === 'enemy' && !battleEnded && (
                <div className="text-emerald-400 font-black animate-pulse font-heading tracking-widest text-sm mb-2 py-1.5 px-4 bg-emerald-500/10 rounded-xl backdrop-blur-sm border border-emerald-500/20">
                  ENEMY TURN...
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
                    className="px-8 py-4 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white font-black text-xl rounded-xl shadow-lg border-2 border-emerald-400 font-heading tracking-wider hover:shadow-emerald-500/50 transition-shadow"
                  >
                    ATTACK!
                  </motion.button>
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && !silenced && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleActiveAbility(selectedCatId)}
                      className="px-6 py-2.5 bg-gradient-to-b from-purple-600 to-indigo-800 text-white font-black text-sm rounded-xl shadow-lg border-2 border-purple-400 tracking-wider"
                    >
                      {cats.find(c => c.instanceId === selectedCatId)?.ability.name}
                    </motion.button>
                  )}
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && silenced && (
                    <div className="text-[10px] text-red-400 font-bold">
                      Silenced!
                    </div>
                  )}
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) > 0 && (
                    <div className="text-[10px] text-slate-500">
                      Ability in {abilityCooldowns[selectedCatId]} turn{(abilityCooldowns[selectedCatId] ?? 0) !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
              {turn === 'player' && !selectedCatId && !battleEnded && (
                <div className="text-slate-200 text-sm text-center font-semibold py-2 px-4 bg-black/70 rounded-lg">
                  Select a cat to attack
                </div>
              )}
            </div>
          </div>

          {/* Enemy Card -- Center */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4 w-full px-2">
              <StatBar current={birdHp} max={bird.scaledHP} label={bird.isBoss ? 'BOSS HP' : 'BIRD HP'} type="hp" showNumbers={true} />
            </div>

            <motion.div
              variants={shakeVariants}
              animate={shaking ? 'shake' : 'idle'}
              className="relative"
            >
              <GameCard
                character={birdDisplay}
                isEnemy={true}
                animate={false}
                showStats={false}
              />
              {/* Boss badge */}
              {bird.isBoss && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 border border-emerald-400 z-20">
                  <span className="text-[10px] font-black text-white uppercase">BOSS</span>
                </div>
              )}
            </motion.div>

            {/* Bird ability cooldown */}
            <div className="mt-2 text-center">
              {birdAbilityCooldown > 0 ? (
                <span className="text-xs text-teal-400">
                  {bird.ability.name} in {birdAbilityCooldown} turn{birdAbilityCooldown !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-bold">
                  {bird.ability.name} READY
                </span>
              )}
            </div>

            {/* Active status effects on bird */}
            <div className="flex gap-2 mt-1 justify-center">
              {dotEffects.filter(d => d.targetId === 'bird' && d.type === 'poison').length > 0 && (
                <span className="text-[10px] text-green-400 bg-green-900/50 px-1.5 py-0.5 rounded">POISONED</span>
              )}
              {bossHasRevived && (
                <span className="text-[10px] text-amber-400 bg-amber-900/50 px-1.5 py-0.5 rounded">REVIVED</span>
              )}
            </div>
          </div>

          {/* Battle Log -- Right Side */}
          <BattleLogPanel ref={desktopLogRef} logs={log} variant="desktop" />
        </div>

        {/* Bottom Area: Player Party */}
        <div className="flex-1 flex justify-center items-end pb-8 gap-4 pt-16 mt-4">
          {cats.map(cat => {
            const isSelected = selectedCatId === cat.instanceId
            const isDead = getCatHp(cat.instanceId) <= 0

            const catDisplay = {
              id: cat.catId,
              name: cat.name,
              rarity: cat.rarity as any,
              health: cat.baseMaxHp,
              attack: cat.currentAtk,
              ability: cat.ability,
              imageUrl: cat.imageUrl,
              isElite: cat.isElite,
              eliteTier: cat.eliteTier,
              instanceId: cat.instanceId,
              level: 1,
              xp: 0,
              currentHp: getCatHp(cat.instanceId),
              maxHp: getCatMaxHp(cat.instanceId),
              currentAttack: cat.currentAtk,
            }

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
                    current={getCatHp(cat.instanceId)}
                    max={getCatMaxHp(cat.instanceId)}
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
                    character={catDisplay}
                    selected={isSelected}
                    disabled={isDead || (turn !== 'player' && !isSelected)}
                    showStats={true}
                  />
                </motion.div>

                {/* Dead overlay */}
                {isDead && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl z-10">
                    <span className="text-4xl font-black text-red-500">KO</span>
                  </div>
                )}

                {/* Active Indicator */}
                {isSelected && !isDead && (
                  <motion.div
                    layoutId="jungle-active-indicator"
                    className="absolute -top-28 left-0 right-0 flex justify-center z-30"
                  >
                    <div className="bg-emerald-500 text-slate-900 font-bold px-3 py-1 rounded-full text-sm shadow-lg border border-emerald-300">
                      READY
                    </div>
                  </motion.div>
                )}

                {/* Status indicators */}
                <div className="absolute -bottom-6 left-0 right-0 flex gap-1 justify-center z-20">
                  {dotEffects.filter(d => d.targetId === cat.instanceId && d.type === 'poison').length > 0 && (
                    <span className="text-[10px] text-green-400 bg-green-900/50 px-1 py-0.5 rounded">PSN</span>
                  )}
                  {dotEffects.filter(d => d.targetId === cat.instanceId && d.type === 'burn').length > 0 && (
                    <span className="text-[10px] text-orange-400 bg-orange-900/50 px-1 py-0.5 rounded">BRN</span>
                  )}
                  {atkDebuffs[cat.instanceId] && atkDebuffs[cat.instanceId].turnsLeft > 0 && (
                    <span className="text-[10px] text-red-400 bg-red-900/50 px-1 py-0.5 rounded">ATK-</span>
                  )}
                  {silenced && getCatHp(cat.instanceId) > 0 && (
                    <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1 py-0.5 rounded">SIL</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Floating Damage Numbers */}
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

      {/* Particles */}
      <ParticleSystem
        x={window.innerWidth / 2}
        y={200}
        active={particleActive}
        count={20}
        colors={['#10B981', '#34D399', '#6EE7B7']}
      />

      {/* Battle End Overlay */}
      <AnimatePresence>
        {battleEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={`text-6xl font-black font-heading tracking-wider ${
                birdHp <= 0 ? 'text-emerald-400' : 'text-red-500'
              }`}
              style={{ textShadow: '0 0 30px currentColor' }}
            >
              {birdHp <= 0 ? 'VICTORY!' : 'DEFEAT!'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boon effects now shown in ActiveBoonsPanel at top of JungleRunView */}
    </div>
  )
}
