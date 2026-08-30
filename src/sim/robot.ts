import { onEvac } from './evac'
import { heatAt, zoneAt } from './field'
import type { HeatZone, Pose, SimState } from './types'

export function wishScale(zone: HeatZone, noGoTime: number) {
  if (zone === 'nogo' && noGoTime >= 1.2) return { scale: 0, sprint: false }
  if (zone === 'hot' || zone === 'nogo') return { scale: 0.55, sprint: false }
  return { scale: 1, sprint: true }
}

export function stepRobot(sim: SimState, pose: Pose, dt: number) {
  const heat = heatAt(sim.field, pose.x, pose.z)
  const zone = zoneAt(heat)
  const hull =
    zone === 'safe'
      ? Math.max(0, sim.robot.hull - 0.08 * dt)
      : Math.min(1, sim.robot.hull + Math.max(0, heat - 0.35) * dt * 0.4)
  const noGoTime = zone === 'nogo' ? sim.robot.noGoTime + dt : 0
  sim.robot = {
    hull,
    noGoTime,
    zone,
    onEvac: onEvac(pose.x, pose.z),
  }
}
