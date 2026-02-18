import { ReactNode } from 'react'

interface JungleBackgroundProps {
  children?: ReactNode
  intensity?: 'low' | 'medium' | 'high'
  mode?: 'inline' | 'fullscreen'
}

const INTENSITY_CONFIG = {
  low: { particleCount: 4, speedMultiplier: 1.5 },
  medium: { particleCount: 6, speedMultiplier: 1 },
  high: { particleCount: 8, speedMultiplier: 0.7 },
}

export default function JungleBackground({ children, intensity = 'medium', mode = 'inline' }: JungleBackgroundProps) {
  const config = INTENSITY_CONFIG[intensity]
  const isFullscreen = mode === 'fullscreen'

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-0 overflow-hidden pointer-events-none' : 'relative w-full min-h-full overflow-hidden'}>
      {/* Inline keyframe styles */}
      <style>{`
        @keyframes jungle-drift-slow {
          0% { transform: translateX(0); }
          50% { transform: translateX(-30px); }
          100% { transform: translateX(0); }
        }
        @keyframes jungle-drift-mid {
          0% { transform: translateX(0); }
          50% { transform: translateX(-50px); }
          100% { transform: translateX(0); }
        }
        @keyframes jungle-mist-float {
          0% { transform: translate(0, 0) scale(1); opacity: 0.08; }
          33% { transform: translate(20px, -15px) scale(1.1); opacity: 0.12; }
          66% { transform: translate(-15px, 10px) scale(0.95); opacity: 0.06; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.08; }
        }
        @keyframes jungle-mist-float-alt {
          0% { transform: translate(0, 0) scale(1); opacity: 0.06; }
          33% { transform: translate(-25px, 10px) scale(1.05); opacity: 0.10; }
          66% { transform: translate(20px, -20px) scale(0.9); opacity: 0.05; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.06; }
        }
        @keyframes jungle-firefly {
          0% { transform: translate(0, 0); opacity: 0; }
          15% { opacity: 0.8; }
          50% { transform: translate(var(--fx, 15px), var(--fy, -20px)); opacity: 0.4; }
          85% { opacity: 0.9; }
          100% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes jungle-vine-sway {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(1.5deg); }
          75% { transform: rotate(-1.5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes jungle-twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Layer 0: Background image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/images/backgrounds/Jungle_Background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Layer 1: Sky - dark gradient overlay with twinkling dots */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(2,44,34,0.5) 40%, rgba(6,78,59,0.4) 100%)',
        }}
      >
        {/* Twinkling stars/fireflies in the sky */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-emerald-300"
            style={{
              width: i % 3 === 0 ? '2px' : '1px',
              height: i % 3 === 0 ? '2px' : '1px',
              left: `${(i * 8.3 + 2) % 100}%`,
              top: `${(i * 5.7 + 3) % 40}%`,
              animation: `jungle-twinkle ${3 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Layer 2: Far canopy - silhouetted trees, very slow drift */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.15,
          animation: `jungle-drift-slow ${60 * config.speedMultiplier}s ease-in-out infinite`,
        }}
      >
        <svg className="absolute bottom-0 w-[200%] h-2/3" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path
            d="M0,400 L0,200 Q50,120 100,180 Q150,80 200,160 Q250,60 300,140 Q350,100 400,170 Q450,50 500,150 Q550,80 600,130 Q650,40 700,160 Q750,90 800,120 Q850,50 900,170 Q950,100 1000,140 Q1050,60 1100,180 Q1150,100 1200,150 L1200,400 Z"
            fill="#022c22"
          />
        </svg>
      </div>

      {/* Layer 3: Mid canopy - closer tree silhouettes + vines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.25,
          animation: `jungle-drift-mid ${45 * config.speedMultiplier}s ease-in-out infinite`,
        }}
      >
        <svg className="absolute bottom-0 w-[200%] h-3/4" viewBox="0 0 1200 500" preserveAspectRatio="none">
          <path
            d="M0,500 L0,280 Q30,200 80,260 Q120,150 180,230 Q220,100 280,200 Q330,140 380,210 Q420,80 480,190 Q540,120 600,250 Q660,100 720,180 Q760,130 820,220 Q880,80 940,200 Q1000,140 1060,180 Q1100,100 1140,240 L1200,200 L1200,500 Z"
            fill="#064e3b"
          />
          {/* Hanging vines */}
          <path d="M150,100 Q155,180 145,260" stroke="#065f46" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M450,80 Q460,170 440,240" stroke="#065f46" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M780,120 Q785,200 775,280" stroke="#065f46" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M1050,90 Q1060,180 1040,250" stroke="#065f46" strokeWidth="2" fill="none" opacity="0.3" />
        </svg>
      </div>

      {/* Layer 4: Mist - two large blurred emerald circles */}
      <div
        className="absolute pointer-events-none rounded-full bg-emerald-700"
        style={{
          width: '500px',
          height: '300px',
          left: '10%',
          top: '30%',
          filter: 'blur(120px)',
          animation: `jungle-mist-float ${30 * config.speedMultiplier}s ease-in-out infinite`,
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full bg-emerald-800"
        style={{
          width: '400px',
          height: '250px',
          right: '5%',
          top: '50%',
          filter: 'blur(100px)',
          animation: `jungle-mist-float-alt ${35 * config.speedMultiplier}s ease-in-out infinite`,
        }}
      />

      {/* Layer 5: Firefly particles */}
      {Array.from({ length: config.particleCount }).map((_, i) => {
        const left = 10 + (i * 80) / config.particleCount + Math.sin(i) * 5
        const top = 20 + (i * 60) / config.particleCount
        const fx = (i % 2 === 0 ? 1 : -1) * (10 + (i * 7) % 20)
        const fy = (i % 3 === 0 ? -1 : 1) * (15 + (i * 5) % 15)
        return (
          <div
            key={`firefly-${i}`}
            className="absolute pointer-events-none rounded-full bg-emerald-400"
            style={{
              width: i % 3 === 0 ? '4px' : '3px',
              height: i % 3 === 0 ? '4px' : '3px',
              left: `${left}%`,
              top: `${top}%`,
              boxShadow: '0 0 6px 2px rgba(52, 211, 153, 0.6)',
              '--fx': `${fx}px`,
              '--fy': `${fy}px`,
              animation: `jungle-firefly ${(4 + (i % 3) * 2) * config.speedMultiplier}s ease-in-out ${i * 0.8}s infinite`,
            } as React.CSSProperties}
          />
        )
      })}

      {/* Layer 6: Foreground vines - left and right edge decorations */}
      <div
        className="absolute left-0 top-0 h-full w-16 pointer-events-none"
        style={{
          transformOrigin: 'top left',
          animation: `jungle-vine-sway ${8 * config.speedMultiplier}s ease-in-out infinite`,
        }}
      >
        <svg className="h-full w-full" viewBox="0 0 60 600" preserveAspectRatio="none">
          <path d="M0,0 Q20,50 10,100 Q0,150 15,200 Q25,250 5,300 Q0,350 20,400 Q30,450 10,500 Q0,550 15,600" stroke="#047857" strokeWidth="3" fill="none" opacity="0.3" />
          <path d="M5,0 Q30,80 15,150 Q5,220 25,300 Q35,380 10,450 Q0,520 20,600" stroke="#065f46" strokeWidth="2" fill="none" opacity="0.2" />
          {/* Leaves */}
          <ellipse cx="15" cy="100" rx="8" ry="4" fill="#047857" opacity="0.2" transform="rotate(30 15 100)" />
          <ellipse cx="20" cy="250" rx="10" ry="5" fill="#047857" opacity="0.15" transform="rotate(-20 20 250)" />
          <ellipse cx="10" cy="400" rx="8" ry="4" fill="#065f46" opacity="0.2" transform="rotate(45 10 400)" />
        </svg>
      </div>
      <div
        className="absolute right-0 top-0 h-full w-16 pointer-events-none"
        style={{
          transformOrigin: 'top right',
          animation: `jungle-vine-sway ${9 * config.speedMultiplier}s ease-in-out 2s infinite`,
        }}
      >
        <svg className="h-full w-full" viewBox="0 0 60 600" preserveAspectRatio="none">
          <path d="M60,0 Q40,60 50,120 Q60,180 45,240 Q35,300 55,360 Q60,420 40,480 Q30,540 50,600" stroke="#047857" strokeWidth="3" fill="none" opacity="0.3" />
          <path d="M55,0 Q35,90 50,180 Q60,270 40,360 Q30,450 55,540 Q60,580 45,600" stroke="#065f46" strokeWidth="2" fill="none" opacity="0.2" />
          <ellipse cx="45" cy="120" rx="8" ry="4" fill="#047857" opacity="0.2" transform="rotate(-30 45 120)" />
          <ellipse cx="40" cy="300" rx="10" ry="5" fill="#047857" opacity="0.15" transform="rotate(20 40 300)" />
          <ellipse cx="50" cy="480" rx="8" ry="4" fill="#065f46" opacity="0.2" transform="rotate(-45 50 480)" />
        </svg>
      </div>

      {/* Layer 7: Vignette - radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Children content rendered on top (inline mode only) */}
      {!isFullscreen && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  )
}
