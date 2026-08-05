import { test } from 'node:test';

// Module under test: src/systems/physics.js (stepPlayerPhysics) — stub until Phase 2.

test.todo('speed stays within SPEED_MIN_MPH..SPEED_MAX_MPH (spec §2.1)');
test.todo('jump is only permitted at displayed speed >= JUMP_SPEED_THRESHOLD_MPH (spec §2.2)');
test.todo('landing on a jump deducts JUMP_LANDING_SPEED_COST_MPH (spec §2.1, §11)');
test.todo('no landing lockout — a new jump may start on the exact tick of landing (spec §2.2)');
test.todo('steering authority at max speed exceeds steering authority at min speed (spec §2.1)');
