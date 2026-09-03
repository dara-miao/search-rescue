# Actual simulation

The first screen is a scenario pick (fire, aftershock, night search). WORLD and ROBOT stay on the whole time. The mast then runs that outdoor sweep.

Today the walk is real (`stepBody`). The fire is not. `tick()` adds `elapsed`, finds the nearest pin, and fails at 420s. Survivors do not move, heat, or hide. Thermal is a color grade. Mark is “stand inside 6.8 m and press F.” Doheny particles sit on the library centroid forever.

This plan turns that clock into a search. WORLD stays Google photoreal. ROBOT stays the reconstruct. Collision lives in `collide.ts` and calls into `world.ts` (do not edit `world.ts`). Footprints are solid hulls — the west door is visual. No interiors product. No World Labs.

The loop we steal is labels and pressure, not a stack: one building on fire, outdoor sweep, **HOT / NO GO / EVAC**, last-knowns that go stale.

## Playable sector

Do not simulate the whole OSM extract. Run the field on the slice the mast already walks:

| Corner | x | z | Why |
| --- | --- | --- | --- |
| NW | −70 | −40 | Bovard lawn (Victim 4) |
| NE | 220 | −40 | Doheny east wall |
| SE | 220 | 90 | Doheny north / Childs |
| SW | −70 | 90 | Tommy → Student Union |

Seed **Doheny** (`cx 151.7, cz 39.925`, `fire: true`). Victims stay where they are authored:

1. West door `111.4, 48.2` — first to cook
2. West steps `112.81, 41.13` — next
3. Tommy `−6.2, 4` — smoke arrives mid-run
4. Bovard lawn `−48, −18` — last, unless the front runs

Deploy stays `{x: 82, z: 36, yaw: 1.32}` on the west walk, facing the door, not inside it.

## What the robot is actually doing

A 7-minute **autonomous sweep** (you watch; you do not drive) becomes:

1. Read the zone on the mast (**SAFE / WARM / HOT / NO GO**) and the WORLD overlay.
2. Find people with **sensors**, not a god-view roster. Optical sees far in clear air. Thermal sees through smoke, closer, and costs the pack.
3. Mark only a **detected** victim inside 6.8 m.
4. Get V1 and V2 off the door before the apron goes **NO GO**.
5. Sweep Tommy and Bovard on the **EVAC** walks before smoke fills the quad.
6. Leave if the hull overheats or the pack dies.

Win: all four **marked** (status, not a boolean) before time, loss, or crossover.

Fail (any):

| Code | Trigger |
| --- | --- |
| `TIME` | `elapsed >= 420` |
| `LOST` | any victim `exposure >= 1` while still unmarked |
| `HULL` | robot `hull` stays in **NO GO** for 8 s |
| `PACK` | battery hits 0 (slice 2) |
| `FRONT` | fire front (`heat >= 0.45`) reaches Tommy Trojan `(0, 0)` |

## Clock and ownership

One fixed sim step, not “whatever RAF gave us.”

- **Step** `1/20 s`. `useSimLoop` already clamps `dt` to `0.05` — accumulate and run `while (acc >= 1/20) step(1/20)`.
- **Body** stays outside the store (ref + `stepBody`). The sim **reads** pose; it does not integrate walk.
- **Store** holds `SimState`. Views (Fire, People, HUD, WORLD chrome) only read.
- **`world.ts`** stays collision + campus constants. Heat queries live in `src/sim/*` and import `BUILDINGS` / `DOHENY` / `SURVIVORS` read-only.

```
input → wish → stepBody → applyRobot
                     ↘
                  sim.step(1/20)
                    1. field.spread
                    2. victims.expose + maybe crawl
                    3. sensors.detect
                    4. robot.hull / pack / speed cap
                    5. zones + fail / complete
```

## Field

Coarse grid over the sector. Not a CFD.

