import * as THREE from 'three';
import { loadAssets } from './assets.js';
import { Sfx } from './audio.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { MAX_HITS, Skater } from './skater.js';
import { WORLD_ASSETS, World } from './world.js';
import { damp } from './utils.js';

// Camera views (toggle with the 🎥 button / C). Classic: street leans up-right, camera
// behind and to the right. Low-left: camera behind and to the left, lower.
const VIEWS = [
  { name: 'Classic', yaw: 0.32, pitch: 35, zoom: 7.6 },
  { name: 'Low-left', yaw: -0.4, pitch: 34, zoom: 8.5 },
];
let view = VIEWS[loadView()];
const STEER_SPEED = 12; // lateral metres/second at full joystick or key deflection
const TRICK_BOOST = 1.12; // speed multiplier while the jump/trick button is held
const STREAK_STEP = 150; // metres without a hit per multiplier level
const MAX_MULT = 5;
const CHARGE_TIME = 0.8; // seconds of holding for a full-power ollie
const GRAB_RATE = 400; // trick points per second of grab (banked on a clean landing)
const GRIND_RATE = 350; // points per second on a rail (banked when you pop off cleanly)

// ---------- renderer / scene / camera ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4b0ee);
scene.add(new THREE.HemisphereLight(0xf1eaff, 0x5fbf97, 1.9));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-22, 45, 14);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
const CAM_OFFSET = new THREE.Vector3();
// Ground-plane directions of screen up / screen right, for framing the skater.
const SCREEN_UP = new THREE.Vector2();
const SCREEN_RIGHT = new THREE.Vector2();
let camAhead = 10, camSide = 0;

function loadView() { try { return Number(localStorage.getItem('fingerSkater.view')) % VIEWS.length || 0; } catch (_) { return 0; } }

function applyView() {
  const yaw = view.yaw, pitch = THREE.MathUtils.degToRad(view.pitch);
  CAM_OFFSET.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(150);
  SCREEN_UP.set(-Math.sin(yaw), -Math.cos(yaw));
  SCREEN_RIGHT.set(Math.cos(yaw), -Math.sin(yaw));
  resize();
}

function cycleView() {
  const i = (VIEWS.indexOf(view) + 1) % VIEWS.length;
  view = VIEWS[i];
  try { localStorage.setItem('fingerSkater.view', String(i)); } catch (_) { /* private mode */ }
  applyView();
  if (typeof toast === 'function' && !hudEl.classList.contains('hidden')) toast(`Camera: ${view.name}`);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  // Portrait: fit ~2 x view.zoom metres of street across the screen. Landscape: fixed height.
  const half = aspect < 1 ? view.zoom / aspect : view.zoom * 1.35;
  camera.left = -half * aspect; camera.right = half * aspect;
  camera.top = half; camera.bottom = -half;
  camera.updateProjectionMatrix();
  // Put the skater ~30% up from the bottom so there's room to see what's coming, and a
  // little right of centre since the street recedes up-left.
  camAhead = (0.4 * half) / Math.sin(THREE.MathUtils.degToRad(view.pitch));
  camSide = (view.yaw / 0.4) * 0.3 * half * Math.min(1, aspect);
}
window.addEventListener('resize', resize);

// Camera target for a skater at (x, z): ahead along screen-up, offset along screen-right,
// following only part of their lateral position so weaving shows on screen.
function focusFor(x, z) {
  const fx = x * 0.55 + SCREEN_UP.x * camAhead + SCREEN_RIGHT.x * camSide;
  const fz = z + SCREEN_UP.y * camAhead + SCREEN_RIGHT.y * camSide;
  return [fx, 0, fz];
}

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const hudEl = $('hud');
const livesEl = $('lives');
for (let i = 0; i < MAX_HITS; i++) livesEl.appendChild(Object.assign(document.createElement('div'), { className: 'life' }));
const chargeEl = $('charge'), chargeFill = $('charge-fill');
const jumpBtn = $('jump-btn');
const balEl = $('balance'), balNeedle = $('bal-needle'), balLbl = $('bal-lbl');
const airEl = $('air'), airFill = $('air-fill'), airTime = $('air-time'), airTrick = $('air-trick');
const tmpV = new THREE.Vector3();
applyView();
$('cam-btn').addEventListener('click', cycleView);
addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'c' && !e.repeat) cycleView(); });

function toScreen(x, y, z) {
  tmpV.set(x, y, z).project(camera);
  return [(tmpV.x + 1) / 2 * innerWidth, (1 - tmpV.y) / 2 * innerHeight];
}

function toast(text, cls = '') {
  const box = $('toasts');
  const el = Object.assign(document.createElement('div'), { className: `toast ${cls}`, textContent: text });
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 1500);
}

