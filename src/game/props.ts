import { coverAt, GROUND } from './ground'
import { LANDMARKS, TREES } from './world'

export function extraPalms(): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (const path of GROUND.paths) {
    for (let i = 0; i < path.length; i++) {
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
    for (let k = 0; k < 5; k++) {
      const a = k * 1.37 + cx * 0.01
      const r = 8 + (k % 3) * 5
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r
      if (coverAt(x, z) === 'lawn') pts.push([x, z])
    }
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

/** Trunks, planters, Tommy, and the Alumni Park fountain. */
export const PROP_CIRCLES: PropCircle[] = uniqueCircles([
  ...TREES.map(([x, z]) => ({ x, z, r: 1.55 })),
  ...extraPalms().map(([x, z]) => ({ x, z, r: 1.2 })),
  ...LANDMARKS.map((mark) => ({
    x: mark.x,
    z: mark.z,
    r: mark.kind === 'fountain' ? 6.4 : mark.kind === 'statue' ? 2.45 : 1.4,
  })),
])

export function keepOffProps(x: number, z: number) {
  let nx = x
  let nz = z
  for (let pass = 0; pass < 2; pass++) {
    for (const p of PROP_CIRCLES) {
      const dx = nx - p.x
      const dz = nz - p.z
      const d = Math.hypot(dx, dz)
      if (d < 1e-4) {
        nx = p.x + p.r
        continue
      }
      if (d < p.r) {
        nx = p.x + (dx / d) * p.r
        nz = p.z + (dz / d) * p.r
      }
    }
  }
  return { x: nx, z: nz }
}
