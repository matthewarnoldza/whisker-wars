import { motion } from 'framer-motion'
import Modal from './Modal'
import { Button } from './ui'
import { CatIcon, SparkleIcon, SwordsIcon } from '../icons'
import { useGame } from '../../game/store'
import { trackTutorialSkipped } from '../../utils/analytics'

interface WelcomeTutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

// A short, warm welcome — not a five-slide lecture. One screen: the premise, a
// taste of what's ahead, and a single call to action that drops the player into
// the thing they should actually DO first (cast bait). The contextual coach-marks
// in BaitingArea (useFirstRunHints) teach the rest at the moment it matters.
//
// Contract is unchanged (same name/export/props) so the modal queue in App.tsx
// keeps scheduling it: onClose marks the tutorial complete + advances the queue.

const HIGHLIGHTS = [
  { Icon: CatIcon, label: 'Collect', copy: 'Lure 40+ warrior cats' },
  { Icon: SparkleIcon, label: 'Power up', copy: 'Merge, equip & ascend' },
  { Icon: SwordsIcon, label: 'Battle', copy: 'Rout the dog bosses' },
]

// Ids must match useFirstRunHints. "Skip the tour" retires them so a player who
// opts out of hand-holding never sees the coach-marks either.
const BAITING_HINT_IDS = ['bait-select', 'bait-cast']

export default function WelcomeTutorialModal({ isOpen, onClose }: WelcomeTutorialModalProps) {
  const setView = useGame(s => s.setView)
  const markHintSeen = useGame(s => s.markHintSeen)

  const handleStart = () => {
    setView('bait') // drop them straight onto the baiting screen
    onClose()
  }

  const handleSkip = () => {
    trackTutorialSkipped(0)
    BAITING_HINT_IDS.forEach(markHintSeen) // opted out → no coach-marks either
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="text-center">
        <motion.img
          src="/images/logos/Whisker_Wars_White_Logo_New.png"
          alt="Whisker Wars"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="mx-auto mb-5 h-24 w-auto drop-shadow-2xl"
        />

        <h2 className="mb-2 font-heading text-3xl font-black tracking-wide text-ink">
          Welcome, Cat Commander!
        </h2>
        <p className="mx-auto mb-6 max-w-sm leading-relaxed text-ink-muted">
          Lure legendary cats, sharpen their claws, and lead your clowder into
          battle against a pack of very bad dogs.
        </p>

        <div className="mb-7 grid grid-cols-3 gap-2">
          {HIGHLIGHTS.map(({ Icon, label, copy }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="rounded-card border border-surface-border bg-surface-raised/70 px-2 py-3"
            >
              <Icon className="mx-auto mb-1.5 text-2xl text-accent-300" />
              <div className="font-heading text-sm font-bold text-ink">{label}</div>
              <div className="mt-0.5 text-xs leading-tight text-ink-subtle">{copy}</div>
            </motion.div>
          ))}
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
          <SparkleIcon className="text-lg" />
          Cast your first bait
        </Button>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-3 text-sm font-semibold text-ink-subtle transition-colors hover:text-ink"
        >
          Skip the tour
        </button>
      </div>
    </Modal>
  )
}
