# Search Rescue

Search and rescue on the real University Park campus. Dual feed through a fire at Edward L. Doheny Jr. Memorial Library.

The campus is reconstructed from public geospatial data, then streamed as photogrammetry when a Google key is present:

- **Google Photorealistic 3D Tiles** (Map Tiles API) for the live University Park mesh
- **Street View Static** on the robot as the optical feed (nearest pano, heading from the mast)
- **Places Nearby** for real University Park names in the world
- **Directions** walking polyline from spawn to Doheny west door
- **OpenStreetMap** footprints for collision, survivor placement, and the no-key fallback
- **Esri World Imagery** as the fallback ground texture

The screen is split on purpose:

- **World** — tactical overview over the real quad
- **Robot** — live mast camera, Street View optical inset, thermal pass for heat signatures

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

A structure fire is moving through Doheny. Four people are unaccounted for:

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

Photoreal tiles stream from Google. Street View, Places, and Directions hydrate through the Vite `/maps/api` proxy. Without a key, the sim falls back to OSM extrusions and Esri aerials. Restrict the key to those APIs if you can — it is a client-side Vite env var.

Building outlines come from [OpenStreetMap](https://www.openstreetmap.org/copyright). Aerial fallback is [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).

Google requires on-screen attribution when tiles are visible.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei.
