# 09 · Audio: WebAudio synth, no sample files

No game in the org ships a single audio file. Everything is synthesised with
oscillators and filtered noise. The consolidated library is
`kits/vanilla-js/audio/sfx-synth.js`, merged from four games. It's used by the
vanilla starter. The originals are in `kits/vanilla-js/audio/sfx-*.js`.
Silent games: splashy-fish, prof-whip-dash and dive-depths never added sound.
dive-depths' REVAMP doc calls it "a huge part" of In the Hunt, and it's the
obvious next step for those games.

## Rules

1. **Unlock inside a user gesture.** Create or resume the `AudioContext` in the
   Start button handler, the first keydown, or the first pointerdown (sub-sinkers
   calls `unlock()` from every input path). `unlock()` must be idempotent and
   also `resume()` a suspended context.
2. **One master gain.** Mute is a single `setTargetAtTime(0, t, 0.05)` ramp on
   the master (labyrinth-larry). Expose an M key and a ♪ button, and persist the
   choice if you like.
3. **Envelopes, never hard cuts:** attack about 5 ms, then
   `exponentialRampToValueAtTime(0.0001, t + dur)`. Exponential ramps can't hit
   0, so ramp to 0.0001. Loops fade with `setTargetAtTime`.
4. **Rate-limit identical sounds** (sub-sinkers: 40 ms per name). A 5-shot
   spread in one frame otherwise stacks into distortion.
5. **One shared noise buffer** (1–2 s of white noise, looped) feeds every noise
   sound.
6. **Loops start once and are modulated per frame:** roll/engine
   (`setRoll(speed, grounded)`), siren, grind scrape, ambient drone. Never
   start/stop them per frame. Stop scheduled sources with `stop(t + 0.3)`
   after the fade.
7. Keep volumes modest (0.04–0.12 per voice, master 0.5–0.9) and check on a
   phone speaker.

## Recipes

| Sound | Recipe |
|---|---|
| Coin | square 988 Hz 70 ms, then 1319 Hz 120 ms at +60 ms |
| Power-up / pickup | triangle arpeggio 523-659-784-1047, 55–60 ms apart |
| Deliver / stage clear | square arpeggio up 5 notes, 80–100 ms apart |
| Checkpoint | sine 392-523-784, 90 ms apart, 250 ms each |
| Shoot / torpedo | square 520 Hz sliding down to 180 Hz + band-passed noise 2000 Hz sliding to 400 Hz |
| Missile whoosh | band-passed noise sweeping 400 Hz up to 3000 Hz, Q 3, 300 ms |
| Enemy shot | triangle 900 Hz sliding to 300 Hz, 80 ms |
| Hit / hurt | band noise 300 Hz 250 ms + sawtooth 160 Hz sliding down |
| Crash | sawtooth 110 Hz + square 70 Hz, both sliding down |
| Boom / big boom | low-passed noise sweeping 1200 Hz down to 60 Hz + sine 90 Hz sliding to 30 Hz (0.6 s / 1.4 s) |
| Clank (metal) | square 200 Hz slide + triangle 1600 Hz + short band noise at 2500 Hz |
| Splash | high-passed noise sweeping 3000 Hz down to 600 Hz |
| Jump / ollie | noise tick at 2200 Hz + triangle rising 300 Hz up to 600 Hz |
| Land | noise at 500 Hz + square 90 Hz dropping |
| Charged (ready) | triangle blip at 1200 Hz, 60 ms |
| Warning klaxon | alternating square 880/660 Hz, 3 times |
| Sonar ping | sine 1320 Hz, 0.9 s |
| Game over | noise burst + descending sawtooth 392-330-262-196 |
| Siren loop | triangle 760 Hz with a square LFO at 1.6 Hz × 130 Hz depth on its frequency |
| Rolling / engine loop | looped low-passed noise; gain and cutoff follow speed (`200 + k·700` Hz) |
| Grind scrape loop | looped band-passed noise at 3200 Hz, Q 6 |
| Hell drone | sawtooths at 55, 55.7 and 82.4 Hz (they beat against each other) through a 400 Hz low-pass |
| Scream | sawtooth pitch-bent up then down + vibrato 6–10 Hz, through three band-pass **formants** ("AH" 800/1150/2900 Hz, "AE" 700/1800/2600 Hz) + breath noise; random base 330–550 Hz so every yell differs |

## Wiring

Physics emits `fx` counters or events, and the engine plays sounds for them:

```js
if (w.fx.coin) sfx.play('coin')
if (w.fx.hit)  { sfx.play('hit'); navigator.vibrate?.([30, 40, 30]) }
sfx.setRoll(speed, grounded)            // every frame
sfx.setSiren(hasPassenger)              // on state change
```

Design intents that are written down but not yet built (good first tasks):

- whip-dash: a boulder rumble bed whose low-pass cutoff tracks the nearest boulder.
- whip-dash: a relic bell note that climbs the combo scale.
- whip-dash: an audio tell for the Idol lunge.
- gig: a heartbeat that speeds up as a critical fare runs out.
- dive: muffled underwater booms.
