// Gem Rush — the no-build three.js toy starter.
//
// Everything here is a pattern lifted from gig-ambulance / finger-skater /
// space-lion / labyrinth-larry, wired into the smallest complete game:
//   * orthographic "toy diorama" camera, 45° yaw, 52° pitch, look-ahead follow
//   * floating thumbstick giving an ABSOLUTE SCREEN direction, projected onto
//     the ground with the camera's screen-right / screen-up vectors
//   * hold buttons tracked per pointerId (works alongside the stick)
//   * toy materials + inverted-hull ink outlines + one shadow-casting sun
//     that follows the player with a tight frustum
//   * pooled particles (fx.js), synth sfx (sfx-synth.js), DOM HUD pills,
//     a top nav compass, toasts, floating "+3s" text on an overlay canvas
//   * title / playing / paused / over state machine, auto-pause on blur,
//     input.reset() on pause, best score in localStorage (try/catch)
// window.GAME exposes state for poking from the console (finger-skater's SKATE).
import * as THREE from 'three';
import { FX } from './fx.js';
import { InputManager } from './input.js';
import { Sfx } from './sfx-synth.js';
import { clamp, damp, mulberry32, wrapAngle } from './utils.js';

const GAME_TIME = 60;
const GEM_TIME = 3; // seconds each gem buys
const ARENA = 26; // half-size of the square arena, metres
const VIEW = 13; // half of the shorter screen dimension, in metres
const CAM_PITCH = THREE.MathUtils.degToRad(52);
const CAM_YAW = Math.PI / 4;
const BEST_KEY = 'gem-rush.best';

const PAL = { ink: 0x3b2e5a, cream: 0xfffdf8, lav: 0xdccbf7, purple: 0x6e5ac8, mint: 0x4cc79a, mint2: 0x3bb58a,
  yellow: 0xffd45e, gold: 0xffc53a, pink: 0xff9fbd, red: 0xee4b5e, blush: 0xff93a8, eye: 0x2a2433, wall: 0xcbc5f2 };

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // cap DPR at 2
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4b0ee);
scene.add(new THREE.HemisphereLight(0xf1eaff, 0x5fbf97, 1.9));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-22, 45, 14);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
const CAM_OFFSET = new THREE.Vector3(Math.sin(CAM_YAW) * Math.cos(CAM_PITCH), Math.sin(CAM_PITCH), Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)).multiplyScalar(140);
// Screen right / screen up projected onto the ground (x, z). Pushing the stick
// up always means "up the screen" — better on phones than tank steering.
const SCREEN_RIGHT = new THREE.Vector2(Math.cos(CAM_YAW), -Math.sin(CAM_YAW));
const SCREEN_UP = new THREE.Vector2(-Math.sin(CAM_YAW), -Math.cos(CAM_YAW));

// ---------------------------------------------------------------- toy kit
const toy = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
// Inverted-hull outline: back faces pushed out along normals in view space.
// Fine on smooth geometry (spheres, capsules); weld normals first for boxes
// (see starters/react-board-game/src/game/toyKit.ts hullOf()).
const outlineMat = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(PAL.ink) }, thickness: { value: 0.09 } }, // world units — ortho view is ~26 m tall
  vertexShader: /* glsl */ `
    uniform float thickness;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      mv.xyz += normalize(normalMatrix * normal) * thickness;
      gl_Position = projectionMatrix * mv;
    }`,
  // #include is a preprocessor directive: it MUST be on its own line — a
  // one-line shader string fails to compile ("'#' : invalid character").
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide,
});
function inked(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.add(new THREE.Mesh(geo, outlineMat));
  return m;
}

