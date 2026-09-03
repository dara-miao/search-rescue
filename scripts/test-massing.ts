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

if (process.exitCode) {
  console.error('massing tests failed')
  process.exit(process.exitCode)
}
console.log('massing tests passed')
