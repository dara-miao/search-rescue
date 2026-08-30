export type EvacPt = [number, number]

/** West walk deploy → Tommy → Bovard lawn. Matches store DEPLOY xz. */
export const EVAC_PATH: EvacPt[] = [
  [82, 36],
  [90, 42],
  [50, 22],
  [18, 10],
  [0, 4],
  [-24, -8],
  [-48, -18],
]

const HALF = 8

function distToSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const ex = bx - ax
  const ez = bz - az
  const len2 = ex * ex + ez * ez || 1
  const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / len2))
  return Math.hypot(x - (ax + ex * t), z - (az + ez * t))
}

export function onEvac(x: number, z: number, half = HALF) {
  for (let i = 0; i < EVAC_PATH.length - 1; i++) {
    const a = EVAC_PATH[i]
    const b = EVAC_PATH[i + 1]
    if (distToSeg(x, z, a[0], a[1], b[0], b[1]) <= half) return true
  }
  return false
}
