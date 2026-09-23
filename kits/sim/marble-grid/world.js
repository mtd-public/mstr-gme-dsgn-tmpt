import * as THREE from 'three';
import { flagstoneTexture, brickTexture } from './textures.js';

// The labyrinth is a grid of square cells. Every solid cell carries a plane,
// h(x, z) = c + sx*x + sz*z (world units), so flat floors and ramps share one
// representation and the physics can ask "how high is the ground here?".
export const T = 2;          // cell size in world units
export const STEP = 0.25;    // a rise taller than this is a wall

export class World {
  constructor(def) {
    this.W = def.W; this.D = def.D;
    this.cells = def.cells;            // array W*D of cell|null
    this.minH = Infinity; this.maxH = -Infinity;
    for (const c of this.cells) if (c) {
      for (const [x, z] of this._corners(c)) {
        const h = this.planeAt(c, x, z);
        this.minH = Math.min(this.minH, h); this.maxH = Math.max(this.maxH, h);
      }
    }
    this.lavaY = this.minH - 9;       // the burning sea under everything
    this.bottomY = this.lavaY - 1;
    this.abyssY = this.lavaY + 0.4;
  }

  cell(i, j) {
    if (i < 0 || j < 0 || i >= this.W || j >= this.D) return null;
    const c = this.cells[j * this.W + i];
    return c && !c.gone ? c : null;
  }
  cellAtXZ(x, z) { return this.cell(Math.floor(x / T), Math.floor(z / T)); }
  planeAt(c, x, z) { return c.c + c.sx * x + c.sz * z; }
  heightAt(x, z) {
    const c = this.cellAtXZ(x, z);
    return c ? this.planeAt(c, x, z) : null;
  }
  _corners(c) {
    const x0 = c.i * T, z0 = c.j * T;
    return [[x0, z0], [x0 + T, z0], [x0 + T, z0 + T], [x0, z0 + T]];
  }
  center(i, j) { return new THREE.Vector3((i + 0.5) * T, 0, (j + 0.5) * T); }
  surfaceAt(i, j) {
    const p = this.center(i, j);
    const c = this.cells[j * this.W + i];
    p.y = c ? this.planeAt(c, p.x, p.z) : 0;
    return p;
  }

