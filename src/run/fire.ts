import { neighbor } from './layout'
import type { FireCell, FireEvent } from './types'

const K_LATERAL = 0.9
const K_UP = 2.7
const K_DOWN = 0.0028
const CORE_MULT = 2.2
const BURN = 1.2
/** Spec k values equalize a floor in seconds. Scale conduction so cores last toward 4:00. */
const CONDUCT = 0.05
const VENT = 70
const PRE = 62
export const FIRE_HZ = 4
export const FIRE_DT = 1 / FIRE_HZ

function laterals(cells: FireCell[], cell: FireCell) {
  return [
    neighbor(cells, cell, 0, -1),
    neighbor(cells, cell, 1, 0),
    neighbor(cells, cell, 0, 1),
    neighbor(cells, cell, -1, 0),
  ].filter((c): c is FireCell => Boolean(c))
}

export function stepFireTick(cells: FireCell[]): Array<{ kind: 'vent' | 'pre'; cell: FireCell }> {
  const events: Array<{ kind: 'vent' | 'pre'; cell: FireCell }> = []
  const next = new Map<string, number>()

  for (const cell of cells) {
    if (cell.vented) {
      next.set(cell.id, cell.heat)
      continue
    }
    let inflow = 0
    for (const other of laterals(cells, cell)) {
      const k = cell.isCore || other.isCore ? K_LATERAL * CORE_MULT : K_LATERAL
      inflow += Math.max(0, other.heat - cell.heat) * k * FIRE_DT * CONDUCT
    }
    const above = neighbor(cells, cell, 0, 0, 1)
    if (above) inflow += Math.max(0, above.heat - cell.heat) * K_DOWN * FIRE_DT
    const below = neighbor(cells, cell, 0, 0, -1)
    if (below) inflow += Math.max(0, below.heat - cell.heat) * K_UP * FIRE_DT * CONDUCT
    let heat = Math.min(100, cell.heat + inflow)
    if (heat > 20) heat = Math.min(100, heat + BURN * FIRE_DT)
    next.set(cell.id, heat)
  }

  for (const cell of cells) {
    const heat = next.get(cell.id) ?? cell.heat
    const was = cell.heat
    cell.heat = heat
    if (!cell.vented && heat >= VENT) {
      cell.vented = true
      cell.preVent = true
      events.push({ kind: 'vent', cell })
      for (const other of laterals(cells, cell)) {
        if (!other.vented) other.heat = Math.min(100, other.heat + 35)
      }
      const up = neighbor(cells, cell, 0, 0, 1)
      if (up && !up.vented) up.heat = Math.min(100, up.heat + 45)
    } else if (!cell.vented && was < PRE && heat >= PRE) {
      cell.preVent = true
      events.push({ kind: 'pre', cell })
    }
  }

  return events
}

export function stepFire(cells: FireCell[], dt: number, t0: number, acc0: number): {
  acc: number
  events: FireEvent[]
} {
  let acc = acc0 + dt
  const events: FireEvent[] = []
  let t = t0 - acc0
  while (acc >= FIRE_DT) {
    acc -= FIRE_DT
    t += FIRE_DT
    for (const ev of stepFireTick(cells)) {
      events.push({ t, cellId: ev.cell.id, roomName: ev.cell.roomName, kind: ev.kind })
    }
  }
  return { acc, events }
}

export function fireIntensityOf(cells: FireCell[]): number {
  let vented = 0
  let heat = 0
  for (const c of cells) {
    if (c.vented) vented++
    if (c.heat > heat) heat = c.heat
  }
  return Math.min(1, vented / 36 + heat / 220)
}

export function windowHeatLookup(cells: FireCell[]) {
  const byKey = new Map<string, number>()
  for (const c of cells) {
    for (const facade of c.facades) {
      const key = `${c.floor}:${facade}`
      byKey.set(key, Math.max(byKey.get(key) ?? 0, c.heat))
    }
  }
  return (info: { floor: number; facade: string }) => byKey.get(`${info.floor}:${info.facade}`) ?? 0
}

export function allVented(cells: FireCell[]): boolean {
  return cells.length > 0 && cells.every((c) => c.vented)
}

export function ventedCount(cells: FireCell[]) {
  let vented = 0
  for (const c of cells) if (c.vented) vented++
  return { vented, total: cells.length }
}
