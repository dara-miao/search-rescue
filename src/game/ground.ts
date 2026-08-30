import raw from '../data/ground.json'
import { BUILDINGS } from './world'

const DEPLOY = { x: 108.6, z: 50.2, yaw: 1.28 }

export type Cover = 'lawn' | 'walkway' | 'street' | 'steps' | 'plaza' | 'dirt'

export type Vec2 = [number, number]

export type GroundPoly = {
  polygon: Vec2[]
  cover: Cover
}

export type ElevationGrid = {
  originX: number
  originZ: number
  stepX: number
  stepZ: number
  width: number
  height: number
  heights: number[][]
}

export type GroundData = {
  lawns: GroundPoly[]
  walks: GroundPoly[]
  streets: GroundPoly[]
  steps: GroundPoly[]
  plazas: GroundPoly[]
  paths: Vec2[][]
  elevation?: ElevationGrid
}

export function pointInPoly(x: number, z: number, poly: Vec2[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0]
    const zi = poly[i][1]
    const xj = poly[j][0]
    const zj = poly[j][1]
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi
    if (hit) inside = !inside
  }
  return inside
}

export function orientedRect(center: Vec2, yaw: number, along: number, side: number): Vec2[] {
  const fx = Math.sin(yaw)
  const fz = -Math.cos(yaw)
  const px = -fz
  const pz = fx
  const hx = along / 2
  const hz = side / 2
  return [
    [center[0] + fx * hx + px * hz, center[1] + fz * hx + pz * hz],
    [center[0] + fx * hx - px * hz, center[1] + fz * hx - pz * hz],
    [center[0] - fx * hx - px * hz, center[1] - fz * hx - pz * hz],
    [center[0] - fx * hx + px * hz, center[1] - fz * hx + pz * hz],
    [center[0] + fx * hx + px * hz, center[1] + fz * hx + pz * hz],
  ]
}

export function corridorPolygon(path: Vec2[], half: number): Vec2[] {
  if (path.length < 2) return []
  const left: Vec2[] = []
  const right: Vec2[] = []
  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dz = next[1] - prev[1]
    const len = Math.hypot(dx, dz) || 1
    const px = (-dz / len) * half
    const pz = (dx / len) * half
    left.push([path[i][0] + px, path[i][1] + pz])
    right.push([path[i][0] - px, path[i][1] - pz])
  }
  return [...left, ...right.reverse(), left[0]]
}

function inflate(poly: Vec2[], pad: number): Vec2[] {
  if (poly.length < 3) return poly
  const closed =
    Math.abs(poly[0][0] - poly[poly.length - 1][0]) < 0.05 &&
    Math.abs(poly[0][1] - poly[poly.length - 1][1]) < 0.05
  const n = closed ? poly.length - 1 : poly.length
  let cx = 0
  let cz = 0
  for (let i = 0; i < n; i++) {
    cx += poly[i][0]
    cz += poly[i][1]
  }
  cx /= n
  cz /= n
  const out: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const dx = poly[i][0] - cx
    const dz = poly[i][1] - cz
    const len = Math.hypot(dx, dz) || 1
    out.push([poly[i][0] + (dx / len) * pad, poly[i][1] + (dz / len) * pad])
  }
  out.push(out[0])
  return out
}

function clone(data: GroundData): GroundData {
  return {
    lawns: data.lawns.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    walks: data.walks.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    streets: data.streets.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    steps: data.steps.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    plazas: data.plazas.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    paths: data.paths.map((p) => p.map((q) => [...q] as Vec2)),
    elevation: data.elevation,
  }
}

function addPath(next: GroundData, path: Vec2[], half: number) {
  if (path.length < 2) return
  next.paths.push(path)
  next.walks.push({ polygon: corridorPolygon(path, half), cover: 'walkway' })
}

