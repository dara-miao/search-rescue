#!/usr/bin/env node
/**
 * Pull the real Doheny Memorial Library footprint from OSM / Overpass,
 * project it to local metres, and write site-data.json.
 *
 *   node tools/extract-footprint.mjs
 *   node tools/extract-footprint.mjs overpass-raw.json
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = { lat: 34.0201, lon: -118.2838 }
const RADIUS_M = 150
const MIRRORS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]
const QUERY = `[out:json][timeout:40];
(
  way["building"](around:${RADIUS_M},${ORIGIN.lat},${ORIGIN.lon});
  relation["building"](around:${RADIUS_M},${ORIGIN.lat},${ORIGIN.lon});
);
out body;
>;
out skel qt;`

const METERS_PER_DEG_LAT = 110540
const COS = Math.cos((ORIGIN.lat * Math.PI) / 180)
const METERS_PER_DEG_LON = 111320 * COS

function project(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * METERS_PER_DEG_LON,
    z: (ORIGIN.lat - lat) * METERS_PER_DEG_LAT,
  }
}

function ringArea(pts) {
  let a = 0
  const n = pts.length
  for (let i = 0, j = n - 1; i < n; j = i++) a += pts[j].x * pts[i].z - pts[i].x * pts[j].z
  return Math.abs(a) / 2
}

function closeRing(pts) {
  if (pts.length < 3) return pts
  const a = pts[0]
  const b = pts[pts.length - 1]
  if (Math.hypot(a.x - b.x, a.z - b.z) < 1e-4) return pts.slice(0, -1)
  return pts
}

function pointInPoly(x, z, pts) {
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

function centroid(pts) {
  let cx = 0
  let cz = 0
  let a = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % n]
    const cross = p.x * q.z - q.x * p.z
    a += cross
    cx += (p.x + q.x) * cross
    cz += (p.z + q.z) * cross
  }
  a *= 0.5
  if (Math.abs(a) < 1e-6) {
    const sx = pts.reduce((s, p) => s + p.x, 0) / n
    const sz = pts.reduce((s, p) => s + p.z, 0) / n
    return { x: sx, z: sz }
  }
  return { x: cx / (6 * a), z: cz / (6 * a) }
}

/** Min-area rectangle from every footprint edge angle. */
function orientedBounds(pts) {
  let best = null
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const raw = Math.atan2(b.z - a.z, b.x - a.x)
    const theta = ((raw % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)
    const c = Math.cos(-theta)
    const s = Math.sin(-theta)
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const p of pts) {
      const x = p.x * c - p.z * s
      const z = p.x * s + p.z * c
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
    const width = maxX - minX
    const depth = maxZ - minZ
    const area = width * depth
    if (!best || area < best.area) {
      const lx = (minX + maxX) / 2
      const lz = (minZ + maxZ) / 2
      const uc = Math.cos(theta)
      const us = Math.sin(theta)
      best = {
        width,
        depth,
        area,
        angleRad: theta,
        angleNormalizedDeg: (theta * 180) / Math.PI,
        centre: { x: lx * uc - lz * us, z: lx * us + lz * uc },
      }
    }
  }
  return best
}

function buildGrid(footprint, bounds, floors) {
  const cols = 4
  const rows = 3
  const east = { x: Math.cos(bounds.angleRad), z: Math.sin(bounds.angleRad) }
  const south = { x: -Math.sin(bounds.angleRad), z: Math.cos(bounds.angleRad) }
  const localZIsSouth = south.z > 0
  const localXIsEast = east.x > 0
  const cells = []
  let discarded = 0

  for (let floor = 0; floor < floors; floor++) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const u = (col + 0.5) / cols - 0.5
        const v = (row + 0.5) / rows - 0.5
        const lx = u * bounds.width
        const lz = v * bounds.depth
        const c = Math.cos(bounds.angleRad)
        const s = Math.sin(bounds.angleRad)
        const centre = {
          x: bounds.centre.x + lx * c - lz * s,
          z: bounds.centre.z + lx * s + lz * c,
        }
        if (!pointInPoly(centre.x, centre.z, footprint)) {
          discarded += 1
          continue
        }
        const facades = []
        if (row === 0) facades.push(localZIsSouth ? 'north' : 'south')
        if (row === rows - 1) facades.push(localZIsSouth ? 'south' : 'north')
        if (col === 0) facades.push(localXIsEast ? 'west' : 'east')
        if (col === cols - 1) facades.push(localXIsEast ? 'east' : 'west')
        const isCore = row === 1 && (col === 1 || col === 2)
        cells.push({
          id: `${floor}-${col}-${row}`,
          floor,
          col,
          row,
          isCore,
          facades,
          centre,
          size: { x: bounds.width / cols, z: bounds.depth / rows },
        })
      }
    }
  }
  return { cols, rows, floors, cells, discarded }
}

