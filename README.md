# Doheny Rescue

Browser search-and-rescue around Doheny Memorial Library at USC. The interior is closed. You drive a ground robot on the perimeter and triage people at windows and doors.

**Live:** [usc-search-rescue.vercel.app](https://usc-search-rescue.vercel.app)

Add `?seed=42` to pin a run.

## Play

Spawn on the Alumni Park lawn. Follow the cyan pip to a live opening, scan, then extract. Carry people to the red staging ring. The run ends when every room has vented.

- **W / S** or knob: throttle
- **A / D** or knob: steer
- **T**: thermal
- **Space**: scan (hold still at an opening)
- **F**: extract
- Scroll: zoom

## Develop

```bash
npm install
npm run dev
```

Dev server is port `43147`. First run fetches public textures.

```bash
npm run test:site
npm run build
```

## Data

© OpenStreetMap contributors (ODbL). Attribution is on the Credits screen. Facade maps are derived from "Doheny Library" by Padsquad19, Wikimedia Commons, CC BY-SA 3.0.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, and zustand.