function float(text, x, y, z, color) {
  const [sx, sy] = toScreen(x, y, z);
  const el = Object.assign(document.createElement('div'), { className: 'float', textContent: text });
  el.style.left = `${sx}px`; el.style.top = `${sy}px`;
  if (color) el.style.color = color;
  $('floats').appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function renderLives() {
  [...livesEl.children].forEach((el, i) => {
    const lost = i >= MAX_HITS - player.hits;
    if (lost && !el.classList.contains('lost')) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 400); }
    el.classList.toggle('lost', lost);
  });
}

// ---------- game state ----------
const input = new Input($('joy-zone'), $('joystick'), $('jump-zone'), $('jump-btn'));
const sfx = new Sfx();
let world, player, fx;
const state = { mode: 'loading', score: 0, dist: 0, streak: 0, mult: 1, ramps: 0, hops: 0, best: loadBest() };
const camFocus = new THREE.Vector3();
// What the current hold means: 'charge' (started on the ground) or 'trick' (started in the air).
const hold = { kind: null, start: 0, airMax: 1 };
const chargeLevel = () => (hold.kind === 'charge' ? Math.min(1, (performance.now() - hold.start) / 1000 / CHARGE_TIME) : 0);

function loadBest() { try { return Number(localStorage.getItem('fingerSkater.best')) || 0; } catch (_) { return 0; } }
function saveBest(v) { try { localStorage.setItem('fingerSkater.best', String(v)); } catch (_) { /* private mode */ } }

async function boot() {
  const status = $('load-status');
  const btn = $('start-btn');
  try {
    await loadAssets(['char_pedestrian', ...WORLD_ASSETS], (d, n) => { status.textContent = `Loading models ${d}/${n}`; });
  } catch (err) {
    status.textContent = `Failed to load assets: ${err.message}`;
    throw err;
  }
  world = new World(scene);
  player = new Skater(scene);
  fx = new FX(scene);
  resetRun();
  status.textContent = state.best ? `Best: ${state.best.toLocaleString()}` : '';
  btn.disabled = false;
  btn.textContent = 'SKATE!';
  btn.onclick = start;
  state.mode = 'title';
  requestAnimationFrame(loop);
}

function resetRun() {
  world.reset();
  player.reset();
  Object.assign(state, { score: 0, dist: 0, streak: 0, mult: 1, ramps: 0, hops: 0, tricks: 0, grinds: 0, over: 0 });
  hold.kind = null;
  camFocus.set(...focusFor(0, 0));
  renderLives();
}

function start() {
  sfx.unlock();
  $('screen').classList.add('hidden');
  hudEl.classList.remove('hidden');
  if (state.mode === 'over') resetRun();
  state.mode = 'playing';
  input.reset();
  input.enabled = true;
}

$('pause-btn').addEventListener('click', () => {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  input.enabled = false; input.reset();
  sfx.setRoll(0, false); sfx.grind(false);
  showCard('<h1>PAUSED</h1><p class="tag">Catch your breath.</p><button id="resume">ROLL ON</button>');
  $('resume').onclick = () => {
    $('screen').classList.add('hidden');
    state.mode = 'playing';
    input.enabled = true;
  };
});

function showCard(html) {
  const s = $('screen');
  s.querySelector('.card').innerHTML = html;
  s.classList.remove('hidden');
}

