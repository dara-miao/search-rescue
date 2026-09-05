import { dist } from './layout'
import type { Condition, Extraction, FireCell, RescueType, RunState, Signature, Victim } from './types'

export type LiveOpening = {
  ext: Extraction
  cell: FireCell
  dist: number
  waiting: number
}

/** Closest non-vented extraction. */
export function nearestLiveOpening(
  x: number,
  z: number,
  state: Pick<RunState, 'extractions' | 'cells' | 'victims'>,
): LiveOpening | null {
  let best: LiveOpening | null = null
  for (const ext of state.extractions) {
    const cell = state.cells.find((c) => c.id === ext.cellId)
    if (!cell || cell.vented) continue
    const waiting = state.victims.filter((v) => v.cellId === ext.cellId && v.state === 'WAITING').length
    const d = dist(x, z, ext.x, ext.z)
    if (!best || d < best.dist) best = { ext, cell, dist: d, waiting }
  }
  return best
}

/** Closest live opening that still has someone waiting. Falls back to any live opening. */
export function nearestPlayOpening(
  x: number,
  z: number,
  state: Pick<RunState, 'extractions' | 'cells' | 'victims'>,
): LiveOpening | null {
  let best: LiveOpening | null = null
  for (const ext of state.extractions) {
    const cell = state.cells.find((c) => c.id === ext.cellId)
    if (!cell || cell.vented) continue
    const waiting = state.victims.filter((v) => v.cellId === ext.cellId && v.state === 'WAITING').length
    if (!waiting) continue
    const d = dist(x, z, ext.x, ext.z)
    if (!best || d < best.dist) best = { ext, cell, dist: d, waiting }
  }
  return best ?? nearestLiveOpening(x, z, state)
}

export function thermalRead(signature: Signature) {
  if (signature === 'STRONG') return 'bright'
  if (signature === 'FAINT') return 'faint'
  return 'dim'
}

export function typeLabel(type: RescueType) {
  if (type === 'SELF_EXTRACT') return 'walk-out'
  if (type === 'ASSISTED') return 'needs help'
  if (type === 'GROUP') return 'group'
  return 'unreachable'
}

export function conditionLabel(condition: Condition) {
  if (condition === 'DETERIORATING') return 'deteriorating'
  if (condition === 'CRITICAL') return 'critical'
  return 'stable'
}

export function revealLine(victim: Pick<Victim, 'condition' | 'type' | 'count' | 'roomName'>) {
  return `${conditionLabel(victim.condition)} · ${typeLabel(victim.type)} · ${victim.count} · ${victim.roomName}`
}