  // ---------------------------------------------------------------- meshes
  build(scene) {
    const floorTex = flagstoneTexture(), wallTex = brickTexture();
    this.floorMat = new THREE.MeshLambertMaterial({ map: floorTex, vertexColors: true });
    this.wallMat = new THREE.MeshLambertMaterial({ map: wallTex, vertexColors: true });
    const top = new Geo(), side = new Geo(), lava = new Geo();
    const tint = (c) => {
      const base = { stone: [1, 0.95, 0.9], ramp: [0.62, 0.56, 0.54], wall: [0.72, 0.6, 0.58],
        goal: [0.95, 0.55, 0.45], bone: [1, 1, 1] }[c.kind] || [1, 1, 1];
      const n = 0.92 + ((c.i * 73 + c.j * 151) % 17) / 17 * 0.12;
      return base.map((v) => v * n);
    };
    const span = (this.maxH - this.bottomY) || 1;
    const shade = (y) => 0.22 + 0.78 * Math.max(0, (y - this.bottomY) / span) ** 1.5;

    for (const c of this.cells) {
      if (!c || c.kind === 'bone') continue; // crumbling slabs are their own meshes
      const [a, b, cc, d] = this._corners(c);
      const H = (p) => this.planeAt(c, p[0], p[1]);
      const tgt = c.kind === 'lava' ? lava : top;
      const col = tint(c);
      tgt.quad(
        [a[0], H(a), a[1]], [d[0], H(d), d[1]], [cc[0], H(cc), cc[1]], [b[0], H(b), b[1]],
        [0, 1, 0], [col, col, col, col],
        [[a[0] / T, a[1] / T], [d[0] / T, d[1] / T], [cc[0] / T, cc[1] / T], [b[0] / T, b[1] / T]]
      );
      // side faces: four edges, outward normal n, neighbour offset
      const edges = [
        [a, b, [0, 0, -1], 0, -1], [b, cc, [1, 0, 0], 1, 0],
        [cc, d, [0, 0, 1], 0, 1], [d, a, [-1, 0, 0], -1, 0],
      ];
      for (const [p, q, n, di, dj] of edges) {
        const nb = this.cells[(c.j + dj) * this.W + (c.i + di)];
        const inside = c.i + di >= 0 && c.j + dj >= 0 && c.i + di < this.W && c.j + dj < this.D;
        const hp = H(p), hq = H(q);
        let bp = this.bottomY, bq = this.bottomY;
        if (inside && nb && nb.kind !== 'bone') {
          bp = Math.min(hp, this.planeAt(nb, p[0], p[1]));
          bq = Math.min(hq, this.planeAt(nb, q[0], q[1]));
          if (hp - bp < 1e-3 && hq - bq < 1e-3) continue;
        }
        const u0 = (p[0] + p[1]) / T, u1 = (q[0] + q[1]) / T;
        const sp = [shade(hp), shade(bp), shade(bq), shade(hq)].map((k) => [k * col[0], k * col[1], k * col[2]]);
        side.quad(
          [p[0], hp, p[1]], [p[0], bp, p[1]], [q[0], bq, q[1]], [q[0], hq, q[1]],
          n, sp, [[u0, hp / T], [u0, bp / T], [u1, bq / T], [u1, hq / T]]
        );
      }
    }
    this.group = new THREE.Group();
    this.group.add(new THREE.Mesh(top.geometry(), this.floorMat));
    this.group.add(new THREE.Mesh(side.geometry(), this.wallMat));
    if (lava.count) {
      this.lavaTileMat = makeLavaMaterial(0.9);
      this.group.add(new THREE.Mesh(lava.geometry(), this.lavaTileMat));
    }
    // the sea of fire below
    const cx = this.W * T / 2, cz = this.D * T / 2, R = Math.max(this.W, this.D) * T * 3;
    this.lavaMat = makeLavaMaterial(0.55, 0.5);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(R, R), this.lavaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.set(cx, this.lavaY, cz);
    this.group.add(sea);
    scene.add(this.group);
  }

  update(t) {
    this.lavaMat.uniforms.uTime.value = t;
    if (this.lavaTileMat) this.lavaTileMat.uniforms.uTime.value = t;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

// Minimal non-indexed geometry accumulator. Each quad is wound so its face
// normal matches the requested outward direction.
class Geo {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.uv = []; this.count = 0; }
  quad(p0, p1, p2, p3, n, cols, uvs) {
    const e1 = sub(p1, p0), e2 = sub(p2, p0);
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    let idx = [0, 1, 2, 0, 2, 3];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) idx = [0, 2, 1, 0, 3, 2];
    const P = [p0, p1, p2, p3];
    // true face normal (ramps tilt), falling back to n for degenerate tris
    let fn = cr; const L = Math.hypot(...cr);
    fn = L > 1e-6 ? fn.map((v) => v / L) : n;
    if (fn[0] * n[0] + fn[1] * n[1] + fn[2] * n[2] < 0) fn = fn.map((v) => -v);
    for (const k of idx) {
      this.pos.push(...P[k]); this.nor.push(...fn); this.col.push(...cols[k]); this.uv.push(...uvs[k]);
    }
    this.count++;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// Flowing, self-lit lava: layered value noise, domain-warped by time.
export function makeLavaMaterial(scale, bright = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: scale }, uBright: { value: bright } },
    vertexShader: `
      varying vec2 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uScale; uniform float uBright;
      varying vec2 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
      void main() {
        vec2 p = vW * 0.12 * uScale;
        vec2 q = vec2(fbm(p + uTime * 0.05), fbm(p + vec2(5.2, 1.3) - uTime * 0.04));
        float f = fbm(p * 1.6 + q * 2.5 + uTime * 0.03);
        float crust = uBright < 0.99 ? smoothstep(0.2, 0.32, f) : smoothstep(0.42, 0.6, f);
        vec3 hot = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.35, 0.03), smoothstep(0.1, 0.45, f));
        vec3 col = mix(hot, vec3(0.13, 0.03, 0.02), crust);
        col *= 0.85 + 0.25 * sin(uTime * 1.7 + f * 9.0);
        gl_FragColor = vec4(col * uBright, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
