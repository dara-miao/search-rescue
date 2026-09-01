import { headingTo, wrapAngle } from '../src/game/auto'
import { heightAt } from '../src/game/ground'
import { stepBody, type Body } from '../src/game/motion'
import { nextAim } from '../src/game/playGuide'
import { CAMPUS } from '../src/game/world'
import { wishScale } from '../src/sim/robot'
import { createSim, markNearest, SIM_DT, stepSim } from '../src/sim/step'

const DEPLOY = { x: 94, z: 52, yaw: 1.37 }
const SPEED = 6.6
const ASSIST = 1.9

function fail(msg: string): never {
  throw new Error(msg)
}

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

let marks = 0
for (let t = 0; t < CAMPUS.timeLimit && !sim.complete && !sim.fail; ) {
  const aim = nextAim(body.x, body.z, sim.victims)
  if (aim) {
    const want = headingTo(body.x, body.z, aim.x, aim.z)
    const delta = wrapAngle(want - yaw)
    const max = ASSIST * SIM_DT
    if (Math.abs(delta) > 0.03) yaw += Math.max(-max, Math.min(max, delta))
  }

  const live = sim.victims.filter((v) => v.status !== 'marked' && v.status !== 'lost')
  const near = live.reduce((best, v) => Math.min(best, Math.hypot(body.x - v.x, body.z - v.z)), 999)
  const pose = { x: body.x, y: body.y, z: body.z, yaw, pitch: 0.16 }
  const before = sim.victims.filter((v) => v.status === 'marked').length
  let forward = 1
  if (near <= CAMPUS.markRange) {
    markNearest(sim, pose)
    forward = 0
  }

  const cap = wishScale(sim.robot.zone, sim.robot.noGoTime)
  const toAim = aim ? Math.hypot(body.x - aim.x, body.z - aim.z) : 99
  const creep = toAim < 10 ? 0.5 : 1
  const speed = SPEED * cap.scale * creep * forward
  body = stepBody(body, Math.sin(yaw) * speed, -Math.cos(yaw) * speed, false, SIM_DT)
  stepSim(sim, { x: body.x, y: body.y, z: body.z, yaw, pitch: 0.16 }, false, SIM_DT)
  const after = sim.victims.filter((v) => v.status === 'marked').length
  if (after > before) marks = after

  t += SIM_DT
}

if (sim.fail) fail(`hold-walk run failed: ${sim.failNote}`)
if (!sim.complete) fail(`hold-walk run stalled at ${marks}/4 after ${CAMPUS.timeLimit}s`)
if (marks !== 4) fail(`expected 4 marks, got ${marks}`)

console.log(`hold-walk clear: 4/4 in ${sim.elapsed.toFixed(1)}s`)
