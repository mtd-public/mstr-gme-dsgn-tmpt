// Twin touch zones covering each half of the screen: touching down anywhere on the
// left steers (a virtual joystick appears under the thumb, wherever it lands), and
// anywhere on the right is the "hold": charge an ollie on the ground, release to
// jump; hold again in the air to grab the board, release before landing.
// Keyboard: ←/→ or A/D steer, Space (or ↑/W) is the hold.
// main.js decides what a hold means; this only reports presses, releases and the steer axis.
export class Input {
  constructor(joyZoneEl, joystickEl, jumpZoneEl, buttonEl) {
    this.enabled = false;
    this.joyAxis = 0; // -1..1, left/right deflection of the stick
    this.holdStart = 0; // performance.now() when the current hold began, 0 = not holding
    this.queue = []; // 'press' | 'release' | 'cancel', in order
    this.keys = new Set();

    const stick = joystickEl.querySelector('.joy-stick');
    const RADIUS = 38; // px of stick travel from centre
    const EDGE_MARGIN = 74; // keep the joystick graphic fully on screen
    let joyId = null;
    let center = { x: 0, y: 0 };

    const joyDrag = (e) => {
      if (e.pointerId !== joyId) return;
      const dx = e.clientX - center.x, dy = e.clientY - center.y;
      const dist = Math.min(RADIUS, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      const sx = Math.cos(ang) * dist, sy = Math.sin(ang) * dist;
      stick.style.transform = `translate(${sx}px, ${sy}px)`;
      this.joyAxis = sx / RADIUS;
    };
    const joyEnd = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null;
      this.joyAxis = 0;
      stick.style.transform = '';
      joystickEl.classList.remove('active');
    };
    joyZoneEl.addEventListener('pointerdown', (e) => {
      if (!this.enabled || joyId !== null) return;
      e.preventDefault();
      joyId = e.pointerId;
      // The joystick appears centred under wherever the thumb touches down, clamped
      // so its graphic never clips off the edge of the screen.
      center = {
        x: Math.min(Math.max(e.clientX, EDGE_MARGIN), innerWidth - EDGE_MARGIN),
        y: Math.min(Math.max(e.clientY, EDGE_MARGIN), innerHeight - EDGE_MARGIN),
      };
      joystickEl.style.left = `${center.x}px`;
      joystickEl.style.top = `${center.y}px`;
      joystickEl.classList.add('active');
      joyDrag(e);
      try { joyZoneEl.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
    });
    joyZoneEl.addEventListener('pointermove', joyDrag);
    joyZoneEl.addEventListener('pointerup', joyEnd);
    joyZoneEl.addEventListener('pointercancel', joyEnd);

    let btnId = null;
    jumpZoneEl.addEventListener('pointerdown', (e) => {
      if (!this.enabled || btnId !== null) return;
      e.preventDefault();
      btnId = e.pointerId;
      buttonEl.classList.add('pressed');
      this._press();
      try { jumpZoneEl.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
    });
    const btnUp = (e) => {
      if (e.pointerId !== btnId) return;
      btnId = null;
      buttonEl.classList.remove('pressed');
      if (!this._keyHeld()) this._release(e.type === 'pointerup' ? 'release' : 'cancel');
    };
    jumpZoneEl.addEventListener('pointerup', btnUp);
    jumpZoneEl.addEventListener('pointercancel', btnUp);

    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
      if (!this.enabled || e.repeat) return;
      this.keys.add(k);
      if (HOLD_KEYS.includes(k)) this._press();
    });
    addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (HOLD_KEYS.includes(k) && btnId === null && !this._keyHeld()) this._release('release');
    });
    addEventListener('blur', () => this.reset());

    this._resetTouch = () => {
      joyId = null;
      this.joyAxis = 0;
      stick.style.transform = '';
      joystickEl.classList.remove('active');
      btnId = null;
      buttonEl.classList.remove('pressed');
    };
  }

  _keyHeld() { return HOLD_KEYS.some((j) => this.keys.has(j)); }

  _press() {
    if (this.holdStart) return;
    this.holdStart = performance.now();
    this.queue.push('press');
  }

  _release(kind) {
    if (!this.holdStart) return;
    this.holdStart = 0;
    this.queue.push(kind);
  }

  get holding() { return this.holdStart !== 0; }

  // Keyboard steer axis (-1..1), added on top of the joystick.
  get keyAxis() {
    const k = this.keys;
    return ((k.has('arrowright') || k.has('d')) ? 1 : 0) - ((k.has('arrowleft') || k.has('a')) ? 1 : 0);
  }

  get speedAxis() {
    const k = this.keys;
    return (k.has('arrowdown') || k.has('s')) ? -1 : 0;
  }

  read() {
    const out = { events: this.queue.splice(0) };
    return out;
  }

  reset() {
    this.holdStart = 0;
    this.queue = [];
    this.keys.clear();
    this._resetTouch();
  }
}

const HOLD_KEYS = [' ', 'arrowup', 'w'];
