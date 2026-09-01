import { Matrix3, Raycaster, Vector3, type Intersection, type Object3D } from 'three'
import { heightAt } from './ground'

const roots: Object3D[] = []
const ray = new Raycaster()
const origin = new Vector3()
const dir = new Vector3()
const worldN = new Vector3()
const normalMat = new Matrix3()
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
/** Curb / planter lip, pole, bench, facade. */
const SWEEP_EYES = [0.16, 0.38, 0.95, 1.55]
const SCAN_EYES = [0.22, 1.05]
const CARDINALS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** A hit this far above the DEM is a roof or canopy, not the walk. Tents sit under 3 m. */
export const ROOF_ABOVE_DEM = 1.55
/** Tree canopies and building roofs sit above this. Walk the DEM under them. */
export const CANOPY_ABOVE_DEM = 4.2

const CELL = 1.6
const BLOCK = 1.1
const walkCache = new Map<string, number | null>()
const clutter = new Map<string, { x: number; z: number; r: number }>()

let live = false
let lastScan = 0

export function tilesLive() {
  return live
}

export function registerTileScene(scene: Object3D) {
  if (roots.includes(scene)) return
  roots.push(scene)
  while (roots.length > 10) roots.shift()
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

function cellKey(x: number, z: number) {
  return `${Math.round(x / CELL)}:${Math.round(z / CELL)}`
}

function blockKey(x: number, z: number) {
  return `${Math.round(x / BLOCK)}:${Math.round(z / BLOCK)}`
}

function clearWalkCache() {
  walkCache.clear()
  clutter.clear()
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
  if (walkCache.size > 220) {
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

/** Vertical faces — poles, planters, benches, walls. Floors and roofs are not. */
export function isSolidUpright(hit: Intersection, _bodyY: number) {
  return Math.abs(worldUp(hit)) < 0.72
}

function rememberAt(x: number, z: number, radius: number) {
  const r = Math.max(0.62, Math.min(1.2, radius * 0.58))
  const key = blockKey(x, z)
  const prev = clutter.get(key)
  if (!prev || prev.r < r) clutter.set(key, { x, z, r })
  if (clutter.size > 220) {
    const oldest = clutter.keys().next().value
    if (oldest !== undefined) clutter.delete(oldest)
  }
}

function rememberHit(hit: Intersection, radius: number) {
  rememberAt(hit.point.x, hit.point.z, radius)
}

/** Planter lids and bench seats are floors to the normal test — height above DEM is the tell. */
function scanDown(x: number, z: number, radius: number) {
  const dem = heightAt(x, z)
  const hit = hitAlong(x, dem + 1.65, z, 0, -1, 0, 2.05)
  if (!hit) return
  const rise = hit.point.y - dem
  if (rise > 0.16 && rise < 1.35) rememberAt(hit.point.x, hit.point.z, radius)
}

function keepOffClutter(x: number, z: number, pad: number) {
  let nx = x
  let nz = z
  const ix = Math.round(x / BLOCK)
  const iz = Math.round(z / BLOCK)
  for (let gx = ix - 2; gx <= ix + 2; gx++) {
    for (let gz = iz - 2; gz <= iz + 2; gz++) {
      const p = clutter.get(`${gx}:${gz}`)
      if (!p) continue
      const need = p.r + pad
      const dx = nx - p.x
      const dz = nz - p.z
      const d = Math.hypot(dx, dz)
      if (d < 1e-4) {
        nx = p.x + need
        continue
      }
      if (d < need) {
        nx = p.x + (dx / d) * need
        nz = p.z + (dz / d) * need
      }
    }
  }
  return { x: nx, z: nz }
}

function scanAround(x: number, y: number, z: number, radius: number) {
  const now = performance.now()
  if (now - lastScan < 260) return
  lastScan = now
  for (const eye of SCAN_EYES) {
    for (const [dx, dz] of DIRS) {
      const hit = hitAlong(x, y + eye, z, dx, 0, dz, radius + 0.4)
      if (!hit || !isSolidUpright(hit, y)) continue
      rememberHit(hit, radius)
    }
  }
  scanDown(x, z, radius)
  for (const [dx, dz] of CARDINALS) {
    scanDown(x + dx * (radius + 0.35), z + dz * (radius + 0.35), radius)
  }
}

/** Push the mast off photoreal poles, planters, and facades. Cheap after the first hit. */
export function keepOffTiles(x: number, y: number, z: number, radius: number) {
  if (!live) return { x, z }
  scanAround(x, y, z, radius)
  return keepOffClutter(x, z, radius)
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
  if (travel < 1e-4) return keepOffClutter(x, z, radius)
  const reach = travel + radius
  const ux = dx / travel
  const uz = dz / travel
  const pxp = -uz * 0.7
  const pzp = ux * 0.7
  let best = Infinity
  for (const eye of SWEEP_EYES) {
    const hit = hitAlong(px, py + eye, pz, dx, 0, dz, reach)
    if (hit && hit.distance < reach && isSolidUpright(hit, py)) {
      rememberHit(hit, radius)
      if (hit.distance < best) best = hit.distance
    }
    if (eye > 0.25) continue
    for (const side of [-1, 1] as const) {
      const sideHit = hitAlong(px + pxp * side, py + eye, pz + pzp * side, dx, 0, dz, reach)
      if (!sideHit || sideHit.distance >= reach || !isSolidUpright(sideHit, py)) continue
      rememberHit(sideHit, radius)
      if (sideHit.distance < best) best = sideHit.distance
    }
  }
  if (!Number.isFinite(best)) return keepOffClutter(x, z, radius)
  const stop = Math.max(0, best - radius)
  return keepOffClutter(px + ux * stop, pz + uz * stop, radius)
}
