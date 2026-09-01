import { createAuto, headingTo, stepAuto, wrapAngle, RUN } from '../src/game/auto'
import { heightAt } from '../src/game/ground'
import { stepBody, type Body } from '../src/game/motion'
import { createSim, markNearest, SIM_DT, stepSim } from '../src/sim/step'

const DEPLOY = { x: 94, z: 52, yaw: 1.37 }

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

assert(RUN.filter((b) => b.kind === 'mark').length === 4, 'run marks four people')
assert(Math.abs(wrapAngle(Math.PI * 3)) <= Math.PI + 1e-6, 'wrap stays in [-pi, pi]')
assert(Math.abs(headingTo(0, 0, 0, -10)) < 0.01, 'heading north is 0')

const sim = createSim()
const auto = createAuto(DEPLOY.x, DEPLOY.z)
let body: Body = {
  x: DEPLOY.x,
  y: heightAt(DEPLOY.x, DEPLOY.z) + 0.52,
  z: DEPLOY.z,
  vx: 0,
  vy: 0,
  vz: 0,
}
let yaw = DEPLOY.yaw
let marks = 0
const LIMIT = 180

for (let t = 0; t < LIMIT; t += SIM_DT) {
  const cmd = stepAuto(auto, { x: body.x, z: body.z, yaw }, sim, SIM_DT)
  yaw = cmd.yaw
  body = stepBody(body, cmd.wishX, cmd.wishZ, false, SIM_DT)
  if (cmd.mark) {
    const id = markNearest(sim, { x: body.x, z: body.z, yaw })
    if (id) marks += 1
  }
  stepSim(sim, { x: body.x, z: body.z, yaw }, cmd.thermal, SIM_DT)
  if (sim.complete || sim.fail) break
}

assert(!sim.fail, `auto run did not fail${sim.fail ? ` (${sim.fail} ${sim.failNote})` : ''}`)
assert(sim.complete, 'auto run marks all four')
assert(marks === 4, `auto issued four marks (got ${marks})`)
assert(sim.elapsed < 150, `finished in under 150s (got ${sim.elapsed.toFixed(1)})`)
assert(auto.done || sim.complete, 'planner reached the end')

if (process.exitCode) {
  console.error('auto tests failed')
  process.exit(1)
}
console.log('auto tests passed')
