import { useEffect, useState, useRef, useCallback } from 'react'
import GameCard, { type CardFx, type CardFxKind } from '../components/GameCard'
import DamageNumber, { type DamageNumberData, type DamageKind } from '../components/DamageNumber'
import { useScreenShake } from '../hooks/useScreenShake'
import D20Dice from '../components/D20Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import BattleLogPanel, { type BattleLog } from '../components/BattleLogPanel'
import { Button } from '../components/ui'
import { DiceIcon, SwordsIcon, SparkleIcon } from '../icons'
import type { ScaledBird } from '../../game/birds'
import type { JungleSquadCat } from '../../game/jungleRun'
import type { BoonEffects } from '../../game/boons'
import { BATTLE_LOG_MAX_ENTRIES } from '../../game/constants'
import { createJungleBattle, resolveAction } from '../../game/battle'
import type { BattleAction, BattleEvent, BattleState } from '../../game/battle'
import { playSound } from '../../utils/sound'
import { useGame } from '../../game/store'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { lungeVariants, useJuiceEnabled } from '../animations'

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

// ===== Component =====
// Thin dispatch/playback layer over the shared deterministic battle engine
// (createJungleBattle + resolveAction). All combat maths/randomness runs in the
// engine, seeded by the run's PRNG (the `random` prop); the React state below
// mirrors only what the JSX renders. Mirrors the BattleArena architecture and
// its three safety patterns: single in-flight lock, tracked+cleared timeouts,
// and turn-start ticks dispatched as an engine action (never a useEffect).