function gameOver() {
  state.mode = 'over';
  input.enabled = false; input.reset();
  hudEl.classList.add('hidden');
  const score = Math.round(state.score);
  const newBest = score > state.best;
  if (newBest) { state.best = score; saveBest(score); }
  showCard(`<h1>BAILED!</h1>
    <div class="stats">⭐ ${score.toLocaleString()} pts<br>🛹 ${Math.round(state.dist)} m skated<br>
    🚀 ${plural(state.ramps, 'ramp')} · 🦘 ${plural(state.hops, 'hop')}<br>
    🤘 ${plural(state.tricks, 'trick')} · 🛤️ ${plural(state.grinds, 'grind')}</div>
    <p class="tag best">${newBest ? 'NEW BEST!' : `Best: ${state.best.toLocaleString()}`}</p>
    <button id="again">SKATE AGAIN</button>`);
  $('again').onclick = start;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- scoring ----------
function award(base, label, x, y, z, color) {
  const pts = Math.round(base * state.mult);
  state.score += pts;
  float(`${label} +${pts}`, x, y, z, color);
  return pts;
}

function handleEvents(events) {
  const p = player;
  if (debug.log) debug.log.push(...events.map((e) => `${t.toFixed(2)} ${e.type}${e.crashed ? ' CRASH' : ''}`));
  for (const e of events) {
    switch (e.type) {
      case 'ollie': sfx.ollie(e.power ?? 0); fx.dust(p.x, p.y, p.z, 3, 0.8); break;
      case 'launch': sfx.ollie(1); state.ramps++; break;
      case 'land':
        sfx.land();
        fx.dust(p.x, p.y, p.z, e.ramp ? 8 : 3, 1.2);
        if (e.crashed) { // still holding the grab at touchdown
          hold.kind = null;
          takeHit(null, 'SKETCHY LANDING!');
          break;
        }
        if (e.grabT > 0.05) {
          state.tricks++;
          const pts = award(100 + GRAB_RATE * e.grabT, p.grabName, p.x, 3.6, p.z, '#ff9fe0');
          toast(`${p.grabName} ${e.grabT.toFixed(1)}s +${pts}`, 'big good');
          sfx.bonus();
        }
        if (e.ramp && e.air > 0.35) {
          const pts = award(250 + Math.round(e.air * 250), e.spun ? '360 AIR!' : 'BIG AIR!', p.x, 3, p.z, '#ffd45e');
          toast(`${e.spun ? '360 ' : ''}AIR ${e.air.toFixed(1)}s +${pts}`, 'good');
          sfx.bonus();
        }
        break;
      case 'clear':
        state.hops++;
        if (e.car) { award(400, 'CAR HOP!', e.x, 3, e.z, '#ffd45e'); toast('CAR HOP!', 'big good'); sfx.bonus(); }
        else award(100, 'HOP', e.x, 2, e.z);
        break;
      case 'nearMiss': award(50, 'CLOSE!', e.x, 2.5, e.z, '#8ff0ff'); sfx.honk(); break;
      case 'pickup':
        fx.sparkle(e.x, e.y - 1, e.z, 8);
        if (e.kind === 'pu_coin') { sfx.coin(); award(25, '', e.x, e.y + 0.5, e.z, '#ffe27a'); }
        else if (e.kind === 'pu_heart') {
          sfx.power();
          if (p.hits > 0) { p.hits--; toast('+1 LIFE', 'good'); } else award(200, '♥', e.x, e.y, e.z);
          renderLives();
        } else if (e.kind === 'pu_star') {
          sfx.power();
          state.streak = Math.min(state.streak + STREAK_STEP, STREAK_STEP * (MAX_MULT - 1));
          toast('STREAK BOOST!', 'good');
        }
        break;
      case 'hit': takeHit(e.e, 'OOF!'); break;
      case 'grindStart': sfx.grind(true); fx.sparkle(p.x, p.y - 0.8, p.z, 6); break;
      case 'grindEnd': {
        sfx.grind(false);
        state.grinds++;
        const pts = award(150 + GRIND_RATE * e.time, 'RAIL GRIND', p.x, p.y + 2.5, p.z, '#8ff0ff');
        toast(`GRIND ${e.time.toFixed(1)}s +${pts}`, 'big good');
        sfx.bonus();
        break;
      }
      case 'grindFail': sfx.grind(false); takeHit(null, 'SLIPPED!'); break;
      default: break;
    }
  }
}

function takeHit(ob, label) {
  const p = player;
  if (p.invuln > 0 || p.bailed) return;
  if (ob) { world.knock(ob, p); ob.hitPlayer = true; }
  p.endGrab();
  p.hit();
  fx.shake = 0.7;
  fx.dust(p.x, 0.3, p.z, 6, 1.5);
  state.streak = 0;
  renderLives();
  if (p.bailed) {
    sfx.grind(false);
    sfx.bail(); fx.shake = 1;
    toast('BAIL!', 'big bad');
    state.mode = 'bailing';
    input.enabled = false; input.reset();
    hold.kind = null;
  } else {
    sfx.hit();
    const left = MAX_HITS - p.hits;
    toast(left === 1 ? `${label} LAST CHANCE` : `${label} ${left} left`, 'bad');
  }
}

// Interpret presses/releases: on the ground a hold charges an ollie, in the air it's a grab.
function handleHold(events) {
  const p = player;
  for (const ev of events) {
    if (ev === 'press') {
      hold.start = performance.now();
      if (p.airborne) { hold.kind = 'trick'; p.startGrab(); } else hold.kind = 'charge';
    } else {
      if (hold.kind === 'charge' && ev === 'release' && !p.airborne) p.jump(chargeLevel());
      else if (hold.kind === 'trick') p.endGrab();
      hold.kind = null;
    }
  }
}

// ---------- main loop ----------
const debug = { freezeCam: false, log: null };
let last = performance.now();
let t = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  const playing = state.mode === 'playing';
  const bailing = state.mode === 'bailing';

  if (playing || bailing) {
    const raw = input.read();
    const dx = (input.joyAxis + input.keyAxis) * STEER_SPEED * dt;
    const baseSpeed = Math.min(17, 9 + state.dist / 220) * (input.holding ? TRICK_BOOST : 1);
    const z0 = player.z;
    const wasFull = player.charge >= 1;
    handleHold(raw.events);
    player.update(dt, { dx, speedAxis: input.speedAxis, charge: chargeLevel() }, baseSpeed, world);
    if (!wasFull && player.charge >= 1) sfx.charged();
    // Still holding a charge as you sail off a ramp lip: that hold becomes a grab.
    if (hold.kind === 'charge' && player.airborne) { hold.kind = 'trick'; player.startGrab(); }
    const events = player.events.splice(0);
    world.update(dt, t, player, events);
    handleEvents(events);

    if (playing) {
      // Points for every metre skated without bailing, times the clean-streak multiplier.
      const dm = Math.max(0, z0 - player.z);
      state.dist += dm;
      state.streak += dm;
      const mult = Math.min(MAX_MULT, 1 + Math.floor(state.streak / STREAK_STEP));
      if (mult > state.mult) { toast(`CLEAN STREAK x${mult}!`, 'good'); sfx.bonus(); }
      state.mult = mult;
      state.score += dm * mult;
    } else if ((state.over += dt) > 1.8) gameOver();
    sfx.setRoll(player.speed, !player.airborne && !player.bailed && !player.grind);
    if (player.grind && Math.random() < 0.4) fx.sparkle(player.x, player.y - 1, player.z, 1);
  } else if (world) {
    world.update(dt * 0.4, t, { x: 99, z: player.z, y: 0, radius: 0, airborne: false, speed: 0 }, []);
  }

  if (world && !debug.freezeCam) {
    fx.update(dt);
    // Camera: rides ahead of the skater, loosely following their lateral position.
    const [cx, , cz] = focusFor(player.x, player.z);
    camFocus.x = damp(camFocus.x, cx, 3, dt);
    camFocus.z = damp(camFocus.z, cz, 8, dt);
    const sh = fx.shake * fx.shake * 0.8;
    camera.position.copy(camFocus).add(CAM_OFFSET);
    camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh;
    camera.lookAt(camFocus);
    sun.position.copy(camFocus).add(SUN_OFFSET);
    sun.target.position.copy(camFocus);
    updateHud();
  }
  renderer.render(scene, camera);
}

