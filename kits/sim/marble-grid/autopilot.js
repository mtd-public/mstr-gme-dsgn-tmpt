// Headless course check, run in a browser page (see README): for each level,
// find a safe cell path from start to the hellmouth, then let an autopilot
// roll Larry along it with the real physics. Hazards are ignored; this checks
// geometry, ramps, walls and fall heights.
import { World, T, STEP } from '../js/world.js';
import { Body, FATAL_FALL } from '../js/physics.js';
import { LEVELS } from '../js/levels.js';

function edgeH(w, c, di, dj) {
  const x = (c.i + 0.5 + di * 0.5) * T, z = (c.j + 0.5 + dj * 0.5) * T;
  return w.planeAt(c, x, z);
}

export function findPath(w, def) {
  const key = (c) => c.j * w.W + c.i;
  const start = w.cell(def.start.i, def.start.j), goal = w.cell(def.goal.i, def.goal.j);
  const prev = new Map([[key(start), null]]), q = [start];
  while (q.length) {
    const c = q.shift();
    if (c === goal) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = w.cell(c.i + di, c.j + dj);
      if (!n || n.kind === 'lava' || prev.has(key(n))) continue;
      const a = edgeH(w, c, di, dj), b = edgeH(w, n, -di, -dj);
      if (b > a + STEP || a - b > FATAL_FALL - 0.3) continue;
      prev.set(key(n), c); q.push(n);
    }
  }
  if (!prev.has(key(goal))) return null;
  const path = []; for (let c = goal; c; c = prev.get(key(c))) path.unshift(c);
  return path;
}

export function autopilot(idx) {
  const def = LEVELS[idx](), w = new World(def);
  const path = findPath(w, def);
  if (!path) return { level: idx + 1, ok: false, why: 'no path' };
  const b = new Body(0.8), s = w.surfaceAt(def.start.i, def.start.j);
  b.place(s.x, s.y, s.z);
  let k = 1, t = 0, maxFall = 0;
  const dt = 1 / 240;
  while (t < 180) {
    const tgt = path[Math.min(k, path.length - 1)];
    const tx = (tgt.i + 0.5) * T, tz = (tgt.j + 0.5) * T;
    let dx = tx - b.x, dz = tz - b.z; const d = Math.hypot(dx, dz);
    if (d < 0.7 && k < path.length - 1) k++;
    // steer to the waypoint, braking against sideways drift
    let ax = dx / (d || 1) - b.vx * 0.12, az = dz / (d || 1) - b.vz * 0.12;
    const m = Math.hypot(ax, az); if (m > 1) { ax /= m; az /= m; }
    const ev = b.step(w, dt, ax, az);
    if (ev.landed > maxFall) maxFall = ev.landed;
    if (ev.landed > FATAL_FALL) return { level: idx + 1, ok: false, why: `fatal fall ${ev.landed.toFixed(1)} at ${b.x.toFixed(1)},${b.z.toFixed(1)}`, t };
    if (ev.abyss) return { level: idx + 1, ok: false, why: `fell into abyss near cell ${tgt.i},${tgt.j} (wp ${k}/${path.length})`, t };
    const g = w.surfaceAt(def.goal.i, def.goal.j);
    if (Math.hypot(g.x - b.x, g.z - b.z) < 1.5 && Math.abs(g.y - b.y) < 1) return { level: idx + 1, ok: true, t: +t.toFixed(1), cells: path.length, maxFall: +maxFall.toFixed(2), budget: def.time };
    t += dt;
  }
  return { level: idx + 1, ok: false, why: `timeout at wp ${k}/${path.length}` };
}
