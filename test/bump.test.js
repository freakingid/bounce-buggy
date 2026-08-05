import { test } from 'node:test';

// Module under test: src/systems/bump.js (resolveBump) — stub until Phase 4.

test.todo('both parties ricochet on contact (spec §3.1)');
test.todo('front contact slows and knocks back the player (spec §3.1)');
test.todo('rear contact speeds up the player (spec §3.1)');
test.todo('higher player speed pushes the target further and loses less control (spec §3.1)');
test.todo('lateral impulse scales with relativeSpeed and inversely with target weight (spec §3.2)');
test.todo('trucks are not bumpable — resolveBump does not apply to truck targets (spec §5.1)');