// ---------------------------------------------------------------- world
function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#4cc79a'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#44bd8f'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ARENA / 2, ARENA / 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), toy(0xffffff, { map: checkerTexture(), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const skirt = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), toy(PAL.lav, { roughness: 1 }));
skirt.rotation.x = -Math.PI / 2;
skirt.position.y = -0.02;
scene.add(skirt);
const wallMat = toy(PAL.wall);
for (const [x, z, w, d] of [[0, -ARENA, ARENA * 2 + 1, 1], [0, ARENA, ARENA * 2 + 1, 1], [-ARENA, 0, 1, ARENA * 2], [ARENA, 0, 1, ARENA * 2]]) {
  const wall = inked(new THREE.CapsuleGeometry(0.5, Math.max(w, d) - 1, 4, 10), wallMat);
  wall.rotation.z = Math.PI / 2;
  if (d > w) wall.rotation.y = Math.PI / 2;
  wall.position.set(x, 0.5, z);
  scene.add(wall);
}

// Bumpers: fixed round obstacles; bounce, never damage (gig-ambulance: "chaos is cute").
const rng = mulberry32(7);
const bumpers = [];
const bumperMat = toy(PAL.pink);
const bumperTop = toy(PAL.cream);
for (let i = 0; i < 9; i++) {
  const r = 1.2 + rng() * 0.8;
  const x = (rng() * 2 - 1) * (ARENA - 5), z = (rng() * 2 - 1) * (ARENA - 5);
  if (Math.hypot(x, z) < 6) continue; // keep the spawn clear
  const g = new THREE.Group();
  const body = inked(new THREE.CylinderGeometry(r, r * 1.08, 1.2, 24), bumperMat);
  body.position.y = 0.6;
  const cap = inked(new THREE.SphereGeometry(r * 0.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bumperTop);
  cap.position.y = 1.2;
  g.add(body, cap);
  g.position.set(x, 0, z);
  scene.add(g);
  bumpers.push({ x, z, r, g, squash: 0 });
}

// Gems: 3 live at once, relocated when collected.
const gemMat = toy(PAL.gold, { emissive: PAL.gold, emissiveIntensity: 0.35, roughness: 0.25 }); // emissive = "this matters"
const gems = [];
for (let i = 0; i < 3; i++) {
  const m = inked(new THREE.OctahedronGeometry(0.7, 0), gemMat);
  scene.add(m);
  gems.push({ m, x: 0, z: 0 });
}

// Player: a chibi blob racer.
const player = new THREE.Group();
const bodyMesh = inked(new THREE.SphereGeometry(0.9, 24, 16), toy(PAL.cream));
bodyMesh.scale.set(1, 0.85, 1.15);
bodyMesh.position.y = 0.8;
const capMesh = inked(new THREE.SphereGeometry(0.93, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toy(PAL.purple));
capMesh.position.y = 0.85;
capMesh.scale.set(1, 0.9, 1.15);
player.add(bodyMesh, capMesh);
for (const s of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), toy(PAL.eye));
  eye.scale.set(1, 1.4, 0.6);
  eye.position.set(s * 0.3, 0.8, 0.98);
  const blush = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), toy(PAL.blush));
  blush.scale.set(1.3, 0.7, 0.4);
  blush.position.set(s * 0.55, 0.62, 0.86);
  player.add(eye, blush);
}
scene.add(player);

// ---------------------------------------------------------------- systems
const input = new InputManager(canvas);
input.bindButton(document.getElementById('btn-boost'), 'boost');
const sfx = new Sfx();
const fx = new FX(scene);
const overlay = document.getElementById('overlay');
const octx = overlay.getContext('2d');
const $ = (id) => document.getElementById(id);
const el = { hud: $('hud'), screen: $('screen'), time: $('hud-time'), timeVal: document.querySelector('#hud-time .val'),
  gems: $('hud-gems'), boost: $('boost-bar'), toasts: $('toasts'), nav: $('nav'), navArrow: $('nav-arrow'),
  navDist: $('nav-dist'), best: $('best'), start: $('start-btn'), pause: $('pause-btn'), mute: $('mute-btn') };

const state = { mode: 'title', time: GAME_TIME, gems: 0, best: loadBest(), warned: false };
const P = { x: 0, z: 0, vx: 0, vz: 0, heading: 0, boost: 1, lean: 0 };
const camFocus = new THREE.Vector3();
const floaters = [];
let navAngle = 0;

function loadBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (_) { return 0; } }
function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (_) { /* private mode */ } }

