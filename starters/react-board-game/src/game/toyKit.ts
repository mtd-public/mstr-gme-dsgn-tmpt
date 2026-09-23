/**
 * Toy-ink three.js kit, extracted from splashy-fish scene3d.ts (itself after
 * gig-ambulance's Blender kit and space-lion's space-assets.js):
 *
 *   - toy(color): soft smooth-shaded "toy plastic" MeshStandardMaterial
 *   - rbox(): chunky bevelled box with a radius clamped so thin boxes stay valid
 *   - inked(geo, mat): mesh + inverted-hull ink outline + casts a shadow
 *   - shadowCatcher(): invisible plane that only shows soft drop shadows
 *   - gradientTexture(): cheap 2×256 canvas gradient for scene.background
 *
 * Outline recipe (the part people get wrong): the hull is a BACK-faced copy
 * pushed out along normals *in view space*, using a welded smooth-normal copy
 * of the geometry — otherwise hard edges (box caps, bevels) split the line
 * open. Cache one hull per geometry.
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const TOY = {
  ink: 0x3b2e5a,
  cream: 0xfffdf8,
  lav: 0xdccbf7,
  purple: 0x6e5ac8,
  yellow: 0xffd45e,
  gold: 0xffc53a,
  red: 0xee4b5e,
  green: 0x3ddc84,
  pink: 0xff9fbd,
  navy: 0x3a4572,
  road: 0x4b4959,
  grass: 0x4cc79a,
  blush: 0xff93a8,
  eye: 0x2a2433,
} as const

export function toy(color: number, extra?: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra })
}

export function rbox(w: number, h: number, d: number, radius: number) {
  const r = Math.max(0.01, Math.min(radius, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01))
  return new RoundedBoxGeometry(w, h, d, 3, r)
}

export function ball(r: number) {
  return new THREE.SphereGeometry(r, 20, 14)
}

export function makeOutlineMaterial(color: number = TOY.ink, thickness = 0.05) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, thickness: { value: thickness } },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += normalize(normalMatrix * normal) * thickness;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
  })
}

const hulls = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>()

export function hullOf(geometry: THREE.BufferGeometry) {
  let hull = hulls.get(geometry)
  if (!hull) {
    const bare = new THREE.BufferGeometry()
    bare.setAttribute('position', geometry.getAttribute('position'))
    if (geometry.index) bare.setIndex(geometry.index)
    hull = mergeVertices(bare, 1e-3)
    hull.computeVertexNormals()
    hulls.set(geometry, hull)
  }
  return hull
}

/** A mesh with an ink outline that casts a soft shadow. */
export function inked(geometry: THREE.BufferGeometry, material: THREE.Material, outline: THREE.Material) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.add(new THREE.Mesh(hullOf(geometry), outline))
  return mesh
}

/** Details (eyes, blush, tips) skip the outline so they stay crisp. */
export function plain(geometry: THREE.BufferGeometry, material: THREE.Material) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  return mesh
}

/** Receives shadows, renders nothing else — the toy-diorama drop shadow. */
export function shadowCatcher(w: number, h: number, color: number = TOY.ink, opacity = 0.22) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShadowMaterial({ color, opacity }))
  m.receiveShadow = true
  return m
}

export function gradientTexture(stops: string[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 2, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  return texture
}

/** Free a subtree's geometries (materials are usually shared — dispose those yourself). */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.geometry.dispose()
  })
}
