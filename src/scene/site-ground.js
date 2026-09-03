/**
 * Shared site ground: height field, paths, Trousdale Parkway, light poles.
 *
 * Drive, the lawn mesh, and props all sample the same function so the
 * chassis sits on what you see.
 */

export const CLIMB_M = 0.4

export function worldToLocal(x, z, siteData) {
  const ob = siteData.building.orientedBounds
  const dx = x - ob.centre.x
  const dz = z - ob.centre.z
  const c = Math.cos(ob.angleRad)
  const s = Math.sin(ob.angleRad)
  return { x: dx * c + dz * s, z: -dx * s + dz * c }
}

export function localToWorld(lx, lz, siteData) {
  const ob = siteData.building.orientedBounds
  const c = Math.cos(ob.angleRad)
  const s = Math.sin(ob.angleRad)
  return {
    x: ob.centre.x + lx * c - lz * s,
    z: ob.centre.z + lx * s + lz * c,
  }
}

/** Same layered noise the lawn mesh uses. */
export function lawnNoise(x, z) {
  return (
    Math.sin(x * 0.031) * Math.cos(z * 0.027) * 0.5 +
    Math.sin(x * 0.11 + 1.7) * Math.cos(z * 0.09 - 0.4) * 0.3 +
    Math.sin(x * 0.29 - 2.2) * Math.cos(z * 0.31) * 0.2
  )
}

export function defaultPaths(centre, D, staging) {
  const front = centre.z + D / 2
  return [
    { width: 5.0, points: [[centre.x, front + 2], [centre.x, staging.z + 26]] },
    { width: 3.2, points: [[centre.x - 46, front + 12], [centre.x + 46, front + 12]] },
    { width: 2.6, points: [[centre.x - 40, front + 40], [centre.x - 8, front + 14]] },
    { width: 2.6, points: [[centre.x + 40, front + 40], [centre.x + 8, front + 14]] },
  ]
}

/** North–south asphalt on the east side — Trousdale Parkway. */
export function trousdaleRibbon(siteData) {
  const ob = siteData.building.orientedBounds
  const halfW = ob.width / 2
  const halfD = ob.depth / 2
  const inner = halfW + 7
  const outer = halfW + 16
  const mid = (inner + outer) / 2
  const z0 = -halfD - 55
  const z1 = halfD + 90
  const a = localToWorld(mid, z0, siteData)
  const b = localToWorld(mid, z1, siteData)
  return {
    name: 'Trousdale Parkway',
    width: outer - inner,
    localX: mid,
    localZ0: z0,
    localZ1: z1,
    points: [
      [a.x, a.z],
      [b.x, b.z],
    ],
  }
}

function distToSegment(x, z, ax, az, bx, bz) {
  const dx = bx - ax
  const dz = bz - az
  const lenSq = dx * dx + dz * dz
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq)) : 0
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz))
}

export function pathHeight(x, z, paths) {
  let best = Infinity
  for (const spec of paths) {
    const pts = spec.points
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
      if (d < spec.width * 0.5 + 0.4) best = Math.min(best, d)
    }
  }
  if (best === Infinity) return 0
  const lift = 0.07
  return lift * Math.max(0, 1 - best / 3.2)
}

function trousdaleHeight(local, ribbon) {
  if (local.z < ribbon.localZ0 || local.z > ribbon.localZ1) return 0
  const d = Math.abs(local.x - ribbon.localX)
  if (d > ribbon.width * 0.5 + 0.8) return 0
  return 0.09 * Math.max(0, 1 - d / (ribbon.width * 0.5 + 0.8))
}

function northLipHeight(local, ob) {
  const halfW = ob.width / 2
  const halfD = ob.depth / 2
  const southOfWall = local.z + halfD
  if (southOfWall > -0.4 || southOfWall < -6.2) return 0
  if (Math.abs(local.x) > halfW + 5) return 0
  const along = Math.max(0, 1 - Math.abs(southOfWall + 3.1) / 2.8)
  return 0.22 * along
}

