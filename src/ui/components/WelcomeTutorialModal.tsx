import { useState } from 'react'
import Modal from './Modal'
import { motion, AnimatePresence } from 'framer-motion'

interface WelcomeTutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

const slides = [
  {
    title: 'Welcome to Whisker Wars!',
    description: 'The ultimate feline combat card game where strategy meets adorable chaos.',
    icon: '⚔️',
    content: (
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <img
            src="/images/logos/Whisker Wars White.png"
            alt="Whisker Wars"
            className="h-32 w-auto mx-auto drop-shadow-2xl"
          />
        </motion.div>
        <p className="text-lg text-slate-300 leading-relaxed">
          Assemble your dream team of warrior cats, battle fierce dog bosses, and become the ultimate champion!
        </p>
      </div>
    ),
  },
  {
    title: 'Step 1: Buy Bait',
    description: 'Purchase magical bait to attract legendary cats to your cause',
    icon: '🎣',
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-blue-500/30">
          <div className="text-5xl">🐟</div>
          <div className="flex-1">
            <h4 className="font-bold text-white mb-1">Higher Tier = Rarer Cats</h4>
            <p className="text-sm text-slate-400">
              Tier 1 bait attracts common cats, while Tier 6 bait can summon mythical legends!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-purple-500/30">
          <div className="text-5xl">🪙</div>
          <div className="flex-1">
            <h4 className="font-bold text-white mb-1">Earn Coins from Battles</h4>
            <p className="text-sm text-slate-400">
              Victory rewards you with coins to buy better bait and expand your collection!
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Step 2: Get Cats & Build Your Team',
    description: 'Befriend cats and select your strongest warriors for battle',
    icon: '🐱',
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-gold-500/30">
          <div className="text-5xl">✨</div>
          <div className="flex-1">
            <h4 className="font-bold text-white mb-1">40 Unique Cats to Collect</h4>
            <p className="text-sm text-slate-400">
              From Common street cats to Mythical cosmic legends - each with unique abilities!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-green-500/30">
          <div className="text-5xl">⚡</div>
          <div className="flex-1">
            <h4 className="font-bold text-white mb-1">Select Up to 3 Cats</h4>
            <p className="text-sm text-slate-400">
              Choose your battle party wisely - each cat can level up and grow stronger!
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Step 3: Battle & Conquer',
    description: 'Face a range of challenging enemy dogs and bosses to earn legendary rewards',
    icon: '⚔️',
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-red-500/30">
          <div className="text-5xl">🎲</div>
          <div className="flex-1">
            <h4 className="font-bold text-white mb-1">Roll the D20 Dice</h4>
            <p className="text-sm text-slate-400">
              Each turn, roll to determine your attack power, then select which cat strikes!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-orange-500/30">
          <div className="text-5xl">🏆</div>
          <div className="flex-1">
            <h4 className="font-bold text-white mb-1">Defeat Enemy Dogs & Bosses</h4>
            <p className="text-sm text-slate-400">
              Each victory earns coins, XP, and unlocks achievements. Can you defeat them all?
            </p>
          </div>
        </div>
      </div>
    ),
  },
]

export default function WelcomeTutorialModal({ isOpen, onClose }: WelcomeTutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const slide = slides[currentSlide]

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} title="" size="md">
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-6xl mb-4 inline-block"
              >
                {slide.icon}
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2">
                {slide.title}
              </h2>
              <p className="text-slate-400 text-sm">{slide.description}</p>
            </div>

            {/* Content */}
            <div className="py-4">
              {slide.content}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-6 mb-4">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-gold-400 w-8'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-700">
          <motion.button
            onClick={handleSkip}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Skip Tutorial
          </motion.button>

          <div className="flex gap-3">
            {currentSlide > 0 && (
              <motion.button
                onClick={handlePrev}
                className="px-5 py-2.5 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Previous
              </motion.button>
            )}
            <motion.button
              onClick={handleNext}
              className={`px-5 py-2.5 font-bold rounded-lg shadow-lg transition-all ${
                currentSlide === slides.length - 1
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-slate-900 shadow-glow-gold'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {currentSlide === slides.length - 1 ? "Let's Play!" : 'Next'}
            </motion.button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
