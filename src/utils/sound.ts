// Web Audio API synthesized sound effects
// No external files needed — all sounds are generated procedurally

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) {
  const ctx = getCtx()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, ctx.currentTime + delay)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration)
}

function playNoise(duration: number, volume = 0.1, delay = 0) {
  const ctx = getCtx()
  if (!ctx) return

  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start(ctx.currentTime + delay)
}

export const SFX = {
  diceRoll() {
    // Rapid clicking sounds
    for (let i = 0; i < 6; i++) {
      playTone(800 + Math.random() * 400, 0.05, 'square', 0.06, i * 0.06)
    }
  },

  attack() {
    // Percussive hit
    playNoise(0.12, 0.15)
    playTone(200, 0.15, 'sawtooth', 0.1)
  },

  criticalHit() {
    // Sharper, louder hit with high pitch
    playNoise(0.15, 0.2)
    playTone(400, 0.1, 'sawtooth', 0.15)
    playTone(800, 0.08, 'square', 0.1, 0.05)
  },

  heal() {
    // Ascending sparkle
    playTone(523, 0.15, 'sine', 0.12)
    playTone(659, 0.15, 'sine', 0.12, 0.1)
    playTone(784, 0.2, 'sine', 0.12, 0.2)
  },

  abilityTrigger() {
    // Whoosh with rising pitch
    playTone(300, 0.2, 'sawtooth', 0.08)
    playTone(600, 0.15, 'sine', 0.1, 0.1)
  },

  victory() {
    // Major chord arpeggio (C-E-G-C)
    playTone(523, 0.3, 'sine', 0.12)
    playTone(659, 0.3, 'sine', 0.12, 0.15)
    playTone(784, 0.3, 'sine', 0.12, 0.3)
    playTone(1047, 0.5, 'sine', 0.15, 0.45)
  },

  defeat() {
    // Descending minor tones
    playTone(400, 0.3, 'sine', 0.1)
    playTone(350, 0.3, 'sine', 0.1, 0.2)
    playTone(300, 0.4, 'sine', 0.1, 0.4)
    playTone(200, 0.6, 'sine', 0.08, 0.6)
  },

  coinEarned() {
    // Quick ascending ding
    playTone(1200, 0.1, 'sine', 0.1)
    playTone(1600, 0.15, 'sine', 0.1, 0.08)
  },

  equipDrop() {
    // Sparkle + chime
    playTone(880, 0.15, 'sine', 0.1)
    playTone(1100, 0.15, 'sine', 0.1, 0.1)
    playTone(1320, 0.2, 'sine', 0.12, 0.2)
  },

  buttonClick() {
    // Subtle click
    playTone(600, 0.04, 'square', 0.05)
  },

  catCaught() {
    // Happy jingle
    playTone(659, 0.12, 'sine', 0.1)
    playTone(784, 0.12, 'sine', 0.1, 0.1)
    playTone(1047, 0.2, 'sine', 0.12, 0.2)
  },
}

/** Play a sound effect only if sound is enabled */
export function playSound(name: keyof typeof SFX) {
  // Check if reduced motion preference is set
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  SFX[name]()
}
