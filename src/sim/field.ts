import type { FieldSeed } from '../game/scenarios'
import { coverAt, type Cover } from '../game/ground'
import { BUILDINGS, DOHENY } from '../game/world'
import type { Field, HeatZone, HotCell } from './types'

const BOVARD = { x: -9.1, z: -47.5 }

export const SECTOR = { minX: -70, maxX: 220, minZ: -40, maxZ: 90 }
export const CELL = 4
export const DOOR = { x: 111.4, z: 48.2 }
export const APRON = { x: 103.4, z: 48.2 }
export const TOMMY = { x: 0, z: 0 }

const CONDUCT: Record<Cover, number> = {
  street: 0.7,
  walkway: 0.55,
  plaza: 0.5,
  steps: 0.45,
  dirt: 0.4,
  lawn: 0.28,
}

const WIND_X = 0.65
const WIND_Z = 0.25
const SPREAD = 0.07
const MAX_HOT = 160

function pointInRing(x: number, z: number, ring: Array<[number, number]>) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const zi = ring[i][1]
    const xj = ring[j][0]
    const zj = ring[j][1]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi) {
      inside = !inside
    }
  }
  return inside
}

function inDoheny(x: number, z: number) {
  return pointInRing(x, z, DOHENY.outer)
}

export function createField(): Field {
  const width = Math.ceil((SECTOR.maxX - SECTOR.minX) / CELL)
  const height = Math.ceil((SECTOR.maxZ - SECTOR.minZ) / CELL)
  const n = width * height
  const field: Field = {
    originX: SECTOR.minX,
    originZ: SECTOR.minZ,
    step: CELL,
    width,
    height,
    heat: new Float32Array(n),
    smoke: new Float32Array(n),
    fuel: new Float32Array(n),
    nextHeat: new Float32Array(n),
    nextSmoke: new Float32Array(n),
    conduct: new Float32Array(n),
    blocked: new Uint8Array(n),
    hot: [],
  }

  for (let iz = 0; iz < height; iz++) {
    for (let ix = 0; ix < width; ix++) {
      const i = ix + iz * width
      const x = field.originX + (ix + 0.5) * CELL
      const z = field.originZ + (iz + 0.5) * CELL
      let blocked = 0
      for (const b of BUILDINGS) {
        if (b.enterable) continue
        if (pointInRing(x, z, b.outer)) {
          blocked = 1
          break
        }
      }
      field.blocked[i] = blocked
      if (blocked) {
        field.conduct[i] = 0
        continue
      }
      field.conduct[i] = inDoheny(x, z) ? 0.85 : CONDUCT[coverAt(x, z)]
    }
  }

  return field
}

export function seedField(field: Field, seed: FieldSeed = 'doheny') {
  if (seed === 'none') {
    collectHot(field)
    return
  }
  const { width, height, step, originX, originZ } = field
  for (let iz = 0; iz < height; iz++) {
    for (let ix = 0; ix < width; ix++) {
      const i = ix + iz * width
      if (field.blocked[i]) continue
      const x = originX + (ix + 0.5) * step
      const z = originZ + (iz + 0.5) * step
      if (seed === 'bovard') {
        const d = Math.hypot(x - BOVARD.x, z - BOVARD.z)
        if (d < 22 && z > -58 && x < 10) {
          field.heat[i] = d < 12 ? 0.42 : 0.28
          field.fuel[i] = 0.16
          field.smoke[i] = 0.14
        }
        continue
      }
      if (inDoheny(x, z)) {
        const inner = Math.hypot(x - DOHENY.cx, z - DOHENY.cz)
        field.heat[i] = inner < 12 ? 0.96 : 0.92
        field.fuel[i] = 1
        field.smoke[i] = 0.55
        continue
      }
      const apron = Math.hypot(x - APRON.x, z - APRON.z)
      const door = Math.hypot(x - DOOR.x, z - DOOR.z)
      if (apron < 7 || door < 6) {
        field.heat[i] = 0.38
        field.fuel[i] = 0.25
        field.smoke[i] = 0.22
      }
    }
  }
  collectHot(field)
}

function sampleIndex(field: Field, x: number, z: number) {
  const fx = (x - field.originX) / field.step - 0.5
  const fz = (z - field.originZ) / field.step - 0.5
  const ix = Math.max(0, Math.min(field.width - 1, fx))
  const iz = Math.max(0, Math.min(field.height - 1, fz))
  return { ix, iz }
}

function inSector(x: number, z: number) {
  return x >= SECTOR.minX && x <= SECTOR.maxX && z >= SECTOR.minZ && z <= SECTOR.maxZ
}

