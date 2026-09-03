# Doheny Rescue

Night perimeter search-and-rescue around the real Doheny Memorial Library at USC. The interior is closed. Every rescue is from a window or door. The run is triage under incomplete information, not driving skill.

**Play it:** [usc-search-rescue.vercel.app](https://usc-search-rescue.vercel.app) — add `?seed=42` to pin ignition and victim placement.

You spawn on the Alumni Park lawn, about 30 m south of the entrance. A briefing holds the clock. Roll out, then follow the cyan pip and the lawn beacons to a live opening. People wait at the glass. Windows glow as rooms vent. The gold compass pip is the building.

## Play

- The top banner is the current objective: drive to a cyan opening, stop, scan, extract, or carry back to the red ring.
- **W / S** or knob up/down: throttle. Speed ramps to 6 m/s.
- **A / D** or knob left/right: steer. A held stick at rest pivots slowly (about 11 s per revolution). At speed it holds a 3.6 m arc. Scroll zooms 8–25 m. The chase camera stays behind the robot.
- **T** or Thermal toggles thermal. Signatures show through the walls. Count, condition, and type stay hidden until you scan.
- **Space** or Scan: hold still for 6 s within 7 m of an opening to scan. **F** or Extract: hold at the 4 m rescue radius. Unreachable people mark in 2 s. Moving cancels a hold.
- Cyan shafts and pulsing lawn rings mark openings that still have someone waiting. They vanish when that room vents.
- After a scan the HUD shows condition, type, and count. It never shows the clock.
- The red ring is staging: drop a carried victim, recharge. Two engines and a utility sit just south of it. Restart replays the same seed.
- Below 20% battery the robot limps. Empty still crawls so you can reach the ring. Heat cannot kill you.
- North lip is 60% speed. West landscaping is 70%. Within 8 m of a vented facade, drain is 2.5× and thermal breaks into noise.

The run ends when every cell has vented. Debrief lists each victim in encounter order: what you saw, what you did, what was true. No grade. Credits lists OSM and the Wikimedia elevation photograph.

Windows telegraph with smoke about three seconds before they vent. Audio (rumble / vent) starts after the first click; mute from the dock.

`?play=1` still hosts the older dual-POV briefing (photoreal WORLD tiles + OSM ROBOT). That path needs a Google Maps key. The perimeter run does not.

## Run it locally

```bash
npm install
npm run dev
```

Opens on port `43147`. `predev` / `prebuild` download the Wikimedia elevation photograph and generate brick and limestone maps if they are missing.

```bash
npm run test:site    # footprint, massing, drive, environment, run
npm run build        # tsc + vite, same as production
```

```bash
node tools/extract-footprint.mjs                    # live Overpass
node tools/extract-footprint.mjs overpass-raw.json  # replay the committed dump
```

overpass-raw.json is committed so the footprint stays reproducible if OSM or the mirrors change.

## What shipped

Spec stages 0–6 in `docs/doheny-rescue-sim-spec.md`:

0. Real OSM footprint, courtyard hole, fire grid
1. Kinematic robot, locked chase camera, OSM hull
2. Scan / extract / carry / mark / walk-out
3. 4 Hz fire, venting, extractions close, window glow
4. Thermal, hidden attributes, signature inversion
5. Debrief — encounter list and counterfactuals
6. Battery limp, pre-vent smoke, audio, `?seed=`, staging engines, hold rings, ground follow, Trousdale, light poles, photo facade, credits

The chassis snaps to the lawn, paths, north loading lip, south steps, and light wells, and climbs rises up to 0.4 m.

## Data

© OpenStreetMap contributors (ODbL). The license string lives on `src/data/site-data.json` and on the Credits screen. Facade maps are derived from “Doheny Library” by Padsquad19, Wikimedia Commons, CC BY-SA 3.0. USC Digital Library photographs were modelling reference only — they are not textures.

A Google Maps key is only needed for `?play=1`. Put it in `.env.local` (gitignored):

```
VITE_GOOGLE_MAPS_KEY=AIza...
```

Without a key, the perimeter run still works.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, zustand. Hosted on Vercel as project `usc-search-rescue`.
