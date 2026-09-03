import { site } from '../data/site'
import { shortestAngle } from '../drive/robot-chase.js'

/** Yaw 0 is north. Compass degrees increase clockwise. */
export function headingDeg(yaw: number) {
  return (((-yaw * 180) / Math.PI) % 360 + 360) % 360
}

/** World yaw that faces (tx, tz) from (x, z), same convention as the robot. */
export function bearingTo(x: number, z: number, tx: number, tz: number) {
  return Math.atan2(-(tx - x), -(tz - z))
}

export function buildingBearing(x: number, z: number) {
  const c = site.building.centroid
  return bearingTo(x, z, c.x, c.z)
}

/** Signed offset of a world point from the robot's nose, radians, −left / +right. */
export function offsetTo(x: number, z: number, yaw: number, tx: number, tz: number) {
  return shortestAngle(bearingTo(x, z, tx, tz) - yaw)
}

/** Signed offset of Doheny from the robot's nose, radians, −left / +right. */
export function dohenyOffset(x: number, z: number, yaw: number) {
  return offsetTo(x, z, yaw, site.building.centroid.x, site.building.centroid.z)
}

export function cardinal(yaw: number) {
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const i = Math.round(headingDeg(yaw) / 45) % 8
  return labels[i]
}
