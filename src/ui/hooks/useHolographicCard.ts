import { useRef, useState, useCallback, useEffect, useMemo, CSSProperties } from 'react'
import { isWeb } from '../../utils/platform'

interface HolographicConfig {
  mode?: 'subtle' | 'full'
  maxRotation?: number
  shineIntensity?: number
  enableMobile?: boolean
  enableWeb?: boolean
}

interface HolographicReturn {
  cardRef: React.RefObject<HTMLDivElement>
  style: CSSProperties
  handlers: {
    onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void
    onMouseLeave?: () => void
    onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void
    onTouchEnd?: () => void
  }
  isActive: boolean
  isSupported: boolean
}

// Device capability detection
const detectDeviceCapabilities = (): boolean => {
  // Check CPU cores (disable on < 4 cores)
  const cores = (navigator as any).hardwareConcurrency || 2
  if (cores < 4) return false

  // Check for iOS version (disable on < iOS 13)
  const ua = navigator.userAgent
  const iosMatch = ua.match(/OS (\d+)_/)
  if (iosMatch && parseInt(iosMatch[1]) < 13) return false

  // Check for Android version (disable on < Android 8)
  const androidMatch = ua.match(/Android (\d+)/)
  if (androidMatch && parseInt(androidMatch[1]) < 8) return false

  // Check for mix-blend-mode support
  const supportsBlendMode = CSS.supports('mix-blend-mode', 'color-dodge')
  if (!supportsBlendMode) return false

  return true
}

// Battery detection
const checkBattery = async (): Promise<boolean> => {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery()
      return battery.level > 0.2 // Disable if battery < 20%
    } catch {
      return true // If battery API fails, assume OK
    }
  }
  return true
}

export function useHolographicCard(config: HolographicConfig = {}): HolographicReturn {
  const {
    mode = 'full',
    maxRotation = 15,
    shineIntensity = 0.6,
    enableMobile = true,
    enableWeb = true
  } = config

  const cardRef = useRef<HTMLDivElement>(null)
  const [pointerPos, setPointerPos] = useState({ x: 50, y: 50 })
  const [isActive, setIsActive] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const rafId = useRef<number | null>(null)
  const lastUpdate = useRef<number>(0)

  // Platform detection
  const platformIsWeb = isWeb()
  const shouldEnable = (platformIsWeb && enableWeb) || (!platformIsWeb && enableMobile)

  // Device capability check on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      const hasCapability = detectDeviceCapabilities()
      const hasBattery = await checkBattery()
      setIsSupported(hasCapability && hasBattery && shouldEnable)
    }
    checkCapabilities()
  }, [shouldEnable])

  // Intersection Observer to disable off-screen cards
  useEffect(() => {
    if (!cardRef.current || !isSupported) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only track visibility for subtle mode (collection view)
        if (mode === 'subtle' && !entry.isIntersecting) {
          setIsActive(false)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [mode, isSupported])

  // Throttle based on platform
  const throttleMs = platformIsWeb ? 16 : 33 // 60fps web, 30fps mobile

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current || !isSupported) return

    const now = Date.now()
    if (now - lastUpdate.current < throttleMs) return

    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }

    rafId.current = requestAnimationFrame(() => {
      const rect = cardRef.current!.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 100
      const y = ((clientY - rect.top) / rect.height) * 100

      // Clamp to 0-100
      const clampedX = Math.max(0, Math.min(100, x))
      const clampedY = Math.max(0, Math.min(100, y))

      setPointerPos({ x: clampedX, y: clampedY })
      setIsActive(true)
      lastUpdate.current = now
    })
  }, [isSupported, throttleMs])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    updatePointer(e.clientX, e.clientY)
  }, [updatePointer])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      updatePointer(touch.clientX, touch.clientY)
    }
  }, [updatePointer])

  const handlePointerLeave = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    setPointerPos({ x: 50, y: 50 })
    setIsActive(false)
  }, [])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [])

  // Calculate 3D rotation
  const rotateX = ((pointerPos.y - 50) / 50) * maxRotation
  const rotateY = ((pointerPos.x - 50) / 50) * -maxRotation

  const style: CSSProperties = useMemo(() => {
    if (!isSupported) return {}
    return {
      '--pointer-x': `${pointerPos.x}%`,
      '--pointer-y': `${pointerPos.y}%`,
      transform: isActive ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` : 'none',
      transition: isActive ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out',
    } as CSSProperties
  }, [isSupported, pointerPos.x, pointerPos.y, isActive, rotateX, rotateY])

  const handlers = isSupported ? (platformIsWeb ? {
    onMouseMove: handleMouseMove,
    onMouseLeave: handlePointerLeave,
  } : {
    onTouchMove: handleTouchMove,
    onTouchEnd: handlePointerLeave,
  }) : {}

  return {
    cardRef,
    style,
    handlers,
    isActive,
    isSupported
  }
}
