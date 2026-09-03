import { createAuto, stepAuto } from '../src/game/auto'
import { SCENARIOS, scenarioById } from '../src/game/scenarios'
import { heightAt } from '../src/game/ground'
import { stepBody, type Body } from '../src/game/motion'
import { createField, heatAt, seedField, TOMMY } from '../src/sim/field'
import { createSim, markNearest, SIM_DT, stepSim } from '../src/sim/step'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

assert(SCENARIOS.length === 3, 'three emergencies on the picker')
assert(new Set(SCENARIOS.map((s) => s.id)).size === 3, 'scenario ids are unique')

for (const sc of SCENARIOS) {
  const marks = sc.run.filter((b) => b.kind === 'mark')
  assert(sc.people === sc.victims.length, `${sc.id} people count matches victims`)
  assert(marks.length === sc.victims.length, `${sc.id} run marks every victim`)
  assert(
    marks.every((b) => sc.victims.some((v) => v.id === b.id)),
    `${sc.id} mark ids exist`,
  )
}

const fire = scenarioById('doheny-fire')
const quake = scenarioById('bovard-quake')
const search = scenarioById('quad-search')

const fireField = createField()
seedField(fireField, fire.seed)
assert(heatAt(fireField, 151.7, 39.925) > 0.9, 'fire seed lights Doheny')

const quakeField = createField()
seedField(quakeField, quake.seed)
assert(heatAt(quakeField, -20, -40) > 0.15, 'quake seed warms Bovard lawn')
assert(heatAt(quakeField, 151.7, 39.925) < 0.05, 'quake seed leaves Doheny cold')

const searchField = createField()
seedField(searchField, search.seed)
assert(heatAt(searchField, TOMMY.x, TOMMY.z) < 0.02, 'night search starts cold')
assert(heatAt(searchField, 151.7, 39.925) < 0.02, 'night search does not light Doheny')

function runScenario(id: string, limit = 180) {
  const sc = scenarioById(id)
  const sim = createSim(sc)
  const auto = createAuto(sc.deploy.x, sc.deploy.z, sc.run)
  let body: Body = {
    x: sc.deploy.x,
    y: heightAt(sc.deploy.x, sc.deploy.z) + 0.52,
    z: sc.deploy.z,
    vx: 0,
    vy: 0,
    vz: 0,
  }
  let yaw = sc.deploy.yaw
  let marks = 0
  for (let t = 0; t < limit; t += SIM_DT) {
    const cmd = stepAuto(auto, { x: body.x, z: body.z, yaw }, sim, SIM_DT)
    yaw = cmd.yaw
    body = stepBody(body, cmd.wishX, cmd.wishZ, false, SIM_DT)
    if (cmd.mark) {
      const marked = markNearest(sim, { x: body.x, z: body.z, yaw })
      if (marked) marks += 1
    }
    stepSim(sim, { x: body.x, z: body.z, yaw }, cmd.thermal, SIM_DT)
    if (sim.complete || sim.fail) break
  }
  return { sim, marks, people: sc.people }
}

const night = runScenario('quad-search', 90)
assert(!night.sim.fail, `night search did not fail${night.sim.fail ? ` (${night.sim.failNote})` : ''}`)
assert(night.sim.complete, 'night search marks both people')
assert(night.marks === 2, `night search issued two marks (got ${night.marks})`)

if (process.exitCode) {
  console.error('scenario tests failed')
  process.exit(1)
}
console.log('scenario tests passed')
