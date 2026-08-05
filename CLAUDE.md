# CLAUDE.md

Always loaded at the start of a Claude Code session. **Read this file, then read `STATUS.md`, before touching code.** This file is non-negotiables, conventions, and code map; `STATUS.md` is ground truth for what is actually built.

If a request conflicts with this file, stop and say so rather than silently deviating.

---

## 1. What this project is

**Bounce Buggy** — a browser-based, faithful reimplementation of a 1982 arcade vehicular-combat racer, for coinlessgames.com.

Repo: https://github.com/freakingid/bounce-buggy

Solo developer (Paul). You (Claude Code) are the implementer.

**Design sources, in reading order:**

1. **`docs/IMPLEMENTATION-SPEC.md`** — the distilled working spec. Numbers, tables, state machines. **Read this for day-to-day implementation.**
2. **`docs/GDD.md`** — the permanent research authority. Full evidence, sources, conflicts, design intent. Consult when the spec is ambiguous or you need to understand *why* a rule exists.

If the two disagree, **the GDD wins** — and say so, so the spec can be corrected.

**Target stack:** vanilla JavaScript (ES modules) + Canvas 2D. No runtime dependencies. No frameworks. No bundler. Served as static files.

**Scope for this build:** the arcade original only.

---

## 2. Non-negotiable rules

These are the rules that, if broken, waste the most time. Violating one is worse than doing nothing.

### 2.1 Do not invent game mechanics

Both design documents tag every claim. `docs/GDD.md` uses `[DOCUMENTED]`, `[COMMUNITY-CONSENSUS]`, `[INFERRED]`, `UNKNOWN — needs verification`. `docs/IMPLEMENTATION-SPEC.md` abbreviates these to `[D]`, `[C]`, `[I]`, `[?]`. They mean the same thing.

- `[DOCUMENTED]` numbers are **hard requirements**. Implement them exactly. Do not "improve" them.
- `[COMMUNITY-CONSENSUS]` numbers are defaults. Implement as stated.
- `[INFERRED]` items are reasonable starting points. Implement, but mark the constant with `// INFERRED` in code.
- `UNKNOWN` items must become a **named, tunable constant** in `src/config/tuning.js`, with a `// UNKNOWN` comment and a plausible placeholder. Never bury a guessed number inline.

If you need a number the GDD does not supply, do not silently pick one. Add it to `tuning.js` with a `// UNKNOWN` tag and log it in `docs/OPEN_QUESTIONS.md`.

### 2.2 Arcade only — never implement NES features

The NES/Famicom port added fuel, recharge stations, stunt bonuses, extra lives dropped by trucks, a boss fight, and 16 non-seasonal courses. **None of these belong in this build.** If a source or your own recollection suggests them, that is the wrong game. GDD sections 5 and 7 flag this explicitly.

### 2.3 Never use protected IP

The original name, the Japanese title, the character names, the original publisher marks, and the original sprite art, background art, fonts, and music/SFX are protected. GDD section 13 has the full breakdown.

- All art and audio in this repo must be **originally created** for this project.
- Never commit a ripped sprite sheet, ROM, or audio rip, even as a temporary reference.
- Never put the original title or the original publishers' names in source, filenames, comments, commit messages, metadata, or UI.
- Game **rules and numeric values** are not protected and should be replicated faithfully. This restriction is about expression, not mechanics.

`docs/GDD.md` necessarily names the original game and its publishers — it is a research document. `docs/` and this file are **development-only** and must never be included in a deployed build. The deploy step in Phase 12 must verify that nothing in the shipped output references the original title or its publishers.

### 2.4 Multi-file architecture is required

Do **not** collapse this into a single HTML file. Do not inline JS into HTML beyond the module entry tag. Follow the directory layout in section 4.

### 2.5 Determinism

Gameplay must be reproducible from a seed.

