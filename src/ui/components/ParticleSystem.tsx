import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  velocity: number;
}

interface ParticleSystemProps {
  x: number;
  y: number;
  count?: number;
  colors?: string[];
  spread?: number;
  active?: boolean;
  duration?: number;
}

export default memo(function ParticleSystem({
  x,
  y,
  count = 20,
  colors = ['#00FF41', '#39FF14', '#00CC34'],
  spread = 100,
  active = false,
  duration = 1,
}: ParticleSystemProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  // Stabilize colors reference to prevent re-triggering on every render
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const prefersReducedMotion = useReducedMotion();
  // Particles are pure decoration and unbounded `count` from callers can spawn
  // hundreds of animated nodes; clamp to keep paint/composite cost bounded.
  const effectiveCount = Math.min(count, 40);

  useEffect(() => {
    if (active && !prefersReducedMotion) {
      const c = colorsRef.current;
      const newParticles: Particle[] = Array.from({ length: effectiveCount }, (_, i) => ({
        id: Date.now() + i,
        x,
        y,
        size: Math.random() * 6 + 2,
        color: c[Math.floor(Math.random() * c.length)],
        angle: (Math.PI * 2 * i) / effectiveCount + (Math.random() - 0.5) * 0.5,
        velocity: Math.random() * spread + spread / 2,
      }));
      setParticles(newParticles);

      const timeout = setTimeout(() => {
        setParticles([]);
      }, duration * 1000);

      return () => clearTimeout(timeout);
    }
  }, [active, x, y, effectiveCount, spread, duration, prefersReducedMotion]);

  // Particles are purely decorative flourish; skip entirely when the user
  // prefers reduced motion instead of trying to render a static fallback.
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              left: particle.x,
              top: particle.y,
              // Static glow set once (not part of `animate`) so it never
              // triggers a repaint — only transform/opacity are animated
              // below, which are cheap, GPU-composited properties.
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              willChange: 'transform, opacity',
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 0,
            }}
            animate={{
              x: Math.cos(particle.angle) * particle.velocity,
              y: Math.sin(particle.angle) * particle.velocity - 50,
              opacity: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});
