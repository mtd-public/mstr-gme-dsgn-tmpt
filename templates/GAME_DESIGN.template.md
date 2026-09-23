# <Game Name>: Game Design Document

> One-line pitch in the form "<classic> but <twist>". Example: "Flappy Bird
> turned 90°: the fish swims down, a current pulls it left, splash pushes it
> right."

Live art bible or preview: `<link>` · Play: `<pages url>` · Built from: `starters/<which>` + kits `<list>`

## 1. Pillars
1. **<Pillar>.** One sentence on what it means in play.
2. …
3. **Readable at a glance.** Which colours and shapes mean what.

## 2. Core loop
```
 ┌── <clock / pressure> ───────────────────────────────┐
 │  <do X> → <reward / consequence>                     │
 │  <do Y> → …                                          │
 └── <end condition> → <score screen> ─────────────────┘
```

## 3. Controls
| Input | Action |
|---|---|
| Touch: … | … |
| Keyboard: … | … |

The scheme comes from `docs/04-input-and-controls.md`, row: <name>. The primary
verb is reachable by <which thumb>.

## 4. Numbers
| Parameter | Value | Why |
|---|---|---|
| Speed | a → b, +c per level | … |
| Health | … | … |
| Spawn gap | [min, max] re-rolled | … |
| … | | |

Difficulty keys off the **level**, never the zone.

## 5. Cast
| Actor | Behaviour | Telegraph | Counter |
|---|---|---|---|
| Player | … | — | — |
| Threat A | … | … | … |
| Pickup | … | — | — |

## 6. HUD
Which indicators from `docs/05-hud-gauges-indicators.md`, and where each sits.
Say what is diegetic (on the character or world) and what is chrome.

## 7. Art direction
Style from `docs/06-art-direction.md`: <name>.

| Hex | Role |
|---|---|
| | |

Silhouette rule, emissive budget, type choices.

## 8. Progression
Levels, zones or worlds, transitions, bosses. Use the table from `docs/12-levels-worlds-progression.md`.

## 9. Juice (in build order)
1. …

## 10. Performance budget
| Budget | Target |
|---|---|
| Draw calls | ≤ 90 |
| Triangles | ≤ 45k |
| DPR | ≤ 2 |

## 11. Reuse plan
| File | Source | Action | Notes |
|---|---|---|---|
| `src/components/GameCanvas.tsx` | starter | copy verbatim | |
| … | kits/… | copy, then extend | |

## 12. Open questions
- <question>. Default chosen: <default>.

---

## Since the initial build (delta log)

### <feature branch name>
- What changed, old → new numbers, and why.
- Verification done, including any temporary overrides that were reverted.
