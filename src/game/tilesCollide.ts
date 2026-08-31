import { Raycaster, Vector3, type Object3D } from 'three'
import { heightAt } from './ground'

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
const EYES = [0.38, 1.05, 1.72, 2.55]

/** A hit this far above the DEM is a roof or canopy, not the walk. */
export const ROOF_ABOVE_DEM = 3.6

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

export function isRoofHit(hitY: number, demY: number) {
  return hitY > demY + ROOF_ABOVE_DEM
}

function hitAlong(x: number, y: number, z: number, dx: number, dy: number, dz: number, far: number) {
  const L = Math.hypot(dx, dy, dz)
  if (L < 1e-5 || roots.length === 0) return null
  origin.set(x, y, z)
  dir.set(dx / L, dy / L, dz / L)
  ray.set(origin, dir)
  ray.near = 0.04
  ray.far = far
  ray.firstHitOnly = true
  const hits = ray.intersectObjects(roots, true)
  return hits[0] ?? null
}

export function probeTileGround(x: number, z: number) {
  if (!live) return null
  const hit = hitAlong(x, 160, z, 0, -1, 0, 220)
  return hit ? hit.point.y : null
}

/** Walk height on photoreal ground. Null means this XZ is a roof — do not stand there. */
export function walkableTileY(x: number, z: number) {
  const dem = heightAt(x, z)
  const tileY = probeTileGround(x, z)
  if (tileY == null) return dem
  if (isRoofHit(tileY, dem)) return null
  return tileY
}

export function measureRoofCentroid(cx: number, cz: number, half = 48, step = 6) {
  if (!live) return null
  let sx = 0
  let sz = 0
  let n = 0
  for (let x = cx - half; x <= cx + half; x += step) {
    for (let z = cz - half; z <= cz + half; z += step) {
      const y = probeTileGround(x, z)
      if (y == null) continue
      if (!isRoofHit(y, heightAt(x, z))) continue
      sx += x
      sz += z
      n += 1
    }
  }
  if (n < 5) return null
  return { x: sx / n, z: sz / n, n }
}

function keepOffAtEye(x: number, y: number, z: number, radius: number) {
  let nx = x
  let nz = z
  for (const [dx, dz] of DIRS) {
    const hit = hitAlong(nx, y, nz, dx, 0, dz, radius)
    if (!hit) continue
    const push = radius - hit.distance + 0.04
    if (push > 0) {
      nx -= dx * push
      nz -= dz * push
    }
  }
  return { x: nx, z: nz }
}

/** Push the mast off photoreal facades loaded in WORLD. No-op until tiles exist. */
export function keepOffTiles(x: number, y: number, z: number, radius: number) {
  if (!live) return { x, z }
  let nx = x
  let nz = z
  for (const eye of EYES) {
    const next = keepOffAtEye(nx, y + eye, nz, radius)
    nx = next.x
    nz = next.z
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
  let stop = travel
  for (const eye of EYES) {
    const hit = hitAlong(px, py + eye, pz, dx, 0, dz, travel + radius)
    if (hit && hit.distance < stop + radius) {
      stop = Math.max(0, hit.distance - radius)
    }
  }
  const ux = dx / travel
  const uz = dz / travel
  const sx = px + ux * Math.min(travel, stop)
  const sz = pz + uz * Math.min(travel, stop)
  return keepOffTiles(sx, py, sz, radius)
}
