# Bounce Buggy — Implementation Phases, Changeset 01

**Changeset:** CS01 — initial build
**Scope:** Phases 0 through 12, from empty repo to deployable game.
**Companion documents:** `CLAUDE.md` (project rules), `docs/IMPLEMENTATION-SPEC.md` (working spec — the primary reference for phase work), `docs/GDD.md` (permanent research authority), `STATUS.md` (live state), `docs/OPEN_QUESTIONS.md` (unknowns log).

Thirteen phases (0–12). Each entry gives: the goal, the model and settings to use, a copy-paste prompt for Claude Code, and exit criteria you can verify.

---

## How to use this document

**Before every phase:**

1. Run `/clear` in Claude Code. **One phase per session** (CLAUDE.md §2.6). Do not carry context between phases — `CLAUDE.md` and `STATUS.md` are the handoff mechanism, and if they are not sufficient, that is a bug in those files worth fixing.
2. Set the model with `/model` per the phase entry.
3. Auto-accept stays on throughout, as in your other projects. Paste the prompt and let it run.

**Effort setting.** When you run `/model`, the popup also lets you set **Effort**: Low, Medium, High, Extra High (xhigh), Max. This is the real, documented control — separate from the model choice, and separate from the `think`/`ultrathink` text triggers below. Each phase entry below now gives you an explicit **Effort:** level. Set it in the popup alongside the model before pasting the prompt.

**Text-trigger words (optional, stacks with Effort).** Claude Code also allocates extra reasoning budget when a prompt contains `think` / `think hard` / `think harder` / `ultrathink`, in ascending order. This is an informal cue, not a separate documented parameter, and it stacks with whatever Effort level you've set — it does not replace it. Each phase's prompt block already opens with a sentence containing the phase's assigned phrase, so pasting the block as-is invokes it. Effort is doing the real work; the trigger word is a small additional nudge on top.

**Your review checkpoint is the diff, not a plan step.** Phases marked **Review: close** are ones where a wrong turn is expensive to unwind — Phase 0 (directory layout), Phase 2 and Phase 4 (physics feel), and Phase 7a (course system architecture) — everything after builds on them. On those, actually read `git diff` before committing, not just skim the chat summary. Phases marked **Review: light** are lower-stakes; a skim of STATUS.md's summary is enough. CLAUDE.md §2.9 still has Claude Code stop and ask you directly when something is ambiguous — that's independent of auto-accept and works the same as your other projects.

**Model selection rationale:**

| Model | Use for |
|---|---|
| **Fable 5** | Physics feel, subtle numeric behaviour, gnarly debugging, calibration. The phases where "technically correct but feels wrong" is the failure mode. |
| **Opus 5** | Architecture, state machines, timing correctness, anything with many interacting parts. |
| **Sonnet 5** | Well-specified implementation, bulk data entry, glue code, tests against a clear spec. |
| **Haiku 4.5** | Not recommended for any phase here. Reach for it only for trivial mechanical edits. |

One caveat on Fable 5: a small fraction of sessions get routed to Opus 5 by safeguards. If you notice a response identifying as Opus 5, that is why — it is not a failure, and Opus 5 is a fine fallback for every phase listed as Fable 5.

**Pushing.** Claude Code commits per phase but does not push (CLAUDE.md §8). Push yourself when a phase looks good.

**A note on `/compact`.** If a phase runs long and context fills, prefer finishing the current unit of work, committing, updating `STATUS.md`, then `/clear` and resuming with a short continuation prompt. `/compact` loses detail in ways that matter for numeric fidelity.

---

## Phase 0 — Scaffold, tooling, test harness

**Goal:** Empty but correct skeleton. Nothing playable. Everything in the right place.

**Model:** Sonnet 5
**Effort:** Medium — well-specified scaffolding work
**Thinking:** `think`
**Review:** close — directory layout is expensive to change later

```
think about this phase before writing anything.

Read CLAUDE.md and docs/IMPLEMENTATION-SPEC.md in full before doing anything.
Consult docs/GDD.md only where the spec is ambiguous.

Phase 0: scaffold this project. Create the complete directory structure and file
skeleton exactly as specified in CLAUDE.md section 4. Every listed file should exist
with correct imports/exports and JSDoc headers, but implementations may be empty
stubs that throw "not implemented" — except for the items below, which I want fully
working now.

Fully implement in this phase:

1. index.html — minimal, loads src/main.js as a module, contains only a <canvas>
   element and nothing else of substance. No inline styles beyond centring the canvas
   on a black background.

2. src/config/constants.js — populate with every [DOCUMENTED] numeric value from
   docs/IMPLEMENTATION-SPEC.md. At minimum: logical play field 256x240 portrait,
   sprite 16x16, fg tile 8x8, bg tile 16x16, bg bitmap 512x256, jump speed threshold
   100 mph, speed range 20-220 mph, all point values (200/300/500 car tiers, 1000
   island landing, 8 pts/sec survival), end-of-level per-car bonus (300 L1, 400 L2,
   500 L3+), no-crash bonus 50000, extra-car thresholds (30000/70000/20000-once/
   30000-once), lives 3/5, score rollover 1000000, course count 32. Every constant
   gets a comment citing its spec section and evidence tag.

3. src/config/tuning.js — create with a clearly-labelled header explaining this file
   holds UNKNOWN and INFERRED values that will change during Phase 11 calibration.
   Populate with every [?] constant from IMPLEMENTATION-SPEC.md section 11, each with a
   placeholder value, a `// UNKNOWN` or `// INFERRED` tag, and a comment describing
   what it controls and how to tell if it is wrong.

4. src/core/rng.js — a fully working seeded PRNG. Use a small, well-understood
   algorithm (mulberry32 or xorshift128). Must expose: create(seed), next() returning
   float in [0,1), nextInt(min, max), and the ability to snapshot/restore state.