- **`Math.random()` is banned in all gameplay code.** Use the seeded PRNG in `src/core/rng.js`.
- Gameplay updates run on a **fixed timestep**, decoupled from `requestAnimationFrame`. Rendering may interpolate; simulation may not.
- No gameplay logic may read wall-clock time. Use the simulation tick counter.

### 2.6 One phase per session

Build only what the current phase's prompt scopes. Do not peek ahead and start wiring in later phases "while you're in there" — half-built future features are far harder to reason about in a diff than clean phase boundaries. If you notice that a later phase will be easier because of a small choice now, **note it in `STATUS.md` rather than building it.**

### 2.7 Implementation only, against a reviewed plan

Sessions execute a phase prompt from `docs/IMPLEMENTATION-PHASE-CSnn.md`. If a genuine design decision surfaces that the phase prompt and the spec do not cover, **stop and surface it.** Do not invent design or quietly pick an interpretation. Flag it in `STATUS.md` and say so in your response — that is a conversational-session question, not an implementation one.

### 2.8 Edit documents in place

You have read/write access to every file in this directory. "Update `STATUS.md`" or "update the spec" means **edit the actual file on disk**, as part of the commit. Do not print document content into the chat for the human to copy-paste. Printing it is not doing it.

### 2.9 Stop and ask

If a task is ambiguous, if the design sources contradict themselves, or if a request would violate 2.1 through 2.8, stop and ask. Do not guess and proceed. A clarifying question costs a minute; a wrong foundation costs a phase.

---

## 3. Modern implementation, faithful design

This is a **modern take on a 1982 design**, not a hardware emulation. Two categories, treated very differently.

### 3.1 Obsolete hardware limits — do NOT reproduce

Reproducing these buys nothing. The original had them because 1982 silicon was cheap and small.

| Original | What we do |
|---|---|
| 57.44 Hz refresh | **Run at 60 Hz.** |
| 8 simultaneous hardware sprites | Unlimited. |
| 3bpp colour depth, 16-colour PROM palette | Unconstrained. A limited palette is an aesthetic option, not a rule. |
| 2× AY-3-8910 = 6 tone + 2 noise voices | Unconstrained polyphony. |
| Integer-only display scaling | Free scaling. |
| CRT phosphor blending | Optional post-process, default off. |

### 3.2 Design constraints that ARE gameplay — preserve these

| Constant | Value | Why it stays |
|---|---|---|
| Logical play field | **256 x 240** | This is a difficulty parameter, not a display limit. Visible road distance determines the player's reaction budget for gaps and hazards. Widening it makes the game measurably easier and undermines the `!` warning indicator. |
| Orientation | **Portrait** | Same reason, and it is the correct shape for mobile later. |
| Sprite size | 16 x 16 | Sets the collision scale relative to road width. |
| Background field width | 512 (2x play field) | The screen-wrap jump depends on it. |

The play field is a **coordinate space**, not a resolution. Render it at any size, scaled freely, with nearest-neighbour filtering (`ctx.imageSmoothingEnabled = false`) for crisp pixel art.

### 3.3 Express durations in seconds

Because the tick rate is now a free choice, **never hardcode a duration in ticks.** Define durations in seconds in `constants.js`/`tuning.js` and convert at load. If the tick rate ever changes again, nothing breaks.

---

## 4. Directory layout