function nameOf(tags) {
  return tags?.name || tags?.['name:en'] || ''
}

function isDoheny(name) {
  return /doheny/i.test(name)
}

function wayRing(way, nodes) {
  const pts = []
  for (const id of way.nodes ?? []) {
    const n = nodes.get(id)
    if (n) pts.push(project(n.lat, n.lon))
  }
  return closeRing(pts)
}

function relationRings(rel, ways, nodes) {
  const outers = []
  const holes = []
  for (const mem of rel.members ?? []) {
    if (mem.type !== 'way') continue
    const way = ways.get(mem.ref)
    if (!way) continue
    const ring = wayRing(way, nodes)
    if (ring.length < 3) continue
    if (mem.role === 'inner') holes.push(ring)
    else if (!mem.role || mem.role === 'outer') outers.push(ring)
  }
  outers.sort((a, b) => ringArea(b) - ringArea(a))
  return { outer: outers[0] ?? [], holes }
}

function collectBuildings(json) {
  const nodes = new Map()
  const ways = new Map()
  const rels = []
  for (const el of json.elements ?? []) {
    if (el.type === 'node') nodes.set(el.id, el)
    else if (el.type === 'way') ways.set(el.id, el)
    else if (el.type === 'relation') rels.push(el)
  }

  const buildings = []
  for (const way of ways.values()) {
    if (!way.tags?.building) continue
    const footprint = wayRing(way, nodes)
    if (footprint.length < 3) continue
    buildings.push({
      osmId: `way/${way.id}`,
      name: nameOf(way.tags),
      tags: way.tags,
      footprint,
      holes: [],
    })
  }
  for (const rel of rels) {
    if (!rel.tags?.building) continue
    const { outer, holes } = relationRings(rel, ways, nodes)
    if (outer.length < 3) continue
    buildings.push({
      osmId: `relation/${rel.id}`,
      name: nameOf(rel.tags),
      tags: rel.tags,
      footprint: outer,
      holes,
    })
  }
  return buildings
}

async function fetchOverpass() {
  let lastErr = ''
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'doheny-rescue-sim/0.1 (education; footprint extract)',
        },
        body: `data=${encodeURIComponent(QUERY)}`,
      })
      if (!res.ok) {
        lastErr = `${url} → HTTP ${res.status}`
        continue
      }
      const json = await res.json()
      if (!json.elements?.length) {
        lastErr = `${url} → empty`
        continue
      }
      console.log(`overpass ok  ${url}`)
      return json
    } catch (err) {
      lastErr = `${url} → ${err instanceof Error ? err.message : err}`
    }
  }
  throw new Error(`Overpass failed on every mirror. Last: ${lastErr}`)
}

function pickBuilding(buildings) {
  const ranked = buildings
    .map((b) => ({ ...b, areaSqM: ringArea(b.footprint) }))
    .sort((a, b) => b.areaSqM - a.areaSqM)

  console.log('\ncandidates (area m²):')
  for (const b of ranked) {
    const mark = isDoheny(b.name) ? '  ← doheny name' : ''
    console.log(`  ${b.areaSqM.toFixed(0).padStart(7)}  ${b.osmId.padEnd(22)}  ${b.name || '(unnamed)'}${mark}`)
  }

  const named = ranked.find((b) => isDoheny(b.name))
  const picked = named ?? ranked[0]
  console.log(`\npicked ${picked.osmId}  ${picked.name || '(unnamed)'}  ${picked.areaSqM.toFixed(0)} m²`)
  if (!named) console.log('no name match — fell back to largest footprint')
  return picked
}