5. test/rng.test.js — real tests proving determinism from a seed, correct range
   bounds, and snapshot/restore fidelity.

6. .gitignore — node_modules, .DS_Store, and an explicit block on rom/ and any
   *.zip, *.nes, *.wav asset dumps.

7. README.md — brief. What it is, how to run it (a static server), how to run tests.
   Use the title Bounce Buggy. Do not name the original game or its publishers.

Do NOT implement any game logic, rendering, or entity behaviour in this phase.

Verify `node --test test/` passes. Then update STATUS.md per CLAUDE.md section 7 and
commit as `phase(0): scaffold project structure and constants`.

Finish by telling me: which spec constants you could not find a home for, and any
place the directory layout in CLAUDE.md felt wrong once you tried to build it.
```

**Exit criteria:** `node --test test/` passes. Directory matches CLAUDE.md §4. `constants.js` contains every documented number. `index.html` loads without console errors.

---

## Phase 1 — Render loop, canvas, fixed timestep

**Goal:** A black 256×240 portrait canvas, correctly scaled, running a 60 Hz simulation with a debug overlay proving it.

**Model:** Opus 5
**Effort:** High — timing correctness the whole loop depends on
**Thinking:** `think hard`
**Review:** close — the fixed-timestep model everything else builds on

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 1 before starting.

Phase 1: the render and timing foundation.

Implement:

1. src/render/canvas.js
   - Logical backbuffer fixed at 256x240 (portrait). This is a coordinate space, not
     a display resolution — see CLAUDE.md section 3.2 for why it stays fixed.
   - Free scaling to the display canvas: fit the largest scale that preserves aspect
     ratio, letterbox the remainder in black. Non-integer scales are fine.
   - ctx.imageSmoothingEnabled = false on both contexts (crisp pixel art).
   - Handle window resize and devicePixelRatio correctly so it stays sharp on
     high-DPI displays.
   - Expose the backbuffer context for all drawing.

2. src/core/loop.js
   - Fixed-timestep accumulator at 60 Hz. Define TICK_RATE_HZ = 60 in constants.js
     and derive the step from it — never hardcode 16.67 or 1/60 anywhere else.
   - Decouple update from render. Render via requestAnimationFrame; step simulation
     zero or more times per frame based on the accumulator.
   - Clamp the accumulator to avoid spiral-of-death after a tab is backgrounded
     (max ~5 catch-up steps per frame, then drop time).
   - Maintain a monotonically increasing integer tick counter. Gameplay code reads
     this, never Date.now().
   - Provide secondsToTicks(seconds) as the ONLY way durations enter the simulation.
     Per CLAUDE.md section 3.3, all durations are authored in seconds. Do not let a
     raw tick count appear in constants.js or tuning.js.
   - Expose an interpolation alpha for rendering. At 60 Hz on a 60 Hz display it is
     unnecessary, but on 120/144 Hz displays it smooths motion — wire it through to
     the render path from the start rather than retrofitting it.

3. src/core/input.js
   - Abstract input state: { up, down, left, right, jump } as booleans, plus
     edge-detected justPressed for jump.
   - Keyboard: arrows and WASD for direction, Space for jump. Must handle
     simultaneous keys (accelerate + steer) correctly — test this specifically.
   - Gamepad API: d-pad and left stick for direction (stick digitised with a
     deadzone), a face button for jump.
   - Input is sampled once per simulation tick, not per animation frame.

4. src/core/events.js — minimal pub/sub. on/off/emit. Used later for audio cues.

5. src/render/debugOverlay.js
   - Toggled with a key (backtick). Renders: current FPS, simulation ticks per
     second (should read ~60), tick counter, accumulator value, and live input
     state.

6. src/main.js — wire it together. Black screen, overlay toggleable.

7. test/loop.test.js — test the accumulator logic as a pure function: given a
   sequence of frame deltas, assert the correct number of simulation steps and the
   correct residual accumulator. Test the spiral-of-death clamp. Test that
   secondsToTicks rounds correctly and that changing TICK_RATE_HZ rescales every
   duration consistently.

Acceptance: I should be able to open index.html, see a black portrait rectangle
scaled and centred, press backtick, and watch the simulation rate hold at 60
ticks/sec regardless of whether my display is 60 Hz, 120 Hz, or 144 Hz. Pressing
arrow keys and Space should light up the overlay's input readout.

Run tests, update STATUS.md, commit as
`phase(1): fixed-timestep loop, scaled canvas, input abstraction`.

Tell me explicitly: whether the gamepad code is untested (I expect it is — say so
rather than claiming it works), and anywhere you were tempted to hardcode a tick
count instead of using secondsToTicks.
```

**Exit criteria:** Overlay shows 60 ticks/sec on any refresh rate. Simultaneous key presses register. Canvas is portrait, correctly scaled, sharp on high-DPI. No raw tick counts outside `loop.js`.

---

## Phase 2 — Player vehicle: speed model and jump

**Goal:** A controllable car on a blank field. The single most important phase for game feel.

**Model:** Fable 5
**Effort:** Max — the physics feel everything else depends on
**Thinking:** `ultrathink`
**Review:** close — this defines how the game feels

