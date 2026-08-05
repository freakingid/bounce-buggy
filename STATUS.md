# STATUS

> Handoff document. A new session should be able to read the first 30 lines and know exactly where things stand.
> Maintenance rules are in `CLAUDE.md` section 7. Prune when Work Log exceeds 40 entries or this file exceeds 400 lines.

---

## Current State

**Phase:** 0 — Complete
**Last updated:** 2026-08-05
**Build status:** Scaffolded. No gameplay yet.
**Tests:** 6 passing / 29 todo / 0 failing (35 total)
**Playable?** No

**One-line summary:** Full directory skeleton in place per CLAUDE.md §4. Constants, tuning surface, and seeded RNG fully implemented; everything else is a structurally-correct stub. Ready for Phase 1.

---

## Phase Progress

_Changeset CS01 — see `docs/IMPLEMENTATION-PHASE-CS01.md`_

| Phase | Name | Status |
|---|---|---|
| 0 | Scaffold, tooling, test harness | Complete |
| 1 | Render loop, canvas, fixed timestep | Not started |
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

## What Is Stubbed or Faked

_Anything present in the codebase but not really implemented. Be ruthless here — this is the section that prevents a future session from assuming something works._

- `src/main.js` is inert — no bootstrap logic, just a header comment (Phase 1 wires it up).
- Every module under `src/core/` (except `rng.js`), `src/render/`, `src/entities/`, `src/systems/`, `src/world/`, `src/game/`, `src/audio/` exports one or more functions that throw `new Error('not implemented')`. Structurally correct (JSDoc, valid imports/exports, entity factory contract per CLAUDE.md §5, `resolveBump` signature per spec §3.2) but do nothing.
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
| (populated in Phase 2) | | | |

---

## Work Log

_Newest first. Date, what changed, what to watch out for._

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
