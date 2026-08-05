# Bounce Buggy — Implementation Spec

**This is a working document distilled from `docs/GDD.md` for use during implementation.** It contains the numbers, rules, and state machines only. Sources, evidence discussion, historical context, and home-port comparisons are in the GDD.

**If this document and `docs/GDD.md` disagree, the GDD wins.** Report the discrepancy so this file can be corrected.

**Evidence tags** carry the meaning defined in `CLAUDE.md` section 2.1:
`[D]` = documented, hard requirement · `[C]` = community consensus, default · `[I]` = inferred, starting point · `[?]` = unknown, must be a tunable constant.

**Scope warning:** this is the 1982 arcade game. The NES port's fuel, recharge stations, stunt bonuses, truck-dropped extra lives, boss fight, and 16 non-seasonal courses are **out of scope**.

---

## 1. Coordinate space and timing

| Constant | Value | Tag | Note |
|---|---|---|---|
| Logical play field | 256 × 240, portrait | `[D]` | Coordinate space. Kept because visible road distance is a difficulty parameter, not because of hardware. |
| Simulation rate | 60 Hz | — | Modern choice. All durations below are in **seconds**; convert to ticks at load. |
| Presentation scaling | Free | — | Any resolution, any scale factor. Nearest-neighbour filtering for pixel art. |
| Player sprite | 16 × 16 | `[D]` | |
| Enemy sprites | 16 × 16 | `[D]` | |
| Foreground tile | 8 × 8 | `[D]` | HUD/text |
| Background tile | 16 × 16 | `[D]` | |
| Background bitmap | 512 × 256 (width = 2× play field) | `[D]` | Width required for the screen-wrap jump. Height per GDD §9 (MAME `btime.cpp`); omitted from this table until now. |
| Palette | Unconstrained | — | Original was 16 colours. Constrained palettes are an aesthetic option, not a requirement. |

Deliberately dropped as obsolete hardware limits: 8 simultaneous sprites, 3bpp colour depth, integer-only scaling, PSG voice count.

---

## 2. Player

### 2.1 Speed model

| Constant | Value | Tag |
|---|---|---|
| Displayed speed range | 20–220 mph | `[D]` |
| Jump-enable threshold | 100 mph | `[D]` |
| Speed cost on landing | 32 mph | `[C]` — conflicting source says 40–50; tunable |
| Acceleration curve | — | `[?]` start linear |
| Braking rate | — | `[?]` stronger than acceleration |
| Steering rate at min speed | — | `[?]` |
| Steering rate at max speed | — | `[?]` **higher than at min speed** `[D]` |

**Displayed mph is not the internal velocity unit.** Keep an internal velocity scalar with a separate display mapping so either can be retuned independently.

**Steering is free lateral movement across the drivable region — not lane-snapped** `[D]`.

**Control improves with speed** `[D]`. Counterintuitive, but documented. Steering authority scales up with velocity.

### 2.2 Jump

- Gated at displayed speed ≥ 100 mph `[D]`.
- Horizontal distance proportional to speed at takeoff `[D]`.
- Lateral steering permitted while airborne `[D]`.
- **Screen wrap:** when the road is at maximum width, an airborne car steering off one edge reappears on the opposite edge `[D]`. Gate this per-segment on a road-width flag.
- **No landing lockout** `[D]`. A new jump may be initiated on the exact tick of landing. Required for island chains.
- Airborne duration as a function of speed: `[?]`

### 2.3 Player state machine

```
GROUNDED ──jump input && speed >= 100────────► AIRBORNE
GROUNDED ──out of bounds | water | debris────► CRASHING
AIRBORNE ──ground/island/enemy contact───────► GROUNDED   (speed -= LANDING_COST)
AIRBORNE ──water contact at landing──────────► CRASHING
CRASHING ──animation complete────────────────► RESPAWNING
RESPAWNING ─placement complete───────────────► GROUNDED
```

| Rule | Value | Tag |
|---|---|---|
| Hitbox | 16 × 16, full sprite | `[D]` — "any part out of bounds crashes"; insets `[?]` |
| Respawn position | On road, before the crash site, same course | `[D]` |
| Course reset on death | **No** | `[D]` |
| Post-respawn invulnerability | 0 s | `[?]` |
| Crash animation duration | — | `[?]` |

---

## 3. Bump physics

Applies to all **cars**. Trucks are not bumpable (see §5).

### 3.1 Rules

| Behaviour | Tag |
|---|---|
| Both parties ricochet on contact | `[D]` |
| **Front** contact (into a car ahead): player slows and is knocked back | `[D]` |
| **Rear** contact (tapping a car ahead from behind): player speeds up | `[D]` |
| Higher player speed → target pushed further | `[D]` |
| Higher player speed → less control lost | `[D]` |
| Both parties lose control ≈ 1 second | `[D]` — duration and severity `[?]` |