function placeGem(g) {
  for (let tries = 0; tries < 50; tries++) {
    const x = (Math.random() * 2 - 1) * (ARENA - 3), z = (Math.random() * 2 - 1) * (ARENA - 3);
    if (Math.hypot(x - P.x, z - P.z) < 9) continue; // never on top of the player
    if (bumpers.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + 1.5)) continue;
    g.x = x; g.z = z;
    return;
  }
}

function toast(text, cls = '') {
  const d = document.createElement('div');
  d.className = `toast ${cls}`;
  d.textContent = text;
  el.toasts.appendChild(d);
  setTimeout(() => d.remove(), 1600);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove(); // cap the stack
}

function float(text, x, y, z, color = '#2f9e62') {
  floaters.push({ text, p: new THREE.Vector3(x, y, z), t: 0, color });
}

// ---------------------------------------------------------------- flow
function resetRun() {
  Object.assign(P, { x: 0, z: 0, vx: 0, vz: 0, heading: 0, boost: 1, lean: 0 });
  Object.assign(state, { time: GAME_TIME, gems: 0, warned: false });
  gems.forEach(placeGem);
  camFocus.set(0, 0, 0);
}

function start() {
  sfx.unlock(); // audio must start inside a user gesture
  resetRun();
  state.mode = 'playing';
  el.screen.classList.add('hidden');
  el.hud.classList.remove('hidden');
  toast('GO!', 'big');
}

function setPaused(on) {
  if (on && state.mode === 'playing') {
    state.mode = 'paused';
    input.reset(); // a held stick/button must not survive a pause
    showCard('PAUSED', '<p class="tag">Take a breather.</p>', 'RESUME');
  } else if (!on && state.mode === 'paused') {
    state.mode = 'playing';
    el.screen.classList.add('hidden');
  }
}

function gameOver() {
  state.mode = 'over';
  input.reset();
  sfx.play('gameOver');
  const record = state.gems > state.best;
  if (record) { state.best = state.gems; saveBest(state.best); }
  showCard('TIME\'S UP', `<p class="stats">Gems: ${state.gems}<br>${record ? 'New best!' : `Best: ${state.best}`}</p>`, 'AGAIN');
}

function showCard(title, body, button) {
  el.screen.querySelector('.card').innerHTML = `<h1>${title}</h1>${body}<button id="card-btn">${button}</button>`;
  el.screen.classList.remove('hidden');
  $('card-btn').onclick = () => (state.mode === 'paused' ? setPaused(false) : start());
}

el.best.textContent = state.best ? `Best: ${state.best} gems` : '';
el.start.onclick = start;
el.pause.onclick = () => setPaused(state.mode === 'playing');
el.mute.onclick = () => { sfx.setMuted(!sfx.muted); el.mute.classList.toggle('off', sfx.muted); };
input.onKey = (k) => {
  if (k === 'p' || k === 'escape') setPaused(state.mode === 'playing');
  else if (k === 'm') el.mute.onclick();
  else if ((k === ' ' || k === 'enter') && (state.mode === 'title' || state.mode === 'over')) start();
};
// Leaving the app mid-touch never delivers pointerup: pause and drop input.
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.TouchZoomGuard?.init({ onZoomChange: (zoomed) => { if (zoomed) setPaused(true); } });

// ---------------------------------------------------------------- resize
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const half = aspect < 1 ? (VIEW / aspect) * 0.7 : VIEW; // portrait: show a bit more height
  Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
  camera.updateProjectionMatrix();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = w * dpr; overlay.height = h * dpr;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
resetRun();

// ---------------------------------------------------------------- update
const _v = new THREE.Vector3();
function screenAngle(tx, tz) {
  // Angle from player to target AS SEEN ON SCREEN (0 = up the screen).
  _v.set(P.x, 0, P.z).project(camera);
  const ax = _v.x, ay = _v.y;
  _v.set(tx, 0, tz).project(camera);
  return Math.atan2((_v.x - ax) * innerWidth, (_v.y - ay) * innerHeight);
}

