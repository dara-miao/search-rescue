import type { HoldState, RunState } from './types'

export function holdFrac(hold: HoldState) {
  if (hold.kind === 'idle' || hold.need <= 0) return 0
  return Math.min(1, hold.progress / hold.need)
}

/** Ground point the hold is working on — extraction for rescue, victim otherwise. */
export function holdAnchor(state: Pick<RunState, 'hold' | 'victims' | 'extractions'>) {
  const { hold } = state
  if (hold.kind === 'idle' || !hold.targetId) return null
  const victim = state.victims.find((v) => v.id === hold.targetId)
  if (!victim) return null
  if (hold.kind === 'rescue') {
    const ext =
      state.extractions.find((e) => e.cellId === victim.cellId) ??
      state.extractions.find((e) => e.floor === Math.min(victim.floor, 1) && e.row === victim.row && e.col === victim.col)
    if (ext) return { x: ext.x, z: ext.z, kind: hold.kind as const }
  }
  return { x: victim.x, z: victim.z, kind: hold.kind as const }
}

export const HOLD_COLOR = {
  scan: '#5ad0e8',
  rescue: '#c9a227',
  mark: '#efe6d6',
} as const
