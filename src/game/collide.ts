import { keepOffProps } from './props'
import { BUILDINGS, CAMPUS, type CampusBuilding } from './world'

export const DOOR_GAP = 4.6
/** Body radius plus wall half-thickness so photoreal facades sit inside the hull. */
const SKIN = 1.15

type Hit = { px: number; pz: number; dist: number; t: number }

function pointInRing(x: number, z: number, ring: Array<[number, number]>) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const zi = ring[i][1]
    const xj = ring[j][0]
    const zj = ring[j][1]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi) {
      inside = !inside
    }
  }
  return inside
}

function closestOnSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number): Hit {
  const ex = bx - ax
  const ez = bz - az
  const len2 = ex * ex + ez * ez || 1
  const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / len2))
  const px = ax + ex * t
  const pz = az + ez * t
  return { px, pz, dist: Math.hypot(x - px, z - pz), t }
}

function sameEdge(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  door: { ax: number; az: number; bx: number; bz: number } | undefined,
) {
  if (!door) return false
  return (
    (Math.abs(ax - door.ax) < 0.2 && Math.abs(az - door.az) < 0.2 && Math.abs(bx - door.bx) < 0.2 && Math.abs(bz - door.bz) < 0.2) ||
    (Math.abs(ax - door.bx) < 0.2 && Math.abs(az - door.bz) < 0.2 && Math.abs(bx - door.ax) < 0.2 && Math.abs(bz - door.az) < 0.2)
  )
}

/** True only in the same 4.6 m gap HollowLibrary leaves in the facade. */
export function inDoorGap(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  door: { ax: number; az: number; bx: number; bz: number } | undefined,
  t: number,
) {
  if (!sameEdge(ax, az, bx, bz, door)) return false
  const len = Math.hypot(bx - ax, bz - az)
  if (len < 1) return false
  const half = DOOR_GAP / 2 / len
  return Math.abs(t - 0.5) < half
}

function pushOff(x: number, z: number, hit: Hit, radius: number, inside: boolean, cx: number, cz: number) {
  let dx = x - hit.px
  let dz = z - hit.pz
  let L = Math.hypot(dx, dz)
  if (inside) {
    dx = -dx
    dz = -dz
  }
  if (L < 1e-4) {
    dx = hit.px - cx
    dz = hit.pz - cz
    L = Math.hypot(dx, dz)
  }
  if (L < 1e-4) return { x, z }
  return { x: hit.px + (dx / L) * radius, z: hit.pz + (dz / L) * radius }
}

function nearestEdge(x: number, z: number, ring: Array<[number, number]>) {
  let best: Hit | null = null
  const n = ring.length
  if (n < 2) return null
  const closed =
    Math.abs(ring[0][0] - ring[n - 1][0]) < 1e-4 && Math.abs(ring[0][1] - ring[n - 1][1]) < 1e-4
  const last = closed ? n - 1 : n
  for (let i = 0; i < last; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % n]
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) continue
    const hit = closestOnSeg(x, z, a[0], a[1], b[0], b[1])
    if (!best || hit.dist < best.dist) best = hit
  }
  return best
}

function keepOffBuilding(x: number, z: number, building: CampusBuilding, radius: number) {
  const ring = building.outer
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const [px, pz] of ring) {
    if (px < minX) minX = px
    if (px > maxX) maxX = px
    if (pz < minZ) minZ = pz
    if (pz > maxZ) maxZ = pz
  }
  if (x < minX - radius || x > maxX + radius || z < minZ - radius || z > maxZ + radius) {
    return { x, z }
  }

  let nx = x
  let nz = z
  for (let iter = 0; iter < 6; iter++) {
    const inside = pointInRing(nx, nz, ring)
    const hit = nearestEdge(nx, nz, ring)
    if (!hit) break
    if (!inside && hit.dist >= radius) break
    const next = pushOff(nx, nz, hit, radius, inside, building.cx, building.cz)
    if (Math.hypot(next.x - nx, next.z - nz) < 1e-4) break
    nx = next.x
    nz = next.z
  }
  if (pointInRing(nx, nz, ring)) {
    let dx = nx - building.cx
    let dz = nz - building.cz
    let L = Math.hypot(dx, dz)
    if (L < 1e-4) {
      dx = 1
      dz = 0
      L = 1
    }
    const hit = nearestEdge(nx, nz, ring)
    const out = L + (hit?.dist ?? 8) + radius + 0.4
    nx = building.cx + (dx / L) * out
    nz = building.cz + (dz / L) * out
    if (pointInRing(nx, nz, ring)) {
      const edge = nearestEdge(nx, nz, ring)
      if (edge) {
        const pushed = pushOff(nx, nz, edge, radius, true, building.cx, building.cz)
        nx = pushed.x
        nz = pushed.z
      }
    }
  }
  return { x: nx, z: nz }
}