```
Ultrathink about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md sections 2 and 11 before starting.

Phase 2: the player vehicle. This is the phase that determines whether the game
feels right, so read IMPLEMENTATION-SPEC.md section 11 carefully — ranks 1, 2 and 5 are all [?]
constants that live here.

Critical context: the original displays speed as 20-220 mph, but the spec notes this
display value is not necessarily the internal velocity unit. Design the physics with
an internal velocity scalar and a separate display mapping, so we can retune one
without breaking the other.

Implement:

1. src/systems/physics.js — pure functions, no canvas, no globals.
   - Throttle model: joystick up accelerates, down brakes. Speed range maps to a
     displayed 20-220 mph. Acceleration curve is UNKNOWN — implement it as a
     configurable curve in tuning.js (start with linear acceleration and a separate,
     stronger braking rate) and comment what it would look like if it turns out to be
     non-linear.
   - Lateral steering: free horizontal movement, NOT lane-snapped. Steering rate
     should scale with speed — the spec notes higher speed gives better control, which is
     counterintuitive and is a real documented behaviour, so implement it and put the
     scaling factor in tuning.js.
   - Jump: gated at >= 100 mph displayed [DOCUMENTED]. Jump distance proportional to
     speed [DOCUMENTED]. Landing costs speed — sources conflict between 32 mph
     (ASchultz) and 40-50 mph (Giant Bomb). Implement as JUMP_LANDING_SPEED_COST in
     tuning.js, default 32, with a comment noting the conflict.
   - Airborne state: the car can steer left/right while airborne [DOCUMENTED],
     including wrapping off one screen edge and reappearing on the other. Implement
     the wrap as a flag we can enable per-road-width later.
   - No jump recovery lockout [DOCUMENTED] — a new jump may be initiated on the exact
     tick of landing.

2. src/entities/player.js — player state object and its update. States:
   GROUNDED, AIRBORNE, CRASHING, RESPAWNING. Implement as an explicit FSM using
   src/core/stateMachine.js.
   - Hitbox: 16x16 sprite. Exact hitbox insets are UNKNOWN — make them tunable
     constants, default to the full 16x16.
   - Respawn: spec says the next car is placed on the road before the crash site, and
     that post-respawn invulnerability is UNKNOWN. Implement RESPAWN_INVULN_TICKS in
     tuning.js, default 0, and note it.

3. src/core/stateMachine.js — generic FSM: states, allowed transitions, onEnter/
   onExit/onUpdate hooks, and a transition log we can surface in the debug overlay.

4. Render the player as a placeholder coloured 16x16 rectangle for now. No art yet.
   Draw a shadow offset beneath it when AIRBORNE so the jump reads visually.

5. Extend debugOverlay.js: show displayed mph, internal velocity, player FSM state,
   airborne height, ticks-in-state, and a live-editable list of every tuning.js
   constant this phase touches. Arrow keys or on-screen +/- to adjust, and a "dump
   tuning values" button that prints the current set to the console in a form I can
   paste back into tuning.js. This live-tuning capability is essential for Phase 11 —
   do not skip it.

6. test/physics.test.js — assert the [DOCUMENTED] values as fidelity regression
   tests: jump is impossible below 100 mph, possible at and above it; jump distance
   increases monotonically with speed; a jump can be re-initiated on the landing
   tick; braking decelerates and never goes below the minimum speed.

Acceptance: a rectangle I can drive around a blank screen. Holding up accelerates to
220. Below 100 mph the jump does nothing. Above it, the car leaves the ground, casts
a shadow, and lands slower than it took off.

Run tests, update STATUS.md including the new Tuning Snapshot table, update
docs/OPEN_QUESTIONS.md with every constant you had to guess, and commit as
`phase(2): player vehicle physics, jump arc, tuning overlay`.

Tell me which numbers you guessed and how confident you are in each.
```

**Exit criteria:** Drivable rectangle. Jump gated at 100 mph. Live-tuning overlay works and can dump values. Fidelity tests pass.

---

## Phase 3 — Road system, scrolling, boundaries

**Goal:** A scrolling road with lethal edges and the seven segment archetypes.

**Model:** Opus 5
**Effort:** High — geometry every course depends on
**Thinking:** `think hard`
**Review:** close — road geometry underpins every level

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md sections 5.4 and 6.1 before starting.

Phase 3: the road and the world it scrolls through.

Implement:

1. src/world/road.js
   - Vertically scrolling road. Scroll speed derives from player velocity, so the
     player's y position on screen stays roughly fixed (the classic top-down racer
     camera). Where exactly the player sits vertically is a tunable constant.
   - Road is defined as a series of segments with left and right boundary x-values
     that can vary per scanline-row, allowing curves and width changes.
   - Background field is 512 wide (twice the play field) scrolling vertically, per spec
     section 9. Implement the wider-than-screen background even if we only use the
     centre for now — the screen-wrap jump depends on it.

2. src/world/segments.js — the seven documented segment archetypes from IMPLEMENTATION-SPEC.md section 6:
     1. Freeway (very wide)
     2. Shrub edges (narrower, small curves)
     3. Lake-on-left (narrows road)
     4. Bridge-out / water gap requiring a jump
     5. Double-jump (island landing then immediate re-jump)
     6. Bridge-on-left with islands-on-right
     7. Split highway (narrow left lane, wider right with debris and a small river)
   Each archetype is a data-driven generator producing boundary geometry, plus
   metadata: does it contain water, is a jump required, minimum speed to clear,
   spawn-eligible zones. Do not hardcode any specific course yet.

3. Terrain types per road region: DRIVABLE, ROADSIDE (lethal), WATER (lethal),
   BRIDGE (drivable, narrow, lethal edges), ISLAND (landable target).

4. src/systems/collision.js — first pass.
   - Boundary collision: any part of the player's hitbox outside the drivable
     region is a crash [DOCUMENTED].
   - Water: crash unless AIRBORNE.
   - Island: landing on one is a valid landing and scores later.
   - AABB helper for entity-entity, used in Phase 4.

5. Wire the player's crash into the FSM from Phase 2. Crash -> CRASHING -> respawn
   before the crash site on the same course. Do not reset the course.

6. The flashing "!" warning indicator before a required jump [DOCUMENTED, spec section
   4.5]. Position it top-centre. Trigger it a tunable number of ticks before the gap
   enters the play area.

7. test/collision.test.js and test/segments.test.js — boundary crash detection at
   exact pixel edges; water lethal when grounded, survivable when airborne; every
   segment archetype produces geometry whose required-jump gaps are clearable at
   220 mph (this is the structural validity test).

