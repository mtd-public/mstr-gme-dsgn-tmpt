// Floating virtual thumbstick, adapted from gig-ambulance: touch anywhere on
// the play area, drag toward where Larry should roll. Gives an *absolute
// screen direction* plus a 0..1 deflection; the game maps it onto the
// isometric ground via the camera. Pointer Events unify touch and mouse, with
// a keyboard fallback (WASD / arrows).
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.hasDirection = false;
    this.dirX = 0; this.dirY = 0; // unit screen direction (y down)
    this.magnitude = 0;

    this.stickActive = false;
    this.stickBaseX = 0; this.stickBaseY = 0;
    this.stickThumbX = 0; this.stickThumbY = 0;
    this.stickRadius = 70;

    this._stickId = null;
    this._keys = new Set();
    this.onKey = null; // (key) => void, for one-shot actions like pause
    this._bind();
  }

  _bind() {
    const el = this.canvas;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // A new touch always takes the stick over; the previous owner may have
      // vanished without a pointerup (system gesture, notification, app switch).
      this._stickId = e.pointerId;
      this.stickActive = true;
      this.hasDirection = false;
      this.magnitude = 0;
      this.stickBaseX = this.stickThumbX = e.clientX;
      this.stickBaseY = this.stickThumbY = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }, { passive: false });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._stickId) return;
      e.preventDefault();
      if (e.pointerType === 'mouse' && e.buttons === 0) { this.releaseStick(); return; }
      this._updateStick(e.clientX, e.clientY);
    }, { passive: false });
    const end = (e) => { if (e.pointerId === this._stickId) this.releaseStick(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this._keys.has(k) && this.onKey) this.onKey(k);
      this._keys.add(k);
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this._keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    window.addEventListener('pagehide', () => this.reset());
  }

  releaseStick() {
    this._stickId = null;
    this.stickActive = false;
    this.hasDirection = false;
    this.magnitude = 0;
  }

  reset() { this.releaseStick(); this._keys.clear(); }

  _updateStick(x, y) {
    let dx = x - this.stickBaseX, dy = y - this.stickBaseY;
    const d = Math.hypot(dx, dy);
    if (d > this.stickRadius) { // floating base follows the thumb past the rim
      const over = d - this.stickRadius;
      this.stickBaseX += (dx / d) * over;
      this.stickBaseY += (dy / d) * over;
      dx = x - this.stickBaseX; dy = y - this.stickBaseY;
    }
    this.stickThumbX = this.stickBaseX + dx;
    this.stickThumbY = this.stickBaseY + dy;
    const dd = Math.hypot(dx, dy);
    const dead = 8;
    if (dd > dead) {
      this.hasDirection = true;
      this.dirX = dx / dd; this.dirY = dy / dd;
      const k = Math.min(1, (dd - dead) / (this.stickRadius * 0.8 - dead));
      this.magnitude = k * k * (3 - 2 * k); // smoothstep: gentle near the centre
    } else {
      this.hasDirection = false;
      this.magnitude = 0;
    }
  }

  // Returns {x, y, mag} in screen space or null. Keyboard wins when pressed.
  read() {
    const k = this._keys;
    let x = 0, y = 0;
    if (k.has('arrowleft') || k.has('a')) x -= 1;
    if (k.has('arrowright') || k.has('d')) x += 1;
    if (k.has('arrowup') || k.has('w')) y -= 1;
    if (k.has('arrowdown') || k.has('s')) y += 1;
    if (x || y) {
      const n = Math.hypot(x, y);
      return { x: x / n, y: y / n, mag: 1 };
    }
    if (this.hasDirection) return { x: this.dirX, y: this.dirY, mag: this.magnitude };
    return null;
  }

  // Draw the stick on the 2D overlay canvas (ring + thumb, or a resting hint).
  draw(c, showHint) {
    if (this.stickActive) {
      c.beginPath();
      c.arc(this.stickBaseX, this.stickBaseY, this.stickRadius, 0, Math.PI * 2);
      c.fillStyle = 'rgba(40,6,4,0.35)'; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,120,50,0.55)'; c.stroke();
      c.beginPath();
      c.arc(this.stickThumbX, this.stickThumbY, 26, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,170,90,0.85)'; c.fill();
      c.strokeStyle = '#3a0804'; c.stroke();
    } else if (showHint) {
      c.beginPath();
      c.arc(90, innerHeight - 110, 44, 0, Math.PI * 2);
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,120,50,0.3)'; c.stroke();
      c.fillStyle = 'rgba(255,170,90,0.35)'; c.font = '600 12px system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText('DRAG TO ROLL', 90, innerHeight - 106);
    }
  }
}
