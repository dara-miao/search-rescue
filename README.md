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

A short briefing holds the clock, then the lawn comes up. Deploy from staging. Marked openings still have someone waiting. The gold pip is the building. People stand at the glass. Rooms telegraph with smoke, then vent.

1. Drive to a marked opening and stop.
2. Hold still and assess. Thermal shows signatures through the walls. Count, condition, and type stay hidden until you do.
3. Rescue who you can reach. Mark the rest.
4. Carry them to staging. Drop off and recharge.
5. When a room vents that opening dies. The run ends when every cell has vented.

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

Built with Vite, React, TypeScript, Three.js, React Three Fiber, Drei, and zustand.
