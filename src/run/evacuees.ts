import { site } from '../data/site'
import { stagingPose } from '../drive/spawn'
import { pointInPoly } from '../drive/hull'
import { localToWorld, worldToLocal } from '../scene/site-ground.js'
import type { Evacuee, Extraction, RunState, Victim } from './types'

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
  const pts: Array<{ x: number; z: number }> = []
  for (const p of raw) {
    const last = pts.at(-1)
    if (last && Math.hypot(p.x - last.x, p.z - last.z) < MIN_LEG) continue
    pts.push(p)
  }
  return pts.length >= 2 ? pts : [start, dest]
}

export function pathLength(pts: Array<{ x: number; z: number }>) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)
  return len
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
  const n = Math.max(1, victim.count)
  for (let i = 0; i < n; i++) {
    const start = { x: startX + (i - (n - 1) / 2) * 0.55, z: startZ + (i % 2) * 0.35 }
    const end = { x: dest.x + (i - (n - 1) / 2) * 0.7, z: dest.z + 1.2 }
    const path = walkWaypoints(start, end)
    const evac: Evacuee = {
      id: `${victim.id}-w${i}`,
      victimId: victim.id,
      startX: start.x,
      startZ: start.z,
      destX: end.x,
      destZ: end.z,
      path,
      born: state.t + i * 0.35,
      duration: Math.max(4.5, pathLength(path) / WALK_MPS) + i * 0.4,
      lane: i,
    }
    state.evacuees.push(evac)
  }
}

function alongPath(pts: Array<{ x: number; z: number }>, u: number) {
  const total = pathLength(pts)
  if (total < 0.01) return { x: pts[0].x, z: pts[0].z, hx: 0, hz: 1 }
  let left = u * total
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const leg = Math.hypot(b.x - a.x, b.z - a.z)
    if (left <= leg || i === pts.length - 1) {
      const t = leg < 1e-6 ? 1 : Math.min(1, left / leg)
      const hx = b.x - a.x
      const hz = b.z - a.z
      return { x: a.x + hx * t, z: a.z + hz * t, hx, hz }
    }
    left -= leg
  }
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2] ?? last
  return { x: last.x, z: last.z, hx: last.x - prev.x, hz: last.z - prev.z }
}

export function evacueePose(evac: Evacuee, t: number) {
  const pts = evac.path.length >= 2 ? evac.path : [
    { x: evac.startX, z: evac.startZ },
    { x: evac.destX, z: evac.destZ },
  ]
  const u = Math.max(0, Math.min(1, (t - evac.born) / evac.duration))
  if (t < evac.born) {
    return { x: evac.startX, z: evac.startZ, y: 0, done: false, visible: false, u: 0, hx: 0, hz: 1 }
  }
  const ease = u * u * (3 - 2 * u)
  const at = alongPath(pts, ease)
  return {
    x: at.x,
    z: at.z,
    y: 0,
    done: u >= 1,
    visible: u < 1,
    u,
    hx: at.hx,
    hz: at.hz,
  }
}
