import { SURVIVORS } from '../game/world'
import { heatAt, zoneAt } from './field'
import type { SimState, VictimSim } from './types'

/** ~90s to loss standing in 0.6 heat. Plan table 0.55 was unplayable (~3s). */
const EXPOSE_NEAR = 1 / (90 * 0.6)
const EXPOSE_FAR = EXPOSE_NEAR * (0.22 / 0.55)
const CRAWL = 0.35
const CRAWL_STOP_X = 98

export function freshVictims(people = SURVIVORS): VictimSim[] {
  return people.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    note: s.note,
    x: s.x,
    z: s.z,
    status: 'unseen',
    exposure: 0,
    mobility: 1,
    lastKnown: null,
    visibleOptical: false,
    visibleThermal: false,
    detectUntil: -1,
  }))
}

export function stepVictims(sim: SimState, dt: number) {
  for (const v of sim.victims) {
    if (v.status === 'marked') continue
    const near = v.id === 'v1' || v.id === 'v2'
    const heat = heatAt(sim.field, v.x, v.z)
    v.exposure = Math.min(1, v.exposure + heat * dt * (near ? EXPOSE_NEAR : EXPOSE_FAR))
    v.mobility = v.exposure > 0.4 ? 0.35 : 1

    if (v.id === 'v1' && v.status !== 'lost' && v.exposure > 0.35 && v.x > CRAWL_STOP_X) {
      v.x = Math.max(CRAWL_STOP_X, v.x - CRAWL * dt)
    }

    if (v.exposure >= 1) {
      v.status = 'lost'
      v.visibleOptical = false
      v.visibleThermal = false
      v.lastKnown = {
        x: v.x,
        z: v.z,
        t: sim.elapsed,
        zone: zoneAt(heat),
      }
    }
  }
}

export function tryMarkVictim(sim: SimState, id: string, range: number, robotX: number, robotZ: number) {
  const v = sim.victims.find((p) => p.id === id)
  if (!v || v.status === 'lost' || v.status === 'marked') return false
  if (Math.hypot(robotX - v.x, robotZ - v.z) > range) return false
  v.status = 'marked'
  v.lastKnown = {
    x: v.x,
    z: v.z,
    t: sim.elapsed,
    zone: zoneAt(heatAt(sim.field, v.x, v.z)),
  }
  return true
}

export function lostVictim(sim: SimState) {
  return sim.victims.find((v) => v.status === 'lost') ?? null
}