export default function JungleBattle({
  bird,
  squad: initialSquad,
  boonEffects,
  stageNumber,
  onBattleEnd,
  random,
}: JungleBattleProps) {
  const soundEnabled = useGame(s => s.soundEnabled)

  const cats = initialSquad

  // ===== Combat engine wiring =====
  const battleRef = useRef<BattleState>(
    createJungleBattle({
      bird: {
        id: bird.id,
        name: bird.name,
        DEF: bird.DEF,
        isBoss: bird.isBoss,
        ability: bird.ability,
        scaledHP: bird.scaledHP,
        scaledATK: bird.scaledATK,
      },
      squad: initialSquad,
      boonEffects,
    }),
  )
  const rngRef = useRef<() => number>(random)
  const isResolvingRef = useRef(false) // single in-flight lock (fixes double-act bug)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const mountedRef = useRef(true)

  // ----- Cat State ----- (local HP tracking mirrors engine cats; no store writes)
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
  const [birdAbilityCooldown, setBirdAbilityCooldown] = useState(battleRef.current.birdAbilityCooldown)
  const [bossHasRevived, setBossHasRevived] = useState(false)

  // ----- Turn State -----
  const [turn, setTurn] = useState<'player' | 'enemy'>('player')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [battleEnded, setBattleEnded] = useState(false)

  // ----- Dice State -----
  const [dice, setDice] = useState(1)
  const [rolling, setRolling] = useState(false)

  // ----- Log State -----
  const [log, setLog] = useState<BattleLog[]>([])
  const mobileLogRef = useRef<HTMLDivElement>(null)
  const desktopLogRef = useRef<HTMLDivElement>(null)

  // ----- Animation State -----
  const [damageNumbers, setDamageNumbers] = useState<DamageNumberData[]>([])
  const [particleActive, setParticleActive] = useState(false)
  const [attackingId, setAttackingId] = useState<string | null>(null)

  // ===== Combat juice: stage shake, anchored numbers, per-card hit fx =====
  const juiceEnabled = useJuiceEnabled()
  const { controls: shakeControls, shake } = useScreenShake()
  const diceControls = useAnimationControls()
  const [cardFx, setCardFx] = useState<Record<string, CardFx>>({})
  // Live card DOM elements keyed by combatant id ('bird' | cat instanceId).
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
  const damageBaselineRef = useRef(0)

  // ----- Status Effects (display only) -----
  const [dotEffects, setDotEffects] = useState<{ targetId: string; type: 'poison' | 'burn' }[]>([])
  const [silenced, setSilenced] = useState(false)
  const [atkDebuffs, setAtkDebuffs] = useState<Record<string, { multiplier: number; turnsLeft: number }>>({})
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>(() => {
    const cd: Record<string, number> = {}
    initialSquad.forEach(c => { cd[c.instanceId] = 0 })
    return cd
  })

  const ABILITY_COOLDOWN = 3

  // ----- Derived (init log only) -----
  const eliteAuraBonus = cats.filter(c => c.isElite && (catHp[c.instanceId] ?? 0) > 0).length

  const getCatHp = useCallback((instanceId: string) => catHp[instanceId] ?? 0, [catHp])
  const getCatMaxHp = useCallback((instanceId: string) => catMaxHp[instanceId] ?? 1, [catMaxHp])

  // ===== Timer plumbing (all timeouts tracked + cancelled on unmount) =====
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
  const addLog = useCallback((text: string, type?: BattleLog['type']) => {
    setLog(prev => {
      const next = [...prev, { text, type }]
      return next.length > BATTLE_LOG_MAX_ENTRIES ? next.slice(-BATTLE_LOG_MAX_ENTRIES) : next
    })
  }, [])

  const fallbackPos = (targetId: string) => {
    if (targetId === 'bird') return { x: window.innerWidth / 2, y: 140 }
    const idx = cats.findIndex(c => c.instanceId === targetId)
    return { x: (window.innerWidth / 3) * (idx + 0.5), y: window.innerHeight - 200 }
  }

  const spawnNumber = (targetId: string, text: string, kind: DamageKind, magnitude?: number) => {
    const rect = getRect(targetId)
    const base = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.36 }
      : fallbackPos(targetId)
    const x = base.x + (Math.random() * 32 - 16) // ±16px jitter
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
    if (targetId === 'bird') setBirdHp(hp)
    else setCatHp(prev => ({ ...prev, [targetId]: hp }))
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
          // Recoil away from attacker: bird (top) knocked up, cats (bottom) knocked down.
          const dy = ev.targetId === 'bird' ? -7 : 7
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
        // CombatantDefeated / BattleEnded / StoneConsumed: no direct visual side-effect.
        default:
          break
      }
    }
  }

  const syncFromBattle = (b: BattleState) => {
    const hp: Record<string, number> = {}
    b.cats.forEach(c => { hp[c.instanceId] = c.currentHp })
    setCatHp(hp)
    setBirdHp(b.dog.hp)
    setTurn(b.turn)
    setSilenced(b.silenced)
    setAbilityCooldowns({ ...b.abilityCooldowns })
    setAtkDebuffs({ ...b.atkDebuffs })
    setBirdAbilityCooldown(b.birdAbilityCooldown)
    setBossHasRevived(b.bossRevived)
    setDotEffects(b.dotEffects.map(d => ({ targetId: d.catId, type: d.type as 'poison' | 'burn' })))
  }

  // Resolve one action, play its events, mirror engine state into React.
  const resolveAndPlay = async (action: BattleAction): Promise<{ aborted: boolean }> => {
    const { state: next, events } = resolveAction(battleRef.current, action, rngRef.current)
    battleRef.current = next
    await playEvents(events)
    if (!mountedRef.current) return { aborted: true }
    syncFromBattle(next)
    return { aborted: false }
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
      const actorId = action.type === 'ENEMY_TURN' ? 'bird' : 'attackerId' in action ? action.attackerId : null
      if (actorId) setAttackingId(actorId)

      const res = await resolveAndPlay(action)
      if (res.aborted) return

      // Entering the player's turn after an enemy turn: run the start-of-turn
      // DoT / debuff ticks as an engine action (not a fragile [turn]-keyed
      // useEffect over stale closures — fixes the DoT bug).
      if (
        action.type === 'ENEMY_TURN' &&
        battleRef.current.outcome === 'ongoing' &&
        battleRef.current.turn === 'player'
      ) {
        const tickRes = await resolveAndPlay({ type: 'START_PLAYER_TURN' })
        if (tickRes.aborted) return
      }

      setAttackingId(null)
      const b = battleRef.current
      if (b.outcome === 'victory') {
        setBattleEnded(true)
        handleVictory()
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
    if (!selectedCatId || turn !== 'player' || battleEnded || rolling) return
    void runAction({ type: 'PLAYER_ATTACK', attackerId: selectedCatId })
  }

  const handleActiveAbility = (catId: string) => {
    if (turn !== 'player' || rolling || battleEnded) return
    void runAction({ type: 'PLAYER_ABILITY', attackerId: catId })
  }

  // ===== Battle end handlers =====
  const buildResult = (won: boolean) => {
    const b = battleRef.current
    const catHpRemaining: Record<string, number> = {}
    const catsKnockedOut: string[] = []
    b.cats.forEach(c => {
      const hp = won ? Math.max(0, c.currentHp) : 0
      catHpRemaining[c.instanceId] = hp
      if (hp <= 0) catsKnockedOut.push(c.instanceId)
    })
    return {
      won,
      catHpRemaining,
      catsKnockedOut,
      turnsElapsed: b.turnsElapsed,
      wasFlawless: won && b.damageTaken === 0,
    }
  }

  const handleVictory = () => {
    if (soundEnabled) playSound('victory')
    const result = buildResult(true)
    trackedTimeout(() => {
      if (!mountedRef.current) return
      onBattleEnd(result)
    }, 1500)
  }

  const handleDefeat = () => {
    if (soundEnabled) playSound('defeat')
    const result = buildResult(false)
    trackedTimeout(() => {
      if (!mountedRef.current) return
      onBattleEnd(result)
    }, 1500)
  }

  // ===== Initialize log =====
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

  // ===== Auto-scroll Log =====
  useEffect(() => {
    if (mobileLogRef.current) mobileLogRef.current.scrollTop = mobileLogRef.current.scrollHeight
    if (desktopLogRef.current) desktopLogRef.current.scrollTop = desktopLogRef.current.scrollHeight
  }, [log])

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
          <p className="text-white font-bold text-sm sm:text-base flex-1 text-center inline-flex items-center justify-center gap-2 font-heading tracking-wide">
            <DiceIcon className="text-lg" aria-hidden />
            Stage {stageNumber} — {bird.isBoss ? 'BOSS: ' : ''}{bird.name}
            {bird.ability && ` | ${bird.ability.name}`}
          </p>
        </div>
      </motion.div>

      {/* Stage-shake wrapper — transform-only, decays to rest. Damage numbers
          (portaled) and overlays live OUTSIDE so they aren't dragged by the shake. */}
      <motion.div animate={shakeControls} style={{ willChange: 'transform' }}>
      {/* MOBILE LAYOUT (< lg) */}
      <div className="lg:hidden flex flex-col gap-3 px-2 py-2 pb-6">
        {/* Enemy Section */}
        <div className="flex flex-col items-center">
          <motion.div
            ref={registerCard('bird')}
            variants={lungeVariants}
            custom={1}
            animate={juiceEnabled && attackingId === 'bird' ? 'attack' : 'idle'}
            className="scale-[0.60] origin-center"
          >
            <GameCard
              character={birdDisplay}
              isEnemy={true}
              animate={false}
              showStats={false}
              holographicMode="full"
              fx={cardFx['bird']}
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
            <motion.div animate={diceControls} className="scale-[0.7] origin-center">
              <D20Dice value={dice} rolling={rolling} />
            </motion.div>
          </div>
          <BattleLogPanel ref={mobileLogRef} logs={log} variant="mobile" />
        </div>

        {/* Attack Buttons */}
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
              {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && !silenced && (
                <Button
                  variant="secondary"
                  fullWidth
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => handleActiveAbility(selectedCatId)}
                  className="py-3 text-lg border-arcane-400/50 text-arcane-200"
                >
                  <SparkleIcon aria-hidden /> {cats.find(c => c.instanceId === selectedCatId)?.ability.name || 'ABILITY'}
                </Button>
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
              ascension: cat.ascension,
              equipment: cat.equipment,
              instanceId: cat.instanceId,
              level: cat.level,
              xp: 0,
              currentHp: getCatHp(cat.instanceId),
              maxHp: getCatMaxHp(cat.instanceId),
              currentAttack: cat.currentAtk,
            }

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
                {/* Health Bar Above Card */}
                <div className="flex justify-center" style={{ width: `${cardWidth}px` }}>
                  <div style={{ width: `${healthBarWidth}px` }}>
                    <StatBar current={getCatHp(cat.instanceId)} max={getCatMaxHp(cat.instanceId)} type="hp" showNumbers={false} />
                  </div>
                </div>

                {/* Card with Selection Highlight */}
                <motion.div
                  ref={registerCard(cat.instanceId)}
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
                    fx={cardFx[cat.instanceId]}
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

      {/* DESKTOP LAYOUT (>= lg) — full-width 16:9 stage, sibling of BattleArena.
          Bird enemy commands the upper zone (centered at lg, pushed center-right
          at xl+); squad is arrayed across the lower zone; dice + actions form a
          bottom-center HUD; the battle log docks as a right rail with its own
          scroll. Card ref registry + shake wrapper preserved. */}
      <div className="hidden lg:grid grid-cols-[1fr_auto] gap-6 min-h-[64vh]">
        {/* ===== Arena ===== */}
        <div className="relative flex flex-col">
          {/* Bird zone — upper, centered (lg) → pushed center-right (xl+) */}
          <div className="flex justify-center xl:justify-end xl:pr-[6%] 2xl:pr-[10%] pt-2">
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-4 w-full max-w-[240px] px-2">
                <StatBar current={birdHp} max={bird.scaledHP} label={bird.isBoss ? 'BOSS HP' : 'BIRD HP'} type="hp" showNumbers={true} />
              </div>

              <motion.div
                ref={registerCard('bird')}
                variants={lungeVariants}
                custom={1}
                animate={juiceEnabled && attackingId === 'bird' ? 'attack' : 'idle'}
                className="relative"
              >
                <GameCard
                  character={birdDisplay}
                  isEnemy={true}
                  animate={false}
                  showStats={false}
                  fx={cardFx['bird']}
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
          </div>

          {/* Squad zone — lower, arrayed left-to-right with presence */}
          <div className="mt-auto flex items-end justify-center xl:justify-start xl:pl-[3%] 2xl:pl-[7%] gap-6 flex-wrap pt-16">
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
              ascension: cat.ascension,
              equipment: cat.equipment,
              instanceId: cat.instanceId,
              level: cat.level,
              xp: 0,
              currentHp: getCatHp(cat.instanceId),
              maxHp: getCatMaxHp(cat.instanceId),
              currentAttack: cat.currentAtk,
            }

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
                    current={getCatHp(cat.instanceId)}
                    max={getCatMaxHp(cat.instanceId)}
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
                    character={catDisplay}
                    selected={isSelected}
                    disabled={isDead || (turn !== 'player' && !isSelected)}
                    showStats={true}
                    fx={cardFx[cat.instanceId]}
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
                <div className="text-emerald-400 font-black animate-pulse font-heading tracking-widest text-sm py-1.5 px-4 bg-emerald-500/10 rounded-xl backdrop-blur-sm border border-emerald-500/20">
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
                  {(abilityCooldowns[selectedCatId] ?? ABILITY_COOLDOWN) === 0 && !silenced && (
                    <Button
                      variant="secondary"
                      size="sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => handleActiveAbility(selectedCatId)}
                      className="border-arcane-400/50 text-arcane-200"
                    >
                      <SparkleIcon aria-hidden /> {cats.find(c => c.instanceId === selectedCatId)?.ability.name}
                    </Button>
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
