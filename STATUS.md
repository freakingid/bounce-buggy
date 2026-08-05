# STATUS

> Handoff document. A new session should be able to read the first 30 lines and know exactly where things stand.
> Maintenance rules are in `CLAUDE.md` section 7. Prune when Work Log exceeds 40 entries or this file exceeds 400 lines.

---

## Current State

**Phase:** 0 — Not started
**Last updated:** YYYY-MM-DD
**Build status:** Not yet scaffolded
**Tests:** 0 passing / 0 total
**Playable?** No

**One-line summary:** Repo initialised. GDD in place. Awaiting Phase 0 scaffold.

---

## Phase Progress

_Changeset CS01 — see `docs/IMPLEMENTATION-PHASE-CS01.md`_

| Phase | Name | Status |
|---|---|---|
| 0 | Scaffold, tooling, test harness | Not started |
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

- (nothing yet)

## What Is Stubbed or Faked

_Anything present in the codebase but not really implemented. Be ruthless here — this is the section that prevents a future session from assuming something works._

- (nothing yet)

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

### YYYY-MM-DD — Repo initialised
- Created repo, added `CLAUDE.md`, `STATUS.md`, `docs/GDD.md`, `docs/IMPLEMENTATION-SPEC.md`, `docs/IMPLEMENTATION-PHASE-CS01.md`.
- Decisions: 60 Hz simulation; 256x240 portrait retained as logical coordinate space; obsolete hardware limits dropped.
- No code yet.

---

## Archive

Older Work Log entries are relocated verbatim to `docs/archive/STATUS-HISTORY.md`. Currently: none.

`docs/archive/` is not session context — do not load it unless a session genuinely needs pre-archive history.
