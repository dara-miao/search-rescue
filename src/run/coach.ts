import { nearestPlayOpening } from './opening'
import type { HoldKind, Reveal, RunState } from './types'

export type CoachStep = 'off' | 'drive' | 'opening' | 'assess' | 'rescue'

export function coachCopy(step: CoachStep, meters: number | null) {
  if (step === 'drive') {
    return { n: 1, title: 'Drive', hint: 'Hold W or the stick' }
  }
  if (step === 'opening') {
    return {
      n: 2,
      title: 'Marked opening',
      hint: meters != null ? `${meters.toFixed(0)} m to the opening` : 'Drive to the opening on the glass',
    }
  }
  if (step === 'assess') {
    return { n: 3, title: 'Assess', hint: 'Stop. Hold Space to size up who is at the glass' }
  }
  if (step === 'rescue') {
    return { n: 4, title: 'Rescue', hint: 'Hold F. Carry to staging if they cannot walk' }
  }
  return { n: 0, title: '', hint: '' }
}

export function stepCoach(
  step: CoachStep,
  ctx: {
    speed: number
    dist: number | null
    holdKind: HoldKind
    lastReveal: Reveal | null
    carriedId: string | null
  },
): CoachStep {
  if (step === 'off') return 'off'
  if (step === 'drive' && Math.abs(ctx.speed) > 0.8) {
    return ctx.dist != null && ctx.dist <= 8 ? 'assess' : 'opening'
  }
  if (step === 'opening' && ctx.dist != null && ctx.dist <= 8) return 'assess'
  if (step === 'assess' && ctx.lastReveal) return 'rescue'
  if (
    step === 'rescue' &&
    (ctx.holdKind === 'rescue' || ctx.carriedId != null || ctx.lastReveal?.kind === 'rescue' || ctx.lastReveal?.kind === 'mark')
  ) {
    return 'off'
  }
  return step
}

export function coachFromRun(
  step: CoachStep,
  state: Pick<RunState, 'hold' | 'lastReveal' | 'carriedId' | 'extractions' | 'cells' | 'victims'>,
  x: number,
  z: number,
  speed: number,
) {
  const near = nearestPlayOpening(x, z, state)
  return stepCoach(step, {
    speed,
    dist: near?.dist ?? null,
    holdKind: state.hold.kind,
    lastReveal: state.lastReveal,
    carriedId: state.carriedId,
  })
}
