export type Ring = Array<[number, number]>

export type CampusBuilding = {
  id: string
  name: string
  height: number
  fire: boolean
  enterable: boolean
  brick: boolean
  outer: Ring
  inners: Ring[]
  cx: number
  cz: number
}

export type CampusLandmark = {
  name: string
  kind: 'statue' | 'fountain' | 'tree'
  x: number
  z: number
}

export type CampusFile = {
  origin: { lat: number; lon: number; name: string }
  sat: {
    minLon: number
    minLat: number
    maxLon: number
    maxLat: number
    url: string
  }
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  spawn: { x: number; z: number; yaw: number }
  buildings: CampusBuilding[]
  landmarks: CampusLandmark[]
  trees: Array<[number, number]>
  survivors: Array<{
    id: string
    name: string
    role: string
    x: number
    z: number
    y: number
    note: string
  }>
  attribution: string
}