Acceptance: I can drive along a scrolling road, die by touching the edges, see the
"!" warning appear before a water gap, and jump the gap if I am fast enough.

Run tests, update STATUS.md, commit as
`phase(3): road geometry, segment archetypes, boundary and terrain collision`.

Flag anything in the segment descriptions that was too vague to implement without
guessing.
```

**Exit criteria:** Scrolling road. Lethal edges. Water gaps jumpable. "!" warning fires. All seven archetypes generate valid geometry.

---

## Phase 4 — Collision and bump physics

**Goal:** The other half of the game's identity. Ricochet, directional bump asymmetry, chain reactions.

**Model:** Fable 5
**Effort:** Max — combat feel — the other half of the game's identity
**Thinking:** `ultrathink`
**Review:** close — this defines how the game feels

```
Ultrathink about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 3 before starting.

Phase 4: bump physics. Alongside Phase 2, this defines the game's feel. Spec section
14 item 2 flags the ricochet constants as UNKNOWN, so everything numeric here goes
in tuning.js.

The documented behaviour:
- Both cars ricochet on contact.
- Front contact (hitting a car ahead) slows the player and knocks them back.
- Rear contact (tapping a car from behind) speeds the player up.
- The faster your speed, the further you bump the other car.
- Higher player speed means less control lost.
- Both cars in a collision lose control for approximately one second.

Implement:

1. src/systems/bump.js — pure functions.
   - resolveBump(player, other, contactSide, relativeSpeed) returning velocity deltas
     for both parties. Do not mutate; return deltas and let the caller apply them.
   - contactSide determination from relative positions and velocities: FRONT, REAR,
     LEFT, RIGHT.
   - Lateral impulse magnitude scales with relative speed and inversely with the
     target's mass/weight class.
   - Per-vehicle-type weight values from the spec table (tractor heaviest bumpable,
     cycle and race car lightest). Put these in tuning.js as a weight table.
   - Control-loss: both entities enter a BUMPED state for a tunable duration,
     default 1.0 seconds (authored in seconds via secondsToTicks). During BUMPED,
     steering authority is
     reduced by a tunable factor rather than removed entirely.

2. Chain reactions: a bumped enemy that collides with another enemy propagates the
   impulse. Cap the propagation depth with a tunable constant to avoid pathological
   cascades. Each destroyed car in a chain scores independently.

3. Destruction rules, precisely per IMPLEMENTATION-SPEC.md section 7:
   - An enemy pushed into roadside, water, or debris by the player is destroyed and
     scores.
   - An enemy that falls into water or hits debris ON ITS OWN scores NOTHING and,
     importantly, does not count against the no-crash bonus.
   - Landing a jump on top of an enemy destroys it and scores the same as bumping.
   Track the destruction cause on every kill — the scoring and bonus systems in
   Phase 8 depend on distinguishing player-caused from self-caused.

4. Extend the debug overlay: draw hitboxes, draw the contact normal and impulse
   vector on the last bump, show the BUMPED state timer, and expose every bump
   tuning constant to the live editor.

5. test/bump.test.js — rear contact increases player speed; front contact decreases
   it; heavier targets move less for the same relative speed; higher relative speed
   moves the target further; chain propagation terminates at the depth cap;
   self-caused enemy deaths are flagged distinctly from player-caused.

Acceptance: I can drive into cars and shove them sideways, feel the difference
between rumbling one from behind and slamming into one head-on, and knock a car into
another for a double kill.

Run tests, update STATUS.md and the Tuning Snapshot, update docs/OPEN_QUESTIONS.md,
commit as `phase(4): bump physics, directional asymmetry, chain reactions`.

Tell me honestly whether the bump feels arbitrary given that all the constants are
guesses, and which single constant you think matters most for Phase 11 calibration.
```

**Exit criteria:** Directional bump asymmetry works and is measurable in tests. Chain kills work. Kill causes tracked distinctly.

---

## Phase 5 — Enemy cars and AI state machines

**Goal:** Ten vehicle behaviour profiles driving on the road.

**Model:** Opus 5
**Effort:** High — several interacting AI states
**Thinking:** `think hard`
**Review:** light

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md sections 4 and 10 before starting.

Phase 5: enemy vehicles.

Implement:

1. src/entities/enemyCar.js — data-driven vehicle types. The IMPLEMENTATION-SPEC.md section 4.1 table
   gives ten types with behaviour, weight class, and point tier. Define these as a
   table of profiles: { id, weight, baseSpeed, behaviour, pointValue, spriteIndex }.
   Note: IMPLEMENTATION-SPEC.md section 11 rank 10 flags that the exact sprite-to-point-value mapping is
   UNKNOWN. Use the documented 200/300/500 tiers, and keep the mapping in one table
   so it is trivially changed later.

2. AI state machine per IMPLEMENTATION-SPEC.md section 4.2, using src/core/stateMachine.js:
     SPAWN -> CRUISE -> { WEAVE | ZIGZAG | HOMING } -> (BUMPED) -> { RECOVER | WRECKED }
   - CRUISE: hold lane, drift per type profile.
   - WEAVE: sinusoidal lateral oscillation. Amplitude and period per type, in
     tuning.js. Applies to cycle, yellow truck, blue car.
   - ZIGZAG: periodic sharp lateral jumps. Applies to race car, green car, brown car.
   - HOMING: steer toward player.x. Applies to skull/hearse and white car. Homing
     strength is tunable and must not be perfect tracking.
   - BUMPED: from Phase 4, reduced steering authority for a duration.
   - RECOVER: return to the type's default behaviour.
   - WRECKED: explosion, award points if player-caused, despawn.
   Document every transition trigger in comments.

3. Enemy AI must respect road boundaries — enemies steer to stay on the drivable
   region unless bumped. An enemy pushed out of bounds is wrecked.

4. Pack behaviour: the skull/hearse type travels in packs of 2-4 [DOCUMENTED]. The
   spawner must support spawning correlated groups, not just individuals.

5. src/systems/spawner.js — first pass.
   - Seeded via src/core/rng.js. Math.random is banned.
   - Spawn ahead of and behind the player, in the segment's spawn-eligible zones.
   - Spawn density and type-weighting per difficulty level, table-driven.
   - IMPLEMENTATION-SPEC.md section 10 notes that spawn patterns appear deterministic from a fixed
     initial state — so the RNG must be re-seeded identically at each course start,
     making patterns learnable. Implement this explicitly.

6. src/entities/entityManager.js — pooled allocation, no per-frame garbage. Update
   order must be deterministic (stable iteration, no Set/Map iteration-order
   dependencies on insertion timing).

7. test/spawner.test.js and test/enemyAI.test.js — identical seeds produce identical
   spawn sequences; each behaviour profile produces its characteristic lateral
   motion; enemies stay in bounds unless bumped; pack spawning produces 2-4 members.

Acceptance: a road full of cars with visibly different personalities. Some weave,
some zigzag, some come straight at me. Restarting the course reproduces the same
pattern.

Run tests, update STATUS.md, commit as
`phase(5): enemy vehicle types, AI state machines, seeded spawner`.
```

