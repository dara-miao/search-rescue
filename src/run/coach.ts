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
    return {
      n: 3,
      title: 'Assess',
      hint: 'Stop. Press Space. Thermal shows heat at the glass. Count and condition stay hidden until you size up.',
    }
  }
  if (step === 'rescue') {
    return { n: 4, title: 'Rescue', hint: 'Press F. They walk to staging. You stay on the perimeter.' }
  }
  return { n: 0, title: '', hint: '' }
}
