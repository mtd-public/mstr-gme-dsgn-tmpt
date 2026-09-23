/**
 * Tiny WebAudio blips for the runtime's `sfx` events, trimmed from
 * kits/vanilla-js/audio/sfx-synth.js. No sample files; create the context in
 * a user gesture (`unlock()` from the Play button), ramp to 0.0001 never 0,
 * and rate-limit identical sounds so a burst of events doesn't distort.
 */
import type { GameEvent } from './runtime.ts'

type Name = Extract<GameEvent, { kind: 'sfx' }>['name']

export class Blips {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private last: Partial<Record<Name, number>> = {}
  muted = false

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    try {
      this.ctx = new AC()
    } catch {
      return
    }
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.7
    this.master.connect(this.ctx.destination)
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.07, slide = 0, delay = 0) {
    const c = this.ctx
    if (!c || !this.master) return
    const t = c.currentTime + delay
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  play(name: Name) {
    const c = this.ctx
    if (!c || this.muted) return
    if (c.currentTime - (this.last[name] ?? -1) < 0.04) return
    this.last[name] = c.currentTime
    switch (name) {
      case 'coin':
        this.tone(880, 0.08, 'square', 0.05)
        this.tone(1320, 0.1, 'square', 0.05, 0, 0.06)
        break
      case 'hit':
        this.tone(220, 0.16, 'sawtooth', 0.08, -120)
        break
      case 'defeat':
        this.tone(520, 0.2, 'triangle', 0.08, -380)
        break
      case 'door':
        this.tone(300, 0.12, 'triangle', 0.08, 200)
        break
      case 'bonk':
        this.tone(140, 0.08, 'square', 0.05)
        break
      case 'attack':
        this.tone(900, 0.07, 'sawtooth', 0.04, -600)
        break
      case 'death':
        this.tone(330, 0.5, 'sawtooth', 0.08, -270)
        break
      case 'clear':
        ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.08, 0, i * 0.08))
        break
      case 'achievement':
        ;[784, 988, 1175].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, 0, i * 0.07))
        break
    }
  }

  dispose() {
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }
}