```
bounce-buggy/
├── CLAUDE.md
├── README.md
├── STATUS.md
├── index.html
├── docs/
│   ├── GDD.md                  # permanent research authority (read-only, all changesets)
│   ├── IMPLEMENTATION-SPEC.md  # distilled working spec — READ THIS FIRST
│   ├── OPEN_QUESTIONS.md       # running list of unknowns + guessed values
│   ├── IMPLEMENTATION-PHASE-CS01.md   # phased plan for changeset 01
│   └── archive/                       # superseded changeset docs + STATUS-HISTORY.md
├── src/
│   ├── main.js                 # entry point, bootstraps engine
│   ├── config/
│   │   ├── constants.js        # DOCUMENTED values. Changing these is a fidelity regression.
│   │   └── tuning.js           # UNKNOWN/INFERRED values. Expected to change during Phase 11.
│   ├── core/
│   │   ├── loop.js             # fixed-timestep game loop
│   │   ├── rng.js              # seeded PRNG
│   │   ├── input.js            # keyboard + gamepad -> abstract input state
│   │   ├── stateMachine.js     # generic FSM helper
│   │   └── events.js           # lightweight pub/sub
│   ├── render/
│   │   ├── canvas.js           # canvas setup, integer scaling, letterbox
│   │   ├── sprites.js          # sprite sheet slicing + draw
│   │   ├── palette.js          # colour tables
│   │   └── debugOverlay.js     # tuning UI, hitbox display, perf
│   ├── entities/
│   │   ├── player.js
│   │   ├── enemyCar.js
│   │   ├── truck.js
│   │   ├── debris.js
│   │   └── entityManager.js
│   ├── systems/
│   │   ├── physics.js          # speed model, jump arc
│   │   ├── bump.js             # car-to-car ricochet
│   │   ├── collision.js        # AABB, boundary, water, debris
│   │   ├── spawner.js          # seeded enemy spawning
│   │   └── scoring.js
│   ├── world/
│   │   ├── road.js             # road geometry + scroll
│   │   ├── segments.js         # the 7 segment archetypes
│   │   ├── courses.js          # the 32 course tables
│   │   └── seasons.js
│   ├── game/
│   │   ├── gameState.js        # attract / play / tally / gameover FSM
│   │   ├── hud.js
│   │   ├── attract.js
│   │   └── highScores.js
│   └── audio/
│       ├── audioEngine.js      # WebAudio graph
│       ├── psg.js              # square/noise voice synth
│       └── cues.js             # cue -> sound mapping
├── assets/
│   └── sprites/                # ORIGINAL art only. No audio files; audio is synthesised.
└── test/
    ├── physics.test.js
    ├── bump.test.js
    ├── collision.test.js
    ├── scoring.test.js
    ├── rng.test.js
    └── courses.test.js
```

---

## 5. Coding standards

- **ES modules only.** `import`/`export`. No CommonJS, no globals, no `var`.
- **No runtime dependencies.** If you believe one is genuinely needed, stop and ask.
- **JSDoc on every exported function.** Include `@param` and `@returns` types.
- **Named constants, never magic numbers.** Every number in gameplay code must come from `constants.js` or `tuning.js`.
- **Pure functions where possible**, especially in `systems/`. Physics and scoring should be testable without a canvas.
- **No deep class-inheritance hierarchies.** Prefer plain objects plus functions, or composition. Entities are data; systems act on them.
- **No `async` in the game loop.** Load assets before starting.
- Keep files under roughly 300 lines. Split when they grow past that.
- Comment the *why*, not the *what*. Every `// UNKNOWN` and `// INFERRED` tag must survive refactors.

**Entity lifecycle — uniform contract.** Every entity follows the same shape: a factory/constructor, `update(dt)`, `draw(ctx)`, and a `dead` boolean. Kill an entity by setting `dead = true`; arrays are filtered **once, at the end of the frame**. **Never splice an array mid-loop** — it skips entities and produces bugs that only appear under load.

**Group constants by system prefix.** `PLAYER_*`, `BUMP_*`, `TRUCK_*`, `SPAWN_*`, `SCORE_*`, `JUMP_*`, `ROAD_*`. This is how balance gets tuned later without hunting through logic.

**Route all scoring through `scoring.js`.** It owns extra-car thresholds, the no-crash bonus flag, rollover, and the "survival of the fittest" latch. Adding points anywhere else silently breaks those. If you ever need a genuine exception, name it explicitly in a comment and in `STATUS.md` — do not add unnamed bypasses.

