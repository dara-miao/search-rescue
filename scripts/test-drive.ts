import { site } from '../src/data/site'
import { keepOffFootprint, pointInPoly } from '../src/drive/hull'
import { spawnIsValid, stagingPose } from '../src/drive/spawn'
import { ROBOT_CONFIG, resolveCollision } from '../src/drive/robot-controller.js'
import { CHASE_CONFIG, shortestAngle, turnRateAtSpeed } from '../src/drive/robot-chase.js'
import { apparatusLayout } from '../src/scene/staging-apparatus.js'
import { CLIMB_M, chassisAttitude, followGround, heightAt } from '../src/scene/site-ground.js'
import { ACCEL, MIN_SPEED_SCALE, RAMP_S, TOP_SPEED, freshBody, siteBlockers, stepDrive } from '../src/drive/step'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

const spawn = stagingPose()
assert(spawnIsValid(), 'staging spawn is outside the OSM hull')
assert(spawn.z > site.building.centroid.z, 'spawn sits on the Alumni Park side (+Z)')
assert(
  Math.hypot(spawn.x - site.building.centroid.x, spawn.z - site.building.centroid.z) > 25,
  'spawn is ~30m off the south face',
)

const fwd = { x: -Math.sin(spawn.yaw), z: -Math.cos(spawn.yaw) }
const toBldgX = site.building.centroid.x - spawn.x
const toBldgZ = site.building.centroid.z - spawn.z
const toLen = Math.hypot(toBldgX, toBldgZ) || 1
assert((fwd.x * toBldgX + fwd.z * toBldgZ) / toLen > 0.55, 'spawn faces the building')

const body = freshBody()
body.yaw = 0
body.speed = 0
for (let i = 0; i < 12; i++) stepDrive(body, { x: 0, y: -1 }, 0.05)
assert(
  body.speed > 4.5 && body.speed < 6.05,
  `0.6s of throttle ramps toward 6 m/s (got ${body.speed.toFixed(2)})`,
)
assert(Math.abs(ACCEL - CHASE_CONFIG.accel) < 1e-9, 'accel comes from robot-chase.js')
assert(Math.abs(ACCEL - TOP_SPEED / RAMP_S) < 1e-9, 'ramp is top speed over accel')

const north = freshBody()
const startZ = north.z
north.yaw = 0
north.speed = 0
stepDrive(north, { x: 0, y: -1 }, 0.25)
assert(north.z < startZ - 0.2, 'yaw 0 + stick up walks north (−Z)')

const mid = site.building.centroid
assert(pointInPoly(mid.x, mid.z, site.building.footprint), 'centroid is inside')
const ejected = keepOffFootprint(mid.x, mid.z, 0.72)
assert(!pointInPoly(ejected.x, ejected.z, site.building.footprint), 'keepOff ejects an interior point')
assert(Math.hypot(ejected.x - mid.x, ejected.z - mid.z) > 4, 'eject clears the mass')

const ram = freshBody()
ram.x = mid.x
ram.z = mid.z
ram.speed = 6
stepDrive(ram, { x: 0, y: -1 }, 0.05)
assert(!pointInPoly(ram.x, ram.z, site.building.footprint), 'a sprint step cannot stay inside Doheny')

const blockers = siteBlockers()
assert(blockers.length >= 7, 'pavilion volumes and staging engines are extra blockers')
const southPav = blockers[1]
const pavHit = resolveCollision(
  { x: southPav.reduce((s, p) => s + p.x, 0) / 4, z: southPav.reduce((s, p) => s + p.z, 0) / 4 },
  ROBOT_CONFIG.radius,
  blockers,
)
assert(pavHit.hit, 'the entrance pavilion rejects a disk sitting inside it')

assert(Math.abs(turnRateAtSpeed(0) - CHASE_CONFIG.steering.pivotRate) < 1e-9, 'standstill turn rate is the slow pivot')
assert(turnRateAtSpeed(6) < 2.0, 'at speed, turn rate is capped by the 3.6 m radius')
assert(
  Math.abs(6 / turnRateAtSpeed(6) - CHASE_CONFIG.steering.minTurnRadius) < 0.05,
  'full lock at speed holds a 3.6 m radius',
)

const pivot = freshBody()
pivot.yaw = 0
pivot.speed = 0
for (let i = 0; i < 60; i++) stepDrive(pivot, { x: 1, y: 0 }, 0.05)
const turned = Math.abs(shortestAngle(pivot.yaw))
assert(turned > 1.2 && turned < 2.0, `3s of full lock at rest is a slow pivot, not a spin (got ${turned.toFixed(2)} rad)`)
assert(turned < Math.PI, 'a held stick at rest cannot complete a revolution in 3s')

