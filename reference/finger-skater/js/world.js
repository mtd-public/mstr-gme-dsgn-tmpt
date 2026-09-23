import * as THREE from 'three';
import { bakeStatic, spawn } from './assets.js';
import { mulberry32, pick } from './utils.js';

// Endless street built from gig-ambulance's 16 m tiles, generated in segments
// along -Z (the skater always rolls "north"). Each segment is one tile deep:
//
//   x: -32 lawn/trees | -16 house lot | 0 road tile | +16 house lot | +32 lawn/trees
//
// The road tile has a 12 m carriageway (lanes at x = ±1.5, ±4.5; right-hand
// traffic, so northbound on +x) and 2 m raised pavements; the skater may also
// roll onto the front lawns up to X_LIMIT. Every few segments there's a
// crossroads with cross traffic.
export const SEG = 16;
export const PAVE_H = 0.18;
const ROAD_HALF = 6;
export const X_LIMIT = 11.5;
const LANE_N = [1.5, 4.5]; // northbound lanes (same direction as the skater)
const LANE_S = [-1.5, -4.5]; // oncoming lanes
// prop_ramp (3 m wide, 3.6 m long, 1.1 m tall, rising toward its local -Z),
// scaled into three sizes. Launch speed off the lip = lift[0] + speed * lift[1];
// gap = how far past the ramp the thing worth jumping sits.
export const RAMP_TYPES = {
  kicker: { sx: 1, sy: 0.55, sz: 0.75, lift: [6, 0.15], gap: 3.5, weight: 0.4 },
  ramp: { sx: 1, sy: 1, sz: 1, lift: [4, 0.4], gap: 4.5, weight: 0.4 },
  mega: { sx: 1.15, sy: 1.7, sz: 1.45, lift: [8, 0.5], gap: 7, weight: 0.2 },
};

// Grind rails: prop_guard_rail pieces (4 m, tube top at 1.01 m) chained along Z.
const RAIL_PIECE = 4;
export const RAIL_H = 1.01;
const RAIL_CATCH = 0.6; // how far off the rail line (x) a landing still locks on

const HOUSES = ['bld_house_lilac', 'bld_house_peach', 'bld_house_lilac', 'bld_house_peach', 'bld_apartment',
  'bld_cafe', 'bld_pharmacy', 'bld_pizzeria', 'bld_office'];
const CARS = ['veh_car_pink', 'veh_car_blue', 'veh_taxi', 'veh_pickup'];
const WALKERS = ['char_pedestrian', 'char_patient_granny', 'char_doctor', 'char_patient_bandage'];
const PICKUPS = ['pu_coin', 'pu_heart', 'pu_star'];

// Collision specs. Circles use r, rects hx/hz (for yaw 0). h is the height the
// skater's feet must be above to clear it; jump = clearable with a plain ollie.
const SPECS = {
  prop_cone: { r: 0.32, h: 0.85, jump: true, knock: true },
  prop_bin: { r: 0.4, h: 1.0, jump: true, knock: true },
  prop_hydrant: { r: 0.3, h: 0.95, jump: true, knock: true },
  prop_barrier: { hx: 1.05, hz: 0.3, h: 1.15, jump: true, knock: true },
  prop_bench: { hx: 0.8, hz: 0.28, h: 0.85, jump: true, knock: true },
  prop_bush: { r: 0.6, h: 0.7, jump: true },
  prop_lamp_post: { r: 0.22, h: 3.5 },
  prop_guard_rail: { hx: 2, hz: 0.3, h: 1.01, jump: true }, // grind rail (see _rail)
  prop_tree_pine: { r: 0.55, h: 3.5 },
  prop_tree_round: { r: 0.5, h: 2.9 },
  veh_car_pink: { hx: 0.95, hz: 1.5, h: 1.7, car: true },
  veh_car_blue: { hx: 0.95, hz: 1.5, h: 1.7, car: true },
  veh_taxi: { hx: 0.95, hz: 1.5, h: 1.95, car: true },
  veh_pickup: { hx: 1.1, hz: 1.9, h: 1.95, car: true },
  veh_bus: { hx: 1.2, hz: 3.3, h: 2.8, car: true },
  char_pedestrian: { r: 0.35, h: 1.2, jump: true, walker: true },
  char_patient_granny: { r: 0.35, h: 1.2, jump: true, walker: true },
  char_doctor: { r: 0.35, h: 1.2, jump: true, walker: true },
  char_patient_bandage: { r: 0.35, h: 1.2, jump: true, walker: true },
};

