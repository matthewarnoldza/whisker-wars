import { useGame } from '../../game/store'
import Modal from './Modal'
import { playSound, startMusic, stopMusic } from '../../utils/sound'
import pkg from '../../../package.json'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

// Accessible switch: role=switch, toggles on click / Space / Enter. Gold when on.
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
        checked ? 'bg-gold-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function VolumeSlider({
  value,
  onInput,
  onCommit,
  label,
  disabled,
}: {
  value: number
  onInput: (v: number) => void
  onCommit?: (v: number) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={e => onInput(Number(e.target.value))}
        onMouseUp={e => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={e => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={e => onCommit?.(Number((e.target as HTMLInputElement).value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-gold-500 disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <span className="w-10 shrink-0 text-right text-sm font-bold text-gold-200 tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

function Row({
  title,
  description,
  control,
}: {
  title: string
  description?: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">{title}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-black uppercase tracking-wider text-gold-400 mb-1 mt-2">
      {children}
    </h3>
  )
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const soundEnabled = useGame(s => s.soundEnabled)
  const musicEnabled = useGame(s => s.musicEnabled)
  const sfxVolume = useGame(s => s.sfxVolume)
  const musicVolume = useGame(s => s.musicVolume)
  const reducedMotion = useGame(s => s.reducedMotion)
  const colorblindMode = useGame(s => s.colorblindMode)

  const toggleSound = useGame(s => s.toggleSound)
  const toggleMusic = useGame(s => s.toggleMusic)
  const setSfxVolume = useGame(s => s.setSfxVolume)
  const setMusicVolume = useGame(s => s.setMusicVolume)
  const setReducedMotion = useGame(s => s.setReducedMotion)
  const setColorblindMode = useGame(s => s.setColorblindMode)

  const handleMusicToggle = () => {
    const next = !musicEnabled
    toggleMusic()
    if (next) startMusic()
    else stopMusic()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="sm">
      <div className="divide-y divide-slate-800">
        {/* AUDIO */}
        <div className="pb-2">
          <SectionHeading>Audio</SectionHeading>

          <Row
            title="Sound effects"
            description="Battle hits, coins, and UI clicks."
            control={
              <Switch checked={soundEnabled} onChange={toggleSound} label="Toggle sound effects" />
            }
          />
          <div className="pb-3">
            <VolumeSlider
              label="Sound effects volume"
              value={sfxVolume}
              disabled={!soundEnabled}
              // Live-update the store value while dragging (so the % readout tracks),
              // then play a preview click at the new level when the drag is released.
              onInput={setSfxVolume}
              onCommit={v => {
                if (soundEnabled && v > 0) playSound('buttonClick')
              }}
            />
          </div>

          <Row
            title="Music"
            description="Looping background theme."
            control={
              <Switch checked={musicEnabled} onChange={handleMusicToggle} label="Toggle music" />
            }
          />
          <div className="pb-2">
            <VolumeSlider
              label="Music volume"
              value={musicVolume}
              disabled={!musicEnabled}
              // Music volume applies to the live element immediately, so preview is live.
              onInput={setMusicVolume}
            />
          </div>
        </div>

        {/* ACCESSIBILITY */}
        <div className="pt-2">
          <SectionHeading>Accessibility</SectionHeading>

          <Row
            title="Reduced motion"
            description="Minimise animations and screen shake across the game."
            control={
              <Switch
                checked={reducedMotion}
                onChange={setReducedMotion}
                label="Toggle reduced motion"
              />
            }
          />
          <Row
            title="Colorblind-friendly rarity"
            description="Add text labels to rarity colours so they don't rely on hue alone."
            control={
              <Switch
                checked={colorblindMode}
                onChange={setColorblindMode}
                label="Toggle colorblind-friendly rarity labels"
              />
            }
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-center text-[11px] text-slate-500">
        Whisker Wars v{pkg.version}
      </div>
    </Modal>
  )
}
