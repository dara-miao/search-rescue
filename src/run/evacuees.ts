import { site } from '../data/site'
import { stagingPose } from '../drive/spawn'
import { pointInPoly } from '../drive/hull'
import { openingSocket } from '../scene/opening-socket'
import { localToWorld, worldToLocal } from '../scene/site-ground.js'
import type { Evacuee, Extraction, RunState, Victim } from './types'

export type PathPoint = { x: number; z: number; y?: number }

const WALK_MPS = 2.8
const PAD = 7
const MIN_LEG = 2.2

export function buildingClearance() {
  const ob = site.building.orientedBounds
  return { halfW: ob.width / 2 + PAD, halfD: ob.depth / 2 + PAD }
}

function hitsBox(ax: number, az: number, bx: number, bz: number, halfW: number, halfD: number) {
  const steps = 18
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = ax + (bx - ax) * t
    const z = az + (bz - az) * t
    if (Math.abs(x) <= halfW && Math.abs(z) <= halfD) return true
  }
  return false
}

function hitsFootprint(ax: number, az: number, bx: number, bz: number) {
  const ring = site.building.footprint
  const steps = 22
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (pointInPoly(ax + (bx - ax) * t, az + (bz - az) * t, ring)) return true
  }
  return false
}

export function walkWaypoints(start: { x: number; z: number }, dest: { x: number; z: number }) {
  const A = worldToLocal(start.x, start.z, site)
  const B = worldToLocal(dest.x, dest.z, site)
  const { halfW, halfD } = buildingClearance()
  const fromBack = A.z < -2 && B.z > A.z + 8
  const clear =
    !fromBack &&
    !hitsBox(A.x, A.z, B.x, B.z, halfW, halfD) &&
    !hitsFootprint(start.x, start.z, dest.x, dest.z)
  if (clear) return [start, dest]

  const side = (Math.abs(A.x) >= 0.4 ? Math.sign(A.x) : Math.sign(B.x || 1)) || 1
  const e = side * halfW
  const south = halfD
  const north = -halfD
  const along = Math.max(north, Math.min(south, A.z))
  const raw = fromBack
    ? [start, localToWorld(e, north, site), localToWorld(e, south, site), dest]
    : [start, localToWorld(e, along, site), localToWorld(e, south, site), dest]
  const pts: PathPoint[] = []
  for (const p of raw) {
    const last = pts.at(-1)
    if (last && Math.hypot(p.x - last.x, p.z - last.z) < MIN_LEG) continue
    pts.push(p)
  }
  return pts.length >= 2 ? pts : [start, dest]
}

function dy(p: PathPoint) {
  return p.y ?? 0
}

export function pathLength(pts: PathPoint[]) {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z, dy(pts[i]) - dy(pts[i - 1]))
  }
  return len
}

/** Drop from the glass to the lawn, then walk around Doheny to staging. */
export function climbPath(glass: PathPoint, lawn: PathPoint, dest: PathPoint) {
  const around = walkWaypoints(lawn, dest)
  const drop = { x: lawn.x, z: lawn.z, y: 0 }
  const rest =
    around[0] && Math.hypot(around[0].x - lawn.x, around[0].z - lawn.z) < 0.5 ? around.slice(1) : around
  return [{ x: glass.x, y: glass.y ?? 2.4, z: glass.z }, drop, ...rest]
}

export function pathStaysOutside(pts: Array<{ x: number; z: number }>) {
  const ring = site.building.footprint
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const steps = 14
    for (let s = 1; s < steps; s++) {
      const t = s / steps
      if (pointInPoly(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, ring)) return false
    }
  }
  return true
}

/** Occupants leave the opening and walk toward staging. Scoring already flipped to RESCUED. */
export function spawnWalkout(state: RunState, victim: Victim, ext: Extraction | null) {
  if (victim.type === 'UNREACHABLE') return
  const startX = ext?.x ?? victim.x
  const startZ = ext?.z ?? victim.z
  const dest = stagingPose()
  const cell = state.cells.find((c) => c.id === victim.cellId) ?? null
  const sock = cell ? openingSocket(cell, ext?.facade) : null
  const n = Math.max(1, victim.count)
  for (let i = 0; i < n; i++) {
    const lawn = { x: startX + (i - (n - 1) / 2) * 0.55, z: startZ + (i % 2) * 0.35 }
    const end = { x: dest.x + (i - (n - 1) / 2) * 0.7, z: dest.z + 1.2 }
    const spread = (i - (n - 1) / 2) * 0.36
    const glass = sock
      ? {
          x: sock.x + -sock.nz * spread,
          y: sock.y,
          z: sock.z + sock.nx * spread,
        }
      : null
    const path = glass ? climbPath(glass, lawn, end) : walkWaypoints(lawn, end)
    const evac: Evacuee = {
      id: `${victim.id}-w${i}`,
      victimId: victim.id,
      startX: glass?.x ?? lawn.x,
      startZ: glass?.z ?? lawn.z,
      destX: end.x,
      destZ: end.z,
      path,
      born: state.t + i * 0.28,
      duration: Math.max(5.2, pathLength(path) / WALK_MPS) + i * 0.35,
      lane: i,
    }
    state.evacuees.push(evac)
  }
}

function alongPath(pts: PathPoint[], u: number) {
  const total = pathLength(pts)
  if (total < 0.01) return { x: pts[0].x, z: pts[0].z, y: dy(pts[0]), hx: 0, hz: 1 }
  let left = u * total
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const leg = Math.hypot(b.x - a.x, b.z - a.z, dy(b) - dy(a))
    if (left <= leg || i === pts.length - 1) {
      const t = leg < 1e-6 ? 1 : Math.min(1, left / leg)
      const hx = b.x - a.x
      const hz = b.z - a.z
      return { x: a.x + hx * t, z: a.z + hz * t, y: dy(a) + (dy(b) - dy(a)) * t, hx, hz }
    }
    left -= leg
  }
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2] ?? last
  return { x: last.x, z: last.z, y: dy(last), hx: last.x - prev.x, hz: last.z - prev.z }
}

export function evacueePose(evac: Evacuee, t: number) {
  const pts = evac.path.length >= 2 ? evac.path : [
    { x: evac.startX, z: evac.startZ },
    { x: evac.destX, z: evac.destZ },
  ]
  const u = Math.max(0, Math.min(1, (t - evac.born) / evac.duration))
  const glassY = pts[0]?.y ?? 0
  if (t < evac.born) {
    return { x: evac.startX, z: evac.startZ, y: glassY, done: false, visible: false, u: 0, hx: 0, hz: 1 }
  }
  const ease = u * u * (3 - 2 * u)
  const at = alongPath(pts, ease)
  return {
    x: at.x,
    z: at.z,
    y: at.y,
    done: u >= 1,
    visible: u < 1,
    u,
    hx: at.hx,
    hz: at.hz,
  }
}
