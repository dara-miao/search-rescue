import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'src/data/ground.json')
const ORIGIN = { lat: 34.0205678, lon: -118.2854346 }
const SAT = { minLat: 34.0186, maxLat: 34.0234, minLon: -118.2884, maxLon: -118.2814 }
const COLS = 18
const ROWS = 14
const cos = Math.cos((ORIGIN.lat * Math.PI) / 180)

function toLocal(lat, lon) {
  return [
    Number(((lon - ORIGIN.lon) * (111320 * cos)).toFixed(2)),
    Number(((ORIGIN.lat - lat) * 110540).toFixed(2)),
  ]
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const points = []
for (let r = 0; r < ROWS; r++) {
  const lat = SAT.maxLat - (r / (ROWS - 1)) * (SAT.maxLat - SAT.minLat)
  for (let c = 0; c < COLS; c++) {
    const lon = SAT.minLon + (c / (COLS - 1)) * (SAT.maxLon - SAT.minLon)
    points.push({ lat, lon })
  }
}

const heights = []
for (const batch of chunk(points, 80)) {
  const url = new URL('https://api.open-meteo.com/v1/elevation')
  url.searchParams.set('latitude', batch.map((p) => p.lat.toFixed(6)).join(','))
  url.searchParams.set('longitude', batch.map((p) => p.lon.toFixed(6)).join(','))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`elevation ${res.status}`)
  const json = await res.json()
  const elev = json.elevation
  if (!Array.isArray(elev) || elev.length !== batch.length) throw new Error('elevation length mismatch')
  heights.push(...elev)
}

const [originX, originZ] = toLocal(SAT.maxLat, SAT.minLon)
const [farX, farZ] = toLocal(SAT.minLat, SAT.maxLon)
const grid = []
for (let r = 0; r < ROWS; r++) {
  grid.push(heights.slice(r * COLS, r * COLS + COLS).map((h) => Number(h.toFixed(2))))
}

let existing = { lawns: [], walks: [], streets: [], steps: [], plazas: [], paths: [] }
try {
  existing = JSON.parse(await readFile(dest, 'utf8'))
} catch {
  // start fresh
}

const out = {
  origin: ORIGIN,
  source:
    'OpenStreetMap-aligned reconstruction of University Park. Heights from Open-Meteo / Copernicus DEM. First slice: Doheny west steps to Tommy to Bovard lawn.',
  lawns: existing.lawns ?? [],
  walks: existing.walks ?? [],
  streets: existing.streets ?? [],
  steps: existing.steps ?? [],
  plazas: existing.plazas ?? [],
  paths: existing.paths ?? [],
  elevation: {
    originX,
    originZ,
    stepX: (farX - originX) / (COLS - 1),
    stepZ: (farZ - originZ) / (ROWS - 1),
    width: COLS,
    height: ROWS,
    heights: grid,
  },
}

await writeFile(dest, `${JSON.stringify(out)}\n`)
const flat = heights
const min = Math.min(...flat)
const max = Math.max(...flat)
console.log(`wrote elevation ${COLS}x${ROWS} min=${min} max=${max} origin=${originX},${originZ}`)
