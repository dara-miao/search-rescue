import { Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { stagingPose } from '../src/drive/spawn'
import { site } from '../src/data/site'
import { CHASE_CONFIG, desiredChaseShot } from '../src/drive/robot-chase.js'
import { aerialShot, craneProgress, easeCrane, mixShot } from '../src/scene/deploy-crane'
import { apparatusBlockers, apparatusLayout } from '../src/scene/staging-apparatus.js'
import { buildEnvironment, setMergeFunction } from '../src/scene/site-environment.js'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

setMergeFunction((geos, useGroups) => {
  const prepared = geos.map((g) => ('index' in g && g.index ? g.toNonIndexed() : g))
  return mergeGeometries(prepared, useGroups)
})

const scene = new Scene()
const spawn = stagingPose()
const env = buildEnvironment(scene, site, {
  staging: { x: spawn.x, z: spawn.z },
  treeExclusions: [{ x: spawn.x, z: spawn.z, radius: 22 }],
})

if (!env.root.parent) scene.add(env.root)
assert(!!scene.fog, 'exponential fog is on the scene')
assert(!!env.sky, 'sky dome exists')
assert(env.sky.material.fog === false, 'sky ignores fog so the dome stays visible')
assert(!!env.ground, 'ground reaches the fog')
assert(env.treeCount > 20 && env.treeCount < 400, `tree scatter is a campus lawn, not a forest (${env.treeCount})`)
assert(!!env.distant, 'distant campus ring exists')
assert(Math.hypot(env.staging.x - spawn.x, env.staging.z - spawn.z) < 0.01, 'staging yard is centred on spawn')
assert(!!scene.getObjectByName('stagingApparatus'), 'fire apparatus is on the lawn')
assert(!!scene.getObjectByName('engineWest') && !!scene.getObjectByName('engineEast'), 'two engines park beside the ring')
assert(!!scene.getObjectByName('utility'), 'a utility sits on the east side')
const layout = apparatusLayout(spawn, site.building.orientedBounds.angleRad)
const hulls = apparatusBlockers(spawn, site.building.orientedBounds.angleRad)
assert(hulls.length === 3, 'each vehicle has a collision hull')
assert(
  Math.hypot(layout.westEngine.x - spawn.x, layout.westEngine.z - spawn.z) > 6,
  'west engine stays off the spawn disk',
)
assert(scene.getObjectByName('environment') === env.root, 'environment root is parented')
assert(!!env.root.getObjectByName('trousdaleParkway'), 'Trousdale Parkway is the east asphalt')
assert(!!env.root.getObjectByName('lightPoles'), 'light poles stand on the lawn')
assert(env.poleCount > 8, `enough poles to read as a campus, not two lamps (${env.poleCount})`)

env.update(0.16, { fireIntensity: 0 })
assert((env as { moon?: unknown }).moon !== undefined, 'moon is the shadow caster')

scene.remove(env.root)
const again = buildEnvironment(scene, site, {
  staging: { x: spawn.x, z: spawn.z },
  treeExclusions: [{ x: spawn.x, z: spawn.z, radius: 22 }],
})
if (!again.root.parent) scene.add(again.root)
assert(scene.getObjectByName('environment') === again.root, 'rebuilding after a Strict-style teardown parents a live root')
assert(again.treeCount === env.treeCount, 'rebuild keeps the same tree count')

const air = aerialShot(site, 0)
const south = { x: -Math.sin(site.building.orientedBounds.angleRad), z: Math.cos(site.building.orientedBounds.angleRad) }
const fromCentre = {
  x: air.position.x - site.building.orientedBounds.centre.x,
  z: air.position.z - site.building.orientedBounds.centre.z,
}
assert(air.position.y > 50, `aerial shot is bird-high (got ${air.position.y.toFixed(1)})`)
assert(
  fromCentre.x * south.x + fromCentre.z * south.z > 60,
  'aerial shot sits on the Alumni Park side',
)
assert(air.fov < 50, 'aerial fov stays cinematic so the sky stays in frame')
assert(craneProgress(0) === 0 && craneProgress(8) === 1, 'crane progress clamps')
assert(easeCrane(0) === 0 && easeCrane(1) === 1, 'crane ease is a full 0-1')
assert(easeCrane(0.5) > 0.4 && easeCrane(0.5) < 0.6, 'crane ease is symmetric')
const chase = desiredChaseShot(
  { position: { x: spawn.x, y: spawn.y, z: spawn.z }, yaw: spawn.yaw },
  CHASE_CONFIG,
)
const startMix = mixShot(air, chase, 0)
const endMix = mixShot(air, chase, 1)
assert(Math.abs(startMix.position.y - air.position.y) < 1e-9, 'crane t=0 is the aerial')
assert(Math.abs(endMix.position.y - chase.position.y) < 1e-9, 'crane t=1 is the chase pose')
assert(chase.position.y < 12, 'chase pose is down at the robot')
assert(air.position.y - chase.position.y > 40, 'deploy drops from bird height to the chassis')

if (process.exitCode) {
  console.error('environment tests failed')
  process.exit(process.exitCode)
}
console.log('environment tests passed')