- **Cell** 4 m. About 73 × 33 ≈ 2.4k cells. Fine enough for a door apron, cheap every 50 ms.
- Per cell: `heat` 0–1, `smoke` 0–1, `fuel` 0–1, `cover`, `blocked`.
- **Blocked**: cell center inside a non-enterable building ring. Heat does not enter. Doheny (enterable + fire) is fuel, not a wall.
- **Seed at t=0**: Doheny interior `heat 0.92–1.0`, west-door apron (≈8 m west of the door) `0.38`, courtyard inner `0.96`. Everywhere else `0`.
- **Conduct by cover** (how fast a neighbor ignites):

  | Cover | k |
  | --- | --- |
  | street | 0.70 |
  | walkway | 0.55 |
  | plaza | 0.50 |
  | steps | 0.45 |
  | dirt | 0.40 |
  | lawn | 0.28 |
  | Doheny interior | 0.85 |

- **Wind** authored, not live weather: afternoon push **east + a little south** in local axes (`+X` east, `+Z` south) → bias `(+0.65, +0.25)`. Smoke advects downwind faster than heat.
- **Update** (explicit, damped):

  `heat += dt * k * (neighborHeat − heat) * windBias`  
  `heat += dt * 0.04 * fuel * heat` (growth while fuel > 0)  
  `fuel -= dt * 0.02 * heat`  
  `smoke = max(smoke * 0.992, downwindHeat * 0.8)`

- **Sample** bilinear `heatAt(x,z)` / `smokeAt(x,z)` for victims, hull, sensors, VFX.

### Zones (Orca labels, outdoor)

| Zone | heat | What it does |
| --- | --- | --- |
| **EVAC** | authored corridors (west walk deploy → Tommy → Bovard lawn), not a heat band | WORLD pins + mast “get out this way” |
| **SAFE** | `< 0.15` | full walk / sprint |
| **WARM** | `0.15–0.45` | optical range −20% |
| **HOT** | `0.45–0.78` | walk × 0.55, sprint blocked, hull climbs |
| **NO GO** | `≥ 0.78` | wish clipped to 0 after 1.2 s in cell; hull climbs fast |

`zoneAt` is derived. Do not store a second grid.

## Victims

Replace `found: boolean` with a machine. Positions stay outdoor pins. No beige rooms.

```
unseen → detected → marked
                 ↘ lost
```

| Field | Meaning |
| --- | --- |
| `status` | unseen / detected / marked / lost |
| `exposure` | 0–1, `+= heatAt * dt * 0.55` (V1/V2) or `0.22` (V3/V4) |
| `mobility` | 1 until exposure 0.4, then 0.35 |
| `lastKnown` | `{x,z,t}` written only on detect or mark |
| `visibleOptical` / `visibleThermal` | this step’s sensor flags |

**Crawl (V1 only, slice 1):** if `exposure > 0.35` and unmarked, creep **west** along the walk at 0.35 m/s, stop at `x ≈ 98` (still on the apron, not into the door). That is the only “AI.” Everyone else holds.

**Lost:** `exposure >= 1` and still unmarked. Mission fail. The body stays as a cold pin; thermal no longer lights them.

Roster on the mast: id + zone of last-known, not a live GPS. If last-known is older than 25 s, show **STALE**.

## Sensors

God-view nearest-pin is why this does not feel like a sim.

**Optical (default mast)**

- Forward cone, half-angle **42°**, range **28 m**
- Blocked when `smokeAt` along the ray (3 samples) `> 0.45`
- WARM/HOT shortens range (×0.8 / ×0.55)
- Street View inset stays chrome. Detection is the reconstruct ray, not the pano.

**Thermal (T)**

- Cone **55°**, range **18 m**
- Ignores smoke
- Victim must have `exposure < 1` (a lost body is ambient)
- Drain: slice 2. Slice 1: just the detect model.

**Mark**

- `status === 'detected'` this frame **or** last 0.8 s (so a flicker does not brick F)
- Distance `<= 6.8`
- Not `lost`

WORLD never auto-marks. It only shows last-knowns the mast has already seen.