export function bodyRadius() {
  return CAMPUS.robotRadius + SKIN
}

function clampCampus(x: number, z: number) {
  const b = CAMPUS.bounds
  return {
    x: Math.max(b.minX + 2, Math.min(b.maxX - 2, x)),
    z: Math.max(b.minZ + 2, Math.min(b.maxZ - 2, z)),
  }
}

/** Keep the mast a body-radius off every OSM footprint — door is visual, not a hole. */
export function keepOut(x: number, z: number, radius = bodyRadius()) {
  let { x: nx, z: nz } = clampCampus(x, z)
  for (let pass = 0; pass < 3; pass++) {
    for (const building of BUILDINGS) {
      const next = keepOffBuilding(nx, nz, building, radius)
      nx = next.x
      nz = next.z
    }
  }
  const props = keepOffProps(nx, nz, radius)
  return clampCampus(props.x, props.z)
}

function segCross(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  dx: number,
  dz: number,
) {
  const rx = bx - ax
  const rz = bz - az
  const sx = dx - cx
  const sz = dz - cz
  const den = rx * sz - rz * sx
  if (Math.abs(den) < 1e-9) return null
  const qx = cx - ax
  const qz = cz - az
  const t = (qx * sz - qz * sx) / den
  const u = (qx * rz - qz * rx) / den
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return t
}

/** Sweep from the last pose so a long step cannot tunnel a thin facade. */
export function keepOutFrom(px: number, pz: number, x: number, z: number, radius = bodyRadius()) {
  const dest = keepOut(x, z, radius)
  let bestT = 1
  let nx = 0
  let nz = 0
  let found = false
  for (const building of BUILDINGS) {
    const ring = building.outer
    const n = ring.length
    if (n < 2) continue
    const closed =
      Math.abs(ring[0][0] - ring[n - 1][0]) < 1e-4 && Math.abs(ring[0][1] - ring[n - 1][1]) < 1e-4
    const last = closed ? n - 1 : n
    for (let i = 0; i < last; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % n]
      const t = segCross(px, pz, dest.x, dest.z, a[0], a[1], b[0], b[1])
      if (t === null || t >= bestT) continue
      const ex = b[0] - a[0]
      const ez = b[1] - a[1]
      let ox = -ez
      let oz = ex
      const L = Math.hypot(ox, oz) || 1
      ox /= L
      oz /= L
      const mx = (a[0] + b[0]) / 2
      const mz = (a[1] + b[1]) / 2
      if ((px - mx) * ox + (pz - mz) * oz < 0) {
        ox = -ox
        oz = -oz
      }
      bestT = t
      nx = ox
      nz = oz
      found = true
    }
  }
  if (!found) return dest
  const ix = px + (dest.x - px) * bestT
  const iz = pz + (dest.z - pz) * bestT
  return keepOut(ix + nx * radius, iz + nz * radius, radius)
}

export function insideSolid(x: number, z: number) {
  for (const building of BUILDINGS) {
    if (pointInRing(x, z, building.outer)) return building.name
  }
  return null
}

/** Same pick as the reconstruct: longest-enough edge closest to Tommy. */
export function doorOf(building: CampusBuilding) {
  const ring = building.outer
  let best = { ax: 0, az: 0, bx: 1, bz: 0, score: Infinity }
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = ring[i][0]
    const az = ring[i][1]
    const bx = ring[i + 1][0]
    const bz = ring[i + 1][1]
    const mx = (ax + bx) / 2
    const mz = (az + bz) / 2
    const score = mx * mx + mz * mz
    const len = Math.hypot(bx - ax, bz - az)
    if (len > 4 && score < best.score) {
      best = { ax, az, bx, bz, score }
    }
  }
  return { ax: best.ax, az: best.az, bx: best.bx, bz: best.bz }
}

export function doorMid(building: CampusBuilding) {
  const door = doorOf(building)
  return { x: (door.ax + door.bx) / 2, z: (door.az + door.bz) / 2, door }
}
