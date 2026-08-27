import { campus } from './world'

export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

export const TOMMY_GEO = {
  lat: campus.origin.lat,
  lon: campus.origin.lon,
}

const METERS_PER_DEG_LAT = 110540
const cosOrigin = Math.cos((campus.origin.lat * Math.PI) / 180)
const metersPerDegLon = 111320 * cosOrigin

export function hasGoogleKey() {
  return Boolean(GOOGLE_MAPS_KEY && GOOGLE_MAPS_KEY.startsWith('AIza'))
}

export function hasGoogleTiles() {
  return hasGoogleKey()
}

export function localToLatLon(x: number, z: number) {
  return {
    lat: campus.origin.lat - z / METERS_PER_DEG_LAT,
    lon: campus.origin.lon + x / metersPerDegLon,
  }
}

export function latLonToLocal(lat: number, lon: number) {
  return {
    x: (lon - campus.origin.lon) * metersPerDegLon,
    z: (campus.origin.lat - lat) * METERS_PER_DEG_LAT,
  }
}

export function yawToHeading(yaw: number) {
  return ((yaw * 180) / Math.PI + 360) % 360
}

export function headingDelta(a: number, b: number) {
  return Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
}
