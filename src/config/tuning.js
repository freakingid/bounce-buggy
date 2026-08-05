/**
 * UNKNOWN and INFERRED values — the tuning surface.
 *
 * Every constant in this file is `[?]` (unknown, needs a placeholder) or
 * `[I]` (inferred, a reasonable starting point) per CLAUDE.md §2.1 and
 * docs/IMPLEMENTATION-SPEC.md §11. None of these are documented facts —
 * they are placeholders expected to change during the Phase 11 calibration
 * pass, once the game is playable enough to tune by feel.
 *
 * Each constant is tagged `// UNKNOWN` (arbitrary placeholder, no evidence
 * basis) or `// INFERRED` (placeholder anchored to a documented hint, e.g.
 * "≈1 second" or "stronger than acceleration"). Comments describe what the
 * constant controls and the symptom if the value is wrong, per spec §11's
 * ranked table. Do not strip these tags on a refactor — they are the record
 * of which numbers are guesses.
 * @module config/tuning
 */

// --- Rank 1: acceleration curve + internal velocity scale (spec §2.1) ------
// Controls: everything. Symptom if wrong: car feels sluggish or twitchy.

/** Player acceleration rate, internal-velocity-units/sec. Spec says "start linear". // INFERRED */
export const PLAYER_ACCEL_UNITS_PER_SEC = 200;

/** Player braking rate, internal-velocity-units/sec. Spec says "stronger than acceleration". // INFERRED */
export const PLAYER_BRAKE_UNITS_PER_SEC = 400;

/** Internal velocity units per displayed mph, for the internal <-> display mapping. // UNKNOWN */
export const VELOCITY_UNITS_PER_MPH = 1;

// --- Rank 2: bump impulse coefficient (spec §3.2) ---------------------------
// Controls: combat feel. Symptom if wrong: bumps feel weightless or like hitting a wall.

/** Scales lateral impulse on bump by relativeSpeed / target weight. // UNKNOWN */
export const BUMP_IMPULSE_COEFFICIENT = 1.0;

// --- Rank 3: per-type weight values (spec §3.3) -----------------------------
// Controls: combat variety. Symptom if wrong: all cars feel identical.
// Order (heaviest to lightest) is [D]; the relative values below are // UNKNOWN placeholders.

/** Relative weight per car/truck type, heaviest to lightest per spec §3.3. // UNKNOWN */
export const WEIGHT_CLASS_VALUES = {
  tractor: 9,
  yellowTruck: 8,
  blueCar: 7,
  greenCar: 6,
  brownCar: 5,
  whiteCar: 4,
  skullHearse: 3,
  raceCar: 2,
  cycle: 1,
};

// --- Rank 4: steering rate + speed scaling (spec §2.1) ----------------------
// Controls: control. Symptom if wrong: can't thread gaps, or oversteers.
// Max must exceed min per spec's "[D] control improves with speed".

/** Steering authority at minimum speed, units/sec. // UNKNOWN */
export const STEER_RATE_AT_MIN_SPEED = 60;

/** Steering authority at maximum speed, units/sec. Must be > STEER_RATE_AT_MIN_SPEED. // UNKNOWN */
export const STEER_RATE_AT_MAX_SPEED = 140;

// --- Rank 5: jump arc duration vs. speed (spec §2.2) ------------------------
// Controls: jump timing. Symptom if wrong: gaps feel unfair or trivial.

/** Airborne duration at the jump-enable threshold speed, seconds. // UNKNOWN */
export const JUMP_DURATION_AT_MIN_SEC = 0.6;

/** Additional airborne duration per mph above the jump threshold, seconds. // UNKNOWN */
export const JUMP_DURATION_PER_MPH_SEC = 0.004;

// --- Rank 6: landing speed cost (spec §2.1, §11) ----------------------------
// Controls: jump chaining. Symptom if wrong: island chains impossible or free.
// Spec default 32 mph, but a conflicting source says 40-50 mph — genuinely contested.

/** Speed lost on landing from a jump, mph. // INFERRED (32 mph default; conflicting source: 40-50 mph) */
export const JUMP_LANDING_SPEED_COST_MPH = 32;

// --- Rank 7: spawn density per level (spec §6.4) ----------------------------
// Controls: pacing. Symptom if wrong: empty road or unavoidable pileups.

/** Base enemy spawn density at level 1. // UNKNOWN */
export const SPAWN_DENSITY_BASE = 1.0;

/** Spawn density increase per level. // UNKNOWN */
export const SPAWN_DENSITY_PER_LEVEL = 0.05;

// --- Rank 8: bump control-loss duration + severity (spec §3.1, §3.4) -------
// Controls: recovery feel. Symptom if wrong: punishing or unnoticeable.

/** Duration of reduced steering authority after a bump, seconds. // INFERRED (spec: "≈1 second") */
export const BUMP_CONTROL_LOSS_DURATION_SEC = 1.0;

/** Steering authority multiplier while BUMPED (1 = no loss, 0 = none). // UNKNOWN */
export const BUMP_CONTROL_LOSS_STEER_FACTOR = 0.5;

// --- Rank 9: jump warning lead time (spec §5.4) -----------------------------
// Controls: reaction budget. Symptom if wrong: unfair deaths or no tension.

/** Lead time before a required jump that the flashing "!" + beep appears, seconds. // UNKNOWN */
export const JUMP_WARNING_LEAD_TIME_SEC = 1.5;

// --- Rank 10: end-of-course speed-up (spec §6.4) ----------------------------
// Controls: difficulty spike. Symptom if wrong: cheap deaths.

/** Seconds before course end that the scroll speed-up begins. // UNKNOWN */
export const COURSE_END_SPEEDUP_ONSET_SEC = 5;

/** Scroll speed multiplier during the end-of-course speed-up. // UNKNOWN */
export const COURSE_END_SPEEDUP_MAGNITUDE = 1.3;

// --- Rank 11: summer no-debris probability (spec §5.2) ----------------------
// Controls: seasonal variety. Symptom if wrong: seasons feel identical.

/** Probability a summer-course truck drops no debris ("usually" per spec). // UNKNOWN */
export const SUMMER_NO_DEBRIS_PROBABILITY = 0.85;

// --- Rank 12: respawn invulnerability (spec §2.3) ---------------------------
// Controls: death recovery. Symptom if wrong: respawn death loops.

/** Invulnerability duration after respawn, seconds. Spec default 0. // UNKNOWN */
export const PLAYER_RESPAWN_INVULNERABILITY_SEC = 0;

// --- Rank 13: hitbox insets (spec §2.3) -------------------------------------
// Controls: collision fairness. Symptom if wrong: feels unfair to the player.

/** Inset applied to the full 16x16 sprite hitbox on each side, px. Spec default full sprite (0). // UNKNOWN */
export const PLAYER_HITBOX_INSET_PX = 0;

// --- Rank 14: homing strength (spec §4.2) -----------------------------------
// Controls: skull/white car threat. Symptom if wrong: trivially dodged or inescapable.

/** How strongly a HOMING enemy steers toward player.x, 0-1 (imperfect tracking). // UNKNOWN */
export const HOMING_STEER_STRENGTH = 0.5;

// --- Rank 15: chain propagation depth cap (spec §3.5) -----------------------
// Controls: score ceiling. Symptom if wrong: runaway cascades.

/** Maximum number of chained bump reactions from a single player bump. // INFERRED */
export const BUMP_CHAIN_MAX_DEPTH = 4;
