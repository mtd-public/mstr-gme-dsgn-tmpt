// Level definitions. Each level is drawn with flat ASCII `map` patches (one
// height per patch) joined by `ramp`s. Courses run from the far corner of the
// screen toward the camera (+x +z) and always downhill, like Marble Madness.
//
// Map legend
//   .  floor              #  wall block (1.2 tall)     t  wall + torch
//   @  start              P  hellmouth (exit)          g  exit-coloured floor
//   c  checkpoint rune    k  Lament box (+time)        o  soul orb spawns here
//   S  spike trap         F  flame vent                L  lava (sunk, deadly)
//   B  crumbling bone     H  hook swinging along x     V  hook swinging along z
//   x  hole               r  skull pile (decor)        (space) leave untouched
import { T } from './world.js';

class Builder {
  constructor(W, D) {
    this.W = W; this.D = D;
    this.cells = new Array(W * D).fill(null);
    this.start = null; this.goal = null;
    this.torches = []; this.orbs = []; this.hooks = []; this.traps = [];
    this.boxes = []; this.checkpoints = []; this.skulls = []; this.chains = [];
  }
  _set(i, j, cell) {
    if (i < 0 || j < 0 || i >= this.W || j >= this.D) throw new Error(`cell ${i},${j} out of bounds`);
    this.cells[j * this.W + i] = cell ? { i, j, ...cell } : null;
  }
  flat(i, j, h, kind = 'stone') { this._set(i, j, { c: h, sx: 0, sz: 0, kind }); }

  // Plane through the rectangle, height h0 on the low-index edge, h1 on the other.
  ramp(i, j, w, d, h0, h1, axis) {
    const len = (axis === 'x' ? w : d) * T;
    const s = (h1 - h0) / len;
    const o = (axis === 'x' ? i : j) * T;
    for (let jj = j; jj < j + d; jj++) for (let ii = i; ii < i + w; ii++) {
      this._set(ii, jj, { c: h0 - s * o, sx: axis === 'x' ? s : 0, sz: axis === 'z' ? s : 0, kind: 'ramp' });
    }
    return this;
  }

  map(i0, j0, h, rows) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => this._glyph(i0 + i, j0 + j, h, ch)));
    return this;
  }

  _glyph(i, j, h, ch) {
    const at = { i, j, h };
    switch (ch) {
      case ' ': return;
      case 'x': this._set(i, j, null); return;
      case '#': this.flat(i, j, h + 1.2, 'wall'); return;
      case 't': this.flat(i, j, h + 1.2, 'wall'); this.torches.push({ ...at, h: h + 1.2 }); return;
      case 'L': this.flat(i, j, h - 0.6, 'lava'); return;
      case 'B': this.flat(i, j, h, 'bone'); return;
      case 'g': this.flat(i, j, h, 'goal'); return;
      case 'P': this.flat(i, j, h, 'goal'); this.goal = at; return;
    }
    this.flat(i, j, h);
    switch (ch) {
      case '@': this.start = at; break;
      case 'c': this.checkpoints.push(at); break;
      case 'k': this.boxes.push(at); break;
      case 'o': this.orbs.push(at); break;
      case 'S': this.traps.push({ ...at, type: 'spikes' }); break;
      case 'F': this.traps.push({ ...at, type: 'flame' }); break;
      case 'H': this.hooks.push({ ...at, axis: 'x' }); break;
      case 'V': this.hooks.push({ ...at, axis: 'z' }); break;
      case 'r': this.skulls.push(at); break;
      case '.': break;
      default: throw new Error(`unknown glyph ${ch}`);
    }
  }

  // Decorative chains dangling out of the dark above a cell.
  chain(i, j, h) { this.chains.push({ i, j, h }); return this; }

  done(meta) {
    if (!this.start || !this.goal) throw new Error(`${meta.name}: needs @ and P`);
    return { ...meta, W: this.W, D: this.D, cells: this.cells, start: this.start, goal: this.goal,
      torches: this.torches, orbs: this.orbs, hooks: this.hooks, traps: this.traps, boxes: this.boxes,
      checkpoints: this.checkpoints, skulls: this.skulls, chains: this.chains };
  }
}

