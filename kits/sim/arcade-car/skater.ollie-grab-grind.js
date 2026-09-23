import * as THREE from 'three';
import { cloneMaterials, spawn } from './assets.js';
import { X_LIMIT } from './world.js';
import { clamp, damp } from './utils.js';

export const MAX_HITS = 3;
const GRAVITY = 24;
// Hold-to-charge ollie: a quick tap hops ~0.95 m (cones, hydrants); a full
// charge reaches ~2.1 m, enough to clear a parked car.
const OLLIE_MIN = 6.8;
const OLLIE_MAX = 10;
const LAT_SPEED = 11; // max sideways m/s
const SCALE = 1.5; // chibi skater reads better a bit larger than the townsfolk

// The player: gig-ambulance's backpack pedestrian in a helmet, standing
// side-on on a procedural skateboard. Rolls toward -Z.
export class Skater {
  constructor(scene) {
    this.root = new THREE.Group(); // position + scale
    this.lean = new THREE.Group(); // roll / pitch / spins
    this.tumble = new THREE.Group(); // bail tumble (no yaw, so X is the forward-flip axis)
    this.root.add(this.lean);
    this.lean.add(this.tumble);
    this.root.scale.setScalar(SCALE);
    this.board = makeBoard();
    this.lean.add(this.board);

    this.body = cloneMaterials(spawn('char_pedestrian'));
    this.body.traverse((o) => { // skate-shop colours: teal hoodie
      if (!o.isMesh) return;
      if (o.material.name === 'orange') o.material.color.setHex(0x38c9b4);
      if (o.material.name === 'green') o.material.color.setHex(0xffc93f);
    });
    this.body.rotation.y = Math.PI / 2; // side-on stance, facing +X
    this.body.position.y = DECK_TOP;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: 0xff5f7e, roughness: 0.45 }));
    helmet.position.set(0, 1.0, -0.04);
    helmet.castShadow = true;
    this.body.add(helmet);
    this.tumble.add(this.body);
    scene.add(this.root);
    this.radius = 0.32 * SCALE;
    this.reset();
  }

  reset() {
    Object.assign(this, {
      x: 0, z: 0, y: 0, vy: 0, speed: 0, targetX: 0, latV: 0, airborne: false, airT: 0, fromRamp: false,
      onRamp: null, hits: 0, invuln: 0, bailed: false, bailT: 0, spin: 0, spinDir: 1, flip: 0, crouch: 0,
      stumble: 0, pushT: 0, charge: 0, grab: false, grabT: 0, grabStyle: 0, groundH: 0, events: [],
      grind: null, grindT: 0, balance: 0, balanceV: 0,
    });
    this.lean.rotation.set(0, 0, 0);
    this.tumble.rotation.set(0, 0, 0);
    this.tumble.position.set(0, 0, 0);
    this.board.position.set(0, 0, 0);
    this.board.rotation.set(0, 0, 0);
    this.root.visible = true;
    this._sync();
  }

  // power 0..1 from how long the jump was charged.
  jump(power = 0) {
    if (this.airborne || this.bailed) return;
    if (this.grind) this._endGrind('grindEnd');
    const big = this.onRamp;
    const ollie = OLLIE_MIN + (OLLIE_MAX - OLLIE_MIN) * clamp(power, 0, 1);
    // Popping on a ramp adds to its launch: ramp lift + a bit of the ollie.
    this.vy = big ? big.lift[0] + this.speed * big.lift[1] + ollie * 0.4 : ollie;
    this.airborne = true;
    this.fromRamp = !!big;
    this.airT = 0;
    this.flip = 0;
    if (big) this.spinDir = Math.random() < 0.5 ? -1 : 1;
    this.charge = 0;
    this.events.push({ type: 'ollie', big: !!big, power });
  }

  // Tricks: hold in the air to grab the board. Still grabbing at touchdown = crash.
  startGrab() {
    if (!this.airborne || this.bailed || this.grab) return;
    this.grab = true;
    this.grabStyle = (this.grabStyle + 1) % GRABS.length;
    this.events.push({ type: 'grabStart', name: GRABS[this.grabStyle] });
  }

  endGrab() {
    if (!this.grab) return;
    this.grab = false;
    this.events.push({ type: 'grabEnd', time: this.grabT });
  }

  get grabName() { return GRABS[this.grabStyle]; }

  // Predicted seconds until touchdown (assuming flat ground at the current ground height).
  get timeToLand() {
    if (!this.airborne) return 0;
    const d = this.y - this.groundH;
    return Math.max(0, (this.vy + Math.sqrt(Math.max(0, this.vy * this.vy + 2 * GRAVITY * d))) / GRAVITY);
  }

  hit() {
    this.hits++;
    this.invuln = 1.6;
    this.stumble = 0.5;
    this.speed *= 0.45;
    if (this.hits >= MAX_HITS) this.bail();
  }

  bail() {
    this.grind = null;
    this.bailed = true;
    this.bailT = 0;
    this.grab = false;
    this.airborne = false;
    this.invuln = 0;
    this.root.visible = true;
  }

  // ctl: { dx (lateral metres to move this frame), speedAxis -1..1, charge 0..1 }, baseSpeed m/s
  update(dt, ctl, baseSpeed, world) {
    if (this.bailed) { this._bailAnim(dt); return; }
    this.charge = this.airborne ? 0 : ctl.charge;
    if (this.grind) { this._grindUpdate(dt, ctl); return; }
    const target = baseSpeed * (1 + 0.3 * ctl.speedAxis) * (this.stumble > 0 ? 0.6 : 1);
    this.speed = damp(this.speed, target, this.speed < target ? 1.4 : 3, dt);
    this.z -= this.speed * dt;
    this.stumble = Math.max(0, this.stumble - dt);

    this.targetX = clamp(this.targetX + ctl.dx, -X_LIMIT, X_LIMIT);
    const step = clamp(this.targetX - this.x, -LAT_SPEED * dt, LAT_SPEED * dt) * (this.airborne ? 0.7 : 1);
    this.x += step;
    this.latV = damp(this.latV, step / Math.max(dt, 1e-4), 12, dt);

    const g = world.groundAt(this.x, this.z);
    this.groundH = g.h;
    if (this.airborne) {
      this.airT += dt;
      if (this.grab) this.grabT += dt;
      const y0 = this.y;
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      // Coming down onto a rail you're lined up with: lock on and grind.
      const rail = this.vy < 0 && world.railAt(this.x, this.z);
      if (rail && y0 >= rail.h - 0.15 && this.y <= rail.h + 0.05) this._startGrind(rail);
      else if (this.y <= g.h && this.vy < 0) this._land(g);
    } else {
      const wasRamp = this.onRamp;
      this.onRamp = g.ramp;
      if (wasRamp && !g.ramp && this.z < wasRamp.z) {
        // Rolled off the lip: launch.
        this.airborne = true;
        this.fromRamp = true;
        this.airT = 0;
        this.flip = 0;
        this.vy = wasRamp.lift[0] + this.speed * wasRamp.lift[1];
        this.spinDir = this.latV > 0 ? 1 : -1;
        this.events.push({ type: 'launch' });
      } else if (g.h < this.y - 0.4) {
        // Dropped off something tall (e.g. a ramp's side): fall.
        this.airborne = true; this.fromRamp = false; this.airT = 0; this.vy = 0;
      } else {
        this.y = g.ramp ? g.h : damp(this.y, g.h, 30, dt);
      }
    }
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.root.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    }
    this._pose(dt, g);
    this._sync();
  }

  _startGrind(rail) {
    const crashed = this.grab; // still grabbing when you hit the rail
    this.events.push({ type: 'land', air: this.airT, ramp: this.fromRamp, spun: false, crashed, grabT: this.grabT, rail: true });
    this.grab = false; this.grabT = 0; this.fromRamp = false;
    this.airborne = false;
    this.vy = 0;
    this.y = rail.h;
    if (crashed) { this.airborne = true; this.vy = 2; return; }
    this.grind = rail;
    this.grindT = 0;
    this.balance = (Math.random() - 0.5) * 0.3;
    this.balanceV = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
    this.targetX = rail.x;
    this.events.push({ type: 'grindStart' });
  }

  // Balance: the needle keeps tipping away from centre (worse the longer you
  // grind) plus random wobble; dragging pushes it back.
  _grindUpdate(dt, ctl) {
    const r = this.grind;
    this.grindT += dt;
    const instab = 2.2 + this.grindT * 0.9;
    this.balanceV += (this.balance * instab + (Math.random() - 0.5) * 7) * dt;
    this.balanceV *= Math.exp(-0.6 * dt);
    this.balance += this.balanceV * dt + ctl.dx * 0.55;
    if (ctl.dx) this.balanceV *= 0.9; // a correction also calms the wobble a bit
    this.speed = damp(this.speed, this.speed * 0.99, 1, dt);
    this.z -= this.speed * dt;
    this.x = damp(this.x, r.x, 20, dt);
    this.y = r.h;
    this.targetX = r.x;
    if (Math.abs(this.balance) >= 1) {
      // Lost it: slip off the side.
      const side = Math.sign(this.balance);
      this._endGrind('grindFail');
      this.targetX = clamp(r.x + side * 1.2, -X_LIMIT, X_LIMIT);
      this.airborne = true; this.vy = 1.5; this.airT = 0;
    } else if (this.z <= r.z1) {
      this._endGrind('grindEnd');
      this.airborne = true; this.vy = 4; this.airT = 0; // pop off the end
    }
    const L = this.lean;
    L.rotation.z = damp(L.rotation.z, -this.balance * 0.55, 18, dt);
    L.rotation.x = damp(L.rotation.x, 0, 10, dt);
    L.rotation.y = damp(L.rotation.y, this.grind ? 0.9 : 0, 10, dt); // boardslide: board across the rail
    this.crouch = damp(this.crouch, 0.3 + this.charge * 0.3, 10, dt);
    this.body.scale.y = 1 - this.crouch * 0.35;
    this.board.rotation.set(0, 0, 0);
    this.board.position.y = 0;
    if (this.invuln > 0) { this.invuln -= dt; this.root.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0; }
    this._sync();
  }

  _endGrind(type) {
    if (!this.grind) return;
    this.events.push({ type, time: this.grindT });
    this.grind = null;
    this.grindT = 0;
    this.balance = 0;
  }

  _land(g) {
    this.y = g.h;
    this.airborne = false;
    const crashed = this.grab;
    this.events.push({ type: 'land', air: this.airT, ramp: this.fromRamp, spun: this.fromRamp && this.airT > 0.7,
      crashed, grabT: this.grabT });
    this.grab = false;
    this.grabT = 0;
    this.crouch = 0.25;
    this.fromRamp = false;
    this.vy = 0;
  }

  _pose(dt, g) {
    const L = this.lean;
    // Lean into the carve (roll about the travel axis) and pitch with ramps.
    L.rotation.z = damp(L.rotation.z, clamp(-this.latV * 0.045, -0.4, 0.4), 10, dt);
    let pitch = 0;
    if (g.ramp && !this.airborne) pitch = Math.atan2(g.ramp.h, g.ramp.len);
    else if (this.airborne) pitch = clamp(this.vy * 0.03, -0.3, 0.35);
    L.rotation.x = damp(L.rotation.x, pitch, 10, dt);

    if (this.airborne) {
      if (this.fromRamp) {
        // 360 spin plus a kickflip on big air.
        this.spin = Math.min(Math.PI * 2, this.spin + dt * 7.5);
        this.flip = Math.min(Math.PI * 2, this.flip + dt * 11);
      } else {
        this.flip = Math.min(Math.PI * 2, this.flip + dt * 13);
      }
      L.rotation.y = this.spin * this.spinDir;
      if (this.grab) {
        // Board pulled up to the hand, knees tucked, body tweaked.
        this.flip = Math.PI * 2;
        const g2 = GRAB_POSES[this.grabStyle];
        this.board.rotation.z = damp(this.board.rotation.z % (Math.PI * 2), g2[0], 14, dt);
        this.board.rotation.x = damp(this.board.rotation.x, g2[1], 14, dt);
        this.board.position.y = damp(this.board.position.y, 0.3, 14, dt);
        this.tumble.rotation.z = damp(this.tumble.rotation.z, g2[2], 10, dt);
        this.crouch = damp(this.crouch, 0.5, 14, dt);
      } else {
        this.board.rotation.z = this.flip;
        this.board.rotation.x = damp(this.board.rotation.x, 0, 14, dt);
        this.board.position.y = Math.sin(this.flip / 2) * 0.35;
        this.tumble.rotation.z = damp(this.tumble.rotation.z, 0, 10, dt);
        this.crouch = damp(this.crouch, 0.18, 8, dt);
      }
    } else {
      this.spin = 0; this.flip = 0;
      L.rotation.y = damp(L.rotation.y, 0, 12, dt);
      this.board.rotation.z = 0;
      this.board.rotation.x = 0;
      this.board.position.y = 0;
      this.tumble.rotation.z = 0;
      this.crouch = damp(this.crouch, this.charge * 0.55, this.charge ? 14 : 6, dt); // squat while charging
      // Kick-push rhythm while below cruising speed.
      this.pushT += dt * 5;
    }
    const bob = this.airborne ? 0 : Math.abs(Math.sin(this.pushT)) * 0.025;
    this.tumble.position.y = bob;
    this.body.scale.y = 1 - this.crouch * 0.35;
  }

  _bailAnim(dt) {
    this.bailT += dt;
    const k = Math.min(1, this.bailT / 0.9);
    this.speed = damp(this.speed, 0, 2.5, dt);
    this.z -= this.speed * dt;
    if (this.y > 0.01) this.y = Math.max(0, this.y - 6 * dt);
    // Body flies forward over the nose and lands face-down.
    this.tumble.rotation.x = -(1 - (1 - k) ** 2) * Math.PI * 2.5;
    this.tumble.position.y = Math.sin(k * Math.PI) * 1.2 + k * 0.05;
    this.tumble.position.z = -k * 1.8;
    // Board shoots out and spins away.
    this.board.position.z = -Math.min(1, this.bailT / 1.2) * 4;
    this.board.position.x = Math.min(1, this.bailT / 1.2) * 1.2;
    this.board.rotation.y += dt * 9 * (1 - k);
    this.lean.rotation.z = damp(this.lean.rotation.z, 0, 8, dt);
    this.body.scale.y = 1;
    this._sync();
  }

  _sync() { this.root.position.set(this.x, this.y, this.z); }
}

