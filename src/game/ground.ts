import raw from '../data/ground.json'

const DEPLOY = { x: 108.6, z: 50.2, yaw: 1.28 }

export type Cover = 'lawn' | 'walkway' | 'street' | 'steps' | 'plaza' | 'dirt'

export type Vec2 = [number, number]

export type GroundPoly = {
  polygon: Vec2[]
  cover: Cover
}

export type GroundData = {
  lawns: GroundPoly[]
  walks: GroundPoly[]
  streets: GroundPoly[]
  steps: GroundPoly[]
  plazas: GroundPoly[]
  paths: Vec2[][]
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

function clone(data: GroundData): GroundData {
  return {
    lawns: data.lawns.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    walks: data.walks.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    streets: data.streets.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    steps: data.steps.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    plazas: data.plazas.map((p) => ({ ...p, polygon: p.polygon.map((q) => [...q] as Vec2) })),
    paths: data.paths.map((p) => p.map((q) => [...q] as Vec2)),
  }
}

/** Fill the first-slice holes OSM leaves thin: west steps, Doheny apron, sweep to Bovard. */
export function repairGround(data: GroundData): GroundData {
  const next = clone(data)
  const sweep: Vec2[] = [
    [DEPLOY.x, DEPLOY.z],
    [90, 42],
    [50, 22],
    [0, 4],
    [-24, -8],
    [-48, -18],
  ]
  next.paths.unshift(sweep)
  next.walks.push({ polygon: corridorPolygon(sweep, 4.2), cover: 'walkway' })
  next.steps.push({
    polygon: orientedRect([DEPLOY.x, DEPLOY.z], DEPLOY.yaw, 11, 7.2),
    cover: 'steps',
  })
  next.plazas.push({
    polygon: orientedRect([114.2, 49.8], DEPLOY.yaw, 8, 8.5),
    cover: 'plaza',
  })
  next.plazas.push({
    polygon: orientedRect([0, 2], 0.2, 18, 16),
    cover: 'plaza',
  })
  next.lawns.push({
    polygon: orientedRect([-42, -16], 0.55, 28, 22),
    cover: 'lawn',
  })
  next.lawns.push({
    polygon: orientedRect([18, 18], 0.35, 86, 58),
    cover: 'lawn',
  })
  next.lawns.push({
    polygon: orientedRect([-18, -42], 0.5, 72, 42),
    cover: 'lawn',
  })
  next.streets.push({
    polygon: orientedRect([40, 70], 1.2, 160, 10),
    cover: 'street',
  })
  return next
}

export const GROUND = repairGround(raw as GroundData)

export function coverAt(x: number, z: number): Cover {
  for (const p of GROUND.steps) if (pointInPoly(x, z, p.polygon)) return 'steps'
  for (const p of GROUND.plazas) if (pointInPoly(x, z, p.polygon)) return 'plaza'
  for (const p of GROUND.walks) if (pointInPoly(x, z, p.polygon)) return 'walkway'
  for (const p of GROUND.streets) if (pointInPoly(x, z, p.polygon)) return 'street'
  for (const p of GROUND.lawns) if (pointInPoly(x, z, p.polygon)) return 'lawn'
  return 'lawn'
}

export function heightAt(x: number, z: number) {
  const cover = coverAt(x, z)
  if (cover === 'steps') return 0.28
  if (cover === 'plaza') return 0.1
  if (cover === 'walkway') return 0.04
  return 0
}

export const COVER_COLOR: Record<Cover, [number, number, number]> = {
  lawn: [0.42, 0.58, 0.28],
  walkway: [0.72, 0.64, 0.5],
  street: [0.38, 0.36, 0.34],
  steps: [0.78, 0.7, 0.56],
  plaza: [0.8, 0.7, 0.54],
  dirt: [0.48, 0.4, 0.28],
}

export const THERMAL_COLOR: Record<Cover, [number, number, number]> = {
  lawn: [0.04, 0.16, 0.2],
  walkway: [0.12, 0.28, 0.34],
  street: [0.05, 0.1, 0.14],
  steps: [0.2, 0.36, 0.4],
  plaza: [0.16, 0.32, 0.38],
  dirt: [0.06, 0.12, 0.16],
}
