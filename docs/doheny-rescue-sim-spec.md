# Build Spec — Perimeter Search & Rescue Simulation

## Project

A browser-based search-and-rescue simulation. The player controls a ground robot circling a burning library building. The building interior is inaccessible — all rescues happen from the perimeter. The game is about triage under incomplete information, not about driving skill.

**Stack:** Vite + React + three.js. No physics engine — movement is kinematic. Deploy target is static hosting.

**Run length:** 7–9 minutes, then a debrief screen.

---

## 1. Site geometry — extract the real footprint first

The building is Doheny Memorial Library at USC (34.0201°N, −118.2838°W). It is a four-storey 1932 Romanesque Revival building in pale brick and limestone, with a 1960s wing expansion — so the footprint is **not** a clean rectangle. Do not guess the outline. Extract it.

### Step 1 — run the extraction script

`tools/extract-footprint.mjs` (included, no dependencies) does the whole pipeline:

```
node tools/extract-footprint.mjs                    # queries Overpass live
node tools/extract-footprint.mjs overpass-raw.json  # replays a saved response
```

It queries Overpass across three mirrors for buildings within 150m of the origin, prints every candidate with its area so you can confirm the right one was picked, prefers the footprint whose `name` tag matches Doheny, falls back to the largest, and writes `site-data.json`.

The script also caches the raw Overpass response to `overpass-raw.json`. Commit that file — it makes the build reproducible if OSM changes or the mirrors are down.

### Step 2 — what it produces

```json
{
  "origin": { "lat": 34.0201, "lon": -118.2838 },
  "projection": "+X east, +Z south, metres, equirectangular about origin",
  "building": {
    "footprint": [ { "x": -41.52, "z": -49.74 }, ... ],
    "centroid": { "x": ..., "z": ... },
    "areaSqM": ...,
    "levels": 4,
    "heightM": ...,
    "orientedBounds": {
      "width": ..., "depth": ...,
      "angleRad": ..., "angleNormalizedDeg": ...,
      "centre": { "x": ..., "z": ... }
    }
  },
  "fireGrid": { "cols": 4, "rows": 3, "floors": 4, "cells": [ ... ] }
}
```

Each cell carries `id`, `floor`, `col`, `row`, `isCore`, `facades` (which of north/south/east/west it touches), `centre` in world metres, and `size`.

The **oriented bounding box** is the important part. USC's campus grid is rotated relative to lat/lon, so an axis-aligned box would be oversized and the fire grid would not line up with the facades. The script solves for the true rotation by testing every footprint edge angle and keeping the minimum-area rectangle.

### Step 3 — consume it

- **Building mesh**: build a three.js `Shape` from `building.footprint`, extrude to `building.heightM`. This is the real outline, 1960s wing included.
- **Fire grid**: use `fireGrid.cells` directly. Neighbour lookup by `(floor, col, row)` adjacency.
- **Facade alignment**: rotate window quads and heat-zone volumes by `orientedBounds.angleRad` so they sit flat on the walls.
- **Cells outside the polygon**: if the wing makes the shape L-like, some generated cells fall outside the footprint. Point-in-polygon test each cell centre against `building.footprint` and discard the misses.
- **Ground plane**: extend 60m beyond the footprint bounds in every direction.

### Verify these two things after the first run

1. **Row-to-facade orientation.** Whether `row === 0` lands north or south depends on the polygon's winding in OSM. Check the cells whose `facades` includes `"south"` and confirm their centres are on the Alumni Park side. If flipped, swap the north/south assignment in `buildGrid`.
2. **Level count.** `building:levels` is frequently missing from OSM. The script falls back to 4, which is correct for Doheny, but confirm the tag rather than trusting the fallback silently.

If the OSM outline turns out coarse or the wing is missing entirely, trace the footprint from satellite imagery in geojson.io instead and feed that polygon in. Accuracy target is ±1m.

### Attribution

OSM data is ODbL — "© OpenStreetMap contributors" goes in the credits screen. The script writes the license string into `site-data.json` so it doesn't get lost.

### Step 4 — surroundings

- Alumni Park lawn to the south, with the tree line
- Trousdale Parkway running past the east side
- Low-poly trees and light poles on the lawn, non-colliding
- The player's staging area sits on the lawn, ~30m south of the entrance
- Fire apparatus and equipment props at staging

The approach must be from the south, so the player sees the ceremonial front first.

### Visual treatment

Set the run at **night**. The building is lit by fire glow from windows, emergency vehicle lights, and the robot's spotlight. This is a deliberate choice: darkness hides low-poly geometry, smoke haze softens edges, and emissive windows — which are gameplay elements anyway — become the dominant visual.

Model geometry only where the silhouette breaks: the recessed arched entrance portal, the roofline overhang, the entrance steps. Everything else is a flat facade with an albedo + normal map derived from a straight-on elevation photograph. Window quads inset ~15cm as separate meshes (they become emissive on vent).

Material target: pale brick and limestone, warm under firelight. Getting this colour right does more for recognition than any amount of geometric detail.

Camera: chase camera, follows robot position with a spring, lags rotation. Fixed pitch, ~25° down. Mouse wheel zooms between 8m and 25m.