export const LEVELS = [
  // 1 — a gentle course that teaches ramps and safe drops.
  () => new Builder(24, 24)
    .map(1, 1, 14, [
      't...t',
      '.....',
      '..@..',
      '.....',
      'r....',
    ])
    .map(6, 1, 14, [
      '  t  t',
      '......',
      '......',
      '......',
    ])
    .ramp(9, 5, 3, 4, 14, 10, 'z')
    .map(6, 9, 10, [
      't.......',
      '...c....',
      '........',
      '.k.....r',
    ])
    .map(14, 8, 8, [
      ' t  ',
      '....',
      '....',
      '....',
      '....',
    ])
    .ramp(14, 13, 4, 4, 8, 4, 'z')
    .map(11, 17, 4, [
      't..........t',
      '...gggggg...',
      '...ggggPg...',
      'r..gggggg..r',
      '......t.....',
    ])
    .chain(3, 8, 14).chain(12, 6, 12).chain(19, 12, 8).chain(9, 16, 6)
    .done({ name: 'The Threshold', sub: 'Mind the edges, Larry.', time: 45 }),

  // 2 — soul orbs hunt you across the Fields of Asphodel; bone bridges give way.
  () => new Builder(28, 28)
    .map(1, 1, 18, [
      't..t',
      '.@..',
      '....',
      't...',
    ])
    .map(5, 2, 18, ['......'])
    .map(11, 1, 18, [
      't..t',
      '....',
      '....',
      '....',
    ])
    .ramp(11, 5, 4, 5, 18, 13, 'z')
    .map(7, 10, 13, [
      't..........t',
      '.o...c....o.',
      '............',
      '...r....k...',
      '............',
    ])
    .map(12, 15, 13, [
      'BB',
      'BB',
      'BB',
      'BB',
    ])
    .map(10, 19, 13, [
      '........',
      '........',
      't......t',
    ])
    .map(18, 19, 11, [
      '...',
      '.c.',
      '...',
    ])
    .map(21, 19, 9, [
      '...t',
      '...#',
      '...#',
    ])
    .ramp(21, 22, 3, 3, 9, 5, 'z')
    .map(17, 25, 5, [
      't...ggggg.',
      '..o.ggPgg.',
      '....ggggg.',
    ])
    .chain(8, 4, 18).chain(16, 8, 14).chain(4, 14, 13).chain(20, 16, 12)
    .done({ name: 'Asphodel Descent', sub: 'The damned roll after you.', time: 45 }),

  // 3 — Hellraiser: hooks and chains swing across narrow walkways.
  () => new Builder(30, 30)
    .map(1, 1, 20, [
      't..t',
      '.@..',
      '....',
      '....',
    ])
    .map(2, 5, 20, [
      '..',
      '..',
      'H.',
      '..',
      '..',
      '.H',
      '..',
      '..',
    ])
    .map(1, 13, 20, [
      't....t',
      '..c...',
      '......',
      'r....r',
    ])
    .ramp(7, 13, 5, 2, 20, 15, 'x')
    .map(12, 12, 15, [
      't....t',
      '......',
      '..SS..',
      '..SS..',
      '......',
      '.....k',
    ])
    .map(18, 15, 15, ['...V.V'])
    .map(22, 16, 15, [
      '.....',
      '..c..',
      '.....',
      't...t',
    ])
    .ramp(23, 20, 3, 5, 15, 9, 'z')
    .map(19, 25, 9, [
      't..........',
      '..H.gggg...',
      '....ggPg...',
      'r...gggg..t',
    ])
    .chain(6, 3, 20).chain(10, 10, 18).chain(20, 11, 15).chain(18, 22, 12).chain(26, 14, 15)
    .done({ name: "Leviathan's Chains", sub: 'The hooks are hungry.', time: 50 }),

  // 4 — Phlegethon: a river of fire, flame vents, bone bridges over lava.
  () => new Builder(30, 32)
    .map(1, 1, 22, [
      't...t',
      '..@..',
      '.....',
      't...t',
    ])
    .ramp(2, 5, 3, 4, 22, 18, 'z')
    .map(1, 9, 18, [
      't..........t',
      '............',
      'LLLLL.LLLLLL',
      'LLLLLFLLLLLL',
      '..c.......o.',
      'r...........',
    ])
    .ramp(13, 12, 4, 3, 18, 13, 'x')
    .map(17, 10, 13, [
      't.....t',
      '.c.....',
      '..LL...',
      '..LL...',
      '.......',
      'F..o..F',
      '.......',
      '..k.   ',
    ])
    .map(19, 18, 13, [
      'BB',
      'BB',
      'BB',
      'BB',
    ])
    .map(16, 22, 13, [
      't.........',
      '..F.F.F...',
      '.........t',
    ])
    .map(26, 22, 11, [
      '...',
      '.c.',
      '...',
    ])
    .ramp(26, 25, 3, 3, 11, 7, 'z')
    .map(20, 28, 7, [
      't...gggg.',
      '..o.ggPg.',
      '....gggg.',
    ])
    .chain(8, 6, 20).chain(15, 9, 16).chain(24, 8, 14).chain(14, 25, 12)
    .done({ name: 'River Phlegethon', sub: 'Everything down here burns.', time: 55 }),

  // 5 — the labyrinth itself: two walled mazes stacked down a cliff.
  () => new Builder(32, 32)
    .map(1, 1, 24, [
      't#########t',
      '#@..#.....#',
      '#.#.#.###.#',
      '#.#...#k#.#',
      '#.#####.#.#',
      '#.....#...#',
      '###.#.###.#',
      '#...#...#.#',
      '#.#####.#.#',
      '#......c#.#',
      't#######...',
    ])
    .ramp(9, 12, 3, 4, 24, 19, 'z')
    .map(8, 16, 19, [
      't...#########t',
      '#.....S....o.#',
      '#.####.#####.#',
      '#.#c...#...#.#',
      '#.#.####.#.#.#',
      '#...V....#...#',
      '####.#####.#.#',
      '#k...F.....#..',
      't############t',
    ])
    .ramp(22, 22, 4, 3, 19, 13, 'x')
    .map(26, 18, 13, [
      't...t',
      '.....',
      '..c..',
      '.....',
      '..H..',
      '.....',
      '.ggg.',
      '.gPg.',
      '.ggg.',
      't...t',
    ])
    .chain(14, 6, 24).chain(22, 12, 20).chain(4, 20, 18).chain(29, 14, 16)
    .done({ name: 'The Labyrinth', sub: 'No one leaves. Except Larry.', time: 65 }),
];
