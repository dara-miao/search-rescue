import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { meanZ, northFacadeCells, site, southFacadeCells } from '../src/data/site'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

function pointInPoly(x: number, z: number, pts: Array<{ x: number; z: number }>) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const zi = pts[i].z
    const xj = pts[j].x
    const zj = pts[j].z
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) inside = !inside
  }
  return inside
}

assert(/doheny/i.test(site.building.name), 'picked the Doheny-named footprint')
assert(site.building.osmId === 'relation/6095470', 'OSM id is relation/6095470')
assert(site.building.footprint.length >= 8, 'footprint has enough vertices for the wing')
assert(site.building.holes.length === 1, 'courtyard inner ring is present')
assert(site.building.areaSqM > 3000 && site.building.areaSqM < 4200, 'area is Doheny-sized')
assert(site.building.heightM === 22.8, 'height comes from the OSM tag (22.8 m)')
assert(site.building.levels === 4, 'levels are 4')
assert(site.building.levelSource === 'fallback', 'levels tag is missing — fallback recorded, not silent')
assert(site.license.includes('OpenStreetMap'), 'ODbL attribution is stored')

const south = southFacadeCells(0)
const north = northFacadeCells(0)
assert(south.length >= 3, `south facade has cells (${south.length})`)
assert(north.length >= 3, `north facade has cells (${north.length})`)
assert(meanZ(south) > meanZ(north), 'south cells sit on the Alumni Park side (+Z)')

const mid = site.building.centroid
assert(pointInPoly(mid.x, mid.z, site.building.footprint), 'centroid is inside the outer ring')

for (const cell of site.fireGrid.cells) {
  assert(
    pointInPoly(cell.centre.x, cell.centre.z, site.building.footprint),
    `cell ${cell.id} centre is inside the footprint`,
  )
}

assert(site.fireGrid.floors === 4, 'grid has 4 floors')
assert(site.fireGrid.cells.length === 44, '44 cells kept after discarding wing misses')
assert(site.fireGrid.discardedOutsideFootprint === 4, '4 generated cells fell outside the polygon')

const cores = site.fireGrid.cells.filter((c) => c.floor === 0 && c.isCore)
assert(cores.length === 2, 'floor 0 has two core cells')

const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'overpass-raw.json'), 'utf8'))
const rel = (raw.elements as Array<{ type: string; id: number; tags?: { name?: string } }>).find(
  (e) => e.type === 'relation' && e.id === 6095470,
)
assert(!!rel, 'committed Overpass dump still contains Doheny')
assert(/doheny/i.test(rel?.tags?.name ?? ''), 'Overpass dump name matches')

if (process.exitCode) {
  console.error('site tests failed')
  process.exit(process.exitCode)
}
console.log('site tests passed')