### Reference sources

- Floor plans with room names: `libraries.usc.edu/sites/default/files/2021-09/Doheny Memorial Library self-guided tour brochure.pdf`
- Freely licensed exterior photos (usable as textures, attribution required): Wikimedia Commons, "Category:Doheny Memorial Library (USC)"
- USC Digital Library photos are **private use only** — reference while modelling, do not project as textures
- Original 1932 Samuel Lunden elevation drawings: USC University Archives, Doheny Room 220, specol@usc.edu

---

## 2. Fire grid

Building is abstracted as a 4×3 footprint grid × **4 floors = 48 cells**. Cells falling outside the real footprint polygon (section 1, step 3) are discarded.

```
        NORTH
      N1   N2   N3   N4
 W1 [ 01 ][ 02 ][ 03 ][ 04 ] E1
 W2 [ 05 ][ 06 ][ 07 ][ 08 ] E2
 W3 [ 09 ][ 10 ][ 11 ][ 12 ] E3
      S1   S2   S3   S4
        SOUTH (main entrance)
```

Cells 06 and 07 are interior core — no facade, no extraction point, high thermal conductance.

### Floor structure

The entrance level and the ground floor are different: from the main doors you descend into a ground-floor rotunda. This matters for gameplay — some ground-floor windows sit **below grade in light wells**, which is a harder rescue than a window at chest height.

- **Floor 0 (below grade):** rotunda, Cinematic Arts Library, Music Library. Extraction only via light wells — `rescueTime` +50%.
- **Floor 1 (entrance level):** circulation desk, Treasure Room, Faculty Hall, Los Angeles Times Reference Room, Hall of Honor, East Asian Library. Primary extraction level.
- **Floor 2:** Special Collections, offices, event space.
- **Floor 3:** stacks and mechanical. `UNREACHABLE` victims only.

### Use real room names

Give each cell a `roomName` drawn from the floor plans. Surface these in the vent alerts and in the debrief. "Fire reached the Treasure Room" carries far more weight than "cell 07 vented," and it costs nothing.

### Cell state

```js
{
  id, floor, gridX, gridY,
  heat: 0,          // 0-100
  vented: false,
  isCore: bool,
  facades: []       // e.g. ['south'], ['south','west'], [] for core
}
```

### Simulation (tick at 4Hz)

- Lateral transfer to the 4 in-plane neighbours: `k_lateral = 0.9`
- Vertical transfer to the cell directly above: `k_vertical = 2.7`
- Core cells use `k_lateral * 2.2` in both directions
- Transfer amount per tick: `(source.heat - target.heat) * k * dt`, clamped ≥ 0
- Each burning cell (`heat > 20`) also self-generates `+1.2 heat/s` up to 100

### Venting

When `heat >= 70` and not yet vented:
- Set `vented = true`
- Close any extraction point in this cell permanently
- Dump `+35 heat` into each lateral neighbour and `+45` into the cell above
- Spawn a visual: window quad turns emissive orange, particle smoke plume, audio cue
- Mark the exterior wall segment as a heat zone

### Ignition

One randomly chosen cell on floor 3 (top, stacks and mechanical) seeds at `heat = 60` at t=0. This seed is the run's variable — log it for the debrief by room name.

Tune constants so the core cells cross heat 70 at roughly t = 4:00, and all cells vent by t ≈ 8:00.

### Telegraphing

Three seconds before a cell vents (`heat >= 62`), start a visible pre-vent state: smoke thickening at that window, low rumble audio, subtle glow. The player must have warning.

---

## 3. Extraction points

Twelve ground-floor perimeter cells, each with one opening:

| Cells | Face | Opening | Modifier |
|---|---|---|---|
| 09, 10 | South | Main doors | Wide, fast rescue |
| 11, 12 | South | Tall windows | Normal |
| 04, 08, 12 | East | Windows | Normal |
| 01–04 | North | Service door + high windows | Loading lip: robot moves at 60% speed within 5m |
| 01, 05, 09 | West | Windows | Landscaping: robot moves at 70% speed within 6m |

An extraction point is usable only if its cell is not vented. Once vented, it is dead for the run.

---

## 4. Robot

Kinematic movement. No rigid body.

- WASD or arrow keys. Differential-drive feel: `W/S` = throttle, `A/D` = turn rate. Turn rate scales down with speed.
- Top speed 6 m/s, acceleration ramps over ~0.6s (do not snap to top speed — the ramp is what makes it read as a robot rather than a car)
- Raycast down each frame, snap Y to ground height, orient chassis to surface normal with smoothing
- Steps and curbs handled automatically: if the ground ahead is within 0.4m of current height, climb it without slowing

### Resources

**Battery: 100 units.**
- Movement: 0.55 units/sec while moving
- Scanning: 1.4 units/sec while scanning
- Recharge at the staging area (south lawn, ~30m from building) at 12 units/sec

**Carry capacity: 1.** One victim at a time. Delivering means returning to staging.

### Heat damage

Within 8m of a vented facade, battery drain multiplies by 2.5 and the thermal display gains visual noise. No health, no death — heat costs you resources and clarity, not your life.

