# Finger Skater

A two-thumb, isometric 3D skateboarding game for phones, in the spirit of
*Paperboy*. Roll down an endless toy-town street and weave around traffic,
cones, road works and pedestrians. Hop what you can, hit ramps for big air,
grab your board, and grind rails. Take three hits and you bail.

![Street](docs/screenshots/street.png)

<img src="docs/screenshots/grind.png" alt="Grinding a rail with the balance meter" width="260">

The town, cars, people and props are the low-poly models from
[gig-ambulance](https://github.com/mtd-public/gig-ambulance) (`assets/models`,
a subset of its `assets/manifest.json`). The skateboard and helmet are built in
code (`js/skater.js`).

## Play

There's no build step. Serve the folder and open it on a phone, or in a narrow
desktop window:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

A thumb on each side: the left is a **virtual joystick** that steers, the
right is a **jump/trick button**.

| Control | On the ground | In the air | On a rail |
| --- | --- | --- | --- |
| **Left joystick** left / right | weave | drift a little | balance |
| **Hold** the right button | charge an ollie (ring fills in ~0.8 s) | **grab** the board (trick) | charge a pop |
| **Release** the right button | jump (a tap is a small hop, a full charge clears a car) | let go of the grab | pop off the rail |

Desktop: ←/→ (or A/D) to weave or balance, hold **Space** (or ↑/W) to charge
or grab, **C** to switch camera. The 🎥 button switches between the
**Classic** view (street leaning up-right) and **Low-left** (camera behind
and left of the skater).

## Scoring

- **Distance.** 1 point per metre, times your **clean-streak multiplier**. The
  multiplier goes up one step every 150 m without a hit, to x5. A hit resets it.
- **Hops.** Clear a cone, bin, hydrant, barrier, bench, bush or pedestrian in
  the air: +100. Clear a car: **CAR HOP** +400.
- **Near misses.** Brush past moving traffic: +50.
- **Ramps.** There are three sizes: *kicker* (short hop over cones), *ramp*
  (barriers or a parked car) and *MEGA* (two cars). Landing a ramp jump pays
  250 + 250/s of air. Big air also spins you 360.
- **Grab tricks.** Hold in the air for Indy, Melon, Nose, Stalefish, Method or
  Tail grabs, worth 100 + 400/s. The points only count if you **let go before
  you touch down**. Still grabbing when you land is a crash, which costs a hit
  (and a bail on your last one). The air-time bar over the skater drains toward
  touchdown and turns red when there's under 0.3 s left.
- **Rail grinds.** Come down lined up on a rail (pavement or centre line) to
  lock on. A balance meter appears, and its needle keeps tipping away from
  centre, faster the longer you grind. Steer the other way to keep it centred.
  Pop off (tap the button) or ride to the end to bank 150 + 350/s. If the
  needle hits either end you slip off and take a hit.
- **Pickups.** Coins +25, ♥ gives back a hit, ★ bumps your streak one step.

## Code map

| File | What |
| --- | --- |
| `js/main.js` | renderer, camera views, hold/charge/grab logic, scoring, HUD |
| `js/world.js` | endless street generation, obstacles, traffic, ramps, rails, collisions |
| `js/skater.js` | skater model and board, physics, jump/grab/grind/bail |
| `js/input.js` | virtual joystick, jump/trick button and keyboard: steer axis and press/release events |
| `js/audio.js` | WebAudio synth sound effects (no sample files) |
| `js/assets.js`, `js/fx.js`, `js/utils.js` | from gig-ambulance: GLB loading and static baking, particles, helpers |

`window.SKATE` exposes the state, player, world and camera for poking at from
the console.
