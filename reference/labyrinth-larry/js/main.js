import * as THREE from 'three';
import { World, T } from './world.js';
import { Body, collideBodies, FATAL_FALL } from './physics.js';
import { Larry } from './larry.js';
import { LEVELS } from './levels.js';
import { InputManager } from './input.js';
import { Sfx } from './audio.js';
import { glowTexture } from './textures.js';
import { Torch, Hellmouth, Checkpoint, LamentBox, OrbMesh, Hook, Trap, BoneSlab, skullPile, HangingChain, Embers } from './props.js';

const PLAYER_R = 0.8, ORB_R = 0.6;
const LIGHTS = 6;           // real point lights, shared by the nearest torches
const BOX_TIME = 5;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const octx = overlay.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x0c0202);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a0503, 60, 105);

// Fixed isometric view, like the arcade original.
const CAM_DIR = new THREE.Vector3(1, 1.3, 1).normalize();
const CAM_DIST = 70;
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 200);
const camTarget = new THREE.Vector3();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const dpr = Math.min(2, devicePixelRatio || 1);
  overlay.width = w * dpr; overlay.height = h * dpr;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const half = 7.5; // world units across the short side, halved
  const hw = w < h ? half : half * w / h, hh = w < h ? half * h / w : half;
  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// Ground-plane axes of the screen, for mapping the stick into the world.
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SCREEN_UP = new THREE.Vector3(-1, 0, -1).normalize();

scene.add(new THREE.HemisphereLight(0x6a5a88, 0x7a2a10, 1.4));
const moon = new THREE.DirectionalLight(0xa08cc8, 0.9); moon.position.set(-3, 10, 4); scene.add(moon);
const lightPool = [];
for (let k = 0; k < LIGHTS; k++) {
  const l = new THREE.PointLight(0xff8a3a, 0, 16, 1.4); scene.add(l); lightPool.push(l);
}

