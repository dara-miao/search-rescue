/** Below this the robot limps. Empty still crawls so heat cannot strand you. */
export const LIMP_BATT = 20
export const CRAWL_SCALE = 0.16
export const LIMP_SCALE = 0.42

export function batterySpeedScale(battery: number) {
  if (battery >= LIMP_BATT) return 1
  if (battery <= 0) return CRAWL_SCALE
  const t = battery / LIMP_BATT
  return CRAWL_SCALE + (LIMP_SCALE - CRAWL_SCALE) * t
}

export function batteryBand(battery: number): 'ok' | 'limp' | 'empty' {
  if (battery <= 0.05) return 'empty'
  if (battery < LIMP_BATT) return 'limp'
  return 'ok'
}
