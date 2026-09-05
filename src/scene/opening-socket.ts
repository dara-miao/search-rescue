import { site } from '../data/site'
import type { Extraction, FireCell } from '../run/types'
import { MASSING_CONFIG } from './doheny-massing.js'

export type OpeningSocket = {
  x: number
  y: number
  z: number
  nx: number
  nz: number
  facade: FireCell['facades'][number]
}

function outward(facade: FireCell['facades'][number], angle: number) {
  const local =
    facade === 'south'
      ? { x: 0, z: 1 }
      : facade === 'north'
        ? { x: 0, z: -1 }
        : facade === 'east'
          ? { x: 1, z: 0 }
          : { x: -1, z: 0 }
  const c = Math.cos(-angle)
  const s = Math.sin(-angle)
  return { x: local.x * c + local.z * s, z: -local.x * s + local.z * c }
}

/** Mid-window point just outside the glass, facing the lawn. */
export function socketsFor(cell: FireCell): OpeningSocket[] {
  const θ = site.building.orientedBounds.angleRad
  const y = cell.floor * MASSING_CONFIG.storeyHeight + MASSING_CONFIG.storeyHeight * 0.55
  return cell.facades.map((facade) => {
    const n = outward(facade, θ)
    const along = facade === 'north' || facade === 'south' ? cell.size.z * 0.5 : cell.size.x * 0.5
    return {
      x: cell.centre.x + n.x * (along + 0.55),
      y,
      z: cell.centre.z + n.z * (along + 0.55),
      nx: n.x,
      nz: n.z,
      facade,
    }
  })
}

export function openingSocket(cell: FireCell, facade?: Extraction['facade'] | null): OpeningSocket | null {
  const all = socketsFor(cell)
  if (!all.length) return null
  return (facade && all.find((s) => s.facade === facade)) || all[0]
}
