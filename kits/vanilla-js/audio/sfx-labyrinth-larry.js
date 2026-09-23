// WebAudio synth, no sample files. Unlocked by the first user gesture.
export class Sfx {
  constructor() { this.ctx = null; this.muted = false; }

  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    // one shared noise buffer
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this._startRumble();
    this._startDrone();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  _noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }

  // Iron cage grinding on stone: filtered noise whose level follows speed.
  _startRumble() {
    const c = this.ctx, n = this._noiseSrc(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0;
    n.connect(f).connect(g).connect(this.master); n.start();
    this.rumble = { f, g };
  }
  setRoll(speed, grounded) {
    if (!this.rumble) return;
    const t = this.ctx.currentTime, k = grounded ? Math.min(1, speed / 14) : 0;
    this.rumble.g.gain.setTargetAtTime(k * 0.22, t, 0.05);
    this.rumble.f.frequency.setTargetAtTime(180 + k * 700, t, 0.05);
  }

  // Low hellish drone with a slow beating pair.
  _startDrone() {
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.05;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    for (const fr of [55, 55.7, 82.4]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(lp); o.start();
    }
    lp.connect(g).connect(this.master);
  }

  _tone(freq, dur, type = 'square', vol = 0.08, slide = 0, when = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur);
  }
  _burst(dur, freq, q, vol, type = 'bandpass') {
    const c = this.ctx; if (!c) return;
    const n = this._noiseSrc(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(this.master); n.start(t); n.stop(t + dur);
  }

  clank(strength) {
    const v = Math.min(1, strength / 10);
    this._tone(180 + Math.random() * 60, 0.25, 'square', 0.05 * v + 0.02, -80);
    this._tone(1400 + Math.random() * 500, 0.12, 'triangle', 0.04 * v);
    this._burst(0.08, 2500, 2, 0.15 * v);
  }

  // A man screaming: a pitch-bent sawtooth through "AH" formants, with
  // vibrato, breath noise, and a random voice for each yell.
  scream(intensity = 1) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime, dur = 0.55 + Math.random() * 0.6;
    const base = 330 + Math.random() * 220;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.12);
    o.frequency.exponentialRampToValueAtTime(base * 0.7, t + dur);
    const vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 6 + Math.random() * 4; vg.gain.value = base * 0.035;
    vib.connect(vg).connect(o.frequency);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.16 * intensity, t + 0.04);
    out.gain.setValueAtTime(0.16 * intensity, t + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const vowel = Math.random() < 0.5 ? [800, 1150, 2900] : [700, 1800, 2600]; // "AH" / "AE"
    for (const [i, fr] of vowel.entries()) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 6;
      const g = c.createGain(); g.gain.value = [1.4, 0.8, 0.35][i];
      o.connect(bp).connect(g).connect(out);
    }
    const n = this._noiseSrc(), nf = c.createBiquadFilter(), ng = c.createGain();
    nf.type = 'bandpass'; nf.frequency.value = 1500; ng.gain.value = 0.25;
    n.connect(nf).connect(ng).connect(out);
    out.connect(this.master);
    o.start(t); vib.start(t); n.start(t);
    o.stop(t + dur); vib.stop(t + dur); n.stop(t + dur);
    return dur;
  }

  death() { this.scream(1.4); this._tone(90, 0.6, 'sawtooth', 0.12, -50); this._burst(0.5, 400, 0.7, 0.4, 'lowpass'); }
  sizzle() { this._burst(0.9, 3000, 0.5, 0.25, 'highpass'); }
  crumble() { this._burst(0.4, 900, 1, 0.25); this._tone(140, 0.3, 'triangle', 0.06, -60); }
  hook() { this._tone(900, 0.15, 'square', 0.05, 900); this._burst(0.15, 4000, 3, 0.2); }
  pickup() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.14, 'triangle', 0.08, 0, i * 0.06)); }
  checkpoint() { [392, 523, 784].forEach((f, i) => this._tone(f, 0.25, 'sine', 0.1, 0, i * 0.09)); }
  portal() {
    this._tone(80, 1.6, 'sawtooth', 0.12, 400);
    [262, 311, 392, 466, 523].forEach((f, i) => this._tone(f, 0.35, 'square', 0.05, 0, i * 0.12));
  }
  tick() { this._tone(1200, 0.05, 'square', 0.05); }
  orbHit() { this._tone(70, 0.3, 'sine', 0.2, -30); this._tone(300, 0.1, 'square', 0.05, -200); }
}
