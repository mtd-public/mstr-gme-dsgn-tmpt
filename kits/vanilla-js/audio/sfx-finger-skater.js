// Tiny WebAudio synth (adapted from gig-ambulance): no sample files. Unlocked
// by the first user gesture (start button), per browser autoplay rules.
export class Sfx {
  constructor() { this.ctx = null; this.roll = null; }

  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { this.ctx = null; }
    if (this.ctx) this._startRoll();
  }

  _tone(freq, dur, type = 'square', vol = 0.08, slide = 0, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur);
  }

  _noise(dur, vol, freq = 800) {
    const c = this.ctx;
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuf();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
  }

  _noiseBuf() {
    if (this._buf) return this._buf;
    const c = this.ctx, n = c.sampleRate;
    const b = c.createBuffer(1, n, n), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (this._buf = b);
  }

  // Wheels on asphalt: looped filtered noise, loudness follows speed.
  _startRoll() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuf(); src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
    this.roll = { g, f };
  }

  setRoll(speed, grounded) {
    if (!this.roll) return;
    const v = grounded ? Math.min(0.09, speed * 0.006) : 0;
    this.roll.g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    this.roll.f.frequency.setTargetAtTime(300 + speed * 25, this.ctx.currentTime, 0.1);
  }

  ollie(power) { this._noise(0.08, 0.25, 2200); this._tone(220 + power * 200, 0.18, 'triangle', 0.06, 300); }
  land() { this._noise(0.12, 0.3, 500); this._tone(90, 0.1, 'square', 0.05, -30); }
  coin() { this._tone(988, 0.07, 'square', 0.05); this._tone(1319, 0.12, 'square', 0.05, 0, 0.06); }
  power() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.1, 'triangle', 0.08, 0, i * 0.055)); }
  bonus() { [659, 784, 1047].forEach((f, i) => this._tone(f, 0.12, 'square', 0.05, 0, i * 0.06)); }
  hit() { this._noise(0.25, 0.4, 300); this._tone(160, 0.3, 'sawtooth', 0.1, -90); }
  bail() { this._noise(0.6, 0.5, 250); [392, 330, 262, 196].forEach((f, i) => this._tone(f, 0.22, 'sawtooth', 0.07, 0, i * 0.14)); }
  honk() { this._tone(415, 0.18, 'square', 0.04); this._tone(349, 0.18, 'square', 0.04); }
  // Metallic scrape while grinding.
  grind(on) {
    const c = this.ctx;
    if (!c) return;
    if (on && !this.scrape) {
      const src = c.createBufferSource();
      src.buffer = this._noiseBuf(); src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 6;
      const g = c.createGain(); g.gain.value = 0.12;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      this.scrape = { src, g };
    } else if (!on && this.scrape) {
      const { src, g } = this.scrape;
      g.gain.setTargetAtTime(0, c.currentTime, 0.03);
      src.stop(c.currentTime + 0.2);
      this.scrape = null;
    }
  }

  charged() { this._tone(1200, 0.06, 'triangle', 0.05); }
}