**Exit criteria:** Ten distinguishable behaviours. Deterministic spawns from a seed. Pack spawning works.

---

## Phase 6 — Trucks, debris, terrain hazards

**Goal:** The non-bumpable threat class and the level-dependent rules around it.

**Model:** Sonnet 5
**Effort:** Medium — conditional rules, well-specified
**Thinking:** `think hard`
**Review:** light

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 5 before starting.

Phase 6: trucks and debris. These rules are highly conditional — implement the
conditions exactly, they are documented behaviour, not arbitrary.

1. src/entities/truck.js
   - Trucks are NOT bumpable. They cannot be shoved.
   - Touching a truck at all destroys the truck and counts as a player-caused kill
     (which therefore breaks the no-crash bonus).
   - Landing a jump on a truck destroys it.
   - Trucks move in a straight line, often faster than the player's top speed.
   - Dump trucks drop debris when in roughly the top third of the screen.

2. Level-conditional debris rules — implement each as an explicit, commented condition:
   - Level 1: dump trucks do NOT drop debris.
   - Level 2 onward: dropping begins.
   - Summer levels: dump trucks usually do NOT drop debris. "Usually" is imprecise —
     implement as a probability constant in tuning.js, defaulting high, tagged
     // UNKNOWN, and log it in OPEN_QUESTIONS.md.
   - Level 9 onward: trucks can dump multiple loads.
   - Level 3 onward: truck phalanxes — up to three trucks abreast dropping debris,
     with a survivable gap between them. The spawner must guarantee at least one
     clear lane through a phalanx. Test this.

3. src/entities/debris.js
   - Debris destroys the player on contact.
   - Debris destroys enemy cars that hit it. If the enemy hit it on its own, no
     points and no no-crash-bonus penalty. If the player bumped it into the debris,
     points and penalty apply. This distinction is from Phase 4 — reuse it.
   - Debris is static once dropped and scrolls with the road.

4. Terrain hazards from IMPLEMENTATION-SPEC.md section 5.4 not yet done in Phase 3:
   - Rock barriers and rock splits dividing the road into narrow lanes (appear after
     Level 3).
   - Rock funnel graphic always precedes a roadway jump [COMMUNITY-CONSENSUS] — this
     is a visual tell the player learns, so it must always be present.
   - Bridges: roughly half normal road width, lethal edges, sometimes leading
     directly into a jump.
   - Islands: small mid-water landing spots. A small RECTANGULAR island specifically
     signals the water is about to end. Implement island shape as a meaningful,
     distinguishable property.

5. test/truck.test.js — phalanxes always leave a passable gap; debris does not spawn
   on level 1; multi-load only occurs at level 9+; touching a truck destroys it and
   flags a player-caused kill.

Acceptance: trucks I cannot shove, debris that kills me, and a rock funnel that warns
me a jump is coming.

Run tests, update STATUS.md, commit as
`phase(6): trucks, debris, level-conditional drop rules, terrain hazards`.
```

**Exit criteria:** All level-conditional rules implemented and tested. Phalanxes always passable.

---

## Phase 7 — Course system and representative courses

**Goal:** The course composition system, seasonal theming, difficulty ramp, and 8 playable courses. Full 32-course authoring is deferred to a later changeset.

**Model:** Opus 5 for the composition system, then Sonnet 5 for the authoring pass. Split this phase into two prompts.
**Effort:** High for 7a, Medium for 7b — architecture vs. data authoring against a fixed system

**Thinking:** `think hard`
**Review:** close for 7a (composition system architecture), light for 7b (data authoring)

### Phase 7a — course composition system (Opus 5)

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 6 before starting.

Phase 7a: the course composition system. Data only in 7b — this prompt is the
machinery.

Important tension in the source material, from IMPLEMENTATION-SPEC.md section 6: marketing material says
32 unique courses, while player documentation describes levels 1-3 as unique followed
by a repeating 4-5-6-7-8 structural pattern with escalating hazards. The spec's
reconciliation is that the 32 are distinct data tables built from recycled structural
building blocks. Implement it that way: 32 explicit course definitions, composed from
the segment archetypes, where courses 4+ follow the recurring structural pattern with
per-level hazard escalation.

Implement:

1. src/world/courses.js
   - A course definition format: ordered list of segment archetype references with
     per-instance parameters (length, width modifiers, hazard density, forced
     features), plus course-level metadata (season, difficulty index, spawn table,
     scroll speed multiplier).
   - A course compiler turning a definition into concrete road geometry via
     src/world/segments.js, deterministically from the course seed.
   - Courses 1-3 unique. Courses 4-32 follow the 4-8 structural cycle with escalating
     hazard parameters.

2. src/world/seasons.js
   - Season cycle: Spring, Summer, Fall, Winter, in that order. Level 1 has no season
     [DOCUMENTED].
   - Season affects the palette of scenery. Define season palettes as data.
   - The end-of-level gas-pump screen previews the next season with an icon:
     flowering tree = Spring, life preserver = Summer, bare tree = Fall, snowman =
     Winter [DOCUMENTED]. Define the icon slots; art comes in Phase 12.

3. Difficulty ramp — a single function difficultyParams(level) returning the tunable
   escalation values: debris density, centre-island frequency, water frequency, turn
   tightness, base scroll speed, spawn density, multi-load truck probability, phalanx
   probability. Every lever from IMPLEMENTATION-SPEC.md section 6. This function is the entire difficulty
   curve in one place, which is what Phase 11 will tune.

4. End-of-level scroll speed-up [COMMUNITY-CONSENSUS]: the scroll subtly accelerates
   near a course's end. Implement with a tunable magnitude and onset distance.

5. test/courses.test.js — structural validation across every authored course: every required
   jump is clearable at achievable speed; no course contains an unavoidable death;
   every course terminates; the season cycle is correct for every level index;
   difficultyParams is monotonic in the parameters that should escalate.

Do NOT author the full 32-course set in this prompt, and note that CS01 will only
author 8 courses total — but the system must scale to 32 without redesign, since
later changesets will fill it in. Build the system and author courses 1, 2, and 3 as
reference implementations.

Run tests, update STATUS.md, commit as
`phase(7a): course composition system, seasons, difficulty ramp`.
```

