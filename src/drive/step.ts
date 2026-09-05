import { site } from '../data/site'
import { MASSING_CONFIG } from '../scene/doheny-massing.js'
import { chassisAttitude, followGround } from '../scene/site-ground.js'
import { apparatusBlockers } from '../scene/staging-apparatus.js'
import { CHASE_CONFIG, forwardVector, stepDrive as stepKinematics } from './robot-chase.js'
import { buildBlockers, resolveCollision } from './robot-controller.js'
import { stagingPose } from './spawn'

export { CHASE_CONFIG, forwardVector }
export const DRIVE_CONFIG = CHASE_CONFIG
export const TOP_SPEED = CHASE_CONFIG.maxSpeed
export const ACCEL = CHASE_CONFIG.accel
export const RAMP_S = TOP_SPEED / ACCEL
export const TURN_RATE = CHASE_CONFIG.steering.maxTurnRate

const BLOCKERS = [
  ...buildBlockers(site, MASSING_CONFIG),
  ...apparatusBlockers(stagingPose(), site.building.orientedBounds.angleRad),
]

/** Facade zones stay at 0.6 / 0.7. */
export const MIN_SPEED_SCALE = 0.12

export type DriveBody = {
  x: number
  z: number
  y: number
  yaw: number
  pitch: number
  roll: number
  speed: number
  yawRate: number
  moving: boolean
}

/** Screen-space stick: +x right, +y down. W / stick-up is y = −1. */
export type DriveStick = {
  x: number
  y: number
}

export function freshBody(): DriveBody {
  return { ...stagingPose(), yawRate: 0 }
}

export function siteBlockers() {
  return BLOCKERS
}

/**
 * Vehicle step from robot-chase.js, then resolve against the collision hull.
 * Does not read camera yaw — steering is incremental, so a locked chase cam
 * cannot form a feedback loop.
 */
export function stepDrive(
  body: DriveBody,
  stick: DriveStick,
  dt: number,
  speedScale = 1,
): DriveBody {
  const scale = Math.max(MIN_SPEED_SCALE, Math.min(1, speedScale))
  const cfg = {
    ...CHASE_CONFIG,
    maxSpeed: CHASE_CONFIG.maxSpeed * scale,
    maxReverseSpeed: CHASE_CONFIG.maxReverseSpeed * scale,
  }

  const travel = Math.max(Math.abs(body.speed), 1) * dt
  const steps = Math.max(1, Math.ceil(travel / (CHASE_CONFIG.radius * 0.5)))
  const stepDt = dt / steps
  const kin = { position: { x: body.x, z: body.z }, yaw: body.yaw, speed: body.speed }
  let yawRate = 0
  let hit = false
  let y = body.y

  for (let i = 0; i < steps; i++) {
    const prevX = kin.position.x
    const prevZ = kin.position.z
    const out = stepKinematics(kin, stick, stepDt, cfg)
    const resolved = resolveCollision({ x: out.nextX, z: out.nextZ }, CHASE_CONFIG.radius, BLOCKERS)
    const ground = followGround(y, resolved.x, resolved.z, site)
    if (ground.blocked) {
      kin.position.x = prevX
      kin.position.z = prevZ
      hit = true
      kin.speed *= 0.55
    } else {
      kin.position.x = resolved.x
      kin.position.z = resolved.z
      y = ground.y
      yawRate = out.yawRate
      if (resolved.hit) {
        hit = true
        kin.speed *= 0.55
      }
    }
  }

  body.x = kin.position.x
  body.z = kin.position.z
  body.yaw = kin.yaw
  body.speed = kin.speed
  body.yawRate = yawRate
  if (hit) body.speed *= 0.85
  body.y = y
  const lean = chassisAttitude(body.x, body.z, body.yaw, site)
  const k = 1 - Math.exp(-8 * Math.max(dt, 0))
  body.pitch += (lean.pitch - body.pitch) * k
  body.roll += (lean.roll - body.roll) * k
  body.moving = Math.abs(body.speed) > 0.14
  return body
}
