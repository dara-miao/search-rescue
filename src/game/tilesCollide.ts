import { Raycaster, Vector3, type Object3D } from 'three'

const roots: Object3D[] = []
const ray = new Raycaster()
const origin = new Vector3()
const dir = new Vector3()
const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.707, 0.707],
  [-0.707, 0.707],
  [0.707, -0.707],
  [-0.707, -0.707],
]

let live = false

export function tilesLive() {
  return live
}

export function registerTileScene(scene: Object3D) {
  if (roots.includes(scene)) return
  roots.push(scene)
  live = true
}

export function disposeTileScene(scene: Object3D) {
  const i = roots.indexOf(scene)
  if (i >= 0) roots.splice(i, 1)
  live = roots.length > 0
}

function hitAlong(x: number, y: number, z: number, dx: number, dz: number, far: number) {
  const L = Math.hypot(dx, dz)
  if (L < 1e-5 || roots.length === 0) return null
  origin.set(x, y, z)
  dir.set(dx / L, 0, dz / L)
  ray.set(origin, dir)
  ray.near = 0.04
  ray.far = far
  ray.firstHitOnly = true
  const hits = ray.intersectObjects(roots, true)
  return hits[0] ?? null
}

/** Push the mast off photoreal facades loaded in WORLD. No-op until tiles exist. */
export function keepOffTiles(x: number, y: number, z: number, radius: number) {
  if (!live) return { x, z }
  const eye = y + 1.12
  let nx = x
  let nz = z
  for (const [dx, dz] of DIRS) {
    const hit = hitAlong(nx, eye, nz, dx, dz, radius)
    if (!hit) continue
    const push = radius - hit.distance + 0.04
    if (push > 0) {
      nx -= dx * push
      nz -= dz * push
    }
  }
  return { x: nx, z: nz }
}

export function sweepTiles(
  px: number,
  py: number,
  pz: number,
  x: number,
  z: number,
  radius: number,
) {
  if (!live) return { x, z }
  const dx = x - px
  const dz = z - pz
  const travel = Math.hypot(dx, dz)
  if (travel < 1e-4) return keepOffTiles(x, py, z, radius)
  const hit = hitAlong(px, py + 1.12, pz, dx, dz, travel + radius)
  if (hit && hit.distance < travel + radius) {
    const ux = dx / travel
    const uz = dz / travel
    const stop = Math.max(0, hit.distance - radius)
    return keepOffTiles(px + ux * stop, py, pz + uz * stop, radius)
  }
  return keepOffTiles(x, py, z, radius)
}