### Phase 7b — representative course set (Sonnet 5)

**Rescoped:** CS01 authors a small representative set, not all 32. Authoring 29 more
courses that are *valid* is mechanical; authoring 29 that are *fun* is design work
best done after Phase 11 calibration, when we know how the game actually feels.
Full course authoring is deferred to a later changeset.

```
Read CLAUDE.md, STATUS.md, docs/IMPLEMENTATION-SPEC.md section 6, and
src/world/courses.js.

Phase 7b: author a representative course set — courses 4 through 8 only. Together
with courses 1-3 from Phase 7a, that gives 8 playable courses covering the full
structural vocabulary.

Requirements:
- Courses 4-8 establish the recurring structural pattern described in the spec.
  These five are the template every later course varies on, so they matter more
  than their count suggests. Each should feel distinct from the others.
- Between them, courses 1-8 must exercise every one of the seven segment archetypes
  at least once, and every hazard type: debris, phalanx, rock split, bridge, water
  gap, island chain, double jump.
- Respect every level-conditional rule: no debris on level 1, phalanxes from level
  3, double jumps from level 4.
- Season assignment follows the documented cycle (level 1 has no season).
- All eight must pass the structural validation tests from 7a. Run them
  continuously as you author, not just at the end.

Then implement a temporary course-cycling fallback so the game is playable past
course 8: loop courses 4-8 with difficultyParams(level) continuing to escalate by
true level index. Mark it clearly as temporary in a comment and in STATUS.md — it
is scaffolding for playtesting, not the final design.

Update STATUS.md (mark Phase 7 as `Complete (revisit)`, not `Complete`) and commit
as `phase(7b): representative course set, courses 4-8`.

Finish by telling me which of the eight you think is weakest and why.
```

**Exit criteria:** 8 courses passing structural validation, covering every archetype and hazard. Seasons cycle correctly. Difficulty escalates monotonically. Cycling fallback lets play continue past course 8.

---

## Phase 8 — Scoring, lives, bonuses, rollover

**Goal:** Every number from spec §7, exactly.

**Model:** Sonnet 5
**Effort:** Medium — well-specified numeric rules
**Thinking:** `think hard`
**Review:** light

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 7 before starting.

Phase 8: scoring. Every value here is documented — implement them exactly and write a
fidelity regression test for each.

1. src/systems/scoring.js
   - Car destruction: 200 / 300 / 500 by type. Same points whether bumped into
     scenery, landed on, or chain-reacted.
   - No points if a car falls into water or hits debris on its own.
   - Survival: 8 points per second. Note the spec's observation that valid scores are
     multiples of 4, which hints at the internal granularity — implement the
     accumulation so this property holds, and test it.
   - Island landing: 1000 points.
   - End-of-level per-car bonus: level 1 = 300 x cars crashed, level 2 = 400 x, level
     3+ = 500 x. Note "cars crashed" here means enemy cars the player destroyed
     during the course.
   - No-crash (pacifist) bonus: 50,000 for completing a course destroying ZERO cars,
     by any means, including by jumping on them and including trucks. Self-caused
     enemy deaths do NOT break it.
   - Score rollover at 1,000,000 back to 0.
   - "Survival of the fittest": at 999,999+, no further extra cars are granted for the
     rest of the game. Display a "G" indicator by the remaining-cars count.

2. Lives and extra cars
   - DIP-equivalent options: 3 or 5 starting cars (default 3).
   - Bonus thresholds: every 30,000 (default) / every 70,000 / 20,000 once / 30,000
     once. Under "every 30,000", accrue up to 990,000.
   - Game over when the last car is lost.

3. End-of-course tally screen: score, cars crashed, bonus points, next roadway number,
   upcoming season icon. Data and sequencing now; visual polish in Phase 9.

4. test/scoring.test.js — one assertion per documented value. This file is the
   fidelity contract for scoring; make it exhaustive and readable. Include: pacifist
   bonus survives a self-caused enemy death but not a jumped-on truck; per-car bonus
   uses the correct multiplier per level band; rollover wraps correctly; no extra
   cars after 999,999.

