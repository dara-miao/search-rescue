# Doheny Rescue

Browser search-and-rescue around the real Doheny Memorial Library at USC. The interior is closed. You drive a ground robot on the perimeter and triage people at windows and doors.

**Live:** [usc-search-rescue.vercel.app](https://usc-search-rescue.vercel.app)

Add `?seed=42` to pin ignition and victim placement.

## Play

You spawn on the Alumni Park lawn, about 30 m south of the entrance. A briefing holds the clock. Roll out, then follow the cyan pip and the lawn beacons to a live opening. People wait at the glass. Windows glow as rooms vent. The gold compass pip is the building.

- The top banner is the current objective: drive to a cyan opening, stop, scan, extract, or carry back to the red ring.
- **W / S** or knob up/down: throttle. Speed ramps to 6 m/s.
- **A / D** or knob left/right: steer. At rest a held stick pivots slowly (about 11 s per revolution). At speed it holds a 3.6 m arc. Scroll zooms 8 to 25 m. The chase camera stays behind the robot.
- **T** or Thermal toggles thermal. Signatures show through the walls. Count, condition, and type stay hidden until you scan.
- **Space** or Scan: hold still for 6 s within 7 m of an opening to scan. **F** or Extract: hold at the 4 m rescue radius. Unreachable people mark in 2 s. Moving cancels a hold.
- Cyan shafts and pulsing lawn rings mark openings that still have someone waiting. They vanish when that room vents.
- After a scan the HUD shows condition, type, and count. It never shows the clock.
- The red ring is staging: drop a carried person and recharge. Two engines and a utility sit just south of it. Restart replays the same seed.
- Below 20% battery the robot limps. Empty still crawls so you can reach the ring. Heat cannot kill you.
- The north loading lip is 60% speed. West landscaping is 70%. Within 8 m of a vented facade, drain is 2.5x and thermal breaks into noise.

The run ends when every cell has vented. Debrief lists each person in encounter order: what you saw, what you did, what was true. No grade. Credits lists OSM and the Wikimedia elevation photograph.

Windows telegraph with smoke a few seconds before they vent. Audio (rumble / vent) starts after the first click. Mute from the dock.

`?play=1` is an older dual-view briefing (photoreal tiles plus OSM). That path needs a Google Maps key. The perimeter run does not.

## Develop

```bash
npm install
npm run dev
```

Opens on port `43147`. The first `predev` / `prebuild` downloads the Wikimedia elevation photograph and generates brick and limestone maps if they are missing.

```bash
npm run test:site    # footprint, massing, drive, environment, run
npm run build        # tsc + vite
```

```bash
node tools/extract-footprint.mjs                    # live Overpass
node tools/extract-footprint.mjs overpass-raw.json  # replay the committed dump
```

`overpass-raw.json` is committed so the footprint stays reproducible if OSM or the mirrors change.

The gameplay spec is in `docs/doheny-rescue-sim-spec.md`.

## Data

© OpenStreetMap contributors (ODbL). The license string lives on `src/data/site-data.json` and on the Credits screen. Facade maps are derived from "Doheny Library" by Padsquad19, Wikimedia Commons, CC BY-SA 3.0. USC Digital Library photographs were modelling reference only. They are not used as textures.

A Google Maps key is only needed for `?play=1`. Put it in `.env.local` (gitignored):

```
VITE_GOOGLE_MAPS_KEY=
```

Without a key, the perimeter run still works.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, and zustand.
