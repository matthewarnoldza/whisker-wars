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
  birdAttack: '/sounds/bird.mp3',
}

// Warm the browser HTTP cache by fetching every SFX once. Runs lazily on the
// first user interaction so nothing is fetched before a gesture.
let _warmed = false
function warmSounds() {
  if (_warmed) return
  _warmed = true
  for (const src of Object.values(SFX_FILES)) {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.load()
  }
}

// Trigger warm-up once, on the first pointer or keyboard interaction. Removing
// both listeners after the first fire gives us { once: true } semantics.
if (typeof window !== 'undefined') {
  const onFirstInteraction = () => {
    window.removeEventListener('pointerdown', onFirstInteraction)
    window.removeEventListener('keydown', onFirstInteraction)
    warmSounds()
  }
  window.addEventListener('pointerdown', onFirstInteraction)
  window.addEventListener('keydown', onFirstInteraction)
}

// Background music
let musicElement: HTMLAudioElement | null = null
let _isMusicPlaying = false

// Live volume levels (0..1). These are the single source of truth for playback
// volume; the store pushes user settings here via setSfxVolume/setMusicVolume so
// the values survive a save-load cycle. Defaults match the settings contract.
let _sfxVolume = 0.5
let _musicVolume = 0.2

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export type SoundName = keyof typeof SFX_FILES

/** Play a sound effect using a fresh Audio element (reliable across all browsers) */
export function playSound(name: SoundName) {
  const src = SFX_FILES[name]
  if (!src) return

  // Create a new Audio element each time — avoids cloneNode() issues in Chrome
  // where cloned elements don't have buffered data and silently fail to play.
  // The browser serves the file from its HTTP cache so there's no re-download.
  const audio = new Audio(src)
  audio.volume = _sfxVolume
  audio.play().catch(() => {/* autoplay policy — ignore */})
}

/** Start looping background music */
export function startMusic() {
  if (_isMusicPlaying) return

  if (!musicElement) {
    musicElement = new Audio('/sounds/theme.m4a')
    musicElement.loop = true
  }
  musicElement.volume = _musicVolume

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

/** Set SFX volume (0.0 to 1.0). Applies to every subsequently played sound. */
export function setSfxVolume(volume: number) {
  _sfxVolume = clamp01(volume)
}

/** Current SFX volume (0.0 to 1.0). */
export function getSfxVolume(): number {
  return _sfxVolume
}

/**
 * Set music volume (0.0 to 1.0). Applies to the live music element immediately
 * AND is remembered for any future music element created by startMusic().
 */
export function setMusicVolume(volume: number) {
  _musicVolume = clamp01(volume)
  if (musicElement) {
    musicElement.volume = _musicVolume
  }
}

/** Current music volume (0.0 to 1.0). */
export function getMusicVolume(): number {
  return _musicVolume
}

// Re-export SFX for type-safe access to sound names
export const SFX = Object.fromEntries(
  Object.keys(SFX_FILES).map(name => [name, () => playSound(name)])
) as Record<SoundName, () => void>