## Robot (beyond walking)

`stepBody` stays. After it runs, the sim **caps wish** next frame from the zone:

- **HOT:** treat sprint as walk, then ×0.55
- **NO GO:** after 1.2 s continuous, `wish = 0` (you can still turn and look)
- **hull:** `+= (heat − 0.35) * dt * 0.4`, cool `−0.08 * dt` in SAFE
- **pack (slice 2):** 100 → 0; walk 0.8/min, sprint 2.2/min, thermal 1.6/min

Hull `>= 1` for 8 s in NO GO → `HULL` fail.

## What each view is allowed to do

| View | Reads | Must not invent |
| --- | --- | --- |
| `Fire.tsx` | cells with `heat > 0.2` in/near Doheny | Hardcoded four flame origins forever |
| `People.tsx` | victim pose + status + detect | Pulse every pin as if known |
| Mast HUD | zone, hull, detect, stale last-known | Live range to unseen victims |
| WORLD chrome | last-knowns + zone chips + EVAC | Victim GPS before detect |
| Optical inset | heading / thermal flag | Detection |

Flame count and smoke opacity scale with `heatAt` / `smokeAt`. When the front leaves the courtyard, the particles move with the hot cells — that is the tell the field is real.

## Files (do not dump this into `store.ts`)

```
src/sim/types.ts      SimState, Zone, VictimSim, FailCode
src/sim/field.ts      grid alloc, seed, spread, heatAt, smokeAt, zoneAt
src/sim/victims.ts    expose, crawl V1, lose
src/sim/sensors.ts    cone + smoke samples, detect
src/sim/robot.ts      hull, pack, speed cap from zone
src/sim/step.ts       one 1/20 tick, win/lose
src/sim/evac.ts       authored EVAC polyline (deploy → Tommy → Bovard)
```

`store.ts` keeps phase / robot pose / UI flash. It **holds** `sim: SimState` and calls `stepSim`. `useSimLoop` stays the only RAF owner.

Tests (tsx, no `import.meta`): seed Doheny hot; 60 s later west-door apron `heat > 0.45`; Tommy still `< 0.15`; V1 exposure rose; optical miss through smoke=0.6; thermal hit.

## Slice 1 — build this next

The smallest loop that is no longer theater:

1. Field + seed + spread + `zoneAt`
2. Victim exposure + V1 crawl + `LOST` / `FRONT`
3. Optical / thermal detect; mark gated
4. Mast: zone chip, STALE last-known, hide unseen ranges
5. `Fire.tsx` instances from hot cells (cap ~160), not four origins
6. WORLD: last-known pins + EVAC / HOT / NO GO chips only
7. HUD fail copy: “Victim 1 lost at the west door” / “Fire reached Tommy” / time

Out of slice 1: battery, comms delay, coverage heatmap, live weather, Rapier, interiors, editing `world.ts`.

## Slice 2

Pack drain + limp. Thermal costs energy. WORLD last-knowns lag 4 s when `smokeAt(robot) > 0.5`. Coverage grid on the sweep (visited cells) as a debrief, not a win condition.

## Slice 3 (only if slice 1 feels true)

Second fuel pocket (Bovard enterable courtyard) as a late-game fork. Still no interiors mesh. Still no World Labs.

## Explicit non-goals

- Do not edit `world.ts`.
- Do not touch `dara-miao/usc-rescue`.
- Do not generate Marble / World Labs rooms.
- Do not put the mast back in the Doheny door.
- Do not log or print `VITE_GOOGLE_MAPS_KEY`.
- Do not replace `stepBody` with a physics engine.
- Do not simulate the full 50-building extract.

## Why this is a simulation

A system is a sim when the next minute is different if you wait. If you stand on the west walk and watch, the apron goes HOT, V1 crawls then is lost, optical whites out, and Tommy is still clear — so the right play is mark the door now, not tour the quad. That is the test. If Fire still looks the same at t=0 and t=180, the field is not wired.
