import { RUN } from './auto'
import { CAMPUS } from './world'
import type { VictimSim } from '../sim/types'

const ARRIVE = 3.2
const STANDOFF = 5.2
const ORDER = ['v1', 'v2', 'v3', 'v4'] as const

export function nextUnmarked(people: Array<Pick<VictimSim, 'id' | 'status'>>) {
  return ORDER.find((id) => {
    const p = people.find((s) => s.id === id)
    return p && p.status !== 'marked' && p.status !== 'lost'
  })
}

function passed(x: number, z: number, wx: number, wz: number, nx: number, nz: number) {
  const vx = nx - wx
  const vz = nz - wz
  const len2 = vx * vx + vz * vz
  if (len2 < 1e-4) return false
  const t = ((x - wx) * vx + (z - wz) * vz) / len2
  return t > 0.08
}

function remainingPoints(
  x: number,
  z: number,
  people: Array<Pick<VictimSim, 'id' | 'status' | 'x' | 'z'>>,
): Array<[number, number]> {
  const nextId = nextUnmarked(people)
  if (!nextId) return []

  const markAt = RUN.findIndex((b) => b.kind === 'mark' && b.id === nextId)
  const last = markAt < 0 ? RUN.length : markAt
  let start = 0
  for (let i = 0; i < last; i++) {
    const beat = RUN[i]
    if (beat.kind !== 'mark') continue
    const person = people.find((p) => p.id === beat.id)
    if (person && person.status === 'marked') start = i + 1
  }

  const pts: Array<[number, number]> = []
  for (let i = start; i < last; i++) {
    const beat = RUN[i]
    if (beat.kind === 'goto') pts.push([beat.x, beat.z])
  }

  const victim = people.find((p) => p.id === nextId)
  if (victim) {
    const d = Math.hypot(x - victim.x, z - victim.z)
    if (d > CAMPUS.markRange) {
      if (d < 0.2) pts.push([victim.x - STANDOFF, victim.z])
      else {
        const u = STANDOFF / d
        pts.push([victim.x + (x - victim.x) * u, victim.z + (z - victim.z) * u])
      }
    }
  }
  return pts
}

/** Next walk target on the outdoor sweep, then a standoff short of the person. */
export function nextAim(
  x: number,
  z: number,
  people: Array<Pick<VictimSim, 'id' | 'status' | 'x' | 'z'>>,
): { x: number; z: number } | null {
  const pts = remainingPoints(x, z, people)
  if (!pts.length) return null

  for (let i = 0; i < pts.length; i++) {
    const [wx, wz] = pts[i]
    const next = pts[i + 1]
    if (next && passed(x, z, wx, wz, next[0], next[1])) continue
    if (Math.hypot(x - wx, z - wz) <= ARRIVE && next) continue
    return { x: wx, z: wz }
  }

  const last = pts[pts.length - 1]
  return last ? { x: last[0], z: last[1] } : null
}
