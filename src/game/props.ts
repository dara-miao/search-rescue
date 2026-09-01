import { coverAt, GROUND } from './ground'
import { LANDMARKS, TREES } from './world'

export function extraPalms(): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (const path of GROUND.paths) {
    for (let i = 0; i < path.length; i += 3) {
      const [x, z] = path[i]
      const prev = path[Math.max(0, i - 1)]
      const next = path[Math.min(path.length - 1, i + 1)]
      const dx = next[0] - prev[0]
      const dz = next[1] - prev[1]
      const len = Math.hypot(dx, dz) || 1
      const side = i % 2 === 0 ? 1 : -1
      const ox = x + (-dz / len) * (7.2 + (i % 3)) * side
      const oz = z + (dx / len) * (7.2 + (i % 3)) * side
      if (coverAt(ox, oz) === 'lawn') pts.push([ox, oz])
    }
  }
  const seeds: Array<[number, number]> = [
    [-42, -16],
    [18, 18],
    [-18, -42],
    [48, -8],
    [70, 20],
    [-60, -8],
    [30, -28],
  ]
  for (const [cx, cz] of seeds) {
    for (let k = 0; k < 2; k++) {
      const a = k * 1.37 + cx * 0.01
      const r = 8 + (k % 3) * 5
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r
      if (coverAt(x, z) === 'lawn') pts.push([x, z])
    }
  }
  return pts
}

/** Auto sweep + deploy — keep street gear off the whole corridor, not just the pins. */
const SWEEP_LINE: Array<[number, number]> = [
  [94, 52],
  [104, 50],
  [106, 43],
  [72, 42],
  [40, 28],
  [12, 14],
  [-22, -2],
  [-38, -12],
]

function distToSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const ex = bx - ax
  const ez = bz - az
  const len2 = ex * ex + ez * ez || 1
  const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / len2))
  return Math.hypot(x - (ax + ex * t), z - (az + ez * t))
}

function clearOfSweep(x: number, z: number) {
  for (let i = 0; i < SWEEP_LINE.length - 1; i++) {
    const a = SWEEP_LINE[i]
    const b = SWEEP_LINE[i + 1]
    if (distToSeg(x, z, a[0], a[1], b[0], b[1]) < 3.8) return false
  }
  return true
}

/** Lamp poles, bollards, and planter boxes along path edges — not on the auto line. */
export function extraStreetGear(): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = []
  for (const path of GROUND.paths) {
    for (let i = 0; i < path.length; i += 2) {
      const [x, z] = path[i]
      const prev = path[Math.max(0, i - 1)]
      const next = path[Math.min(path.length - 1, i + 1)]
      const dx = next[0] - prev[0]
      const dz = next[1] - prev[1]
      const len = Math.hypot(dx, dz) || 1
      const side = i % 2 === 0 ? 1 : -1
      const ox = x + (-dz / len) * 4.2 * side
      const oz = z + (dx / len) * 4.2 * side
      const cover = coverAt(ox, oz)
      if (cover !== 'lawn' && cover !== 'plaza' && cover !== 'walkway') continue
      if (!clearOfSweep(ox, oz)) continue
      pts.push([ox, oz, i % 3 === 0 ? 0.7 : 0.58])
    }
  }
  const fixtures: Array<[number, number, number]> = [
    [88, 58, 0.7],
    [100, 58, 0.62],
    [82, 46, 0.68],
    [112, 56, 0.55],
    [96, 38, 0.7],
    [64, 48, 0.6],
    [48, 36, 0.62],
    [28, 22, 0.6],
    [8, 22, 0.58],
    [-8, 6, 0.6],
    [-30, 6, 0.62],
    [118, 46, 0.55],
    [90, 64, 0.7],
    [76, 34, 0.65],
    [54, 20, 0.6],
    [20, 6, 0.58],
    [-14, -10, 0.6],
    [108, 62, 0.55],
    [70, 54, 0.58],
  ]
  for (const [x, z, r] of fixtures) {
    if (clearOfSweep(x, z)) pts.push([x, z, r])
  }
  return pts
}

export type PropCircle = { x: number; z: number; r: number }

function uniqueCircles(list: PropCircle[]) {
  const seen = new Set<string>()
  const out: PropCircle[] = []
  for (const p of list) {
    const key = `${p.x.toFixed(1)},${p.z.toFixed(1)},${p.r.toFixed(1)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

/** Trunks, planters, poles, Tommy, and the Alumni Park fountain. */
export const PROP_CIRCLES: PropCircle[] = uniqueCircles([
  ...TREES.map(([x, z]) => ({ x, z, r: 1.85 })),
  ...extraPalms().map(([x, z]) => ({ x, z, r: 1.45 })),
  ...extraStreetGear().map(([x, z, r]) => ({ x, z, r })),
  ...LANDMARKS.map((mark) => ({
    x: mark.x,
    z: mark.z,
    r: mark.kind === 'fountain' ? 6.4 : mark.kind === 'statue' ? 2.45 : 1.4,
  })),
])

export function keepOffProps(x: number, z: number, pad = 0) {
  let nx = x
  let nz = z
  for (let pass = 0; pass < 2; pass++) {
    for (const p of PROP_CIRCLES) {
      const need = p.r + pad
      const dx = nx - p.x
      const dz = nz - p.z
      const d = Math.hypot(dx, dz)
      if (d < 1e-4) {
        nx = p.x + need
        continue
      }
      if (d < need) {
        nx = p.x + (dx / d) * need
        nz = p.z + (dz / d) * need
      }
    }
  }
  return { x: nx, z: nz }
}
