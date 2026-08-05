# STATUS

> Handoff document. A new session should be able to read the first 30 lines and know exactly where things stand.
> Maintenance rules are in `CLAUDE.md` section 7. Prune when Work Log exceeds 40 entries or this file exceeds 400 lines.

---

## Current State

**Phase:** 1 — Complete
**Last updated:** 2026-08-05
**Build status:** Engine foundation running. No gameplay yet.
**Tests:** 94 passing / 29 todo / 0 failing (123 total)
**Playable?** No — black play field, debug overlay only.

**One-line summary:** Fixed-timestep 60 Hz loop, free-scaled 256×240 portrait canvas, input abstraction, event bus, and debug overlay are all implemented and running; entities, physics, and world are still stubs. Ready for Phase 2.

---

## Phase Progress

_Changeset CS01 — see `docs/IMPLEMENTATION-PHASE-CS01.md`_

| Phase | Name | Status |
|---|---|---|
| 0 | Scaffold, tooling, test harness | Complete |
| 1 | Render loop, canvas, fixed timestep | Complete |
| 2 | Player vehicle: speed model + jump | Not started |
| 3 | Road system, scrolling, boundaries | Not started |
| 4 | Collision + bump physics | Not started |
| 5 | Enemy cars + AI state machines | Not started |
| 6 | Trucks, debris, terrain hazards | Not started |
| 7 | Course system + 8 representative courses | Not started |
| 8 | Scoring, lives, bonuses, rollover | Not started |
| 9 | Game state FSM, HUD, attract, high scores | Not started |
| 10 | Audio | Not started |
| 11 | Calibration / tune-by-feel pass | Not started |
| 12 | Polish, gamepad, CRT filter, deploy | Not started |

Status values: `Not started` / `In progress` / `Complete` / `Complete (revisit)` / `Blocked`

**Deferred to a later changeset:** courses 9–32, touch controls, post-calibration course revisions.

---

## What Works Right Now

_Concrete, honest list of verified-working behaviour. Not aspirations._

- `src/config/constants.js` — every `[D]`/`[C]` documented numeric value from the spec, cited by section.
- `src/config/tuning.js` — the full `[?]` tuning surface from spec §11, each with a placeholder and `// UNKNOWN`/`// INFERRED` tag.
- `src/core/rng.js` — seeded PRNG (mulberry32): `create(seed)`, `next()`, `nextInt(min,max)`, `snapshot()`/`restore()`. Fully tested.
- `index.html` — loads `src/main.js` as a module, black canvas, no console errors.

- `src/core/loop.js` — fixed-timestep loop. `advance()` is a pure accumulator function (steps owed, residual, alpha, dropped steps); `createLoop()` wraps it with a tick counter and injectable clock/scheduler. Catch-up clamped to `MAX_CATCH_UP_STEPS` (5), surplus time discarded. `secondsToTicks()` / `secondsToTicksAt()` are the only route from an authored duration to ticks.

- `src/render/canvas.js` — 256×240 offscreen backbuffer, blitted to a viewport-filling display canvas at the largest aspect-preserving (non-integer) scale, letterboxed black, `imageSmoothingEnabled = false` on both contexts, backing store in device pixels. Verified in headless Chrome at 800×600: scale 2.5×, offset (80, 0), dpr 1.

- `src/core/input.js` — abstract `{up, down, left, right, jump, jumpJustPressed}`. Arrows + WASD + Space; gamepad d-pad, left stick (digitised against a deadzone), bottom face button. Simultaneous keys verified through real DOM events in headless Chrome. Sampled once per simulation tick from `update()`.

- `src/core/events.js` — pub/sub with `on`/`off`/`once`/`emit`/`clear`/`listenerCount`. Dispatch iterates a copy, so a handler may unsubscribe itself mid-emit. Implemented and tested, but **not yet wired into anything** — Phase 10 (audio cues) is its first consumer.

- `src/render/debugOverlay.js` — backtick toggles it. Shows FPS, ticks/sec (red when off 60), tick counter, accumulator, alpha, steps-last-frame, dropped steps, live input state, scale and dpr. Also draws the play-field outline, which is the only way to see the field boundary against a black letterbox.

- `src/main.js` — wires canvas + input + loop + overlay. Samples input in `update()`, clears and presents in `render()`.

## What Is Stubbed or Faked

_Anything present in the codebase but not really implemented. Be ruthless here — this is the section that prevents a future session from assuming something works._

