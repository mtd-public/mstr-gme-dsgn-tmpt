import * as THREE from 'three';
import { T } from './world.js';
import { runeTexture, glowTexture } from './textures.js';

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const IRON = lambert(0x2a2422);
const glow = glowTexture('rgba(255,210,120,1)', 'rgba(255,60,0,0)');
const redGlow = glowTexture('rgba(255,80,40,1)', 'rgba(120,0,0,0)');
const add = (map, color = 0xffffff, opacity = 1) => new THREE.SpriteMaterial({
  map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

// A cluster of additive sprites that flickers like fire.
class Flame {
  constructor(size = 1) {
    this.group = new THREE.Group(); this.size = size; this.parts = [];
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(add(glow, k ? 0xff7a20 : 0xffe0a0, k ? 0.8 : 1));
      this.group.add(s); this.parts.push({ s, ph: Math.random() * 6, k });
    }
    const halo = new THREE.Sprite(add(redGlow, 0xff5010, 0.35));
    halo.scale.setScalar(size * 3.2); this.group.add(halo); this.halo = halo;
  }
  update(t, intensity = 1) {
    for (const p of this.parts) {
      const f = 0.8 + 0.25 * Math.sin(t * 17 + p.ph) + 0.15 * Math.sin(t * 29 + p.ph * 2);
      const sz = this.size * (p.k ? 0.7 : 0.45) * f * intensity;
      p.s.scale.set(sz, sz * 1.5, 1);
      p.s.position.set(Math.sin(t * 7 + p.ph) * 0.05 * this.size, (0.2 + p.k * 0.18) * this.size * f * intensity, 0);
    }
    this.halo.material.opacity = 0.3 * intensity * (0.85 + 0.15 * Math.sin(t * 11));
  }
}

// Standing brazier on top of a wall block. Real lights come from a pool.
export class Torch {
  constructor(pos) {
    this.pos = pos.clone();
    this.group = new THREE.Group(); this.group.position.copy(pos);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.2, 6), IRON); post.position.y = 0.6;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.18, 0.3, 8, 1, true), IRON); bowl.position.y = 1.3;
    bowl.material = new THREE.MeshLambertMaterial({ color: 0x2a2422, side: THREE.DoubleSide });
    const coals = new THREE.Mesh(new THREE.CircleGeometry(0.38, 8), new THREE.MeshBasicMaterial({ color: 0xff5a10 }));
    coals.rotation.x = -Math.PI / 2; coals.position.y = 1.4;
    for (let k = 0; k < 4; k++) { // horns on the bowl
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5), IRON);
      const a = k * Math.PI / 2 + Math.PI / 4;
      horn.position.set(Math.cos(a) * 0.42, 1.55, Math.sin(a) * 0.42);
      horn.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      this.group.add(horn);
    }
    this.flame = new Flame(1.3); this.flame.group.position.y = 1.4;
    this.group.add(post, bowl, coals, this.flame.group);
    this.lightPos = pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    this.ph = Math.random() * 10;
  }
  update(t) { this.flame.update(t + this.ph); }
}

// The exit: a swirling hellmouth in the floor ringed by fangs, with a pillar
// of red light so you can find it from across the level.
export class Hellmouth {
  constructor(pos) {
    this.pos = pos.clone();
    this.group = new THREE.Group(); this.group.position.copy(pos);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } }, transparent: true,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
          float a = atan(p.y, p.x);
          float sw = sin(a * 5.0 + r * 14.0 - uTime * 5.0) * 0.5 + 0.5;
          float sw2 = sin(a * 3.0 - r * 9.0 + uTime * 3.0) * 0.5 + 0.5;
          vec3 col = mix(vec3(1.0, 0.75, 0.2), vec3(0.8, 0.05, 0.0), r);
          col = mix(col, vec3(0.05, 0.0, 0.0), smoothstep(0.35, 0.9, sw * sw2 + r * 0.4));
          col *= smoothstep(0.0, 0.25, r) * 0.6 + 0.4;       // the throat
          col = mix(vec3(0.0), col, smoothstep(0.05, 0.3, r));
          gl_FragColor = vec4(col * 1.4, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 40), this.mat);
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; this.disc = disc;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.22, 6, 28), lambert(0x3a2a24));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.1;
    this.group.add(disc, rim);
    const fang = new THREE.ConeGeometry(0.16, 0.7, 5), bone = lambert(0xe8dcc0);
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, f = new THREE.Mesh(fang, bone);
      f.position.set(Math.cos(a) * 1.85, 0.35, Math.sin(a) * 1.85);
      f.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      this.group.add(f);
    }
    // beacon: open cylinder with a vertical fade
    const bc = document.createElement('canvas'); bc.width = 4; bc.height = 128;
    const g = bc.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,40,0,0)'); gr.addColorStop(1, 'rgba(255,60,10,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 14, 20, 1, true),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 7; this.group.add(beam); this.beam = beam;
    this.light = new THREE.PointLight(0xff3010, 30, 16, 1.6); this.light.position.y = 2;
    this.group.add(this.light);
    this.embers = new Embers(40, 1.6, 7, 0xff6a20); this.group.add(this.embers.points);
  }
  update(t, dt) {
    this.mat.uniforms.uTime.value = t;
    this.light.intensity = 26 + Math.sin(t * 6) * 6;
    this.beam.material.opacity = 0.8 + 0.2 * Math.sin(t * 2);
    this.embers.update(dt);
  }
}