/** Fill OSM-thin holes and drape campus aprons from building rings. */
export function repairGround(data: GroundData): GroundData {
  const next = clone(data)
  const sweep: Vec2[] = [
    [DEPLOY.x, DEPLOY.z],
    [90, 42],
    [50, 22],
    [18, 10],
    [0, 4],
    [-24, -8],
    [-48, -18],
  ]
  next.paths.unshift(sweep)
  next.walks.push({ polygon: corridorPolygon(sweep, 4.4), cover: 'walkway' })
  addPath(next, [
    [0, 2],
    [12, 8],
    [28, 16],
    [48, 24],
    [72, 34],
    [96, 44],
  ], 3.2)
  addPath(next, [
    [0, 2],
    [-8, -18],
    [-10, -40],
    [-8, -56],
  ], 3.4)
  addPath(next, [
    [-48, -18],
    [-32, -8],
    [-12, 0],
    [8, 6],
  ], 3.1)
  addPath(next, [
    [114, 52],
    [100, 38],
    [86, 22],
    [70, 8],
  ], 2.8)
  addPath(next, [
    [-80, 8],
    [-40, 6],
    [0, 4],
    [40, 12],
    [80, 28],
  ], 3.6)

  next.steps.push({
    polygon: orientedRect([DEPLOY.x, DEPLOY.z], DEPLOY.yaw, 12, 7.6),
    cover: 'steps',
  })
  next.plazas.push({
    polygon: orientedRect([114.2, 49.8], DEPLOY.yaw, 9, 9),
    cover: 'plaza',
  })
  next.plazas.push({
    polygon: orientedRect([0, 2], 0.15, 22, 18),
    cover: 'plaza',
  })
  next.plazas.push({
    polygon: orientedRect([-9, -48], 0.4, 24, 20),
    cover: 'plaza',
  })

  for (const building of BUILDINGS) {
    if (building.outer.length < 4) continue
    next.plazas.push({ polygon: inflate(building.outer, 3.6), cover: 'plaza' })
  }

  next.lawns.push({
    polygon: orientedRect([-42, -16], 0.55, 32, 24),
    cover: 'lawn',
  })
  next.lawns.push({
    polygon: orientedRect([18, 18], 0.35, 92, 62),
    cover: 'lawn',
  })
  next.lawns.push({
    polygon: orientedRect([-18, -42], 0.5, 76, 46),
    cover: 'lawn',
  })
  next.lawns.push({
    polygon: orientedRect([48, -8], 0.2, 54, 36),
    cover: 'lawn',
  })
  next.streets.push({
    polygon: orientedRect([40, 72], 1.18, 170, 11),
    cover: 'street',
  })
  next.streets.push({
    polygon: orientedRect([-90, 20], 0.15, 80, 10),
    cover: 'street',
  })
  next.streets.push({
    polygon: orientedRect([20, -90], 1.05, 140, 9),
    cover: 'street',
  })
  return next
}

export const GROUND = repairGround(raw as GroundData)

const ELEV = GROUND.elevation

export const ELEV_MEAN = (() => {
  if (!ELEV) return 62
  let sum = 0
  let n = 0
  for (const row of ELEV.heights) {
    for (const h of row) {
      sum += h
      n += 1
    }
  }
  return n ? sum / n : 62
})()

export function sampleElevation(x: number, z: number) {
  if (!ELEV || !ELEV.heights.length) return ELEV_MEAN
  const fx = (x - ELEV.originX) / ELEV.stepX
  const fz = (z - ELEV.originZ) / ELEV.stepZ
  const x0 = Math.max(0, Math.min(ELEV.width - 2, Math.floor(fx)))
  const z0 = Math.max(0, Math.min(ELEV.height - 2, Math.floor(fz)))
  const tx = Math.min(1, Math.max(0, fx - x0))
  const tz = Math.min(1, Math.max(0, fz - z0))
  const h00 = ELEV.heights[z0][x0]
  const h10 = ELEV.heights[z0][x0 + 1]
  const h01 = ELEV.heights[z0 + 1][x0]
  const h11 = ELEV.heights[z0 + 1][x0 + 1]
  return h00 * (1 - tx) * (1 - tz) + h10 * tx * (1 - tz) + h01 * (1 - tx) * tz + h11 * tx * tz
}

function softBump(d: number, radius: number, height: number) {
  if (d >= radius || radius <= 0) return 0
  const t = 1 - d / radius
  return height * t * t * (3 - 2 * t)
}

export function coverAt(x: number, z: number): Cover {
  for (const p of GROUND.steps) if (pointInPoly(x, z, p.polygon)) return 'steps'
  for (const p of GROUND.plazas) if (pointInPoly(x, z, p.polygon)) return 'plaza'
  for (const p of GROUND.walks) if (pointInPoly(x, z, p.polygon)) return 'walkway'
  for (const p of GROUND.streets) if (pointInPoly(x, z, p.polygon)) return 'street'
  for (const p of GROUND.lawns) if (pointInPoly(x, z, p.polygon)) return 'lawn'
  return 'lawn'
}

/** DEM-first height, light pads so steps and aprons read. */
export function heightAt(x: number, z: number) {
  const cover = coverAt(x, z)
  const dem = sampleElevation(x, z)
  let y = (dem - ELEV_MEAN) * 1.16
  y += softBump(Math.hypot(x - DEPLOY.x, z - DEPLOY.z), 8, 0.32)
  y += softBump(Math.hypot(x, z), 16, 0.18)
  if (cover === 'steps') y += 0.26
  if (cover === 'plaza') y += 0.1
  if (cover === 'walkway') y += 0.05
  if (cover === 'street') y -= 0.04
  return y
}

export const COVER_COLOR: Record<Cover, [number, number, number]> = {
  lawn: [0.36, 0.58, 0.3],
  walkway: [0.78, 0.7, 0.54],
  street: [0.42, 0.4, 0.38],
  steps: [0.84, 0.76, 0.6],
  plaza: [0.82, 0.74, 0.58],
  dirt: [0.56, 0.46, 0.34],
}

export function sitY(x: number, z: number, lift = 0) {
  return heightAt(x, z) + lift
}

export const THERMAL_COLOR: Record<Cover, [number, number, number]> = {
  lawn: [0.04, 0.16, 0.2],
  walkway: [0.12, 0.28, 0.34],
  street: [0.05, 0.1, 0.14],
  steps: [0.2, 0.36, 0.4],
  plaza: [0.16, 0.32, 0.38],
  dirt: [0.06, 0.12, 0.16],
}
