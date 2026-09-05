import { BufferAttribute, Vector3 } from 'three'
import { createRun } from '../src/run/generate'
import { buildMassing } from '../src/scene/doheny-massing.js'
import { mountExtractionMarkers } from '../src/scene/markers'
import { site } from '../src/data/site'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

const group = buildMassing(site)
const windows = group.userData.windows as Array<{ userData: { facade: string } }>
assert(!!group, 'buildMassing returns a group')
const stepMesh = group.getObjectByName('entranceSteps') as { geometry?: { attributes?: { position?: BufferAttribute } } } | undefined
assert(!!stepMesh, 'south portal has entrance steps')
const stepPos = stepMesh?.geometry?.attributes?.position
if (stepPos) {
  let doorY = 0
  let lawnY = 0
  let doorN = 0
  let lawnN = 0
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < stepPos.count; i++) {
    const z = stepPos.getZ(i)
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  const midZ = (minZ + maxZ) / 2
  for (let i = 0; i < stepPos.count; i++) {
    const y = stepPos.getY(i)
    if (stepPos.getZ(i) < midZ) {
      doorY += y
      doorN++
    } else {
      lawnY += y
      lawnN++
    }
  }
  assert(doorN > 0 && lawnN > 0, 'entrance steps have a door side and a lawn side')
  assert(
    doorY / doorN > lawnY / lawnN + 0.12,
    `steps rise toward the door, not the lawn (door ${(doorY / doorN).toFixed(2)} vs lawn ${(lawnY / lawnN).toFixed(2)})`,
  )
} else {
  assert(false, 'entrance steps have vertex positions')
}
assert(!!group.getObjectByName('portalDoor'), 'south portal has a solid door slab')
const brickMat = (group.getObjectByName('brick') as { material?: { map?: unknown; normalMap?: unknown } } | undefined)?.material
if (typeof document !== 'undefined') {
  assert(!!brickMat?.map && !!brickMat?.normalMap, 'brick field has albedo + normal from the elevation photo')
}
assert(windows.length > 20, `windows registered (${windows.length})`)
assert(
  windows.some((w) => w.userData.facade === 'south'),
  'south facade has window meshes for later vent glow',
)
assert(Math.abs(group.position.x - site.building.orientedBounds.centre.x) < 0.01, 'massing sits on the OBB centre')
assert(Math.abs(group.rotation.y + site.building.orientedBounds.angleRad) < 1e-6, 'massing yaw is -angleRad')

const report = mountExtractionMarkers(group, createRun(11).extractions)
assert(report.attached >= 8, `cyan markers attach to real window bays (${report.attached})`)
assert(report.unmatched.length === 0, `every extraction found a window (missed ${report.unmatched.join(', ')})`)
const marked = (
  group.userData.windows as Array<{ userData: { marker?: { material?: { fog?: boolean } } } }>
).find((w) => w.userData.marker)
assert(marked?.userData.marker?.material?.fog === false, 'cyan shafts ignore fog so they read from the lawn')

group.updateMatrixWorld(true)
const centre = site.building.orientedBounds.centre
const south = (
  group.userData.windows as Array<{
    getWorldPosition: (v: Vector3) => Vector3
    userData: {
      facade: string
      marker?: { localToWorld: (v: Vector3) => Vector3 }
    }
  }>
).find((w) => w.userData.facade === 'south' && w.userData.marker)
assert(!!south?.userData.marker, 'south face has a live marker')
if (south?.userData.marker) {
  const glass = new Vector3()
  south.getWorldPosition(glass)
  const shaft = south.userData.marker.localToWorld(new Vector3(0, 2, 1))
  const glassOut = Math.hypot(glass.x - centre.x, glass.z - centre.z)
  const shaftOut = Math.hypot(shaft.x - centre.x, shaft.z - centre.z)
  assert(
    shaftOut > glassOut + 0.4,
    `south shaft sits on the lawn side of the glass (shaft ${shaftOut.toFixed(2)} vs glass ${glassOut.toFixed(2)})`,
  )
}

if (process.exitCode) {
  console.error('massing tests failed')
  process.exit(process.exitCode)
}
console.log('massing tests passed')
