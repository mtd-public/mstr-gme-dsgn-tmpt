// Persistent-phases boss health — extracted from space-lion (js/vendor/space-assets.js, SA.BossHealth).
//
// A recurring boss that can only lose one "phase" of its health per encounter:
// once a phase is chipped off it retreats (warps out), keeps whatever HP it has
// left, and the next encounter continues from there. space-lion's Sentinel uses
// BossHealth(180, 2): two encounters to kill; its HUD bar draws `phases`
// segments so the retreat points are visible.
//
//   const hp = new BossHealth(180, 2);
//   switch (hp.damage(10)) {
//     case 'hit':      flash(); break;
//     case 'retreat':  warpOut(); scheduleRespawn(); break;  // hp stays put
//     case 'defeated': explode(); unlockFinalBoss(); break;
//   }
//   drawBossBar(label, hp.fraction, hp.phases);
export class BossHealth {
  constructor(max = 90, phases = 3) { this.max = max; this.phases = phases; this.hp = max; }
  get fraction() { return this.hp / this.max; }
  get step() { return this.max / this.phases; }
  /** HP floor for the current encounter: the bottom of the phase it is in. */
  get retreatAt() { return Math.max(0, Math.ceil(this.hp / this.step - 1e-9) * this.step - this.step); }
  damage(n) {
    if (this.hp <= 0) return 'defeated';
    const floor = this.retreatAt;
    this.hp = Math.max(floor, this.hp - n);
    if (this.hp <= 0) return 'defeated';
    if (this.hp <= floor + 1e-9) return 'retreat';
    return 'hit';
  }
  reset() { this.hp = this.max; }
}
