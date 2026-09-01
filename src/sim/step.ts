import { DEFAULT_SCENARIO, type Scenario } from '../game/scenarios'
import { CAMPUS } from '../game/world'
import { createField, heatAt, seedField, spreadField, TOMMY } from './field'
import { detectVictims } from './sensors'
import { stepRobot } from './robot'
import { freshVictims, lostVictim, stepVictims, tryMarkVictim } from './victims'
import type { Pose, SimState } from './types'

export const SIM_DT = 1 / 20

export function createSim(scenario: Scenario = DEFAULT_SCENARIO): SimState {
  const field = createField()
  seedField(field, scenario.seed)
  return {
    elapsed: 0,
    field,
    victims: freshVictims(scenario.victims),
    robot: { hull: 0, noGoTime: 0, zone: 'safe', onEvac: true },
    fail: null,
    failNote: '',
    complete: false,
    failTommy: scenario.failTommy,
  }
}

export function createIdleSim(): SimState {
  const field = createField()
  seedField(field, 'none')
  return {
    elapsed: 0,
    field,
    victims: [],
    robot: { hull: 0, noGoTime: 0, zone: 'safe', onEvac: true },
    fail: null,
    failNote: '',
    complete: false,
    failTommy: false,
  }
}

function fail(sim: SimState, code: NonNullable<SimState['fail']>, note: string) {
  sim.fail = code
  sim.failNote = note
}

export function stepSim(sim: SimState, pose: Pose, thermalOn: boolean, dt: number) {
  if (sim.fail || sim.complete) return

  spreadField(sim.field, dt)
  sim.elapsed += dt
  stepVictims(sim, dt)
  detectVictims(sim, pose, thermalOn)
  stepRobot(sim, pose, dt)

  const lost = lostVictim(sim)
  if (lost) {
    fail(sim, 'LOST', `${lost.name} lost at ${lost.note.toLowerCase()}`)
    return
  }
  if (sim.failTommy && heatAt(sim.field, TOMMY.x, TOMMY.z) >= 0.45) {
    fail(sim, 'FRONT', 'Fire reached Tommy')
    return
  }
  if (sim.robot.noGoTime >= 8 && sim.robot.hull >= 1) {
    fail(sim, 'HULL', 'Mast overheated in NO GO')
    return
  }
  if (sim.elapsed >= CAMPUS.timeLimit) {
    fail(sim, 'TIME', 'Time ran out')
    return
  }
  if (sim.victims.every((v) => v.status === 'marked')) {
    sim.complete = true
  }
}

export function markNearest(sim: SimState, pose: Pose) {
  let best: { id: string; dist: number } | null = null
  for (const v of sim.victims) {
    if (v.status === 'marked' || v.status === 'lost') continue
    const dist = Math.hypot(pose.x - v.x, pose.z - v.z)
    if (dist > CAMPUS.markRange) continue
    if (!best || dist < best.dist) best = { id: v.id, dist }
  }
  if (!best) return null
  if (!tryMarkVictim(sim, best.id, CAMPUS.markRange, pose.x, pose.z)) return null
  if (sim.victims.every((v) => v.status === 'marked')) sim.complete = true
  return best.id
}
