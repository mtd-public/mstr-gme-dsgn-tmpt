import * as THREE from 'three';

// Larry: a damned soul in a loincloth and red beanie, strapped upright inside a
// riveted iron sphere cage (a human gyroscope). The cage rolls freely; Larry
// stays upright, turns toward where he is going, runs, and screams a lot.
export class Larry {
  constructor(r) {
    this.r = r;
    this.root = new THREE.Group();
    this.cage = new THREE.Group();
    this.man = new THREE.Group();
    this.root.add(this.cage, this.man);
    this._buildCage();
    this._buildMan();
    this.heading = 0; this.runPhase = 0; this.squash = 1;
  }

  _buildCage() {
    const r = this.r;
    const iron = new THREE.MeshPhongMaterial({ color: 0x2b2624, specular: 0x9a7c66, shininess: 60 });
    const band = new THREE.MeshPhongMaterial({ color: 0x3a2e28, specular: 0xc08050, shininess: 80 });
    const tube = r * 0.05;
    // six meridians
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 36), k % 3 ? iron : band);
      m.rotation.y = k * Math.PI / 6;
      this.cage.add(m);
    }
    // equator + two latitudes
    for (const lat of [0, 0.55, -0.55]) {
      const rr = r * Math.cos(lat);
      const m = new THREE.Mesh(new THREE.TorusGeometry(rr, tube * (lat ? 0.8 : 1.3), 6, 36), lat ? iron : band);
      m.rotation.x = Math.PI / 2; m.position.y = r * Math.sin(lat);
      this.cage.add(m);
    }
    // rivets where bands cross the equator
    const rivet = new THREE.SphereGeometry(tube * 1.6, 6, 4);
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6, m = new THREE.Mesh(rivet, band);
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      this.cage.add(m);
    }
    // pole hubs
    for (const s of [1, -1]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, tube * 3, 8), band);
      hub.position.y = s * r; this.cage.add(hub);
    }
  }

  _buildMan() {
    const r = this.r, m = this.man;
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const skin = mat(0xd9956c), skinDark = mat(0xb87552), hat = mat(0xd21c2c);
    const cloth = mat(0x7a5a3a), rope = mat(0x3b2616);
    const s = r / 0.8; // model authored for r = 0.8
    const box = (w, h, d, material) => new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s), material);
    // bare legs, hips pivot at y = -0.12 (sphere centre is the origin)
    this.legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.09 * s, -0.12 * s, 0);
      const leg = box(0.12, 0.46, 0.13, skin); leg.position.y = -0.23 * s; hip.add(leg);
      const foot = box(0.12, 0.06, 0.2, skinDark); foot.position.set(0, -0.47 * s, 0.04 * s); hip.add(foot);
      m.add(hip); this.legs.push(hip);
    }
    // bare torso with a hint of ribs
    const torso = box(0.34, 0.4, 0.2, skin); torso.position.y = 0.1 * s; m.add(torso);
    for (let k = 0; k < 3; k++) {
      const rib = box(0.26, 0.015, 0.01, skinDark); rib.position.set(0, (0.12 + k * 0.05) * s, 0.101 * s); m.add(rib);
    }
    // the loincloth: a rope belt, front and back flaps that flutter as he runs
    const belt = box(0.36, 0.05, 0.22, rope); belt.position.y = -0.1 * s; m.add(belt);
    this.flaps = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0, -0.12 * s, side * 0.11 * s);
      const flap = box(0.2, 0.3, 0.02, cloth); flap.position.y = -0.15 * s; pivot.add(flap);
      const hem = box(0.2, 0.03, 0.025, rope); hem.position.y = -0.29 * s; pivot.add(hem);
      m.add(pivot); this.flaps.push(pivot);
    }
    const wrap = box(0.35, 0.1, 0.21, cloth); wrap.position.y = -0.17 * s; m.add(wrap);
    // head, red beanie, eyes and a mouth that gapes when he screams
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 12, 10), skin);
    head.position.y = 0.44 * s; m.add(head);
    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat);
    beanie.position.y = 0.47 * s; m.add(beanie);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.145 * s, 0.145 * s, 0.05 * s, 12), hat);
    cuff.position.y = 0.48 * s; m.add(cuff);
    const dark = mat(0x111111);
    for (const side of [-1, 1]) {
      const e = box(0.03, 0.03, 0.02, dark); e.position.set(side * 0.05 * s, 0.46 * s, 0.12 * s); m.add(e);
    }
    this.mouth = box(0.07, 0.07, 0.02, mat(0x2a0505));
    this.mouth.position.set(0, 0.39 * s, 0.125 * s); m.add(this.mouth);
    // bare arms stretched out to grip the equator, like the photo
    this.arms = [];
    for (const side of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(side * 0.19 * s, 0.26 * s, 0);
      const arm = box(0.5, 0.09, 0.1, skin); arm.position.x = side * 0.25 * s; sh.add(arm);
      const hand = box(0.09, 0.09, 0.09, skinDark); hand.position.x = side * 0.52 * s; sh.add(hand);
      sh.rotation.z = side * -0.12;
      m.add(sh); this.arms.push(sh);
    }
    this.screaming = 0; // seconds of scream left (mouth open, bubble shown)
    this.bubble = makeBubble();
    this.bubble.position.y = r * 1.55;
    this.root.add(this.bubble);
  }

  scream(duration) { this.screaming = duration; this.bubble.material.map = pickBubble(); }

  // Roll the cage by the ground distance moved, face and animate Larry.
  update(dt, body, alive) {
    const vx = body.vx, vz = body.vz, sp = Math.hypot(vx, vz);
    if (alive && sp > 0.05) {
      const axis = new THREE.Vector3(vz, 0, -vx).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, sp * dt / this.r);
      this.cage.quaternion.premultiply(q);
    }
    if (sp > 0.6) {
      const target = Math.atan2(vx, vz);
      let d = target - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 8);
    }
    this.man.rotation.y = this.heading;
    // lean into the roll and pump the legs
    const lean = Math.min(0.35, sp * 0.03);
    this.man.quaternion.setFromEuler(new THREE.Euler(lean, this.heading, 0, 'YXZ'));
    this.runPhase += sp * dt * 2.2;
    const swing = Math.min(1, sp * 0.12) * 0.9;
    this.legs[0].rotation.x = Math.sin(this.runPhase) * swing;
    this.legs[1].rotation.x = -Math.sin(this.runPhase) * swing;
    const wobble = Math.sin(this.runPhase * 2) * 0.06 * Math.min(1, sp * 0.1);
    this.arms[0].rotation.z = 0.12 + wobble; this.arms[1].rotation.z = -0.12 - wobble;
    const flutter = Math.min(0.9, sp * 0.06);
    this.flaps[0].rotation.x = -flutter * (0.8 + 0.3 * Math.sin(this.runPhase * 3));
    this.flaps[1].rotation.x = flutter * 0.5 * (1 + Math.sin(this.runPhase * 3 + 1));
    this.screaming = Math.max(0, this.screaming - dt);
    const open = this.screaming > 0 ? 1.6 + 0.5 * Math.sin(performance.now() * 0.05) : 0.25;
    this.mouth.scale.y += (open - this.mouth.scale.y) * Math.min(1, dt * 20);
    const bub = this.bubble;
    bub.visible = this.screaming > 0;
    if (bub.visible) {
      const k = Math.min(1, this.screaming * 4);
      bub.scale.set(1.9 * k, 0.8 * k, 1);
      bub.position.x = Math.sin(performance.now() * 0.06) * 0.04;
    }
    this.root.position.set(body.x, body.y + this.r * this.squash, body.z);
    this.root.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));
  }
}

// "AAAAH!" speech bubbles, a few variants drawn once on canvases.
const SCREAMS = ['AAAAH!', 'AIEEE!', 'NOOOO!', 'HELP!', 'WAAAH!', 'MAKE IT STOP'];
let bubbleTex = null;
function pickBubble() {
  if (!bubbleTex) {
    bubbleTex = SCREAMS.map((txt) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 108;
      const g = c.getContext('2d');
      g.fillStyle = '#fff4e0'; g.strokeStyle = '#2a0505'; g.lineWidth = 6;
      g.beginPath(); g.ellipse(128, 48, 120, 42, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(110, 86); g.lineTo(128, 106); g.lineTo(140, 84); g.fill();
      g.fillStyle = '#b3100f';
      g.font = `900 ${txt.length > 7 ? 26 : 40}px Impact, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, 128, 50);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }
  return bubbleTex[Math.floor(Math.random() * bubbleTex.length)];
}
function makeBubble() {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pickBubble(), depthTest: false, transparent: true }));
  sp.renderOrder = 10; sp.visible = false;
  return sp;
}