// Rising sparks inside a cylinder.
export class Embers {
  constructor(n, radius, height, color, size = 0.22) {
    this.n = n; this.radius = radius; this.height = height;
    this.pos = new Float32Array(n * 3); this.speed = new Float32Array(n);
    for (let i = 0; i < n; i++) this._reset(i, Math.random() * height);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: glow, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    this.points.frustumCulled = false;
  }
  _reset(i, y = 0) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * this.radius;
    this.pos[i * 3] = Math.cos(a) * r; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = Math.sin(a) * r;
    this.speed[i] = 0.8 + Math.random() * 2.2;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.pos[i * 3 + 1] += this.speed[i] * dt;
      this.pos[i * 3] += Math.sin(this.pos[i * 3 + 1] * 2 + i) * dt * 0.3;
      if (this.pos[i * 3 + 1] > this.height) this._reset(i);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// Rune circle on the floor. Rolling over it makes it your respawn point.
export class Checkpoint {
  constructor(pos, i, j) {
    this.pos = pos.clone(); this.i = i; this.j = j; this.active = false;
    this.mat = new THREE.MeshBasicMaterial({ map: runeTexture('#ff5a1f'), transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.95, T * 0.95), this.mat);
    this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.copy(pos); this.mesh.position.y += 0.04;
    this.flash = 0;
  }
  activate() { this.active = true; this.flash = 1; }
  update(t, dt) {
    this.flash = Math.max(0, this.flash - dt);
    this.mat.opacity = this.active ? 0.75 + 0.2 * Math.sin(t * 4) + this.flash : 0.3 + 0.08 * Math.sin(t * 2);
    this.mesh.rotation.z = t * (this.active ? 0.6 : 0.15);
  }
}

// The Lament Configuration: a golden puzzle box. +time.
let lamentTex = null;
function lamentTexture() {
  if (lamentTex) return lamentTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c8962e'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#1a0e06'; g.fillRect(10, 10, 108, 108);
  g.fillStyle = '#d9a83a'; g.fillRect(16, 16, 96, 96);
  g.strokeStyle = '#1a0e06'; g.lineWidth = 5;
  g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(64, 16); g.lineTo(64, 112); g.moveTo(16, 64); g.lineTo(112, 64); g.stroke();
  g.beginPath(); g.moveTo(16, 16); g.lineTo(112, 112); g.moveTo(112, 16); g.lineTo(16, 112); g.lineWidth = 3; g.stroke();
  lamentTex = new THREE.CanvasTexture(c); lamentTex.colorSpace = THREE.SRGBColorSpace;
  return lamentTex;
}
export class LamentBox {
  constructor(pos) {
    this.pos = pos.clone(); this.taken = false;
    this.group = new THREE.Group(); this.group.position.copy(pos);
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshPhongMaterial({ map: lamentTexture(), specular: 0xffd080, shininess: 90, emissive: 0x3a2000 }));
    const halo = new THREE.Sprite(add(glow, 0xffc050, 0.5)); halo.scale.setScalar(1.8);
    this.group.add(this.cube, halo);
  }
  update(t) {
    if (this.taken) { this.group.visible = false; return; }
    this.group.visible = true;
    this.cube.position.y = 1.1 + Math.sin(t * 2.5) * 0.15;
    this.cube.rotation.set(t * 0.9, t * 1.3, 0);
    this.group.children[1].position.y = this.cube.position.y;
  }
}

