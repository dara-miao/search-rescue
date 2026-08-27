import { CAMPUS, DOHENY, DOHENY_DOOR } from './world'
import { GOOGLE_MAPS_KEY, latLonToLocal, localToLatLon, yawToHeading } from './maps'

export type PlaceLabel = {
  id: string
  name: string
  x: number
  z: number
  kind: string
}

export type IngressMeta = {
  meters: number
  minutes: number
  summary: string
}

export type CampusGoogle = {
  places: PlaceLabel[]
  path: Array<[number, number]>
  meta: IngressMeta | null
}

type NearbyResult = {
  place_id?: string
  name?: string
  types?: string[]
  geometry?: { location?: { lat: number; lng: number } }
}

type DirectionsLeg = {
  distance?: { value?: number; text?: string }
  duration?: { value?: number; text?: string }
}

const SKIP_NAME = /parking|atm|lot\b|garage|vending|bus stop|transit|restroom/i
const SKIP_TYPE = new Set(['parking', 'atm', 'car_dealer', 'gas_station', 'route'])

function mapsUrl(path: string, params: Record<string, string>) {
  const url = new URL(`/maps/api/${path}`, window.location.origin)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  if (GOOGLE_MAPS_KEY) url.searchParams.set('key', GOOGLE_MAPS_KEY)
  return url.toString()
}

export function streetViewImageUrl(opts: {
  lat?: number
  lon?: number
  pano?: string
  heading: number
  pitch: number
  fov?: number
}) {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview')
  url.searchParams.set('size', '640x400')
  url.searchParams.set('heading', opts.heading.toFixed(1))
  url.searchParams.set('pitch', opts.pitch.toFixed(1))
  url.searchParams.set('fov', String(opts.fov ?? 78))
  url.searchParams.set('source', 'outdoor')
  url.searchParams.set('return_error_code', 'true')
  if (opts.pano) url.searchParams.set('pano', opts.pano)
  else if (opts.lat != null && opts.lon != null) {
    url.searchParams.set('location', `${opts.lat},${opts.lon}`)
  }
  if (GOOGLE_MAPS_KEY) url.searchParams.set('key', GOOGLE_MAPS_KEY)
  return url.toString()
}

export async function streetViewMeta(lat: number, lon: number) {
  const res = await fetch(
    mapsUrl('streetview/metadata', {
      location: `${lat},${lon}`,
      radius: '42',
      source: 'outdoor',
    }),
  )
  if (!res.ok) throw new Error('streetview metadata failed')
  return (await res.json()) as {
    status: string
    pano_id?: string
    location?: { lat: number; lng: number }
  }
}

function shortName(name: string) {
  return name
    .replace(/Edward L\.?\s*Doheny Jr\.?\s*Memorial Library/i, 'Doheny Memorial Library')
    .replace(/Ronald Tutor Campus Center/i, 'Tutor Campus Center')
    .replace(/Bovard Administration Building/i, 'Bovard Administration')
    .replace(/,.+$/, '')
    .trim()
}

function placeKind(types: string[]) {
  if (types.includes('library')) return 'library'
  if (types.includes('park')) return 'park'
  if (types.includes('museum')) return 'museum'
  if (types.includes('university')) return 'campus'
  if (types.includes('tourist_attraction')) return 'landmark'
  return 'place'
}

function keepPlace(place: NearbyResult) {
  const name = place.name?.trim() ?? ''
  if (name.length < 3 || SKIP_NAME.test(name)) return false
  const types = place.types ?? []
  if (types.some((t) => SKIP_TYPE.has(t))) return false
  if (types.includes('locality') || types.includes('administrative_area_level_1')) return false
  return Boolean(place.geometry?.location)
}

export function decodePolyline(encoded: string): Array<{ lat: number; lon: number }> {
  const pts: Array<{ lat: number; lon: number }> = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let b: number
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    pts.push({ lat: lat / 1e5, lon: lng / 1e5 })
  }
  return pts
}

export async function fetchCampusGoogle(): Promise<CampusGoogle> {
  if (!GOOGLE_MAPS_KEY) {
    return { places: [], path: [], meta: null }
  }

  const origin = localToLatLon(CAMPUS.spawn.x, CAMPUS.spawn.z)
  const destX = DOHENY_DOOR ? (DOHENY_DOOR.ax + DOHENY_DOOR.bx) / 2 : DOHENY.cx
  const destZ = DOHENY_DOOR ? (DOHENY_DOOR.az + DOHENY_DOOR.bz) / 2 : DOHENY.cz
  const dest = localToLatLon(destX, destZ)

  const [placesRes, dirsRes] = await Promise.all([
    fetch(
      mapsUrl('place/nearbysearch/json', {
        location: `${origin.lat},${origin.lon}`,
        radius: '280',
      }),
    ),
    fetch(
      mapsUrl('directions/json', {
        origin: `${origin.lat},${origin.lon}`,
        destination: `${dest.lat},${dest.lon}`,
        mode: 'walking',
      }),
    ),
  ])

  const placesJson = (await placesRes.json()) as {
    status?: string
    results?: NearbyResult[]
  }
  const dirsJson = (await dirsRes.json()) as {
    status?: string
    routes?: Array<{
      summary?: string
      overview_polyline?: { points?: string }
      legs?: DirectionsLeg[]
    }>
  }

  const places: PlaceLabel[] = []
  const seen = new Set<string>()
  for (const raw of placesJson.results ?? []) {
    if (!keepPlace(raw)) continue
    const loc = raw.geometry?.location
    if (!loc) continue
    const name = shortName(raw.name ?? '')
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const local = latLonToLocal(loc.lat, loc.lng)
    places.push({
      id: raw.place_id ?? key,
      name,
      x: local.x,
      z: local.z,
      kind: placeKind(raw.types ?? []),
    })
    if (places.length >= 14) break
  }

  const route = dirsJson.routes?.[0]
  const encoded = route?.overview_polyline?.points ?? ''
  const path = encoded
    ? decodePolyline(encoded).map((p) => {
        const local = latLonToLocal(p.lat, p.lon)
        return [local.x, local.z] as [number, number]
      })
    : []

  const leg = route?.legs?.[0]
  const meta: IngressMeta | null = route
    ? {
        meters: Math.round(leg?.distance?.value ?? 0),
        minutes: Math.max(1, Math.round((leg?.duration?.value ?? 60) / 60)),
        summary: route.summary || 'walking',
      }
    : null

  return { places, path, meta }
}

export function mastStreetViewArgs(robot: { x: number; z: number; yaw: number; pitch: number }) {
  const geo = localToLatLon(robot.x, robot.z)
  const heading = yawToHeading(robot.yaw)
  const pitch = Math.max(-18, Math.min(22, (robot.pitch * 180) / Math.PI))
  return { ...geo, heading, pitch }
}
