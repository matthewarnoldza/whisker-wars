// Sound effects and background music using real audio files

const SFX_FILES: Record<string, string> = {
  diceRoll: '/sounds/dice.mp3',
  attack: '/sounds/attack.mp3',
  criticalHit: '/sounds/critical-hit.mp3',
  heal: '/sounds/heal.mp3',
  abilityTrigger: '/sounds/ability.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  coinEarned: '/sounds/coins.mp3',
  equipDrop: '/sounds/loot.mp3',
  buttonClick: '/sounds/click.mp3',
  catCaught: '/sounds/catch.mp3',
}

// Preload all SFX by fetching them once (warms the browser HTTP cache)
for (const src of Object.values(SFX_FILES)) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.load()
}

// Background music
let musicElement: HTMLAudioElement | null = null
let _isMusicPlaying = false

export type SoundName = keyof typeof SFX_FILES

/** Play a sound effect using a fresh Audio element (reliable across all browsers) */
export function playSound(name: SoundName) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const src = SFX_FILES[name]
  if (!src) return

  // Create a new Audio element each time — avoids cloneNode() issues in Chrome
  // where cloned elements don't have buffered data and silently fail to play.
  // The browser serves the file from its HTTP cache so there's no re-download.
  const audio = new Audio(src)
  audio.volume = 0.5
  audio.play().catch(() => {/* autoplay policy — ignore */})
}

/** Start looping background music */
export function startMusic() {
  if (_isMusicPlaying) return

  if (!musicElement) {
    musicElement = new Audio('/sounds/theme.mp3')
    musicElement.loop = true
    musicElement.volume = 0.2
  }

  musicElement.play().catch(() => {/* autoplay policy — ignore */})
  _isMusicPlaying = true
}

/** Stop background music */
export function stopMusic() {
  if (musicElement) {
    musicElement.pause()
    musicElement.currentTime = 0
  }
  _isMusicPlaying = false
}

/** Check if music is currently playing */
export function isMusicPlaying(): boolean {
  return _isMusicPlaying
}

/** Set music volume (0.0 to 1.0) */
export function setMusicVolume(volume: number) {
  if (musicElement) {
    musicElement.volume = Math.max(0, Math.min(1, volume))
  }
}

// Re-export SFX for type-safe access to sound names
export const SFX = Object.fromEntries(
  Object.keys(SFX_FILES).map(name => [name, () => playSound(name)])
) as Record<SoundName, () => void>