const probe = freshBody()
probe.x = 200
probe.z = 200
probe.yaw = 0
probe.speed = 6
stepDrive(probe, { x: 1, y: 0 }, 0.05)
assert(Math.abs(probe.yawRate) > 1.2, `steer-only at speed still yaws (got ${probe.yawRate.toFixed(2)})`)

const coast = freshBody()
coast.yaw = 0
coast.speed = 5
stepDrive(coast, { x: 0, y: 0 }, 0.4)
assert(coast.speed < 0.2, 'released stick brakes to a stop')
assert(Math.abs(coast.yaw) < 1e-6, 'no stick means yaw does not accumulate')

const open = freshBody()
open.x = 180
open.z = 180
open.yaw = 0
open.speed = 0
const limp = freshBody()
limp.x = 180
limp.z = 180
limp.yaw = 0
limp.speed = 0
for (let i = 0; i < 12; i++) {
  stepDrive(open, { x: 0, y: -1 }, 0.05)
  stepDrive(limp, { x: 0, y: -1 }, 0.05, 0.42)
}
assert(open.speed > 4.5, `open lawn still ramps (got ${open.speed.toFixed(2)})`)
assert(
  limp.speed < open.speed * 0.55 && limp.speed > 1.2,
  `0.42 limp is slower than full throttle (limp ${limp.speed.toFixed(2)} vs ${open.speed.toFixed(2)})`,
)

const crawl = freshBody()
crawl.x = 180
crawl.z = 180
crawl.yaw = 0
for (let i = 0; i < 12; i++) stepDrive(crawl, { x: 0, y: -1 }, 0.05, 0)
assert(
  crawl.speed > 0.35 && crawl.speed < open.speed * 0.28,
  `empty battery still crawls at min scale ${MIN_SPEED_SCALE} (got ${crawl.speed.toFixed(2)})`,
)

const truck = apparatusLayout(spawn, site.building.orientedBounds.angleRad).westEngine
const slam = freshBody()
slam.x = truck.x
slam.z = truck.z
slam.speed = 6
stepDrive(slam, { x: 0, y: -1 }, 0.05)
assert(Math.hypot(slam.x - truck.x, slam.z - truck.z) > 0.5, 'an engine hull rejects a disk sitting inside it')

const lawnY = heightAt(spawn.x, spawn.z, site)
assert(Math.abs(spawn.y - lawnY) < 0.02, 'spawn sits on the sampled ground')
const ob = site.building.orientedBounds
const lip = { x: 0, z: -ob.depth / 2 - 3.1 }
const lipWorld = {
  x: ob.centre.x + lip.x * Math.cos(ob.angleRad) - lip.z * Math.sin(ob.angleRad),
  z: ob.centre.z + lip.x * Math.sin(ob.angleRad) + lip.z * Math.cos(ob.angleRad),
}
const lipY = heightAt(lipWorld.x, lipWorld.z, site)
assert(lipY > lawnY + 0.12, `north loading lip is a curb (lip ${lipY.toFixed(2)} vs lawn ${lawnY.toFixed(2)})`)
assert(CLIMB_M === 0.4, 'climb threshold is 0.4 m')
assert(followGround(0, spawn.x, spawn.z, site).blocked === false, 'lawn from 0 is climbable')
assert(followGround(0, lipWorld.x, lipWorld.z, site).blocked === false, 'curb within 0.4 m is accepted')
assert(followGround(0, lipWorld.x, lipWorld.z, site).y > lawnY, 'accepted curb raises Y')
assert(followGround(-0.25, lipWorld.x, lipWorld.z, site).blocked, 'a rise over 0.4 m is refused')
const lean = chassisAttitude(lipWorld.x, lipWorld.z, 0, site)
assert(Number.isFinite(lean.pitch) && Number.isFinite(lean.roll), 'chassis reads a surface normal')

const rider = freshBody()
rider.x = spawn.x
rider.z = spawn.z
for (let i = 0; i < 8; i++) stepDrive(rider, { x: 0, y: -1 }, 0.05)
assert(Math.abs(rider.y - heightAt(rider.x, rider.z, site)) < 0.05, 'a drive step snaps Y to the ground')

if (process.exitCode) {
  console.error('drive tests failed')
  process.exit(process.exitCode)
}
console.log('drive tests passed')