### 3.2 Signature

```
resolveBump(player, other, contactSide, relativeSpeed)
  → { playerDelta: {vx, speed}, otherDelta: {vx, speed} }
```

Pure function. Returns deltas; the caller applies them. `contactSide ∈ {FRONT, REAR, LEFT, RIGHT}` derived from relative position and velocity.

Lateral impulse scales with `relativeSpeed` and inversely with the target's weight class. Impulse coefficient: `[?]`

### 3.3 Weight classes

From heaviest to lightest `[D]` (values `[?]`):

`tractor` (heaviest bumpable) → `yellow truck` → `blue car` → `green car` → `brown car` → `white car` → `skull/hearse` → `race car` → `cycle` (lightest)

### 3.4 Control loss

Both entities enter `BUMPED` for ≈ 1 s `[D]`. Steering authority is **reduced by a factor**, not removed `[I]`.

### 3.5 Chain reactions

A bumped enemy that strikes another enemy propagates the impulse `[D]`. Each destroyed car scores independently `[D]`. Cap propagation depth `[I]`.

### 3.6 Destruction cause — track this on every kill

This distinction drives both scoring and the pacifist bonus.

| Cause | Scores? | Breaks no-crash bonus? |
|---|---|---|
| Player bumped it into scenery/water/debris | Yes `[D]` | Yes `[D]` |
| Player landed a jump on it | Yes `[D]` | Yes `[D]` |
| Player touched a truck | Yes `[D]` | Yes `[D]` |
| Chain reaction from a player bump | Yes `[D]` | Yes `[D]` |
| Enemy drove into water on its own | **No** `[D]` | **No** `[D]` |
| Enemy hit debris on its own | **No** `[D]` | **No** `[D]` |

---

## 4. Enemy cars

### 4.1 Type table

Behaviours `[D]`. Point tiers are 200/300/500 `[D]`; **the sprite-to-tier mapping is `[?]`** — keep it in one table.

| Type | Behaviour | Weight | Speed | Points |
|---|---|---|---|---|
| Tractor | Always straight | Heaviest | Very slow | 200 |
| Cycle | Weaves heavily | Lightest | Medium | `[?]` |
| Skull / hearse | Homes on player; **packs of 2–4** | Light | Very fast | 500 |
| Race car | Occasional zigzag | Lightest | Very fast | 300–500 |
| White car | Homes on player | Light | — | 500 |
| Yellow truck | Weaves heavily | 2nd heaviest | — | `[?]` |
| Green car | Zigzags heavily | Very light | — | 200–300 |
| Blue car | Weaves | Light | Fast | 200 |
| Brown car | Zigzags | Fairly light | — | `[?]` |

*(Dump truck is a separate entity class — see §5.)*

### 4.2 AI state machine

```
SPAWN ──► CRUISE ──► { WEAVE | ZIGZAG | HOMING }   (per type profile)
                            │
                            ├──player or chain contact──► BUMPED ──timer──► RECOVER ──► (type behaviour)
                            │
                            └──out of bounds | water | debris | jumped on──► WRECKED ──► despawn
```

| State | Rule | Tag |
|---|---|---|
| `CRUISE` | Hold position, drift per profile | `[I]` |
| `WEAVE` | Sinusoidal lateral oscillation. Amplitude/period per type `[?]` | `[D]` |
| `ZIGZAG` | Periodic sharp lateral displacement. Interval/magnitude per type `[?]` | `[D]` |
| `HOMING` | Steer toward `player.x`. Imperfect tracking; strength `[?]` | `[D]` |
| `BUMPED` | Reduced steering authority, ≈ 1 s | `[D]` |
| `WRECKED` | Explode; award points only if player-caused (§3.6) | `[D]` |

Enemies steer to remain in bounds unless in `BUMPED`. An enemy pushed out of bounds is `WRECKED` `[D]`.

---

## 5. Trucks, debris, hazards

### 5.1 Trucks

| Rule | Tag |
|---|---|
| **Not bumpable.** Cannot be pushed. | `[D]` |
| Touching a truck destroys the truck; counts as a player-caused kill | `[C]` |
| Landing a jump on a truck destroys it | `[D]` |
| Move in a straight line, often faster than player top speed | `[C]` |
| Drop debris when in roughly the **top third** of the play field | `[C]` |

### 5.2 Level-conditional debris rules

Implement each as an explicit named condition.

| Condition | Rule | Tag |
|---|---|---|
| Level 1 | Dump trucks drop **no** debris | `[C]` |
| Level ≥ 2 | Dropping begins | `[C]` |
| Summer courses | Trucks *usually* drop no debris → probability constant, default high | `[C]`, value `[?]` |
| Level ≥ 3 | Truck phalanxes: up to 3 abreast. **Spawner must guarantee ≥ 1 passable lane.** | `[C]` |
| Level ≥ 9 | Trucks may drop multiple loads | `[C]` |

