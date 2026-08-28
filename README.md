# Search Rescue

Search and rescue on the real University Park campus. Dual feed through a fire at Edward L. Doheny Jr. Memorial Library.

Pick a building on University Park, reconstruct the room, then drive the incident inside it. The campus is playable geometry from public geospatial data — OSM footprints become buildings, Esri aerials become the ground, and Doheny becomes a walkable Times-Mirror interior. Google hydrates that reconstruction (Street View, Places, Directions). It is not the world mesh.

- **OpenStreetMap** footprints extruded into campus buildings and collision
- **Times-Mirror reading room** inside Doheny — columns, tables, licensed interior still, room fire
- **Street View Static** on the robot as the outdoor optical feed (nearest pano, heading from the mast)
- **Places Nearby** for real University Park names in the world
- **Directions** walking polyline from spawn to Doheny west door
- **Esri World Imagery** as the ground texture

The screen is split on purpose:

- **World** — reconstructed University Park, then a cutaway into the labeled room
- **Robot** — mast camera in the same volume, Street View outdoors, Times-Mirror still indoors, thermal pass for heat

Responder labels (HOT, NO GO, EVAC) write onto the reconstructed room. Find and mark four missing people before the clock runs out.

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

Click Doheny, run a structure fire, reconstruct the Times-Mirror room. Four people are unaccounted for:

- Victim 1 — Times-Mirror reading room, inside Doheny
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

- Street View Static API
- Places API (legacy Nearby Search)
- Directions API

Street View, Places, and Directions hydrate through the Vite `/maps/api` proxy. Without a key, the optical inset stays dark and the reconstructed OSM campus still plays. Restrict the key to those APIs if you can — it is a client-side Vite env var.

Building outlines come from [OpenStreetMap](https://www.openstreetmap.org/copyright). Aerial fallback is [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).

When Street View metadata is not OK (outdoor source dies inside Doheny), the optical inset shows a Times-Mirror still of Doheny Memorial Library by [EEJCC](https://commons.wikimedia.org/wiki/User:EEJCC), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Source: [File:Doheny Library interior.jpg](https://commons.wikimedia.org/wiki/File:Doheny_Library_interior.jpg) on Wikimedia Commons, recompressed for the inset.

The Times-Mirror still is also mapped onto the far wall of the reconstructed reading room.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei.
