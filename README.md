# Doheny Rescue

Browser search-and-rescue around Doheny Memorial Library at USC. The interior is closed. Every rescue happens from the perimeter. The run is about triage under incomplete information, not driving skill.

You spawn on the Alumni Park lawn, ~30 m south of the entrance, at night. A short briefing holds the clock. Doheny is on fire. Windows glow as rooms vent. You cannot go inside. The gold compass pip is the building. The cyan pip is the nearest live opening.

## Play

- **W / S** or knob up/down — throttle. Speed ramps to 6 m/s.
- **A / D** or knob left/right — steer. Turn rate scales with speed: a held stick at rest pivots slowly (about 11 s per revolution), not a spin. At speed it holds a 3.6 m arc. Scroll zooms 8–25 m. The chase camera stays behind the robot.
- **T** (or Thermal) — hold for thermal. Signatures show through the walls. Count, condition, and type stay hidden.
- **Space / F** (or Hold) — scan (6 s within 6 m), rescue (hold at an open extraction), or mark an unreachable victim (2 s). Moving interrupts a hold.
- Cyan shafts and outlines are extraction points — they stay readable across the lawn and vanish when that room vents. The ground semicircle is the 4 m rescue radius.
- After a scan the HUD shows condition, type, and count. It never shows the clock.
- The red ring on the lawn is staging: drop a carried victim, recharge battery. Two engines and a utility sit just south of the ring.
- Hold Space or F and a ring fills at your feet and at the opening.
- Below 20% battery the robot limps. Empty still crawls so you can reach the ring. Heat cannot kill you.
- North lip is 60% speed. West landscaping is 70%.
- Within 8 m of a vented facade, battery drain is 2.5× and thermal breaks into noise. You do not die.

The run ends when every cell has vented. The debrief lists each victim in encounter order: what you saw, what you did, what was true. No grade.

`?seed=42` pins ignition and victim placement. Windows telegraph with smoke about three seconds before they vent. Audio (rumble / vent) starts after the first click; mute from the dock.

`?play=1` still hosts the older dual-POV briefing.

## Run it

```bash
npm install
npm run dev
```

Opens on port `43147`.

```bash
node tools/extract-footprint.mjs                    # live Overpass
node tools/extract-footprint.mjs overpass-raw.json  # replay the committed dump
npm run test:site
```

`overpass-raw.json` is committed so the footprint stays reproducible if OSM or the mirrors change.

## Spec stages

0. Footprint — real OSM outline, courtyard hole, fire grid
1. Movement — kinematic robot, chase camera, OSM hull
2. Victims and rescue — scan / extract / carry / mark / deliver
3. Fire — 4 Hz spread, venting, extractions close, window glow
4. Information — thermal, hidden attributes, signature inversion
5. Debrief — encounter list and counterfactuals
6. Battery, pre-vent smoke, audio, `?seed=`, staging engines, limp, hold rings

Spec: `docs/doheny-rescue-sim-spec.md`.

## Data

© OpenStreetMap contributors (ODbL). The license string is stored on `site-data.json`.

A Google Maps key is only needed for the legacy `?play=1` photoreal WORLD view. Put it in `.env.local` (gitignored):

```
VITE_GOOGLE_MAPS_KEY=AIza...
```

Without a key, the perimeter run still works.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, zustand.
