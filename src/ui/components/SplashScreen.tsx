import { motion } from 'framer-motion'

interface SplashScreenProps {
  onClose: () => void
}

export default function SplashScreen({ onClose }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-cyber-black-500"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/backgrounds/WW Key Art.png"
          alt="Whisker Wars"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for better text visibility */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {/* Logo */}
          <motion.img
            src="/images/logos/Whisker_Wars_White_Logo_New.png"
            alt="Whisker Wars"
            className="h-32 sm:h-40 mx-auto mb-8 drop-shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8, type: 'spring' }}
          />

          {/* Tagline */}
          <motion.h1
            className="text-3xl sm:text-4xl font-black text-white mb-4 drop-shadow-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Elite Cat Combat Simulator
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-slate-200 mb-12 drop-shadow-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            Collect, Battle, and Dominate the Arena
          </motion.p>

          {/* Click to Play Button */}
          <motion.button
            onClick={onClose}
            className="px-12 py-4 bg-gradient-to-br from-matrix-400 to-matrix-600 text-cyber-black-500 font-black text-xl rounded-xl shadow-neon-intense hover:shadow-neon-mega transition-all duration-300 border-2 border-matrix-300"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center gap-3">
              <span>Click to Play</span>
              <span className="text-2xl">🎮</span>
            </span>
          </motion.button>

          {/* Subtle pulse effect on button */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
          >
            {/* Glow effect */}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