// A black soul orb with burning eyes. Its physics body lives in main.js.
export class OrbMesh {
  constructor(r) {
    this.group = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14),
      new THREE.MeshPhongMaterial({ color: 0x0a0808, specular: 0x886655, shininess: 100 }));
    this.face = new THREE.Group();
    const eye = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 8, 6), eye);
      e.position.set(s * r * 0.33, r * 0.2, r * 0.9); e.scale.z = 0.4; this.face.add(e);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * 0.25, r * 0.06, 4, 10, Math.PI), eye);
    mouth.position.set(0, -r * 0.2, r * 0.92); mouth.rotation.z = Math.PI; this.face.add(mouth);
    const halo = new THREE.Sprite(add(redGlow, 0xff2000, 0.35)); halo.scale.setScalar(r * 3.5);
    this.group.add(ball, this.face, halo);
  }
}

// Hellraiser hook on a chain, swinging like a pendulum across the path.
export class Hook {
  constructor(pos, axis, phase) {
    this.axis = axis; this.L = 6.2; this.amp = 0.95; this.period = 2.8; this.phase = phase;
    this.pivot = pos.clone(); this.pivot.y += 7.0;
    this.group = new THREE.Group(); this.group.position.copy(this.pivot);
    const link = new THREE.TorusGeometry(0.13, 0.035, 4, 8), steel = new THREE.MeshPhongMaterial({ color: 0x55504c, specular: 0xbbbbbb, shininess: 70 });
    for (let k = 0; k < 22; k++) {
      const m = new THREE.Mesh(link, steel);
      m.position.y = -k * 0.24 - 0.1; m.rotation.y = k % 2 ? Math.PI / 2 : 0; this.group.add(m);
    }
    // the hook itself: a thick arc with a barbed point
    const hook = new THREE.Group(); hook.position.y = -this.L;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 14, Math.PI * 1.3), steel);
    arc.rotation.z = Math.PI * 0.85; arc.position.y = 0.05;
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), steel); shank.position.set(-0.32, 0.45, 0);
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 5), steel);
    barb.position.set(0.3, 0.26, 0); barb.rotation.z = -0.2;
    hook.add(arc, shank, barb);
    if (axis === 'z') hook.rotation.y = Math.PI / 2;
    this.group.add(hook);
    this.tip = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.update(0);
  }
  angle(t) { return this.amp * Math.sin((t / this.period) * Math.PI * 2 + this.phase); }
  update(t) {
    const th = this.angle(t), w = this.amp * Math.cos((t / this.period) * Math.PI * 2 + this.phase) * Math.PI * 2 / this.period;
    const s = Math.sin(th), c = Math.cos(th);
    if (this.axis === 'x') {
      this.group.rotation.set(0, 0, th);
      this.tip.set(this.pivot.x + this.L * s, this.pivot.y - this.L * c, this.pivot.z);
      this.vel.set(this.L * c * w, this.L * s * w, 0);
    } else {
      this.group.rotation.set(-th, 0, 0);
      this.tip.set(this.pivot.x, this.pivot.y - this.L * c, this.pivot.z + this.L * s);
      this.vel.set(0, this.L * s * w, this.L * c * w);
    }
  }
}

// Spike plates and flame vents: deadly on a timer, with a warning shimmer.
export class Trap {
  constructor(pos, type, phase) {
    this.type = type; this.pos = pos.clone(); this.phase = phase;
    this.period = type === 'spikes' ? 2.6 : 3.0; this.upFrac = type === 'spikes' ? 0.4 : 0.38;
    this.group = new THREE.Group(); this.group.position.copy(pos);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(T * 0.9, 0.06, T * 0.9), lambert(0x1c1614));
    plate.position.y = 0.03; this.group.add(plate);
    this.level = 0; this.deadly = false;
    if (type === 'spikes') {
      this.spikes = new THREE.Group();
      const cone = new THREE.ConeGeometry(0.12, 0.9, 5), steel = new THREE.MeshPhongMaterial({ color: 0x8a8480, specular: 0xffffff, shininess: 80 });
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const s = new THREE.Mesh(cone, steel); s.position.set(a * 0.55, 0.45, b * 0.55); this.spikes.add(s);
      }
      this.group.add(this.spikes);
    } else {
      const grate = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10), new THREE.MeshBasicMaterial({ color: 0x401000 }));
      grate.rotation.x = -Math.PI / 2; grate.position.y = 0.07; this.grate = grate; this.group.add(grate);
      this.fire = new Flame(1.2); this.group.add(this.fire.group);
      this.column = [];
      for (let k = 0; k < 5; k++) { const f = new Flame(1.3 - k * 0.1); f.group.position.y = k * 0.7; this.fire.group.add(f.group); this.column.push(f); }
    }
  }
  update(t) {
    const u = (((t + this.phase) % this.period) + this.period) % this.period / this.period;
    const warn = u > 1 - 0.18;              // about to fire
    const up = u < this.upFrac;
    const target = up ? 1 : 0;
    this.level += (target - this.level) * (up ? 0.5 : 0.15);
    this.deadly = this.level > 0.55;
    if (this.type === 'spikes') {
      this.spikes.position.y = -0.85 + this.level * 0.85 + (warn ? Math.sin(t * 60) * 0.04 + 0.1 : 0);
      this.spikes.visible = this.spikes.position.y > -0.8;
    } else {
      this.fire.group.visible = this.level > 0.05;
      this.fire.update(t, 0.2 + this.level);
      this.column.forEach((f, k) => { f.update(t + k, this.level); f.group.visible = this.level > 0.3; });
      this.grate.material.color.setHex(warn || up ? 0xff5010 : 0x401000);
    }
  }
}