Run tests, update STATUS.md, commit as
`phase(8): scoring, bonuses, extra-car thresholds, rollover`.
```

**Exit criteria:** Every spec §7 value has a passing assertion. Pacifist bonus edge cases correct.

---

## Phase 9 — Game state FSM, HUD, attract mode, high scores

**Goal:** It becomes an actual arcade game rather than a physics toy.

**Model:** Sonnet 5
**Effort:** High — a state machine wrapping the whole game
**Thinking:** `think hard`
**Review:** light

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 9 before starting.

Phase 9: the wrapper around the gameplay.

1. src/game/gameState.js — top-level FSM:
     BOOT -> ATTRACT -> READY -> PLAYING -> (CRASH) -> PLAYING
                                        -> COURSE_COMPLETE -> TALLY -> READY
                                        -> GAME_OVER -> HIGH_SCORE_ENTRY -> ATTRACT
   Explicit transitions with documented triggers.

2. src/game/hud.js — layout per IMPLEMENTATION-SPEC.md section 1. Exact pixel coordinates are UNKNOWN
   (section 14 item 8), so lay out sensibly and put the coordinates in one place for
   later correction.
   - Speedometer top-right, with a flashing "JUMP OK" indicator once speed >= 100 mph.
   - Score, live-updating.
   - Cars remaining, with the "G" indicator appearing at 1,000,000+.
   - Flashing "!" warning top-centre before a required jump (already built in Phase 3
     — wire it into the HUD layer).

3. src/game/attract.js — attract loop. The spec documents that a gameplay demo
   exists and that cars are shown with their point values; the full sequence is
   UNKNOWN. Implement: title screen, then a demo of recorded or AI-driven gameplay,
   then the car point-value chart, then high scores, looping. Any key starts a game.
   For the demo, the cleanest approach given our deterministic simulation is to record
   an input sequence and replay it against a fixed seed — do that rather than writing
   a demo AI.

4. src/game/highScores.js
   - Default table from IMPLEMENTATION-SPEC.md section 7: SAW 10012 / KIS 7684 / SUZ 5328 / KIT 3236 /
     YOS 1982. Note: these are the original's defaults and are documented as such. Use
     them, since a five-entry list of three-letter strings is not meaningfully
     protectable, but flag it in OPEN_QUESTIONS.md as a judgement call I should
     confirm.
   - Three-initial entry, joystick/arrows to select a letter, jump/Space to confirm.
     The exact original input scheme is INFERRED.
   - Persist to localStorage. Provide a clear-scores option.

5. Options menu exposing the DIP equivalents from CLAUDE.md section 9: lives 3/5,
   bonus threshold, difficulty. Default to the arcade tournament standard: 3 cars,
   bonus every 30,000, hard.

6. test/gameState.test.js — every transition trigger; game over exactly when the last
   car is lost; tally sequencing.

Run tests, update STATUS.md, commit as
`phase(9): game state machine, HUD, attract mode, high score table`.
```

**Exit criteria:** Full loop from attract through gameplay to game over and back. High scores persist.

---

## Phase 10 — Audio

**Goal:** PSG-style synthesised audio. No sampled assets.

**Model:** Opus 5
**Effort:** High — an audio engine with real interaction points
**Thinking:** `think hard`
**Review:** light

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, and docs/IMPLEMENTATION-SPEC.md section 8 before starting.

Phase 10: audio. All audio is SYNTHESISED at runtime via WebAudio. We ship no audio
files. The original's music and SFX are protected expression (GDD section 13), so we
recreate the CHARACTER of the hardware, not the content.

The original used two AY-3-8910 PSG chips: each has 3 square-wave tone channels plus
a noise generator, 6 tone channels and 2 noise sources total.

1. src/audio/psg.js — a PSG-style voice model.
   - Square-wave oscillators with adjustable duty, plus a noise voice using a buffer
     source of white noise.
   - Per-voice envelope (attack/decay/sustain/release) approximating PSG envelope
     behaviour.
   - A 6-tone + 2-noise voice allocator that mirrors the original's polyphony
     limit — this constraint is what makes it sound period-correct, so enforce it
     rather than allowing unlimited voices.

2. src/audio/audioEngine.js — WebAudio graph, master gain, mute toggle, and
   the browser autoplay-policy handling (audio context must resume on first user
   gesture; do this cleanly, not with a hack).

3. src/audio/cues.js — map game events to sounds. Subscribe to src/core/events.js.
   Documented cues from IMPLEMENTATION-SPEC.md section 8:
   - Jump warning: a high beep accompanying the flashing "!" before a required jump.
     This is the single most gameplay-critical cue, since expert players listen for
     it rather than watching the screen. Make it unmistakable.
   - Engine sound: pitch tracks player speed continuously.
   - Jump: a distinctive, notably long effect.
   - Crash / explosion: for player death and for enemy destruction (differentiate
     them).
   - Bonus / tally sounds.
   - Attract and gameplay music.
   Anything not documented is composed fresh — write original short loops in the
   style of the era. Keep music data as arrays of note/duration in code, not files.

4. Every cue must be emitted by the correct game state. Audit that the events exist
   in the right places rather than adding new ad-hoc calls scattered through gameplay
   code.

5. test/cues.test.js — assert the event-to-cue mapping is complete: every documented
   game state that should make a sound has a registered cue, and no cue is registered
   for a nonexistent event. Do not attempt to test actual audio output.

Run tests, update STATUS.md, commit as
`phase(10): PSG-style synthesised audio engine and cue mapping`.

Tell me which cues you invented wholesale because the GDD does not document them.
```

**Exit criteria:** All documented cues fire at correct game states. Voice limit enforced. No audio files in the repo.

---

## Phase 11 — Calibration pass

**Goal:** Turn a technically-correct simulation into something that feels like the original. This is the phase the whole architecture was built to enable.

**Model:** Fable 5
**Effort:** Max — you're the one judging feel — full reasoning helps translate it
**Thinking:** `ultrathink`
**Review:** close — but you're the reviewer for the tuning itself, not the code
**Note:** This phase is iterative and involves *you* playing. Expect several sessions.

```
Ultrathink about this phase before writing anything.