export const WORLD_ASSETS = [...new Set(['prop_guard_rail', 'road_straight', 'road_cross', 'lot_grass', 'prop_ramp', 'prop_tree_pine',
  'prop_tree_round', 'prop_bush', ...HOUSES, ...CARS, 'veh_bus', ...WALKERS, ...PICKUPS, ...Object.keys(SPECS)])];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.segments = new Map();
    this.entities = [];
    this.ramps = [];
    this.rails = [];
    this.crossings = [];
  }

  reset(seed = (Math.random() * 1e9) | 0) {
    for (const s of this.segments.values()) { this.scene.remove(s.decor); disposeBaked(s.decor); }
    for (const e of this.entities) this.scene.remove(e.obj);
    this.segments.clear();
    this.entities = [];
    this.ramps = [];
    this.rails = [];
    this.crossings = [];
    this.rng = mulberry32(seed);
    this.lastCross = 0;
    this.lastRamp = 0;
    this.railSpan = null;
    this.front = -4; // next segment index to build
    this.back = -4;
  }

  // ---------- generation ----------

  _ensure(pz) {
    const cur = Math.floor(-pz / SEG + 0.5);
    while (this.front <= cur + 8) this._build(this.front++);
    while (this.back < cur - 3) {
      const s = this.segments.get(this.back);
      if (s) { this.scene.remove(s.decor); disposeBaked(s.decor); this.segments.delete(this.back); }
      this.back++;
    }
    this.ramps = this.ramps.filter((r) => r.z < pz + 30);
    this.rails = this.rails.filter((r) => r.z1 < pz + 30);
    this.crossings = this.crossings.filter((c) => c.z < pz + 40);
  }

  _build(i) {
    const rng = this.rng;
    const zc = -i * SEG;
    const cross = i > 8 && i - this.lastCross >= 6 && rng() < 0.4;
    if (cross) this.lastCross = i;
    const decor = new THREE.Group();
    const add = (name, x, z, yaw = 0, s = 1, y = 0) => {
      const o = spawn(name);
      o.position.set(x, y, z);
      o.rotation.y = yaw;
      if (s !== 1) o.scale.setScalar(s);
      decor.add(o);
      return o;
    };

    if (cross) {
      add('road_cross', 0, zc);
      for (const x of [-48, -32, -16, 16, 32, 48]) add('road_straight', x, zc, Math.PI / 2);
      this.crossings.push({ z: zc, timer: [0.5, 1.6, 1.1, 2.2] });
    } else {
      add('road_straight', 0, zc);
      for (const side of [-1, 1]) {
        const yaw = side < 0 ? Math.PI / 2 : -Math.PI / 2; // lots face the road
        if (rng() < 0.85) add(pick(HOUSES, rng), side * 16, zc, yaw);
        else {
          add('lot_grass', side * 16, zc, yaw);
          for (let k = 0; k < 3; k++) {
            add(rng() < 0.6 ? 'prop_tree_pine' : 'prop_tree_round', side * (14 + rng() * 6), zc + (rng() - 0.5) * 12,
              rng() * 6, 0.8 + rng() * 0.5, PAVE_H);
          }
        }
        add('lot_grass', side * 32, zc, yaw);
        add('lot_grass', side * 48, zc, yaw);
        for (let k = 0; k < 4; k++) {
          add(rng() < 0.7 ? 'prop_tree_pine' : 'prop_tree_round', side * (26 + rng() * 26), zc + (rng() - 0.5) * 14,
            rng() * 6, 0.9 + rng() * 0.6, PAVE_H);
        }
        // Hedge marking the edge of the rideable lawn.
        for (const dz of [-6, 6]) add('prop_bush', side * 12.6, zc + dz + (rng() - 0.5) * 2, rng() * 6, 1, PAVE_H);
      }
    }
    const baked = bakeStatic(decor);
    this.scene.add(baked);
    this.segments.set(i, { i, zc, cross, decor: baked });

    if (i < 2) return; // a quiet start
    if (cross) { this._coinLine(pick([-3, 0, 3], rng), zc + 6, 4); return; }
    this._populate(i, zc);
  }

  _populate(i, zc) {
    const rng = this.rng;
    const d = Math.min(1, i / 90); // difficulty ramps up over ~1.4 km
    // Grind rail on a pavement (kept clear of furniture) or down the centre line.
    // A rail can run on into the next segment, so remember its span.
    const span = this.railSpan;
    const railBusy = span && span.z1 < zc + SEG / 2;
    if (!railBusy && i > 3 && i - this.lastRamp >= 2 && rng() < 0.3) {
      const side = pick([-1, 1, 0], rng);
      const rail = this._rail(side * 6.9, zc + 6, 2 + Math.floor(rng() * 3));
      this.railSpan = { side, z1: rail.z1 };
    }
    const cur = this.railSpan && this.railSpan.z1 < zc + SEG / 2 ? this.railSpan.side : null;
    const sides = [-1, 1].filter((sd) => sd !== cur);
    // Street furniture on the pavements.
    if (i % 2 === 0) for (const sd of sides) this._prop('prop_lamp_post', sd * 7.45, zc + 5, 0, PAVE_H);
    if (rng() < 0.45) this._prop(pick(['prop_hydrant', 'prop_bin'], rng), pick(sides, rng) * 7.1, zc - 3 + rng() * 4, rng() * 6, PAVE_H);
    if (rng() < 0.25) this._prop('prop_bench', pick(sides, rng) * 7.3, zc - 1, Math.PI / 2, PAVE_H);
    if (rng() < 0.2 + d * 0.3) this._walker(pick(sides, rng) * (6.9 + rng() * 0.6), zc + (rng() - 0.5) * 10);
    if (cur === 0) return; // centre rail: keep the lanes clear
    if (rng() < 0.2) this._prop('prop_bush', pick([-1, 1], rng) * (9.5 + rng() * 1.5), zc + (rng() - 0.5) * 10, rng() * 6, PAVE_H);

    // Main pattern for the carriageway.
    const r = rng();
    const rampOk = i - this.lastRamp >= 3 && this.front > 4;
    if (rampOk && r < 0.22 + d * 0.08) { this._rampSet(zc); this.lastRamp = i; return; }
    const z = zc + (rng() - 0.5) * 8;
    if (r < 0.4) this._cones(pick([...LANE_N, ...LANE_S], rng), z);
    else if (r < 0.55) this._roadworks(pick([...LANE_N, ...LANE_S], rng), z);
    else if (r < 0.72) this._car(pick([-1, 1], rng) * 4.8, z, 0, rng() < 0.5 ? 0 : Math.PI); // parked at the kerb
    else if (r < 0.85) this._coinLine(pick([-4.5, -1.5, 1.5, 4.5, -7, 7], rng), z + 6, 5);
    // Moving traffic, busier as you go.
    if (rng() < 0.35 + d * 0.45) {
      if (rng() < 0.55) this._car(pick(LANE_S, rng), zc - 4, 7 + rng() * 3 + d * 4); // oncoming (+Z)
      else this._car(pick(LANE_N, rng), zc - 4, -(3 + rng() * 3), null, rng() < 0.15 ? 'veh_bus' : null);
    }
    if (rng() < 0.06) this._pickup(rng() < 0.6 ? 'pu_heart' : 'pu_star', pick([-3, 0, 3, -7, 7], rng), zc + 4);
  }

  _prop(name, x, z, yaw = 0, y = 0) {
    const spec = SPECS[name];
    const obj = spawn(name);
    obj.position.set(x, y, z);
    obj.rotation.y = yaw;
    this.scene.add(obj);
    const quarter = Math.abs(Math.round(yaw / (Math.PI / 2))) % 2 === 1;
    const e = { name, obj, x, z, y, yaw, ...spec, vx: 0, vz: 0 };
    if (spec.hx && quarter) { e.hx = spec.hz; e.hz = spec.hx; }
    e.h += y;
    this.entities.push(e);
    return e;
  }

  _car(x, z, speed, yaw = null, model = null) {
    const name = model || pick(CARS, this.rng);
    const heading = yaw ?? (speed > 0 ? 0 : Math.PI); // +Z faces 0, -Z faces PI
    const e = this._prop(name, x, z, heading);
    e.vz = speed;
    e.wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].map((n) => e.obj.getObjectByName(n)).filter(Boolean);
    e.moving = speed !== 0;
    return e;
  }

  _crossCar(z, dir) {
    const name = pick(CARS, this.rng);
    const e = this._prop(name, -dir * 44, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    e.vx = dir * (9 + this.rng() * 3);
    e.wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].map((n) => e.obj.getObjectByName(n)).filter(Boolean);
    e.moving = true;
    e.crossing = true;
  }

  _walker(x, z) {
    const e = this._prop(pick(WALKERS, this.rng), x, z, 0, PAVE_H);
    e.vz = 1 + this.rng() * 0.6; // strolling toward the skater
    e.phase = this.rng() * 6;
  }

  // n pieces starting at z0 (the +Z end the skater meets first) running toward -Z.
  _rail(x, z0, n) {
    const y = Math.abs(x) > ROAD_HALF ? PAVE_H : 0;
    const len = n * RAIL_PIECE;
    const rail = { x, z0, z1: z0 - len, h: RAIL_H + y };
    for (let k = 0; k < n; k++) {
      const e = this._prop('prop_guard_rail', x, z0 - RAIL_PIECE * (k + 0.5), Math.PI / 2, y);
      // Solid when you roll into it on the ground; the grind itself is handled by the skater.
      Object.assign(e, { hx: 0.3, hz: RAIL_PIECE / 2, h: rail.h, jump: true, knock: false, railRef: rail });
    }
    this.rails.push(rail);
    for (let k = 0; k < n; k++) this._pickup('pu_coin', x, z0 - 2 - k * RAIL_PIECE, rail.h + 0.9);
    return rail;
  }

  // A rail the skater at (x, z) is lined up with, if any.
  railAt(x, z) {
    for (const r of this.rails) if (Math.abs(x - r.x) < RAIL_CATCH && z <= r.z0 && z >= r.z1) return r;
    return null;
  }

  _cones(lane, z) {
    const n = 2 + Math.floor(this.rng() * 2);
    for (let k = 0; k < n; k++) this._prop('prop_cone', lane + (k - (n - 1) / 2) * 1.1, z, this.rng() * 6);
  }

  _roadworks(lane, z) {
    this._prop('prop_barrier', lane, z, 0);
    this._prop('prop_cone', lane - 1.5, z + 1.6, 0);
    this._prop('prop_cone', lane + 1.5, z + 1.6, 0);
  }

  _coinLine(x, z, n) {
    for (let k = 0; k < n; k++) this._pickup('pu_coin', x, z - k * 2.2);
  }

  _pickup(name, x, z, y = 0.9) {
    const obj = spawn(name);
    obj.scale.setScalar(name === 'pu_coin' ? 0.9 : 0.7);
    obj.position.set(x, y, z);
    this.scene.add(obj);
    this.entities.push({ name, obj, x, z, y, pickup: true, r: 0.7, vx: 0, vz: 0, phase: z });
  }

  // A ramp in a lane with something worth jumping a little further on, and a
  // coin arc over the gap.
  _rampSet(zc) {
    const rng = this.rng;
    let k = rng(), type = 'ramp';
    for (const [name, rt] of Object.entries(RAMP_TYPES)) { if ((k -= rt.weight) < 0) { type = name; break; } }
    const rt = RAMP_TYPES[type];
    const x = pick([-4.5, -1.5, 1.5, 4.5], rng);
    const rz = zc + 6;
    const obj = spawn('prop_ramp');
    obj.scale.set(rt.sx, rt.sy, rt.sz);
    obj.position.set(x, 0, rz);
    this.scene.add(obj);
    const ramp = { x, z: rz, obj, type, half: 1.5 * rt.sx, len: 3.6 * rt.sz, h: 1.1 * rt.sy, lift: rt.lift };
    this.ramps.push(ramp);
    this.entities.push({ name: 'prop_ramp', obj, x, z: rz, y: 0, ramp: true, vx: 0, vz: 0 });
    const tz = rz - ramp.len / 2 - rt.gap;
    const r = rng();
    if (type === 'kicker') this._cones(x, tz);
    else if (r < 0.5) this._car(x, tz, 0, Math.PI / 2); // parked sideways: CAR HOP
    else if (r < 0.75 || type === 'ramp') { this._prop('prop_barrier', x, tz); this._prop('prop_barrier', x, tz - 1.2); }
    else { this._car(x, tz + 1.2, 0, Math.PI / 2); this._car(x, tz - 1.4, 0, Math.PI / 2); } // two cars for the mega
    const span = rt.gap * 1.6, peak = ramp.h + 0.8 + rt.gap * 0.18;
    for (let n = 0; n < 5; n++) {
      const t = n / 4;
      this._pickup('pu_coin', x, rz - ramp.len / 2 - 1 - t * span, 0.9 + peak * Math.sin(t * Math.PI) + ramp.h * (1 - t));
    }
  }

  // ---------- queries ----------

  // Ground height under (x, z) and the ramp there, if any.
  groundAt(x, z) {
    for (const r of this.ramps) {
      const lz = z - r.z;
      if (Math.abs(x - r.x) < r.half && lz > -r.len / 2 && lz < r.len / 2) {
        return { h: r.h * (r.len / 2 - lz) / r.len, ramp: r };
      }
    }
    for (const c of this.crossings) if (Math.abs(z - c.z) < ROAD_HALF) return { h: 0, ramp: null };
    return { h: Math.abs(x) > ROAD_HALF ? PAVE_H : 0, ramp: null };
  }

  // ---------- simulation ----------

  update(dt, t, player, events) {
    this._ensure(player.z);
    // Cross traffic spawns while the crossing is near.
    for (const c of this.crossings) {
      const dz = c.z - player.z;
      if (dz > 8 || dz < -80) continue;
      const lanes = [[c.z + 1.5, 1], [c.z + 4.5, 1], [c.z - 1.5, -1], [c.z - 4.5, -1]];
      lanes.forEach(([z, dir], k) => {
        if ((c.timer[k] -= dt) > 0) return;
        c.timer[k] = 2.6 + this.rng() * 3.5;
        this._crossCar(z, dir);
      });
    }

    const keep = [];
    for (const e of this.entities) {
      if (e.flying) this._fly(e, dt);
      else if (e.moving) {
        e.x += e.vx * dt; e.z += e.vz * dt;
        const v = Math.hypot(e.vx, e.vz);
        for (const w of e.wheels) w.rotation.x += (v * dt) / 0.4;
      } else if (e.walker && !e.down) {
        e.z += e.vz * dt;
        e.phase += dt * 9;
        e.obj.position.y = e.y + Math.abs(Math.sin(e.phase)) * 0.08;
        e.obj.rotation.z = Math.sin(e.phase) * 0.06;
      } else if (e.pickup) {
        e.obj.rotation.y = t * 3 + e.phase;
        e.obj.position.y = e.y + Math.sin(t * 4 + e.phase) * 0.12;
      }
      if (e.down && e.downT < 1) { e.downT = Math.min(1, e.downT + dt * 4); e.obj.rotation.x = e.downT * Math.PI / 2; }
      e.obj.position.x = e.x; e.obj.position.z = e.z;
      if (!e.flying && !e.walker && !e.pickup) e.obj.position.y = e.y;

      const behind = e.z - player.z;
      const gone = behind > 30 || behind < -260 || Math.abs(e.x) > 60 || e.dead;
      if (gone) this.scene.remove(e.obj);
      else keep.push(e);
    }
    this.entities = keep;
    this._collide(player, events);
  }

  _fly(e, dt) {
    e.fvy -= 22 * dt;
    e.x += e.vx * dt; e.z += e.vz * dt; e.y += e.fvy * dt;
    if (e.y < 0) { e.y = 0; e.fvy *= -0.35; e.vx *= 0.6; e.vz *= 0.6; e.spin *= 0.5; }
    e.obj.position.y = e.y;
    e.obj.rotation.x += e.spin * dt;
    e.obj.rotation.z += e.spin * 0.7 * dt;
    if ((e.flyT += dt) > 3) e.dead = true;
  }

  knock(e, player) {
    if (e.knock) {
      e.flying = true; e.flyT = 0; e.solid = false;
      e.vx = (e.x - player.x) * 3 + (Math.random() - 0.5) * 3;
      e.vz = -player.speed * 0.9;
      e.fvy = 6 + Math.random() * 3;
      e.spin = 8 + Math.random() * 8;
    } else if (e.walker) {
      e.down = true; e.downT = 0; e.vz = 0;
    }
    e.spent = true;
  }

  _collide(p, events) {
    if (p.bailed) return;
    const pr = p.radius;
    for (const e of this.entities) {
      if (e.flying || e.ramp || e.dead) continue;
      if (e.railRef && p.grind === e.railRef) { e.cleared = true; continue; }
      const dz = e.z - p.z;
      if (Math.abs(dz) > 5) continue;
      if (e.pickup) {
        const py = p.y + 0.8;
        if (Math.hypot(e.x - p.x, dz) < e.r + pr + 0.2 && Math.abs(e.obj.position.y - py) < 1.3) {
          e.dead = true;
          events.push({ type: 'pickup', kind: e.name, x: e.x, y: e.obj.position.y, z: e.z });
        }
        continue;
      }
      let gap; // distance between skater circle and obstacle outline (<0 = overlap)
      if (e.r !== undefined) gap = Math.hypot(e.x - p.x, dz) - e.r - pr;
      else {
        const qx = Math.max(Math.abs(p.x - e.x) - e.hx, 0), qz = Math.max(Math.abs(dz) - e.hz, 0);
        gap = Math.hypot(qx, qz) - pr;
      }
      if (gap < 0) {
        if (p.y >= e.h - 0.05 || e.down) {
          if (p.airborne && !e.cleared && !e.down && !e.railRef) {
            e.cleared = true;
            events.push({ type: 'clear', car: !!e.car, x: e.x, z: e.z, h: e.h });
          }
        } else if (!e.spent || e.car) {
          events.push({ type: 'hit', e, x: e.x, z: e.z });
        }
      } else if (e.moving && !e.nearMissed && !e.hitPlayer && gap < 0.9 && Math.abs(dz) < (e.hz ?? 1) + 0.5) {
        e.nearMissed = true;
        events.push({ type: 'nearMiss', x: e.x, z: e.z });
      }
    }
  }
}

function disposeBaked(group) {
  group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
}
