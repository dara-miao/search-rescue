# Search Rescue

Search-and-rescue robot simulation on the real University Park campus.

Doheny is on fire. You drive the outdoor mast: walk to the four people still outside and mark them before the heat makes the rest of the ground too dangerous. You cannot go inside the library.

- **WORLD** — Google photoreal 3D tiles, birdseye over the real campus
- **ROBOT** — chase camera on the OpenStreetMap reconstruct, Street View inset when metadata is OK

## Play

The first screen is a three-beat briefing over Doheny. **Next** / Enter / Space, then **Start**.

You drive the robot:

- **Walk** (hold the button) / **W** / click-hold the robot pane — walk. The mast turns toward the next person while you hold walk.
- **A** / **D** — turn by hand
- In range they mark automatically. **F** / **Space** / **Mark** still works.
- **T** — thermal
- **Q** / **E** — orbit WORLD
- **Shift** — sprint (off in HOT / NO GO)

After the run: **Go again** respawns on the west walk. **Briefing** goes back to the opening beats.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (this project binds to port `43147`).

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

Street View, Places, and Directions hydrate through the Vite `/maps/api` proxy. Photoreal tiles load from the Map Tiles API for WORLD. Without a key, the reconstruct still runs.

If Street View metadata is not OK, the optical inset stays hidden.

Google requires on-screen attribution when tiles are visible.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei.