// ---------------------------------------------------------------- state
const input = new InputManager(canvas);
const sfx = new Sfx();
const larry = new Larry(PLAYER_R);
scene.add(larry.root);
const player = new Body(PLAYER_R);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
  map: glowTexture('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
// a dim warm fill that follows Larry so he always reads against the dark
const fill = new THREE.PointLight(0xffb070, 14, 7, 1.2); scene.add(fill);

const G = {
  state: 'title', levelIdx: 0, score: 0, time: 60, t: 0,
  level: null, world: null, root: null, torches: [], checkpoints: [], boxes: [], orbs: [], hooks: [],
  traps: [], bones: [], chains: [], mouth: null, spawn: null, stateT: 0, deathMsg: '',
  screamCD: 1.5, hookCD: 0, lastTick: 0, paused: false,
};

const $ = (id) => document.getElementById(id);
const hud = $('hud'), screen = $('screen'), card = $('card'), toast = $('toast');

function loadLevel(idx) {
  if (G.root) { scene.remove(G.root); G.world.dispose(scene); }
  G.levelIdx = idx;
  const def = LEVELS[idx]();
  G.level = def;
  const world = new World(def); world.build(scene); G.world = world;
  const root = new THREE.Group(); scene.add(root); G.root = root;
  const top = (a) => world.surfaceAt(a.i, a.j);

  G.torches = def.torches.map((a) => { const t = new Torch(top(a)); root.add(t.group); return t; });
  G.checkpoints = def.checkpoints.map((a) => { const c = new Checkpoint(top(a), a.i, a.j); root.add(c.mesh); return c; });
  G.boxes = def.boxes.map((a) => { const b = new LamentBox(top(a)); root.add(b.group); return b; });
  G.hooks = def.hooks.map((a, k) => { const h = new Hook(top(a), a.axis, k * 1.9 + a.i * 0.3); root.add(h.group); return h; });
  G.traps = def.traps.map((a, k) => { const tr = new Trap(top(a), a.type, k * 0.7); tr.cell = world.cell(a.i, a.j); root.add(tr.group); return tr; });
  G.bones = def.cells.filter((c) => c && c.kind === 'bone').map((c) => {
    const b = new BoneSlab(c, c.c); root.add(b.mesh); return b;
  });
  G.chains = def.chains.map((a) => { const c = new HangingChain(new THREE.Vector3((a.i + 0.5) * T, a.h, (a.j + 0.5) * T)); root.add(c.group); return c; });
  def.skulls.forEach((a) => root.add(skullPile(top(a))));
  G.orbs = def.orbs.map((a) => {
    const body = new Body(ORB_R); body.accel = 11; body.maxSpeed = 10; body.friction = 0.7;
    const mesh = new OrbMesh(ORB_R); root.add(mesh.group);
    return { body, mesh, spawn: top(a), dead: 0 };
  });
  G.mouth = new Hellmouth(top(def.goal)); root.add(G.mouth.group);
  // embers drifting up out of the lava sea
  const emb = new Embers(160, Math.max(def.W, def.D) * T * 0.7, 40, 0xff5a10, 0.35);
  emb.points.position.set(def.W * T / 2, world.lavaY, def.D * T / 2); root.add(emb.points); G.embers = emb;

  G.spawn = top(def.start);
  G.time += def.time;
  respawn(true);
  $('hud-level').textContent = idx + 1;
}

function respawn(fresh) {
  const cp = [...G.checkpoints].reverse().find((c) => c.active);
  const p = cp ? cp.pos : G.spawn;
  player.place(p.x, p.y + (fresh ? 0 : 3), p.z);
  if (!fresh) { player.grounded = false; player.peakY = p.y; }
  larry.squash = 1; larry.root.visible = true; larry.man.visible = true;
  larry.cage.quaternion.identity();
  for (const b of G.bones) b.reset();
  for (const o of G.orbs) resetOrb(o);
  snapCamera();
}
function resetOrb(o) { o.body.place(o.spawn.x, o.spawn.y, o.spawn.z); o.dead = 0; o.mesh.group.visible = true; }

function snapCamera() { camTarget.set(player.x, player.y, player.z); placeCamera(); }
function placeCamera() {
  camera.position.copy(camTarget).addScaledVector(CAM_DIR, CAM_DIST);
  camera.lookAt(camTarget);
}

// ---------------------------------------------------------------- UI
let toastTimer = 0;
function showToast(html, dur = 1.4, cls = '') {
  toast.innerHTML = html; toast.className = 'toast show ' + cls; toastTimer = dur;
}
function showCard(html) { card.innerHTML = html; screen.classList.remove('hidden'); }
function hideCard() { screen.classList.add('hidden'); }

function titleCard() {
  G.state = 'title';
  hud.classList.add('hidden');
  const btns = LEVELS.map((_, i) => `<button data-lv="${i}">${i + 1}</button>`).join('');
  showCard(`
    <h1>LABYRINTH<br><span>LARRY</span></h1>
    <p class="tag">Larry died. Hell put him in a cage. Roll him down through the labyrinth and out the hellmouth before the sands run out.</p>
    <ul>
      <li><b>Drag anywhere</b> to roll the cage that way. Let go to coast.</li>
      <li>Ramps speed you up. <b>Falls taller than a man</b> break Larry.</li>
      <li>Dodge soul orbs, hooks, spikes, flames and lava. Bone bridges crumble.</li>
      <li>Grab <b>Lament boxes</b> for +${BOX_TIME}s. Rune circles are checkpoints.</li>
      <li>Desktop: WASD or arrows. P pauses. M mutes.</li>
    </ul>
    <button class="btn" id="go">DESCEND</button>
    <div class="levels">${btns}</div>`);
  $('go').onclick = () => startGame(0);
  card.querySelectorAll('[data-lv]').forEach((b) => { b.onclick = () => startGame(+b.dataset.lv); });
}

function startGame(idx) {
  sfx.unlock();
  G.score = 0; G.time = 0;
  loadLevel(idx);
  levelIntro();
}

function levelIntro() {
  G.state = 'intro'; G.stateT = 0;
  hideCard(); hud.classList.remove('hidden');
  showToast(`CIRCLE ${G.levelIdx + 1}<br>${G.level.name.toUpperCase()}<small>${G.level.sub}</small>`, 2.2);
}

function levelDone() {
  G.state = 'done';
  const timeBonus = Math.ceil(G.time) * 20, lvBonus = (G.levelIdx + 1) * 1000;
  G.score += timeBonus + lvBonus;
  updateHud();
  const last = G.levelIdx === LEVELS.length - 1;
  showCard(last ? `
    <h1>FREE<br><span>AT LAST</span></h1>
    <p class="tag">Larry tumbles out of the final hellmouth into... another cage? Hell has a sense of humour.</p>
    <div class="stats"><span>Escape bonus</span><b>${lvBonus}</b><span>Time bonus</span><b>${timeBonus}</b><span>Final score</span><b>${G.score}</b></div>
    <button class="btn" id="go">AGAIN</button>` : `
    <h2>CIRCLE ${G.levelIdx + 1} ESCAPED</h2>
    <p class="tag">Down, ever down.</p>
    <div class="stats"><span>Circle bonus</span><b>${lvBonus}</b><span>Time bonus (${Math.ceil(G.time)}s)</span><b>${timeBonus}</b><span>Score</span><b>${G.score}</b></div>
    <p class="tag">Remaining time carries into the next circle.</p>
    <button class="btn" id="go">DEEPER</button>`);
  $('go').onclick = () => {
    if (last) { titleCard(); return; }
    loadLevel(G.levelIdx + 1); levelIntro();
  };
}

function gameOver() {
  G.state = 'over';
  showCard(`
    <h1>TIME'S<br><span>UP</span></h1>
    <p class="tag">The labyrinth keeps Larry for another eternity.</p>
    <div class="stats"><span>Reached</span><b>Circle ${G.levelIdx + 1}</b><span>Score</span><b>${G.score}</b></div>
    <button class="btn" id="go">RETRY CIRCLE</button><br>
    <button class="btn ghost" id="menu">MENU</button>`);
  $('go').onclick = () => { G.score = Math.floor(G.score / 2); G.time = 0; loadLevel(G.levelIdx); levelIntro(); };
  $('menu').onclick = titleCard;
}

function setPaused(p) {
  if (!['play', 'intro', 'dying', 'paused'].includes(G.state)) return;
  if (p && G.state !== 'paused') {
    G.prevState = G.state; G.state = 'paused'; input.reset();
    showCard(`<h2>PAUSED</h2><p class="tag">Larry screams quietly.</p><button class="btn" id="go">RESUME</button><br><button class="btn ghost" id="menu">MENU</button>`);
    $('go').onclick = () => setPaused(false);
    $('menu').onclick = titleCard;
  } else if (!p && G.state === 'paused') {
    G.state = G.prevState; hideCard();
  }
}
$('pause-btn').onclick = () => setPaused(G.state !== 'paused');
$('mute-btn').onclick = () => { sfx.setMuted(!sfx.muted); $('mute-btn').classList.toggle('off', sfx.muted); };
input.onKey = (k) => {
  if (k === 'p' || k === 'escape') setPaused(G.state !== 'paused');
  if (k === 'm') $('mute-btn').click();
  if ((k === 'enter' || k === ' ') && !screen.classList.contains('hidden')) $('go')?.click();
};
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

function updateHud() {
  $('hud-score').textContent = G.score;
  const tt = $('hud-time'), s = Math.max(0, Math.ceil(G.time));
  tt.textContent = s; tt.classList.toggle('low', s <= 10);
}

// ---------------------------------------------------------------- gameplay
const DEATHS = {
  splat: ['SPLAT!', 'That drop was too far.'],
  abyss: ['CONSUMED!', 'The fire sea takes Larry.'],
  lava: ['CRISPY!', 'Lava is not a floor.'],
  spikes: ['IMPALED!', 'Watch the plates.'],
  flame: ['ROASTED!', 'Time the vents.'],
};

function die(kind) {
  if (G.state !== 'play') return;
  G.state = 'dying'; G.stateT = 0; G.deathKind = kind;
  const [a, b] = DEATHS[kind];
  showToast(`${a}<small>${b}</small>`, 1.7, 'death');
  sfx.death(); larry.scream(1.6);
  if (kind === 'lava' || kind === 'flame' || kind === 'abyss') sfx.sizzle();
  if (kind === 'splat') { larry.squash = 0.35; sfx.clank(12); }
  player.vx = player.vz = 0;
}

function maybeScream(force = false) {
  if (G.screamCD > 0 && !force) return;
  const d = sfx.scream(0.8 + Math.random() * 0.4) || 0.8;
  larry.scream(d + 0.2);
  G.screamCD = 1.4 + Math.random() * 2.2;
}

function steer() {
  const r = input.read();
  if (!r) return [0, 0];
  const w = SCREEN_RIGHT.clone().multiplyScalar(r.x).addScaledVector(SCREEN_UP, -r.y);
  return [w.x * r.mag, w.z * r.mag];
}

function stepPlay(dt) {
  G.time -= dt;
  if (G.time <= 0) { G.time = 0; updateHud(); gameOver(); return; }
  if (G.time < 10 && Math.ceil(G.time) !== G.lastTick) { G.lastTick = Math.ceil(G.time); sfx.tick(); }

  const [ix, iz] = steer();
  const SUB = 4, h = dt / SUB;
  for (let s = 0; s < SUB && G.state === 'play'; s++) {
    const ev = player.step(G.world, h, ix, iz);
    if (ev.wallHit > 4) { sfx.clank(ev.wallHit); if (ev.wallHit > 7) maybeScream(true); }
    if (ev.landed >= 0) {
      if (ev.landed > FATAL_FALL) { die('splat'); break; }
      if (ev.landed > 0.8) { sfx.clank(ev.landed * 4); if (ev.landed > 1.5) maybeScream(true); }
    }
    if (ev.abyss) { die('abyss'); break; }
    for (const o of G.orbs) {
      if (o.dead) continue;
      const hit = collideBodies(player, o.body, 1, 1.4);
      if (hit > 3) { sfx.orbHit(); maybeScream(true); }
    }
  }
  if (G.state !== 'play') return;

  const cell = player.grounded ? player.support : null;
  if (cell) {
    if (cell.kind === 'lava') return die('lava');
    if (cell.kind === 'bone') G.bones.find((b) => b.cell === cell)?.touch();
  }
  for (const tr of G.traps) {
    if (tr.deadly && cell === tr.cell) return die(tr.type);
  }
  // hooks: a hard shove in the direction of the swing
  G.hookCD -= dt;
  const cx = player.x, cy = player.y + player.r, cz = player.z;
  for (const hk of G.hooks) {
    const d = Math.hypot(hk.tip.x - cx, hk.tip.y - cy, hk.tip.z - cz);
    if (d < player.r + 0.45 && G.hookCD <= 0) {
      const nx = (cx - hk.tip.x) / d, nz = (cz - hk.tip.z) / d;
      player.vx += hk.vel.x * 1.1 + nx * 5; player.vz += hk.vel.z * 1.1 + nz * 5;
      if (player.grounded) { player.grounded = false; player.vy = 4; player.peakY = player.y; }
      G.hookCD = 0.5; sfx.hook(); maybeScream(true);
    }
  }
  for (const c of G.checkpoints) {
    if (!c.active && Math.hypot(c.pos.x - player.x, c.pos.z - player.z) < 1.3 && Math.abs(c.pos.y - player.y) < 1) {
      G.checkpoints.forEach((o) => { if (o !== c && o.active) o.active = false; });
      c.activate(); sfx.checkpoint(); showToast('CHECKPOINT', 1);
    }
  }
  for (const b of G.boxes) {
    if (!b.taken && Math.hypot(b.pos.x - player.x, b.pos.z - player.z) < 1.4 && Math.abs(b.pos.y - player.y) < 1.5) {
      b.taken = true; G.time += BOX_TIME; G.score += 500; sfx.pickup(); showToast(`+${BOX_TIME}s<small>Lament box: +500</small>`, 1.2);
    }
  }
  // soul orbs roll after Larry when he is near and on their level
  for (const o of G.orbs) {
    if (o.dead) { o.dead -= dt; if (o.dead <= 0) resetOrb(o); continue; }
    const b = o.body, dx = player.x - b.x, dz = player.z - b.z, dist = Math.hypot(dx, dz);
    let ax = 0, az = 0;
    if (dist < 16 && Math.abs(player.y - b.y) < 3) { ax = dx / dist; az = dz / dist; }
    for (let s = 0; s < SUB; s++) { if (b.step(G.world, h, ax, az).abyss) { o.dead = 4; o.mesh.group.visible = false; break; } }
    o.mesh.group.position.set(b.x, b.y + b.r, b.z);
    o.mesh.face.rotation.y = Math.atan2(dx, dz);
  }
  const m = G.mouth.pos;
  if (Math.hypot(m.x - player.x, m.z - player.z) < 1.5 && Math.abs(m.y - player.y) < 1) {
    G.state = 'win'; G.stateT = 0; sfx.portal(); maybeScream(true);
    G.score += 250;
  }
  // screams: often, and more often the faster the cage spins
  G.screamCD -= dt * (0.4 + Math.min(1.6, player.speed / 6));
  if (player.speed > 4.5) maybeScream();
  G.score += Math.floor(player.speed * dt * 3);
}

function update(dt) {
  G.t += dt;
  const t = G.t;
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toast.classList.remove('show'); }
  if (!G.world) return;
  if (G.state === 'paused') return;

  if (G.state === 'intro') {
    G.stateT += dt;
    if (G.stateT > 1.2 || input.read()) G.state = 'play';
  } else if (G.state === 'play') {
    stepPlay(dt);
  } else if (G.state === 'dying') {
    G.stateT += dt; G.time -= dt; // the sands run while Larry dies
    if (G.deathKind === 'abyss' || G.deathKind === 'lava') { player.y -= dt * 3; larry.man.visible = G.stateT < 0.6; }
    if (G.stateT > 1.8) { G.state = 'play'; respawn(false); G.time = Math.max(0.5, G.time); }
  } else if (G.state === 'win') {
    G.stateT += dt;
    const m = G.mouth.pos, k = Math.min(1, G.stateT / 1.3);
    player.x += (m.x - player.x) * Math.min(1, dt * 5); player.z += (m.z - player.z) * Math.min(1, dt * 5);
    player.y = m.y - k * 2.5; player.vx = Math.cos(t * 12) * 6; player.vz = Math.sin(t * 12) * 6;
    larry.root.scale.setScalar(1 - k * 0.9);
    if (G.stateT > 1.5) { larry.root.visible = false; levelDone(); }
  }

  const playing = G.state === 'play' || G.state === 'intro';
  G.world.update(t);
  for (const b of G.bones) if (b.update(dt)) sfx.crumble();
  for (const tr of G.traps) tr.update(t);
  for (const hk of G.hooks) hk.update(t);
  for (const c of G.checkpoints) c.update(t, dt);
  for (const b of G.boxes) b.update(t);
  for (const c of G.chains) c.update(t);
  for (const tc of G.torches) tc.update(t);
  G.mouth.update(t, dt); G.embers.update(dt);

  if (G.state !== 'win') larry.update(dt, player, playing || G.state === 'dying');
  else larry.root.position.set(player.x, player.y + larry.r, player.z);
  sfx.setRoll(playing ? player.speed : 0, player.grounded);

  // blob shadow on whatever is below
  const gh = G.world.heightAt(player.x, player.z);
  shadow.visible = gh !== null && larry.root.visible && player.y - gh < 12;
  if (shadow.visible) {
    const k = Math.max(0.3, 1 - (player.y - gh) / 10);
    shadow.position.set(player.x, gh + 0.05, player.z); shadow.scale.setScalar(k);
    shadow.material.opacity = k;
  }

  fill.position.set(player.x + 1.5, player.y + 3, player.z + 1.5);
  // camera eases after Larry; it stops following him into the abyss
  const ty = G.state === 'dying' ? camTarget.y : player.y;
  camTarget.x += (player.x - camTarget.x) * Math.min(1, dt * 4);
  camTarget.z += (player.z - camTarget.z) * Math.min(1, dt * 4);
  camTarget.y += (ty - camTarget.y) * Math.min(1, dt * 3);
  placeCamera();

  // hand the real lights to the torches nearest Larry
  const near = G.torches.map((tc) => [tc, (tc.pos.x - player.x) ** 2 + (tc.pos.z - player.z) ** 2 + (tc.pos.y - player.y) ** 2])
    .sort((a, b) => a[1] - b[1]);
  lightPool.forEach((l, k) => {
    const e = near[k];
    if (!e) { l.intensity = 0; return; }
    l.position.copy(e[0].lightPos);
    l.intensity = 70 * (0.85 + 0.15 * Math.sin(t * 13 + k * 2) + 0.08 * Math.sin(t * 31 + k));
  });
  updateHud();
}

function drawOverlay() {
  octx.clearRect(0, 0, innerWidth, innerHeight);
  if (G.state === 'play' || G.state === 'intro') input.draw(octx, G.t < 12 && G.levelIdx === 0);
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  update(dt);
  if (G.state === 'title' && G.world) { // slow attract-mode pan over the level
    const a = G.t * 0.15;
    camTarget.set(G.level.W * T * (0.5 + 0.25 * Math.sin(a)), G.world.maxH - 4, G.level.D * T * (0.5 + 0.25 * Math.cos(a * 0.7)));
    placeCamera();
  }
  renderer.render(scene, camera);
  drawOverlay();
  requestAnimationFrame(frame);
}

loadLevel(0); G.state = 'title'; G.time = 0;
titleCard();
requestAnimationFrame(frame);

// test hook for automated checks
window.__game = { G, player, loadLevel, startGame, die, camera, larry };
