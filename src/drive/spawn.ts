import { site } from '../data/site'
import { MASSING_CONFIG } from '../scene/doheny-massing.js'
import { apparatusBlockers } from '../scene/staging-apparatus.js'
import { pointInPoly } from './hull'
import { ROBOT_CONFIG, buildBlockers, resolveCollision } from './robot-controller.js'

const STAGING_M = 34

export function stagingPose() {
  const ob = site.building.orientedBounds
  const θ = ob.angleRad
  const south = { x: -Math.sin(θ), z: Math.cos(θ) }
  let x = ob.centre.x + south.x * (ob.depth / 2 + STAGING_M)
  let z = ob.centre.z + south.z * (ob.depth / 2 + STAGING_M)

  const held = resolveCollision({ x, z }, ROBOT_CONFIG.radius + 2.4, buildBlockers(site, MASSING_CONFIG))
  x = held.x + south.x * 6
  z = held.z + south.z * 6

  const yaw = Math.atan2(south.x, south.z)
  return { x, z, y: 0, yaw, speed: 0, moving: false }
}

export function spawnIsValid() {
  const p = stagingPose()
  const blockers = [
    ...buildBlockers(site, MASSING_CONFIG),
    ...apparatusBlockers(p, site.building.orientedBounds.angleRad),
  ]
  const hit = resolveCollision({ x: p.x, z: p.z }, ROBOT_CONFIG.radius, blockers)
  return !pointInPoly(p.x, p.z, site.building.footprint) && !hit.hit
}
