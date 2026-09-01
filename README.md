# Doheny Rescue

Browser search-and-rescue sim around Doheny Memorial Library at USC. The interior is closed — every rescue happens from the perimeter.

This repo is on **Stage 0**: the real OSM footprint, projected to local metres and extruded untextured. Confirm the outline (1960s wing + courtyard) before movement or fire go in.

## Stage 0 — footprint

The default view is an overhead orbit of the untextured extrude.

- Building mesh comes from OpenStreetMap relation `6095470` (Edward L Doheny Junior Memorial Library).
- Local frame: **+X east, +Y up, +Z south**, metres about `34.0201, −118.2838`.
- Roof tiles: orange = south facade (Alumni Park), blue = north, dark = core. Cells whose centre falls outside the polygon are discarded.
- Height is the OSM `height` tag (22.8 m). `building:levels` is missing, so floors fall back to 4.

Drag to orbit, scroll to zoom.

The older dual-POV briefing still lives at `?play=1`.

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

## Later stages (not built yet)

1. Movement — kinematic robot, chase camera, nothing else
2. Victims and rescue — carry / deliver
3. Fire grid, venting, extraction points
4. Thermal / scan / hidden attributes
5. Debrief
6. Night lighting, battery, audio

Spec: `docs/doheny-rescue-sim-spec.md`.

## Data

© OpenStreetMap contributors (ODbL). The license string is stored on `site-data.json`.

A Google Maps key is only needed for the legacy `?play=1` photoreal WORLD view. Put it in `.env.local` (gitignored):

```
VITE_GOOGLE_MAPS_KEY=AIza...
```

Without a key, Stage 0 still runs.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei.
