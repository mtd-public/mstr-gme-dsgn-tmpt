import * as THREE from 'three';

// Procedural canvas textures, so the game ships without image files.
// Seeded so every load looks the same.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function tex(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// One texture repeat = one level cell. A 4x4 grid of worn flagstones, like
// the tile grid on a Marble Madness course, with grout, cracks and old stains.
export function flagstoneTexture() {
  const S = 256, n = 4, cs = S / n;
  const c = canvas(S, S), g = c.getContext('2d'), r = rng(7);
  g.fillStyle = '#1b1512'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 92 + r() * 34 + ((x + y) % 2 ? 10 : -6);
    g.fillStyle = `rgb(${v + 6},${v - 4},${v - 12})`;
    g.fillRect(x * cs + 3, y * cs + 3, cs - 6, cs - 6);
    // bevel
    g.fillStyle = 'rgba(255,230,200,0.10)';
    g.fillRect(x * cs + 3, y * cs + 3, cs - 6, 4);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x * cs + 3, y * cs + cs - 7, cs - 6, 4);
    // speckle
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
      g.fillRect(x * cs + 4 + r() * (cs - 10), y * cs + 4 + r() * (cs - 10), 2, 2);
    }
  }
  // cracks
  g.strokeStyle = 'rgba(10,6,4,0.55)'; g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    let px = r() * S, py = r() * S;
    g.beginPath(); g.moveTo(px, py);
    for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 30; py += (r() - 0.5) * 30; g.lineTo(px, py); }
    g.stroke();
  }
  // dried blood
  for (let i = 0; i < 3; i++) {
    const px = r() * S, py = r() * S, rad = 6 + r() * 14;
    const gr = g.createRadialGradient(px, py, 0, px, py, rad);
    gr.addColorStop(0, 'rgba(90,6,6,0.55)'); gr.addColorStop(1, 'rgba(90,6,6,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, rad, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

// Side walls: courses of dark brick with vertical soot streaks, echoing the
// striped pillars of the original arcade game. u = along the wall, v = height;
// one repeat = one cell wide, one cell tall.
export function brickTexture() {
  const W = 256, H = 256, rows = 6, rh = H / rows;
  const c = canvas(W, H), g = c.getContext('2d'), r = rng(11);
  g.fillStyle = '#120c0b'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < rows; y++) {
    const off = (y % 2) * 32, bw = 64;
    for (let x = -1; x < W / bw + 1; x++) {
      const v = 46 + r() * 22;
      g.fillStyle = `rgb(${v + 10},${v - 2},${v - 6})`;
      g.fillRect(x * bw + off + 2, y * rh + 2, bw - 4, rh - 4);
      g.fillStyle = 'rgba(255,200,150,0.06)';
      g.fillRect(x * bw + off + 2, y * rh + 2, bw - 4, 3);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * W, w = 3 + r() * 10;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)');
    g.fillStyle = gr; g.fillRect(x, 0, w, H);
  }
  return tex(c);
}

// Glowing rune circle for checkpoints and the start pad.
export function runeTexture(color = '#ff5a1f') {
  const S = 256, c = canvas(S, S), g = c.getContext('2d'), r = rng(23);
  g.translate(S / 2, S / 2);
  g.strokeStyle = color; g.fillStyle = color;
  g.shadowColor = color; g.shadowBlur = 12;
  g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 112, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.stroke();
  // pentagram
  g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 4 / 5);
    const x = Math.cos(a) * 90, y = Math.sin(a) * 90;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  // glyphs between the rings
  g.font = 'bold 16px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const glyphs = 'ᚦᛉᛟᚨᛞᚱᛊᛏᚹᛗᛜᛇ';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.save(); g.rotate(a); g.fillText(glyphs[Math.floor(r() * glyphs.length)], 0, -102); g.restore();
  }
  return tex(c, false);
}

// Soft round glow used for flames, embers and the blob shadow.
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const S = 128, c = canvas(S, S), g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return tex(c, false);
}
