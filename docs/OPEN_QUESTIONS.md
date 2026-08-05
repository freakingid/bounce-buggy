# Open Questions

Running log of unknowns and guessed values.
Seeded from GDD section 14.

| ID | Question | Current guess | Where it lives | Impact |
|---|---|---|---|---|
| OQ-01 | Exact velocity/acceleration model and units (GDD §14.1) | Linear accel 200, brake 400 units/sec, 1:1 internal-to-mph scale | `tuning.js`: `PLAYER_ACCEL_UNITS_PER_SEC`, `PLAYER_BRAKE_UNITS_PER_SEC`, `VELOCITY_UNITS_PER_MPH` | High — everything about how the car feels |
| OQ-02 | Bump ricochet constants: impulse coefficient, per-type weight values, control-loss duration/severity (GDD §14.2) | Coefficient 1.0; weight 9..1 by class; ~1s control loss at 0.5x steering | `tuning.js`: `BUMP_IMPULSE_COEFFICIENT`, `WEIGHT_CLASS_VALUES`, `BUMP_CONTROL_LOSS_DURATION_SEC`, `BUMP_CONTROL_LOSS_STEER_FACTOR` | High — combat feel and variety |
| OQ-03 | Jump-arc timing: airborne duration as a function of speed (GDD §14.5) | 0.6s at threshold speed, +0.004s per mph above it | `tuning.js`: `JUMP_DURATION_AT_MIN_SEC`, `JUMP_DURATION_PER_MPH_SEC` | High — whether gaps feel fair |
| OQ-04 | Landing speed cost: 32 mph (ASchultz) vs 40-50 mph (Giant Bomb) — conflicting sources (GDD §14.1) | 32 mph | `tuning.js`: `JUMP_LANDING_SPEED_COST_MPH` | Medium — island-chain difficulty |
| OQ-05 | Post-respawn invulnerability window and death-animation duration (GDD §14.7) | 0s invulnerability; crash animation duration not yet homed (see STATUS.md Phase 0 report) | `tuning.js`: `PLAYER_RESPAWN_INVULNERABILITY_SEC` | Low-Medium — respawn death loops |
| OQ-06 | Precise sprite-to-point-value mapping — which car art is 200/300/500 (GDD §14.10) | Not yet encoded — tier point values exist (`constants.js`), but the type->tier mapping does not | Unhomed — flagged for the phase that builds `entities/enemyCar.js` | Medium — enemy variety readability |
| OQ-07 | Steering rate at min/max speed, and its scaling curve (spec §2.1) | 60 units/sec at min, 140 at max (max > min per documented rule) | `tuning.js`: `STEER_RATE_AT_MIN_SPEED`, `STEER_RATE_AT_MAX_SPEED` | High — control feel |
| OQ-08 | `!` warning lead time before a required jump (spec §5.4) | 1.5s | `tuning.js`: `JUMP_WARNING_LEAD_TIME_SEC` | Medium — reaction budget fairness |
| OQ-09 | Homing strength for skull/hearse and white car AI (spec §4.2) | 0.5 (0-1 scale) | `tuning.js`: `HOMING_STEER_STRENGTH` | Medium — threat level of homing enemies |
| OQ-10 | Bump chain-reaction propagation depth cap (spec §3.5) | 4 | `tuning.js`: `BUMP_CHAIN_MAX_DEPTH` | Low — score ceiling / runaway cascades |