function levelsOf(tags) {
  const raw = tags['building:levels'] ?? tags.levels
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 2) return { levels: Math.round(n), source: 'osm' }
  return { levels: 4, source: 'fallback' }
}

function heightOf(tags, levels) {
  const h = Number(tags.height)
  if (Number.isFinite(h) && h > 6) return h
  return levels * 4.2
}

const replay = process.argv[2]
let json
if (replay) {
  const path = resolve(process.cwd(), replay)
  json = JSON.parse(readFileSync(path, 'utf8'))
  console.log(`replay ${path}`)
} else if (existsSync(resolve(ROOT, 'overpass-raw.json')) && process.argv.includes('--cache')) {
  json = JSON.parse(readFileSync(resolve(ROOT, 'overpass-raw.json'), 'utf8'))
  console.log('replay overpass-raw.json')
} else {
  json = await fetchOverpass()
  writeFileSync(resolve(ROOT, 'overpass-raw.json'), JSON.stringify(json))
  console.log('wrote overpass-raw.json')
}

const buildings = collectBuildings(json)
if (!buildings.length) {
  console.error('no building ways/relations in the Overpass payload')
  process.exit(1)
}

const picked = pickBuilding(buildings)
const { levels, source: levelSource } = levelsOf(picked.tags)
const heightM = heightOf(picked.tags, levels)
const bounds = orientedBounds(picked.footprint)
const grid = buildGrid(picked.footprint, bounds, levels)
const mid = centroid(picked.footprint)

const southCells = grid.cells.filter((c) => c.floor === 0 && c.facades.includes('south'))
const southMeanZ = southCells.reduce((s, c) => s + c.centre.z, 0) / (southCells.length || 1)
const northCells = grid.cells.filter((c) => c.floor === 0 && c.facades.includes('north'))
const northMeanZ = northCells.reduce((s, c) => s + c.centre.z, 0) / (northCells.length || 1)
if (southCells.length && northCells.length && southMeanZ < northMeanZ) {
  console.log('south cells sit north of north cells — swapping N/S facade tags')
  for (const cell of grid.cells) {
    cell.facades = cell.facades.map((f) => (f === 'south' ? 'north' : f === 'north' ? 'south' : f))
  }
}

const site = {
  origin: ORIGIN,
  projection: '+X east, +Z south, metres, equirectangular about origin',
  license: '© OpenStreetMap contributors (ODbL)',
  building: {
    osmId: picked.osmId,
    name: picked.name || 'Doheny Memorial Library',
    footprint: picked.footprint,
    holes: picked.holes ?? [],
    centroid: mid,
    areaSqM: picked.areaSqM,
    levels,
    levelSource,
    heightM,
    orientedBounds: {
      width: bounds.width,
      depth: bounds.depth,
      angleRad: bounds.angleRad,
      angleNormalizedDeg: bounds.angleNormalizedDeg,
      centre: bounds.centre,
    },
  },
  fireGrid: {
    cols: grid.cols,
    rows: grid.rows,
    floors: grid.floors,
    discardedOutsideFootprint: grid.discarded,
    cells: grid.cells,
  },
}

const out = resolve(ROOT, 'src/data/site-data.json')
writeFileSync(out, `${JSON.stringify(site, null, 2)}\n`)
console.log(`\nwrote ${out}`)
console.log(`levels ${levels} (${levelSource})  height ${heightM.toFixed(1)} m`)
console.log(`grid ${grid.cells.length} cells kept, ${grid.discarded} discarded outside polygon`)
const south = site.fireGrid.cells.filter((c) => c.floor === 0 && c.facades.includes('south'))
console.log(`south facade cells (floor 0): ${south.map((c) => `${c.col},${c.row}`).join(' ')}`)
console.log(`south mean Z ${south.reduce((s, c) => s + c.centre.z, 0) / (south.length || 1)} (Alumni Park should be +Z)`)
