import { useEffect, useState, useRef } from 'react'
import GameCard from '../components/GameCard'
import D20Dice from '../components/D20Dice'
import StatBar from '../components/StatBar'
import ParticleSystem from '../components/ParticleSystem'
import Modal from '../components/Modal'
import { useGame } from '../../game/store'
import { TRAINING_DOG } from '../../game/data'
import { TRAINING_XP as TRAINING_XP_CONST, MAX_DAILY_TRAINING_SESSIONS, BATTLE_LOG_MAX_ENTRIES } from '../../game/constants'
import { rollD20 } from '../../game/dice'
import { resolveAbility } from '../../game/abilityResolver'
import { motion, AnimatePresence } from 'framer-motion'
import { shakeVariants, attackVariants, damageVariants } from '../animations'
import { trackTrainingStart, trackTrainingComplete, trackAbilityTriggered } from '../../utils/analytics'

const TRAINING_XP = TRAINING_XP_CONST
const MAX_DAILY_SESSIONS = MAX_DAILY_TRAINING_SESSIONS

interface BattleLog { text: string; type?: 'damage' | 'heal' | 'crit' | 'info' }

export default function TrainingArena() {
  const owned = useGame(s => s.owned)
  const updateCatHp = useGame(s => s.updateCatHp)
  const addXpToCat = useGame(s => s.addXpToCat)
  const recordTrainingComplete = useGame(s => s.recordTrainingComplete)
  const getTrainingSessions = useGame(s => s.getTrainingSessions)
  const setView = useGame(s => s.setView)

  const [phase, setPhase] = useState<'select' | 'battle' | 'complete'>('select')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [dogHp, setDogHp] = useState(TRAINING_DOG.health)
  const [turn, setTurn] = useState<'player' | 'enemy'>('player')
  const [dice, setDice] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [log, setLog] = useState<BattleLog[]>([])
  const [battleEnded, setBattleEnded] = useState(false)
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number; x: number; y: number }[]>([])
  const [particleActive, setParticleActive] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [attackingId, setAttackingId] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [sessionsAfterTraining, setSessionsAfterTraining] = useState(0)
  const mobileLogRef = useRef<HTMLDivElement>(null)
  const desktopLogRef = useRef<HTMLDivElement>(null)

  const selectedCat = owned.find(c => c.instanceId === selectedCatId) || null

  // Auto-scroll log
  useEffect(() => {
    if (mobileLogRef.current) mobileLogRef.current.scrollTop = mobileLogRef.current.scrollHeight
    if (desktopLogRef.current) desktopLogRef.current.scrollTop = desktopLogRef.current.scrollHeight
  }, [log])

  // Enemy turn logic
  useEffect(() => {
    if (turn === 'enemy' && !battleEnded && dogHp > 0 && phase === 'battle') {
      const timer = setTimeout(() => handleDogTurn(), 1500)
      return () => clearTimeout(timer)
    }
  }, [turn, battleEnded, dogHp, phase])

  const addLog = (t: string, type?: 'damage' | 'heal' | 'crit' | 'info') => {
    setLog(l => {
      const next = [...l, { text: t, type }]
      return next.length > 20 ? next.slice(-20) : next
    })
  }

  const showDamage = (value: number, x: number, y: number) => {
    const id = Date.now()
    setDamageNumbers(prev => [...prev, { id, value, x, y }])
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 1000)
  }

  const roll = async () => {
    setRolling(true)
    await new Promise(r => setTimeout(r, 600))
    const v = rollD20()
    setDice(v)
    setRolling(false)
    return v
  }

  const startTraining = (catId: string) => {
    const cat = owned.find(c => c.instanceId === catId)
    if (cat) trackTrainingStart(cat.name, cat.level)
    setSelectedCatId(catId)
    setDogHp(TRAINING_DOG.health)
    setTurn('player')
    setBattleEnded(false)
    setLog([{ text: `🎯 Training Dummy appears! Practice your skills!`, type: 'info' }])
    setPhase('battle')
  }

  const handleAttack = async () => {
    if (!selectedCat || turn !== 'player' || battleEnded) return
    if (selectedCat.currentHp <= 0) return

    setAttackingId(selectedCat.instanceId)
    addLog(`${selectedCat.name} attacks!`, 'info')

    const v = await roll()

    if (v === 20) {
      addLog(`🎲 NATURAL 20! ⚡ LEGENDARY STRIKE! ⚡`, 'crit')
      addLog(`✨ MAXIMUM POWER UNLEASHED! ✨`, 'crit')
    } else if (v === 1) {
      addLog(`🎲 CRITICAL FAIL! 💥 Attack MISSES! 💥`, 'damage')
      addLog(`${selectedCat.name} stumbles and deals NO damage!`, 'damage')
      setAttackingId(null)
      setTurn('enemy')
      return
    }

    // Base damage (no elite aura in training)
    const baseDmg = selectedCat.currentAttack + Math.floor(v / 5)

    // Resolve ability effects (training is never silenced)
    const result = resolveAbility(selectedCat, v, baseDmg, false)
    const { damage: dmg, isCrit, healAmount, healTargetId, isStun, isSpeed, logMessages, abilityTriggered } = result

    // Apply log messages
    logMessages.forEach(msg => addLog(msg.text, msg.type))

    // Track ability analytics
    if (abilityTriggered) {
      trackAbilityTriggered(selectedCat.name, abilityTriggered.abilityName, abilityTriggered.effectType, 'training')
    }

    // Apply healing if any
    if (healAmount > 0 && healTargetId) {
      const newHp = Math.min(selectedCat.maxHp, selectedCat.currentHp + healAmount)
      updateCatHp(healTargetId, newHp)
    }

    // Apply damage and check victory
    const newDogHp = Math.max(0, dogHp - dmg)
    setDogHp(newDogHp)
    showDamage(dmg, window.innerWidth / 2, 100)

    setShaking(true)
    setTimeout(() => setShaking(false), 400)
    setParticleActive(true)
    setTimeout(() => setParticleActive(false), 100)

    // Stun path
    if (isStun) {
      addLog('💥 STUN! The dummy flinches!', 'crit')
      if (newDogHp <= 0) { handleVictory(); return }
      setAttackingId(null)
      return
    }

    // Speed path
    if (isSpeed) {
      if (newDogHp <= 0) { handleVictory(); return }
      setAttackingId(null)
      return
    }

    // Normal hit
    if (isCrit) {
      addLog(`💥 Critical Hit! ${dmg} damage!`, 'crit')
    } else {
      addLog(`Hit for ${dmg} damage.`, 'damage')
    }

    if (newDogHp <= 0) { handleVictory(); return }

    setAttackingId(null)
    setTurn('enemy')
  }

  const handleDogTurn = async () => {
    setAttackingId('dog')
    addLog(`${TRAINING_DOG.name} flails harmlessly!`, 'info')
    await roll()
    // Training dummy deals no damage
    addLog(`${TRAINING_DOG.name} misses completely!`, 'info')
    setAttackingId(null)
    setTurn('player')
  }

  const handleVictory = () => {
    setBattleEnded(true)
    addLog(`🎉 Training Complete!`, 'info')
    addLog(`+${TRAINING_XP} XP earned!`, 'info')

    if (selectedCatId) {
      addXpToCat(selectedCatId, TRAINING_XP)
      updateCatHp(selectedCatId, selectedCat!.maxHp)
      recordTrainingComplete(selectedCatId)
      const sessions = getTrainingSessions(selectedCatId)
      setSessionsAfterTraining(sessions.remaining)
      trackTrainingComplete(selectedCat!.name, TRAINING_XP)
    }

    setTimeout(() => setShowCompleteModal(true), 1000)
  }

  const resetToSelect = () => {
    setShowCompleteModal(false)
    setSelectedCatId(null)
    setPhase('select')
  }

  // ========= SELECT PHASE =========
  if (phase === 'select') {
    return (
      <div className="relative min-h-[80vh] flex flex-col space-y-4 premium-card rounded-2xl p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-amber-500/60 to-yellow-500/60 border border-amber-500/50"
        >
          <p className="text-white text-center font-semibold">
            <span className="text-lg mr-2">🎯</span>
            Select a cat to train against the Training Dummy. Each cat can train {MAX_DAILY_SESSIONS} times per day. No injuries!
          </p>
        </motion.div>

        {owned.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-6xl mb-4">🐱</div>
            <p className="text-lg mb-2">No cats yet!</p>
            <p className="text-sm">Visit the Baiting Area to catch your first cat.</p>
            <button
              onClick={() => setView('bait')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Go to Baiting Area
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {owned.map(cat => {
              const sessions = getTrainingSessions(cat.instanceId)
              const canTrain = sessions.remaining > 0 && cat.currentHp > 0
              return (
                <motion.div
                  key={cat.instanceId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={canTrain ? { scale: 1.05 } : {}}
                  whileTap={canTrain ? { scale: 0.95 } : {}}
                  onClick={() => canTrain && startTraining(cat.instanceId)}
                  className={`relative cursor-pointer ${!canTrain ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  <GameCard
                    character={cat}
                    disabled={!canTrain}
                    showStats={true}
                    animate={false}
                    holographicMode="none"
                  />
                  {/* Session Badge */}
                  <div className={`absolute top-2 right-2 z-20 px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                    sessions.remaining === 0
                      ? 'bg-red-500/90 text-white'
                      : sessions.remaining <= 1
                        ? 'bg-amber-500/90 text-white'
                        : 'bg-emerald-500/90 text-white'
                  }`}>
                    {sessions.remaining}/{MAX_DAILY_SESSIONS}
                  </div>
                  {/* Dead overlay */}
                  {cat.currentHp <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-2xl z-10">
                      <span className="text-4xl mb-1">💀</span>
                      <span className="text-xs text-slate-300 font-semibold">Heal first</span>
                    </div>
                  )}
                  {/* Cooldown overlay */}
                  {sessions.remaining === 0 && cat.currentHp > 0 && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-2xl z-10">
                      <span className="text-3xl mb-1">⏳</span>
                      <span className="text-xs text-slate-300 font-semibold">Resting</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ========= BATTLE PHASE =========
  if (!selectedCat) return null

  return (
    <div className="relative min-h-[80vh] flex flex-col space-y-4">
      {/* Instruction Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-amber-500/60 to-yellow-500/60 border border-amber-500/50"
      >
        <p className="text-white text-center font-semibold">
          <span className="text-lg mr-2">🎯</span>
          Training Mode - Roll the dice and attack the Training Dummy! Your cat won't be injured.
        </p>
      </motion.div>

      {/* MOBILE LAYOUT (< lg) */}
      <div className="lg:hidden flex flex-col gap-3 px-2 py-3 pb-6">
        {/* Enemy Section */}
        <div className="flex flex-col items-center">
          <motion.div
            variants={shakeVariants}
            animate={shaking ? 'shake' : 'idle'}
            className="scale-[0.60] origin-center"
          >
            <GameCard
              character={TRAINING_DOG}
              isEnemy={true}
              animate={false}
              showStats={false}
              holographicMode="full"
            />
          </motion.div>
          <div className="w-[125px] mt-0">
            <StatBar current={dogHp} max={TRAINING_DOG.health} type="hp" showNumbers={false} />
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
            <div className="text-amber-400 font-black text-center animate-pulse text-xl py-2 px-4 bg-black/60 rounded-lg backdrop-blur-sm">
              DUMMY'S TURN...
            </div>
          </div>
        )}

        {/* Dice + Battle Log */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
          <div className="scale-[0.65] origin-top-left -mt-8">
            <D20Dice value={dice} rolling={rolling} />
          </div>
          <div
            ref={mobileLogRef}
            className="bg-slate-900/90 rounded-lg p-2 border border-slate-700/50 h-[180px] overflow-y-auto custom-scrollbar"
          >
            {log.slice(-12).map((l, i) => (
              <div key={i} className={`text-xs font-medium leading-relaxed mb-1 ${
                l.type === 'crit' ? 'text-yellow-400 font-bold' :
                l.type === 'damage' ? 'text-red-400' :
                l.type === 'heal' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {l.text}
              </div>
            ))}
          </div>
        </div>

        {/* Attack Button */}
        <div className="mt-12">
          {turn === 'player' && !battleEnded && !rolling && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAttack}
              className="w-full px-6 py-5 bg-gradient-to-b from-amber-600 to-amber-800 text-white font-black text-2xl rounded-xl shadow-2xl border-4 border-amber-400/50 font-heading tracking-wider flex items-center justify-center gap-2"
            >
              🎯 TRAIN!
            </motion.button>
          )}
        </div>

        {/* Player Cat */}
        <div className="flex justify-center">
          <motion.div
            variants={attackVariants}
            animate={attackingId === selectedCat.instanceId ? 'attack' : 'idle'}
            className="flex flex-col"
            style={{ width: '114px' }}
          >
            <div className="flex justify-center" style={{ width: '114px' }}>
              <div style={{ width: '100px' }}>
                <StatBar current={selectedCat.currentHp} max={selectedCat.maxHp} type="hp" showNumbers={false} />
              </div>
            </div>
            <motion.div className="origin-top-center -mt-4 ring-4 ring-amber-500/80 rounded-2xl scale-[0.55]">
              <GameCard
                character={selectedCat}
                selected={false}
                showStats={true}
                animate={false}
                holographicMode="none"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* DESKTOP LAYOUT (>= lg) */}
      <div className="hidden lg:flex flex-col flex-1">
        <div className="flex-1 flex justify-center items-start pt-8 relative gap-8">
          {/* Left Side: Dice & Action */}
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex flex-col items-center gap-2">
              {turn === 'player' && !battleEnded && (
                <div className="text-white font-bold animate-pulse font-heading tracking-widest text-sm mb-2 py-1.5 px-3 bg-black/60 rounded-lg backdrop-blur-sm">
                  YOUR TURN
                </div>
              )}
              <D20Dice value={dice} rolling={rolling} />
            </div>

            <div className="w-64 flex justify-center mb-4">
              {turn === 'player' && !battleEnded && !rolling && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAttack}
                  className="px-8 py-4 bg-gradient-to-b from-amber-600 to-amber-800 text-white font-black text-xl rounded-xl shadow-lg border-2 border-amber-400 font-heading tracking-wider hover:shadow-amber-500/50 transition-shadow"
                >
                  TRAIN!
                </motion.button>
              )}
            </div>
          </div>

          {/* Enemy Card - Center */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4 w-full px-2">
              <StatBar current={dogHp} max={TRAINING_DOG.health} label="DUMMY HP" type="hp" showNumbers={true} />
            </div>
            <motion.div
              variants={shakeVariants}
              animate={shaking ? 'shake' : 'idle'}
              className="relative"
            >
              <GameCard
                character={TRAINING_DOG}
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

        {/* Bottom Area: Player Cat */}
        <div className="flex-1 flex justify-center items-end pb-8 gap-4 pt-24 mt-8">
          <motion.div
            variants={attackVariants}
            animate={attackingId === selectedCat.instanceId ? 'attack' : 'idle'}
            className="relative group"
          >
            <div className="absolute -top-14 left-0 right-0 px-2 z-20">
              <StatBar
                current={selectedCat.currentHp}
                max={selectedCat.maxHp}
                type="hp"
                showNumbers={true}
                label={selectedCat.name}
              />
            </div>
            <motion.div
              animate={{ y: -16, scale: 1.05 }}
            >
              <GameCard
                character={selectedCat}
                selected={true}
                showStats={true}
              />
            </motion.div>
            <motion.div
              className="absolute -top-28 left-0 right-0 flex justify-center z-30"
            >
              <div className="bg-amber-500 text-slate-900 font-bold px-3 py-1 rounded-full text-sm shadow-lg border border-amber-300">
                TRAINING
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

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

      <ParticleSystem
        x={window.innerWidth / 2}
        y={200}
        active={particleActive}
        count={20}
        colors={['#F59E0B', '#FBBF24', '#FCD34D']}
      />

      {/* Training Complete Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={resetToSelect}
        title="🎯 Training Complete!"
        size="sm"
      >
        <div className="text-center py-6">
          <div className="text-6xl mb-4 animate-bounce">💪</div>
          <h3 className="text-2xl font-bold text-amber-400 mb-2">Great Practice!</h3>
          <p className="text-slate-300 mb-6">
            {selectedCat?.name} has finished training! HP fully restored.
          </p>

          <div className="bg-slate-800/80 rounded-lg p-6 mb-6 border border-amber-500/30">
            <div className="text-sm text-slate-400 mb-4 uppercase tracking-wider">Training Reward</div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">⭐</span>
              <div>
                <div className="text-3xl font-black text-cyan-400">+{TRAINING_XP}</div>
                <div className="text-xs text-slate-500">EXPERIENCE</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-400">
              {sessionsAfterTraining > 0
                ? `${sessionsAfterTraining} training session${sessionsAfterTraining !== 1 ? 's' : ''} remaining today`
                : 'No more sessions today for this cat'
              }
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetToSelect}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-bold rounded-xl shadow-lg hover:shadow-premium-lg transition-all hover:scale-105"
            >
              🎯 Train Again
            </button>
            <button
              onClick={() => {
                setShowCompleteModal(false)
                setTimeout(() => setView('collection'), 350)
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-premium-lg transition-all hover:scale-105"
            >
              📚 Collection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