function updatePlayer(dt) {
  const ctl = input.read(); // {x, y, mag} in SCREEN space, or null
  const boosting = input.boost && P.boost > 0.02 && !!ctl;
  P.boost = clamp(P.boost + (boosting ? -0.4 : 0.12) * dt, 0, 1);
  const top = boosting ? 16 : 10;
  let tx = 0, tz = 0;
  if (ctl) {
    // screen → world: right × sx + up × (−sy)
    const wx = SCREEN_RIGHT.x * ctl.x + SCREEN_UP.x * -ctl.y;
    const wz = SCREEN_RIGHT.y * ctl.x + SCREEN_UP.y * -ctl.y;
    tx = wx * top * ctl.mag; tz = wz * top * ctl.mag;
  }
  const accel = ctl ? 5 : 2.2; // coast down gently on release
  P.vx = damp(P.vx, tx, accel, dt);
  P.vz = damp(P.vz, tz, accel, dt);
  P.x += P.vx * dt;
  P.z += P.vz * dt;
  const speed = Math.hypot(P.vx, P.vz);

  // Walls: clamp and bounce.
  const lim = ARENA - 1.4;
  if (Math.abs(P.x) > lim) { P.x = Math.sign(P.x) * lim; P.vx *= -0.6; }
  if (Math.abs(P.z) > lim) { P.z = Math.sign(P.z) * lim; P.vz *= -0.6; }
  // Bumpers: push out along the normal, reflect the inward velocity.
  for (const b of bumpers) {
    const dx = P.x - b.x, dz = P.z - b.z, d = Math.hypot(dx, dz), min = b.r + 0.9;
    if (d >= min || d < 1e-6) continue;
    const nx = dx / d, nz = dz / d;
    P.x = b.x + nx * min; P.z = b.z + nz * min;
    const vn = P.vx * nx + P.vz * nz;
    if (vn < 0) {
      P.vx -= 2.2 * vn * nx; P.vz -= 2.2 * vn * nz; // springy
      b.squash = 1;
      fx.shake = Math.min(1, fx.shake + Math.min(0.6, -vn * 0.05));
      sfx.play('bonk');
      fx.dust(P.x, 0, P.z, 4, 1);
    }
  }

  if (speed > 0.5) {
    const want = Math.atan2(P.vx, P.vz); // models face +Z: yaw = atan2(dx, dz)
    P.lean = damp(P.lean, clamp(wrapAngle(want - P.heading) * 2, -0.35, 0.35), 8, dt);
    P.heading += wrapAngle(want - P.heading) * Math.min(1, dt * 10);
  }
  if (boosting && Math.random() < 0.5) fx.dust(P.x, 0, P.z, 1, 0.6);
  sfx.setRoll(speed, true, { maxSpeed: 16, vol: 0.08 });
  return speed;
}

function updateGems(t) {
  for (const g of gems) {
    g.m.position.set(g.x, 1 + Math.sin(t * 3 + g.x) * 0.2, g.z);
    g.m.rotation.y = t * 2;
    if (state.mode !== 'playing' || Math.hypot(P.x - g.x, P.z - g.z) > 1.6) continue;
    state.gems++;
    state.time += GEM_TIME;
    sfx.play('coin');
    fx.sparkle(g.x, 0.5, g.z, 12);
    float(`+${GEM_TIME}s`, g.x, 2, g.z);
    if (state.gems % 10 === 0) { toast(`${state.gems} GEMS!`, 'good'); sfx.play('bonus'); fx.confetti(P.x, 0, P.z, 40); }
    placeGem(g);
  }
}

function updateHud(dt) {
  el.timeVal.textContent = Math.ceil(Math.max(0, state.time));
  el.time.classList.toggle('warn', state.time < 10);
  el.gems.textContent = state.gems;
  el.boost.style.height = `${Math.round(P.boost * 100)}%`;
  // Compass to the nearest gem, eased along the shortest arc.
  let best = null, bd = Infinity;
  for (const g of gems) { const d = Math.hypot(g.x - P.x, g.z - P.z); if (d < bd) { bd = d; best = g; } }
  if (best) {
    navAngle += wrapAngle(screenAngle(best.x, best.z) - navAngle) * Math.min(1, dt * 10);
    el.navArrow.style.transform = `rotate(${navAngle}rad)`;
    el.navDist.textContent = `${Math.round(bd)}m`;
    el.nav.classList.toggle('near', bd < 6);
  }
}

