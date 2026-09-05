import type { SiteData } from '../data/site'
import type { ChaseShot } from '../drive/robot-chase.js'

export const DEPLOY_CRANE_S = 3.5
export const DEPLOY_HOLD_S = 0.22

/** High south lawn, sky in the top of the frame, Doheny in the lower third. */
export function aerialShot(siteData: SiteData, t = 0): ChaseShot {
  const ob = siteData.building.orientedBounds
  const sway = Math.sin(t * 0.09) * 0.1
  const θ = ob.angleRad + sway
  const south = { x: -Math.sin(θ), z: Math.cos(θ) }
  const east = { x: Math.cos(θ), z: Math.sin(θ) }
  const back = ob.depth / 2 + 86
  const side = 16
  return {
    position: {
      x: ob.centre.x + south.x * back + east.x * side,
      y: 62 + Math.sin(t * 0.11) * 1.6,
      z: ob.centre.z + south.z * back + east.z * side,
    },
    look: { x: ob.centre.x, y: 10.2, z: ob.centre.z },
    fov: 40,
  }
}

export function craneProgress(t: number) {
  return Math.min(1, Math.max(0, (t - DEPLOY_HOLD_S) / (DEPLOY_CRANE_S - DEPLOY_HOLD_S)))
}

export function easeCrane(u: number) {
  const t = Math.min(1, Math.max(0, u))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function mixShot(a: ChaseShot, b: ChaseShot, u: number): ChaseShot {
  const k = Math.min(1, Math.max(0, u))
  return {
    position: {
      x: a.position.x + (b.position.x - a.position.x) * k,
      y: a.position.y + (b.position.y - a.position.y) * k,
      z: a.position.z + (b.position.z - a.position.z) * k,
    },
    look: {
      x: a.look.x + (b.look.x - a.look.x) * k,
      y: a.look.y + (b.look.y - a.look.y) * k,
      z: a.look.z + (b.look.z - a.look.z) * k,
    },
    fov: a.fov + (b.fov - a.fov) * k,
  }
}