---

## 5. Victims

Generate 8–10 per run.

```js
{
  id,
  cellId, floor,
  signature: 'STRONG' | 'WEAK' | 'FAINT',   // visible on thermal
  condition: 'STABLE' | 'DETERIORATING' | 'CRITICAL',  // hidden until scan
  type: 'SELF_EXTRACT' | 'ASSISTED' | 'GROUP' | 'UNREACHABLE', // hidden
  count: 1-5,                                // hidden
  clock: seconds,                            // NEVER revealed, even after scan
  rescueTime: 4-15,                          // hidden
  scanned: false,
  state: 'WAITING' | 'RESCUED' | 'LOST' | 'MARKED'
}
```

### Signature ↔ condition correlation

This inversion is the core of the design. Do not make it a clean mapping.

| Signature | STABLE | DETERIORATING | CRITICAL |
|---|---|---|---|
| STRONG | 60% | 30% | 10% |
| WEAK | 30% | 45% | 25% |
| FAINT | 10% | 30% | 60% |

Rationale: strong thermal signature means conscious and moving, which usually means not dying. Faint means unconscious and cooling. The intuitive read is backwards.

Clocks by condition: STABLE 300–420s, DETERIORATING 150–260s, CRITICAL 60–130s.

### Types

- `SELF_EXTRACT` — a blocked door. Robot holds position `rescueTime` seconds to clear it, then all `count` occupants walk out. No carry needed. Highest efficiency action in the game.
- `ASSISTED` — must be carried to staging. One trip per victim.
- `GROUP` — like SELF_EXTRACT but `count` 3–5.
- `UNREACHABLE` — upper floor. Cannot be rescued. Can be MARKED (2s hold) which relays position to human crews and scores partial credit.

### Generation guarantees

Every run must include:
- At least one GROUP or SELF_EXTRACT with `count >= 3` (the efficient win)
- At least one FAINT + CRITICAL victim on the west or north face (the isolated, slow-access one)
- At least one STRONG + STABLE + ASSISTED victim (the time-sink decoy)
- At least one victim on floor 0 (below grade, light-well extraction)
- 1–2 UNREACHABLE on floors 2–3

---

## 6. Player actions

**Thermal view** (toggle, hold key): renders victim signatures through walls as coloured blobs sized by signature strength. Shows position and signature only. Does not show count, condition, or type.

**Scan** (hold within 6m of a victim's cell, 6 seconds): reveals `condition`, `type`, and `count`. Never reveals `clock`. Interrupted if the robot moves.

**Rescue** (hold within 4m of a usable extraction point, `rescueTime` seconds): resolves by type.

**Mark** (2s hold, UNREACHABLE only).

**Deliver**: drive a carried victim to staging.

If a victim's cell vents, or their clock expires, state becomes `LOST`.

---

## 7. Debrief

The run ends when all cells have vented. This screen is the most important part of the game — build it properly.

Show, with no letter grade and no score summary at the top:

1. A list of every victim, in the order they were encountered or missed
2. For each: what the player saw (signature), what they did (scanned / rescued / skipped / never found), and what was actually true (condition, type, count)
3. Highlight specific counterfactuals:
   - Victims skipped who were `SELF_EXTRACT` with `rescueTime < 8` — "would have taken 6 seconds"
   - Victims scanned who were already `LOST` before the scan finished — "spent 6s on someone already gone"
   - The single victim with the shortest expired clock — "closest miss"
4. Total saved / total lost at the bottom, plain text
5. The ignition cell for this run

Let the player draw their own conclusions. Do not editorialise, do not grade, do not congratulate.

---

## 8. Build order

Ship each stage before starting the next.

**Stage 0 — footprint.** Pull the OSM polygon, project to local metres, extrude, render it untextured. Confirm the shape looks like the real building from above before writing any gameplay code. This is an hour of work that prevents rebuilding the grid later.

**Stage 1 — movement.** Ground plane, extruded building, robot, chase camera. Nothing else. The robot must feel good to move before anything is layered on it.

**Stage 2 — victims and rescue.** Fixed victim positions, no hidden attributes, carry and deliver. Prove the loop.

**Stage 3 — fire.** Cell grid, spread simulation, venting, extraction points closing, facade visuals.

**Stage 4 — information.** Thermal view, scan action, hidden attributes, the signature/condition inversion.

**Stage 5 — debrief.** The counterfactual screen.

**Stage 6 — polish.** Audio, battery UI, pre-vent telegraphing, run seeding.

---

## 9. Explicit non-goals

- No interior geometry. The player never goes inside.
- No physics engine. No rigid bodies, no articulated joints.
- No robot destruction or fail state from damage.
- No pathfinding or autonomy. The player drives directly.
- No architectural detail on the building beyond facade window placement.

---

## 10. Tuning targets

- A skilled player saves 5–7 of 9 victims
- A first-time player saves 2–4
- Scanning every victim guarantees a bad run (too slow)
- Scanning no victims guarantees a bad run (wrong priorities)
- At least one decision per run should feel genuinely uncomfortable
