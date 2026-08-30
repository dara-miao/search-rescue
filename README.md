# Search Rescue

Search and rescue on the real University Park campus. Dual feed through a fire at Edward L. Doheny Jr. Memorial Library.

The campus is a Pebble Beach-style reconstruct: real University Park layout, video-game ground.

- **OpenStreetMap** building rings for collision and extrusions
- **Open-Meteo / Copernicus DEM** for the 14m campus relief the mast walks
- **Cover mesh** for lawn, walkway, street, steps, and plaza (first slice: Doheny west steps → Tommy → Bovard lawn)
- **Draped walks and plazas** sitting on the DEM, plus an afternoon sky
- **Street View Static** on the robot as the optical inset (heading from the mast)
- **Places Nearby** for real University Park names
- **Directions** walking polyline from spawn to Doheny west door

The screen is split on purpose:

- **World** — Google photoreal 3D tiles from a birdseye, the real University Park map
- **Robot** — mast camera on the reconstructed quad, Street View inset for the street

The mission stays outdoors. We do not reconstruct Doheny interiors.

Find and mark four missing people before the clock runs out.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (this project binds to port `43147`).

## Controls

| Input | Action |
| --- | --- |
| Drive stick | Point the stick to walk that way |
| W S / A D | Drive / turn |
| Shift | Sprint |
| F / Space | Mark a survivor in range |
| T | Toggle thermal on the mast cam |
| Q / E | Orbit the world camera |
| Touch | On-screen drive stick, Mark, Thermal |

## Mission

A structure fire is moving through Doheny. Enter at the west door. Four people are unaccounted for:

- Victim 1 — Doheny west door
- Victim 2 — Doheny west steps
- Victim 3 — behind Tommy Trojan
- Victim 4 — lawn west of Bovard

Get close, mark them, and last-known positions write back into the campus feed.

## Data

Put a Google Maps Platform key in `.env.local` (gitignored):

```
VITE_GOOGLE_MAPS_KEY=AIza...
```

Enable these APIs on that key:

- Map Tiles API
- Street View Static API
- Places API (legacy Nearby Search)
- Directions API

Street View, Places, and Directions hydrate through the Vite `/maps/api` proxy. Photoreal tiles load from the Map Tiles API for WORLD. Without a key, the reconstruct still plays. Restrict the key to Map Tiles, Street View, Places, and Directions if you can — it is a client-side Vite env var.

`scripts/fetch-campus-elevation.mjs` writes the Open-Meteo grid into `src/data/ground.json`. `scripts/extract-campus-ground.mjs` can refresh OSM paths and lawns when Overpass is reachable. `src/game/ground.ts` then repairs the west steps, Doheny apron, and the sweep to Bovard so the first slice is playable even when the extract is thin.

Building outlines come from [OpenStreetMap](https://www.openstreetmap.org/copyright). Aerial fallback is [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).

When Street View metadata is not OK, the optical inset falls back to a Times-Mirror still of Doheny Memorial Library by [EEJCC](https://commons.wikimedia.org/wiki/User:EEJCC), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Source: [File:Doheny Library interior.jpg](https://commons.wikimedia.org/wiki/File:Doheny_Library_interior.jpg) on Wikimedia Commons.

Google requires on-screen attribution when tiles are visible.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei.
