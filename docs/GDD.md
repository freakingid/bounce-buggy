# Game Design Document: *Bump 'n' Jump* (Data East / Bally Midway, 1982) — Implementation Spec for a Browser HTML5/Canvas Reimplementation

**Target:** coinlessgames.com — vanilla JavaScript + Canvas 2D. Faithful reimplementation of the ARCADE original (Data East DECO Cassette / BurgerTime dedicated hardware; JP title *Burnin' Rubber* / バーニンラバー).

**Evidence tags:** **[DOCUMENTED]** = stated in a cited primary/near-primary source; **[COMMUNITY-CONSENSUS]** = agreed across multiple expert/player guides but not in a primary doc; **[INFERRED]** = my deduction. "**UNKNOWN — needs verification**" marks holes. Per the client: a hole is preferable to a fabrication.

> **Source integrity note:** During research, one preservation-site page (tcrf.net's "Bump 'n' Jump (Arcade)" entry) returned a prompt-injection payload disguised as page content (instructions to delete/scramble files) instead of game data; it was disregarded and no data from it is used here. Also note the arcade original has **no fuel mechanic and no boss fight** — those belong to the 1986/1988 NES/Famicom redesign (*Buggy Popper*). Many web descriptions conflate the two. Everything below is the ARCADE game unless a section explicitly says "NES port."

---

## 1. Core Loop and Win/Lose Conditions

**One-sentence summary:** You drive a red car up a vertically-scrolling road, ramming rival cars into the roadside and jumping over trucks, debris, and water gaps, trying to reach the end of each course; you lose a car on any crash, and the game ends when your last car is gone. **[DOCUMENTED — arcade-history.com; Intellivision manual, history.blueskyrangers.com]**

**First 30 seconds (arcade):** **[COMMUNITY-CONSENSUS — GameFAQs/ASchultz; StrategyWiki]**
- Game begins immediately with the player's red car on an open straightaway ("Level 1 … You start on a straightaway"), surrounded by a pack of enemy cars.
- Player pushes joystick **up** to accelerate (toward the 220 mph display), steers left/right, and begins bumping enemy cars into the roadside for points.
- No timer, no lap, no rank. The only implicit objective indicator is that the road scrolls continuously toward the course end.

**Level begins:** car placed on road, road scrolls upward, enemy cars spawn ahead of and behind the player. **[COMMUNITY-CONSENSUS]**

**Level ends:** the player's car "drives up to the gas pump and refuels"; an end-of-roadway screen shows score, number of cars crashed, bonus points, next roadway number, and the upcoming season. **[DOCUMENTED — Intellivision manual, history.blueskyrangers.com]**

**Death triggers (lose a car):** **[DOCUMENTED — Wikipedia; Intellivision manual; GameFAQs/ASchultz]**
- Any part of the car touches the roadside railing/trees (out of bounds): "if any part of your car goes out of bounds, you crash."
- Landing in / driving into water (failed jump over a gap).
- Hitting road debris (rocks/dirt dropped by trucks).
- A crash on a bridge (bridge edges are lethal).

**Game over:** all cars lost. **[DOCUMENTED — Intellivision manual: "Crash all your cars and you're retired."]**

**Pseudocode:**
```
onFrame():
  scrollRoad(currentScrollSpeed)
  updatePlayer(); updateEnemies(); updateHazards()
  if playerOutOfBounds() or playerInWater() or playerHitDebris(): loseCar()
  if reachedCourseEnd(): endOfLevelBonus(); nextLevel()

loseCar():
  lives -= 1
  if lives < 0: gameOver()
  else respawnBeforeCrashSite()
```

---

## 2. Controls and Input Scheme

**Cabinet control panel:** one **8-way joystick** + **one button (JUMP)**. Upright and cocktail cabinets were both produced; the wiring harness is compatible with Midway BurgerTime PCBs. **[DOCUMENTED — arcade-history.com; MiSTer MRA: `<joystick>8-way</joystick>`, `<num_buttons>1</num_buttons>`; pinballrebel.com cabinet photos; arcade-museum.com]**

**Steering / throttle model:** **[DOCUMENTED — arcade-museum.com; Intellivision manual; StrategyWiki]**
- Joystick **up = accelerate**, **down = decelerate/brake**, **left/right = steer**. "forward is fast, backward is slow." Steering is **free lateral movement across the road** (NOT discrete lanes) — the car can be positioned at any x across the drivable width.
- Movement input is discrete/digital (8-way), not analog. There is no separate gas pedal; throttle is the vertical axis of the stick.

**Speed range:** displayed **20 mph (idle/cruise) to 220 mph (top)**. **[DOCUMENTED — arcade-museum.com: "Your car's speed tops out at 220"; Intellivision manual: "from a cruising speed of 20 mph to flat out 220 mph"; GameFAQs]**

**Jump initiation:** press JUMP; only allowed when **speed ≥ 100 mph**. **[DOCUMENTED — arcade-museum.com; Wikipedia; Intellivision manual: "You can jump any time, as long as you're going 100 m.p.h. or faster"]** A "JUMP OK" flashing indicator appears by the speedometer once ≥ 100 mph. **[COMMUNITY-CONSENSUS — StrategyWiki]**

**Jump distance ∝ speed:** "The faster your speed, the farther your car will jump." **[DOCUMENTED — Intellivision manual]**

**Mid-air steering:** the car can be steered left/right while airborne, including going off one screen edge and reappearing on the other when the road is at its widest. **[DOCUMENTED — arcade-museum.com; Intellivision manual; arcade-history.com]**

**Input nuances:** **[COMMUNITY-CONSENSUS — GameFAQs/ASchultz unless noted]**
- **No jump recovery lockout:** "There's no recovery time between jumps" — you may tap JUMP again the instant you land, enabling rapid double/triple jumps over island chains.
- Bump physics depend on collision direction (see §4).
- **Input buffering / turn-cornering priority:** UNKNOWN — needs verification (requires disassembly of the input-read routine in the DECO 6502 code via MAME `btime.cpp`).

**Browser caveat (does not survive the port):** Map the stick to arrow keys/WASD (Up=accelerate, Down=brake, Left/Right=steer) and JUMP to Space; also support the Gamepad API. The original's 8-way digital stick makes diagonal "steer-while-accelerating" a single natural input; on a keyboard it needs two simultaneous keys, so handle key rollover. The single dedicated JUMP button and the "hold up to go" throttle are cabinet conventions, not on-screen affordances.

---

## 3. Player State

**Starting lives (arcade):** DIP-selectable **3 or 5** cars (default **3**). **[DOCUMENTED — arcade-museum.com DIP table; MiSTer MRA `Lives ids="3,5"`; Twin Galaxies tournament settings = 3 cars]**
- Intellivision port: **5 cars**, extra at 20,000 only. **[DOCUMENTED — Intellivision manual]**

**Extra-car thresholds (arcade), DIP "Bonus At":** **[DOCUMENTED — arcade-museum.com DIP table; MiSTer MRA]**
- Option A: **every 30,000** points (default)
- Option B: **every 70,000**
- Option C: **20,000 only** (one extra, then never)
- Option D: **30,000 only** (one extra, then never)
- Under the "every 30,000" setting, bonus cars accrue up to 990,000. **[COMMUNITY-CONSENSUS — StrategyWiki]**

**Speed values:** display range 20–220 mph. Each jump costs **32 mph** on landing per ASchultz; other guides estimate "40–50 mph." **CONFLICT:** ASchultz (GameFAQs) states 32 mph precisely; Giant Bomb says "around 40-50 MPH." The exact internal decrement and the acceleration curve are **UNKNOWN — needs verification** via MAME `btime.cpp` RAM watch / disassembly. The mph figure is a display value ("partially just for display" — ASchultz), so internal velocity units differ from the shown number.

**Acceleration curve:** UNKNOWN — needs verification. Community reports higher speed → better control ("The faster you go, the better control the car seems to have"). **[COMMUNITY-CONSENSUS — arcade-museum.com]**

**Hitbox behavior:** Any part of the sprite out of bounds = crash. **[DOCUMENTED — GameFAQs]** Sprite is 16×16 px (see §9). Exact hitbox insets: UNKNOWN — needs verification.

**Respawn handling:** the next car "is automatically placed on the road before your crash site." **[DOCUMENTED — Intellivision manual]** Play resumes near the crash point within the same course (the level does NOT fully reset). Community advises "always push forward when restarting a level" because you may respawn near an edge or just before a required jump; if the crash was near a level end, the resumed segment "start[s] off sped up." **[COMMUNITY-CONSENSUS — GameFAQs]**

**Invulnerability window after respawn:** UNKNOWN — needs verification. No source documents post-respawn i-frames; **[INFERRED]** likely minimal/none, given the "push forward immediately or die" advice.

**Death animation duration:** UNKNOWN — needs verification (frame-count from MAME video).

---

## 4. Enemy / Hazard Roster

Two documented classes: **cars** (bumpable AND jumpable) and **trucks** (NOT bumpable — only killable by jumping on them; they drop debris). **[DOCUMENTED — Wikipedia]** The Intellivision manual enumerates **10 computer-car types**; the arcade point tiers are **200 / 300 / 500**. Behaviors below combine the Intellivision manual (near-primary, with named behaviors) with arcade player guides.

### 4.1 Bump physics (all bumpable cars) — **[DOCUMENTED — Intellivision manual; arcade-museum.com]**
```
onBump(player, enemy, contactSide):
  # both cars ricochet
  player.vx += -contactNormal.x * f(relativeSpeed)
  enemy.vx  +=  contactNormal.x * f(relativeSpeed)
  if contactSide == FRONT:  player.speed -= dSlow    # hitting a car ahead slows you and knocks you back
  if contactSide == REAR:   player.speed += dSpeed   # tapping a car from behind speeds you up
  # "The faster your speed, the further you will bump the other car."
  # Higher player speed => less control lost.
```
Exact `f()` and the `dSlow`/`dSpeed` constants: UNKNOWN — needs verification (MAME RAM/disassembly).

### 4.2 Car types (Intellivision-manual names + arcade tiers)
Behavior descriptions **[DOCUMENTED — Intellivision manual]**; point tiers **[DOCUMENTED — arcade-history.com / arcade-museum.com]**; sprite-to-tier mapping **[COMMUNITY-CONSENSUS — StrategyWiki car chart]**.

| Type (mfr name) | Behavior | Weight (bump resistance) | Arcade points |
|---|---|---|---|
| Tractor | Always straight, very slow; nearly immovable | Heaviest bumpable | 200 |
| Cycle (motorbike) | Weaves a lot, medium speed; very light (bumps far) | Lightest | — |
| Skull car / hearse | Very fast, fairly light; frequently steers straight at player; travels in packs of 2–4 | Light-ish | 500 |
| Race car | Super light, very fast, occasional zig-zag | Lightest | 300–500 |
| Dump truck | Fast; sporadically dumps debris; **explodes on contact once emptied**; cannot be bumped | N/A (truck) | 300 |
| White car | Fairly light, bumps far, heads straight at player | Light | 500 |
| Yellow truck | Second-heaviest; weaves a lot | Heavy | — |
| Green car | Very light, zig-zags a lot | Light | 200–300 |
| Blue car | Light, fast, weaves | Light | 200 |
| Brown car | Fairly light, bumps far, zig-zags | Light | — |

StrategyWiki's arcade car chart lists point values 500/300/300/300/500 (row 1) and 300/200/300/200/200 (row 2). The Intellivision behavior names do not map 1:1 to arcade sprites — treat the arcade **200/300/500 tiers** (arcade-history.com) as authoritative; precise sprite→value mapping is an open question (§14).

### 4.3 Truck / debris behavior (arcade)
**[DOCUMENTED — Wikipedia for "trucks drop obstacles"; Giant Bomb / StrategyWiki for touch-to-kill; rest COMMUNITY-CONSENSUS — GameFAQs, StrategyWiki]**
- Dump trucks move in a straight line, often faster than the player's top speed.
- When a truck is in roughly the **top third of the screen**, it drops debris (dirt/rock piles) behind it.
- Debris destroys the player on contact and destroys enemy cars that hit it.
- **Touching a truck at all destroys the truck** (and counts as a "kill" that breaks the no-crash bonus).
- **Level 1 special case:** dump trucks do NOT drop debris on Level 1; dropping begins on Level 2.
- **Summer levels:** dump trucks usually do NOT drop debris.
- **Level 9+:** trucks can dump **multiple loads**.
- **Phalanxes:** Level 3+ can present three trucks abreast dropping debris; survive by parking in a lane between them.

### 4.4 Generic enemy-car state machine — **[INFERRED from documented behaviors]**
```
states: SPAWN -> CRUISE -> {WEAVE | ZIGZAG | HOMING} -> (BUMPED) -> {RECOVER | WRECKED}

CRUISE : match road, drift by type profile
WEAVE  : sinusoidal lateral oscillation (cycle, yellow truck, blue car)
ZIGZAG : periodic sharp lateral jumps (race, green, brown)
HOMING : steer toward player.x (skull, white)          # "heads straight toward your car"
BUMPED : apply ricochet vx; lose control ~1s           # both cars "lose control for a second"
WRECKED: if pushed into railing/water/debris -> explode, award points
         (if it falls into a ditch/water on its own or is "stacked" against water -> NO points)
```
**[DOCUMENTED — StrategyWiki: "both cars in a collision lose control for a second"; GameFAQs: no points if a car falls in a ditch/water on its own.]**

### 4.5 Terrain hazards — **[DOCUMENTED — Intellivision manual; StrategyWiki; GameFAQs]**
- **Roadside** (railings/trees/bushes): lethal boundary on both sides.
- **Rocks / rock funnels / splits:** rock barriers divide the road into narrow lanes (appear after Level 3). A "rock funnel" graphic always precedes a roadway jump. **[COMMUNITY-CONSENSUS]**
- **Water gaps / rivers:** must be jumped; failure = death. Signaled by a flashing "!" + beep.
- **Bridges:** about half the width of a normal road; edges lethal; sometimes lead directly into a jump.
- **Islands:** small landing spots mid-water; landing on one = 1,000 pts and enables a follow-up jump. A small **rectangular** island signals the water is about to end. **[DOCUMENTED — arcade-museum.com for 1,000 pts; StrategyWiki for island typing]**

---

## 5. Level / Wave / Board Structure

**Count:** the game presents **32 unique levels/courses**; per arcade-museum they "do not roll over back to the first level after level 32." **[DOCUMENTED — arcade-museum.com]** However, expert play documents a **repeating 5-course pattern**: Levels 1–3 are unique, then Levels 4, 5, 6, 7, 8 form a set that repeats (Level 9 = the Level-4 pattern, etc.) with escalating hazards. **CONFLICT/nuance:** "32 unique stages" (arcade-museum/marketing) vs the player-observed "4–8 loop" (StrategyWiki, TV Tropes). **[INFERRED reconciliation]:** the 32 courses are distinct data tables, but their *structure* recycles the same building blocks in patterns 4–8, so late courses feel like variations. A faithful clone should implement the 4–8 structural loop and, ideally, 32 discrete layout tables. Exact per-course tables: UNKNOWN — needs verification (extract from ROM).

**Seasons / themes:** each level is themed by season — **Spring, Summer, Fall, Winter** — cycling in that order (Level 1 is unnamed / has no season). Scenery changes color per season; the end-of-level gas-pump icon previews the next season (flowering tree = Spring, life preserver = Summer, bare tree = Fall, snowman = Winter). **[DOCUMENTED — arcade-museum.com; Intellivision manual]**

**Road-segment vocabulary (implement as a segment sequencer):** **[COMMUNITY-CONSENSUS — GameFAQs/ASchultz]**
1. Freeway (very wide; rarer later)
2. Shrub edges (narrower; small curves)
3. Lake-on-left (narrows road)
4. Bridge-out / water gap to jump
5. Double-jump (land on island + immediate re-jump; later levels)
6. Bridge-on-left with islands-on-right
7. Split highway (narrow left lane / wider right with debris + small river)

**Difficulty ramp levers:** more debris, more center islands, more water, tighter turns, faster base scroll, multi-load trucks (L9+), truck phalanxes (L3+), double/triple jumps (L4/L7+). **[DOCUMENTED — Intellivision manual "more road debris, center islands, water and turns"; specifics COMMUNITY-CONSENSUS]**

**End-of-level speed-up:** the scroll subtly speeds up just before a level ends (an "unfair" surprise that kills players near the finish). **[COMMUNITY-CONSENSUS — GameFAQs]**

**Loop / kill screen / rollover:** Score rolls over at 1,000,000 back toward 0 ("when the game clocks … the score will revert back to zero"). At **999,999+**, a **"survival of the fittest"** mode activates: NO further extra cars are granted for the rest of the game. **[DOCUMENTED — Wikipedia; StrategyWiki]** No documented graphical kill screen. Whether a true crash/kill screen exists at extreme scores: UNKNOWN — needs verification. (A "kill screen / out of memory" description encountered during research referred to Donkey Kong, NOT this game.)

**NES port structure (DISTINCT — do not use for an arcade clone):** 16 courses divided among **seaside, urban, rural, and mountain** environments "rather than the original seasonal scenery"; the car has "a diminishing power supply that must be replenished by collecting barrels; when it is exhausted, the car can no longer jump"; a **boss fight at the end of stage 16** (the car carrying the girlfriend), after which the 16 stages restart harder. **[DOCUMENTED — MobyGames; Giant Bomb; retrogamesreview.co.uk]**

---

## 6. Scoring

**Per-car destruction (arcade):** **200, 300, or 500 points** depending on car type (see §4.2). Same points whether you bump it into a wall, land on it, or chain-react another car into it. **[DOCUMENTED — arcade-history.com; GameFAQs]**
- **No points** if a car falls into a ditch/water on its own or is merely "stacked" against water. **[DOCUMENTED — GameFAQs]**
- Cars that hit truck-dropped debris **on their own** (not bumped into it) do NOT count against the no-crash bonus. **[DOCUMENTED — Wikipedia]**

**Distance / survival:** **8 points per second survived** (arcade). **[COMMUNITY-CONSENSUS — GameFAQs/ASchultz]** The Intellivision manual states more generally "The further you drive, the more points you get." ASchultz notes valid scores are multiples of 4 — an internal scoring-granularity clue. **[COMMUNITY-CONSENSUS]**

**Island landing bonus:** **1,000 points** for landing on an island in the water. **[DOCUMENTED — arcade-museum.com; Intellivision manual]**

**End-of-level per-car bonus:** **[DOCUMENTED — Intellivision manual; arcade-history.com formula "200 + 100/level × cars"]**
- Level 1: **300 × (cars crashed)**
- Level 2: **400 × (cars crashed)**
- Level 3+: **500 × (cars crashed)**

**No-crash (pacifist) bonus:** **50,000 points** for completing a level without destroying ANY car (by bump or jump). **[DOCUMENTED — Wikipedia; arcade-history.com; arcade-museum.com; Intellivision manual]**

**Extra-car thresholds:** see §3 (DIP-selectable 30k / 70k / 20k-once / 30k-once).

**Score rollover:** at 1,000,000 → back to 0; no more extra cars after 999,999. **[DOCUMENTED — Wikipedia; StrategyWiki]**

**Default high-score table (arcade):** SAW 10012 / KIS 7684 / SUZ 5328 / KIT 3236 / YOS 1982. **[DOCUMENTED — GameFAQs/ASchultz]**

**High-score initial entry:** 3-initial entry (typical DECO). Exact input method (joystick to pick letters + JUMP to confirm): **[INFERRED]**; needs verification in MAME.

**World records (context, not mechanics):** The current Twin Galaxies arcade record is **John McNeill, 5,869,264** (achieved Sept 14, 2013; recognized Jan 5, 2015; TG status "Undisputed"), set on the standard tournament settings "3 Cars, 1 Bonus Car Every 30,000, Normal Game [No Continues], Hard Difficulty." Prior arcade record: **Charlie Wehner, 3,175,880** (Dec 25, 2011). MAME record: **McNeill, 2,531,168** (Mar 2, 2012). An earlier official record was **Marco Donadio, 2,429,540** (Oct 5, 1984). **[DOCUMENTED — Twin Galaxies game page; Wikipedia; arcade-history.com]**

---

## 7. Power-ups, Items, and Special Mechanics

**Arcade:** There are **NO power-ups and NO fuel** in the arcade game.
- **Extra-life truck drop — CONFLICT:** Wikipedia says trucks "will sometimes drop obstacles that will destroy the player or one extra life," implying an extra-life drop exists in the arcade; MoeGamer also mentions trucks dropping extra lives, but that passage largely describes the NES port. Whether the ARCADE truck drops an extra car: **UNKNOWN — needs verification** (MAME playtest / disassembly). **[flagged conflict]**

**Special mechanics (arcade):**
- **Screen-wrap jump:** at the widest road, jump + hold left/right to exit one edge and land on the other — an escape tool. **[DOCUMENTED — arcade-museum.com; arcade-history.com]**
- **Chain reactions / pinball bumps:** bump one car into another for multi-kills. **[DOCUMENTED — GameFAQs]**
- **No mileage/fuel counter in arcade.** The "mileage" some sources mention is the implicit distance to the gas pump, not a displayed odometer. **[INFERRED]**

**End-of-stage bonus mechanics:** tally screen at the gas pump — per-car bonus (§6) + 50k pacifist bonus if applicable, then advance to the next roadway. **[DOCUMENTED — Intellivision manual]**

**NES port only (do NOT include in a faithful arcade clone):** **[DOCUMENTED — Wikipedia; Giant Bomb; MobyGames; MoeGamer]**
- **P-fuel:** the car has "a diminishing power supply that must be replenished by collecting barrels; when it is exhausted, the car can no longer jump" — and running out otherwise costs a life.
- **Recharge stations:** a blue symbol on the road warps the car for "repairs"; mash the button to refill fuel + gain 50 fuel; boosts end-level bonus.
- **Stunt bonuses:** **+5,000** for stylish clears (e.g., landing on a mid-river island, or landing atop a city viaduct then immediately jumping off).
- **Extra lives** dropped by trucks.

---

## 8. Audio Design

**Sound hardware:** DECO/BurgerTime board — a dedicated **second 6502** drives **two General Instrument AY-3-8910 PSGs** (each: 3 tone channels + noise). The main CPU triggers an IRQ to hand a sound command to the sound CPU. **Clock conflict:** arcade-history lists AY-3-8910 @ 1.5 MHz and sound CPU @ 500 kHz; the MAME `btime.cpp` hardware notes derive AY @ **3.0 MHz** (12 MHz ÷ 4) and sound 6502 @ **500 kHz** (12 MHz ÷ 24) from a 12 MHz master crystal. Use the MAME-derived values (3.0 MHz AY, 500 kHz sound CPU) for accuracy. **[DOCUMENTED — arcade-history.com; MAME `btime.cpp` Guru PCB notes]**

**Documented sound cues:**
- **Exclamation-point warning beep:** a high beep accompanies the flashing "!" before a water/gap requiring a jump. Expert players listen for it rather than watching the top of the screen. **[DOCUMENTED — arcade-museum.com; StrategyWiki]**
- **Engine sound, jump sound, crash/explosion sounds:** present. The Finnish Retro Game Comparison Blog notes the arcade plays crash sounds and "disturbingly long jump effects." **[COMMUNITY-CONSENSUS — frgcb.blogspot.com]**
- **Music:** the arcade plays music in attract and gameplay. Exact track list, attract-mode audio structure, and per-cue mapping: **UNKNOWN — needs verification** (rip from ROM / MAME).

**Composer:** **Hiroaki Yoshida** (arcade); Azusa Hara added on the NES version. Yoshida "composed the music for almost all of [Data East's] arcade games," and he and Hara usually collaborated on Data East arcade titles. **[DOCUMENTED — MobyGames credits; VGMPF]**

**Browser caveat:** Recreate PSG-style square/noise SFX with WebAudio oscillators + noise buffers. The original assumed a single mono cabinet speaker.

---

## 9. Visual / Presentation Spec

**Resolution:** **256 × 240 pixels.** **[DOCUMENTED — Arcade Database (adb.arcadeitalia.net); MAME changelog 0.138 explicitly "restored resolution 256x240 (from 240x240)" for the btime driver, fixing bug 03273]**
- **CONFLICT:** the older Wikipedia infobox listed "240 × 256." Use **256 × 240**. **[DOCUMENTED — mametesters.org changelog]**

**Refresh rate:** **≈ 57.44 Hz** (VSync measured 57.4358 Hz; ADB lists 57.444853 Hz). **NOT 60 Hz.** **[DOCUMENTED — Arcade Database; MAME Guru PCB notes]**

**Orientation:** **vertical, rotated 270° (ROT270 / CW)** — a portrait/TATE monitor. **[DOCUMENTED — MiSTer MRA `rotation: vertical (cw)`; MAME `GAME(...ROT270...)`]**

**Color depth / palette:** graphics are **3 bitplanes = 8 pens per set**; background tiles are offset by +8, giving effectively **~16 colors** on screen, via a **32-byte color PROM** (82S123 / Harris 7603) driving a resistor-DAC (R: 47/33/15 kΩ; G: 47/33/15 kΩ; B: 33/15 kΩ — 2-bit blue). **[DOCUMENTED — MAME `btime.cpp` `btime_palette()`]** (The Wikipedia infobox's "16 colors" is consistent.)

**Sprites:** **16 × 16 pixels, 3bpp; 8 hardware sprite slots.** Each sprite entry is 4 bytes (enable = bit0, flipy = bit1, flipx = bit2; x = 240 − ram[+3], y = 240 − ram[+2]; vertical wrap ±256). **[DOCUMENTED — MAME `btime.cpp` `draw_sprites()`]**

**Tiles / background:** **8 × 8 char tiles (3bpp)** for foreground text/chars; **16 × 16 background tiles.** The bnj background playfield is **twice as wide as the screen** (background bitmap 512 × 256) and **scrolls vertically** (Bump 'n' Jump and Zoar are the two btime-family games with a vertically scrolling background). Scroll registers `bnj_scroll[0]/[1]`; `scroll = -(scroll1 | ((scroll0 & 0x03) << 8))`. **[DOCUMENTED — MAME `btime.cpp` `screen_update_bnj()` / `VIDEO_START(bnj)`]**

**Draw order (per frame):** low-priority chars → sprites → high-priority chars, composited over the scrolled background bitmap. **[DOCUMENTED — MAME `screen_update_bnj()`]**

**HUD layout:** **[COMMUNITY-CONSENSUS — StrategyWiki; arcade-museum.com]**
- **Speedometer** top-right, with a flashing **"JUMP OK"** indicator once speed ≥ 100 mph.
- **Score** on screen (updated live; full tally at level end).
- **Cars remaining** shown on screen. At ≥ 1,000,000 a letter **"G"** appears by the remaining-cars count. **[DOCUMENTED — GameFAQs NES trivia; arcade "survival of the fittest" behavior COMMUNITY-CONSENSUS]**
- **Flashing "!"** warning at **top center** before a required jump.
- Exact pixel coordinates of each HUD element: **UNKNOWN — needs verification** (screenshot measurement / MAME).

**Attract mode:** includes a gameplay demo ("as you'll see in the demo" — cars shown with their point values). Full attract sequence (title → demo → high scores → story): **UNKNOWN — needs verification.** **[COMMUNITY-CONSENSUS]**

**CRT assumptions (do not survive the port):** the 256×240 portrait image at ~57.44 Hz was designed for a 15 kHz CRT; color relied on a resistor-DAC PROM plus CRT phosphor blending. For the browser: render at native 256×240 (portrait canvas), integer-scale, and optionally add a scanline/CRT shader. **Do NOT assume 60 Hz** — decouple game logic from `requestAnimationFrame`; use a fixed 57.44 Hz logical tick for exact fidelity, or accept 60 Hz with re-tuned constants.

---

## 10. Known Bugs, Exploits, and Expert-Play Techniques

**Expert techniques:** **[COMMUNITY-CONSENSUS — GameFAQs/ASchultz; StrategyWiki unless noted]**
- **Screen-wrap escape jump** (widest road only) — dodge a whole pack. **[DOCUMENTED — arcade-museum.com]**
- **Bump from behind, not from the front:** rear bumps speed you up and keep control; front bumps knock you back and slow you. Best practice: get ahead of a target, slow, then tap it. **[DOCUMENTED — arcade-museum.com]**
- **Chain reactions:** bump heavy cars (hearse) into others for multi-kills.
- **Truck bait:** wait behind a rock truck until the last second so trailing enemy cars pile into the dropped rocks and die.
- **Rapid re-jump:** no landing lockout → spam JUMP across island chains; tap JUMP repeatedly if you might land in water.
- **Pacifist Level-1 farming:** clear L1 with zero kills for 50k; even sacrificing a car to get a clean road is worth it (net life gain, since 50k > the 30k extra-car threshold).
- **Optimal jump speed:** ~180–190 mph for tricky double-jumps; "the difference between 180 and 182 mph is critical" for the longest island gaps.

**Safe spots / patterns:** stay center or slightly right (when the road narrows, water is always on the LEFT); bridge-lefts and split-lefts are enemy-free but tight. Segment ordering is semi-predictable ("bridge areas only come after the course weaves back and forth; lakes-on-left come only after straightaways with no bushes"). **[COMMUNITY-CONSENSUS — GameFAQs]**

**Known unfairness:** end-of-level scroll speed-up causes surprise deaths. **[COMMUNITY-CONSENSUS — GameFAQs]**

**RNG manipulation:** ASchultz notes that resetting the machine and playing immediately lets you "ping-pong between two tractors," implying spawn patterns are deterministic from a fixed initial state (see §11). **[COMMUNITY-CONSENSUS]**

**Documented glitches:** No well-documented arcade-specific game-breaking glitch was found. MAME emulation is considered accurate (supported since ~v0.31). Arcade-vs-port behavioral glitches: UNKNOWN — needs verification.

**Port differences in exploits:** NES adds stunt bonuses (island/viaduct +5,000) and fuel management, changing optimal play entirely; Intellivision/Atari 2600 are stingier with lives (Intellivision: only the 20k extra). **[DOCUMENTED — MoeGamer; Giant Bomb; Intellivision manual]**

---

## 11. Randomness

**Is there true randomness?** The arcade *feels* "very random" (ASchultz), yet spawn patterns appear **deterministic from the machine's initial state** — the reset-then-ping-pong-tractors trick implies a fixed seed / table-driven start. **[COMMUNITY-CONSENSUS — GameFAQs/ASchultz]**

**Road layout:** **fixed per level.** Courses are memorizable and expert play depends on rote memorization of splits/jumps; the road is NOT procedurally generated. Layouts are therefore **table-driven / scripted.** **[DOCUMENTED-by-implication — StrategyWiki "Try to learn the courses"; Giant Bomb "rote memorization"; INFERRED for the table-driven conclusion]**

**Enemy spawns:** likely table/script-driven with a pseudo-random selector seeded at level start; the exact mechanism (PRNG vs fixed table vs frame-counter-driven) is **UNKNOWN — needs verification** via MAME `btime.cpp` / 6502 disassembly.

**Implementation recommendation:** use fixed course-layout tables + a seeded PRNG (e.g., a small LCG) for enemy-type selection and lateral behavior, re-seeded identically at each level start so patterns are learnable — matching the observed determinism. Alternatively, hand-author 32 course tables with scripted spawn waves. **[INFERRED]**

---

## 12. Design Intent

**Data East / DECO context:** *Burnin' Rubber* (Nov 1982, Japan) was built for the **DECO Cassette System** — "the first standardised arcade system that allowed arcade owners to change games," introduced by Data East in **October 1980** (developed 1979; North America 1981), which "inspired Sega's Convert-a-Game system." This let operators swap titles cheaply via cassette + security dongle, shaping Data East's high-volume, shared-cabinet strategy. The US dedicated version was licensed to **Bally Midway** (Models 349/350). **[DOCUMENTED — Wikipedia (DECO Cassette System); arcade-history.com]**

**Commercial success (context for how well-tuned the difficulty was):** "In Japan, Burnin' Rubber was the ninth highest-grossing arcade game of 1982," and "in the United States, Bump 'n' Jump was among the thirteen highest-grossing arcade games of 1983." **[DOCUMENTED — Wikipedia]**

**Design goals (as reflected in period + retrospective materials):** the hook is the **novel combination of bumping + jumping** in a top-down driver. Next Generation (1996) ranked it **#65 on their "Top 100 Games of All Time," lauding "the innovative jumping and bumping mechanics, the variety of cars, and the strong sensation of speed and tension."** **[DOCUMENTED — Wikipedia citing Next Generation]** HAMSTER's Arcade Archives marketing frames the intent as "Race the course … Speeding up will make it possible to jump, allowing you to not only avoid obstacles, but also land on enemy vehicles, exploding them to gain points." **[DOCUMENTED — Nintendo.com Arcade Archives listing]**

**Coin-op economics / difficulty tuning:** the DIP switches are the operator's revenue levers — **Difficulty (Easy/Hard)**, **Lives (3/5)**, **Bonus-car threshold (30k / 70k / 20k-once / 30k-once)**, **Coinage (1C/1P, 1C/2P, 1C/3P/6P, 2C/1P)**, and **Allow Continue (No/Yes)**. **[DOCUMENTED — arcade-museum.com DIP table; MiSTer MRA]** The blend of "no timer but escalating hazards + a punishing 100 mph jump gate + narrow bridges + an end-of-level speed-up" yields short average sessions under the Hard/3-cars tournament standard (maximizing coin drop), while the 50k pacifist bonus and 30k extra-car setting give skilled players a reason to keep feeding coins. **[INFERRED from the DIP structure + play guides]**

**Developer interviews:** No direct Data East designer interview specifically about *Burnin' Rubber* was located in English or Japanese sources during research. The Japanese Wikipedia entry (バーニン'ラバー) confirms design facts (no rank / no time limit; goal is reaching a fixed point on public roads; hazards are extreme curves/gaps) but cites no developer interview. **UNKNOWN — needs verification:** a primary designer interview (check Shmuplations, Data East retrospective books, or Japanese arcade-preservation blogs).

---

## 13. Protected IP vs Unprotectable Mechanics (Legal Reskin Guidance)

*General guidance, not legal advice. Under prevailing US/EU doctrine, game rules and mechanics are not copyrightable; specific expression (art, audio, names, characters) is.*

**FREE to reuse (mechanics/rules/systems — not copyrightable):** **[INFERRED — copyright doctrine]**
- The core loop (drive up a scrolling road, bump rivals off-road, jump gaps/trucks).
- The 100 mph jump gate, jump-distance-∝-speed, ricochet bump physics, the no-crash bonus concept, the island-landing bonus, the seasonal difficulty ramp, extra-car thresholds, DIP-style options.
- The scoring structure and numeric values (point tables, thresholds) — these are facts/rules, not expression.
- Enemy archetypes as *behaviors* (heavy-slow, light-weaver, homing-fast, debris-dropping truck).

**PROTECTED — must be reskinned / made original:** **[DOCUMENTED for trademarks; INFERRED for copyrightable assets]**
- **Names / trademarks:** "Bump 'n' Jump," "Burnin' Rubber," "Buggy Popper," "Jumpin' John" (the arcade mascot name), and the Data East / DECO and Bally Midway logos and trade dress.
- **Specific art assets:** the exact red-car sprite, the specific enemy sprites (skull/hearse art, specific truck art), the exact seasonal backgrounds, the gas-pump/season icons, marquee/flyer/cabinet art, and the HUD/font glyphs.
- **Specific audio:** the exact music (Hiroaki Yoshida's compositions), the specific engine/jump/crash SFX, the exclamation-warning jingle.
- **Story / characters:** the "girlfriend kidnapped by the Black Army Corps / Jackals" plot (NES) and any named characters.
- **The exact 32 course layouts** as fixed creative sequences may carry thin protection as a compilation — safest to author original layouts using the same mechanical vocabulary.

**Practical guidance for coinlessgames.com:** ship under an original title with original car/enemy/background art, original music/SFX, and original (or seeded-procedural) course layouts, while freely replicating the *rules and numeric tuning* above. Do not use "Bump 'n' Jump," "Burnin' Rubber," "Data East," or "Bally Midway" marks anywhere in the product, store listing, or metadata.

---

## 14. Open Questions (ordered by impact on fidelity)

1. **Exact velocity / acceleration model & units.** Top priority. Display is 20–220 mph but internal units differ; jump landing cost is 32 mph (ASchultz) vs 40–50 (Giant Bomb) — CONFLICT. Need a MAME RAM watch / 6502 disassembly of the physics routine. Without this, the "feel" cannot be faithful.
2. **Bump ricochet constants** — `f(relativeSpeed)`, per-type weight values, control-loss duration. Needed for combat feel. Source: MAME disassembly.
3. **Enemy spawn logic & RNG structure** (§11) — table-driven vs seeded PRNG; per-level spawn tables. Determines whether patterns are learnable as in the original.
4. **The 32 course layout tables** — exact segment sequences per level. Extract from ROM. Resolves the "32 unique" vs "4–8 loop" reconciliation.
5. **Jump-arc timing** — airborne duration in frames as a function of speed; land-detection window. Needed for water/island jumps to feel right.
6. **Whether arcade trucks drop extra lives** (CONFLICT: Wikipedia/MoeGamer imply yes, but partly describing the NES port). Verify in MAME.
7. **Post-respawn invulnerability window and death-animation duration** (frame counts).
8. **Exact HUD element pixel coordinates and font; the full attract-mode sequence.**
9. **CPU/AY clock conflict** (750 kHz vs 1.5 MHz main; 1.5 vs 3.0 MHz AY) — matters only for accurate audio pitch; MAME-derived 1.5 MHz / 3.0 MHz preferred.
10. **Precise sprite-to-point-value mapping** (which exact car art = 200/300/500).
11. **Primary developer interview / design docs** (Shmuplations, Data East retrospective books) — for design-intent color, not mechanics.
12. **Existence of any true arcade kill screen** past the 999,999 "survival of the fittest" flag.

**Where to look:** MAME `src/mame/dataeast/btime.cpp` + a 6502 disassembler on the `brubber`/`bnj` ROM set (items 1–5, 7, 10, 12); Arcade Database and the original Bally Midway operator's manual / Data East service manual for DIP, HUD, and attract data (item 8); The Arcade Flyer Archive and gamesdatabase.org manual scans (items 8, 10); Twin Galaxies / MARP replays for expert-play validation; Shmuplations and Japanese Data East retrospectives (item 11).