Read CLAUDE.md, STATUS.md, docs/OPEN_QUESTIONS.md, docs/IMPLEMENTATION-SPEC.md
section 11, and
src/config/tuning.js in full before starting.

Phase 11: calibration. Every constant in tuning.js is currently a guess. The goal of
this phase is a systematic process for me to converge them by feel, and for you to
make that process fast.

I am the playtester. You are building the instrument.

1. Audit tuning.js. Produce a ranked list of every constant by how much it affects
   perceived game feel, using IMPLEMENTATION-SPEC.md section 11's ranking as a starting point but
   applying your own judgement having now seen the code. Tell me which five constants
   I should tune first and in what order, because tuning them in the wrong order
   means retuning.

2. Upgrade the debug overlay into a proper calibration harness:
   - Grouped, labelled sliders/steppers for every tuning constant, organised by the
     ranked order from step 1.
   - Live application without restart.
   - Save/load named tuning presets to localStorage, so I can A/B two feels.
   - "Dump tuning.js" that outputs the current values as a paste-ready file.
   - A telemetry readout: time-to-first-death, average course completion time,
     bumps per course, kills per course, jump success rate. These let us check the
     numbers against the coin-op design targets in GDD section 12.
   - A deterministic replay mode: record an input sequence and seed, replay it under
     different tuning values. This is the key tool — it lets me compare two tunings
     against an identical scenario rather than against my inconsistent play.

3. A scenario mode: jump straight into a specific course at a specific speed with a
   specific enemy arrangement, for testing one interaction repeatedly without
   replaying from course 1.

4. Once the harness is ready, stop and hand back to me. Do not tune the values
   yourself — you cannot feel the game. Wait for me to report back with observations
   in plain language, then translate those into constant changes.

When I give feedback like "the jump feels floaty" or "bumping a tractor feels like
hitting a wall", your job is to map that to specific constants and propose a change
with a rationale, then let me re-test.

Update STATUS.md's Tuning Snapshot after every change I approve — that table is the
record of what we have converged on.

Commit the harness as `phase(11): calibration harness, replay, telemetry`.
```

**Exit criteria:** You can A/B tunings against identical replays. Tuning Snapshot in STATUS.md reflects converged values. Time-to-first-death is in a plausible arcade range.

---

## Phase 12 — Polish, art, gamepad, deploy

**Goal:** Ship it.

**Model:** Sonnet 5, except the art direction pass — see note.
**Effort:** High — polish, deploy correctness, IP audit
**Thinking:** `think hard`
**Review:** close — deploy and IP-audit step

```
think hard about this phase before writing anything.

Read CLAUDE.md, STATUS.md, docs/IMPLEMENTATION-SPEC.md section 9, and
docs/GDD.md section 13 (IP) before starting.

Phase 12: polish and ship.

1. Original art. ALL sprites and backgrounds must be created for this project — see
   CLAUDE.md section 2.3. Generate them programmatically or as hand-authored pixel
   data committed as PNG sprite sheets. Required: player vehicle (16x16, multiple
   rotation/state frames), ten enemy vehicle types, trucks, debris, explosion
   animation, four seasonal scenery tile sets, road/bridge/water/island tiles, HUD
   font, season preview icons, title screen. Match the 16-colour palette constraint
   from GDD section 9 — the palette limit is a big part of why it will read as
   period-correct.

2. Gamepad support hardening. The Phase 1 gamepad code is likely untested. Test it
   properly: connect/disconnect handling, multiple controller layouts, stick deadzone,
   d-pad vs analog.

3. Optional CRT/scanline post-process as a toggle, default OFF. Implement as a
   post-pass on the scaled output. Keep it cheap.

4. Performance: target a stable 60 Hz simulation with no GC pauses. Profile.
   Eliminate per-frame allocation in the entity update path. Verify on a low-end
   device if possible.

5. Accessibility basics: remappable keys, a reduced-flash option (the game has
   several flashing indicators), and a master volume plus mute.

6. Deploy prep: a static build that works from a plain file server. No build step.
   Verify it runs from a subdirectory path, not just root. Add a favicon and correct
   page metadata using the final title — and confirm nowhere in the shipped output
   references the original game's title or publishers, including in code comments
   that end up in shipped files.

7. Final full test run plus a manual pass through all authored courses to confirm
   none are broken or unwinnable. Note in STATUS.md that the full 32-course set
   remains outstanding for a later changeset.

Update STATUS.md, mark all phases complete, commit as
`phase(12): original art, gamepad hardening, polish, deploy prep`.
```

**Note on art:** If you want a stronger visual identity, run the art direction as a separate conversation with **Opus 5** or **Fable 5** and Claude Code's `frontend-design` guidance before this phase. Programmatically generated placeholder art is fine for playtesting but will look like placeholder art.

**Exit criteria:** All authored courses completable. No IP references anywhere in shipped output. Stable performance. Deployable static bundle.

---

## Phase dependency notes

- Phases 0–3 are strictly sequential.
- Phase 4 depends on 2 and 3. Phase 5 depends on 4.
- Phase 6 depends on 5. Phase 7 depends on 3 and 6.
- Phase 8 depends on 4 (kill-cause tracking) and 7 (level index).
- Phases 9 and 10 can be done in either order after 8.
- **Phase 11 must come after 10.** Audio changes perceived game feel more than people expect — calibrating before the sound exists means recalibrating after.
- Phase 12 last.

If you want something playable sooner for morale, the earliest genuinely fun checkpoint is the end of Phase 6.

**Deferred to a later changeset (CS02+):** authoring courses 9–32, touch controls, and any post-calibration course revisions. Phase 7 should be marked `Complete (revisit)` rather than `Complete` when CS01 closes.