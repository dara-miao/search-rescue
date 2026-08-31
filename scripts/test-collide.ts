import { keepOut, keepOutFrom, insideSolid, inDoorGap, doorMid, doorOf, DOOR_GAP } from '../src/game/collide'
import { keepOffProps, PROP_CIRCLES } from '../src/game/props'
import { stepBody, type Body } from '../src/game/motion'
import { isRoofHit, pickWalkY, ROOF_ABOVE_DEM, walkableTileY } from '../src/game/tilesCollide'
import { BUILDINGS } from '../src/game/world'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

const pe = BUILDINGS.find((b) => b.name.startsWith('Physical Education'))
const cipa = BUILDINGS.find((b) => b.name.includes('Medicine Crow'))
const doheny = BUILDINGS.find((b) => b.fire)
if (!pe || !cipa || !doheny) {
  console.error('fail: campus buildings missing')
  process.exit(1)
}

assert(insideSolid(pe.cx, pe.cz) === pe.name, 'PE centroid is inside the hull')
const peOut = keepOut(-128, -89)
assert(peOut.x < -128 || Math.hypot(peOut.x + 128, peOut.z + 89) > 0.2, 'PE west face pushes off')
assert(!insideSolid(peOut.x, peOut.z), 'PE west face lands outside')

const peEject = keepOut(pe.cx, pe.cz)
assert(!insideSolid(peEject.x, peEject.z), 'PE interior ejects')
assert(Math.hypot(peEject.x - pe.cx, peEject.z - pe.cz) > 8, 'PE eject clears the mass')

const cipaEject = keepOut(cipa.cx, cipa.cz)
assert(!insideSolid(cipaEject.x, cipaEject.z), 'CIPA interior ejects')

const dohEject = keepOut(doheny.cx, doheny.cz)
assert(!insideSolid(dohEject.x, dohEject.z), 'Doheny interior ejects — door is not a hole')

const door = doorOf(doheny)
assert(!!door, 'Doheny has a door edge')
if (door) {
  const len = Math.hypot(door.bx - door.ax, door.bz - door.az)
  assert(len > DOOR_GAP, 'door edge is longer than the visual gap')
  assert(inDoorGap(door.ax, door.az, door.bx, door.bz, door, 0.5), 'gap center is the visual cut')
  assert(!inDoorGap(door.ax, door.az, door.bx, door.bz, door, 0.1), 'gap does not swallow the jambs')
  const mid = doorMid(doheny)!
  const blocked = keepOut(mid.x, mid.z)
  assert(!insideSolid(blocked.x, blocked.z), 'door mid stays out of the hull')
  assert(Math.hypot(blocked.x - mid.x, blocked.z - mid.z) > 0.3, 'door mid is a wall, not a tunnel')
}

function walk(x: number, z: number, wx: number, wz: number, steps: number): Body {
  let body: Body = { x, y: 60, z, vx: 0, vy: 0, vz: 0 }
  for (let i = 0; i < steps; i++) body = stepBody(body, wx, wz, true, 0.05)
  return body
}

const peWalk = walk(-145, -89, 11, 0, 90)
assert(!insideSolid(peWalk.x, peWalk.z), 'sprint at PE from the west never enters')
assert(peWalk.x < pe.cx, 'sprint at PE does not cross the centroid')

const cipaWalk = walk(cipa.cx, cipa.cz - 50, 0, 11, 90)
assert(!insideSolid(cipaWalk.x, cipaWalk.z), 'sprint at CIPA from the north never enters')
assert(cipaWalk.z < cipa.cz, 'sprint at CIPA does not cross the centroid')

const dohWalk = walk(82, 36, 8, 2.4, 140)
assert(!insideSolid(dohWalk.x, dohWalk.z), 'sprint from deploy toward Doheny never enters')
assert(dohWalk.x < doheny.cx, 'deploy sprint does not cross Doheny')

const deploy = keepOut(82, 36)
assert(Math.hypot(deploy.x - 82, deploy.z - 36) < 0.05, 'deploy is clear of every hull')

const mid = doorMid(doheny)
const inwardX = doheny.cx - mid.x
const inwardZ = doheny.cz - mid.z
const inwardL = Math.hypot(inwardX, inwardZ) || 1
const ux = inwardX / inwardL
const uz = inwardZ / inwardL
const tunneled = keepOutFrom(mid.x - ux * 8, mid.z - uz * 8, mid.x + ux * 12, mid.z + uz * 12)
assert(!insideSolid(tunneled.x, tunneled.z), 'an 8 m lunge at the door cannot tunnel in')
assert((tunneled.x - mid.x) * ux + (tunneled.z - mid.z) * uz < 1.2, 'lunge stops on the outside of the door')

const fountain = PROP_CIRCLES.find((p) => p.r > 5)
if (fountain) {
  const off = keepOffProps(fountain.x, fountain.z)
  assert(Math.hypot(off.x - fountain.x, off.z - fountain.z) >= fountain.r - 0.05, 'fountain is solid')
}
const tommy = PROP_CIRCLES.find((p) => Math.hypot(p.x, p.z) < 2 && p.r > 2)
if (tommy) {
  const off = keepOffProps(tommy.x, tommy.z)
  assert(Math.hypot(off.x - tommy.x, off.z - tommy.z) >= tommy.r - 0.05, 'Tommy plinth is solid')
}
const nearPalm = PROP_CIRCLES.find((p) => p.r < 1.4 && Math.hypot(p.x - 82, p.z - 36) > 8)
if (nearPalm) {
  const off = keepOut(nearPalm.x, nearPalm.z)
  assert(Math.hypot(off.x - nearPalm.x, off.z - nearPalm.z) >= nearPalm.r - 0.08, 'palms are solid')
}

assert(isRoofHit(12, 1) === true, 'a 11 m rise is a roof')
assert(isRoofHit(2.2, 1) === false, 'a 1.2 m rise is still the walk')
assert(ROOF_ABOVE_DEM > 1.2 && ROOF_ABOVE_DEM < 2.2, 'roof threshold sits between stoops and tents')
assert(walkableTileY(82, 36) !== null, 'deploy stays walkable without tiles')
assert(walkableTileY(94, 52) !== null, 'plaza deploy stays walkable without tiles')
assert(pickWalkY(1, [12]) === 1, 'a palm canopy is not a roof — walk the DEM')
assert(pickWalkY(1, [3.2]) === null, 'a tent-height hit stays blocked')
assert(pickWalkY(1, [12, 1.1]) === 1.1, 'ground under a canopy wins')
assert(pickWalkY(1, []) === 1, 'no hits fall back to the DEM')

if (process.exitCode) {
  console.error('collide tests failed')
  process.exit(1)
}
console.log('collide tests passed')