function updateHud() {
  if (hudEl.classList.contains('hidden')) return;
  $('score').textContent = Math.round(state.score).toLocaleString();
  $('dist').textContent = `${Math.round(state.dist)} m`;
  $('mult').textContent = `x${state.mult}`;
  $('mult-pill').classList.toggle('hot', state.mult > 1);
  const c = chargeLevel();
  const on = c > 0 && state.mode === 'playing' && !player.airborne;
  chargeEl.classList.toggle('on', on);
  if (on) {
    const [sx, sy] = toScreen(player.x, player.y + 1.2, player.z);
    chargeEl.style.left = `${sx}px`; chargeEl.style.top = `${sy - 70}px`;
    chargeFill.style.strokeDasharray = `${Math.round(c * 100)} 100`;
    chargeEl.classList.toggle('full', c >= 1);
  }
  jumpBtn.classList.toggle('full', on && c >= 1);
  // Balance meter while grinding.
  const grinding = !!player.grind && state.mode === 'playing';
  balEl.classList.toggle('on', grinding);
  if (grinding) {
    const [sx, sy] = toScreen(player.x, player.y + 2.6, player.z);
    balEl.style.left = `${sx}px`; balEl.style.top = `${sy}px`;
    balNeedle.style.left = `${(player.balance + 1) * 50}%`;
    balEl.classList.toggle('warn', Math.abs(player.balance) > 0.7);
    balLbl.textContent = `GRIND ${player.grindT.toFixed(1)}s +${Math.round((150 + GRIND_RATE * player.grindT) * state.mult)}`;
  }
  // Air-time indicator: seconds up, and a bar draining toward touchdown.
  const air = player.airborne && state.mode === 'playing';
  airEl.classList.toggle('on', air);
  if (air) {
    const left = player.timeToLand;
    if (player.airT < 0.05 || left > hold.airMax) hold.airMax = Math.max(0.2, left);
    const [sx, sy] = toScreen(player.x, player.y + 2.4, player.z);
    airEl.style.left = `${sx}px`; airEl.style.top = `${sy}px`;
    airTime.textContent = `${player.airT.toFixed(1)}s`;
    airTrick.textContent = player.grab ? `${player.grabName} +${Math.round((100 + GRAB_RATE * player.grabT) * state.mult)}` : '';
    airFill.style.width = `${Math.min(100, (left / hold.airMax) * 100)}%`;
    airEl.classList.toggle('warn', left < 0.3);
    airEl.classList.toggle('grab', player.grab);
  }
}

boot();

// Debug handle for poking at the game from the console / automated checks.
window.SKATE = { get state() { return state; }, get player() { return player; }, get world() { return world; },
  input, scene, camera, debug, get t() { return t; } };