function drawOverlay(dt) {
  const c = octx;
  c.clearRect(0, 0, innerWidth, innerHeight);
  c.textAlign = 'center';
  c.font = '900 22px "Trebuchet MS", system-ui, sans-serif';
  c.lineWidth = 5;
  c.strokeStyle = '#3b2e5a';
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    if ((f.t += dt) > 1.2) { floaters.splice(i, 1); continue; }
    _v.copy(f.p).project(camera);
    const x = (_v.x * 0.5 + 0.5) * innerWidth, y = (-_v.y * 0.5 + 0.5) * innerHeight - f.t * 60;
    c.globalAlpha = Math.min(1, (1.2 - f.t) * 3);
    c.strokeText(f.text, x, y);
    c.fillStyle = f.color;
    c.fillText(f.text, x, y);
  }
  c.globalAlpha = 1;
  if (state.mode !== 'playing') return;
  if (input.stickActive) {
    c.beginPath(); c.arc(input.stickBaseX, input.stickBaseY, input.stickRadius, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,253,248,0.28)'; c.fill();
    c.lineWidth = 4; c.strokeStyle = 'rgba(59,46,90,0.55)'; c.stroke();
    c.beginPath(); c.arc(input.stickThumbX, input.stickThumbY, 26, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,253,248,0.9)'; c.fill(); c.strokeStyle = '#3b2e5a'; c.stroke();
  } else {
    c.beginPath(); c.arc(90, innerHeight - 110, 44, 0, Math.PI * 2); // resting hint where the stick lives
    c.lineWidth = 3; c.strokeStyle = 'rgba(59,46,90,0.25)'; c.stroke();
  }
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function loop(now) {
  const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30));
  last = now;
  const t = now / 1000;

  if (state.mode === 'playing') {
    updatePlayer(dt);
    state.time -= dt;
    if (state.time < 10 && !state.warned) { state.warned = true; sfx.play('warn'); toast('HURRY!', 'bad'); }
    if (state.time >= 10) state.warned = false;
    if (state.time <= 0) { state.time = 0; gameOver(); }
  } else if (state.mode === 'title') {
    // Attract: circle the arena so the title card sits over a living world.
    P.x = Math.sin(t * 0.4) * 10; P.z = Math.cos(t * 0.4) * 10; P.heading = t * 0.4 + Math.PI / 2;
  } else {
    sfx.setRoll(0, false);
  }
  updateGems(t);
  if (state.mode !== 'paused') fx.update(dt);
  for (const b of bumpers) {
    b.squash = Math.max(0, b.squash - dt * 4);
    b.g.scale.set(1 + b.squash * 0.15, 1 - b.squash * 0.2, 1 + b.squash * 0.15);
  }

  player.position.set(P.x, Math.abs(Math.sin(t * 12)) * 0.08 * Math.min(1, Math.hypot(P.vx, P.vz) / 4), P.z);
  player.rotation.set(0, P.heading, 0);
  player.rotateZ(-P.lean);

  // Camera: damped follow with velocity look-ahead; shake decays in fx.update.
  camFocus.x = damp(camFocus.x, P.x + P.vx * 0.35, 4, dt);
  camFocus.z = damp(camFocus.z, P.z + P.vz * 0.35, 4, dt);
  const sh = fx.shake * 0.6;
  camera.position.copy(camFocus).add(CAM_OFFSET);
  camera.position.x += (Math.random() - 0.5) * sh;
  camera.position.z += (Math.random() - 0.5) * sh;
  camera.lookAt(camFocus.x, 0, camFocus.z);
  sun.position.copy(camFocus).add(SUN_OFFSET); // shadow frustum follows the action
  sun.target.position.copy(camFocus);

  if (state.mode === 'playing' || state.mode === 'paused') updateHud(dt);
  drawOverlay(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.GAME = { state, P, scene, camera, input, sfx };
