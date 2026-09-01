import { createAuto, stepAuto } from '../src/game/auto'
import { heightAt } from '../src/game/ground'
import { stepBody, type Body } from '../src/game/motion'
import { CAMPUS } from '../src/game/world'
import { wishScale } from '../src/sim/robot'
import { createSim, markNearest, SIM_DT, stepSim } from '../src/sim/step'

const DEPLOY = { x: 94, z: 52, yaw: 1.37 }

function fail(msg: string): never {
  throw new Error(msg)
}

if (wishScale('nogo', 8).scale <= 0) fail('NO GO must still crawl out')

const sim = createSim()
let yaw = DEPLOY.yaw
let body: Body = {
  x: DEPLOY.x,
  y: heightAt(DEPLOY.x, DEPLOY.z) + 0.52,
  z: DEPLOY.z,
  vx: 0,
  vy: 0,
  vz: 0,
}
const auto = createAuto(DEPLOY.x, DEPLOY.z)

let marks = 0
for (let t = 0; t < CAMPUS.timeLimit && !sim.complete && !sim.fail; ) {
  const cmd = stepAuto(auto, { x: body.x, z: body.z, yaw }, sim, SIM_DT)
  yaw = cmd.yaw
  const cap = wishScale(sim.robot.zone, sim.robot.noGoTime)
  body = stepBody(body, cmd.wishX * cap.scale, cmd.wishZ * cap.scale, false, SIM_DT)
  const pose = { x: body.x, y: body.y, z: body.z, yaw, pitch: 0.16 }
  const before = sim.victims.filter((v) => v.status === 'marked').length
  if (cmd.mark) markNearest(sim, pose)
  const near = sim.victims
    .filter((v) => v.status !== 'marked' && v.status !== 'lost')
    .reduce((best, v) => Math.min(best, Math.hypot(body.x - v.x, body.z - v.z)), 999)
  if (near <= CAMPUS.markRange) markNearest(sim, pose)
  stepSim(sim, pose, false, SIM_DT)
  const after = sim.victims.filter((v) => v.status === 'marked').length
  if (after > before) marks = after
  t += SIM_DT
}

if (sim.fail) fail(`hold-walk run failed: ${sim.failNote}`)
<if (!sim.complete) fail(`hold-walk run stalled at ${marks}/4 after ${CAMPUS.timeLimit}s`)
</if>if (marks !== 4) fail(`expected 4 marks, got ${marks}`)

console.log(`hold-walk clear: 4/4 in ${sim.elapsed.toFixed(1)}s`)