**Named invariant guards are load-bearing, not test scaffolding.** If you add a runtime assertion that throws on an impossible state, comment it as deliberate. Do not delete such guards on a cleanup pass. If one fires, the thing it guards is broken — the guard is not the bug.

---

## 6. Testing

Use **Node's built-in test runner** (`node --test`). No test framework dependency.

```bash
node --test test/
```

Requirements:

- Every function in `src/systems/` and `src/core/rng.js` has unit tests.
- Every `[DOCUMENTED]` numeric value from the GDD has a test asserting it. These are **fidelity regression tests** — if someone changes the jump threshold from 100 mph to 90, a test must fail.
- The seeded PRNG has a test proving identical sequences from identical seeds.
- Course tables have a structural validation test (every course is completable: no unjumpable gaps, no impossible geometry).
- Tests must not require a DOM or canvas. If a module needs one, the logic is in the wrong place — extract it.
- **Never inline a copy of the logic under test.** Import the real module and drive it. A test that reimplements the function it is testing passes forever and proves nothing.
- **Deliver tests with the code, not after.** A phase is not done until its tests pass.

Do not write visual regression tests. Visual validation is manual.

---

## 7. STATUS.md protocol

`STATUS.md` is the handoff document between sessions. Assume the next session has no memory of this one.

**Update it at the end of every work session**, not just at phase boundaries. Specifically:

1. Update **Current State** to reflect reality.
2. Add a dated entry to **Work Log**.
3. Move anything resolved out of **Blockers**.
4. Add any new unknowns to `docs/OPEN_QUESTIONS.md` and reference them.

**Never let two entries land on the same physical line.** Every entry — the top recap and every bullet in every section — gets a blank line (`\n\n`) before the next is prepended or appended. If you are editing `STATUS.md` with a shell append (`>>`, `echo`, `cat <<EOF`) rather than a normal file edit, verify the written entry actually starts on its own new paragraph. A missing trailing newline is how a status file fuses into a single enormous line. Prefer `str_replace` over shell appends here for exactly this reason.

**Pruning rule:** when **Work Log** exceeds **40 entries** or `STATUS.md` exceeds **400 lines**, move the oldest entries into `docs/archive/STATUS-HISTORY.md`, leave a one-line pointer in `STATUS.md`, and keep the most recent 15 entries in place.

**Archiving is a straight relocation.** Do not summarize, shorten, or rewrite entries while moving them. The archive is only useful if it is a faithful record of what was actually written at the time. Never delete history — relocate it.

Keep the top of `STATUS.md` skimmable. A new session should understand where things stand from the first 30 lines.

---

## 8. Git conventions

- **Commit per phase, on `main`.** Each phase ends as its own commit — code and doc updates together — so a regression can be rolled back to the last known-good phase. Commit at meaningful sub-units within a long phase too.
- **Do not push unless asked.** Local commits are fine; pushing is Paul's call.
- Format: `phase(N): short imperative summary`
  - e.g. `phase(4): implement rear-bump speed transfer`
  - Non-phase work: `fix:`, `docs:`, `test:`, `chore:`
- Never mention the original game title or its publishers in a commit message.
- Do not commit `node_modules/`, ROMs, or ripped assets. `.gitignore` covers these.
- Do not force-push.
- Run `node --test test/` before committing. Do not commit failing tests without noting it in `STATUS.md`.

---

## 9. Things that do not survive the port

The GDD flags original design assumptions that do not translate. Handle them as follows:

| Original assumption | Handling |
|---|---|
| CRT phosphor / 15 kHz portrait monitor | Render at 256x240 portrait, integer-scale, optional CRT/scanline shader as a toggle. Default off. |
| 8-way digital joystick + 1 button | Keyboard (arrows/WASD + Space) and Gamepad API. Handle simultaneous key rollover so "accelerate + steer" works. |
| Coin-op economics, DIP switches | Expose DIP equivalents (lives 3/5, bonus threshold, difficulty) in an options menu. Default to the arcade tournament standard: 3 cars, bonus every 30,000, hard. |
| Coin insert / continue | No coins. Offer an explicit restart. Do not simulate coin scarcity. |
| Arcade high-score table persistence | `localStorage`, with a clear-scores option. |