const DECK_TOP = 0.17;
const GRABS = ['INDY GRAB', 'MELON', 'NOSE GRAB', 'STALEFISH', 'METHOD', 'TAIL GRAB'];
// Per grab: board roll, board pitch, body lean.
const GRAB_POSES = [[0.5, 0, 0.25], [-0.5, 0, -0.25], [0, 0.6, 0.15], [0.7, -0.2, -0.3], [1.0, 0.3, 0.35], [0, -0.6, -0.15]];

function makeBoard() {
  const g = new THREE.Group();
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xff7a3d, roughness: 0.6 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2f2944, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc8c6d8, roughness: 0.35, metalness: 0.4 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xfff1a8, roughness: 0.5 });
  const mesh = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // Deck with kicked-up nose and tail (length along Z, the travel axis).
  mesh(new THREE.BoxGeometry(0.3, 0.04, 0.78), deckMat, 0, 0.14, 0);
  mesh(new THREE.BoxGeometry(0.29, 0.012, 0.78), gripMat, 0, 0.166, 0);
  for (const s of [-1, 1]) {
    const kick = new THREE.Group();
    kick.position.set(0, 0.14, s * 0.39);
    kick.rotation.x = s * 0.35;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16, 1, false, 0, Math.PI), deckMat);
    tip.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    tip.scale.set(1, 1, 1.1);
    tip.position.z = 0;
    const flat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.1), deckMat);
    flat.position.z = s * 0.05;
    tip.position.z = s * 0.1;
    kick.add(flat, tip);
    kick.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(kick);
  }
  // Trucks + wheels.
  const wheel = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12);
  wheel.rotateZ(Math.PI / 2);
  for (const z of [-0.26, 0.26]) {
    mesh(new THREE.BoxGeometry(0.26, 0.04, 0.05), metal, 0, 0.085, z);
    for (const x of [-0.14, 0.14]) mesh(wheel, wheelMat, x, 0.055, z);
  }
  return g;
}
