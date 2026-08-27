import raw from '../data/campus.json'
import type { CampusBuilding, CampusFile, Ring } from '../data/types'

export type { CampusBuilding }

export const campus = raw as CampusFile

export type Vec2 = { x: number; z: number }

export type SurvivorDef = {
  id: string
  name: string
  role: string
  x: number
  z: number
  y: number
  note: string
}

export const CAMPUS = {
  robotRadius: 0.62,
  markRange: 6.8,
  timeLimit: 420,
  spawn: campus.spawn,
  bounds: campus.bounds,
}

export const BUILDINGS = campus.buildings
export const DOHENY = campus.buildings.find((b) => b.fire) ?? campus.buildings[0]
export const SURVIVORS: SurvivorDef[] = campus.survivors
export const TREES = campus.trees
export const LANDMARKS = campus.landmarks

type Prepared = {
  building: CampusBuilding
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  door?: { ax: number; az: number; bx: number; bz: number }
}

function ringBounds(ring: Ring) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const [x, z] of ring) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  return { minX, maxX, minZ, maxZ }
}

function pickDoorEdge(ring: Ring) {
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

const PREP: Prepared[] = BUILDINGS.map((building) => {
  const b = ringBounds(building.outer)
  return {
    building,
    ...b,
    door: building.enterable ? pickDoorEdge(building.outer) : undefined,
  }
})

export const DOHENY_DOOR = PREP.find((p) => p.building.enterable)?.door

function pointInRing(x: number, z: number, ring: Ring) {
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

function closestOnSeg(
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
) {
  const ex = bx - ax
  const ez = bz - az
  const len2 = ex * ex + ez * ez || 1
  const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / len2))
  const px = ax + ex * t
  const pz = az + ez * t
  return { px, pz, dist: Math.hypot(x - px, z - pz), t }
}

function isDoorEdge(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  door: Prepared['door'],
  t: number,
) {
  if (!door) return false
  const same =
    (Math.abs(ax - door.ax) < 0.05 && Math.abs(az - door.az) < 0.05 && Math.abs(bx - door.bx) < 0.05 && Math.abs(bz - door.bz) < 0.05) ||
    (Math.abs(ax - door.bx) < 0.05 && Math.abs(az - door.bz) < 0.05 && Math.abs(bx - door.ax) < 0.05 && Math.abs(bz - door.az) < 0.05)
  if (!same) return false
  return t > 0.32 && t < 0.68
}

function pushFromRing(
  x: number,
  z: number,
  ring: Ring,
  radius: number,
  cx: number,
  cz: number,
  door?: Prepared['door'],
): Vec2 {
  let bestDist = Infinity
  let px = x
  let pz = z
  for (let i = 0; i < ring.length - 1; i++) {
    const hit = closestOnSeg(x, z, ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1])
    if (isDoorEdge(ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1], door, hit.t)) continue
    if (hit.dist < bestDist) {
      bestDist = hit.dist
      px = hit.px
      pz = hit.pz
    }
  }
  const ox = px - cx
  const oz = pz - cz
  const L = Math.hypot(ox, oz) || 1
  return { x: px + (ox / L) * radius, z: pz + (oz / L) * radius }
}

export function resolveCollision(x: number, z: number, radius = CAMPUS.robotRadius): Vec2 {
  const b = CAMPUS.bounds
  let nx = Math.max(b.minX + 2, Math.min(b.maxX - 2, x))
  let nz = Math.max(b.minZ + 2, Math.min(b.maxZ - 2, z))

  for (const item of PREP) {
    if (nx < item.minX - radius || nx > item.maxX + radius || nz < item.minZ - radius || nz > item.maxZ + radius) {
      continue
    }
    const { building, door } = item
    if (building.enterable) {
      for (let i = 0; i < building.outer.length - 1; i++) {
        const ax = building.outer[i][0]
        const az = building.outer[i][1]
        const bx = building.outer[i + 1][0]
        const bz = building.outer[i + 1][1]
        const hit = closestOnSeg(nx, nz, ax, az, bx, bz)
        if (isDoorEdge(ax, az, bx, bz, door, hit.t)) continue
        if (hit.dist < radius + 0.38) {
          const dx = nx - hit.px
          const dz = nz - hit.pz
          const L = Math.hypot(dx, dz)
          const need = radius + 0.38
          if (L < 1e-4) {
            const nl = Math.hypot(-(bz - az), bx - ax) || 1
            nx = hit.px + (-(bz - az) / nl) * need
            nz = hit.pz + ((bx - ax) / nl) * need
          } else {
            nx = hit.px + (dx / L) * need
            nz = hit.pz + (dz / L) * need
          }
        }
      }
      continue
    }

    if (pointInRing(nx, nz, building.outer)) {
      const pushed = pushFromRing(nx, nz, building.outer, radius + 0.25, building.cx, building.cz)
      nx = pushed.x
      nz = pushed.z
    }
  }

  return { x: nx, z: nz }
}

export function dist2(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(ax - bx, az - bz)
}

export function satPlane() {
  const { origin, sat } = campus
  const cos = Math.cos((origin.lat * Math.PI) / 180)
  const x0 = (sat.minLon - origin.lon) * (111320 * cos)
  const x1 = (sat.maxLon - origin.lon) * (111320 * cos)
  const zNorth = (origin.lat - sat.maxLat) * 110540
  const zSouth = (origin.lat - sat.minLat) * 110540
  return {
    width: x1 - x0,
    depth: zSouth - zNorth,
    cx: (x0 + x1) / 2,
    cz: (zNorth + zSouth) / 2,
    url: sat.url,
  }
}
