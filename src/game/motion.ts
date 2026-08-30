import { keepOut } from './collide'
import { heightAt } from './ground'
import { TREES } from './world'

export type Body = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

const WALK = 6.6
const SPRINT = 11.2
const ACCEL = 18
const BRAKE = 14
const GRAVITY = 22
const STEP = 0.52
const MAX_UP = 0.72
const TREE_R = 0.9

function resolveTrees(x: number, z: number): { x: number; z: number } {
  let nx = x
  let nz = z
  for (const [tx, tz] of TREES) {
    const dx = nx - tx
    const dz = nz - tz
    const d = Math.hypot(dx, dz)
    if (d > 0.02 && d < TREE_R) {
      nx = tx + (dx / d) * TREE_R
      nz = tz + (dz / d) * TREE_R
    }
  }
  return { x: nx, z: nz }
}

/** Sample the grade in the move direction. Rise/run; 0.7 is about 35°. */
export function gradeAhead(x: number, z: number, vx: number, vz: number) {
  const speed = Math.hypot(vx, vz)
  if (speed < 0.05) return 0
  const look = 0.9
  const nx = x + (vx / speed) * look
  const nz = z + (vz / speed) * look
  return (heightAt(nx, nz) - heightAt(x, z)) / look
}

export function stepBody(
  body: Body,
  wishX: number,
  wishZ: number,
  sprint: boolean,
  dt: number,
): Body {
  const cap = sprint ? SPRINT : WALK
  const wish = Math.hypot(wishX, wishZ)
  let { vx, vy, vz, x, y, z } = body

  if (wish > 0.04) {
    const scale = cap / wish
    const tx = wishX * scale
    const tz = wishZ * scale
    const k = 1 - Math.exp(-ACCEL * dt)
    vx += (tx - vx) * k
    vz += (tz - vz) * k
  } else {
    const k = Math.exp(-BRAKE * dt)
    vx *= k
    vz *= k
    if (Math.hypot(vx, vz) < 0.04) {
      vx = 0
      vz = 0
    }
  }

  const grade = gradeAhead(x, z, vx, vz)
  if (grade > 0.28) {
    const slow = Math.max(0.2, 1 - (grade - 0.28) * 1.6)
    vx *= slow
    vz *= slow
  }
  if (grade > MAX_UP) {
    vx = 0
    vz = 0
  }

  const travel = Math.hypot(vx, vz) * dt
  const parts = Math.max(1, Math.ceil(travel / 0.2))
  const sdt = dt / parts
  let cx = x
  let cz = z
  for (let i = 0; i < parts; i++) {
    const slid = keepOut(cx + vx * sdt, cz + vz * sdt)
    const cleared = resolveTrees(slid.x, slid.z)
    const sealed = keepOut(cleared.x, cleared.z)
    cx = sealed.x
    cz = sealed.z
  }
  const cleared = { x: cx, z: cz }
  if (dt > 1e-5) {
    vx = (cleared.x - x) / dt
    vz = (cleared.z - z) / dt
  }

  const ground = heightAt(cleared.x, cleared.z) + STEP
  if (y > ground + 0.12) {
    vy -= GRAVITY * dt
    y += vy * dt
    if (y <= ground) {
      y = ground
      vy = 0
    }
  } else {
    const drop = ground - y
    if (drop > 0.9) {
      vy -= GRAVITY * dt
      y += vy * dt
    } else {
      y += (ground - y) * Math.min(1, 18 * dt)
      vy = 0
    }
  }

  return {
    x: cleared.x,
    y,
    z: cleared.z,
    vx,
    vy,
    vz,
  }
}
