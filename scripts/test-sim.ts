import { stickAxis, stickWish } from '../src/game/steer'
import { createField, heatAt, seedField, spreadField, APRON, TOMMY } from '../src/sim/field'
import { inCone, opticalClear } from '../src/sim/sensors'
import { createSim, SIM_DT, stepSim } from '../src/sim/step'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

const field = createField()
seedField(field)
assert(heatAt(field, 151.7, 39.925) > 0.9, 'Doheny seed is hot')
assert(heatAt(field, APRON.x, APRON.z) > 0.3, 'west-door apron seeded')
assert(heatAt(field, TOMMY.x, TOMMY.z) < 0.05, 'Tommy starts cold')

for (let t = 0; t < 60; t += SIM_DT) spreadField(field, SIM_DT)
assert(heatAt(field, APRON.x, APRON.z) > 0.45, 'apron HOT after 60s')
assert(heatAt(field, TOMMY.x, TOMMY.z) < 0.15, 'Tommy still clear after 60s')

const sim = createSim()
const pose = { x: 82, z: 36, yaw: 1.32 }
for (let t = 0; t < 45; t += SIM_DT) stepSim(sim, pose, false, SIM_DT)
const v1 = sim.victims.find((v) => v.id === 'v1')
assert(!!v1 && v1.exposure > 0.05, 'V1 exposure rises at the door')

assert(!opticalClear(0, 0, 10, 0, () => 0.6), 'optical miss through smoke 0.6')
assert(opticalClear(0, 0, 10, 0, () => 0.1), 'optical clear in light smoke')
assert(inCone(0, 0, 0, 0, -10, 0.96, 18), 'thermal cone hits dead ahead')
assert(!inCone(0, 0, 0, 10, 0, 0.96, 18), 'thermal cone misses 90°')

assert(stickAxis(0.05) === 0, 'stick deadzone ignores noise')
assert(stickWish('drive', -1, 1).turn < 0 && stickWish('drive', -1, 1).forward > 0, 'drive: left turns, up walks')
assert(stickWish('drive', 0, 0.25).forward > 0.1, 'a small Drive lean still walks')
assert(stickWish('look', -1, 1).forward === 0 && stickWish('look', -1, 1).nod > 0, 'look: no walk, up nods')

if (process.exitCode) {
  console.error('sim tests failed')
  process.exit(1)
}
console.log('sim tests passed')
