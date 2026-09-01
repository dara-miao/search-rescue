import { Matrix3, Raycaster, Vector3, type Intersection, type Object3D } from 'three'
import { heightAt } from './ground'

const roots: Object3D[] = []
const ray = new Raycaster()
const origin = new Vector3()
const dir = new Vector3()
const worldN = new Vector3()
const normalMat = new Matrix3()
const DIRS: Array<[number, number]> = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  return [Math.cos(a), Math.sin(a)]
})
const EYES = [0.32, 0.78, 1.2, 1.72, 2.35]
const SWEEP_EYES = [0.42, 1.05, 1.68]

/** A hit this far above the DEM is a roof or canopy, not the walk. Tents sit under 3 m. */
export const ROOF_ABOVE_DEM = 1.55
/** Tree canopies and building roofs sit above this. Walk the DEM under them. */
export const CANOPY_ABOVE_DEM = 4.2

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
  clearWalkCache()
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

const CELL = 1.6
const walkCache = new Map<string, number | null>()

function cellKey(x: number, z: number) {
  return `${Math.round(x / CELL)}:${Math.round(z / CELL)}`
}

function clearWalkCache() {
  walkCache.clear()
}

/**
 * Ground / stoop → that Y. Tent-height roof → null (blocked).
 * High first-hits (palms, building roofs) → DEM so you can walk under the canopy.
 */
export function pickWalkY(dem: number, hits: number[]) {
  if (!hits.length) return dem
  const groundish = hits.filter((y) => y <= dem + ROOF_ABOVE_DEM && y >= dem - 1.2)
  if (groundish.length) return Math.max(...groundish)
  if (hits.some((y) => y > dem + ROOF_ABOVE_DEM && y < dem + CANOPY_ABOVE_DEM)) return null
  return dem
}

/** Walk height on photoreal ground. Null means this XZ is a low roof — do not stand there. */
export function walkableTileY(x: number, z: number) {
  const dem = heightAt(x, z)
  if (!live) return dem
  const key = cellKey(x, z)
  const cached = walkCache.get(key)
  if (cached !== undefined) return cached
  const y = probeTileGround(x, z)
  const picked = y == null ? dem : pickWalkY(dem, [y])
  walkCache.set(key, picked)
  if (walkCache.size > 360) {
    const oldest = walkCache.keys().next().value
    if (oldest !== undefined) walkCache.delete(oldest)
  }
  return picked
}

export function measureRoofCentroid(cx: number, cz: number, half = 30, step = 12) {
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

/** Face.normal is mesh-local (ECEF on Google tiles). World Y is the only "floor" test. */
function worldUp(hit: Intersection) {
  if (!hit.face) return 0
  worldN.copy(hit.face.normal)
  normalMat.getNormalMatrix(hit.object.matrixWorld)
  worldN.applyMatrix3(normalMat)
  const L = worldN.length()
  if (L < 1e-6) return 0
  return worldN.y / L
}

/** Horizontal rays that scrape the walk or a roof slab are not poles / walls. */
export function isSolidUpright(hit: Intersection, bodyY: number) {
  if (hit.point.y < bodyY + 0.16) return false
  return Math.abs(worldUp(hit)) < 0.72
}

function keepOffAtEye(x: number, y: number, z: number, radius: number, bodyY: number) {
  let nx = x
  let nz = z
  for (const [dx, dz] of DIRS) {
    const hit = hitAlong(nx, y, nz, dx, 0, dz, radius)
    if (!hit || !isSolidUpright(hit, bodyY)) continue
    const push = radius - hit.distance + 0.1
    if (push > 0) {
      nx -= dx * push
      nz -= dz * push
    }
  }
  return { x: nx, z: nz }
}

/** Push the mast off photoreal facades and poles loaded in WORLD. No-op until tiles exist. */
export function keepOffTiles(x: number, y: number, z: number, radius: number) {
  if (!live) return { x, z }
  let nx = x
  let nz = z
  for (const eye of EYES) {
    const next = keepOffAtEye(nx, y + eye, nz, radius, y)
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
  if (travel < 1e-4) return { x, z }
  let best = Infinity
  for (const eye of SWEEP_EYES) {
    const hit = hitAlong(px, py + eye, pz, dx, 0, dz, travel + radius)
    if (!hit || hit.distance >= travel + radius) continue
    if (!isSolidUpright(hit, py)) continue
    if (hit.distance < best) best = hit.distance
  }
  if (!Number.isFinite(best)) return { x, z }
  const stop = Math.max(0, best - radius)
  const ux = dx / travel
  const uz = dz / travel
  return { x: px + ux * stop, z: pz + uz * stop }
}
