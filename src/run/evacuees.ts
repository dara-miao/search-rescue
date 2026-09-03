import { stagingPose } from '../drive/spawn'
import type { Evacuee, Extraction, RunState, Victim } from './types'

const WALK_S = 9

/** Occupants leave the opening and walk toward staging. Scoring already flipped to RESCUED. */
export function spawnWalkout(state: RunState, victim: Victim, ext: Extraction | null) {
  if (victim.type !== 'SELF_EXTRACT' && victim.type !== 'GROUP') return
  const startX = ext?.x ?? victim.x
  const startZ = ext?.z ?? victim.z
  const dest = stagingPose()
  const n = Math.max(1, victim.count)
  for (let i = 0; i < n; i++) {
    const evac: Evacuee = {
      id: `${victim.id}-w${i}`,
      victimId: victim.id,
      startX: startX + (i - (n - 1) / 2) * 0.55,
      startZ: startZ + (i % 2) * 0.35,
      destX: dest.x + (i - (n - 1) / 2) * 0.7,
      destZ: dest.z + 1.2,
      born: state.t + i * 0.35,
      duration: WALK_S + i * 0.4,
      lane: i,
    }
    state.evacuees.push(evac)
  }
}

export function evacueePose(evac: Evacuee, t: number) {
  const u = Math.max(0, Math.min(1, (t - evac.born) / evac.duration))
  if (t < evac.born) return { x: evac.startX, z: evac.startZ, y: 0, done: false, visible: false, u: 0 }
  const ease = u * u * (3 - 2 * u)
  return {
    x: evac.startX + (evac.destX - evac.startX) * ease,
    z: evac.startZ + (evac.destZ - evac.startZ) * ease,
    y: 0,
    done: u >= 1,
    visible: u < 1,
    u,
  }
}