function southStepsHeight(local, ob) {
  const halfD = ob.depth / 2
  const zFromWall = local.z - halfD
  if (zFromWall < 1.4 || zFromWall > 9.2) return 0
  if (Math.abs(local.x) > 8.4) return 0
  const t = 1 - (zFromWall - 1.4) / 7.8
  const risers = Math.floor(Math.max(0, t) * 5)
  return Math.min(0.38, risers * 0.075)
}

function lightWellHeight(local, ob) {
  const halfW = ob.width / 2
  const halfD = ob.depth / 2
  const wells = [
    { x: -halfW - 3.2, z: 6 },
    { x: -halfW - 3.2, z: -6 },
    { x: -10, z: -halfD - 3.4 },
    { x: 10, z: -halfD - 3.4 },
  ]
  let dip = 0
  for (const well of wells) {
    const d = Math.hypot(local.x - well.x, local.z - well.z)
    if (d < 3.4) dip = Math.min(dip, -0.32 * (1 - d / 3.4))
  }
  return dip
}

export function heightAt(x, z, siteData, opts = {}) {
  const staging = opts.staging || { x: 0, z: 40 }
  const paths = opts.paths || defaultPaths(siteData.building.orientedBounds.centre, siteData.building.orientedBounds.depth, staging)
  const local = worldToLocal(x, z, siteData)
  const ribbon = trousdaleRibbon(siteData)
  let y = lawnNoise(x, z) * 0.18
  y += pathHeight(x, z, paths)
  y += trousdaleHeight(local, ribbon)
  y += northLipHeight(local, siteData.building.orientedBounds)
  y += southStepsHeight(local, siteData.building.orientedBounds)
  y += lightWellHeight(local, siteData.building.orientedBounds)
  return y
}

export function normalAt(x, z, siteData, opts = {}) {
  const e = 0.5
  const hL = heightAt(x - e, z, siteData, opts)
  const hR = heightAt(x + e, z, siteData, opts)
  const hN = heightAt(x, z - e, siteData, opts)
  const hS = heightAt(x, z + e, siteData, opts)
  const nx = (hL - hR) / (2 * e)
  const nz = (hN - hS) / (2 * e)
  const len = Math.hypot(nx, 1, nz) || 1
  return { x: nx / len, y: 1 / len, z: nz / len }
}

/** Pitch (about local X) and roll (about local Z) for a yaw-facing chassis. */
export function chassisAttitude(x, z, yaw, siteData, opts = {}) {
  const e = 0.55
  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  const rx = Math.cos(yaw)
  const rz = -Math.sin(yaw)
  const slopeFwd =
    (heightAt(x + fx * e, z + fz * e, siteData, opts) - heightAt(x - fx * e, z - fz * e, siteData, opts)) / (2 * e)
  const slopeRight =
    (heightAt(x + rx * e, z + rz * e, siteData, opts) - heightAt(x - rx * e, z - rz * e, siteData, opts)) / (2 * e)
  return {
    pitch: -Math.atan(slopeFwd),
    roll: Math.atan(slopeRight),
  }
}

export function followGround(curY, nextX, nextZ, siteData, opts = {}) {
  const y = heightAt(nextX, nextZ, siteData, opts)
  if (y - curY > CLIMB_M) return { blocked: true, y: curY }
  return { blocked: false, y }
}

function alongPath(points, spacing, start = spacing * 0.5) {
  const out = []
  let acc = 0
  let next = start
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i]
    const [x2, z2] = points[i + 1]
    const len = Math.hypot(x2 - x1, z2 - z1)
    if (len < 0.01) continue
    while (next <= acc + len) {
      const t = (next - acc) / len
      out.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t })
      next += spacing
    }
    acc += len
  }
  return out
}

export function lightPoleSites(siteData, staging) {
  const ob = siteData.building.orientedBounds
  const paths = defaultPaths(ob.centre, ob.depth, staging)
  const ribbon = trousdaleRibbon(siteData)
  const sites = []
  for (const path of paths) {
    for (const p of alongPath(path.points, 22, 8)) {
      if (Math.hypot(p.x - staging.x, p.z - staging.z) < 12) continue
      sites.push(p)
    }
  }
  for (const p of alongPath(ribbon.points, 26, 10)) sites.push(p)
  return sites
}