export function heatAt(field: Field, x: number, z: number) {
  if (!inSector(x, z)) return 0
  const { width, height, heat, blocked } = field
  const { ix, iz } = sampleIndex(field, x, z)
  const x0 = Math.floor(ix)
  const z0 = Math.floor(iz)
  const x1 = Math.min(width - 1, x0 + 1)
  const z1 = Math.min(height - 1, z0 + 1)
  const tx = ix - x0
  const tz = iz - z0
  const h = (xi: number, zi: number) => {
    const i = xi + zi * width
    return blocked[i] ? 0 : heat[i]
  }
  return h(x0, z0) * (1 - tx) * (1 - tz) + h(x1, z0) * tx * (1 - tz) + h(x0, z1) * (1 - tx) * tz + h(x1, z1) * tx * tz
}

export function smokeAt(field: Field, x: number, z: number) {
  if (!inSector(x, z)) return 0
  const { width, smoke } = field
  const { ix, iz } = sampleIndex(field, x, z)
  const x0 = Math.floor(ix)
  const z0 = Math.floor(iz)
  const x1 = Math.min(field.width - 1, x0 + 1)
  const z1 = Math.min(field.height - 1, z0 + 1)
  const tx = ix - x0
  const tz = iz - z0
  const s = (xi: number, zi: number) => smoke[xi + zi * width]
  return s(x0, z0) * (1 - tx) * (1 - tz) + s(x1, z0) * tx * (1 - tz) + s(x0, z1) * (1 - tx) * tz + s(x1, z1) * tx * tz
}

export function zoneAt(heat: number): HeatZone {
  if (heat >= 0.78) return 'nogo'
  if (heat >= 0.45) return 'hot'
  if (heat >= 0.15) return 'warm'
  return 'safe'
}

let hotClock = 0

/** One-way: hotter neighbors ignite this cell. Heat does not average away. */
function igniteFromNeighbors(field: Field, ix: number, iz: number, dt: number) {
  const { width, height, heat, blocked, conduct } = field
  const i = ix + iz * width
  const self = heat[i]
  let add = 0
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const
  for (const [dx, dz] of dirs) {
    const nx = ix + dx
    const nz = iz + dz
    if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue
    const ni = nx + nz * width
    if (blocked[ni]) continue
    const other = heat[ni]
    if (other <= self) continue
    const align = -dx * WIND_X - dz * WIND_Z
    const bias = 1 + 0.45 * align
    const k = (conduct[i] + conduct[ni]) * 0.5
    add += dt * SPREAD * k * (other - self) * bias
  }
  return add
}

export function spreadField(field: Field, dt: number) {
  const { width, height, heat, smoke, fuel, nextHeat, nextSmoke, blocked } = field
  const n = width * height
  for (let iz = 0; iz < height; iz++) {
    for (let ix = 0; ix < width; ix++) {
      const i = ix + iz * width
      if (blocked[i]) {
        nextHeat[i] = 0
        nextSmoke[i] = 0
        continue
      }
      let h = heat[i] + igniteFromNeighbors(field, ix, iz, dt)
      h += dt * 0.04 * fuel[i] * h
      h = Math.max(0, Math.min(1, h))
      fuel[i] = Math.max(0, fuel[i] - dt * 0.02 * h)

      const ux = Math.max(0, ix - 1)
      const uz = Math.max(0, iz - 1)
      const upwind = heat[ux + uz * width]
      const sm = Math.max(smoke[i] * 0.992, upwind * 0.8, h * 0.35)
      nextHeat[i] = h
      nextSmoke[i] = Math.min(1, sm)
    }
  }
  heat.set(nextHeat.subarray(0, n))
  smoke.set(nextSmoke.subarray(0, n))
  hotClock += 1
  if (hotClock % 3 === 0) collectHot(field)
}

function collectHot(field: Field) {
  const { width, height, heat, smoke, blocked, originX, originZ, step } = field
  const scored: HotCell[] = []
  for (let iz = 0; iz < height; iz++) {
    for (let ix = 0; ix < width; ix++) {
      const i = ix + iz * width
      if (blocked[i] || heat[i] < 0.2) continue
      scored.push({
        x: originX + (ix + 0.5) * step,
        z: originZ + (iz + 0.5) * step,
        heat: heat[i],
        smoke: smoke[i],
      })
    }
  }
  scored.sort((a, b) => b.heat - a.heat)
  field.hot = scored.length > MAX_HOT ? scored.slice(0, MAX_HOT) : scored
}
