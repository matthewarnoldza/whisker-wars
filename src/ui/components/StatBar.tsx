import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface StatBarProps {
  current: number;
  max: number;
  label?: string;
  showNumbers?: boolean;
  type?: 'hp' | 'xp' | 'energy';
  animated?: boolean;
}

export default function StatBar({
  current,
  max,
  label,
  showNumbers = true,
  type = 'hp',
  animated = true,
}: StatBarProps) {
  const [displayValue, setDisplayValue] = useState(current);
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  useEffect(() => {
    if (animated) {
      // Animate the value change
      const duration = 300;
      const steps = 20;
      const stepValue = (current - displayValue) / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayValue(current);
          clearInterval(interval);
        } else {
          setDisplayValue((prev) => prev + stepValue);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    } else {
      setDisplayValue(current);
    }
  }, [current, animated]);

  const barColors = {
    hp: {
      bg: 'bg-slate-900/50',
      fill: percentage > 50 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : percentage > 20 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-red-400',
      glow: percentage > 50 ? 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' : percentage > 20 ? 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    },
    xp: {
      bg: 'bg-slate-900/50',
      fill: 'bg-gradient-to-r from-blue-500 to-cyan-400',
      glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    },
    energy: {
      bg: 'bg-slate-900/50',
      fill: 'bg-gradient-to-r from-purple-500 to-pink-400',
      glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]',
    },
  };

  const colors = barColors[type];

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1 bg-black/60 rounded px-2 py-0.5 backdrop-blur-sm">
          <span className="text-xs font-bold text-white tracking-wider font-heading">{label}</span>
          {showNumbers && (
            <span className="text-xs font-mono text-slate-200">
              {Math.round(displayValue)}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`relative h-3 rounded-full overflow-hidden ${colors.bg} border border-slate-700 shadow-inner`}>
        <motion.div
          className={`absolute left-0 top-0 bottom-0 rounded-full ${colors.fill} ${colors.glow}`}
          initial={{ width: '0%' }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animated ? 0.5 : 0,
            ease: 'easeOut',
          }}
        />
        {/* Shine effect */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
