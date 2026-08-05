/**
 * Documented, fixed values from docs/IMPLEMENTATION-SPEC.md.
 *
 * Every constant here is `[D]` (documented, hard requirement) or `[C]`
 * (community consensus, implement as stated) per CLAUDE.md §2.1. Changing
 * one of these is a fidelity regression, not a balance tweak — tweakable
 * unknowns live in `tuning.js` instead.
 *
 * Comments cite the spec section each value comes from, using the spec's
 * own tag abbreviations: `[D]` documented, `[C]` community consensus.
 * @module config/constants
 */

// --- Coordinate space and timing (spec §1) ---------------------------------

/** Logical play field width, px. [D] §1 */
export const PLAYFIELD_WIDTH = 256;

/** Logical play field height, px. [D] §1 */
export const PLAYFIELD_HEIGHT = 240;

/**
 * Simulation rate, Hz. Modern choice (original ran 57.44 Hz) — see CLAUDE.md §3.1.
 *
 * This is the ONLY place the tick rate is defined. Every duration in the
 * project is authored in seconds and converted with `secondsToTicks()` from
 * `core/loop.js` (CLAUDE.md §3.3), so changing this value rescales the whole
 * simulation consistently instead of breaking every hardcoded tick count.
 */
export const TICK_RATE_HZ = 60;

/** Player sprite size, px (square). [D] §1 */
export const PLAYER_SPRITE_SIZE = 16;

/** Enemy sprite size, px (square). [D] §1 */
export const ENEMY_SPRITE_SIZE = 16;

/** Foreground (HUD/text) tile size, px (square). [D] §1 */
export const FG_TILE_SIZE = 8;

/** Background tile size, px (square). [D] §1 */
export const BG_TILE_SIZE = 16;

/** Background bitmap width, px (2x play field width, for screen-wrap). [D] §1 */
export const BG_BITMAP_WIDTH = 512;

/** Background bitmap height, px. [D] §1 (sourced from GDD §9, MAME `btime.cpp`). */
export const BG_BITMAP_HEIGHT = 256;

// --- Player speed model (spec §2.1) -----------------------------------------

/** Minimum displayed speed, mph. [D] §2.1 */
export const SPEED_MIN_MPH = 20;

/** Maximum displayed speed, mph. [D] §2.1 */
export const SPEED_MAX_MPH = 220;

/** Displayed speed at/above which a jump may be initiated, mph. [D] §2.1, §2.2 */
export const JUMP_SPEED_THRESHOLD_MPH = 100;

// --- Player state (spec §2.3) -----------------------------------------------

/** Whether the course resets on player death. [D] §2.3 — it does not. */
export const COURSE_RESET_ON_DEATH = false;

// --- Scoring: point table (spec §7.1) ---------------------------------------

/** Points for destroying a tier-1 enemy car. [D] §7.1 */
export const SCORE_CAR_TIER_1 = 200;

/** Points for destroying a tier-2 enemy car. [D] §7.1 */
export const SCORE_CAR_TIER_2 = 300;

/** Points for destroying a tier-3 enemy car. [D] §7.1 */
export const SCORE_CAR_TIER_3 = 500;

/** Points for landing a jump on an island. [D] §7.1 */
export const SCORE_ISLAND_LANDING = 1000;

/** Survival points awarded per second alive. [C] §7.1 */
export const SCORE_SURVIVAL_PER_SEC = 8;

/** All valid scores are multiples of this value. [C] §7.1 — assert in scoring tests. */
export const SCORE_GRANULARITY = 4;

// --- Scoring: end-of-course bonus (spec §7.2) -------------------------------

/** Per-enemy-destroyed course-end bonus, level 1. [D] §7.2 */
export const SCORE_COURSE_BONUS_PER_CAR_L1 = 300;

/** Per-enemy-destroyed course-end bonus, level 2. [D] §7.2 */
export const SCORE_COURSE_BONUS_PER_CAR_L2 = 400;

/** Per-enemy-destroyed course-end bonus, level 3 and beyond. [D] §7.2 */
export const SCORE_COURSE_BONUS_PER_CAR_L3_PLUS = 500;

// --- Scoring: no-crash / pacifist bonus (spec §7.3) -------------------------

/** Bonus for completing a course having destroyed zero enemies. [D] §7.3 */
export const SCORE_NO_CRASH_BONUS = 50000;

// --- Lives and extra cars (spec §7.4) ---------------------------------------

/** Default starting car count. [D] §7.4 */
export const LIVES_DEFAULT = 3;

/** Alternate starting car count (DIP-equivalent option). [D] §7.4 */
export const LIVES_ALTERNATE = 5;

/** Extra-car threshold option: award every 30,000 points (default mode). [D] §7.4 */
export const EXTRA_CAR_THRESHOLD_EVERY_30K = 30000;

/** Extra-car threshold option: award every 70,000 points. [D] §7.4 */
export const EXTRA_CAR_THRESHOLD_EVERY_70K = 70000;

/** Extra-car threshold option: award once at 20,000 points. [D] §7.4 */
export const EXTRA_CAR_THRESHOLD_20K_ONCE = 20000;

/** Extra-car threshold option: award once at 30,000 points. [D] §7.4 */
export const EXTRA_CAR_THRESHOLD_30K_ONCE = 30000;

/** Accrual cap for extra cars under the "every 30,000" mode. [C] §7.4 */
export const EXTRA_CAR_ACCRUAL_CAP = 990000;

// --- Scoring: rollover (spec §7.5) ------------------------------------------

/** Score value at which the counter rolls over to 0. [D] §7.5 */
export const SCORE_ROLLOVER = 1000000;

/** At or above this score, no further extra cars are granted for the rest of the game. [D] §7.5 */
export const SCORE_EXTRA_CAR_LOCKOUT_AT = 999999;

// --- High scores (spec §7.6) -------------------------------------------------

/** Default high-score table (initials, score), highest first. [D] §7.6 */
export const HIGH_SCORE_DEFAULTS = [
  { initials: 'SAW', score: 10012 },
  { initials: 'KIS', score: 7684 },
  { initials: 'SUZ', score: 5328 },
  { initials: 'KIT', score: 3236 },
  { initials: 'YOS', score: 1982 },
];

// --- Course structure (spec §6.2) --------------------------------------------

/** Total number of courses. [D] §6.2 */
export const COURSE_COUNT = 32;