- **Gamepad support is untested against real hardware.** The mapping layer (`readGamepad`) is unit-tested against fake Gamepad-shaped objects, which proves the button-index and deadzone decisions but not that a physical pad enumerates the way the Standard Gamepad spec says. Nobody has held a controller and confirmed it. Button 0 = jump, 12–15 = d-pad, axes 0/1 = left stick.
- `render/palette.js`, `render/sprites.js`, `core/stateMachine.js`, and everything under `src/entities/`, `src/systems/`, `src/world/`, `src/game/`, `src/audio/` still throw `new Error('not implemented')`. Structurally correct (JSDoc, valid imports/exports, entity factory contract per CLAUDE.md §5, `resolveBump` signature per spec §3.2) but do nothing.
- The interpolation alpha is plumbed from `advance()` through `createLoop()` into `render(alpha, stats)`, but **nothing consumes it yet** — there are no entities with previous/current positions to interpolate between. Phase 2 is where it starts mattering.
- `update()` in `main.js` does nothing but sample input. There is no simulation state.
- `test/physics.test.js`, `bump.test.js`, `collision.test.js`, `scoring.test.js`, `courses.test.js` contain only `test.todo(...)` placeholders describing planned coverage — no real assertions yet, since the systems they'd test don't exist.

---

## Blockers

_Things that stop forward progress. Remove when resolved._

- None

## Decisions Needed From Human

_Questions that require the project owner, not another coding session._

- None currently

---

## Tuning Snapshot

_Current values of the UNKNOWN constants from `src/config/tuning.js`. Update whenever they change during Phase 11 calibration. This is the record of what "feels right" so far._

| Constant | Current value | Confidence | Notes |
|---|---|---|---|
| `GAMEPAD_STICK_DEADZONE` | 0.35 | Low | Added Phase 1 (OQ-11). No spec basis — a modern-port concern only. Never validated on real hardware. |
| (gameplay values populated in Phase 2) | | | |

---

## Work Log

_Newest first. Date, what changed, what to watch out for._

### 2026-08-05 — Phase 1: fixed-timestep loop, scaled canvas, input abstraction

- Implemented `core/loop.js`, `core/input.js`, `core/events.js`, `render/canvas.js`, `render/debugOverlay.js`, and wired them together in `main.js`. Added `test/loop.test.js`, `test/input.test.js`, `test/events.test.js` (88 new assertions; suite is now 94 passing / 29 todo / 0 failing).

- **Renamed `SIM_HZ` to `TICK_RATE_HZ`** in `constants.js`. The Phase 1 prompt names `TICK_RATE_HZ` explicitly and Phase 0 had already written `SIM_HZ`; nothing referenced it yet, so this was a free rename rather than two names for one concept. It is the only definition of the tick rate in the project.

- **Timing contract, stated precisely because later phases will depend on it:** the loop tracks *elapsed real time*, not frame count. A simulated second of 144 Hz frame deltas can total a hair under 1.0 s in floating point and legitimately produce 59 steps, with the shortfall banked in the accumulator rather than lost. Tests assert "within one step of 60 per second" and "drift does not grow over a simulated minute" — asserting exactly 60 would be asserting a float coincidence, and would fail intermittently. Don't "fix" that assertion into an equality.

- `advance()` is a pure function (accumulator, delta) → (steps, residual, alpha, droppedSteps), so the whole timing model is tested with no clock, browser, or timers. `createLoop()` takes injectable `now`/`requestFrame`/`cancelFrame`; the tests drive it through a fake scheduler.

- Spiral-of-death clamp: at most 5 catch-up steps per frame, and **dropped time is discarded, not banked** — the residual is only the sub-step remainder, so the loop resumes in phase instead of owing 600 steps forever. `MAX_CATCH_UP_STEPS` lives in `loop.js`, not `constants.js`/`tuning.js`: it is engine safety policy, not a game value, and putting it on the tuning surface would invite someone to "tune" it.

- `secondsToTicks()` has a deliberate rule worth knowing: **a positive duration never rounds down to zero ticks.** 0.004 s becomes 1 tick, not 0. A duration a designer bothered to author must happen; silently becoming instantaneous is a bug that is very hard to see. Zero is the only input that yields zero ticks. It also throws on negative/NaN durations — a NaN tick deadline is a timer that never fires and never explains itself.

- **Nowhere was I tempted to hardcode a tick count.** No raw tick value exists outside `loop.js`. The only durations that entered this phase were the debug FPS/TPS averaging window (`METRICS_WINDOW_MS`, wall-clock milliseconds, presentation-only, never touches the simulation) and `MAX_CATCH_UP_STEPS` (a step *count*, not a duration).

