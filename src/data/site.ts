import raw from './site-data.json'

export type Vec2 = { x: number; z: number }

export type FireCell = {
  id: string
  floor: number
  col: number
  row: number
  isCore: boolean
  facades: Array<'north' | 'south' | 'east' | 'west'>
  centre: Vec2
  size: { w?: number; d?: number; x?: number; z?: number }
}

export type SiteData = {
  source?: {
    osm: string
    name: string | null
    license: string
    retrieved: string
  }
  origin: { lat: number; lon: number }
  projection: string
  license?: string
  building: {
    osmId?: string
    name?: string
    footprint: Vec2[]
    holes: Vec2[][]
    centroid: Vec2
    areaSqM: number
    levels: number
    levelSource: 'osm' | 'fallback'
    heightM: number
    orientedBounds: {
      width: number
      depth: number
      angleRad: number
      angleDeg?: number
      angleNormalizedDeg: number
      centre: Vec2
    }
  }
  fireGrid: {
    cols: number
    rows: number
    floors: number
    discardedOutsideFootprint: number
    cells: FireCell[]
  }
}

export const site = raw as SiteData

export function cellSize(cell: FireCell) {
  return {
    x: cell.size.w ?? cell.size.x ?? 0,
    z: cell.size.d ?? cell.size.z ?? 0,
  }
}

export function buildingName() {
  return site.source?.name || site.building.name || 'Doheny Memorial Library'
}

export function osmId() {
  return site.source?.osm || site.building.osmId
}

export function attribution() {
  return site.source?.license || site.license || '© OpenStreetMap contributors (ODbL)'
}

export function footprintBounds(pad = 0) {
  const pts = site.building.footprint
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
    width: maxX - minX + pad * 2,
    depth: maxZ - minZ + pad * 2,
    centre: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
  }
}

export function southFacadeCells(floor = 0) {
  return site.fireGrid.cells.filter((c) => c.floor === floor && c.facades.includes('south'))
}

export function northFacadeCells(floor = 0) {
  return site.fireGrid.cells.filter((c) => c.floor === floor && c.facades.includes('north'))
}

export function meanZ(cells: FireCell[]) {
  if (!cells.length) return 0
  return cells.reduce((s, c) => s + c.centre.z, 0) / cells.length
}
