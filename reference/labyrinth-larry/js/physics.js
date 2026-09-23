import { T, STEP } from './world.js';

export const G = 26;           // gravity, world units / s^2
export const FATAL_FALL = 4.6; // falling further than this breaks Larry
const ROLL = 5 / 7;            // a rolling sphere feels 5/7 of the slope pull
const SNAP = 0.35;             // ground this close below stays "attached"

// A ball rolling on the World's height grid. `y` is the contact point (the
// bottom of the ball); the sphere's centre sits at y + r.
export class Body {
  constructor(r) {
    this.r = r;
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.grounded = false;
    this.peakY = 0;
    this.support = null; // cell under the centre while grounded
    this.accel = 22; this.airControl = 0.35; this.friction = 0.55; this.maxSpeed = 17;
  }

  place(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    this.vx = this.vy = this.vz = 0;
    this.grounded = true; this.peakY = y; this.support = null;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  // One simulation step. (ix, iz) is the steering direction scaled 0..1.
  // Returns events for sound, effects and death handling.
  step(world, dt, ix, iz) {
    const ev = { wallHit: 0, landed: -1, abyss: false, prevX: this.x, prevZ: this.z };
    if (this.grounded) {
      const c = world.cellAtXZ(this.x, this.z);
      let ax = ix * this.accel, az = iz * this.accel;
      if (c) {
        const k = G * ROLL / (1 + c.sx * c.sx + c.sz * c.sz);
        ax -= c.sx * k; az -= c.sz * k;
      }
      this.vx += ax * dt; this.vz += az * dt;
      const f = Math.exp(-this.friction * dt);
      this.vx *= f; this.vz *= f;
    } else {
      this.vx += ix * this.accel * this.airControl * dt;
      this.vz += iz * this.accel * this.airControl * dt;
      this.vy -= G * dt;
    }
    const sp = this.speed;
    if (sp > this.maxSpeed) { this.vx *= this.maxSpeed / sp; this.vz *= this.maxSpeed / sp; }

    this.x += this.vx * dt; this.z += this.vz * dt;
    if (!this.grounded) this.y += this.vy * dt;

    ev.wallHit = this._walls(world);

    const c = world.cellAtXZ(this.x, this.z);
    const g = c ? world.planeAt(c, this.x, this.z) : null;
    if (this.grounded) {
      if (g === null || g < this.y - SNAP) {
        // rolled off an edge: keep the slope's vertical speed
        this.grounded = false;
        this.peakY = this.y;
      } else {
        this.y = g;
        this.vy = c.sx * this.vx + c.sz * this.vz;
        this.support = c;
      }
    } else {
      this.peakY = Math.max(this.peakY, this.y);
      if (g !== null && this.y <= g) {
        if (this.y >= g - 1.0) {
          ev.landed = this.peakY - g;
          const n = c.sx * this.vx + c.sz * this.vz; // slope's vertical speed
          if (this.vy < -9 && ev.landed < FATAL_FALL) {
            this.vy = -this.vy * 0.28; this.y = g; this.peakY = g; // a clanking bounce
          } else {
            this.grounded = true; this.y = g; this.vy = n; this.support = c;
          }
        } else {
          // tunnelled into a column's side: back out
          this.x = ev.prevX; this.z = ev.prevZ; this.vx *= -0.3; this.vz *= -0.3;
        }
      }
      if (this.y < world.abyssY) ev.abyss = true;
    }
    if (!this.grounded) this.support = null;
    return ev;
  }

  // Push the ball out of any neighbouring cell that rises above it.
  _walls(world) {
    let hit = 0;
    const ci = Math.floor(this.x / T), cj = Math.floor(this.z / T);
    const sup = this.grounded ? world.cellAtXZ(this.x, this.z) : null;
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
      if (i === ci && j === cj) continue;
      const c = world.cell(i, j);
      if (!c) continue;
      const x0 = i * T, z0 = j * T;
      const qx = Math.max(x0, Math.min(this.x, x0 + T)), qz = Math.max(z0, Math.min(this.z, z0 + T));
      let dx = this.x - qx, dz = this.z - qz;
      const d = Math.hypot(dx, dz);
      if (d >= this.r || d < 1e-6) continue;
      const top = world.planeAt(c, qx, qz);
      const ref = sup ? world.planeAt(sup, qx, qz) : this.y;
      if (top <= ref + STEP) continue;
      dx /= d; dz /= d;
      this.x = qx + dx * this.r; this.z = qz + dz * this.r;
      const vn = this.vx * dx + this.vz * dz;
      if (vn < 0) {
        this.vx -= 1.45 * vn * dx; this.vz -= 1.45 * vn * dz; // restitution 0.45
        hit = Math.max(hit, -vn);
      }
    }
    return hit;
  }
}

// Sphere-sphere bounce between two bodies (centres at y + r).
export function collideBodies(a, b, ma = 1, mb = 1) {
  const dx = b.x - a.x, dy = (b.y + b.r) - (a.y + a.r), dz = b.z - a.z;
  const d = Math.hypot(dx, dy, dz), min = a.r + b.r;
  if (d >= min || d < 1e-6) return 0;
  const nx = dx / d, nz = dz / d, h = Math.hypot(nx, nz) || 1;
  const hx = nx / h, hz = nz / h;
  const push = (min - d);
  const wa = mb / (ma + mb), wb = ma / (ma + mb);
  a.x -= hx * push * wa; a.z -= hz * push * wa;
  b.x += hx * push * wb; b.z += hz * push * wb;
  const rel = (b.vx - a.vx) * hx + (b.vz - a.vz) * hz;
  if (rel >= 0) return 0;
  const j = -(1 + 0.9) * rel / (1 / ma + 1 / mb);
  a.vx -= j * hx / ma; a.vz -= j * hz / ma;
  b.vx += j * hx / mb; b.vz += j * hz / mb;
  return -rel;
}
