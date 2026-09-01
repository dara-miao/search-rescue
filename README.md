# Search Rescue

Search and rescue on the real University Park campus. Dual feed through a fire at Edward L. Doheny Jr. Memorial Library.

This is a **watch**, not a game. After three short beats you sit on the WORLD / ROBOT split and the mast runs the outdoor sweep on its own — door, steps, Tommy, Bovard — marking four people before the heat closes the lawn.

- **World** — Google photoreal 3D tiles from a birdseye, the real University Park map, gold trail of the run
- **Robot** — chase camera on the OpenStreetMap reconstruct, Street View inset when metadata is OK

The campus is a reconstruct of the real layout:

- **OpenStreetMap** building rings for collision and extrusions
- **Open-Meteo / Copernicus DEM** for the 14m campus relief
- **Street View Static** on the robot as the optical inset
- **Places Nearby** for real University Park names

The mission stays outdoors. We do not reconstruct Doheny interiors.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (this project binds to port `43147`).

## What you do

Nothing with the stick. Click **Watch**. The robot:

1. Leaves the west plaza for Doheny’s west door
2. Marks the person on the apron, then the person on the steps
3. Sweeps west to Tommy Trojan
4. Finishes on the lawn west of Bovard

WORLD is the map. ROBOT is how the mast sees the reconstruct. The gold line is the path it already walked.

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

Street View, Places, and Directions hydrate through the Vite `/maps/api` proxy. Photoreal tiles load from the Map Tiles API for WORLD. Without a key, the reconstruct still runs. Restrict the key to Map Tiles, Street View, Places, and Directions if you can — it is a client-side Vite env var.

If Street View metadata is not OK, the optical inset stays hidden. We do not show a still of the interior.

Google requires on-screen attribution when tiles are visible.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei.
