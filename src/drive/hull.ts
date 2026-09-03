import { site, type Vec2 } from '../data/site'
import { ROBOT_CONFIG } from './robot-controller.js'

export const BODY_RADIUS = ROBOT_CONFIG.radius

export function pointInPoly(x: number, z: number, pts: Vec2[]) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const zi = pts[i].z
    const xj = pts[j].x
    const zj = pts[j].z
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) inside = !inside
  }
  return inside
}

function closestOnSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  const t = len2 < 1e-8 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2))
  return { x: ax + dx * t, z: az + dz * t, t }
}

/** Push a disk off the OSM footprint. Courtyard is interior — stay out of the outer ring. */
export function keepOffFootprint(x: number, z: number, radius = BODY_RADIUS, ring = site.building.footprint) {
  const n = ring.length
  let bestD = Infinity
  let bestNx = 0
  let bestNz = 0
  let bestPx = x
  let bestPz = z

  for (let i = 0; i < n; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % n]
    const hit = closestOnSeg(x, z, a.x, a.z, b.x, b.z)
    const dx = x - hit.x
    const dz = z - hit.z
    const d = Math.hypot(dx, dz)
    if (d < bestD) {
      bestD = d
      bestPx = hit.x
      bestPz = hit.z
      if (d > 1e-6) {
        bestNx = dx / d
        bestNz = dz / d
      } else {
        const ex = b.x - a.x
        const ez = b.z - a.z
        const len = Math.hypot(ex, ez) || 1
        bestNx = -ez / len
        bestNz = ex / len
      }
    }
  }

  const inside = pointInPoly(x, z, ring)
  if (inside) {
    let nx = bestNx
    let nz = bestNz
    if (pointInPoly(bestPx + nx * 0.4, bestPz + nz * 0.4, ring)) {
      nx = -nx
      nz = -nz
    }
    return { x: bestPx + nx * radius, z: bestPz + nz * radius, hit: true }
  }
  if (bestD < radius) {
    const push = radius - bestD
    return { x: x + bestNx * push, z: z + bestNz * push, hit: true }
  }
  return { x, z, hit: false }
}
