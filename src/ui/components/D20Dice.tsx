import { useState, useEffect, CSSProperties } from 'react'

interface D20DiceProps {
  value: number
  rolling: boolean
}

export default function D20Dice({ value, rolling }: D20DiceProps) {
  const [showValue, setShowValue] = useState(value)
  const [isRolling, setIsRolling] = useState(false)

  // Constants for D20 geometry (converted from SCSS)
  const CONTAINER_SIZE = 200
  const FACE_WIDTH = CONTAINER_SIZE * 0.5
  const FACE_HEIGHT = FACE_WIDTH * 0.86
  const ANGLE = 53
  const RING_ANGLE = -11
  const SIDE_ANGLE = 360 / 5

  // Translation values
  const TRANSLATE_Z = FACE_WIDTH * 0.335
  const TRANSLATE_Y = -FACE_HEIGHT * 0.15
  const TRANSLATE_RING_Z = FACE_WIDTH * 0.75
  const TRANSLATE_RING_Y = FACE_HEIGHT * 0.78 + TRANSLATE_Y
  const TRANSLATE_LOWER_Z = TRANSLATE_Z
  const TRANSLATE_LOWER_Y = FACE_HEIGHT * 0.78 + TRANSLATE_RING_Y

  // Update shown value after roll completes
  useEffect(() => {
    if (rolling) {
      setIsRolling(true)
    } else {
      // Wait for animation to finish before showing final value
      const timer = setTimeout(() => {
        setShowValue(value)
        setIsRolling(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [rolling, value])

  // Critical hit/fail detection
  const isCriticalHit = !rolling && value === 20
  const isCriticalFail = !rolling && value === 1

  // Generate transform for each face
  const getFaceTransform = (faceNum: number): string => {
    if (faceNum >= 1 && faceNum <= 5) {
      // Top ring
      const angleMultiplier = faceNum - 1
      return `rotateY(${-SIDE_ANGLE * angleMultiplier}deg) translateZ(${TRANSLATE_Z}px) translateY(${TRANSLATE_Y}px) rotateX(${ANGLE}deg)`
    } else if (faceNum >= 16 && faceNum <= 20) {
      // Bottom ring
      const angleMultiplier = faceNum - 18
      return `rotateY(${SIDE_ANGLE * angleMultiplier + SIDE_ANGLE / 2}deg) translateZ(${TRANSLATE_LOWER_Z}px) translateY(${TRANSLATE_LOWER_Y}px) rotateZ(180deg) rotateX(${ANGLE}deg)`
    } else if (faceNum >= 6 && faceNum <= 10) {
      // Upper middle ring
      const angleMultiplier = faceNum - 11
      return `rotateY(${-SIDE_ANGLE * angleMultiplier}deg) translateZ(${TRANSLATE_RING_Z}px) translateY(${TRANSLATE_RING_Y}px) rotateZ(180deg) rotateX(${RING_ANGLE}deg)`
    } else if (faceNum >= 11 && faceNum <= 15) {
      // Lower middle ring
      const angleMultiplier = faceNum - 8
      return `rotateY(${SIDE_ANGLE * angleMultiplier + SIDE_ANGLE / 2}deg) translateZ(${TRANSLATE_RING_Z}px) translateY(${TRANSLATE_RING_Y}px) rotateX(${RING_ANGLE}deg)`
    }
    return ''
  }

  // Generate die rotation for showing specific face
  const getDieRotation = (): string => {
    if (isRolling) return ''

    const face = showValue
    if (face >= 1 && face <= 5) {
      const angleMultiplier = face - 1
      return `rotateX(${-ANGLE}deg) rotateY(${SIDE_ANGLE * angleMultiplier}deg)`
    } else if (face >= 16 && face <= 20) {
      const angleMultiplier = face - 15
      return `rotateX(${-ANGLE + 180}deg) rotateY(${-SIDE_ANGLE * angleMultiplier}deg)`
    } else if (face >= 6 && face <= 10) {
      const angleMultiplier = face - 6
      return `rotateX(${-RING_ANGLE}deg) rotateZ(180deg) rotateY(${SIDE_ANGLE * angleMultiplier}deg)`
    } else if (face >= 11 && face <= 15) {
      const angleMultiplier = face - 8
      return `rotateX(${-RING_ANGLE}deg) rotateY(${-SIDE_ANGLE * angleMultiplier - SIDE_ANGLE / 2}deg)`
    }
    return `rotateX(${-ANGLE}deg)`
  }

  // Styles
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: `${CONTAINER_SIZE}px`,
    height: `${CONTAINER_SIZE}px`,
    perspective: '1500px',
  }

  const dieStyle: CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transition: isRolling ? 'none' : 'transform 0.5s ease-out',
    cursor: 'pointer',
    transform: getDieRotation(),
    animation: isRolling ? 'd20-roll 3s linear' : 'none',
  }

  const faceStyle = (faceNum: number): CSSProperties => ({
    position: 'absolute',
    left: '50%',
    top: 0,
    margin: `0 ${-FACE_WIDTH * 0.5}px`,
    borderLeft: `${FACE_WIDTH * 0.5}px solid transparent`,
    borderRight: `${FACE_WIDTH * 0.5}px solid transparent`,
    borderBottom: `${FACE_HEIGHT}px solid rgba(234, 179, 8, 0.85)`, // Gold color
    width: 0,
    height: 0,
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
    transform: getFaceTransform(faceNum),
  })

  const faceNumberStyle: CSSProperties = {
    position: 'absolute',
    top: `${FACE_HEIGHT * 0.25}px`,
    left: `-${FACE_WIDTH}px`,
    color: '#fff',
    textShadow: '1px 1px 3px #000',
    fontSize: `${FACE_HEIGHT * 0.5}px`,
    textAlign: 'center',
    lineHeight: `${FACE_HEIGHT * 0.9}px`,
    width: `${FACE_WIDTH * 2}px`,
    height: `${FACE_HEIGHT}px`,
    fontWeight: 'black',
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect for critical rolls */}
      {isCriticalHit && (
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(234, 179, 8, 0.5) 0%, rgba(251, 146, 60, 0.5) 100%)',
            animation: 'pulse-glow 2s infinite',
          }}
        />
      )}
      {isCriticalFail && (
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(225, 29, 72, 0.5) 100%)',
            animation: 'pulse-glow 2s infinite',
          }}
        />
      )}

      {/* D20 Container */}
      <div style={containerStyle}>
        <div style={dieStyle}>
          {/* Generate all 20 faces */}
          {[...Array(20)].map((_, i) => {
            const faceNum = i + 1
            return (
              <div key={faceNum} style={faceStyle(faceNum)}>
                <div style={faceNumberStyle}>{faceNum}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sparkle effects for critical hit */}
      {isCriticalHit && (
        <>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gold-300 rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60}deg) translateY(-60px)`,
                animation: 'mythical-particles 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Result Label */}
      {!rolling && (
        <div
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          style={{
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          <span
            className={`text-sm font-bold tracking-wider uppercase ${
              isCriticalHit
                ? 'text-gold-400 drop-shadow-glow'
                : isCriticalFail
                ? 'text-red-400'
                : 'text-slate-400'
            }`}
          >
            {isCriticalHit ? '✨ CRITICAL! ✨' : isCriticalFail ? '💀 MISS! 💀' : `Roll: ${showValue}`}
          </span>
        </div>
      )}
    </div>
  )
}
