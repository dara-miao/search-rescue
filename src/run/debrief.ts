import { conditionLabel, typeLabel } from './opening'
import { counts } from './tick'
import type { RunState, Signature, Victim } from './types'

export type DebriefRow = {
  id: string
  order: number
  seen: string
  did: string
  truth: string
  room: string
  highlight: string | null
}

function sigLabel(signature: Signature) {
  return signature.charAt(0) + signature.slice(1).toLowerCase()
}

function people(count: number) {
  return count === 1 ? '1 person' : `${count} people`
}

function seenLine(v: Victim) {
  if (v.seenAt == null && !v.scanned) return 'Never showed on thermal'
  if (!v.scanned) return `${sigLabel(v.signature)} signature. Not sized up`
  return `${sigLabel(v.signature)} signature. Sized up as ${conditionLabel(v.condition)}, ${typeLabel(v.type)}`
}

function didLine(v: Victim) {
  if (v.scanLost) return 'Sized up after they were already gone'
  if (v.action === 'rescued') {
    return v.type === 'ASSISTED' ? 'Helped them out' : 'Cleared the opening'
  }
  if (v.action === 'marked') return 'Marked for crews'
  if (v.action === 'scanned') return 'Sized up, then left'
  if (v.action === 'skipped') return 'Seen, not engaged'
  if (v.state === 'LOST' && v.lostReason === 'vent') return 'Still inside when the room vented'
  if (v.state === 'LOST' && v.lostReason === 'clock') return 'Time ran out'
  return 'Never reached'
}

function truthLine(v: Victim) {
  const fate =
    v.state === 'RESCUED' ? 'Out' : v.state === 'MARKED' ? 'Marked' : v.state === 'LOST' ? 'Lost' : 'Still inside'
  return `${people(v.count)}, ${typeLabel(v.type)}, ${conditionLabel(v.condition)}. ${fate}`
}

export function debriefRows(state: RunState): DebriefRow[] {
  const seen = state.victims
    .filter((v) => v.seenAt != null)
    .sort((a, b) => (a.seenAt ?? 0) - (b.seenAt ?? 0))
  const unseen = state.victims.filter((v) => v.seenAt == null)
  const ordered = seen.concat(unseen)

  const skippedFast = ordered.filter(
    (v) =>
      (v.action === 'skipped' || v.action === 'none' || v.action === 'never' || v.action === 'scanned') &&
      v.state !== 'RESCUED' &&
      v.type === 'SELF_EXTRACT' &&
      v.rescueTime < 8,
  )
  const wastedScan = ordered.filter((v) => v.scanLost)
  const clockLost = ordered.filter((v) => v.state === 'LOST' && v.lostReason === 'clock')
  const closest = clockLost.slice().sort((a, b) => a.clock0 - b.clock0)[0] ?? null

  return ordered.map((v, i) => {
    let highlight: string | null = null
    if (skippedFast.includes(v)) {
      highlight = `Walk-out. ${Math.round(v.rescueTime)} seconds at the glass`
    } else if (wastedScan.includes(v)) {
      highlight = 'Sized up someone already gone'
    } else if (closest && v.id === closest.id) {
      highlight = 'Closest miss'
    }
    return {
      id: v.id,
      order: i + 1,
      seen: seenLine(v),
      did: didLine(v),
      truth: truthLine(v),
      room: v.roomName,
      highlight,
    }
  })
}

export function debriefSummary(state: RunState) {
  const c = counts(state)
  return {
    ...c,
    ignitionRoom: state.ignitionRoom,
    seed: state.seed,
    duration: state.t,
  }
}
