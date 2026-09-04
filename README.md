# Doheny Rescue

<p align="center">
  <img src="public/textures/doheny-elevation.jpg" width="880" alt="South elevation of Doheny Memorial Library" />
</p>

<p align="center">
  <strong>Doheny is on fire.</strong><br />
  <a href="https://usc-search-rescue.vercel.app">Play live</a>
  ·
  <a href="https://usc-search-rescue.vercel.app/?seed=42">seed 42</a>
</p>

Fire is already in the stacks at Doheny Memorial Library. You drive a ground robot on the Alumni Park lawn and triage people at the glass. You cannot go inside.

## A run

A short briefing holds the clock, then the lawn comes up. Deploy from the red ring. Marked openings still have someone waiting. The gold pip is the building. Thermal shows heat at the glass. Rooms telegraph with smoke, then vent.

1. Drive to a marked opening and stop.
2. Press Space to assess. Count, condition, and type stay hidden until you do.
3. Press F to rescue who you can reach. Mark the rest. They walk to staging. You stay on the perimeter.
4. When a room vents that opening dies. Charge at the red ring if the battery limps.
5. The run ends when every cell has vented.

Debrief lists each person in encounter order: what you saw, what you did, what was true. No grade.

You cannot die. Below 20% battery the robot limps. Empty still crawls home.

## Controls

| Input | What it does |
| --- | --- |
| **W / S** or knob | Throttle |
| **A / D** or knob | Steer |
| Scroll | Zoom |
| **T** | Toggle thermal |
| **Space** | Assess (stop at an opening) |
| **F** | Rescue |
| **Enter** | Next, then Deploy |

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

## Credits

© OpenStreetMap contributors (ODbL). Attribution also lives on the Credits screen.

The photograph above is [Doheny Library](https://commons.wikimedia.org/wiki/File:Doheny_Library.jpg) by Padsquad19, Wikimedia Commons, CC BY-SA 3.0. Facade maps in the sim are derived from it.

The lawn shot from the sim is in this repo as `public/doheny-from-lawn.jpg`. GitHub's file API cannot take that JPEG, so this page uses the elevation photo until the file is pushed with git.

Built with Vite, React, TypeScript, Three.js, React Three Fiber, Drei, and zustand.
