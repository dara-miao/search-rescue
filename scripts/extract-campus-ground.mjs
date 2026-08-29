import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = { lat: 34.0205678, lon: -118.2854346 }
const BBOX = '34.0186,-118.2884,34.0234,-118.2814'
const cos = Math.cos((ORIGIN.lat * Math.PI) / 180)

function toLocal(lat, lon) {
  return [
    Number(((lon - ORIGIN.lon) * (111320 * cos)).toFixed(2)),
    Number(((ORIGIN.lat - lat) * 110540).toFixed(2)),
  ]
}

function classify(tags) {
  const highway = tags.highway ?? ''
  if (highway === 'steps') return 'steps'
  if (/footway|path|pedestrian|cycleway/.test(highway)) return 'walkway'
  if (/service|residential|unclassified|tertiary/.test(highway)) return 'street'
  if (tags.landuse === 'grass' || /park|garden|pitch/.test(tags.leisure ?? '')) return 'lawn'
  if (tags.amenity === 'fountain' || tags.place === 'square') return 'plaza'
  return null
}

function ring(geom) {
  if (!geom?.length) return []
  return geom.map((p) => toLocal(p.lat, p.lon))
}

const query = `
[out:json][timeout:90];
(
  way["highway"~"^(footway|path|steps|pedestrian|cycleway|service|residential)$"](${BBOX});
  way["landuse"="grass"](${BBOX});
  way["leisure"~"^(park|garden|pitch)$"](${BBOX});
  way["amenity"="fountain"](${BBOX});
);
out geom;
`

const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

let json = null
for (const url of endpoints) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!res.ok) continue
    json = await res.json()
    if (json?.elements) break
  } catch {
    // try next mirror
  }
}

if (!json?.elements) throw new Error('Overpass returned no elements')

const lawns = []
const walks = []
const streets = []
const steps = []
const plazas = []
const paths = []

for (const el of json.elements) {
  if (el.type !== 'way' || !el.geometry) continue
  const kind = classify(el.tags ?? {})
  if (!kind) continue
  const polygon = ring(el.geometry)
  if (polygon.length < 2) continue
  const closed = polygon.length >= 4 && el.geometry[0] && el.geometry.at(-1)
    && el.geometry[0].lat === el.geometry.at(-1).lat
    && el.geometry[0].lon === el.geometry.at(-1).lon
  const feature = { polygon, cover: kind }
  if (kind === 'lawn' && closed) lawns.push(feature)
  else if (kind === 'plaza' && closed) plazas.push(feature)
  else if (kind === 'steps') {
    if (closed) steps.push(feature)
    paths.push(polygon)
  } else if (kind === 'street') {
    if (closed) streets.push(feature)
    paths.push(polygon)
  } else {
    if (closed) walks.push(feature)
    paths.push(polygon)
  }
}

const out = {
  origin: ORIGIN,
  source: 'OpenStreetMap contributors (ODbL). Layout is a 3D reconstruction, not an official survey.',
  lawns,
  walks,
  streets,
  steps,
  plazas,
  paths,
}

const dest = join(root, 'src/data/ground.json')
await writeFile(dest, JSON.stringify(out))
console.log(
  `wrote ${dest} lawns=${lawns.length} walks=${walks.length} streets=${streets.length} steps=${steps.length} plazas=${plazas.length} paths=${paths.length}`,
)
