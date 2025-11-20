import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

interface D20DiceProps {
  value: number
  rolling: boolean
  soundEnabled?: boolean
}

export default function D20Dice({ value, rolling, soundEnabled = true }: D20DiceProps) {
  const [showValue, setShowValue] = useState(value)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Update shown value after roll completes
  useEffect(() => {
    if (!rolling) {
      setShowValue(value)
    }
  }, [rolling, value])

  // Play dice roll sound
  useEffect(() => {
    if (rolling && soundEnabled) {
      // Create a simple dice roll sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Dice rolling sound effect (multiple bounces)
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3)

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (e) {
        // Fallback if Web Audio API is not available
        console.log('Audio not available')
      }
    }
  }, [rolling, soundEnabled])

  // Critical hit effect (natural 20)
  const isCriticalHit = !rolling && value === 20
  const isCriticalFail = !rolling && value === 1

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect for critical rolls */}
      {isCriticalHit && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-gold-500/50 to-amber-500/50 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {isCriticalFail && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-red-500/50 to-rose-500/50 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* D20 Container with 3D perspective */}
      <motion.div
        className="relative"
        style={{ perspective: '1000px' }}
        animate={rolling ? {
          rotateX: [0, 360, 720],
          rotateY: [0, 360, 720],
          rotateZ: [0, 180, 360]
        } : {}}
        transition={rolling ? {
          duration: 0.8,
          repeat: Infinity,
          ease: 'linear'
        } : {
          duration: 0.5,
          ease: 'easeOut'
        }}
      >
        {/* 3D D20 Shape */}
        <div
          className="relative w-32 h-32 flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Main D20 Body - Golden icosahedron approximation */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 shadow-2xl"
            style={{
              transform: 'translateZ(0)',
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            }}
            animate={rolling ? {} : {
              rotateX: value * 18,
              rotateY: value * 36,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Face highlights - simulate faceted surface */}
          <motion.div
            className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-300/60 to-transparent"
            style={{
              transform: 'translateZ(10px)',
              clipPath: 'polygon(50% 10%, 90% 40%, 75% 90%, 25% 90%, 10% 40%)',
            }}
          />

          {/* Inner glow */}
          <motion.div
            className="absolute inset-4 rounded-full bg-gradient-radial from-yellow-200/40 to-transparent blur-sm"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Edge highlights */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border-2 border-gold-300/30 rounded-full"
              style={{
                transform: `rotateZ(${i * 72}deg) rotateX(${i * 36}deg) translateZ(5px)`,
                clipPath: 'polygon(50% 0%, 60% 40%, 50% 45%, 40% 40%)',
              }}
            />
          ))}

          {/* Number Display */}
          <motion.div
            className="relative z-10 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={rolling ?
              { scale: [1, 0.8, 1], opacity: [0.5, 0.3, 0.5] } :
              { scale: 1, opacity: 1 }
            }
            transition={rolling ? {
              duration: 0.4,
              repeat: Infinity
            } : {
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            <span className={`font-black text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              isCriticalHit ? 'text-white animate-pulse' :
              isCriticalFail ? 'text-red-900' :
              'text-slate-900'
            }`}>
              {rolling ? '?' : showValue}
            </span>
          </motion.div>

          {/* Sparkle effects for critical hit */}
          {isCriticalHit && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-gold-300 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 60}deg) translateY(-60px)`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* Result Label */}
      {!rolling && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
        >
          <span className={`text-sm font-bold tracking-wider uppercase ${
            isCriticalHit ? 'text-gold-400 drop-shadow-glow' :
            isCriticalFail ? 'text-red-400' :
            'text-slate-400'
          }`}>
            {isCriticalHit ? '✨ CRITICAL! ✨' :
             isCriticalFail ? '💀 MISS! 💀' :
             `Roll: ${showValue}`}
          </span>
        </motion.div>
      )}
    </div>
  )
}