---

## 10. Documentation layers — do not conflate them

| Document | Purpose | Session context? |
|---|---|---|
| `CLAUDE.md` | Non-negotiables, conventions, code map | **Always** |
| `STATUS.md` | Build **reality** + decisions. You maintain it. | **Always — read first** |
| `docs/IMPLEMENTATION-SPEC.md` | Distilled working spec: numbers, tables, state machines | **Always** |
| `docs/IMPLEMENTATION-PHASE-CSnn.md` | Build **order**: dependency-ordered phases with ready-to-paste prompts | Current changeset only |
| `docs/PLANNED-FEATURES-CSnn.md` | Design detail for what is **not built yet**. When a feature ships, its spec moves out of here. | Current changeset only |
| `docs/GDD.md` | Permanent research authority: full evidence, sources, conflicts, design intent | On demand |
| `docs/OPEN_QUESTIONS.md` | Running log of unknowns and guessed values | On demand |
| `docs/archive/` | Superseded changeset docs, pruned `STATUS.md` history | **Never by default** |

`docs/archive/` is **not session context.** Do not attach or read it during a normal session — pull it in only if a session genuinely needs pre-archive history. Loading it by habit is how context budgets get wasted.

**Naming.** Work is organised into **changesets** — numbered units of scoped work.

Rules:

- `nn` is zero-padded two digits: `CS01`, `CS02`, `CS10`.
- **Never edit a superseded changeset document to reflect new plans.** When a changeset is complete, move its documents to `docs/archive/` and start a new pair. The archive is the project's decision history and must stay accurate to what was actually planned at the time.
- `STATUS.md`, `CLAUDE.md`, `docs/GDD.md`, `docs/IMPLEMENTATION-SPEC.md`, and `docs/OPEN_QUESTIONS.md` are **living documents** that span all changesets. They are never archived, only updated and pruned.
- When referencing the current changeset's phase plan in `STATUS.md` or a commit message, use its full filename so it stays unambiguous after archival.

The current changeset is **CS01** — the initial build, phases 0 through 12, defined in `docs/IMPLEMENTATION-PHASE-CS01.md`.

---

---

## 11. Implementation practices

- **Prefer `str_replace` over full-file rewrites.** Re-read the current file region before editing; keep edits surgical. Full rewrites waste tokens and risk silently losing unrelated changes.
- **Frozen `localStorage` keys — never rename or merge them.** Each is an independent store with its own guarded try/catch load/save path, and none reads or writes another:
  - `bb_scores_v1` — high-score table
  - `bb_settings_v1` — options, key bindings, DIP-equivalents, audio volumes
  - `bb_tuning_v1` — saved tuning presets (Phase 11 calibration)

  Renaming any of these to match a future version bump silently wipes every player's saved data for that key. Add new fields **additively** to an existing key under a known-value-else-default rule; do not create a `_v2`.
- **Phases flag their own risks.** A phase prompt should already name its hazards. If you hit a risk the prompt did not flag, note it in `STATUS.md` so the next phase's prompt can account for it.
- **Model and thinking-effort guidance lives per-phase** in `docs/IMPLEMENTATION-PHASE-CSnn.md`, not here. Follow it unless Paul says otherwise.
- **Propose additions to this file.** When you hit a gotcha that cost you time and would cost the next session the same, say so at the end of the session and propose the rule. Most of the value in this document is accumulated scar tissue.

---

## 12. When you finish a task

1. Run `node --test test/`.
2. Update `STATUS.md` per section 7.
3. Update `docs/OPEN_QUESTIONS.md` if you guessed at anything.
4. Commit.
5. State plainly what you did **not** do, what you guessed, and what should be verified by a human playtest. Do not overstate completeness.
