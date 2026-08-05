import { test } from 'node:test';

// Module under test: src/systems/scoring.js (createScoreTracker) — stub until Phase 8.

test.todo('all accumulated scores are multiples of SCORE_GRANULARITY (spec §7.1)');
test.todo('destruction method does not affect points awarded (spec §7.1)');
test.todo('enemy self-destruction (unbumped) awards zero points (spec §7.1)');
test.todo('no-crash bonus is awarded only when zero enemies were destroyed (spec §7.3)');
test.todo('no-crash bonus is not broken by enemy self-destruction (spec §7.3)');
test.todo('score rolls over to 0 at SCORE_ROLLOVER (spec §7.5)');
test.todo('no further extra cars are granted at or above SCORE_EXTRA_CAR_LOCKOUT_AT (spec §7.5)');
test.todo('extra-car accrual is capped at EXTRA_CAR_ACCRUAL_CAP under "every 30,000" mode (spec §7.4)');
