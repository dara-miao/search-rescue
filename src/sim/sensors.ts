import { heatAt, smokeAt, zoneAt } from './field'
import type { Pose, SimState, VictimSim } from './types'

const OPTICAL_HALF = (42 * Math.PI) / 180
const THERMAL_HALF = (55 * Math.PI) / 180
const OPTICAL_RANGE = 28
const THERMAL_RANGE = 18
const SMOKE_BLOCK = 0.45
const LOCK = 0.8

export function headingDelta(yaw: number, fromX: number, fromZ: number, toX: number, toZ: number) {
  const want = Math.atan2(toX - fromX, -(toZ - fromZ))
  let delta = want - yaw
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

export function inCone(
  fromX: number,
  fromZ: number,
  yaw: number,
  toX: number,
  toZ: number,
  halfAngle: number,
  range: number,
) {
  const dist = Math.hypot(toX - fromX, toZ - fromZ)
  if (dist > range || dist < 0.2) return false
  return Math.abs(headingDelta(yaw, fromX, fromZ, toX, toZ)) <= halfAngle
}

export function opticalRangeFor(heat: number) {
  const zone = zoneAt(heat)
  if (zone === 'hot' || zone === 'nogo') return OPTICAL_RANGE * 0.55
  if (zone === 'warm') return OPTICAL_RANGE * 0.8
  return OPTICAL_RANGE
}

/** Three samples along the segment. Blocked if any smoke > limit. */
export function opticalClear(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  smokeSample: (x: number, z: number) => number,
  limit = SMOKE_BLOCK,
) {
  for (const t of [0.25, 0.5, 0.75]) {
    if (smokeSample(fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t) > limit) return false
  }
  return true
}

export function seeOptical(sim: SimState, pose: Pose, v: VictimSim) {
  const heat = heatAt(sim.field, pose.x, pose.z)
  if (!inCone(pose.x, pose.z, pose.yaw, v.x, v.z, OPTICAL_HALF, opticalRangeFor(heat))) return false
  return opticalClear(pose.x, pose.z, v.x, v.z, (x, z) => smokeAt(sim.field, x, z))
}

export function seeThermal(_sim: SimState, pose: Pose, v: VictimSim, thermalOn: boolean) {
  if (!thermalOn || v.exposure >= 1) return false
  return inCone(pose.x, pose.z, pose.yaw, v.x, v.z, THERMAL_HALF, THERMAL_RANGE)
}

export function detectVictims(sim: SimState, pose: Pose, thermalOn: boolean) {
  for (const v of sim.victims) {
    if (v.status === 'marked' || v.status === 'lost') {
      v.visibleOptical = false
      v.visibleThermal = false
      continue
    }
    const optical = seeOptical(sim, pose, v)
    const thermal = seeThermal(sim, pose, v, thermalOn)
    v.visibleOptical = optical
    v.visibleThermal = thermal
    if (optical || thermal) {
      if (v.status === 'unseen') v.status = 'detected'
      v.detectUntil = sim.elapsed + LOCK
      v.lastKnown = {
        x: v.x,
        z: v.z,
        t: sim.elapsed,
        zone: zoneAt(heatAt(sim.field, v.x, v.z)),
      }
    }
  }
}

export function recentlyDetected(v: VictimSim, elapsed: number) {
  return elapsed <= v.detectUntil
}
