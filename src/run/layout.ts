import { cellSize, site } from '../data/site'
import { keepOffFootprint } from '../drive/hull'
import { nameCell } from './rooms'
import type { Extraction, FireCell } from './types'

export function facadeDir(facade: Extraction['facade']) {
  const θ = site.building.orientedBounds.angleRad
  if (facade === 'south') return { x: -Math.sin(θ), z: Math.cos(θ) }
  if (facade === 'north') return { x: Math.sin(θ), z: -Math.cos(θ) }
  if (facade === 'east') return { x: Math.cos(θ), z: Math.sin(θ) }
  return { x: -Math.cos(θ), z: -Math.sin(θ) }
}

export function primaryFacade(facades: FireCell['facades']): Extraction['facade'] | null {
  if (facades.includes('south')) return 'south'
  if (facades.includes('north')) return 'north'
  if (facades.includes('east')) return 'east'
  if (facades.includes('west')) return 'west'
  return null
}

export function outsidePoint(cell: { centre: { x: number; z: number }; size: FireCell['size']; facades: FireCell['facades'] }) {
  const face = primaryFacade(cell.facades)
  const dir = face ? facadeDir(face) : { x: 0, z: 1 }
  const sz = cellSize({ ...cell, size: cell.size } as never)
  const reach = Math.max(sz.x, sz.z) * 0.5 + 5.2
  const raw = { x: cell.centre.x + dir.x * reach, z: cell.centre.z + dir.z * reach }
  const held = keepOffFootprint(raw.x, raw.z, 1.4)
  return { x: held.x, z: held.z, facade: face }
}

export function siteCells(): FireCell[] {
  return site.fireGrid.cells.map((c) => ({
    id: c.id,
    floor: c.floor,
    col: c.col,
    row: c.row,
    isCore: c.isCore,
    facades: c.facades,
    centre: c.centre,
    size: { x: c.size.w ?? c.size.x ?? 0, z: c.size.d ?? c.size.z ?? 0 },
    roomName: nameCell(c),
    heat: 0,
    vented: false,
    preVent: false,
  }))
}

export function openingFor(cell: FireCell) {
  if (cell.facades.includes('south') && (cell.col === 0 || cell.col === 1)) {
    return { opening: 'Main doors', fast: true }
  }
  if (cell.facades.includes('south')) return { opening: 'Tall windows', fast: false }
  if (cell.facades.includes('north')) return { opening: 'Service door / high windows', fast: false }
  if (cell.facades.includes('east')) return { opening: 'East windows', fast: false }
  return { opening: 'West windows', fast: false }
}

export function makeExtractions(cells: FireCell[]): Extraction[] {
  const out: Extraction[] = []
  for (const cell of cells) {
    if (cell.floor > 1) continue
    const face = primaryFacade(cell.facades)
    if (!face) continue
    const pos = outsidePoint(cell)
    const meta = openingFor(cell)
    out.push({
      id: `ex-${cell.id}`,
      cellId: cell.id,
      floor: cell.floor,
      col: cell.col,
      row: cell.row,
      facade: face,
      opening: cell.floor === 0 ? `Light well · ${meta.opening}` : meta.opening,
      fast: cell.floor === 1 && meta.fast,
      x: pos.x,
      z: pos.z,
    })
  }
  return out
}

export function cellById(cells: FireCell[], id: string) {
  return cells.find((c) => c.id === id) ?? null
}

export function dist(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(ax - bx, az - bz)
}

type SpeedZone = { x: number; z: number; north: boolean; west: boolean }
let speedZones: SpeedZone[] | null = null

function zonesFor(cells: FireCell[]) {
  if (speedZones) return speedZones
  speedZones = []
  for (const cell of cells) {
    if (cell.floor > 1 || cell.isCore) continue
    if (!cell.facades.includes('north') && !cell.facades.includes('west')) continue
    const out = outsidePoint(cell)
    speedZones.push({
      x: out.x,
      z: out.z,
      north: cell.facades.includes('north'),
      west: cell.facades.includes('west'),
    })
  }
  return speedZones
}

/** North face 60% within 5m; west face 70% within 6m. The slower one wins. */
export function speedScaleAt(x: number, z: number, cells: FireCell[]) {
  let scale = 1
  for (const zone of zonesFor(cells)) {
    const d = dist(x, z, zone.x, zone.z)
    if (zone.north && d < 5) scale = Math.min(scale, 0.6)
    if (zone.west && d < 6) scale = Math.min(scale, 0.7)
  }
  return scale
}

export function nearVentedFacade(x: number, z: number, cells: FireCell[], radius = 8) {
  for (const cell of cells) {
    if (!cell.vented || cell.isCore || cell.facades.length === 0) continue
    const out = outsidePoint(cell)
    if (dist(x, z, out.x, out.z) < radius) return true
  }
  return false
}

export function neighbor(
  cells: FireCell[],
  cell: FireCell,
  dcol: number,
  drow: number,
  dfloor = 0,
) {
  return (
    cells.find(
      (c) => c.floor === cell.floor + dfloor && c.col === cell.col + dcol && c.row === cell.row + drow,
    ) ?? null
  )
}