- Verified in headless Chrome, not just in unit tests: canvas scaling (800×600 window → scale 2.5×, offset (80, 0), 256×240 backbuffer, smoothing off on both contexts), simultaneous `ArrowUp`+`ArrowLeft`+`Space` through real DOM keyboard events, jump edge detection across samples, the press-and-release-between-samples latch, and the overlay actually writing pixels. Screenshot confirmed the portrait field centred with black letterbox bars.

- **Watch out for:** assigning `canvas.width`/`height` resets *every* context property, including `imageSmoothingEnabled`. `canvas.js` re-applies it inside `resize()`. Drop that line and the game goes blurry on the next window resize, with nothing in the code to point at.

- **Watch out for:** `devicePixelRatio` changes on browser zoom or a drag between monitors and does not reliably fire a resize event, so `present()` re-checks it each frame (a cheap property read, no layout).

- **Untested:** gamepad support against real hardware — see "What Is Stubbed or Faked". Also untested: sustained 60 ticks/sec under a real `requestAnimationFrame` on a real display. Headless Chrome throttles rAF to a couple of frames under virtual time, so the 60 Hz / 120 Hz / 144 Hz behaviour is proven only against the injected fake scheduler. **This is the phase's acceptance criterion and still needs a human to open `index.html`, press backtick, and read the TPS line.**

- Added `GAMEPAD_STICK_DEADZONE` (0.35, `// INFERRED`) to `tuning.js` and logged it as OQ-11. It has no spec basis at all — the original cabinet had an 8-way digital joystick, so digitising an analogue stick is purely a modern-port decision.

- Noted for Phase 2 rather than built (CLAUDE.md §2.6): `render(alpha, stats)` already carries the interpolation alpha end-to-end, so entity rendering can interpolate from day one without a retrofit.

---

### 2026-08-05 — Phase 0: scaffold complete

- Built the full directory skeleton per CLAUDE.md §4. Every listed module exists with valid ES module imports/exports and JSDoc; only `constants.js`, `tuning.js`, `rng.js`, `index.html`, `README.md`, `.gitignore` are fully implemented this phase, per the CS01 Phase 0 prompt.
- `constants.js` covers every `[D]`/`[C]` numeric value from the spec I could find a clean home for. Left out (flagged, not silently dropped): enemy type→point-tier mapping, weight-class order/values, and season/segment/difficulty-ramp tables — all either `[?]` or a structural decision that belongs to a later phase's own design pass.
- `tuning.js` covers spec §11's full 15-row ranked tuning surface, expanded into ~20 named constants where a row bundled multiple values. Two orphaned `[?]` items from spec prose that aren't in §11's table — crash-animation duration, and the enemy sprite→point mapping — are called out in `docs/OPEN_QUESTIONS.md` (OQ-05, OQ-06) rather than guessed into a file.
- Fixed a doc gap while here: IMPLEMENTATION-SPEC.md §1 listed the background field width (512) but not its height. GDD §9 (MAME `btime.cpp`) documents the full bitmap as 512×256, so I added the height to the spec table.
- Seeded `docs/OPEN_QUESTIONS.md` (previously just a header) with 10 rows tracing the highest-impact `tuning.js` placeholders back to GDD §14's own open-questions list.
- **Watch out for:** `node --test test/` (the exact command CLAUDE.md §6/§12 specify) fails on this machine's Node v24.17.0 — it throws `Cannot find module '.../test'` instead of discovering the directory. Confirmed with a throwaway repro outside this repo, so it's an environment/Node quirk, not a project bug. Bare `node --test` (auto-discovers from cwd) and `node --test test/*.test.js` (explicit glob) both work correctly and are what I used to verify. Worth confirming on Paul's actual dev machine before assuming CLAUDE.md needs a wording fix.
- 35 tests total: 6 real passing assertions (`rng.test.js`), 29 `test.todo()` placeholders in the other five test files (not failures — Node's test runner reports todos separately), 0 failing.

---

### YYYY-MM-DD — Repo initialised
- Created repo, added `CLAUDE.md`, `STATUS.md`, `docs/GDD.md`, `docs/IMPLEMENTATION-SPEC.md`, `docs/IMPLEMENTATION-PHASE-CS01.md`.
- Decisions: 60 Hz simulation; 256x240 portrait retained as logical coordinate space; obsolete hardware limits dropped.
- No code yet.

---

## Archive

Older Work Log entries are relocated verbatim to `docs/archive/STATUS-HISTORY.md`. Currently: none.

`docs/archive/` is not session context — do not load it unless a session genuinely needs pre-archive history.
