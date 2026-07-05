import { useEffect, useState, useRef, useMemo } from 'react'
import GameCard, { type CardFx, type CardFxKind } from '../components/GameCard'
import DamageNumber, { type DamageNumberData, type DamageKind } from '../components/DamageNumber'
import { useScreenShake } from '../hooks/useScreenShake'
import D20Dice from '../components/D20Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import BattleLogPanel, { type BattleLog } from '../components/BattleLogPanel'
import { Button, StatPill } from '../components/ui'
import {
  SwordsIcon, GemIcon, SparkleIcon, HeartIcon, SwordIcon, LockIcon,
  CheckIcon, AlienIcon, EventIcon, SkullIcon, DiceIcon, SpeakerMutedIcon,
} from '../icons'
import BattleVictoryModal from '../components/BattleVictoryModal'
import BattleDefeatModal from '../components/BattleDefeatModal'
import StoneCelebrationModal from '../components/StoneCelebrationModal'
import { useGame } from '../../game/store'
import { DOGS } from '../../game/data'
import { BATTLE_LOG_MAX_ENTRIES, FRENZY_STREAK_REWARDS, FRENZY_STREAK_LENGTH } from '../../game/constants'
import { rollEquipmentDrop, STONES, rollStoneDrop } from '../../game/items'
import { getActiveEvents, getActiveCoinMultiplier, getEventPeriodKey, getActiveElement, getScaledFrenzyDog, type GameEvent } from '../../game/events'
import { createBattle, resolveAction, computeBattleRewards } from '../../game/battle'
import type { BattleAction, BattleEvent, BattleState } from '../../game/battle'
import { createPRNG, generateSeed } from '../../game/boons'
import { playSound } from '../../utils/sound'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { lungeVariants, useJuiceEnabled } from '../animations'
import {
  trackBattleStart,
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
  const alienUnlocked = useGame(s => s.alienUnlocked)
  const unlockAlienPhase = useGame(s => s.unlockAlienPhase)

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

  const dog = eventBattle ? eventBattle.eventDog : DOGS[battleDogIndex]

  // ===== Combat engine wiring =====
  // The pure deterministic battle lives in battleRef; React state below mirrors
  // only what the JSX renders. All combat maths/randomness runs in the engine,
  // seeded per battle by rngRef so replays are reproducible.
  const battleRef = useRef<BattleState>(
    createBattle({
      dog: { id: dog.id, name: dog.name, attack: dog.attack, health: dog.health },
      cats: party,
      frontierDogId: DOGS[battleDogIndex]?.id ?? '',
      eventDogId: eventBattle?.eventDog?.id,
      rewards: { battleDogIndex, difficultyLevel, coinMultiplier, isRepeatEventBoss: false },
    }),
  )
  const rngRef = useRef<() => number>(createPRNG(generateSeed(`${dog.id}:${battleDogIndex}:init`)))
  const isResolvingRef = useRef(false) // single in-flight lock (fixes double-act bug)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const mountedRef = useRef(true)

  const [dogHp, setDogHp] = useState(dog.health)
  const [turn, setTurn] = useState<'player' | 'enemy'>('player')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [dice, setDice] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [log, setLog] = useState<BattleLog[]>([])
  const [battleEnded, setBattleEnded] = useState(false)
  const [damageNumbers, setDamageNumbers] = useState<DamageNumberData[]>([])
  const [particleActive, setParticleActive] = useState(false)
  const [attackingId, setAttackingId] = useState<string | null>(null)

  // ===== Combat juice: stage shake, anchored numbers, per-card hit fx =====
  const juiceEnabled = useJuiceEnabled()
  const { controls: shakeControls, shake } = useScreenShake()
  const diceControls = useAnimationControls()
  const [cardFx, setCardFx] = useState<Record<string, CardFx>>({})
  // Live card DOM elements keyed by combatant id ('dog' | cat instanceId) — used
  // to anchor damage numbers at the struck card's actual on-screen rect.
  const cardEls = useRef<Map<string, HTMLElement>>(new Map())
  const refCbCache = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map())
  const registerCard = (id: string) => {
    let cb = refCbCache.current.get(id)
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) cardEls.current.set(id, el)
        else cardEls.current.delete(id)
      }
      refCbCache.current.set(id, cb)
    }
    return cb
  }
  const getRect = (id: string) => cardEls.current.get(id)?.getBoundingClientRect()
  const triggerFx = (id: string, kind: CardFxKind, dx = 0, dy = 0) => {
    setCardFx(f => ({ ...f, [id]: { key: Date.now() + Math.random(), kind, dx, dy } }))
  }
  // Running baseline (EMA) of typical hit size — damage numbers scale vs this.
  const damageBaselineRef = useRef(0)
  const [showDefeatModal, setShowDefeatModal] = useState(false)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [showStoneCelebration, setShowStoneCelebration] = useState(false)
  const [droppedStone, setDroppedStone] = useState<typeof STONES[number] | null>(null)
  const [pendingVictoryAction, setPendingVictoryAction] = useState<(() => void) | null>(null)
  const [victoryRewards, setVictoryRewards] = useState<{ coins: number; xp: number; equipDrop?: string; stoneDrop?: string }>({ coins: 0, xp: 0 })
  const [silenced, setSilenced] = useState(false) // Omega Fenrir ability (mirror for the ability button)
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>({}) // catInstanceId -> turns remaining
  const [stoneActivated, setStoneActivated] = useState<Record<string, boolean>>({}) // one-shot stone use per cat
  const [showAlienStory, setShowAlienStory] = useState(false) // Star Barks unlock modal

  const ABILITY_COOLDOWN = 3 // Turns between active ability uses
  const mobileLogRef = useRef<HTMLDivElement>(null)
  const desktopLogRef = useRef<HTMLDivElement>(null)
  const hasAutoShownAlienPopup = useRef(false)

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

  // ===== Timer plumbing (all timeouts tracked + cancelled on unmount — fixes leak) =====
  const trackedTimeout = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timersRef.current.delete(id)
      fn()
    }, ms)
    timersRef.current.add(id)
    return id
  }
  const sleep = (ms: number) => new Promise<void>(resolve => { trackedTimeout(resolve, ms) })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      timersRef.current.forEach(clearTimeout)
      timersRef.current.clear()
    }
  }, [])

  // ===== Rendering helpers =====
  const addLog = (t: string, type?: 'damage' | 'heal' | 'crit' | 'info') => {
    setLog(l => {
      const next = [...l, { text: t, type }]
      return next.length > BATTLE_LOG_MAX_ENTRIES ? next.slice(-BATTLE_LOG_MAX_ENTRIES) : next
    })
  }

  // Fallback anchor when a card element isn't registered yet (defensive).
  const fallbackPos = (targetId: string) => {
    if (targetId === 'dog') return { x: window.innerWidth / 2, y: 140 }
    const idx = party.findIndex(c => c.instanceId === targetId)
    return { x: (window.innerWidth / 3) * (idx + 0.5), y: window.innerHeight - 200 }
  }

  // Spawn an anchored floating combat number at the struck card's live rect.
  const spawnNumber = (targetId: string, text: string, kind: DamageKind, magnitude?: number) => {
    const rect = getRect(targetId)
    const base = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.36 }
      : fallbackPos(targetId)
    const x = base.x + (Math.random() * 32 - 16) // ±16px jitter so multi-hits don't stack
    let fontRem = 1.3
    if (magnitude !== undefined) {
      const b = damageBaselineRef.current
      const rel = b > 0 ? magnitude / b : 1
      fontRem = Math.min(2.2, Math.max(1.0, 0.9 + rel * 0.8))
      if (kind === 'crit') fontRem = Math.min(2.5, fontRem + 0.35)
    }
    if (kind === 'poison' || kind === 'burn') fontRem = 0.95
    if (kind === 'miss') fontRem = 1.15
    if (kind === 'heal') fontRem = 1.35
    const id = Date.now() + Math.random()
    setDamageNumbers(prev => [...prev, { id, text, kind, x, y: base.y, fontRem }])
    trackedTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id))
    }, 1250)
  }

  const triggerParticle = () => {
    setParticleActive(true)
    trackedTimeout(() => setParticleActive(false), 100)
  }

  const applyHp = (targetId: string, hp: number) => {
    if (targetId === 'dog') setDogHp(hp)
    else updateCatHp(targetId, hp)
  }

  // ===== Event playback: replays engine output with the legacy animation timing =====
  const playEvents = async (events: BattleEvent[]) => {
    const soundOn = () => useGame.getState().soundEnabled
    for (const ev of events) {
      if (!mountedRef.current) return
      switch (ev.type) {
        case 'Log':
          addLog(ev.text, ev.logType)
          break
        case 'DiceRolled':
          setRolling(true)
          if (soundOn()) playSound('diceRoll')
          await sleep(600)
          if (!mountedRef.current) return
          setDice(ev.value)
          setRolling(false)
          // Dice juice: nat 20 → gold flash pop; nat 1 → dull thud shake.
          if (juiceEnabled) {
            if (ev.value === 20) {
              void diceControls.start({
                scale: [1, 1.25, 1],
                filter: [
                  'drop-shadow(0 0 0px rgba(255,197,61,0))',
                  'drop-shadow(0 0 18px rgba(255,197,61,0.95))',
                  'drop-shadow(0 0 0px rgba(255,197,61,0))',
                ],
                transition: { duration: 0.6 },
              })
            } else if (ev.value === 1) {
              void diceControls.start({ x: [0, -4, 4, -3, 2, 0], transition: { duration: 0.3 } })
            }
          }
          break
        case 'Sound':
          if (soundOn()) playSound(ev.name)
          break
        case 'DamageDealt': {
          // Hitstop: freeze the rhythm briefly before the hit lands (crits linger).
          if (juiceEnabled && (ev.impact || ev.isCrit)) {
            await sleep(ev.isCrit ? 110 : 60)
            if (!mountedRef.current) return
          }
          applyHp(ev.targetId, ev.resultingHp)
          if (ev.showNumber) {
            const b = damageBaselineRef.current
            damageBaselineRef.current = b === 0 ? ev.amount : b * 0.7 + ev.amount * 0.3
            spawnNumber(ev.targetId, `-${ev.amount}`, ev.isCrit ? 'crit' : 'normal', ev.amount)
          }
          // Recoil away from attacker: enemy (top) knocked up, cats (bottom) knocked down.
          const dy = ev.targetId === 'dog' ? -7 : 7
          triggerFx(ev.targetId, ev.isCrit ? 'crit' : 'hit', 0, dy)
          if (ev.impact || ev.isCrit) {
            shake(ev.isCrit ? 'heavy' : 'light', juiceEnabled)
            triggerParticle()
          }
          break
        }
        case 'Dodged':
          triggerFx(ev.targetId, 'dodge', 18)
          spawnNumber(ev.targetId, 'MISS', 'miss')
          break
        case 'Healed':
          applyHp(ev.targetId, ev.resultingHp)
          triggerFx(ev.targetId, 'heal')
          if (ev.amount > 0) spawnNumber(ev.targetId, `+${ev.amount}`, 'heal')
          break
        case 'DotTick': {
          applyHp(ev.targetId, ev.resultingHp)
          const dk: DamageKind = ev.dotType === 'burn' ? 'burn' : 'poison'
          if (ev.amount > 0) spawnNumber(ev.targetId, `-${ev.amount}`, dk)
          break
        }
        case 'DotApplied':
          triggerFx(ev.targetId, ev.dotType === 'burn' ? 'burn' : 'poison')
          break
        case 'AbilityTriggered':
          triggerFx(ev.casterId, 'ability')
          break
        case 'ScreenShake':
          shake('heavy', juiceEnabled)
          break
        case 'StoneConsumed':
          consumeStone(ev.catId) // persist the one-use stone removal to the store
          break
        // CombatantDefeated / BattleEnded: no direct visual side-effect here.
        default:
          break
      }
    }
  }

  const syncFromBattle = (b: BattleState) => {
    setDogHp(b.dog.hp)
    setTurn(b.turn)
    setSilenced(b.silenced)
    setAbilityCooldowns({ ...b.abilityCooldowns })
    setStoneActivated({ ...b.stoneActivated })
  }

  // Resolve one action, play its events, mirror engine state into React.
  const resolveAndPlay = async (action: BattleAction): Promise<{ rewards?: { coins: number; xp: number }; aborted: boolean }> => {
    const { state: next, events } = resolveAction(battleRef.current, action, rngRef.current)
    battleRef.current = next
    const ended = events.find(e => e.type === 'BattleEnded') as Extract<BattleEvent, { type: 'BattleEnded' }> | undefined
    await playEvents(events)
    if (!mountedRef.current) return { aborted: true }
    syncFromBattle(next)
    return { rewards: ended?.rewards, aborted: false }
  }

  const scheduleEnemyTurn = () => {
    trackedTimeout(() => { void runAction({ type: 'ENEMY_TURN' }) }, 1500)
  }

  // Single-entry action orchestrator. The isResolving lock guarantees no
  // overlapping dispatches (fixes the rapid-click double-act bug).
  const runAction = async (action: BattleAction) => {
    if (isResolvingRef.current) return
    if (battleRef.current.outcome !== 'ongoing') return
    isResolvingRef.current = true
    try {
      const actorId = action.type === 'ENEMY_TURN' ? 'dog' : 'attackerId' in action ? action.attackerId : null
      if (actorId) setAttackingId(actorId)

      let res = await resolveAndPlay(action)
      if (res.aborted) return

      // Entering the player's turn after an enemy turn: run the start-of-turn
      // DoT / debuff / stone-burn ticks as an engine action (not a fragile
      // useEffect keyed on stale closures — fixes the DoT bug).
      if (
        action.type === 'ENEMY_TURN' &&
        battleRef.current.outcome === 'ongoing' &&
        battleRef.current.turn === 'player'
      ) {
        const tickRes = await resolveAndPlay({ type: 'START_PLAYER_TURN' })
        if (tickRes.aborted) return
        res = tickRes
      }

      setAttackingId(null)
      const b = battleRef.current
      if (b.outcome === 'victory') {
        setBattleEnded(true)
        handleVictory(res.rewards)
        return
      }
      if (b.outcome === 'defeat') {
        setBattleEnded(true)
        handleDefeat()
        return
      }
      if (b.turn === 'enemy') scheduleEnemyTurn()
    } finally {
      isResolvingRef.current = false
    }
  }

  // ===== Player action entry points (called by the JSX buttons) =====
  const handleAttack = () => {
    if (!selectedCatId || turn !== 'player' || battleEnded) return
    void runAction({ type: 'PLAYER_ATTACK', attackerId: selectedCatId })
  }

  const handleStoneAttack = () => {
    if (!selectedCatId || turn !== 'player' || battleEnded) return
    void runAction({ type: 'PLAYER_STONE_ATTACK', attackerId: selectedCatId })
  }

  const handleActiveAbility = (catId: string) => {
    if (turn !== 'player' || rolling || battleEnded) return
    void runAction({ type: 'PLAYER_ABILITY', attackerId: catId })
  }

  // ===== Battle lifecycle =====
  // Reset / build a fresh battle when the dog (or event) changes.
  useEffect(() => {
    battleRef.current = createBattle({
      dog: { id: dog.id, name: dog.name, attack: dog.attack, health: dog.health },
      cats: party,
      frontierDogId: DOGS[battleDogIndex]?.id ?? '',
      eventDogId: eventBattle?.eventDog?.id,
      rewards: {
        battleDogIndex,
        difficultyLevel,
        coinMultiplier,
        isRepeatEventBoss: !!(eventBattle && completedEventRewards.includes(getEventPeriodKey(eventBattle))),
      },
    })
    rngRef.current = createPRNG(generateSeed(`${dog.id}:${battleDogIndex}:${Date.now()}:${Math.random()}`))
    isResolvingRef.current = false

    setDogHp(dog.health)
    setTurn('player')
    setBattleEnded(false)
    setSelectedCatId(null)
    setSilenced(false)
    setAttackingId(null)
    setStoneActivated({})
    const initialCooldowns: Record<string, number> = {}
    party.forEach(c => { initialCooldowns[c.instanceId] = 0 })
    setAbilityCooldowns(initialCooldowns)

    const initialLog: BattleLog[] = [{ text: `⚔️ A wild ${dog.name} appears!`, type: 'info' }]
    if (eliteAuraBonus > 0) {
      initialLog.push({ text: `✨ Elite Aura: +${eliteAuraBonus} ATK to all party members!`, type: 'info' })
    }
    if (coinMultiplier > 1) {
      initialLog.push({ text: `🎪 Event bonus: x${coinMultiplier} coins!`, type: 'info' })
    }
    setLog(initialLog)

    if (party.length > 0) {
      trackBattleStart(party.length, party.map(c => c.name).join(','), dog.name, difficultyLevel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleDogIndex, eventBattle])

  // Auto-show Star Barks popup when player qualifies (beat Eternal Overlord or beyond)
  useEffect(() => {
    if (!alienUnlocked && !hasAutoShownAlienPopup.current && showDogSelect && (storeDogIndex >= 15 || difficultyLevel > 0)) {
      hasAutoShownAlienPopup.current = true
      setShowAlienStory(true)
    }
  }, [showDogSelect, alienUnlocked, storeDogIndex, difficultyLevel])

  // Auto-scroll log to bottom when updated
  useEffect(() => {
    if (mobileLogRef.current) {
      mobileLogRef.current.scrollTop = mobileLogRef.current.scrollHeight
    }
    if (desktopLogRef.current) {
      desktopLogRef.current.scrollTop = desktopLogRef.current.scrollHeight
    }
  }, [log])

  const handleVictory = (rewards?: { coins: number; xp: number }) => {
    if (soundEnabled) playSound('victory')
    const isRepeatEventBoss = eventBattle && completedEventRewards.includes(getEventPeriodKey(eventBattle))
    const { coins: coinsEarned, xp: xpEarned } =
      rewards ??
      computeBattleRewards({ battleDogIndex, difficultyLevel, coinMultiplier, isRepeatEventBoss: !!isRepeatEventBoss })

    addLog(`🎉 VICTORY!`, 'info')
    if (isRepeatEventBoss) addLog(`Event boss already defeated — reduced rewards`, 'info')
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

    // Roll for stone drop (Feline Frenzy Friday only, with streak bonus)
    let stoneDropName: string | undefined
    let stoneDropRef: typeof STONES[number] | null = null
    if (eventBattle?.id === 'feline-frenzy') {
      const element = getActiveElement()
      const frenzyStreak = useGame.getState().frenzyStreak
      const streakIdx = Math.min(Math.max(frenzyStreak - 1, 0), FRENZY_STREAK_LENGTH - 1)
      const stoneBonus = FRENZY_STREAK_REWARDS[streakIdx]?.stoneDropBonus ?? 0
      const stoneDrop = rollStoneDrop(element, stoneBonus)
      if (stoneDrop) {
        addEquipment(stoneDrop.id) // add to shared inventory
        stoneDropName = stoneDrop.name
        stoneDropRef = stoneDrop
        addLog(`💎 Stone drop: ${stoneDrop.name}!`, 'crit')
        if (soundEnabled) playSound('equipDrop')

        // Update Frenzy Collector achievement progress
        trackedTimeout(() => {
          const g = useGame.getState()
          const STONE_IDS = ['emberstone', 'froststone', 'terrastone', 'stormstone', 'voidstone']
          const uniqueStones = STONE_IDS.filter(id => (g.inventory[id] || 0) > 0).length
          g.updateAchievementProgress('frenzy-collector', uniqueStones)
          if (uniqueStones >= 5) g.unlockAchievement('frenzy-collector')
        }, 100)
      }
    }
    setDroppedStone(stoneDropRef)

    // Ensure all battle rewards (XP, coins, equipment, stones) are persisted
    useGame.getState().save()

    setVictoryRewards({ coins: coinsEarned, xp: xpEarned, equipDrop: equipDrop?.name, stoneDrop: stoneDropName })

    // Boss Rush: auto-advance to next dog
    if (bossRushActive) {
      const nextRushIndex = bossRushDogIndex + 1
      setBossRushHighest(Math.max(bossRushHighest, bossRushDogIndex))
      if (nextRushIndex >= DOGS.length) {
        addLog(`🏆 BOSS RUSH COMPLETE! All ${DOGS.length} dogs defeated!`, 'info')
        setBossRushActive(false)
        trackedTimeout(() => setShowVictoryModal(true), 1000)
      } else {
        addLog(`➡️ Next challenger: ${DOGS[nextRushIndex].name}!`, 'info')
        setBossRushDogIndex(nextRushIndex)
        setBattleDogIndex(nextRushIndex)
      }
      return
    }

    trackedTimeout(() => setShowVictoryModal(true), 1000)
  }

  const handleDefeat = () => {
    if (soundEnabled) playSound('defeat')
    if (bossRushActive) {
      addLog(`💀 Boss Rush ended at dog ${bossRushDogIndex + 1}/${DOGS.length}!`, 'info')
      setBossRushActive(false)
    }
    addLog(`💀 DEFEAT!`, 'info')
    recordBattleResult(false, 0)
    trackBattleLost(dog.name, difficultyLevel)
    // Don't auto-heal - player must heal manually
    trackedTimeout(() => setShowDefeatModal(true), 1000)
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
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/60 to-orange-500/60 border border-red-500/50">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold text-sm sm:text-base flex-1 text-center inline-flex items-center justify-center gap-2">
                <SwordsIcon className="text-lg" aria-hidden />
                Choose your opponent! Challenge new dogs to progress, or replay defeated ones for rewards.
              </p>
              {storeDogIndex >= DOGS.length && (
                <Button
                  variant="danger"
                  size="sm"
                  className="ml-3 whitespace-nowrap"
                  onClick={() => {
                    setBossRushActive(true)
                    setBossRushDogIndex(0)
                    setBattleDogIndex(0)
                    setBossRushHighest(0)
                    setShowDogSelect(false)
                  }}
                >
                  Boss Rush
                </Button>
              )}
            </div>
          </div>

          {/* Star Barks — Alien Invasion Unlock Banner (top of screen) */}
          {!alienUnlocked && (storeDogIndex >= 15 || difficultyLevel > 0) && (
            <motion.button
              onClick={() => setShowAlienStory(true)}
              className="w-full py-4 px-4 bg-gradient-to-r from-green-700 via-emerald-600 to-teal-700 text-white font-black text-base sm:text-lg rounded-xl border-2 border-green-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] tracking-wider animate-pulse"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 35px rgba(16,185,129,0.7)' }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center justify-center gap-2 text-xl mb-1"><AlienIcon aria-hidden /> INCOMING TRANSMISSION <AlienIcon aria-hidden /></span>
              <span className="block text-xs sm:text-sm font-semibold text-green-200 tracking-wide">CLICK TO START EXPANSION</span>
            </motion.button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {DOGS.slice(0, 15).map((d, i) => {
              const isDefeated = difficultyLevel > 0 ? i !== storeDogIndex : i < storeDogIndex
              const isFrontier = i === storeDogIndex && storeDogIndex < 15
              const isLocked = difficultyLevel > 0 ? false : i > storeDogIndex
              const isBoss = i >= 10

              return (
                <motion.button
                  key={d.id}
                  disabled={isLocked}
                  onClick={() => {
                    setBattleDogIndex(i)
                    setShowDogSelect(false)
                  }}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 text-left ${
                    isLocked
                      ? 'border-slate-700 opacity-40 cursor-not-allowed'
                      : isFrontier
                      ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                      : 'border-slate-600 hover:border-slate-400 hover:shadow-premium hover:scale-[1.03]'
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
                        <LockIcon className="text-4xl text-slate-400" aria-hidden />
                      </div>
                    )}

                    {/* Defeated checkmark */}
                    {isDefeated && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-300">
                        <CheckIcon className="text-white text-xs" aria-hidden />
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
                        <StatPill icon={<HeartIcon aria-hidden />} label="HP" value={d.health} tone="health" size="sm" />
                        <StatPill icon={<SwordIcon aria-hidden />} label="ATK" value={d.attack} tone="attack" size="sm" />
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

          {/* Star Barks — Alien Dog Grid */}
          {alienUnlocked && (
            <>
              <div className="mt-6 mb-3 text-center py-3 border-t border-green-500/30">
                <span className="inline-flex items-center gap-2 text-green-400 font-black text-sm tracking-widest uppercase font-heading">
                  <AlienIcon aria-hidden /> Star Barks — The Cosmic Queen's Armada <AlienIcon aria-hidden />
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {DOGS.slice(15).map((d, i) => {
                  const realIndex = i + 15
                  const isDefeated = realIndex < storeDogIndex
                  const isFrontier = realIndex === storeDogIndex
                  const isLocked = realIndex > storeDogIndex
                  const isOverlord = realIndex >= 21

                  return (
                    <motion.button
                      key={d.id}
                      disabled={isLocked}
                      onClick={() => {
                        setBattleDogIndex(realIndex)
                        setShowDogSelect(false)
                      }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 text-left ${
                        isLocked
                          ? 'border-slate-700 opacity-40 cursor-not-allowed'
                          : isFrontier
                          ? 'border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                          : 'border-green-900 hover:border-green-600 hover:shadow-premium hover:scale-[1.03]'
                      }`}
                      whileHover={!isLocked ? { y: -2 } : {}}
                      whileTap={!isLocked ? { scale: 0.97 } : {}}
                    >
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
                          <div className="w-full h-full bg-gradient-to-br from-green-900/50 to-slate-900 flex items-center justify-center">
                            <AlienIcon className="text-4xl text-green-400" aria-hidden />
                          </div>
                        )}

                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LockIcon className="text-4xl text-slate-400" aria-hidden />
                          </div>
                        )}

                        {isDefeated && (
                          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-300">
                            <CheckIcon className="text-white text-xs" aria-hidden />
                          </div>
                        )}

                        {isFrontier && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-green-500 border border-green-300">
                            <span className="text-[10px] font-black text-slate-900 uppercase">NEW</span>
                          </div>
                        )}

                        {isOverlord && !isLocked && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-green-600 border border-green-400">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white uppercase"><AlienIcon aria-hidden /> BOSS</span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>

                      <div className="p-2.5 bg-slate-900/90">
                        <h4 className={`font-black text-sm truncate ${isLocked ? 'text-slate-600' : 'text-green-300'}`}>
                          {isLocked ? '???' : d.name}
                        </h4>
                        {!isLocked && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-red-400 font-bold">HP {d.health}</span>
                            <span className="text-[10px] text-amber-400 font-bold">ATK {d.attack}</span>
                          </div>
                        )}
                        {!isLocked && d.ability && (
                          <p className="text-[9px] text-green-400/70 mt-1 truncate">{d.ability.description}</p>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}

          {/* Event Dogs */}
          {activeEvents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 font-heading tracking-wide">
                <EventIcon className="text-xl text-arcane-300" aria-hidden /> Event Battles
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
                            <CheckIcon className="text-white text-xs" aria-hidden />
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>

                      <div className="p-2.5 bg-slate-900/90">
                        <h4 className="font-black text-sm truncate text-white">{event.eventDog.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <StatPill icon={<HeartIcon aria-hidden />} label="HP" value={event.eventDog.health} tone="health" size="sm" />
                          <StatPill icon={<SwordIcon aria-hidden />} label="ATK" value={event.eventDog.attack} tone="attack" size="sm" />
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
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/60 to-purple-500/60 border border-blue-500/50"
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-sm sm:text-base flex-1 text-center inline-flex items-center justify-center gap-2">
            <DiceIcon className="text-lg" aria-hidden />
            Roll the D20 dice, then select one of your cats to attack! Each cat has unique abilities. Defeat enemy dogs and bosses!
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="ml-3 whitespace-nowrap"
            onClick={() => { setEventBattle(null); setShowDogSelect(true) }}
          >
            Switch Dog
          </Button>
        </div>
      </motion.div>

      {/* Stage-shake wrapper — transform-only, decays to rest. Damage numbers
          (portaled) and modals live OUTSIDE so they aren't dragged by the shake. */}
      <motion.div animate={shakeControls} style={{ willChange: 'transform' }}>
      {/* MOBILE LAYOUT (< lg) - Compact Layout Matching Mockup */}
      <div className="lg:hidden flex flex-col gap-3 px-2 py-2 pb-6">
        {/* Enemy Section - Card with Health Bar Below */}
        <div className="flex flex-col items-center">
          <motion.div
            ref={registerCard('dog')}
            variants={lungeVariants}
            custom={1}
            animate={juiceEnabled && attackingId === 'dog' ? 'attack' : 'idle'}
            className="scale-[0.60] origin-center"
          >
            <GameCard
              character={dog}
              isEnemy={true}
              animate={false}
              showStats={false}
              holographicMode="full"
              fx={cardFx['dog']}
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
            <div className="text-white font-black text-center animate-pulse font-heading tracking-widest text-lg py-2 px-5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              YOUR TURN
            </div>
          </div>
        )}
        {turn === 'enemy' && !battleEnded && (
          <div className="flex justify-center">
            <div className="text-red-400 font-black text-center animate-pulse font-heading tracking-widest text-lg py-2 px-5 bg-red-500/10 rounded-xl backdrop-blur-sm border border-red-500/20">
              ENEMY TURN...
            </div>
          </div>
        )}

        {/* Dice + Battle Log - Side by Side with Expanded Log */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
          {/* Dice - Compact mobile size */}
          <div className="w-28 h-28 flex items-center justify-center">
            <motion.div animate={diceControls} className="scale-[0.7] origin-center">
              <D20Dice value={dice} rolling={rolling} />
            </motion.div>
          </div>

          <BattleLogPanel ref={mobileLogRef} logs={log} variant="mobile" />
        </div>

        {/* Attack Button - Large and Prominent */}
        <div className="mt-4 space-y-2">
          {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
            <>
              <Button
                variant="primary"
                fullWidth
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleAttack}
                className="py-5 text-2xl"
              >
                <SwordsIcon aria-hidden /> ATTACK!
              </Button>
              {selectedCatStone && (
                <Button
                  variant="secondary"
                  fullWidth
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleStoneAttack}
                  className="py-4 text-lg border-success-500/50 text-success-400"
                >
                  <GemIcon aria-hidden /> ATTACK + {selectedCatStone.name}!
                </Button>
              )}
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && !silenced && (
                <Button
                  variant="secondary"
                  fullWidth
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => handleActiveAbility(selectedCatId)}
                  className="py-3 text-lg border-arcane-400/50 text-arcane-200"
                >
                  <SparkleIcon aria-hidden /> {party.find(c => c.instanceId === selectedCatId)?.ability.name || 'ABILITY'}
                </Button>
              )}
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && silenced && (
                <div className="inline-flex items-center justify-center gap-1 text-center text-xs text-danger-400 font-bold">
                  <SpeakerMutedIcon aria-hidden /> Ability Silenced!
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
                variants={lungeVariants}
                custom={-1}
                animate={juiceEnabled && attackingId === cat.instanceId ? 'attack' : 'idle'}
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
                  ref={registerCard(cat.instanceId)}
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
                    fx={cardFx[cat.instanceId]}
                  />
                  {/* Dead overlay - now inside card container */}
                  {isDead && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                      <SkullIcon className="text-4xl text-ink-muted" aria-hidden />
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* DESKTOP LAYOUT (>= lg) — full-width 16:9 stage: arena + docked log rail.
          Enemy commands the upper zone (centered at lg, pushed center-right at
          xl+); party is arrayed across the lower zone; dice + actions form a
          bottom-center HUD; the battle log docks as a right rail with its own
          scroll. Card ref registry + shake wrapper preserved (see below). */}
      <div className="hidden lg:grid grid-cols-[1fr_auto] gap-6 min-h-[64vh]">
        {/* ===== Arena ===== */}
        <div className="relative flex flex-col">
          {/* Enemy zone — upper, centered (lg) → pushed center-right (xl+) */}
          <div className="flex justify-center xl:justify-end xl:pr-[6%] 2xl:pr-[10%] pt-2">
            <div className="relative z-10 flex flex-col items-center">
              {/* Boss HP Bar - Above Card */}
              <div className="mb-4 w-full max-w-[240px] px-2">
                <StatBar current={dogHp} max={dog.health} label="BOSS HP" type="hp" showNumbers={true} />
              </div>

              <motion.div
                ref={registerCard('dog')}
                variants={lungeVariants}
                custom={1}
                animate={juiceEnabled && attackingId === 'dog' ? 'attack' : 'idle'}
                className="relative"
              >
                <GameCard
                  character={dog}
                  isEnemy={true}
                  animate={false}
                  showStats={false}
                  fx={cardFx['dog']}
                />
              </motion.div>
            </div>
          </div>

          {/* Party zone — lower, arrayed left-to-right with presence */}
          <div className="mt-auto flex items-end justify-center xl:justify-start xl:pl-[3%] 2xl:pl-[7%] gap-6 flex-wrap pt-16">
            {party.map(cat => {
              const isSelected = selectedCatId === cat.instanceId
              const isDead = cat.currentHp <= 0
              return (
                <motion.div
                  key={cat.instanceId}
                  variants={lungeVariants}
                  custom={-1}
                  animate={juiceEnabled && attackingId === cat.instanceId ? 'attack' : 'idle'}
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
                    ref={registerCard(cat.instanceId)}
                    animate={isSelected ? { y: -16, scale: 1.05 } : { y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <GameCard
                      character={cat}
                      selected={isSelected}
                      disabled={isDead || (turn !== 'player' && !isSelected)}
                      showStats={true}
                      fx={cardFx[cat.instanceId]}
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

          {/* HUD — dice + turn/action bar, anchored bottom-center */}
          <div className="mt-8 flex items-center justify-center gap-8">
            {/* Dice */}
            <motion.div animate={diceControls} className="shrink-0">
              <D20Dice value={dice} rolling={rolling} />
            </motion.div>

            {/* Turn indicator + Action Buttons */}
            <div className="w-72 flex flex-col items-center gap-2">
              {turn === 'player' && !battleEnded && (
                <div className="text-white font-black animate-pulse font-heading tracking-widest text-sm py-1.5 px-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  YOUR TURN
                </div>
              )}
              {turn === 'enemy' && !battleEnded && (
                <div className="text-red-400 font-black animate-pulse font-heading tracking-widest text-sm py-1.5 px-4 bg-red-500/10 rounded-xl backdrop-blur-sm border border-red-500/20">
                  ENEMY TURN...
                </div>
              )}
              {turn === 'player' && selectedCatId && !battleEnded && !rolling && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={handleAttack}
                    className="px-8 text-xl"
                  >
                    <SwordsIcon aria-hidden /> ATTACK!
                  </Button>
                  {selectedCatStone && (
                    <Button
                      variant="secondary"
                      size="sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={handleStoneAttack}
                      className="border-success-500/50 text-success-400"
                    >
                      <GemIcon aria-hidden /> ATTACK + {selectedCatStone.name}!
                    </Button>
                  )}
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && !silenced && (
                    <Button
                      variant="secondary"
                      size="sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => handleActiveAbility(selectedCatId)}
                      className="border-arcane-400/50 text-arcane-200"
                    >
                      <SparkleIcon aria-hidden /> {party.find(c => c.instanceId === selectedCatId)?.ability.name}
                    </Button>
                  )}
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && silenced && (
                    <div className="inline-flex items-center gap-1 text-[10px] text-danger-400 font-bold">
                      <SpeakerMutedIcon aria-hidden /> Silenced!
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
        </div>

        {/* ===== Right rail: docked Battle Log (own scroll) ===== */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-24 flex flex-col gap-2">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-ink px-1">
              Battle Log
            </h3>
            <BattleLogPanel ref={desktopLogRef} logs={log} variant="desktop" />
          </div>
        </aside>
      </div>

      </motion.div>

      {/* Anchored Damage Numbers — portaled to <body>, unaffected by stage shake */}
      <AnimatePresence>
        {damageNumbers.map(data => (
          <DamageNumber key={data.id} data={data} juiceEnabled={juiceEnabled} />
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
            setPendingVictoryAction(() => () => { nextDog(); setBattleDogIndex(useGame.getState().dogIndex) })
            setTimeout(() => setShowStoneCelebration(true), 350)
          } else {
            setTimeout(() => { nextDog(); setBattleDogIndex(useGame.getState().dogIndex) }, 350)
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

      {/* Star Barks — Alien Story Unlock Modal */}
      <AnimatePresence>
        {showAlienStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal-backdrop bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAlienStory(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 rounded-2xl border-2 border-green-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] p-6 sm:p-8 text-center space-y-5"
            >
              <AlienIcon className="text-5xl text-green-400 mx-auto" aria-hidden />
              <h2 className="text-2xl sm:text-3xl font-black text-green-400 font-heading tracking-wider">
                STAR BARKS
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed italic">
                A long time ago, in a dog park far, far away... The Cosmic Queen has dispatched her Star Barks armada to Earth, and the alien parasites have fused with the most vicious dogs in the kingdom. These mutated monstrosities are stronger, meaner, and weirder than anything your cats have faced. Suit up your finest felines — the war for Whisker Wars just went intergalactic!
              </p>
              <div className="pt-2 space-y-3">
                <motion.button
                  onClick={() => {
                    unlockAlienPhase()
                    setShowAlienStory(false)
                    if (soundEnabled) playSound('victory')
                  }}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black text-lg rounded-xl border-2 border-green-400 shadow-lg tracking-wider"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  BEGIN THE INVASION
                </motion.button>
                <button
                  onClick={() => setShowAlienStory(false)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Not yet...
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
