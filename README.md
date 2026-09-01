# Search Rescue

Search-and-rescue robot simulation on the real University Park campus.

You pick an emergency. Then you watch two feeds at once:

- **WORLD** — Google photoreal 3D tiles, birdseye over the real campus
- **ROBOT** — chase camera on the OpenStreetMap reconstruct, Street View inset when metadata is OK

This is a **watch**, not a game. The mast runs the outdoor sweep on its own and marks people it can reach. It does not go inside.

## Emergencies

1. **Doheny is on fire** — structure fire. Four people still outside. Stay off the library.
2. **Aftershock at Bovard** — earthquake debris on the west lawn. Three people in the open.
3. **Missing on the quad** — night search. Two people never made it back. The robot sweeps on thermal.

Keys `1` `2` `3` pick a scenario from the first screen.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (this project binds to port `43147`).

## What you see

WORLD is the map. ROBOT is how the mast sees the reconstruct. The gold line is the path it already walked.

After the run: **Watch again** repeats that emergency. **Scenarios** goes back to the picker.

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