### 5.3 Debris

- Kills the player on contact `[D]`.
- Destroys enemy cars that strike it; scoring per §3.6 `[D]`.
- Static once dropped; scrolls with the road `[I]`.

### 5.4 Terrain types

| Type | Behaviour | Tag |
|---|---|---|
| `DRIVABLE` | Normal road | — |
| `ROADSIDE` | Lethal on contact with any part of the hitbox | `[D]` |
| `WATER` | Lethal unless `AIRBORNE` | `[D]` |
| `BRIDGE` | Drivable, ≈ half normal width, lethal edges | `[C]` |
| `ISLAND` | Valid landing target mid-water; scores 1000 | `[D]` |
| `ROCK` | Barrier dividing the road into lanes; appears level ≥ 3 | `[C]` |

**Rock funnel:** a funnel-shaped rock formation **always** precedes a required road jump `[C]`. This is a learned visual tell — it must be reliably present.

**Island shape is meaningful:** a small **rectangular** island signals the water is about to end `[D]`. Make shape a distinguishable property.

**Warning indicator:** a flashing `!` at top-centre, plus an audio beep, precedes every required jump `[D]`. Lead time `[?]`.

---

## 6. Course structure

### 6.1 Segment archetypes

Seven documented archetypes `[C]`:

1. Freeway — very wide
2. Shrub edges — narrower, small curves
3. Lake-on-left — narrows road
4. Bridge-out — water gap requiring a jump
5. Double-jump — island landing then immediate re-jump
6. Bridge-on-left with islands-on-right
7. Split highway — narrow left lane, wider right with debris and small river

Each archetype is a data-driven generator producing boundary geometry plus metadata: contains water, requires jump, minimum clearing speed, spawn-eligible zones.

**Water is always on the LEFT when the road narrows** `[C]`. Useful positioning heuristic; keep it consistent.

### 6.2 Course count and pattern

Total: **32 courses** `[D]`.

Sources conflict on structure — marketing says 32 unique, player documentation describes courses 1–3 as unique followed by a repeating 4–5–6–7–8 structural cycle. Reconciliation `[I]`: 32 distinct definitions built from recycled structural blocks, with per-level hazard escalation.

| Level | Feature onset | Tag |
|---|---|---|
| 2 | Debris dropping begins | `[C]` |
| 3 | Truck phalanxes; rock barriers | `[C]` |
| 4 | Double jumps | `[C]` |
| 7 | Triple jumps | `[C]` |
| 9 | Multi-load truck drops | `[C]` |

### 6.3 Seasons

Cycle: **Spring → Summer → Fall → Winter** `[D]`. **Level 1 has no season** `[D]`.

End-of-course screen previews the next season by icon `[D]`:
flowering tree = Spring · life preserver = Summer · bare tree = Fall · snowman = Winter

### 6.4 Difficulty ramp

A single function `difficultyParams(level)` returns every escalation lever. This function *is* the difficulty curve — Phase 11 tunes it.

Levers `[C]`: debris density · centre-island frequency · water frequency · turn tightness · base scroll speed · spawn density · multi-load probability · phalanx probability.

**End-of-course speed-up** `[C]`: scroll accelerates near a course's end. Magnitude and onset `[?]`. This is a documented source of surprise deaths — keep it, but it's a candidate for softening in a modern take.

---

## 7. Scoring

### 7.1 Point table

| Event | Points | Tag |
|---|---|---|
| Destroy enemy car | 200 / 300 / 500 by type | `[D]` |
| Destroy truck | Per type table | `[D]` |
| Enemy self-destructs (water/debris, unbumped) | **0** | `[D]` |
| Island landing | 1,000 | `[D]` |
| Survival | 8 per second | `[C]` |

Destruction method does not affect points — bumping, landing on, and chain-reacting all score the same `[D]`.

**Granularity:** valid scores are multiples of 4 `[C]`. Accumulate so this property holds; assert it in tests.

### 7.2 End-of-course bonus

| Level | Per enemy destroyed | Tag |
|---|---|---|
| 1 | 300 | `[D]` |
| 2 | 400 | `[D]` |
| 3+ | 500 | `[D]` |

### 7.3 No-crash (pacifist) bonus

**50,000** for completing a course having destroyed **zero** enemies `[D]`.

Broken by any player-caused destruction, including jumping on a car and touching a truck. **Not** broken by enemy self-destruction `[D]`.

### 7.4 Lives and extra cars

| Setting | Options | Tag |
|---|---|---|
| Starting cars | 3 (default) or 5 | `[D]` |
| Bonus threshold | every 30,000 (default) · every 70,000 · 20,000 once · 30,000 once | `[D]` |
| Accrual cap under "every 30,000" | up to 990,000 | `[C]` |