// A slab of lashed-together bones: crumbles a moment after Larry rolls on.
let boneTex = null;
function boneTexture() {
  if (boneTex) return boneTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a2c20'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 7; k++) {
    const y = 8 + k * 17;
    g.fillStyle = k % 2 ? '#d8ccb0' : '#c9b994';
    g.fillRect(8, y, 112, 10);
    g.beginPath(); g.arc(8, y + 5, 7, 0, Math.PI * 2); g.arc(120, y + 5, 7, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#5a3a20'; g.fillRect(30, 0, 5, 128); g.fillRect(93, 0, 5, 128);
  boneTex = new THREE.CanvasTexture(c); boneTex.colorSpace = THREE.SRGBColorSpace;
  return boneTex;
}
export class BoneSlab {
  constructor(cell, y) {
    this.cell = cell; this.y = y; this.timer = -1; this.fallV = 0;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(T * 0.98, 0.5, T * 0.98), new THREE.MeshLambertMaterial({ map: boneTexture() }));
    this.reset();
  }
  reset() {
    this.cell.gone = false; this.timer = -1; this.fallV = 0;
    this.mesh.visible = true;
    this.mesh.position.set((this.cell.i + 0.5) * T, this.y - 0.25, (this.cell.j + 0.5) * T);
    this.mesh.rotation.set(0, 0, 0);
  }
  touch() { if (this.timer < 0) this.timer = 0.55; }
  // returns true on the frame it gives way
  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      this.mesh.position.x = (this.cell.i + 0.5) * T + Math.sin(this.timer * 90) * 0.05;
      if (this.timer <= 0) { this.cell.gone = true; this.timer = 0; return true; }
    } else if (this.timer === 0 && this.mesh.visible) {
      this.fallV += 26 * dt; this.mesh.position.y -= this.fallV * dt;
      this.mesh.rotation.x += dt * 1.5; this.mesh.rotation.z += dt;
      if (this.mesh.position.y < this.y - 30) this.mesh.visible = false;
    }
    return false;
  }
}

export function skullPile(pos) {
  const g = new THREE.Group(); g.position.copy(pos);
  const bone = lambert(0xd9ccae), dark = new THREE.MeshBasicMaterial({ color: 0x100806 });
  const spots = [[0, 0, 0], [0.35, 0, 0.1], [-0.3, 0, 0.2], [0.05, 0.3, 0.1], [0.1, 0, -0.35]];
  for (const [x, y, z] of spots) {
    const s = new THREE.Group(); s.position.set(x, y + 0.17, z); s.rotation.y = Math.random() * 6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), bone); head.scale.y = 0.9;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.12), bone); jaw.position.set(0, -0.14, 0.07);
    s.add(head, jaw);
    for (const e of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), dark); eye.position.set(e * 0.07, 0.02, 0.15); s.add(eye); }
    g.add(s);
  }
  return g;
}

// Decorative chain hanging out of the darkness with a hook on the end.
export class HangingChain {
  constructor(pos) {
    this.group = new THREE.Group(); this.group.position.copy(pos); this.group.position.y += 12;
    const link = new THREE.TorusGeometry(0.12, 0.03, 4, 8), steel = lambert(0x4a4440);
    for (let k = 0; k < 34; k++) {
      const m = new THREE.Mesh(link, steel); m.position.y = -k * 0.22; m.rotation.y = k % 2 ? Math.PI / 2 : 0;
      this.group.add(m);
    }
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 5, 10, Math.PI * 1.3), steel);
    hk.position.y = -34 * 0.22 - 0.2; hk.rotation.z = Math.PI * 0.85; this.group.add(hk);
    this.ph = Math.random() * 6;
  }
  update(t) { this.group.rotation.z = Math.sin(t * 0.7 + this.ph) * 0.06; this.group.rotation.x = Math.cos(t * 0.5 + this.ph) * 0.04; }
}