Game over when the last car is lost `[D]`.

### 7.5 Rollover

- Score rolls over at **1,000,000** → 0 `[D]`.
- At ≥ 999,999, **no further extra cars are granted for the remainder of the game** `[D]`.
- A `G` indicator appears beside the remaining-cars count `[C]`.

### 7.6 High scores

Default table `[D]`: `SAW 10012` · `KIS 7684` · `SUZ 5328` · `KIT 3236` · `YOS 1982`

Three-initial entry; input scheme `[I]`. Persist to `localStorage`.

---

## 8. Audio cues

All audio synthesised at runtime. No sampled assets. Voice count unconstrained (the original's 6-tone/2-noise limit was hardware, not design).

| Cue | Trigger | Tag |
|---|---|---|
| **Jump warning beep** | Accompanies the flashing `!` before a required jump | `[D]` |
| Engine | Continuous; pitch tracks player speed | `[C]` |
| Jump | On takeoff; notably long | `[C]` |
| Player crash | On `CRASHING` entry | `[C]` |
| Enemy destroyed | On `WRECKED`; distinct from player crash | `[C]` |
| Bonus / tally | End-of-course screen | `[I]` |
| Gameplay music | During `PLAYING` | `[C]` |
| Attract music | During `ATTRACT` | `[C]` |

The jump warning beep is the most gameplay-critical cue — expert play relies on hearing it rather than watching the screen `[C]`. Make it unmistakable.

---

## 9. HUD

Exact original coordinates are `[?]`. Keep all positions in one place for later correction.

| Element | Position | Tag |
|---|---|---|
| Speedometer | Top-right | `[C]` |
| `JUMP OK` indicator | Beside speedometer; flashes when speed ≥ 100 | `[C]` |
| Score | On-screen, live | `[D]` |
| Cars remaining | On-screen | `[D]` |
| `G` indicator | Beside cars remaining, at ≥ 1,000,000 | `[C]` |
| `!` jump warning | Top-centre, flashing | `[D]` |

---

## 10. Randomness

- Road layouts are **fixed per course**, not generated `[D by implication]`. Expert play depends on memorisation.
- Enemy spawn patterns appear **deterministic from a fixed initial state** `[C]`.
- Mechanism (PRNG vs. table vs. frame-counter) is `[?]`.

**Implementation:** fixed course-layout tables + a seeded PRNG for enemy type selection and lateral behaviour, **re-seeded identically at each course start** so patterns are learnable. `Math.random()` is banned in gameplay code.

---

## 11. Unknown constants — the tuning surface

Every entry below is `[?]` and lives in `src/config/tuning.js`. Ranked by impact on game feel.

| Rank | Constant | Controls | Symptom if wrong |
|---|---|---|---|
| 1 | Acceleration curve + internal velocity scale | Everything | Car feels sluggish or twitchy |
| 2 | Bump impulse coefficient | Combat feel | Bumps feel weightless or like hitting a wall |
| 3 | Per-type weight values | Combat variety | All cars feel identical |
| 4 | Steering rate + speed scaling | Control | Can't thread gaps; or oversteers |
| 5 | Jump arc duration vs. speed | Jump timing | Gaps feel unfair or trivial |
| 6 | `JUMP_LANDING_SPEED_COST` (default 32 mph) | Jump chaining | Island chains impossible or free |
| 7 | Spawn density per level | Pacing | Empty road or unavoidable pileups |
| 8 | Bump control-loss duration + severity | Recovery feel | Punishing or unnoticeable |
| 9 | `!` warning lead time | Reaction budget | Unfair deaths or no tension |
| 10 | End-of-course speed-up magnitude | Difficulty spike | Cheap deaths |
| 11 | Summer no-debris probability | Seasonal variety | Seasons feel identical |
| 12 | Respawn invulnerability (default 0) | Death recovery | Respawn death loops |
| 13 | Hitbox insets (default full 16×16) | Collision fairness | Feels unfair to the player |
| 14 | Homing strength | Skull/white car threat | Trivially dodged or inescapable |
| 15 | Chain propagation depth cap | Score ceiling | Runaway cascades |

---

## 12. Deliberately not implemented

| Original element | Reason |
|---|---|
| 57.44 Hz refresh | Hardware timing. Running 60 Hz. |
| 8-sprite limit, 3bpp colour, 16-colour PROM | Hardware limits. |
| PSG voice count | Hardware limit. |
| Integer-only scaling | Hardware limit. |
| Coin insert, DIP switches | Coin-op economics. DIP settings become an options menu. |
| CRT phosphor blending | Optional post-process, default off. |
| NES fuel, recharge, stunt bonuses, boss, extra-life drops | Different game. |
